import { z } from "zod";

export const KtpSchema = z.object({
  nik: z.string().nullable(),
  nama: z.string().nullable(),
  tempat_lahir: z.string().nullable(),
  tanggal_lahir: z.string().nullable(), // DD-MM-YYYY
  jenis_kelamin: z.enum(["LAKI-LAKI", "PEREMPUAN"]).nullable(),
  golongan_darah: z.enum(["A", "B", "AB", "O", "-"]).nullable(),
  alamat: z.string().nullable(),
  rt_rw: z.string().nullable(),
  kel_desa: z.string().nullable(),
  kecamatan: z.string().nullable(),
  agama: z.enum(["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"]).nullable(),
  status_perkawinan: z.enum(["BELUM KAWIN", "KAWIN", "CERAI HIDUP", "CERAI MATI"]).nullable(),
  pekerjaan: z.string().nullable(),
  kewarganegaraan: z.enum(["WNI", "WNA"]).nullable(),
  berlaku_hingga: z.string().nullable(),
  provinsi: z.string().nullable(),
  kota_kabupaten: z.string().nullable()
});

export type KtpData = z.infer<typeof KtpSchema>;

export const StnkSchema = z.object({
  nomor_registrasi: z.string().nullable(),
  nama_pemilik: z.string().nullable(),
  alamat_pemilik: z.string().nullable(),
  merk: z.string().nullable(),
  type: z.string().nullable(),
  jenis: z.string().nullable(),
  model: z.string().nullable(),
  tahun_pembuatan: z.number().nullable(),
  isi_silinder: z.string().nullable(),
  nomor_rangka: z.string().nullable(),
  nomor_mesin: z.string().nullable(),
  warna: z.string().nullable(),
  bahan_bakar: z.enum(["BENSIN", "SOLAR", "LISTRIK", "HYBRID", "GAS"]).nullable(),
  warna_tnkb: z.enum(["HITAM", "KUNING", "MERAH", "PUTIH"]).nullable(),
  tahun_registrasi: z.number().nullable(),
  berlaku_sampai: z.string().nullable(),
});

export type StnkData = z.infer<typeof StnkSchema>;
