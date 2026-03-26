"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronDown, CreditCard, RefreshCw, X, Check, Trash2, AlertTriangle, Edit3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchStudents, fetchPaiements, fetchEcolages, createPaiement, updateEcolage, updatePaiement, DBStudent, DBPaiement, DBEcolage, getStudentId, getStudentName, formatMGA } from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";

const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

export default function PaiementsPage() {
  const { currentUser } = useAuth();
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPaiement, setEditingPaiement] = useState<DBPaiement | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DBPaiement | null>(null);
  const [deleting,  setDeleting]  = useState(false);

  // Student picker
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedStudent,   setSelectedStudent]   = useState<DBStudent | null>(null);
  const [studentSearch,     setStudentSearch]     = useState("");
  const [filiereFilter,     setFiliereFilter]     = useState("Toutes");

  const [form, setForm] = useState({
    mois:    MOIS[new Date().getMonth()],
    annee:   String(new Date().getFullYear()),
    montant: "",
    date:    new Date().toISOString().split("T")[0],
    note:    "",
  });

  const isAdmin   = currentUser?.role === "admin";
  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const etabColor = etabInfo?.color || "#2563eb";
  const filieres  = etabInfo ? etabInfo.filieres : [];

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s, e] = await Promise.all([fetchPaiements(), fetchStudents(), fetchEcolages()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myS = s.filter(st => (st.campus || "").toLowerCase().includes(myEtab));
      const myIds = new Set(myS.map(st => getStudentId(st)));
      setPaiements(p.filter(pay => myIds.has(pay.etudiantId)));
      setStudents(myS);
      setEcolages(e.filter(ec => myIds.has(ec.etudiantId)));
    } else {
      setPaiements(p); setStudents(s); setEcolages(e);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = paiements.filter(p => {
    const q = search.toLowerCase();
    return (p.etudiantNom || "").toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q);
  });

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    const matchSearch = getStudentName(s).toLowerCase().includes(q) || (s.matricule || "").toLowerCase().includes(q);
    const matchFiliere = filiereFilter === "Toutes" || (s.filiere || "") === filiereFilter;
    return matchSearch && matchFiliere;
  });

  const totalEncaisse = paiements.reduce((s, p) => s + p.montant, 0);

  const handleAdd = async () => {
    setFormError("");
    if (!selectedStudent) { setFormError("Selectionnez un etudiant"); return; }
    if (!form.montant || Number(form.montant) <= 0) { setFormError("Montant invalide"); return; }

    const ec = ecolages.find(e => e.etudiantId === getStudentId(selectedStudent));
    if (!ec) {
      setFormError("Cet etudiant n'a pas d'ecolage defini. Allez dans la page Etudiants pour en creer un.");
      return;
    }

    setSaving(true);
    const montant = Number(form.montant);
    const note = `${form.mois} ${form.annee}${form.note ? " — " + form.note : ""}`;

    await createPaiement({
      etudiantId:  getStudentId(selectedStudent),
      etudiantNom: getStudentName(selectedStudent),
      matricule:   selectedStudent.matricule,
      campus:      selectedStudent.campus || currentUser?.etablissement || "",
      filiere:     selectedStudent.filiere || "",
      classe:      selectedStudent.niveau || "L1",
      montant,
      date:        form.date,
      mode:        "Especes",
      agentId:     currentUser?.id || "",
      agentNom:    `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
      note,
    });

    // Update ecolage
    if (ec && (ec.id || ec._id)) {
      const newPaye = ec.montantPaye + montant;
      const newStatut: "paye"|"impaye"|"en_attente" =
        newPaye >= ec.montantDu ? "paye" : newPaye > 0 ? "en_attente" : "impaye";
      await updateEcolage(ec.id || ec._id || "", { montantPaye: newPaye, statut: newStatut });
    }

    await load();
    setSaving(false);
    setShowModal(false);
    setSelectedStudent(null);
    setStudentSearch("");
    setForm({ mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()), montant: "", date: new Date().toISOString().split("T")[0], note: "" });
  };

  const handleEdit = async () => {
    if (!editingPaiement || !form.montant || Number(form.montant) <= 0) {
      setFormError("Montant invalide"); return;
    }
    setSaving(true);
    const id = editingPaiement.id || editingPaiement._id || "";
    const newMontant = Number(form.montant);
    const note = `${form.mois} ${form.annee}${form.note ? " — " + form.note : ""}`;

    // Update payment record
    await updatePaiement(id, {
      montant: newMontant,
      date: form.date,
      note,
    });

    // Update student's total paid in ecolage record
    const ec = ecolages.find(e => e.etudiantId === editingPaiement.etudiantId);
    if (ec && (ec.id || ec._id)) {
      const difference = newMontant - editingPaiement.montant;
      const newTotalPaye = ec.montantPaye + difference;
      const newStatut: "paye"|"impaye"|"en_attente" =
        newTotalPaye >= ec.montantDu ? "paye" : newTotalPaye > 0 ? "en_attente" : "impaye";
      await updateEcolage(ec.id || ec._id || "", { montantPaye: newTotalPaye, statut: newStatut });
    }

    await load();
    setSaving(false);
    setEditingPaiement(null);
    setForm({ mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()), montant: "", date: new Date().toISOString().split("T")[0], note: "" });
  };

  const openEdit = (p: DBPaiement) => {
    setEditingPaiement(p);
    let m = MOIS[new Date().getMonth()];
    let y = String(new Date().getFullYear());
    let noteTxt = p.note || "";

    for (const mois of MOIS) {
      if (noteTxt.startsWith(mois)) {
        m = mois;
        const rest = noteTxt.slice(mois.length).trim();
        const yearMatch = rest.match(/^(\d{4})/);
        if (yearMatch) {
          y = yearMatch[1];
          noteTxt = rest.slice(4).replace(/^(\s*—\s*)/, "").trim();
        }
        break;
      }
    }

    setForm({
      mois: m,
      annee: y,
      montant: String(p.montant),
      date: p.date,
      note: noteTxt,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    // Mark payment as deleted by patching first to make sure it exists
    const id = deleteConfirm.id || deleteConfirm._id || "";
    if (id) {
      const { API_BASE } = await import("@/lib/api");
      await fetch(`${API_BASE}/db/paiements/${id}`, { method: "DELETE" }).catch(() => {});
    }

    // Reverse the ecolage payment
    const ec = ecolages.find(e => e.etudiantId === deleteConfirm.etudiantId);
    if (ec && (ec.id || ec._id)) {
      const newPaye = Math.max(0, ec.montantPaye - deleteConfirm.montant);
      const newStatut: "paye"|"impaye"|"en_attente" =
        newPaye >= ec.montantDu ? "paye" : newPaye > 0 ? "en_attente" : "impaye";
      await updateEcolage(ec.id || ec._id || "", { montantPaye: newPaye, statut: newStatut });
    }
    await load();
    setDeleting(false);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">{loading ? "Chargement..." : `${paiements.length} paiements`}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
            style={{ background: etabColor }}>
            <Plus size={16} /> Enregistrer paiement
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card"><div className="text-xl font-bold text-emerald-700">{formatMGA(totalEncaisse)}</div><div className="text-xs text-slate-400 mt-0.5">Total encaisse</div></div>
        <div className="card"><div className="text-xl font-bold text-slate-900">{paiements.length}</div><div className="text-xs text-slate-400 mt-0.5">Paiements</div></div>
        <div className="card"><div className="text-xl font-bold text-slate-900">{students.length}</div><div className="text-xs text-slate-400 mt-0.5">Etudiants</div></div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher par etudiant ou reference..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: etabColor, borderTopColor: "transparent" }} />
            <p className="text-slate-400 text-sm">Chargement...</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Reference", "Etudiant", "Montant", "Date", "Note", "Agent", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p, i) => (
                    <tr key={p.id || p._id || i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.reference || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.etudiantNom}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatMGA(p.montant)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.date}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.note || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.agentNom}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(p)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <CreditCard size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucun paiement</p>
                </div>
              )}
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((p, i) => (
                <div key={p.id || p._id || i} className="p-4 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{p.etudiantNom}</div>
                      <div className="font-mono text-xs text-slate-400">{p.reference || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-700">{formatMGA(p.montant)}</span>
                      <button onClick={() => openEdit(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-400">
                    <span>{p.date}</span>
                    {p.note && <span>· {p.note}</span>}
                    <span>· {p.agentNom}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── PAYMENT MODAL (ADD/EDIT) ─── */}
      {(showModal || editingPaiement) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editingPaiement ? "Modifier le paiement" : "Enregistrer un paiement"}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editingPaiement ? "Modifier les details de cette transaction" : "Paiement mensuel de l'ecolage"}</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingPaiement(null); setSelectedStudent(null); setFormError(""); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            {/* Student selector */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Etudiant</label>
              {editingPaiement ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl opacity-70">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: etabColor }}>
                    {editingPaiement.etudiantNom.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{editingPaiement.etudiantNom}</div>
                    <div className="text-xs text-slate-500">{editingPaiement.matricule} · {editingPaiement.filiere}</div>
                  </div>
                </div>
              ) : selectedStudent ? (
                <div className="flex items-center gap-3 p-3 bg-brand-50 border-2 border-brand-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: etabColor }}>
                    {getStudentName(selectedStudent).split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{getStudentName(selectedStudent)}</div>
                    <div className="text-xs text-slate-500">{selectedStudent.matricule} · {selectedStudent.filiere}</div>
                    {(() => {
                      const ec = ecolages.find(e => e.etudiantId === getStudentId(selectedStudent));
                      if (!ec || ec.montantDu === 0) return <div className="text-xs text-amber-600 mt-0.5">Aucun ecolage defini</div>;
                      return <div className="text-xs text-red-500 mt-0.5">Reste: {formatMGA(ec.montantDu - ec.montantPaye)}</div>;
                    })()}
                  </div>
                  <button onClick={() => setSelectedStudent(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowStudentPicker(true)}
                  className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50 transition-all text-sm">
                  <Search size={16} />
                  <span>Cliquer pour selectionner un etudiant...</span>
                </button>
              )}
            </div>

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Mois de paiement</label>
                <div className="relative">
                  <select value={form.mois} onChange={e => setForm(f=>({...f,mois:e.target.value}))}
                    className="appearance-none w-full px-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {MOIS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Annee</label>
                <div className="relative">
                  <select value={form.annee} onChange={e => setForm(f=>({...f,annee:e.target.value}))}
                    className="appearance-none w-full px-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {["2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Montant (Ar) <span className="text-red-500">*</span></label>
                <input type="number" placeholder="Ex: 150000" value={form.montant}
                  onChange={e => setForm(f=>({...f,montant:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f=>({...f,date:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>

            {/* Mode badge */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: etabColor }}>
                <Check size={12} className="text-white" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Mode de paiement</div>
                <div className="text-sm font-semibold text-slate-800">Especes</div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Note (optionnel)</label>
              <input type="text" placeholder="Ex: 1ere tranche, complement..." value={form.note}
                onChange={e => setForm(f=>({...f,note:e.target.value}))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>

            {formError && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
              Agent: <span className="font-bold">{currentUser?.prenom} {currentUser?.nom}</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setEditingPaiement(null); setSelectedStudent(null); setFormError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={editingPaiement ? handleEdit : handleAdd} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: etabColor }}>
                {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Traitement...</> : (editingPaiement ? "Modifier" : "Enregistrer")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STUDENT PICKER ─── */}
      {showStudentPicker && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Selectionner un etudiant</h3>
                <p className="text-xs text-slate-400 mt-0.5">{filteredStudents.length} etudiant(s)</p>
              </div>
              <button onClick={() => setShowStudentPicker(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Rechercher par nom ou matricule..." value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)} autoFocus
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              {!isAdmin && filieres.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {["Toutes", ...filieres].map(f => (
                    <button key={f} onClick={() => setFiliereFilter(f)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${filiereFilter === f ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-600"}`}
                      style={filiereFilter === f ? { background: etabColor } : {}}>
                      {f === "Toutes" ? "Toutes" : f.length > 20 ? f.slice(0,20)+"…" : f}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">Aucun etudiant</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredStudents.map(s => {
                    const ec = ecolages.find(e => e.etudiantId === getStudentId(s));
                    const initials = getStudentName(s).split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                    return (
                      <button key={getStudentId(s)}
                        onClick={() => { setSelectedStudent(s); setShowStudentPicker(false); }}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-brand-50/60 transition-colors text-left group">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                          style={{ background: etabColor }}>
                          {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover rounded-full" /> : initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm group-hover:text-brand-700">{getStudentName(s)}</div>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            {s.matricule && <span className="font-mono text-xs text-slate-400">{s.matricule}</span>}
                            {s.filiere && <span className="text-xs text-slate-400 truncate max-w-[160px]">{s.filiere}</span>}
                            {s.niveau && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: etabColor+"99" }}>{s.niveau}</span>}
                          </div>
                          {ec && ec.montantDu > 0 && (
                            <div className="flex gap-3 mt-0.5 text-xs">
                              <span className="text-emerald-600">Paye: {formatMGA(ec.montantPaye)}</span>
                              {ec.montantDu > ec.montantPaye && <span className="text-red-500">Reste: {formatMGA(ec.montantDu - ec.montantPaye)}</span>}
                            </div>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 group-hover:border-brand-400 flex items-center justify-center transition-all shrink-0">
                          <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-brand-400 transition-all" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto">
              <AlertTriangle size={26} className="text-red-600" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Supprimer ce paiement ?</h2>
              <p className="text-sm text-slate-500">Le montant sera deduit du total paye de l&apos;etudiant.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center space-y-0.5">
              <div className="font-bold text-slate-900">{deleteConfirm.etudiantNom}</div>
              <div className="text-lg font-bold text-red-700">{formatMGA(deleteConfirm.montant)}</div>
              <div className="text-xs text-slate-400">{deleteConfirm.date} · {deleteConfirm.note || ""}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Non, annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</>
                  : <><Trash2 size={15} />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
