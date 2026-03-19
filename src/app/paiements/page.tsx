"use client";
import { useState } from "react";
import { Search, Plus, ChevronDown, CreditCard, Download } from "lucide-react";
import { PAYMENTS, formatMGA, PaymentMode } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";

const MODES: PaymentMode[] = ["espèces", "MVola", "Orange Money", "Airtel Money", "virement"];

export default function PaiementsPage() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("Tous");
  const [statut, setStatut] = useState("Tous");
  const [showModal, setShowModal] = useState(false);

  const filtered = PAYMENTS.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.etudiantNom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
    const matchMode = mode === "Tous" || p.mode === mode;
    const matchStatut = statut === "Tous" || p.statut === statut;
    return matchSearch && matchMode && matchStatut;
  });

  const totalFiltered = filtered.filter(p => p.statut === "payé").reduce((s, p) => s + p.montant, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Journal des encaissements</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Download size={15} /> Exporter
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors"
          >
            <Plus size={16} /> Enregistrer un paiement
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total affiché", value: formatMGA(totalFiltered), color: "text-brand-700" },
          { label: "Nb paiements", value: filtered.length, color: "text-slate-700" },
          { label: "Payés", value: filtered.filter(p => p.statut === "payé").length, color: "text-emerald-600" },
          { label: "Impayés", value: filtered.filter(p => p.statut === "impayé").length, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par étudiant ou référence..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="relative">
            <select value={mode} onChange={e => setMode(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
              <option>Tous</option>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={statut} onChange={e => setStatut(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
              <option>Tous</option>
              <option value="payé">Payé</option>
              <option value="impayé">Impayé</option>
              <option value="en_attente">En attente</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Référence", "Étudiant", "Filière / Classe", "Montant", "Mode", "Date", "Agent", "Statut", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.reference}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.etudiantNom}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {p.filiere}<br />
                    <span className="bg-brand-50 text-brand-700 font-semibold px-1.5 py-0.5 rounded-full text-xs">{p.classe}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{formatMGA(p.montant)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{p.mode}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.date}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.agent}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.statut} /></td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-brand-600 hover:underline font-medium">Reçu</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun paiement trouvé</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map(p => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{p.etudiantNom}</div>
                  <div className="text-xs font-mono text-slate-400">{p.reference}</div>
                </div>
                <StatusBadge status={p.statut} />
              </div>
              <div className="text-xl font-bold text-slate-900">{formatMGA(p.montant)}</div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded-full">{p.mode}</span>
                <span>{p.date}</span>
                <span>{p.agent}</span>
              </div>
              <button className="text-xs text-brand-600 font-medium hover:underline">Générer reçu →</button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Enregistrer un paiement</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Matricule étudiant", placeholder: "GSI-2024-000", type: "text" },
                { label: "Montant (Ar)", placeholder: "Ex: 450000", type: "number" },
                { label: "Date", placeholder: "", type: "date" },
              ].map(({ label, placeholder, type }) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
                  <input type={type} placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mode de paiement</label>
                <div className="relative">
                  <select className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                    {MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Remarque</label>
                <textarea rows={2} placeholder="Optionnel..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-600/20">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
