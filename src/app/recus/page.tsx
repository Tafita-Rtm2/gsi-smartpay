"use client";
import { useState } from "react";
import { Receipt, Download, Search, Eye, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatMGA, ETABLISSEMENTS } from "@/lib/data";

export default function RecusPage() {
  const { myPayments, currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const paid = myPayments.filter(p => p.statut === "paye");
  const filtered = paid.filter(p => {
    const q = search.toLowerCase();
    return p.etudiantNom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
  });

  const previewPayment = preview ? paid.find(p => p.id === preview) : null;
  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recus</h1>
          <p className="text-sm text-slate-500 mt-0.5">{paid.length} recus generes</p>
        </div>
      </div>

      <div className="card">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher un recu..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="card hover:shadow-md transition-shadow border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (etabInfo?.color || "#2563eb") + "22" }}>
                <Receipt size={18} style={{ color: etabInfo?.color || "#2563eb" }} />
              </div>
              <span className="text-xs font-mono text-slate-400">{p.reference}</span>
            </div>
            <div className="font-bold text-slate-900 mb-0.5">{p.etudiantNom}</div>
            <div className="text-xs text-slate-400 mb-3 truncate">{p.filiere} · {p.classe}</div>
            <div className="text-2xl font-bold mb-3" style={{ color: etabInfo?.color || "#2563eb" }}>{formatMGA(p.montant)}</div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
              <span>{p.date}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-full">{p.mode}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(p.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Eye size={13} /> Apercu
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                style={{ background: etabInfo?.color || "#2563eb" }}>
                <Download size={13} /> PDF
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Receipt size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun recu trouve</p>
          </div>
        )}
      </div>

      {previewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="rounded-t-2xl px-6 py-5 text-white" style={{ background: etabInfo?.color || "#2563eb" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-lg">GSI SmartPay</div>
                <div className="text-xs opacity-70">RECU OFFICIEL</div>
              </div>
              <div className="text-xs opacity-70">{etabInfo?.label}</div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono font-bold text-slate-900">{previewPayment.reference}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="space-y-2 text-sm">
                {[
                  { label: "Etudiant", value: previewPayment.etudiantNom },
                  { label: "Filiere", value: `${previewPayment.filiere} — ${previewPayment.classe}` },
                  { label: "Date", value: previewPayment.date },
                  { label: "Mode", value: previewPayment.mode },
                  { label: "Agent", value: previewPayment.agentNom },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-medium text-slate-900 text-right truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Montant paye</span>
                <span className="text-2xl font-bold" style={{ color: etabInfo?.color || "#2563eb" }}>{formatMGA(previewPayment.montant)}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center">
                <span className="text-emerald-700 font-bold text-sm">Paiement confirme</span>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Fermer
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors">
                <Printer size={14} /> Imprimer
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
                style={{ background: etabInfo?.color || "#2563eb" }}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
