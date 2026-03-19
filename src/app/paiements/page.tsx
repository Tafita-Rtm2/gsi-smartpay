"use client";
import { useState } from "react";
import { Search, Plus, ChevronDown, CreditCard, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, formatMGA, PaymentMode } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";

const MODES: PaymentMode[] = ["especes", "MVola", "Orange Money", "Airtel Money", "virement"];

export default function PaiementsPage() {
  const { myPayments, myStudents, addPayment, currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("Tous");
  const [statut, setStatut] = useState("Tous");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    etudiantId: "", montant: "", date: new Date().toISOString().split("T")[0],
    mode: "especes" as PaymentMode, note: "",
  });
  const [formError, setFormError] = useState("");

  const filtered = myPayments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.etudiantNom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
    const matchMode = mode === "Tous" || p.mode === mode;
    const matchStatut = statut === "Tous" || p.statut === statut;
    return matchSearch && matchMode && matchStatut;
  });

  const totalFiltered = filtered.filter(p => p.statut === "paye").reduce((s, p) => s + p.montant, 0);

  const handleAdd = () => {
    setFormError("");
    const student = myStudents.find(s => s.id === form.etudiantId);
    if (!student) { setFormError("Veuillez selectionner un etudiant"); return; }
    if (!form.montant || Number(form.montant) <= 0) { setFormError("Montant invalide"); return; }
    addPayment({
      etudiantId: student.id,
      etudiantNom: `${student.prenom} ${student.nom}`,
      montant: Number(form.montant),
      date: form.date,
      mode: form.mode,
      statut: "paye",
      agentId: currentUser!.id,
      agentNom: `${currentUser!.prenom} ${currentUser!.nom}`,
      filiere: student.filiere,
      classe: student.classe,
      etablissement: currentUser!.etablissement,
      note: form.note,
    });
    setShowModal(false);
    setForm({ etudiantId: "", montant: "", date: new Date().toISOString().split("T")[0], mode: "especes", note: "" });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Journal des encaissements</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors self-start sm:self-auto">
          <Plus size={16} /> Enregistrer un paiement
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total encaisse", value: formatMGA(totalFiltered), color: "text-brand-700" },
          { label: "Nb paiements", value: filtered.length, color: "text-slate-700" },
          { label: "Confirmes", value: filtered.filter(p => p.statut === "paye").length, color: "text-emerald-600" },
          { label: "Impayes", value: filtered.filter(p => p.statut === "impaye").length, color: "text-red-600" },
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
            <input type="text" placeholder="Rechercher par etudiant ou reference..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
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
              <option value="paye">Paye</option>
              <option value="impaye">Impaye</option>
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
                {["Reference", "Etudiant", "Filiere / Classe", "Montant", "Mode", "Date", "Agent", "Statut"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.reference}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.etudiantNom}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="truncate max-w-[150px]">{p.filiere}</div>
                    <span className="bg-brand-50 text-brand-700 font-semibold px-1.5 py-0.5 rounded-full text-xs">{p.classe}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{formatMGA(p.montant)}</td>
                  <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{p.mode}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.date}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.agentNom}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <CreditCard size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun paiement trouve</p>
            </div>
          )}
        </div>
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
                <span>{p.agentNom}</span>
              </div>
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
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">x</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Etudiant</label>
                <div className="relative">
                  <select value={form.etudiantId} onChange={e => setForm(f => ({ ...f, etudiantId: e.target.value }))}
                    className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                    <option value="">Selectionner un etudiant</option>
                    {myStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.prenom} {s.nom} — {s.matricule}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Montant (Ar)</label>
                  <input type="number" placeholder="Ex: 450000" value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mode de paiement</label>
                <div className="relative">
                  <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as PaymentMode }))}
                    className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Note (optionnel)</label>
                <textarea rows={2} placeholder="Ex: 1ere tranche..." value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
              </div>
              {formError && <p className="text-red-500 text-xs">{formError}</p>}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
                Agent: <span className="font-bold">{currentUser?.prenom} {currentUser?.nom}</span> — {currentUser?.etablissement}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setFormError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleAdd}
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
