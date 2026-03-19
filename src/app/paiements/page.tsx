"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronDown, CreditCard, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchStudents, fetchPaiements, fetchEcolages, createPaiement, updateEcolage, DBStudent, DBPaiement, DBEcolage, getStudentId, getStudentName, formatMGA } from "@/lib/api";
import clsx from "clsx";

const MODES = ["especes", "MVola", "Orange Money", "Airtel Money", "virement"];
const STATUT_COLORS: Record<string, string> = {
  paye: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  impaye: "bg-red-100 text-red-700 border border-red-200",
  en_attente: "bg-amber-100 text-amber-700 border border-amber-200",
};

export default function PaiementsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [ecolages, setEcolages] = useState<DBEcolage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("Tous");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    etudiantId: "",
    montant: "",
    date: new Date().toISOString().split("T")[0],
    mode: "especes",
    note: "",
  });

  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s, e] = await Promise.all([fetchPaiements(), fetchStudents(), fetchEcolages()]);
    // Filter by campus if not admin
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myCampusStudents = s.filter(st => {
        const campus = (st.campus || "").toLowerCase();
        return campus.includes(myEtab) || campus.includes(myEtab.slice(0, 4));
      });
      const myIds = new Set(myCampusStudents.map(st => getStudentId(st)));
      setPaiements(p.filter(pay => myIds.has(pay.etudiantId)));
      setStudents(myCampusStudents);
      setEcolages(e.filter(ec => myIds.has(ec.etudiantId)));
    } else {
      setPaiements(p);
      setStudents(s);
      setEcolages(e);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = paiements.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = (p.etudiantNom || "").toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q);
    const matchMode = modeFilter === "Tous" || p.mode === modeFilter;
    return matchSearch && matchMode;
  });

  const totalEncaisse = paiements.reduce((s, p) => s + p.montant, 0);

  const handleAdd = async () => {
    setFormError("");
    const student = students.find(s => getStudentId(s) === form.etudiantId);
    if (!student) { setFormError("Veuillez selectionner un etudiant"); return; }
    if (!form.montant || Number(form.montant) <= 0) { setFormError("Montant invalide"); return; }
    setSaving(true);

    // Create payment
    const newPay = await createPaiement({
      etudiantId: getStudentId(student),
      etudiantNom: getStudentName(student),
      matricule: student.matricule,
      campus: student.campus || currentUser?.etablissement || "",
      filiere: student.filiere || "",
      classe: student.niveau || "L1",
      montant: Number(form.montant),
      date: form.date,
      mode: form.mode,
      agentId: currentUser?.id || "",
      agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
      note: form.note,
    });

    // Update ecolage if exists
    if (newPay) {
      const ecolage = ecolages.find(e => e.etudiantId === getStudentId(student));
      if (ecolage && (ecolage.id || ecolage._id)) {
        const newPaye = ecolage.montantPaye + Number(form.montant);
        const newStatut = newPaye >= ecolage.montantDu ? "paye" : newPaye > 0 ? "en_attente" : "impaye";
        await updateEcolage(ecolage.id || ecolage._id || "", {
          montantPaye: newPaye,
          statut: newStatut as "paye" | "impaye" | "en_attente",
        });
      }
    }

    await load();
    setSaving(false);
    setShowModal(false);
    setForm({ etudiantId: "", montant: "", date: new Date().toISOString().split("T")[0], mode: "especes", note: "" });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">{loading ? "Chargement..." : `${paiements.length} paiements enregistres`}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors">
            <Plus size={16} /> Enregistrer un paiement
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card"><div className="text-xl font-bold text-brand-700">{formatMGA(totalEncaisse)}</div><div className="text-xs text-slate-400 mt-0.5">Total encaisse</div></div>
        <div className="card"><div className="text-xl font-bold text-slate-900">{paiements.length}</div><div className="text-xs text-slate-400 mt-0.5">Nb paiements</div></div>
        <div className="card"><div className="text-xl font-bold text-slate-900">{students.length}</div><div className="text-xs text-slate-400 mt-0.5">Etudiants</div></div>
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
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
              <option>Tous</option>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><div className="w-7 h-7 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mx-auto mb-2" /><p className="text-slate-400 text-sm">Chargement...</p></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Reference", "Etudiant", "Campus", "Montant", "Mode", "Date", "Agent", "Note"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p, i) => (
                    <tr key={p.id || p._id || i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.reference || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.etudiantNom}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.campus}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatMGA(p.montant)}</td>
                      <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{p.mode}</span></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.date}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.agentNom}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="py-12 text-center text-slate-400"><CreditCard size={28} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Aucun paiement</p></div>}
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((p, i) => (
                <div key={p.id || p._id || i} className="p-4 space-y-1">
                  <div className="flex justify-between"><span className="font-semibold text-slate-900 text-sm">{p.etudiantNom}</span><span className="font-bold text-emerald-700">{formatMGA(p.montant)}</span></div>
                  <div className="flex gap-2 text-xs text-slate-400"><span>{p.date}</span><span>{p.mode}</span><span>{p.agentNom}</span></div>
                  {p.reference && <div className="font-mono text-xs text-slate-300">{p.reference}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Enregistrer un paiement</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-xl">x</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Etudiant</label>
                <div className="relative">
                  <select value={form.etudiantId} onChange={e => setForm(f => ({ ...f, etudiantId: e.target.value }))}
                    className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    <option value="">Selectionner un etudiant</option>
                    {students.map(s => <option key={getStudentId(s)} value={getStudentId(s)}>{getStudentName(s)} — {s.matricule || s.niveau || ""}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {/* Show ecolage info */}
              {form.etudiantId && (() => {
                const ec = ecolages.find(e => e.etudiantId === form.etudiantId);
                if (!ec) return <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Aucun ecolage defini pour cet etudiant</div>;
                return (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-slate-500">Total du</span><span className="font-bold text-slate-700">{formatMGA(ec.montantDu)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Deja paye</span><span className="font-bold text-emerald-700">{formatMGA(ec.montantPaye)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Reste</span><span className="font-bold text-red-600">{formatMGA(ec.montantDu - ec.montantPaye)}</span></div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Montant (Ar)</label>
                  <input type="number" placeholder="Ex: 450000" value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mode de paiement</label>
                <div className="relative">
                  <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}
                    className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
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
                Agent: <span className="font-bold">{currentUser?.prenom} {currentUser?.nom}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setFormError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-600/20 disabled:opacity-60">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
