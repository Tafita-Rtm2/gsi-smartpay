"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, ExternalLink, Info, X,
  Phone, Mail, GraduationCap, CreditCard, Calendar,
  MapPin, Edit3, Trash2, AlertTriangle, Users,
  CheckCircle2, Clock, ChevronDown, Plus, Check,
  Printer, Receipt, ArrowLeft, Download, Settings
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, Etablissement } from "@/lib/data";
import {
  fetchStudents, fetchEcolages, fetchPaiements, createPaiement,
  updateEcolage, updatePaiement, DBStudent, DBEcolage, DBPaiement,
  getStudentId, getStudentName, getStudentCampus, formatMGA, API_BASE
} from "@/lib/api";
import clsx from "clsx";

const STATUT_COLORS = {
  paye:       "bg-emerald-100 text-emerald-700 border border-emerald-200",
  impaye:     "bg-red-100 text-red-700 border border-red-200",
  en_attente: "bg-amber-100 text-amber-700 border border-amber-200",
};
const STATUT_LABELS = { paye: "Paye", impaye: "Impaye", en_attente: "En attente" };
const STATUT_DOT   = { paye: "bg-emerald-500", impaye: "bg-red-500", en_attente: "bg-amber-500" };
const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
type FilterTab = "tous" | "paye" | "impaye" | "en_attente";

export default function EtudiantsPage() {
  const { currentUser, appState, setProgramFee } = useAuth();
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [allPaiements, setAllPaiements] = useState<DBPaiement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const [search,        setSearch]        = useState("");
  const [filiereFilter, setFiliereFilter] = useState("Toutes");
  const [statutTab,     setStatutTab]     = useState<FilterTab>("tous");
  const searchRef = useRef<HTMLInputElement>(null);

  // Modals
  const [profileStudent,  setProfileStudent]  = useState<DBStudent | null>(null);
  const [profileView,     setProfileView]     = useState<"info" | "historique">("info");
  const [receiptPaiement, setReceiptPaiement] = useState<DBPaiement | null>(null);
  const [payStudent,      setPayStudent]      = useState<DBStudent | null>(null);
  const [payEcolage,      setPayEcolage]      = useState<DBEcolage | null>(null);
  const [editingPaiement, setEditingPaiement] = useState<DBPaiement | null>(null);
  const [addEcolageStudent, setAddEcolageStudent] = useState<DBStudent | null>(null);
  const [showConfig,      setShowConfig]      = useState(false);
  const [deleteEcolage,   setDeleteEcolage]   = useState<DBEcolage | null>(null);
  const [deletePaiement,  setDeletePaiement]  = useState<DBPaiement | null>(null);

  const [payForm, setPayForm] = useState({
    mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()),
    montant: "", date: new Date().toISOString().split("T")[0], note: "",
  });
  const [addEcolageForm, setAddEcolageForm] = useState({ montantDu: "1500000", annee: "2025/2026" });

  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin   = currentUser?.role === "admin";
  const etabColor = etabInfo?.color || "#2563eb";
  const filieres  = etabInfo ? etabInfo.filieres : [];

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e, p] = await Promise.all([fetchStudents(), fetchEcolages(), fetchPaiements()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myS = s.filter(st => getStudentCampus(st).includes(myEtab) || getStudentCampus(st).includes(myEtab.slice(0,4)));
      const myIds = new Set(myS.map(st => getStudentId(st)));
      setStudents(myS);
      setEcolages(e.filter(ec => myIds.has(ec.etudiantId)));
      setAllPaiements(p.filter(pay => myIds.has(pay.etudiantId)));
    } else {
      setStudents(s); setEcolages(e); setAllPaiements(p);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const getEcolage = (s: DBStudent) => ecolages.find(e => e.etudiantId === getStudentId(s));
  const getStudentPaiements = (s: DBStudent) =>
    allPaiements.filter(p => p.etudiantId === getStudentId(s))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const filtered = students.filter(s => {
    const q = search.toLowerCase().trim();
    const name = getStudentName(s).toLowerCase();
    const ok1 = !q || name.includes(q) || (s.matricule||"").toLowerCase().includes(q) || (s.email||"").toLowerCase().includes(q);
    const ok2 = filiereFilter === "Toutes" || (s.filiere||"").trim() === filiereFilter.trim();
    const ec = getEcolage(s);
    const ok3 = statutTab === "tous" || (ec?.statut || "impaye") === statutTab;
    return ok1 && ok2 && ok3;
  });

  const countPaye    = students.filter(s => getEcolage(s)?.statut === "paye").length;
  const countImpaye  = students.filter(s => !getEcolage(s) || getEcolage(s)?.statut === "impaye").length;
  const countPending = students.filter(s => getEcolage(s)?.statut === "en_attente").length;
  const totalDu    = ecolages.reduce((a,e) => a+e.montantDu, 0);
  const totalPaye2 = ecolages.reduce((a,e) => a+e.montantPaye, 0);

  const openPayment = (s: DBStudent) => {
    setPayStudent(s);
    setPayEcolage(getEcolage(s) || null);
    setPayForm({ mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()), montant: "", date: new Date().toISOString().split("T")[0], note: "" });
  };

  const openEditPayment = (p: DBPaiement) => {
    setEditingPaiement(p);
    const st = students.find(s => getStudentId(s) === p.etudiantId);
    if (st) {
      setPayStudent(st);
      setPayEcolage(getEcolage(st) || null);
    }
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
    setPayForm({ mois: m, annee: y, montant: String(p.montant), date: p.date, note: noteTxt });
  };

  const handleSavePayment = async () => {
    if (!payStudent || !payForm.montant) return;
    setSaving(true);
    const montant = Number(payForm.montant);
    const note = `${payForm.mois} ${payForm.annee}${payForm.note ? " — "+payForm.note : ""}`;

    if (editingPaiement) {
      const pid = editingPaiement.id || editingPaiement._id || "";
      await updatePaiement(pid, { montant, date: payForm.date, note });
      if (payEcolage && (payEcolage.id || payEcolage._id)) {
        const diff = montant - editingPaiement.montant;
        const newPaye = payEcolage.montantPaye + diff;
        const st: "paye"|"impaye"|"en_attente" = newPaye >= payEcolage.montantDu ? "paye" : newPaye > 0 ? "en_attente" : "impaye";
        await updateEcolage(payEcolage.id || payEcolage._id || "", { montantPaye: newPaye, statut: st });
      }
    } else {
      await createPaiement({
        etudiantId: getStudentId(payStudent), etudiantNom: getStudentName(payStudent),
        matricule: payStudent.matricule, campus: payStudent.campus || currentUser?.etablissement || "",
        filiere: payStudent.filiere || "", classe: payStudent.niveau || "L1",
        montant, date: payForm.date, mode: "Especes",
        agentId: currentUser?.id || "", agentNom: `${currentUser?.prenom||""} ${currentUser?.nom||""}`.trim(), note,
      });
      if (payEcolage && (payEcolage.id || payEcolage._id)) {
        const newPaye = payEcolage.montantPaye + montant;
        const st: "paye"|"impaye"|"en_attente" = newPaye >= payEcolage.montantDu ? "paye" : newPaye > 0 ? "en_attente" : "impaye";
        await updateEcolage(payEcolage.id || payEcolage._id || "", { montantPaye: newPaye, statut: st });
      }
    }
    await load(); setSaving(false); setPayStudent(null); setPayEcolage(null); setEditingPaiement(null);
  };


  const handleAddEcolage = async () => {
    if (!addEcolageStudent || !addEcolageForm.montantDu) return;
    setSaving(true);
    const { createEcolage } = await import("@/lib/api");
    await createEcolage({
      etudiantId: getStudentId(addEcolageStudent),
      etudiantNom: getStudentName(addEcolageStudent),
      matricule: addEcolageStudent.matricule,
      campus: addEcolageStudent.campus || currentUser?.etablissement || "",
      filiere: addEcolageStudent.filiere || "",
      classe: addEcolageStudent.niveau || "L1",
      montantDu: Number(addEcolageForm.montantDu),
      montantPaye: 0,
      statut: "impaye",
      annee: addEcolageForm.annee,
    });
    await load(); setSaving(false); setAddEcolageStudent(null);
  };

  const handleApplyConfig = async () => {
    if (!currentUser) return;
    setSaving(true);
    const { createEcolage, updateEcolage } = await import("@/lib/api");

    // For each student in this campus
    const myEtab = currentUser.etablissement;

    for (const s of filtered) {
      const config = appState.programFees.find(p => p.campus === myEtab && p.filiere === s.filiere);
      if (config && config.amount > 0) {
        const ec = getEcolage(s);
        if (ec) {
          // Update existing
          const st: "paye"|"impaye"|"en_attente" =
            ec.montantPaye >= config.amount ? "paye" : ec.montantPaye > 0 ? "en_attente" : "impaye";
          await updateEcolage(ec.id || ec._id || "", { montantDu: config.amount, statut: st });
        } else {
          // Create new
          await createEcolage({
            etudiantId: getStudentId(s),
            etudiantNom: getStudentName(s),
            matricule: s.matricule,
            campus: s.campus || myEtab,
            filiere: s.filiere || "",
            classe: s.niveau || "L1",
            montantDu: config.amount,
            montantPaye: 0,
            statut: "impaye",
            annee: "2025/2026",
          });
        }
      }
    }
    await load();
    setSaving(false);
    setShowConfig(false);
  };

  const handleDeleteEcolage = async () => {
    if (!deleteEcolage) return;
    setDeleting(true);

    // Delete associated payments to reset to 0 properly?
    // User said "quand on suprime l'ecolage l'eleve est dans le place de impayer"
    // Deleting the ecolage record means we lose track of the debt.
    // If we want them to be "impayé", we should probably just reset the paid amount to 0
    // OR delete the payments.

    // Let's delete the ecolage record as requested by "supprimer"
    const id = deleteEcolage.id || deleteEcolage._id || "";
    if (id) {
      await fetch(`${API_BASE}/db/ecolage/${id}`, { method: "DELETE" }).catch(() => {});

      // Also delete all payments for this student to make them "impayé" (0 paid)
      const stId = deleteEcolage.etudiantId;
      const studentPayments = (await (await fetch(`${API_BASE}/db/paiements`)).json()).documents || [];
      const toDelete = studentPayments.filter((p: any) => p.etudiantId === stId);

      for (const p of toDelete) {
        const pid = p.id || p._id;
        await fetch(`${API_BASE}/db/paiements/${pid}`, { method: "DELETE" }).catch(() => {});
      }
    }

    await load(); setDeleting(false); setDeleteEcolage(null);
  };

  const handleDeletePaiement = async () => {
    if (!deletePaiement) return;
    setDeleting(true);
    const id = deletePaiement.id || deletePaiement._id || "";
    if (id) {
      // Delete from paiements collection
      await fetch(`${API_BASE}/db/paiements/${id}`, { method: "DELETE" }).catch(() => {});
      // Update ecolage - subtract montant and recalculate status
      const ec = ecolages.find(e => e.etudiantId === deletePaiement.etudiantId);
      if (ec && (ec.id || ec._id)) {
        const newPaye = Math.max(0, ec.montantPaye - deletePaiement.montant);
        // If nothing left paid -> impaye, if partial -> en_attente, if full -> paye
        const st: "paye"|"impaye"|"en_attente" =
          newPaye <= 0 ? "impaye" :
          newPaye >= ec.montantDu ? "paye" : "en_attente";
        await updateEcolage(ec.id || ec._id || "", { montantPaye: newPaye, statut: st });
      }
    }
    await load();
    setDeleting(false);
    setDeletePaiement(null);
  };

  const Avatar = ({ s, size = 36 }: { s: DBStudent; size?: number }) => {
    const name = getStudentName(s);
    const initials = name.split(" ").map(n=>n[0]||"").join("").slice(0,2).toUpperCase();
    return (
      <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm"
        style={{ background: etabColor, width: size, height: size, fontSize: size < 36 ? 10 : 13 }}>
        {s.photo ? <img src={s.photo} alt={name} className="w-full h-full object-cover" /> : initials}
      </div>
    );
  };

  const STAT_TABS: { id: FilterTab; label: string; count: number; color: string; border: string; icon: React.ElementType }[] = [
    { id: "tous",       label: "Tous",       count: students.length, color: "text-slate-700",   border: "border-slate-400",   icon: Users        },
    { id: "paye",       label: "Payes",      count: countPaye,       color: "text-emerald-600", border: "border-emerald-400", icon: CheckCircle2 },
    { id: "impaye",     label: "Impayes",    count: countImpaye,     color: "text-red-600",     border: "border-red-400",     icon: AlertTriangle},
    { id: "en_attente", label: "En attente", count: countPending,    color: "text-amber-600",   border: "border-amber-400",   icon: Clock        },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Etudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Chargement..." : `${students.length} etudiants`}
            {etabInfo && <span className="ml-2 font-medium" style={{color:etabColor}}>— {etabInfo.label}</span>}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              const headers = ["Matricule", "Nom", "Filiere", "Niveau", "Statut", "Total Du", "Paye", "Reste"];
              const rows = filtered.map(s => {
                const ec = getEcolage(s);
                return [
                  s.matricule || "",
                  getStudentName(s),
                  s.filiere || "",
                  s.niveau || "",
                  ec?.statut || "impaye",
                  ec?.montantDu || 0,
                  ec?.montantPaye || 0,
                  (ec?.montantDu || 0) - (ec?.montantPaye || 0)
                ];
              });
              const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.setAttribute("download", `etudiants_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Download size={15} /> Exporter CSV
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("print-all-students");
              if (el) {
                el.style.display = "block";
                window.print();
                setTimeout(() => { el.style.display = "none"; }, 1500);
              }
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Printer size={15} /> Imprimer liste
          </button>
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Settings size={15} /> Configuration
          </button>
          <a href="https://groupegsi.mg/web/admincreat/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md"
            style={{background:etabColor}}>
            <ExternalLink size={15} /> Ajouter etudiant
          </a>
        </div>
      </div>

      {/* Stat tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_TABS.map(({ id, label, count, color, border, icon: Icon }) => (
          <button key={id} onClick={() => setStatutTab(id)}
            className={clsx("card text-left transition-all border-2", statutTab===id ? `${border} shadow-md` : "border-transparent hover:border-slate-200")}>
            <div className="flex items-center gap-2 mb-1"><Icon size={14} className={color} /><span className="text-xs text-slate-500 font-medium">{label}</span></div>
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            {id === "tous" && <div className="text-xs text-slate-400 mt-0.5 truncate">{formatMGA(totalPaye2)} / {formatMGA(totalDu)}</div>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card space-y-3">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input ref={searchRef} type="text" placeholder="Rechercher par nom, matricule ou email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white" />
          {search && <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>}
        </div>
        {!isAdmin && filieres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {["Toutes",...filieres].map(f => (
              <button key={f} onClick={() => setFiliereFilter(f)}
                className={clsx("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
                  filiereFilter===f ? "text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                style={filiereFilter===f ? {background:etabColor} : {}}>
                {f==="Toutes" ? "Toutes" : f.length>24 ? f.slice(0,24)+"…" : f}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{filtered.length} resultat(s) sur {students.length}</span>
          {(search || filiereFilter!=="Toutes" || statutTab!=="tous") && (
            <button onClick={() => { setSearch(""); setFiliereFilter("Toutes"); setStatutTab("tous"); }}
              className="text-brand-600 hover:underline flex items-center gap-1 font-medium"><X size={11} /> Reinitialiser</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{borderColor:etabColor,borderTopColor:"transparent"}} />
            <p className="text-slate-400 text-sm">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Users size={36} className="mx-auto opacity-20" />
            <p className="text-sm">Aucun etudiant trouve</p>
            <button onClick={() => { setSearch(""); setFiliereFilter("Toutes"); setStatutTab("tous"); }} className="text-xs text-brand-600 hover:underline">Reinitialiser</button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Etudiant","Filiere","Niveau","Ecolage","Statut","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(s => {
                    const ec = getEcolage(s);
                    const statut = ec?.statut || "impaye";
                    return (
                      <tr key={getStudentId(s)} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar s={s} size={36} />
                            <div>
                              <div className="font-semibold text-slate-900">{getStudentName(s)}</div>
                              <div className="text-xs text-slate-400 font-mono">{s.matricule||"—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="text-xs text-slate-600 truncate">{s.filiere||"—"}</div>
                          <div className="text-xs text-slate-400 truncate">{s.campus||"—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {s.niveau && <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{s.niveau}</span>}
                        </td>
                        <td className="px-4 py-3 min-w-[150px]">
                          {ec && ec.montantDu > 0 ? (
                            <div className="text-xs space-y-0.5">
                              <div className="font-semibold text-slate-700">Total: {formatMGA(ec.montantDu)}</div>
                              <div className="text-emerald-600">Paye: {formatMGA(ec.montantPaye)}</div>
                              {ec.montantDu > ec.montantPaye && <div className="text-red-500 font-medium">Reste: {formatMGA(ec.montantDu-ec.montantPaye)}</div>}
                            </div>
                          ) : <span className="text-slate-300 text-xs italic">Non defini</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", STATUT_COLORS[statut])}>
                            <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                            {STATUT_LABELS[statut]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Info / profil */}
                            <button onClick={() => { setProfileStudent(s); setProfileView("info"); }} title="Profil & historique"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200">
                              <Info size={14} />
                            </button>
                            {/* Paiement */}
                            <button onClick={() => openPayment(s)} title="Enregistrer paiement"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-200">
                              <CreditCard size={14} />
                            </button>
                            {/* Edit/Add ecolage */}
                            {ec ? (
                              <>
                                <button onClick={() => openPayment(s)} title="Modifier / Payer"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-200">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => setDeleteEcolage(ec)} title="Supprimer l'écolage"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => { setAddEcolageStudent(s); setAddEcolageForm({ montantDu: "1500000", annee: "2025/2026" }); }} title="Ajouter un ecolage"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200">
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(s => {
                const ec = getEcolage(s);
                const statut = ec?.statut || "impaye";
                return (
                  <div key={getStudentId(s)} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar s={s} size={44} />
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{getStudentName(s)}</div>
                          <div className="text-xs text-slate-400 font-mono">{s.matricule||"—"}</div>
                        </div>
                      </div>
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0", STATUT_COLORS[statut])}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />{STATUT_LABELS[statut]}
                      </span>
                    </div>
                    {s.filiere && <div className="text-xs text-slate-500 truncate">{s.filiere}</div>}
                    {ec && ec.montantDu > 0 && (
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="text-slate-500">Total: <span className="font-bold text-slate-700">{formatMGA(ec.montantDu)}</span></span>
                        <span className="text-emerald-600 font-bold">{formatMGA(ec.montantPaye)} paye</span>
                        {ec.montantDu > ec.montantPaye && <span className="text-red-500 font-bold">Reste: {formatMGA(ec.montantDu-ec.montantPaye)}</span>}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <button onClick={() => { setProfileStudent(s); setProfileView("info"); }}
                        className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
                        <Info size={12} /> Profil
                      </button>
                      <button onClick={() => openPayment(s)}
                        className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50">
                        <CreditCard size={12} /> Paiement
                      </button>
                      {ec ? (
                        <>
                          <button onClick={() => openPayment(s)}
                            className="flex items-center gap-1 text-xs text-amber-600 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-50">
                            <Edit3 size={12} /> Modifier
                          </button>
                          <button onClick={() => setDeleteEcolage(ec)}
                            className="flex items-center gap-1 text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50">
                            <Trash2 size={12} /> Supprimer
                          </button>
                        </>
                      ) : (
                        <button onClick={() => { setAddEcolageStudent(s); setAddEcolageForm({ montantDu: "1500000", annee: "2025/2026" }); }}
                          className="flex items-center gap-1 text-xs text-brand-600 border border-brand-200 px-2.5 py-1.5 rounded-lg hover:bg-brand-50">
                          <Plus size={12} /> Ajouter ecolage
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── PROFILE MODAL with tabs: Info + Historique ─── */}
      {profileStudent && (() => {
        const ec = getEcolage(profileStudent);
        const statut = ec?.statut || "impaye";
        const name = getStudentName(profileStudent);
        const initials = name.split(" ").map(n=>n[0]||"").join("").slice(0,2).toUpperCase();
        const pays = getStudentPaiements(profileStudent);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Banner */}
              <div className="relative h-24 shrink-0" style={{background:`linear-gradient(135deg,${etabColor}dd,${etabColor}66)`}}>
                <button onClick={() => setProfileStudent(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 left-6 translate-y-1/2 w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex items-center justify-center text-white text-xl font-bold"
                  style={{background:etabColor}}>
                  {profileStudent.photo ? <img src={profileStudent.photo} alt={name} className="w-full h-full object-cover" /> : initials}
                </div>
              </div>

              {/* Name + tabs */}
              <div className="px-6 pt-10 pb-2 shrink-0">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{name}</h2>
                    <p className="text-xs text-slate-400 font-mono">{profileStudent.matricule||"—"}</p>
                  </div>
                  <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 mt-1", STATUT_COLORS[statut])}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />{STATUT_LABELS[statut]}
                  </span>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setProfileView("info")}
                    className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all", profileView==="info" ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>
                    Informations
                  </button>
                  <button onClick={() => setProfileView("historique")}
                    className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5", profileView==="historique" ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>
                    <Receipt size={12} /> Historique ({pays.length})
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-6 pb-6">
                {profileView === "info" && (
                  <div className="space-y-4 pt-3">
                    {[
                      { icon: Mail,          label: "Email",   value: profileStudent.email  || "—" },
                      { icon: Phone,         label: "Contact", value: profileStudent.contact || profileStudent.telephone || "—" },
                      { icon: MapPin,        label: "Campus",  value: profileStudent.campus  || "—" },
                      { icon: GraduationCap, label: "Filiere", value: profileStudent.filiere || "—" },
                      { icon: Calendar,      label: "Niveau",  value: profileStudent.niveau  || "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon size={13} className="text-slate-500" />
                        </div>
                        <div><div className="text-xs text-slate-400">{label}</div><div className="text-sm text-slate-800 font-medium truncate">{value}</div></div>
                      </div>
                    ))}

                    {/* Ecolage box */}
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ecolage</span>
                        <div className="flex gap-2">
                          {ec && ec.montantDu > 0 && (
                            <button onClick={() => { openPayment(profileStudent); setProfileStudent(null); }}
                              className="text-xs text-amber-600 flex items-center gap-0.5 hover:underline"><Edit3 size={11} /> Modifier</button>
                          )}
                          {ec && ec.montantDu > 0 && (
                            <button onClick={() => { setDeleteEcolage(ec); setProfileStudent(null); }}
                              className="text-xs text-red-500 flex items-center gap-0.5 hover:underline"><Trash2 size={11} /> Supprimer</button>
                          )}
                        </div>
                      </div>
                      {ec && ec.montantDu > 0 ? (
                        <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center">
                          {[
                            { label: "Total du", value: formatMGA(ec.montantDu), color: "text-slate-700" },
                            { label: "Paye", value: formatMGA(ec.montantPaye), color: "text-emerald-600" },
                            { label: "Reste", value: formatMGA(ec.montantDu-ec.montantPaye), color: ec.montantDu>ec.montantPaye?"text-red-600":"text-emerald-600" },
                          ].map(({ label, value, color }) => (
                            <div key={label}><div className={`text-sm font-bold ${color}`}>{value}</div><div className="text-xs text-slate-400 mt-0.5">{label}</div></div>
                          ))}
                        </div>
                      ) : <div className="px-4 py-3 text-center text-slate-400 text-xs">Aucun ecolage defini</div>}
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setProfileStudent(null)}
                        className="flex-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 px-4">Fermer</button>
                      <button onClick={() => { openPayment(profileStudent); setProfileStudent(null); }}
                        className="flex-3 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 px-6" style={{background:etabColor}}>
                        <Plus size={14} /> Enregistrer un paiement
                      </button>
                    </div>
                  </div>
                )}

                {profileView === "historique" && (
                  <div className="pt-3 space-y-3">
                    {pays.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <Receipt size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Aucun paiement enregistre</p>
                      </div>
                    ) : pays.map((p, i) => (
                      <div key={p.id || p._id || i}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all cursor-pointer group"
                        onClick={() => setReceiptPaiement(p)}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:etabColor+"22"}}>
                          <Receipt size={16} style={{color:etabColor}} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm">{formatMGA(p.montant)}</div>
                          <div className="text-xs text-slate-400">{p.date} · {p.note || "—"}</div>
                          <div className="text-xs text-slate-400">{p.agentNom}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); openEditPayment(p); setProfileStudent(null); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-100 transition-all" title="Modifier">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setReceiptPaiement(p); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-brand-600 hover:bg-brand-100 transition-all" title="Voir recu">
                            <Printer size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeletePaiement(p); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all" title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { openPayment(profileStudent); setProfileStudent(null); }}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mt-2" style={{background:etabColor}}>
                      <Plus size={14} /> Nouveau paiement
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── RECEIPT MODAL ─── */}
      {receiptPaiement && (
        <>
          {/* Print area - hidden normally, shown when printing */}
          <div id="receipt-print-area" style={{position:"fixed",top:0,left:0,width:"100%",background:"white",zIndex:999999,padding:"20px",boxSizing:"border-box"}}>
            <div style={{fontFamily:"Arial,sans-serif",maxWidth:"400px",margin:"0 auto",padding:"20px"}}>
              <div style={{background:etabColor,color:"white",padding:"20px",borderRadius:"12px 12px 0 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                  <div style={{fontWeight:"bold",fontSize:"18px"}}>GSI SmartPay</div>
                  <div style={{fontSize:"12px",opacity:0.8}}>RECU OFFICIEL</div>
                </div>
                <div style={{fontSize:"12px",opacity:0.7}}>{etabInfo?.label}</div>
              </div>
              <div style={{border:"1px solid #e2e8f0",borderTop:"none",padding:"20px",borderRadius:"0 0 12px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px",paddingBottom:"12px",borderBottom:"1px solid #f1f5f9"}}>
                  <span style={{color:"#64748b",fontSize:"13px"}}>Reference</span>
                  <span style={{fontFamily:"monospace",fontWeight:"bold",fontSize:"13px"}}>{receiptPaiement.reference || "—"}</span>
                </div>
                {[
                  { label: "Etudiant",  value: receiptPaiement.etudiantNom },
                  { label: "Matricule", value: receiptPaiement.matricule || "—" },
                  { label: "Filiere",   value: receiptPaiement.filiere || "—" },
                  { label: "Niveau",    value: receiptPaiement.classe || "—" },
                  { label: "Date",      value: receiptPaiement.date },
                  { label: "Mode",      value: receiptPaiement.mode },
                  { label: "Note",      value: receiptPaiement.note || "—" },
                  { label: "Agent",     value: receiptPaiement.agentNom },
                ].map(({ label, value }) => (
                  <div key={label} style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                    <span style={{color:"#64748b",fontSize:"12px"}}>{label}</span>
                    <span style={{fontWeight:"500",fontSize:"12px",textAlign:"right",maxWidth:"60%"}}>{value}</span>
                  </div>
                ))}
                <div style={{borderTop:"2px solid #f1f5f9",marginTop:"12px",paddingTop:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:"600",color:"#334155"}}>Montant paye</span>
                  <span style={{fontSize:"24px",fontWeight:"bold",color:etabColor}}>{formatMGA(receiptPaiement.montant)}</span>
                </div>
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"8px",padding:"10px",textAlign:"center",marginTop:"12px"}}>
                  <span style={{color:"#15803d",fontWeight:"bold",fontSize:"14px"}}>✓ Paiement confirme</span>
                </div>
                <div style={{textAlign:"center",marginTop:"16px",color:"#94a3b8",fontSize:"11px"}}>
                  Document genere par GSI SmartPay — {new Date().toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
          </div>

          {/* Screen modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 text-white" style={{background:etabColor}}>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-lg">GSI SmartPay</div>
                  <div className="text-xs opacity-70">RECU OFFICIEL</div>
                </div>
                <div className="text-xs opacity-70">{etabInfo?.label}</div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono font-bold text-slate-900">{receiptPaiement.reference || "—"}</span>
                </div>
                <div className="h-px bg-slate-100" />
                {[
                  { label: "Etudiant",  value: receiptPaiement.etudiantNom },
                  { label: "Matricule", value: receiptPaiement.matricule || "—" },
                  { label: "Filiere",   value: receiptPaiement.filiere || "—" },
                  { label: "Niveau",    value: receiptPaiement.classe || "—" },
                  { label: "Date",      value: receiptPaiement.date },
                  { label: "Mode",      value: receiptPaiement.mode },
                  { label: "Note",      value: receiptPaiement.note || "—" },
                  { label: "Agent",     value: receiptPaiement.agentNom },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500 text-sm shrink-0">{label}</span>
                    <span className="font-medium text-slate-900 text-sm text-right truncate max-w-[55%]">{value}</span>
                  </div>
                ))}
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Montant paye</span>
                  <span className="text-2xl font-bold" style={{color:etabColor}}>{formatMGA(receiptPaiement.montant)}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-center">
                  <span className="text-emerald-700 font-bold text-sm">✓ Paiement confirme</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-5 flex gap-3">
                <button onClick={() => setReceiptPaiement(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Fermer
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById("receipt-print-area");
                    if (el) {
                      el.style.display = "block";
                      window.print();
                      setTimeout(() => { el.style.display = "none"; }, 1500);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-colors"
                  style={{background:etabColor}}>
                  <Printer size={14} /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── PAYMENT MODAL ─── */}
      {payStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-bold text-slate-900">{editingPaiement ? "Modifier le paiement" : "Enregistrer un paiement"}</h2><p className="text-xs text-slate-400">{editingPaiement ? "Mise a jour de transaction" : "Paiement mensuel"}</p></div>
              <button onClick={() => { setPayStudent(null); setPayEcolage(null); setEditingPaiement(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
              <Avatar s={payStudent} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm">{getStudentName(payStudent)}</div>
                <div className="text-xs text-slate-400 truncate">{payStudent.matricule} · {payStudent.filiere}</div>
                {payEcolage && payEcolage.montantDu > 0
                  ? <div className="text-xs text-red-500 mt-0.5">Reste: {formatMGA(payEcolage.montantDu - payEcolage.montantPaye)}</div>
                  : <div className="text-xs text-amber-600 mt-0.5">Aucun ecolage defini</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Mois</label>
                <div className="relative">
                  <select value={payForm.mois} onChange={e=>setPayForm(f=>({...f,mois:e.target.value}))}
                    className="appearance-none w-full px-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {MOIS.map(m=><option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Annee</label>
                <div className="relative">
                  <select value={payForm.annee} onChange={e=>setPayForm(f=>({...f,annee:e.target.value}))}
                    className="appearance-none w-full px-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {["2025","2026","2027"].map(y=><option key={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Montant (Ar) <span className="text-red-500">*</span></label>
                <input type="number" placeholder="Ex: 150000" value={payForm.montant} onChange={e=>setPayForm(f=>({...f,montant:e.target.value}))} autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Date</label>
                <input type="date" value={payForm.date} onChange={e=>setPayForm(f=>({...f,date:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{background:etabColor}}><Check size={12} className="text-white" /></div>
              <div><div className="text-xs text-slate-400">Mode de paiement</div><div className="text-sm font-semibold text-slate-800">Especes</div></div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Note (optionnel)</label>
              <input type="text" placeholder="Ex: 1ere tranche..." value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700">
              Agent: <span className="font-bold">{currentUser?.prenom} {currentUser?.nom}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPayStudent(null); setPayEcolage(null); setEditingPaiement(null); }} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSavePayment} disabled={saving||!payForm.montant}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{background:etabColor}}>
                {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : <><CreditCard size={15} />{editingPaiement ? "Modifier" : "Enregistrer"}</>}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ─── DELETE ECOLAGE CONFIRM ─── */}
      {deleteEcolage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto"><AlertTriangle size={26} className="text-red-600" /></div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Supprimer cet ecolage ?</h2>
              <p className="text-sm text-slate-500">L&apos;ecolage et TOUS les paiements associes de cet etudiant seront supprimes.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center space-y-0.5">
              <div className="font-bold text-slate-900">{deleteEcolage.etudiantNom}</div>
              <div className="text-sm text-red-700">{formatMGA(deleteEcolage.montantDu)}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteEcolage(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Non, annuler</button>
              <button onClick={handleDeleteEcolage} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : <><Trash2 size={15} />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIGURATION MODAL ─── */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configuration des Écolages</h2>
                <p className="text-xs text-slate-400">Définissez les montants par filière pour {etabInfo?.label}</p>
              </div>
              <button onClick={() => setShowConfig(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
              {filieres.map(f => {
                const config = appState.programFees.find(p => p.campus === currentUser?.etablissement && p.filiere === f);
                return (
                  <div key={f} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{f}</div>
                    </div>
                    <div className="w-40 relative">
                      <input type="number" placeholder="Montant Ar"
                        value={config?.amount || ""}
                        onChange={e => setProgramFee(currentUser!.etablissement, f, Number(e.target.value))}
                        className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Ar</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={18} />
              <p className="text-xs text-amber-700">Appliquer la configuration créera automatiquement les écolages manquants pour tous les étudiants de ce campus selon leur filière.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowConfig(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Fermer</button>
              <button onClick={handleApplyConfig} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md disabled:opacity-50 flex items-center justify-center gap-2" style={{background:etabColor}}>
                {saving ? "Calcul..." : "Appliquer à tous"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD ECOLAGE MODAL ─── */}
      {addEcolageStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Definir l&apos;ecolage</h2>
              <button onClick={() => setAddEcolageStudent(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl p-3">
              <Avatar s={addEcolageStudent} size={40} />
              <div><div className="font-bold text-slate-900 text-sm">{getStudentName(addEcolageStudent)}</div><div className="text-xs text-slate-400">{addEcolageStudent.matricule}</div></div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Montant total de l&apos;ecolage (Ar)</label>
              <input type="number" placeholder="Ex: 1500000" value={addEcolageForm.montantDu} onChange={e=>setAddEcolageForm(f=>({...f,montantDu:e.target.value}))} autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Annee scolaire</label>
              <div className="relative">
                <select value={addEcolageForm.annee} onChange={e=>setAddEcolageForm(f=>({...f,annee:e.target.value}))}
                  className="appearance-none w-full px-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {["2024/2025","2025/2026","2026/2027"].map(y=><option key={y}>{y}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAddEcolageStudent(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleAddEcolage} disabled={saving||!addEcolageForm.montantDu}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{background:etabColor}}>
                {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ─── DELETE PAIEMENT CONFIRM ─── */}
      {deletePaiement && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto"><AlertTriangle size={26} className="text-red-600" /></div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Supprimer ce paiement ?</h2>
              <p className="text-sm text-slate-500">Le montant sera deduit du total paye.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center space-y-0.5">
              <div className="font-bold text-slate-900">{deletePaiement.etudiantNom}</div>
              <div className="text-lg font-bold text-red-700">{formatMGA(deletePaiement.montant)}</div>
              <div className="text-xs text-slate-400">{deletePaiement.date} · {deletePaiement.note||""}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletePaiement(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Non, annuler</button>
              <button onClick={handleDeletePaiement} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : <><Trash2 size={15} />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINT ALL AREA ─── */}
      <div id="print-all-students" style={{display:"none"}}>
        <div style={{fontFamily:"Arial,sans-serif",padding:"30px",background:"white"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px",paddingBottom:"15px",borderBottom:`3px solid ${etabColor}`}}>
            <div>
              <div style={{fontSize:"24px",fontWeight:"bold",color:etabColor}}>GSI SmartPay — Liste des Etudiants</div>
              <div style={{fontSize:"14px",color:"#64748b",marginTop:"4px"}}>{etabInfo?.label}</div>
            </div>
            <div style={{textAlign:"right",fontSize:"12px",color:"#64748b"}}>
              <div>Filiere: {filiereFilter}</div>
              <div>Statut: {statutTab}</div>
              <div>Date: {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>

          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                {["Matricule","Nom complet","Filiere","Niveau","Total Du","Total Paye","Reste","Statut"].map(h=>(
                  <th key={h} style={{border:"1px solid #e2e8f0",padding:"10px 8px",textAlign:"left",color:"#475569",fontWeight:"bold",textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i)=>{
                const ec = getEcolage(s);
                const name = getStudentName(s);
                const reste = (ec?.montantDu||0) - (ec?.montantPaye||0);
                return (
                  <tr key={i} style={{background:i%2===0?"white":"#fbfcfd"}}>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",fontFamily:"monospace",color:"#64748b"}}>{s.matricule||"—"}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",fontWeight:"600",color:"#1e293b"}}>{name}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",color:"#475569",maxWidth:"150px"}}>{s.filiere||"—"}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",textAlign:"center"}}>{s.niveau||"—"}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",fontWeight:"500"}}>{formatMGA(ec?.montantDu||0)}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",color:"#059669",fontWeight:"500"}}>{formatMGA(ec?.montantPaye||0)}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",color:reste>0?"#dc2626":"#059669",fontWeight:"bold"}}>{formatMGA(reste)}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px"}}>
                      <span style={{
                        padding:"3px 8px",borderRadius:"6px",fontWeight:"bold",fontSize:"9px",textTransform:"uppercase",
                        background:ec?.statut==="paye"?"#dcfce7":ec?.statut==="en_attente"?"#fef3c7":"#fee2e2",
                        color:ec?.statut==="paye"?"#15803d":ec?.statut==="en_attente"?"#92400e":"#991b1b",
                        border:`1px solid ${ec?.statut==="paye"?"#bbf7d0":ec?.statut==="en_attente"?"#fde68a":"#fecaca"}`
                      }}>
                        {STATUT_LABELS[ec?.statut||"impaye"]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{marginTop:"30px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"15px"}}>
            <div style={{border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>ETUDIANTS</div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:"#1e293b"}}>{filtered.length}</div>
            </div>
            <div style={{border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>TOTAL PAYE</div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:"#059669"}}>{formatMGA(filtered.reduce((sum,s)=>sum+(getEcolage(s)?.montantPaye||0),0))}</div>
            </div>
            <div style={{border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>RESTE A PERCEVOIR</div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:"#dc2626"}}>{formatMGA(filtered.reduce((sum,s)=>sum+Math.max(0,(getEcolage(s)?.montantDu||0)-(getEcolage(s)?.montantPaye||0)),0))}</div>
            </div>
          </div>

          <div style={{textAlign:"center",marginTop:"40px",color:"#94a3b8",fontSize:"10px",borderTop:"1px solid #f1f5f9",paddingTop:"15px"}}>
            Document genere par GSI SmartPay — Logiciel de gestion d&apos;ecolage universitaire
          </div>
        </div>
      </div>
    </div>
  );
}
