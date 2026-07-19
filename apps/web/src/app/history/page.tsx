"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Extraction = {
  id: string;
  documentType: string;
  status: string;
  keyIdentifier: string;
  createdAt: string;
};

export default function HistoryPage() {
  const [data, setData] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all history?")) return;
    try {
      setLoading(true);
      await fetch("/api/history/clear", { method: "POST" });
      await fetchHistory();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-4 md:p-8 selection:bg-zinc-800 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-white/5 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full h-10 w-10 p-0 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent tracking-tight">
              Extraction History
            </h1>
          </div>
          <Button variant="destructive" onClick={handleClear} disabled={loading || data.length === 0} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-full font-medium transition-all">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Data
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
            <div className="w-8 h-8 border-3 border-zinc-700 border-t-zinc-300 rounded-full animate-spin mb-4"></div>
            <p className="font-medium text-sm">Loading history...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-3xl bg-zinc-900/30">
            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-zinc-500">
              <History className="h-8 w-8" />
            </div>
            <p className="text-zinc-400 font-medium">No extraction history found.</p>
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-left text-zinc-400">
                    <th className="p-5 font-medium whitespace-nowrap">Date & Time</th>
                    <th className="p-5 font-medium">Document Type</th>
                    <th className="p-5 font-medium">Key Identifier</th>
                    <th className="p-5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 text-zinc-300 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </td>
                      <td className="p-5">
                        <span className="inline-flex px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                          {item.documentType}
                        </span>
                      </td>
                      <td className="p-5 font-mono text-zinc-200 font-medium">
                        {item.keyIdentifier}
                      </td>
                      <td className="p-5">
                        {item.status === "auto_approved" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/20">Approved</span>
                        ) : item.status === "needs_review" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400/90 border border-amber-500/20">Needs Review</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400/90 border border-rose-500/20">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
