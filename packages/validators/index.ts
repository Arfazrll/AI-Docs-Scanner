import { KtpData, StnkData } from "@ocr-demo/schemas";

type ValidationResult = {
  status: "auto_approved" | "needs_review" | "rejected";
  warnings: string[];
  fieldConfidence: Record<string, "high" | "medium" | "low">;
};

// NIK Decoder
export function decodeNik(nik: string) {
  if (!nik || nik.length !== 16) return null;
  
  const prov = nik.substring(0, 2);
  const kab = nik.substring(2, 4);
  const kec = nik.substring(4, 6);
  let tanggal = parseInt(nik.substring(6, 8), 10);
  const bulan = parseInt(nik.substring(8, 10), 10);
  const tahun = parseInt(nik.substring(10, 12), 10);
  
  if (isNaN(tanggal) || isNaN(bulan) || isNaN(tahun)) return null;

  let gender = "LAKI-LAKI";
  if (tanggal > 40) {
    gender = "PEREMPUAN";
    tanggal -= 40;
  }

  const currentYear = new Date().getFullYear() % 100;
  const fullTahun = tahun <= currentYear ? 2000 + tahun : 1900 + tahun;

  return {
    prov,
    kab,
    kec,
    tanggal: tanggal.toString().padStart(2, '0'),
    bulan: bulan.toString().padStart(2, '0'),
    tahun: fullTahun.toString(),
    gender
  };
}

export function validateKtp(data: KtpData): ValidationResult {
  const warnings: string[] = [];
  const fieldConfidence: Record<string, "high" | "medium" | "low"> = {};

  // Initialize all fields as high confidence if present, low if null
  for (const key of Object.keys(data)) {
    fieldConfidence[key] = data[key as keyof KtpData] !== null ? "high" : "low";
  }

  if (!data.nik || data.nik.length !== 16) {
    warnings.push("NIK tidak valid atau tidak terbaca");
    fieldConfidence.nik = "low";
    return { status: "rejected", warnings, fieldConfidence };
  }

  const decoded = decodeNik(data.nik);
  if (!decoded) {
    warnings.push("Format NIK tidak valid");
    fieldConfidence.nik = "low";
    return { status: "rejected", warnings, fieldConfidence };
  }

  // Cross check gender
  if (data.jenis_kelamin && data.jenis_kelamin !== decoded.gender) {
    warnings.push(`Jenis kelamin OCR (${data.jenis_kelamin}) tidak sesuai dengan NIK (${decoded.gender})`);
    fieldConfidence.jenis_kelamin = "low";
  }

  // Cross check tanggal lahir
  if (data.tanggal_lahir) {
    const parts = data.tanggal_lahir.split('-');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d !== decoded.tanggal || m !== decoded.bulan || y !== decoded.tahun) {
        warnings.push(`Tanggal lahir OCR (${data.tanggal_lahir}) tidak sesuai dengan NIK (${decoded.tanggal}-${decoded.bulan}-${decoded.tahun})`);
        fieldConfidence.tanggal_lahir = "medium";
      }
    }
  }

  if (warnings.length > 0) {
    return { status: "needs_review", warnings, fieldConfidence };
  }

  return { status: "auto_approved", warnings, fieldConfidence };
}

export function validateStnk(data: StnkData): ValidationResult {
  const warnings: string[] = [];
  const fieldConfidence: Record<string, "high" | "medium" | "low"> = {};

  for (const key of Object.keys(data)) {
    fieldConfidence[key] = data[key as keyof StnkData] !== null ? "high" : "low";
  }

  if (!data.nomor_registrasi) {
    warnings.push("Nomor Registrasi (Plat Nomor) tidak ditemukan");
    fieldConfidence.nomor_registrasi = "low";
    return { status: "rejected", warnings, fieldConfidence };
  }

  const platRegex = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/;
  if (!platRegex.test(data.nomor_registrasi.toUpperCase())) {
    warnings.push("Format Nomor Registrasi tidak valid");
    fieldConfidence.nomor_registrasi = "medium";
  }

  if (data.nomor_rangka) {
    if (data.nomor_rangka.length !== 17) {
      warnings.push("Nomor Rangka (VIN) harus 17 karakter");
      fieldConfidence.nomor_rangka = "medium";
    }
    if (/[IOQioq]/.test(data.nomor_rangka)) {
      warnings.push("Nomor Rangka (VIN) terdeteksi mengandung huruf I, O, atau Q yang kemungkinan misread");
      fieldConfidence.nomor_rangka = "medium";
    }
  }

  const currentYear = new Date().getFullYear();
  if (data.tahun_pembuatan) {
    if (data.tahun_pembuatan < 1980 || data.tahun_pembuatan > currentYear + 1) {
      warnings.push(`Tahun pembuatan tidak wajar: ${data.tahun_pembuatan}`);
      fieldConfidence.tahun_pembuatan = "low";
    }
  }

  if (data.tahun_registrasi && data.tahun_pembuatan) {
    if (data.tahun_registrasi < data.tahun_pembuatan) {
      warnings.push(`Tahun registrasi (${data.tahun_registrasi}) lebih tua dari tahun pembuatan (${data.tahun_pembuatan})`);
      fieldConfidence.tahun_registrasi = "low";
    }
  }

  if (data.isi_silinder) {
    const ccMatch = data.isi_silinder.match(/\d+/);
    if (ccMatch) {
      const cc = parseInt(ccMatch[0], 10);
      if (cc < 50 || cc > 8000) {
        warnings.push(`Kapasitas silinder tidak wajar: ${cc} CC`);
        fieldConfidence.isi_silinder = "medium";
      }
    }
  }

  if (data.jenis && data.bahan_bakar) {
    if (data.jenis.includes("LISTRIK") && data.bahan_bakar !== "LISTRIK") {
      warnings.push("Jenis mobil listrik tapi bahan bakar bukan listrik");
      fieldConfidence.bahan_bakar = "medium";
    }
  }

  if (warnings.length > 0) {
    return { status: "needs_review", warnings, fieldConfidence };
  }

  return { status: "auto_approved", warnings, fieldConfidence };
}
