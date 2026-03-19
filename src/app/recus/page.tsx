"use client";
import { useState } from "react";
import { Receipt, Download, Search, Eye, Printer } from "lucide-react";
import { PAYMENTS, formatMGA } from "@/lib/data";

export default function RecusPage() {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const paid = PAYMENTS.filter(p => p.statut === "payé");
  const filtered = paid.filter(p => {
    const q = search.toLowerCase();
    return p.etudiantNom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
  });

  const previewPayment = preview ? PAYMENTS.find(p => p.id === preview) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reçus</h1>
          <p className="text-sm text-slate-500 mt-0.5">{paid.length} reçus générés</p>
        </div>
      </div>

      <div className="card">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un reçu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>

      {/* Grid of receipts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="card hover:shadow-md transition-shadow border border-slate-100 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <Receipt size={18} className="text-brand-600" />
              </div>
              <span className="text-xs font-mono text-slate-400">{p.reference}</span>
            </div>
            <div className="font-bold text-slate-900 mb-0.5">{p.etudiantNom}</div>
            <div className="text-xs text-slate-400 mb-3">{p.filiere} · {p.classe}</div>
            <div className="text-2xl font-bold text-brand-700 mb-3">{formatMGA(p.montant)}</div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
              <span>{p.date}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-full">{p.mode}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPreview(p.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Eye size={13} /> Aperçu
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors">
                <Download size={13} /> Télécharger
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Receipt size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun reçu trouvé</p>
          </div>
        )}
      </div>

      {/* Receipt Preview Modal */}
      {previewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Receipt header */}
            <div className="bg-brand-600 rounded-t-2xl px-6 py-5 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">GSI SmartPay</div>
                <div className="text-xs opacity-70">REÇU OFFICIEL</div>
              </div>
              <div className="text-xs opacity-70">Établissement GSI — Gestion des Écolages</div>
            </div>

            {/* Receipt body */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Référence</span>
                <span className="font-mono font-bold text-slate-900">{previewPayment.reference}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="space-y-2 text-sm">
                {[
                  { label: "Étudiant", value: previewPayment.etudiantNom },
                  { label: "Filière", value: `${previewPayment.filiere} — ${previewPayment.classe}` },
                  { label: "Date de paiement", value: previewPayment.date },
                  { label: "Mode de paiement", value: previewPayment.mode },
                  { label: "Agent", value: previewPayment.agent },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Montant payé</span>
                <span className="text-2xl font-bold text-brand-700">{formatMGA(previewPayment.montant)}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-center">
                <span className="text-emerald-700 font-bold text-sm">✓ Paiement confirmé</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Fermer
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900">
                <Printer size={14} /> Imprimer
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
