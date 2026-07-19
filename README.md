# OCR Web App KTP & STNK

Demo Web App OCR untuk **PT Sompo Insurance Indonesia** (disesuaikan menjadi *demo* environment).
Sistem ini memproses dokumen identitas (KTP) dan kendaraan (STNK) menggunakan pendekatan **layered validation** untuk mencegah halusinasi LLM (Hallucination Rate Rendah).

## Arsitektur

Pipeline sistem berjalan sebagai berikut:
1. **PaddleOCR**: Sebagai OCR deterministik yang membaca gambar menjadi teks flat. Gambar tidak pernah dikirim ke LLM.
2. **Gemini 2.0 Flash**: Berfungsi murni sebagai **Structuring Engine**. Gemini hanya menerima teks dari PaddleOCR dan merubahnya ke JSON terstruktur (tidak menerawang data dari gambar).
3. **Validator**: Layer validasi menggunakan NIK decoder dan Regex (STNK) untuk mendeteksi anomali hasil ekstraksi, yang menghasilkan status `auto_approved`, `needs_review`, atau `rejected`.
4. **Prisma & SQLite**: Menyimpan hasil ekstraksi tanpa menyimpan gambar (PII compliance).

---

## Prasyarat
- Node.js >= 18
- Python >= 3.9
- Docker (opsional untuk menjalankan ocr-service via container)

## Cara Menjalankan (Local Development)

### 1. Setup Backend OCR (Python FastAPI)

Masuk ke folder `apps/ocr-service` dan install dependensi:

```bash
cd apps/ocr-service
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Jalankan FastAPI service:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
> Service ini akan berjalan di `http://localhost:8000`. Saat pertama kali jalan, PaddleOCR akan mendownload model-nya.

### 2. Setup Frontend Next.js

Masuk ke folder proyek root dan instal dependensi npm (ini monorepo):
```bash
npm install
```

Di `apps/web/.env`, atur API Key untuk Gemini:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
OCR_SERVICE_URL="http://localhost:8000"
DATABASE_URL="file:./dev.db"
```

Inisialisasi Database (SQLite) dari root:
```bash
cd apps/web
npx prisma db push
npx prisma generate
```

Jalankan frontend:
```bash
npm run dev
```
> Buka browser dan pergi ke `http://localhost:3000`.

---

## Demo Script (Untuk Project Manager)

1. Buka `http://localhost:3000`.
2. Klik **Verifikasi KTP**.
3. Upload gambar KTP yang bersih. Tunjukkan bagaimana OCR dan Gemini mampu mengekstrak data 100% dan Validator memberikan status *Auto Approved* (Hijau).
4. Upload gambar KTP yang buram/blur, atau NIK-nya salah. Tunjukkan bagaimana Validator mendeteksi ketidaksesuaian (Misal: Tanggal lahir OCR tidak cocok dengan decoded NIK) dan memberikan flag *Needs Review* (Kuning/Warning).
5. Jelaskan bahwa **LLM tidak berhalusinasi** karena tidak melihat gambar. Ia mematuhi instruksi deterministik (Temperature = 0).
6. Demo bagian **STNK** dengan cara serupa. Tunjukkan pelat nomor dan validasi VIN (tanpa I,O,Q).
7. Klik tombol **Riwayat Ekstraksi** di ujung kanan atas dan tunjukkan log audit (tanpa gambar) untuk mematuhi regulasi Data Pribadi.

---

## Struktur Folder Monorepo

- `apps/web`: Next.js 14 frontend.
- `apps/ocr-service`: FastAPI & PaddleOCR backend.
- `packages/schemas`: Zod schemas yang dibagikan.
- `packages/validators`: NIK decoder & KTP/STNK rules.
