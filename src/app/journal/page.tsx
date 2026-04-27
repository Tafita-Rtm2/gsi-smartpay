"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, BookOpen, TrendingUp, TrendingDown, ChevronDown, RefreshCw, Edit3, Trash2, Download, Printer, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchPaiements, DBPaiement, DBExpense, formatMGA } from "@/lib/api";
import clsx from "clsx";
import { ETABLISSEMENTS } from "@/lib/data";
import CustomModal from "@/components/CustomModal";

const CATEGORIES = ["Toutes", "Charges", "Materiel", "RH", "Autre"];

function normalizeString(str: any) {
  if (typeof str !== 'string') return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "et")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function JournalPage() {
  const { myExpenses, addExpense, updateExpense, deleteExpense, currentUser } = useAuth();
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"recettes" | "depenses">("recettes");

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterMonth, setFilterMonth] = useState(["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterType, setFilterType] = useState<"jour" | "mois" | "annee">("mois");

  const [filiereFilter, setFiliereFilter] = useState("Toutes");
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);

  const [catFilter, setCatFilter] = useState("Toutes");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DBExpense | null>(null);
  const [form, setForm] = useState({ libelle: "", categorie: "Charges", montant: "", date: new Date().toISOString().split("T")[0] });

  // Custom UI Modals state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  const showAlert = (title: string, message: string, type: "info" | "success" | "warning" | "danger" = "info") => {
    setModalConfig({ isOpen: true, title, message, type, confirmLabel: "OK" });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: "warning" | "danger" = "warning") => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm, confirmLabel: "Confirmer" });
  };

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const etabColor = etabInfo?.color || "#2563eb";
  const isAdmin = currentUser?.role === "admin";
  const filieres = etabInfo ? etabInfo.filieres : [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pays = await fetchPaiements();
      if (!isAdmin && currentUser) {
        const myEtab = (currentUser.etablissement || "").toLowerCase();
        setPaiements(pays.filter(p => {
          const sC = (p.campus || "").toLowerCase();
          return sC === myEtab || (myEtab === "antsirabe" && sC === "ants") || (myEtab === "ants" && sC === "antsirabe");
        }));
      } else {
        setPaiements(pays);
      }
    } catch (e) {
      console.error("Load journal error:", e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filteredPaiements = useMemo(() => {
    const normFiliere = normalizeString(filiereFilter);
    return paiements.filter(p => {
      let matchTime = false;
      if (filterType === "jour") matchTime = p.date === filterDate;
      else if (filterType === "mois") matchTime = !!(p.note?.includes(filterMonth) && p.note?.includes(filterYear));
      else matchTime = !!p.note?.includes(filterYear);

      const matchFiliere = filiereFilter === "Toutes" || normalizeString(p.filiere) === normFiliere;
      const matchNiveau = selectedNiveaux.length === 0 || selectedNiveaux.includes(p.classe || "");

      return matchTime && matchFiliere && matchNiveau;
    });
  }, [paiements, filterType, filterDate, filterMonth, filterYear, filiereFilter, selectedNiveaux]);

  const filteredExpenses = useMemo(() => {
    return myExpenses.filter(e => {
      const matchCat = catFilter === "Toutes" || e.categorie === catFilter;
      let matchTime = false;
      if (filterType === "jour") matchTime = e.date === filterDate;
      else if (filterType === "mois") {
        const d = new Date(e.date);
        const moisFr = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][d.getMonth()];
        matchTime = moisFr === filterMonth && String(d.getFullYear()) === filterYear;
      } else {
        matchTime = e.date.startsWith(filterYear);
      }
      return matchCat && matchTime;
    });
  }, [myExpenses, catFilter, filterType, filterDate, filterMonth, filterYear]);

  const totalRecettes = useMemo(() => filteredPaiements.reduce((s, p) => s + p.montant, 0), [filteredPaiements]);
  const totalDepenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.montant, 0), [filteredExpenses]);
  const solde = totalRecettes - totalDepenses;

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
      showAlert("Succès", "Dépense mise à jour.", "success");
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
      showAlert("Succès", "Dépense enregistrée.", "success");
    }
    setShowModal(false);
    setEditingExpense(null);
    setForm({ libelle: "", categorie: "Charges", montant: "", date: new Date().toISOString().split("T")[0] });
  };

  return (
    <div className="space-y-5">
      <CustomModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Journal Financier</h1>
          <p className="text-sm text-slate-500 mt-0.5">Suivi des flux de trésorerie</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Date", "Type", "Libelle", "Categorie", "Montant", "Agent"];
            const pRows = filteredPaiements.map(p => [p.date, "Recette", `Paiement ${p.etudiantNom}`, "Ecolage", p.montant, p.agentNom]);
            const eRows = filteredExpenses.map(e => [e.date, "Depense", e.libelle, e.categorie, e.montant, e.agentNom]);
            const rows = [...pRows, ...eRows].sort((a,b) => String(b[0]).localeCompare(String(a[0])));
            const csv = "\uFEFF" + [headers, ...rows].map(r => r.join(";")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `journal_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Printer size={15} /> Imprimer
          </button>
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
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
          <div className="text-xs text-slate-400 mt-1">{filteredPaiements.length} paiement(s) filtre(s)</div>
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

      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit shrink-0">
            {(["recettes", "depenses"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                style={tab === t ? { color: etabColor } : {}}>
                {t === "recettes" ? "Recettes" : "Depenses"}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-brand-200">
              <option value="jour">Par Jour</option>
              <option value="mois">Par Mois</option>
              <option value="annee">Par Année</option>
            </select>
            {filterType === "jour" && (
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-brand-200" />
            )}
            {filterType === "mois" && (
              <>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-brand-200">
                  {["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-brand-200">
                  {["2024", "2025", "2026"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {filterType === "annee" && (
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-brand-200">
                {["2024", "2025", "2026"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        </div>

        {tab === "recettes" && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {filieres.length > 0 && (
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase mr-2 flex items-center">Filières :</span>
                {["Toutes", ...filieres].map(f => (
                  <button key={f} onClick={() => setFiliereFilter(f)}
                    className={clsx("shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border whitespace-nowrap",
                      filiereFilter === f ? "text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                    style={filiereFilter === f ? { background: etabColor } : {}}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase mr-2 flex items-center">Niveaux :</span>
              {["L1", "L2", "L3", "M1", "M2"].map(n => (
                <button key={n}
                  onClick={() => setSelectedNiveaux(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])}
                  className={clsx("px-3 py-1 rounded-lg text-[10px] font-black transition-all border",
                    selectedNiveaux.includes(n) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                  {n}
                </button>
              ))}
              {(filiereFilter !== "Toutes" || selectedNiveaux.length > 0) && (
                <button onClick={() => { setFiliereFilter("Toutes"); setSelectedNiveaux([]); }} className="text-[10px] font-black text-brand-600 hover:underline ml-2 uppercase">Réinitialiser</button>
              )}
            </div>
          </div>
        )}
      </div>

      {tab === "recettes" && (
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: etabColor, borderTopColor: "transparent" }} />
              <p className="text-slate-400 text-sm">Chargement...</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["Date", "Reference", "Etudiant", "Filiere", "Niveau", "Montant", "Agent"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPaiements.map((r, i) => (
                      <tr key={r.id || r._id || i} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500">{r.date}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.reference || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.etudiantNom}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{r.filiere}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.classe || "—"}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{formatMGA(r.montant)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.agentNom}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50 border-t-2 border-emerald-100">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total Recettes</td>
                      <td className="px-4 py-3 font-bold text-emerald-700 text-base">{formatMGA(totalRecettes)}</td>
                      <td colSpan={1} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100">
                {filteredPaiements.map((r, i) => (
                  <div key={r.id || r._id || i} className="p-4 space-y-1">
                    <div className="flex justify-between"><span className="font-semibold text-slate-900 text-sm">{r.etudiantNom}</span><span className="font-bold text-emerald-700">{formatMGA(r.montant)}</span></div>
                    <div className="flex gap-2 text-xs text-slate-400"><span>{r.date}</span>{r.filiere && <span>{r.filiere}</span>}<span>{r.agentNom}</span></div>
                  </div>
                ))}
                {filteredPaiements.length === 0 && <div className="py-16 text-center text-slate-400 text-sm">Aucune recette trouvée pour cette période</div>}
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
                      <tr key={id} className="hover:bg-red-50/20 transition-colors">
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
                            <button onClick={() => {
                              showConfirm("Supprimer ?", "Voulez-vous supprimer cette dépense ?", () => deleteExpense(id), "danger");
                            }}
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
                        <button onClick={() => {
                          showConfirm("Supprimer ?", "Voulez-vous supprimer cette dépense ?", () => deleteExpense(id), "danger");
                        }}
                          className="text-xs text-red-600 font-medium">Supprimer</button>
                      </div>
                    </div>
                    <span className="font-bold text-red-700 text-sm">{formatMGA(e.montant)}</span>
                  </div>
                );
              })}
              {filteredExpenses.length === 0 && <div className="py-16 text-center text-slate-400 text-sm">Aucune dépense trouvée</div>}
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
