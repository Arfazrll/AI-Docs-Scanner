"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Copy, Save, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ValidationResult = {
  status: "auto_approved" | "needs_review" | "rejected";
  warnings: string[];
  fieldConfidence: Record<string, "high" | "medium" | "low">;
};

export default function VerifyKTP() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      // Reset state
      setData(null);
      setValidation(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/verify/ktp", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memproses dokumen");
      }

      if (json.status === "rejected" && !json.data) {
        throw new Error(json.validation.warnings[0] || "Dokumen ditolak");
      }

      setData(json.data);
      setValidation(json.validation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert("Data dicopy ke clipboard!");
    }
  };

  const renderConfidenceBadge = (confidence?: string) => {
    if (confidence === "high") return <span className="text-emerald-400/90 font-medium text-[10px] bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Valid</span>;
    if (confidence === "medium") return <span className="text-amber-400/90 font-medium text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Warning</span>;
    if (confidence === "low") return <span className="text-rose-400/90 font-medium text-[10px] bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5">Error</span>;
    return null;
  };

  const renderField = (key: string, label: string) => {
    const val = data ? data[key] || "" : "";
    const conf = validation?.fieldConfidence?.[key];

    return (
      <div className="flex flex-col gap-1.5 mb-4" key={key}>
        <Label className="text-zinc-400 font-medium text-xs flex items-center justify-between px-1">
          {label}
          {renderConfidenceBadge(conf)}
        </Label>
        <Input 
          readOnly 
          value={val} 
          className="bg-white/5 border border-white/5 text-zinc-100 rounded-lg focus-visible:ring-1 focus-visible:ring-white/20 px-3 h-10 font-mono text-sm transition-all"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 selection:bg-zinc-800 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-10 pb-4 border-b border-white/5">
          <Link href="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full h-10 w-10 p-0 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent tracking-tight">
            Verify KTP
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Upload & Preview */}
          <div className="flex flex-col gap-6">
            <div className="border border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center bg-zinc-900/30 min-h-[400px] relative transition-all hover:border-white/20 hover:bg-zinc-900/50 group">
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain rounded-xl shadow-2xl" />
                  <div className="mt-8 flex gap-3 w-full max-w-sm mx-auto">
                    <Label htmlFor="file-upload" className="flex-1 text-center cursor-pointer border border-white/10 bg-white/5 rounded-full py-3 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                      Change Photo
                    </Label>
                    <Input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <Button onClick={handleUpload} disabled={loading} className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full py-3 h-auto font-semibold shadow-lg shadow-white/5 transition-all">
                      {loading ? "Processing..." : "Extract Data"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-zinc-300 group-hover:scale-110 transition-all">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <p className="font-semibold text-xl text-zinc-200 mb-2">Upload Document</p>
                  <p className="font-medium text-xs text-zinc-500 mb-8 max-w-[200px] leading-relaxed">Supported formats: JPG, PNG, WEBP (Max 10MB)</p>
                  <Label htmlFor="file-upload" className="cursor-pointer border border-white/10 bg-white/5 px-6 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors shadow-sm shadow-white/5">
                    Select File
                  </Label>
                  <Input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              )}
            </div>
            
            <div className="text-xs font-medium text-zinc-400 p-4 border border-white/5 rounded-2xl bg-zinc-900/30 flex items-start gap-3 leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5" />
              <p>Ensure the photo is well-lit and all corners are visible. Data is processed in real-time and not permanently stored.</p>
            </div>

            {error && (
              <div className="bg-rose-500/10 text-rose-300 p-4 rounded-2xl border border-rose-500/20 text-sm font-medium flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {validation?.warnings && validation.warnings.length > 0 && (
              <div className="bg-amber-500/10 text-amber-300 p-4 rounded-2xl border border-amber-500/20 text-sm font-medium flex flex-col gap-3">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Validation Warnings
                </div>
                <ul className="list-disc pl-6 space-y-1.5 opacity-90">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Form */}
          <div className="border border-white/5 p-6 md:p-8 rounded-3xl relative bg-zinc-900/40 backdrop-blur-xl shadow-2xl">
            {loading && (
              <div className="absolute inset-0 z-10 bg-[#0a0a0a]/60 backdrop-blur-sm flex items-center justify-center rounded-3xl border border-white/10">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-3 border-zinc-500 border-t-zinc-200 rounded-full animate-spin mb-4"></div>
                  <p className="text-zinc-300 font-medium text-sm">Processing Document...</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className="text-xl font-semibold flex flex-wrap items-center gap-3 text-zinc-100">
                Extracted Data
                {validation?.status === "auto_approved" && <span className="text-xs border border-emerald-500/20 bg-emerald-500/10 text-emerald-400/90 px-2.5 py-1 rounded-full font-medium">Approved</span>}
                {validation?.status === "needs_review" && <span className="text-xs border border-amber-500/20 bg-amber-500/10 text-amber-400/90 px-2.5 py-1 rounded-full font-medium">Needs Review</span>}
              </h2>
              <Button variant="outline" onClick={copyToClipboard} disabled={!data} className="border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full font-medium text-xs px-4 h-8 transition-colors">
                <Copy className="h-3 w-3 mr-1.5" /> Copy JSON
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div className="md:col-span-2">{renderField("nik", "NIK")}</div>
              <div className="md:col-span-2">{renderField("nama", "Nama")}</div>
              {renderField("tempat_lahir", "Tempat Lahir")}
              {renderField("tanggal_lahir", "Tanggal Lahir")}
              {renderField("jenis_kelamin", "Jenis Kelamin")}
              {renderField("golongan_darah", "Golongan Darah")}
              <div className="md:col-span-2">{renderField("alamat", "Alamat")}</div>
              {renderField("rt_rw", "RT/RW")}
              {renderField("kel_desa", "Kel/Desa")}
              {renderField("kecamatan", "Kecamatan")}
              {renderField("agama", "Agama")}
              {renderField("status_perkawinan", "Status Perkawinan")}
              {renderField("pekerjaan", "Pekerjaan")}
              {renderField("kewarganegaraan", "Kewarganegaraan")}
              {renderField("berlaku_hingga", "Berlaku Hingga")}
              {renderField("provinsi", "Provinsi")}
              {renderField("kota_kabupaten", "Kab/Kota")}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
              <Button disabled={!data} className="bg-zinc-100 text-zinc-900 hover:bg-white rounded-full font-semibold text-sm px-6 h-10 shadow-lg shadow-white/5 transition-all">
                <Save className="h-4 w-4 mr-2" /> Save Results
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
