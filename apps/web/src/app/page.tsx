import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Car, History } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 font-sans selection:bg-zinc-800">
      <div className="absolute top-6 right-6">
        <Link href="/history">
          <Button variant="ghost" className="rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors duration-300">
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </Link>
      </div>

      <div className="text-center max-w-3xl mt-12 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-8 backdrop-blur-sm">
          <Sparkles className="h-3 w-3 text-zinc-400" />
          <span>Intelligent Document Processing</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent pb-2">
          Verify Documents
          <br />
          with Precision
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl font-light leading-relaxed">
          Create seamless verification flows with our highly accurate OCR technology. Built for modern businesses to securely process KTP and STNK effortlessly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
          <Link href="/verify/ktp" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-48 h-14 rounded-full bg-zinc-100 text-zinc-900 hover:bg-white transition-all text-base font-semibold shadow-lg shadow-white/5">
              <FileText className="mr-2 h-5 w-5" />
              Verify KTP
            </Button>
          </Link>
          
          <Link href="/verify/stnk" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-48 h-14 rounded-full border-white/10 bg-transparent text-white hover:bg-white/5 transition-all text-base font-semibold">
              <Car className="mr-2 h-5 w-5" />
              Verify STNK
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-8 md:gap-16 pt-8 border-t border-white/5 w-full max-w-2xl">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-white mb-1">99%</span>
            <span className="text-xs text-zinc-500 font-medium">Accuracy</span>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-white mb-1">&lt;2s</span>
            <span className="text-xs text-zinc-500 font-medium">Processing Time</span>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-white mb-1">Zero</span>
            <span className="text-xs text-zinc-500 font-medium">Data Stored</span>
          </div>
        </div>
      </div>
    </div>
  );
}
