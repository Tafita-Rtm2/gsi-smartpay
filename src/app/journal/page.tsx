"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, BookOpen, TrendingUp, TrendingDown, ChevronDown, RefreshCw, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchPaiements, DBPaiement, DBExpense, formatMGA } from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";

const CATEGORIES = ["Toutes", "Charges", "Materiel", "RH", "Autre"];

export default function JournalPage() {
  const { myExpenses, addExpense, updateExpense, deleteExpense, currentUser } = useAuth();
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"recettes" | "depenses">("recettes");
  const [catFilter, setCatFilter] = useState("Toutes");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DBExpense | null>(null);
  const [form, setForm] = useState({ libelle: "", categorie: "Charges", montant: "", date: new Date().toISOString().split("T")[0] });

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const etabColor = etabInfo?.color || "#2563eb";
  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const pays = await fetchPaiements();
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      setPaiements(pays.filter(p => (p.campus || "").toLowerCase().includes(myEtab)));
    } else {
      setPaiements(pays);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const totalRecettes = paiements.reduce((s, p) => s + p.montant, 0);
  const totalDepenses = myExpenses.reduce((s, e) => s + e.montant, 0);
  const solde = totalRecettes - totalDepenses;

  const filteredExpenses = myExpenses.filter(e =>
    catFilter === "Toutes" || e.categorie === catFilter
  );

  const handleAddExpense = () => {
    if (!form.libelle || !form.montant) return;
    if (editingExpense) {
      const id = editingExpense.id || editingExpense._id || "";
      updateExpense(id, {
        libelle: form.libelle,
        categorie: form.categorie,
        montant: Number(form.montant),
        date: form.date,
      });
    } else {
      addExpense({
        libelle: form.libelle,
        categorie: form.categorie,
        montant: Number(form.montant),
        date: form.date,
        etablissement: currentUser!.etablissement,
        agentId: currentUser!.id,
        agentNom: `${currentUser!.prenom} ${currentUser!.nom}`,
      });
    }
    setShowModal(false);
    setEditingExpense(null);
    setForm({ libelle: "", categorie: "Charges", montant: "", date: new Date().toISOString().split("T")[0] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal Financier</h1>
          <p className="text-sm text-slate-500 mt-0.5">Recettes et depenses</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-sm transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border border-emerald-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Recettes</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{formatMGA(totalRecettes)}</div>
          <div className="text-xs text-slate-400 mt-1">{paiements.length} paiement(s) enregistre(s)</div>
        </div>
        <div className="card border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Depenses</span>
          </div>
          <div className="text-2xl font-bold text-red-700">{formatMGA(totalDepenses)}</div>
        </div>
        <div className={`card border ${solde >= 0 ? "border-brand-100" : "border-red-100"}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${solde >= 0 ? "bg-brand-50" : "bg-red-50"}`}>
              <BookOpen size={16} className={solde >= 0 ? "text-brand-600" : "text-red-600"} />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Solde Net</span>
          </div>
          <div className={`text-2xl font-bold ${solde >= 0 ? "text-brand-700" : "text-red-700"}`}>{formatMGA(solde)}</div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["recettes", "depenses"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            style={tab === t ? { color: etabColor } : {}}>
            {t === "recettes" ? "Journal des Recettes" : "Journal des Depenses"}
          </button>
        ))}
      </div>

      {tab === "recettes" && (
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="py-10 text-center"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: etabColor, borderTopColor: "transparent" }} /></div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["Date", "Reference", "Etudiant", "Filiere", "Montant", "Note", "Agent"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paiements.map((r, i) => (
                      <tr key={r.id || r._id || i} className="hover:bg-emerald-50/30">
                        <td className="px-4 py-3 text-xs text-slate-500">{r.date}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.reference || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.etudiantNom}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{r.filiere}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{formatMGA(r.montant)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{r.note || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.agentNom}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50 border-t-2 border-emerald-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total Recettes</td>
                      <td className="px-4 py-3 font-bold text-emerald-700 text-base">{formatMGA(totalRecettes)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100">
                {paiements.map((r, i) => (
                  <div key={r.id || r._id || i} className="p-4 space-y-1">
                    <div className="flex justify-between"><span className="font-semibold text-slate-900 text-sm">{r.etudiantNom}</span><span className="font-bold text-emerald-700">{formatMGA(r.montant)}</span></div>
                    <div className="flex gap-2 text-xs text-slate-400"><span>{r.date}</span>{r.note && <span>{r.note}</span>}<span>{r.agentNom}</span></div>
                  </div>
                ))}
                {paiements.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">Aucune recette</div>}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "depenses" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative">
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors self-start"
              style={{ background: "#ef4444" }}>
              <Plus size={15} /> Ajouter une depense
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Date", "Libelle", "Categorie", "Agent", "Montant", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExpenses.map(e => {
                    const id = e.id || e._id || "";
                    return (
                      <tr key={id} className="hover:bg-red-50/20">
                        <td className="px-4 py-3 text-xs text-slate-500">{e.date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{e.libelle}</td>
                        <td className="px-4 py-3"><span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">{e.categorie}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{e.agentNom}</td>
                        <td className="px-4 py-3 font-bold text-red-700">{formatMGA(e.montant)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setEditingExpense(e);
                              setForm({ libelle: e.libelle, categorie: e.categorie, montant: String(e.montant), date: e.date });
                              setShowModal(true);
                            }} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={14} /></button>
                            <button onClick={() => { if (confirm("Supprimer cette dépense ?")) deleteExpense(id); }}
                              className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot className="bg-red-50 border-t-2 border-red-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total Depenses</td>
                      <td className="px-4 py-3 font-bold text-red-700 text-base">{formatMGA(totalDepenses)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {filteredExpenses.map(e => {
                const id = e.id || e._id || "";
                return (
                  <div key={id} className="p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 text-sm">{e.libelle}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{e.categorie} · {e.date}</div>
                      <div className="flex gap-4 mt-2">
                        <button onClick={() => {
                          setEditingExpense(e);
                          setForm({ libelle: e.libelle, categorie: e.categorie, montant: String(e.montant), date: e.date });
                          setShowModal(true);
                        }} className="text-xs text-blue-600 font-medium">Modifier</button>
                        <button onClick={() => { if (confirm("Supprimer ?")) deleteExpense(id); }}
                          className="text-xs text-red-600 font-medium">Supprimer</button>
                      </div>
                    </div>
                    <span className="font-bold text-red-700 text-sm">{formatMGA(e.montant)}</span>
                  </div>
                );
              })}
              {filteredExpenses.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">Aucune depense</div>}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingExpense ? "Modifier la depense" : "Nouvelle depense"}</h2>
              <button onClick={() => { setShowModal(false); setEditingExpense(null); setForm({ libelle: "", categorie: "Charges", montant: "", date: new Date().toISOString().split("T")[0] }); }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none">x</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Libelle</label>
                <input type="text" placeholder="Ex: Facture electricite" value={form.libelle}
                  onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Montant (Ar)</label>
                  <input type="number" placeholder="Ex: 150000" value={form.montant}
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
                <label className="text-xs font-semibold text-slate-600 block mb-1">Categorie</label>
                <div className="relative">
                  <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                    className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {CATEGORIES.filter(c => c !== "Toutes").map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowModal(false); setEditingExpense(null); setForm({ libelle: "", categorie: "Charges", montant: "", date: new Date().toISOString().split("T")[0] }); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleAddExpense}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                {editingExpense ? "Mettre à jour" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
