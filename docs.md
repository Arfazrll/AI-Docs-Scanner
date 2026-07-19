# DOKUMENTASI TEKNIS SISTEM VERIFIKASI DOKUMEN BERBASIS OCR & AI
**Versi Dokumen:** 1.0.0  
**Klasifikasi:** Internal / Rahasia (Confidential)  
**Terakhir Diperbarui:** 2026-07-19

---

## 1. PENDAHULUAN

### 1.1. Deskripsi Sistem
Aplikasi "AI Document Scanner" adalah platform ekstraksi dan verifikasi data otomatis untuk identitas kependudukan (KTP) dan dokumen kendaraan bermotor (STNK) menggunakan kombinasi teknologi *Optical Character Recognition (OCR)* tingkat lanjut dan pemrosesan bahasa alami (LLM).

### 1.2. Tujuan
Tujuan utama sistem ini adalah mengotomatisasi proses pengumpulan data (Data Entry / KYC - *Know Your Customer*) dengan tingkat akurasi tinggi, serta menekan risiko kesalahan pengetikan (*human error*) secara drastis dalam lingkungan *production*.

---

## 2. ARSITEKTUR SISTEM

Sistem dirancang dengan arsitektur *microservices* asinkron untuk memisahkan beban komputasi berat (pengenalan citra) dari logika bisnis aplikasi.

### 2.1. Komponen Utama
1. **Frontend & Backend-for-Frontend (BFF)**
   - **Teknologi:** Next.js (React), Tailwind CSS, TypeScript.
   - **Fungsi:** Menyediakan antarmuka pengguna interaktif (UI) dan bertindak sebagai perantara keamanan (proxy) antara pengguna dengan *service* internal. Backend Next.js (API Routes) juga mengatur integrasi dengan LLM untuk validasi struktural.
2. **Microservice OCR**
   - **Teknologi:** Python, FastAPI, PaddleOCR, Uvicorn.
   - **Fungsi:** Melakukan inferensi gambar dokumen untuk mendeteksi *bounding boxes* dan mengekstrak teks mentah (Raw Text). Microservice ini diisolasi untuk memastikan beban komputasi RAM/VRAM tidak membebani web server utama.
3. **Large Language Model (LLM)**
   - **Teknologi:** Groq API (menggunakan model `llama-3.3-70b-versatile`).
   - **Fungsi:** Menganalisis, merekonstruksi teks mentah dari OCR yang berantakan, serta memetakan data (*mapping*) ke dalam skema JSON baku.
4. **Database & ORM**
   - **Teknologi:** Prisma ORM (saat ini dikonfigurasi dengan SQLite untuk pengembangan lokal, namun siap disuntik PostgreSQL/MySQL di *production*).
   - **Fungsi:** Mencatat hanya riwayat ekstraksi (Log Audit), seperti metrik keberhasilan, tipe dokumen, waktu akses, dan Nomor Identitas utama (NIK / Plat) sebagai *Key Identifier*.

---

## 3. ALUR KERJA SISTEM (WORKFLOW)

1. **Inisiasi & Upload:** Pengguna (atau sistem klien) mengirimkan file gambar (JPG/PNG/WEBP) melalui antarmuka web.
2. **Relay Transmisi:** Frontend meneruskan file langsung ke API Next.js (Server-side). API melakukan validasi format (*MIME Type*, batas ukuran).
3. **Eksekusi OCR:** API Next.js mengirimkan file secara internal melalui HTTP ke Microservice Python.
4. **Ekstraksi Mentah (Raw OCR):** PaddleOCR di dalam microservice mengubah piksel gambar menjadi kumpulan teks mentah panjang (*Raw OCR Text String*) tanpa struktur yang jelas.
5. **Pemrosesan Semantik AI:** Teks mentah (bukan gambar) diteruskan ke model LLM melalui Groq API dengan injeksi *Prompt Engineering* berstandar ketat. LLM bertugas menebak relasi konteks (misal: membedakan angka RT/RW dengan tanggal lahir).
6. **Validasi & Kembalian (Response):** LLM mengembalikan format JSON murni. Sistem melakukan validasi akhir (*confidence check*) dan menampilkannya di *client*. Data di-log ke dalam database secara anonim/terbatas.

---

## 4. MEKANISME PENCEGAHAN HALUSINASI AI (HALLUCINATION PREVENTION)

Salah satu tantangan terbesar menggunakan LLM untuk *parsing* dokumen resmi adalah "Halusinasi"—yaitu kondisi di mana AI mengarang, memanipulasi, atau menambahkan data yang sebenarnya tidak ada pada dokumen fisik. Untuk mencapai standar *production-ready*, sistem ini menerapkan lapisan keamanan ganda:

### 4.1. Strict Prompt Engineering (Zero-Shot Constraint)
Instruksi bawaan (*System Prompt*) kepada AI dibatasi secara mutlak. AI diinstruksikan dengan aturan:
- **Hanya mengekstrak, TIDAK menyimpulkan.** AI tidak diizinkan melengkapi nama yang terpotong atau mengoreksi ejaan nama secara otomatis.
- **Wajib menggunakan Raw Text OCR sebagai Ground Truth (Satu-satunya Kebenaran).** Semua huruf dan angka harus merujuk pada apa yang berhasil dibaca oleh PaddleOCR.
- Mengembalikan nilai `null` atau `""` (string kosong) apabila parameter (seperti Golongan Darah) tidak terbaca, bukan mengarang data.

### 4.2. JSON Schema Enforcement
Sistem meminta LLM secara spesifik (via JSON mode atau *structured output parsing*) untuk mengeluarkan output dalam skema *key-value* statis. Apabila LLM memberikan respons di luar skema (contoh: menyisipkan teks narasi `"Tentu, berikut datanya:"`), maka sistem backend memiliki algoritma *regex parsing* untuk mengisolasi *bracket* `{ ... }` atau membatalkan respons (menolak payload korup).

### 4.3. Cross-Checking & Confidence Scoring (Skoring Kepercayaan)
Aplikasi menjalankan validasi *Post-Processing*:
- **Pengecekan Regex & Format:** Contoh, NIK pada KTP harus berjumlah 16 digit angka. Sistem akan mencocokkan hasil ekstraksi dengan regex `^\d{16}$`. Apabila hasilnya tidak cocok (contoh NIK hanya 15 digit karena blur), maka atribut tersebut langsung diberi label `fieldConfidence: "low"`.
- Validasi logis tanggal: Mencocokkan digit NIK (tanggal lahir) dengan data Tanggal Lahir (untuk KTP) untuk menemukan anomali.

### 4.4. Peringatan Status Validasi (Validation Status)
Sistem mengeluarkan 3 kemungkinan status dokumen:
- `auto_approved`: Data sempurna, lolos semua pengecekan skema dan regex.
- `needs_review`: Sebagian data (*field*) kosong, tidak terbaca jelas, atau gagal regex (misal NIK hanya 15 angka). Membutuhkan *Manual QC* (Quality Control) dari manusia.
- `rejected`: Data fatal (misal tidak ditemukan NIK atau tidak ditemukan identifikasi KTP/STNK).

---

## 5. KEAMANAN & PRIVASI DATA (SECURITY & DATA PRIVACY)

### 5.1. PII Compliance (Personally Identifiable Information)
Sistem dirancang sebagai **Stateless Pipeline**.
- **No Disk Storage (Tanpa Penyimpanan Disk):** Gambar yang diunggah diproses sepenuhnya di dalam memori server (RAM) dalam bentuk `Buffer` atau *temporary memory*.
- **Otomatis Dihapus (Auto-Discard):** Begitu ekstraksi OCR dan *parsing* LLM selesai (siklus *request-response* tertutup), *memory buffer* tersebut dihancurkan seketika (dibersihkan oleh *Garbage Collector* server).
- **Log Terbatas:** Database (Prisma) **TIDAK** merekam dan menyimpan JSON lengkap KTP (nama lengkap, NIK penuh, alamat). Database hanya menyimpan metrik abstrak (tanggal, status, Tipe Dokumen, atau identifier anonim) untuk kebutuhan metrik bisnis/riwayat performa, mencegah kebocoran data jika database diretas.

### 5.2. Network Isolation (Isolasi Jaringan)
Microservice OCR Python (`OCR_SERVICE_URL`) secara default berjalan di jaringan internal (localhost / Private VPC) dan **TIDAK TEREKSPOS (No Ingress)** ke internet publik. Hanya backend Next.js yang memiliki hak otorisasi untuk melakukan panggilan ke *service* ini.

---

## 6. INFRASTRUKTUR & STRATEGI DEPLOYMENT

Untuk melakukan instalasi di tingkat produksi, disarankan menggunakan *Containerization* (Docker).

1. **Frontend Service:** Dapat di-deploy di platform *Edge Network* (Vercel, AWS Amplify) atau Node.js Docker Container (AWS ECS / Kubernetes).
2. **Backend OCR Service:** Membutuhkan CPU Multithreading yang memadai (contoh: 2 vCPU, 4GB RAM minimum). Disediakan `Dockerfile` untuk mem-build *image* terisolasi.
3. **Koneksi Lingkungan (Environment Variables):** Variabel kunci seperti `GROQ_API_KEY` harus di-injeksi melalui sistem manajemen *secret* (AWS Secrets Manager, HashiCorp Vault, atau GitHub Actions Secrets).

---
*Dokumen ini bersifat rujukan final untuk tim Development, DevOps, dan Quality Assurance (QA).*
