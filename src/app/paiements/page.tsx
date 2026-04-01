"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, ChevronDown, CreditCard, RefreshCw, X, Check, Trash2, AlertTriangle, Edit3, Upload, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchStudents, fetchPaiements, fetchEcolages, createPaiement, updateEcolage, updatePaiement, deletePaiement, DBStudent, DBPaiement, DBEcolage, getStudentId, getStudentName, formatMGA, calculateIntelligentStatus } from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";
import clsx from "clsx";
import CustomModal from "@/components/CustomModal";

const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

function normalizeString(str: any) {
  if (typeof str !== 'string') return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "et")
    .replace(/hote(l+)erie/g, "hotellerie")
    .replace(/voyage(s?)/g, "voyage")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function PaiementsPage() {
  const { currentUser, appState } = useAuth();
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterMonth, setFilterMonth] = useState(MOIS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterType, setFilterType] = useState<"jour" | "mois" | "annee">("mois");
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingPaiement, setEditingPaiement] = useState<DBPaiement | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DBPaiement | null>(null);
  const [deleting,  setDeleting]  = useState(false);
  const [approvalDesc, setApprovalDesc] = useState("");

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
    mode:    "Especes",
    transactionRef: "",
    preuve:  "",
    preuveFilename: "",
    note:    "",
  });

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

  const isAdmin   = currentUser?.role === "admin";
  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const etabColor = etabInfo?.color || "#2563eb";
  const filieres  = etabInfo ? etabInfo.filieres : [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (e) {
      console.error("Load payments error:", e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return paiements.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = (p.etudiantNom || "").toLowerCase().includes(q) || (p.reference || "").toLowerCase().includes(q);

      let matchTime = false;
      if (filterType === "jour") {
        matchTime = p.date === filterDate;
      } else if (filterType === "mois") {
        matchTime = !!(p.note?.includes(filterMonth) && p.note?.includes(filterYear));
      } else {
        matchTime = !!p.note?.includes(filterYear);
      }

      const matchNiveau = selectedNiveaux.length === 0 || selectedNiveaux.includes(p.classe || "");

      return matchSearch && matchTime && matchNiveau;
    });
  }, [paiements, search, filterType, filterDate, filterMonth, filterYear, selectedNiveaux]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = studentSearch.toLowerCase();
      const matchSearch = getStudentName(s).toLowerCase().includes(q) || (s.matricule || "").toLowerCase().includes(q);
      const matchFiliere = filiereFilter === "Toutes" || (s.filiere || "") === filiereFilter;
      return matchSearch && matchFiliere;
    });
  }, [students, studentSearch, filiereFilter]);

  const totalEncaisse = useMemo(() => filtered.reduce((s, p) => s + p.montant, 0), [filtered]);

  const handleAdd = async () => {
    setFormError("");
    if (!selectedStudent) { setFormError("Selectionnez un etudiant"); return; }
    if (!form.montant || Number(form.montant) <= 0) { setFormError("Montant invalide"); return; }

    setSaving(true);
    let ec = ecolages.find(e => e.etudiantId === getStudentId(selectedStudent));

    // Auto-create ecolage if missing
    if (!ec) {
      const campus = (selectedStudent.campus || "").toLowerCase();
      const sFiliere = selectedStudent.filiere || "";
      const sNiveau = selectedStudent.niveau || "L1";
      const config = appState.programFees.find(p => p.campus === campus && normalizeString(p.filiere) === normalizeString(sFiliere));
      const amount = config?.amount || 1500000;
      const { createEcolage } = await import("@/lib/api");
      ec = await createEcolage({
        etudiantId: getStudentId(selectedStudent),
        etudiantNom: getStudentName(selectedStudent),
        matricule: selectedStudent.matricule || "",
        campus: selectedStudent.campus || currentUser?.etablissement || "",
        filiere: sFiliere,
        classe: sNiveau,
        montantDu: amount,
        montantPaye: 0,
        statut: "impaye",
        annee: "2026",
      }) || undefined;
    }

    if (!ec) {
      setFormError("Impossible de créer le dossier d'écolage.");
      setSaving(false);
      return;
    }
    const montant = Number(form.montant);
    const note = `${form.mois} ${form.annee}${form.note ? " — " + form.note : ""}`;

    await createPaiement({
      etudiantId:  getStudentId(selectedStudent),
      etudiantNom: getStudentName(selectedStudent),
      matricule:   selectedStudent.matricule || "",
      campus:      selectedStudent.campus || currentUser?.etablissement || "",
      filiere:     selectedStudent.filiere || "",
      classe:      selectedStudent.niveau || "L1",
      montant,
      date:        form.date,
      mode:        form.mode,
      transactionRef: form.transactionRef,
      preuve:      form.preuve,
      preuveFilename: form.preuveFilename,
      agentId:     currentUser?.id || "",
      agentNom:    `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
      note,
    });

    if (ec && (ec.id || ec._id)) {
      const newPaye = ec.montantPaye + montant;
      const newStatut = calculateIntelligentStatus(newPaye, ec.montantDu, ec.montantMensuel);
      await updateEcolage(ec.id || ec._id || "", { montantPaye: newPaye, statut: newStatut });
    }

    showAlert("Succès", "Paiement enregistré avec succès.", "success");
    await load();
    setSaving(false);
    setShowModal(false);
    setSelectedStudent(null);
    setStudentSearch("");
    setForm({ mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()), montant: "", date: new Date().toISOString().split("T")[0], note: "", mode: "Especes", transactionRef: "", preuve: "", preuveFilename: "" });
  };

  const handleEdit = async () => {
    if (!editingPaiement || !form.montant || Number(form.montant) <= 0) {
      setFormError("Montant invalide"); return;
    }
    if (!isAdmin && !approvalDesc) {
      setFormError("Veuillez fournir une description pour la demande de modification"); return;
    }
    setSaving(true);
    const id = editingPaiement.id || editingPaiement._id || "";
    const newMontant = Number(form.montant);
    const note = `${form.mois} ${form.annee}${form.note ? " — " + form.note : ""}`;

    if (isAdmin) {
      await updatePaiement(id, {
        montant: newMontant,
        date: form.date,
        mode: form.mode,
        transactionRef: form.transactionRef,
        preuve: form.preuve,
        preuveFilename: form.preuveFilename,
        note,
      });

      const ec = ecolages.find(e => e.etudiantId === editingPaiement.etudiantId);
      if (ec && (ec.id || ec._id)) {
        const difference = newMontant - editingPaiement.montant;
        const newTotalPaye = ec.montantPaye + difference;
        const newStatut = calculateIntelligentStatus(newTotalPaye, ec.montantDu, ec.montantMensuel);
        await updateEcolage(ec.id || ec._id || "", { montantPaye: newTotalPaye, statut: newStatut });
      }
      showAlert("Succès", "Le paiement a été mis à jour.", "success");
    } else {
      const { createRequest } = await import("@/lib/api");
      await createRequest({
        type: "update_paiement",
        collection: "paiements",
        targetId: id,
        payload: { montant: newMontant, date: form.date, mode: form.mode, transactionRef: form.transactionRef, preuve: form.preuve, note },
        description: approvalDesc,
        agentId: currentUser?.id || "",
        agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
        campus: currentUser?.etablissement || "",
        status: "pending"
      });
      showAlert("Demande envoyée", "Votre demande de modification a été envoyée pour approbation.", "info");
    }

    await load();
    setSaving(false);
    setEditingPaiement(null);
    setApprovalDesc("");
    setForm({ mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()), montant: "", date: new Date().toISOString().split("T")[0], note: "", mode: "Especes", transactionRef: "", preuve: "", preuveFilename: "" });
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
      mode: p.mode || "Especes",
      transactionRef: p.transactionRef || "",
      preuve: p.preuve || "",
      preuveFilename: p.preuveFilename || "",
      note: noteTxt,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (!isAdmin && !approvalDesc) {
      setFormError("Veuillez fournir une description pour la suppression"); return;
    }
    setDeleting(true);
    const id = deleteConfirm.id || deleteConfirm._id || "";
    if (id) {
      if (isAdmin) {
        await deletePaiement(id);
        const ec = ecolages.find(e => e.etudiantId === deleteConfirm.etudiantId);
        if (ec && (ec.id || ec._id)) {
          const newPaye = Math.max(0, ec.montantPaye - deleteConfirm.montant);
          const newStatut = calculateIntelligentStatus(newPaye, ec.montantDu, ec.montantMensuel);
          await updateEcolage(ec.id || ec._id || "", { montantPaye: newPaye, statut: newStatut });
        }
        showAlert("Succès", "Le paiement a été supprimé.", "info");
      } else {
        const { createRequest } = await import("@/lib/api");
        await createRequest({
          type: "delete_paiement",
          collection: "paiements",
          targetId: id,
          payload: { montant: deleteConfirm.montant, etudiantId: deleteConfirm.etudiantId },
          description: approvalDesc,
          agentId: currentUser?.id || "",
          agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
          campus: currentUser?.etablissement || "",
          status: "pending"
        });
        showAlert("Demande envoyée", "Votre demande de suppression a été envoyée pour approbation.", "info");
      }
    }

    await load();
    setDeleting(false);
    setDeleteConfirm(null);
    setApprovalDesc("");
  };

  return (
    <div className="space-y-5">
      <CustomModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">{loading ? "Chargement..." : `${paiements.length} paiements enregistrés`}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => {
            const headers = ["Reference", "Date", "Etudiant", "Matricule", "Filiere", "Niveau", "Montant", "Note", "Agent", "Mode"];
            const rows = filtered.map(p => [
              p.reference || "", p.date, p.etudiantNom, p.matricule || "", p.filiere, p.classe, p.montant, p.note || "", p.agentNom, p.mode
            ]);
            const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.setAttribute("href", URL.createObjectURL(blob));
            link.setAttribute("download", `paiements_${new Date().toISOString().slice(0, 10)}.csv`);
            link.click();
          }} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm">
            Exporter Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm">
            Imprimer
          </button>
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg transition-all hover:scale-[1.02]"
            style={{ background: etabColor }}>
            <Plus size={16} /> Nouveau paiement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border border-emerald-100">
          <div className="text-xl font-black text-emerald-700 tracking-tight">{formatMGA(totalEncaisse)}</div>
          <div className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Total filtré</div>
        </div>
        <div className="card">
          <div className="text-xl font-black text-slate-900 tracking-tight">{filtered.length}</div>
          <div className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Transactions affichées</div>
        </div>
        <div className="card">
          <div className="text-xl font-black text-slate-900 tracking-tight">{students.length}</div>
          <div className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Étudiants campus</div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher par étudiant ou référence..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm border border-slate-100 bg-slate-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="flex gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-600">
              <option value="jour">Jour</option>
              <option value="mois">Mois</option>
              <option value="annee">Année</option>
            </select>
            {filterType === "jour" && (
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none" />
            )}
            {filterType === "mois" && (
              <>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold">
                  {MOIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold">
                  {["2024", "2025", "2026", "2027"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {filterType === "annee" && (
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold">
                {["2024", "2025", "2026", "2027"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase mr-2 flex items-center">Filtrer par niveau :</span>
          {["L1", "L2", "L3", "M1", "M2"].map(n => (
            <button key={n}
              onClick={() => setSelectedNiveaux(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])}
              className={clsx("px-3 py-1 rounded-lg text-[10px] font-black transition-all border uppercase",
                selectedNiveaux.includes(n) ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
              {n}
            </button>
          ))}
          {selectedNiveaux.length > 0 && (
            <button onClick={() => setSelectedNiveaux([])} className="text-[10px] font-black text-brand-600 hover:underline ml-2 uppercase">Réinitialiser</button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: etabColor, borderTopColor: "transparent" }} />
            <p className="text-slate-400 text-sm">Chargement des transactions...</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Reference", "Etudiant", "Montant", "Date", "Mode", "Agent", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-4">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p, i) => (
                    <tr key={p.id || p._id || i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-brand-600">
                        <div className="flex items-center gap-2">
                          {p.reference || "—"}
                          {p.preuve && (
                            <button onClick={() => {
                              const win = window.open();
                              if (win) win.document.write(`<img src="${p.preuve}" style="max-width:100%">`);
                            }} title="Voir justificatif" className="p-1 bg-brand-50 text-brand-600 rounded hover:bg-brand-100 transition-colors">
                              <Eye size={10} />
                            </button>
                          )}
                        </div>
                        {p.transactionRef && <div className="text-[9px] text-slate-400 mt-0.5">Ref: {p.transactionRef}</div>}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{p.etudiantNom}</td>
                      <td className="px-6 py-4 font-black text-emerald-700">{formatMGA(p.montant)}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-medium">{p.date}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-500">{p.mode}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-semibold">{p.agentNom}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-200">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(p)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-20 text-center text-slate-400 space-y-4">
                  <CreditCard size={48} className="mx-auto opacity-10" />
                  <p className="text-sm font-medium italic">Aucun paiement trouvé pour cette sélection</p>
                </div>
              )}
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((p, i) => (
                <div key={p.id || p._id || i} className="p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{p.etudiantNom}</div>
                      <div className="font-mono text-[10px] font-bold text-brand-600 uppercase tracking-tighter mt-0.5">{p.reference || "—"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-700 text-sm">{formatMGA(p.montant)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 text-amber-500 bg-amber-50 rounded-lg"><Edit3 size={14} /></button>
                        <button onClick={() => setDeleteConfirm(p)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{p.date}</span>
                    {p.note && <span className="bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">{p.note}</span>}
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{p.agentNom}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── PAYMENT MODAL (ADD/EDIT) ─── */}
      {(showModal || editingPaiement) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl p-8 space-y-6 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{editingPaiement ? "Modifier Transaction" : "Enregistrer Paiement"}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{editingPaiement ? "Mise à jour sécurisée" : "Encaissement écolage"}</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingPaiement(null); setSelectedStudent(null); setFormError(""); }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Student selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Étudiant bénéficiaire</label>
              {editingPaiement ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl opacity-80">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black shrink-0 shadow-lg"
                    style={{ background: etabColor }}>
                    {editingPaiement.etudiantNom.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">{editingPaiement.etudiantNom}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{editingPaiement.matricule} · {editingPaiement.filiere}</div>
                  </div>
                </div>
              ) : selectedStudent ? (
                <div className="flex items-center gap-4 p-4 bg-brand-50 border-2 border-brand-200 rounded-2xl shadow-sm animate-in slide-in-from-top-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-black shrink-0 shadow-md"
                    style={{ background: etabColor }}>
                    {getStudentName(selectedStudent).split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">{getStudentName(selectedStudent)}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{selectedStudent.matricule} · {selectedStudent.filiere}</div>
                    {(() => {
                      const ec = ecolages.find(e => e.etudiantId === getStudentId(selectedStudent));
                      if (!ec || ec.montantDu === 0) return <div className="text-[10px] font-black text-amber-600 uppercase mt-1">Aucun écolage défini</div>;
                      const reste = ec.montantDu - ec.montantPaye;
                      const isPast = new Date(`${form.annee}-${MOIS.indexOf(form.mois) + 1}-01`) < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                      return (
                        <div className="space-y-1 mt-1.5">
                          <div className="text-[11px] font-black text-red-600 uppercase">Solde restant: {formatMGA(reste)}</div>
                          {isPast && (
                            <div className="bg-white/60 border border-amber-200 rounded-lg p-2 text-[9px] font-bold text-amber-700 leading-tight">
                              ⚠️ Mois passé ({form.mois}). Vérifiez le plafond.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <button onClick={() => setSelectedStudent(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-white transition-all">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowStudentPicker(true)}
                  className="w-full group flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all text-sm font-bold text-left">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors"><Search size={20} /></div>
                  <div className="flex-1">
                    <div className="text-sm">Sélectionner un étudiant</div>
                    <div className="text-[10px] font-black uppercase text-slate-300 mt-0.5">Recherche par nom ou matricule</div>
                  </div>
                </button>
              )}
            </div>

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Période (Mois)</label>
                <div className="relative">
                  <select value={form.mois} onChange={e => setForm(f=>({...f,mois:e.target.value}))}
                    className="appearance-none w-full px-4 py-3 text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all">
                    {MOIS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Année Scolaire</label>
                <div className="relative">
                  <select value={form.annee} onChange={e => setForm(f=>({...f,annee:e.target.value}))}
                    className="appearance-none w-full px-4 py-3 text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all">
                    {["2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Montant perçu (Ar)</label>
                <input type="number" placeholder="0" value={form.montant}
                  onChange={e => setForm(f=>({...f,montant:e.target.value}))}
                  className="w-full px-4 py-3 text-sm font-black border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all text-brand-700" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Date du jour</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f=>({...f,date:e.target.value}))}
                  className="w-full px-4 py-3 text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
              </div>
            </div>

            {/* Mode de paiement */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Canal de paiement</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Especes", "Banque", "Mvola", "Airtel Money", "Orange Money"].map(m => (
                  <button key={m} type="button" onClick={() => setForm(f=>({...f, mode: m}))}
                    className={clsx("px-3 py-2.5 rounded-xl text-[10px] font-black border transition-all uppercase tracking-tighter",
                      form.mode === m ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {form.mode !== "Especes" && (
              <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-in zoom-in-95 duration-300">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Référence de Transaction</label>
                  <input type="text" placeholder="Ex: ID Mvola, Ref Virement..." value={form.transactionRef}
                    onChange={e => setForm(f=>({...f, transactionRef: e.target.value}))}
                    className="w-full px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Preuve / Justificatif</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 cursor-pointer hover:border-brand-500 hover:text-brand-600 transition-all">
                      <Upload size={18} />
                      <span className="text-[10px] font-black uppercase truncate max-w-[180px]">
                        {form.preuveFilename || "Uploader Image / Caméra"}
                      </span>
                      <input type="file" className="hidden" accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setForm(f => ({ ...f, preuve: reader.result as string, preuveFilename: file.name }));
                            reader.readAsDataURL(file);
                          }
                        }} />
                    </label>
                    {form.preuve && (
                      <button type="button" onClick={() => {
                        const win = window.open();
                        if (win) win.document.write(`<img src="${form.preuve}" style="max-width:100%; border-radius: 12px; shadow: 0 10px 30px rgba(0,0,0,0.2)">`);
                      }} className="p-3 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 shadow-sm transition-transform active:scale-90">
                        <Eye size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Note libre / Observation</label>
              <input type="text" placeholder="Détails supplémentaires..." value={form.note}
                onChange={e => setForm(f=>({...f,note:e.target.value}))}
                className="w-full px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
            </div>

            {editingPaiement && !isAdmin && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <label className="text-[10px] font-black uppercase text-amber-600 tracking-widest block">Motif de la demande <span className="text-red-500">*</span></label>
                <textarea placeholder="Pourquoi cette modification ?" value={approvalDesc}
                  onChange={e => setApprovalDesc(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-amber-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[100px]" />
              </div>
            )}

            {formError && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-[10px] font-black uppercase tracking-tight text-center">{formError}</div>}

            <div className="flex gap-4 pt-4">
              <button onClick={() => { setShowModal(false); setEditingPaiement(null); setSelectedStudent(null); setFormError(""); }}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={editingPaiement ? handleEdit : handleAdd} disabled={saving}
                className="flex-[1.5] py-4 rounded-2xl text-white text-xs font-black uppercase shadow-xl disabled:opacity-60 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                style={{ background: etabColor }}>
                {saving ? <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Traitement...</> : (editingPaiement ? <><Edit3 size={16}/> Mettre à jour</> : <><Check size={18}/> Valider l&apos;encaissement</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STUDENT PICKER ─── */}
      {showStudentPicker && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex items-center justify-between p-7 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Choisir Étudiant</h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{filteredStudents.length} profils trouvés</p>
              </div>
              <button onClick={() => setShowStudentPicker(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">
                <X size={22} />
              </button>
            </div>
            <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="Nom, matricule ou email..." value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)} autoFocus
                  className="w-full pl-12 pr-4 py-4 text-sm font-bold border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white transition-all shadow-sm" />
              </div>
              {!isAdmin && filieres.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {["Toutes", ...filieres].map(f => (
                    <button key={f} onClick={() => setFiliereFilter(f)}
                      className={clsx("shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border whitespace-nowrap",
                        filiereFilter === f ? "text-white border-transparent shadow-md" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}
                      style={filiereFilter === f ? { background: etabColor } : {}}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {filteredStudents.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <Search size={40} className="mx-auto opacity-10" />
                  <p className="text-xs font-black uppercase tracking-widest">Aucun résultat trouvé</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map(s => {
                    const ec = ecolages.find(e => e.etudiantId === getStudentId(s));
                    const initials = getStudentName(s).split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                    return (
                      <button key={getStudentId(s)}
                        onClick={() => { setSelectedStudent(s); setShowStudentPicker(false); }}
                        className="w-full flex items-center gap-5 px-5 py-4 hover:bg-slate-50 rounded-2xl transition-all text-left group">
                        <div className="w-14 h-14 rounded-[1rem] flex items-center justify-center text-white text-base font-black shrink-0 shadow-lg group-hover:scale-105 transition-transform"
                          style={{ background: etabColor }}>
                          {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover rounded-[1rem]" /> : initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-slate-900 text-sm group-hover:text-brand-600 transition-colors">{getStudentName(s)}</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {s.matricule && <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{s.matricule}</span>}
                            {s.niveau && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-600 text-white uppercase tracking-widest">{s.niveau}</span>}
                          </div>
                          {ec && ec.montantDu > 0 && (
                            <div className="flex gap-4 mt-2 text-[10px] font-black uppercase">
                              <span className="text-emerald-600">Payé: {formatMGA(ec.montantPaye)}</span>
                              {ec.montantDu > ec.montantPaye && <span className="text-red-500">Dû: {formatMGA(ec.montantDu - ec.montantPaye)}</span>}
                            </div>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-slate-100 group-hover:border-brand-500 flex items-center justify-center transition-all shrink-0">
                          <Check size={14} className="text-brand-600 opacity-0 group-hover:opacity-100 transition-all" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600 animate-bounce"><AlertTriangle size={32} /></div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Supprimer Paiement ?</h2>
              <p className="text-sm text-slate-500 font-medium">Le solde de l&apos;étudiant sera impacté.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-[1.25rem] p-5 text-center space-y-1">
              <div className="font-black text-slate-900 text-sm">{deleteConfirm.etudiantNom}</div>
              <div className="text-xl font-black text-red-600 tracking-tighter">{formatMGA(deleteConfirm.montant)}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">{deleteConfirm.date} · {deleteConfirm.reference}</div>
            </div>
            {!isAdmin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-amber-600 tracking-widest block">Raison de la suppression <span className="text-red-500">*</span></label>
                <textarea placeholder="Indiquez le motif..." value={approvalDesc}
                  onChange={e => setApprovalDesc(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-amber-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 min-h-[90px]" />
              </div>
            )}
            {formError && <p className="text-red-500 text-[10px] font-black uppercase text-center">{formError}</p>}
            <div className="flex gap-4">
              <button onClick={() => { setDeleteConfirm(null); setApprovalDesc(""); setFormError(""); }}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase shadow-xl shadow-red-600/20 disabled:opacity-60 flex items-center justify-center gap-3 transition-all active:scale-95">
                {deleting ? <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : <><Trash2 size={16} />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
