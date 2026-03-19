"use client";
import { useState } from "react";

const BASE = "https://groupegsi.mg/rtmggmg/api";

const TESTS = [
  { label: "GET /api/db/users", url: `${BASE}/db/users`, method: "GET" },
  { label: "GET /api/db/ecolage", url: `${BASE}/db/ecolage`, method: "GET" },
  { label: "GET /api/db/paiements", url: `${BASE}/db/paiements`, method: "GET" },
  { label: "GET /api/collections", url: `${BASE}/collections`, method: "GET" },
  { label: "GET /api/status", url: `${BASE}/status`, method: "GET" },
];

export default function DebugPage() {
  const [results, setResults] = useState<{label: string; status: number|string; preview: string; ok: boolean}[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true); setResults([]);
    const out = [];
    for (const t of TESTS) {
      try {
        const res = await fetch(t.url, { headers: { Accept: "application/json" }, cache: "no-store" });
        const text = await res.text();
        out.push({ label: t.label, status: res.status, preview: text.slice(0,200), ok: res.ok });
      } catch (e) {
        out.push({ label: t.label, status: "ERR", preview: String(e), ok: false });
      }
      setResults([...out]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <h1 className="text-xl font-bold mb-1">Diagnostic API GSI</h1>
      <p className="text-slate-400 text-sm mb-5">Route correcte: <code className="text-amber-400">/api/db/:collection</code></p>
      <button onClick={run} disabled={loading}
        className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl mb-6 transition-colors disabled:opacity-50">
        {loading ? "Test en cours..." : "Lancer les tests"}
      </button>
      <div className="space-y-3">
        {results.map(r => (
          <div key={r.label} className={`rounded-xl p-4 border ${r.ok ? "bg-emerald-900/30 border-emerald-500/40" : "bg-red-900/20 border-red-500/30"}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.ok ? "bg-emerald-500" : "bg-red-500"} text-white`}>{r.status}</span>
              <span className="text-sm font-mono text-white">{r.label}</span>
            </div>
            <div className="text-xs text-slate-300 font-mono break-all bg-slate-800 rounded-lg p-2">{r.preview}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
