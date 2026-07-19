import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";
import { validateKtp } from "@ocr-demo/validators";
import { KtpData } from "@ocr-demo/schemas";

const prisma = new PrismaClient();

// Ensure you have GROQ_API_KEY set
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
    const prompt = `Anda adalah structuring engine untuk data OCR dokumen KTP Indonesia.

INPUT: teks flat hasil OCR PaddleOCR dari gambar dokumen.
OUTPUT: Berikan HANYA JSON objek valid yang merepresentasikan data KTP. Jangan berikan teks lain selain JSON.

Skema JSON yang diminta:
{
  "nik": string | null,
  "nama": string | null,
  "tempat_lahir": string | null,
  "tanggal_lahir": string | null, // Format DD-MM-YYYY
  "jenis_kelamin": "LAKI-LAKI" | "PEREMPUAN" | null,
  "golongan_darah": "A" | "B" | "AB" | "O" | "-" | null,
  "alamat": string | null,
  "rt_rw": string | null,
  "kel_desa": string | null,
  "kecamatan": string | null,
  "agama": "ISLAM" | "KRISTEN" | "KATOLIK" | "HINDU" | "BUDDHA" | "KONGHUCU" | null,
  "status_perkawinan": "BELUM KAWIN" | "KAWIN" | "CERAI HIDUP" | "CERAI MATI" | null,
  "pekerjaan": string | null,
  "kewarganegaraan": "WNI" | "WNA" | null,
  "berlaku_hingga": string | null,
  "provinsi": string | null,
  "kota_kabupaten": string | null
}

ATURAN WAJIB (JANGAN DILANGGAR):
1. Ekstrak HANYA data yang ada di teks input. JANGAN mengarang, JANGAN menebak, JANGAN inferensi dari pengetahuan umum.
2. Jika suatu field tidak ada atau tidak terbaca di input, return null. JANGAN isi dengan placeholder atau tebakan.
3. Anda BOLEH memperbaiki typo minor OCR (contoh: "CHRISTIA" → "CHRISTIAN", "Lahe" → "Lahir") HANYA jika konteks label di sekitarnya sangat jelas. Jika ragu, return teks apa adanya.
4. Normalisasi format: tanggal ke DD-MM-YYYY, uppercase untuk nama & alamat.
5. Untuk field enum (agama, jenis kelamin, dll), match ke nilai yang paling mendekati dari enum yang diberikan. Jika tidak ada yang cocok, return null.
6. TIDAK boleh merge, split, atau reformat field selain yang diinstruksikan.

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
    console.log("Raw OCR Text:", rawText);
    console.log("Structured JSON:", structuredText);
    const structuredData: KtpData = JSON.parse(structuredText);

    // 3. Validation
    const validationResult = validateKtp(structuredData);

    // 4. Save to DB (DO NOT SAVE IMAGE, PII compliance)
    const extraction = await prisma.extraction.create({
      data: {
        documentType: "ktp",
        rawOcrText: rawText,
        extractedData: JSON.stringify(structuredData),
        validationResult: JSON.stringify(validationResult),
        status: validationResult.status,
        keyIdentifier: structuredData.nik || "UNKNOWN",
      }
    });

    return NextResponse.json({
      data: structuredData,
      validation: validationResult,
      status: validationResult.status,
      id: extraction.id
    });

  } catch (error: any) {
    console.error("KTP Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
