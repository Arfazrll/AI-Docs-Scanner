import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";
import { validateStnk } from "@ocr-demo/validators";
import { StnkData } from "@ocr-demo/schemas";

const prisma = new PrismaClient();
const groq = new Groq();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "File not provided" }, { status: 400 });
    }

    // 1. Send to PaddleOCR Service
    const ocrUrl = process.env.OCR_SERVICE_URL;
    if (!ocrUrl) {
      throw new Error("OCR_SERVICE_URL is not configured in environment variables.");
    }

    const ocrFormData = new FormData();
    ocrFormData.append("file", file);

    const ocrRes = await fetch(`${ocrUrl}/ocr`, {
      method: "POST",
      body: ocrFormData,
    });

    if (!ocrRes.ok) {
      throw new Error(`OCR Service Error: ${ocrRes.statusText}`);
    }

    const ocrData = await ocrRes.json();
    const rawText = ocrData.raw_text;

    if (!rawText) {
      return NextResponse.json({
        data: null,
        validation: { status: "rejected", warnings: ["Tidak ada teks terdeteksi di dokumen"], fieldConfidence: {} },
        status: "rejected",
        id: null
      });
    }

    // 2. Structuring using Groq
    const prompt = `Anda adalah structuring engine untuk data OCR dokumen STNK Indonesia (Sisi Depan).

INPUT: teks flat hasil OCR PaddleOCR dari gambar dokumen.
OUTPUT: Berikan HANYA JSON objek valid yang merepresentasikan data STNK. Jangan berikan teks lain selain JSON.

Skema JSON yang diminta:
{
  "nomor_registrasi": string | null,
  "nama_pemilik": string | null,
  "alamat_pemilik": string | null,
  "merk": string | null,
  "type": string | null,
  "jenis": string | null,
  "model": string | null,
  "tahun_pembuatan": number | null,
  "isi_silinder": string | null,
  "nomor_rangka": string | null,
  "nomor_mesin": string | null,
  "warna": string | null,
  "bahan_bakar": "BENSIN" | "SOLAR" | "LISTRIK" | "HYBRID" | "GAS" | null,
  "warna_tnkb": "HITAM" | "KUNING" | "MERAH" | "PUTIH" | null,
  "tahun_registrasi": number | null,
  "berlaku_sampai": string | null
}

ATURAN WAJIB (JANGAN DILANGGAR):
1. Ekstrak HANYA data yang ada di teks input. JANGAN mengarang, JANGAN menebak, JANGAN inferensi dari pengetahuan umum.
2. Jika suatu field tidak ada atau tidak terbaca di input, return null. JANGAN isi dengan placeholder atau tebakan.
3. Anda BOLEH memperbaiki typo minor OCR HANYA jika konteks label di sekitarnya sangat jelas. Jika ragu, return teks apa adanya.
4. Normalisasi format: tanggal ke DD-MM-YYYY, uppercase untuk nama & alamat.
5. Untuk field enum (bahan bakar, warna tnkb, dll), match ke nilai yang paling mendekati dari enum yang diberikan. Jika tidak ada yang cocok, return null.
6. TIDAK boleh merge, split, atau reformat field selain yang diinstruksikan.
7. 'nomor_registrasi' adalah plat nomor kendaraan.
8. PERHATIAN KHUSUS STRUKTUR STNK: Pada STNK, urutan vertikal kolom di kiri biasanya adalah: MERK, TYPE, JENIS, MODEL. 
   - MERK biasanya berisi brand pabrikan (contoh: HONDA, YAMAHA, TOYOTA, SMOOT).
   - TYPE berisi spesifikasi varian (contoh: VARIO 125, INNOVA, TEMPUR AT).
   - JENIS berisi kategori umum (contoh: SEPEDA MOTOR, MOBIL PENUMPANG).
   - MODEL berisi bentuk kendaraan (contoh: SPD. MOTOR, MINIBUS).
9. JANGAN menukar nilainya! Jika OCR membaca berantakan, cocokkan nilainya berdasarkan konteks logis di atas (contoh: 'SMOOT' pasti MERK, 'TEMPUR AT' pasti TYPE, 'SPD. MOTOR' pasti MODEL).

TEKS INPUT:
${rawText}
`;

    const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: modelName,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const structuredText = response.choices[0]?.message?.content || "{}";
    const structuredData: StnkData = JSON.parse(structuredText);
    
    console.log("=== STNK EXTRACTION RESULT ===");
    console.log("Raw Text dari OCR Python:", rawText);
    console.log("Hasil Struktur Groq:", structuredData);

    // 3. Validation
    const validationResult = validateStnk(structuredData);

    // 4. Save to DB
    const extraction = await prisma.extraction.create({
      data: {
        documentType: "stnk",
        rawOcrText: rawText,
        extractedData: JSON.stringify(structuredData),
        validationResult: JSON.stringify(validationResult),
        status: validationResult.status,
        keyIdentifier: structuredData.nomor_registrasi || "UNKNOWN",
      }
    });

    return NextResponse.json({
      data: structuredData,
      validation: validationResult,
      status: validationResult.status,
      id: extraction.id
    });

  } catch (error: any) {
    console.error("STNK Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
