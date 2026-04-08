"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, RefreshCw, ExternalLink, Info, X,
  Phone, Mail, GraduationCap, CreditCard, Calendar,
  MapPin, Edit3, Trash2, AlertTriangle, Users,
  CheckCircle2, Clock, ChevronDown, Plus, Check,
  Printer, Receipt, ArrowLeft, Download, Settings, FileText, Upload, Eye
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, Etablissement } from "@/lib/data";
import {
  fetchStudents, fetchEcolages, fetchPaiements, createPaiement,
  updateEcolage, updatePaiement, deleteEcolage, deletePaiement,
  DBStudent, DBEcolage, DBPaiement,
  getStudentId, getStudentName, getStudentCampus, formatMGA, API_BASE,
  calculateIntelligentStatus
} from "@/lib/api";
import clsx from "clsx";
import CustomModal from "@/components/CustomModal";

const STATUT_COLORS = {
  paye:       "bg-emerald-100 text-emerald-700 border border-emerald-200",
  impaye:     "bg-red-100 text-red-700 border border-red-200",
  en_attente: "bg-amber-100 text-amber-700 border border-amber-200",
};
const STATUT_LABELS = { paye: "Paye", impaye: "Impaye", en_attente: "En attente" };
const STATUT_DOT   = { paye: "bg-emerald-500", impaye: "bg-red-500", en_attente: "bg-amber-500" };
const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
type FilterTab = "tous" | "paye" | "impaye" | "en_attente";

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

export default function EtudiantsPage() {
  const { currentUser, appState, setProgramFee, deleteProgramFee } = useAuth();

  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [allPaiements, setAllPaiements] = useState<DBPaiement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const [search,        setSearch]        = useState("");
  const [filiereFilter, setFiliereFilter] = useState("Toutes");
  const [statutTab,     setStatutTab]     = useState<FilterTab>("tous");
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [profileStudent,  setProfileStudent]  = useState<DBStudent | null>(null);
  const [profileView,     setProfileView]     = useState<"info" | "historique">("info");
  const [receiptPaiement, setReceiptPaiement] = useState<DBPaiement | null>(null);
  const [payStudent,      setPayStudent]      = useState<DBStudent | null>(null);
  const [payEcolage,      setPayEcolage]      = useState<DBEcolage | null>(null);
  const [editingPaiement, setEditingPaiement] = useState<DBPaiement | null>(null);

  const [showConfig,      setShowConfig]      = useState(false);
  const [bulkAmount,      setBulkAmount]      = useState("");
  const [bulkMonthly,     setBulkMonthly]     = useState("");
  const [selectedConfigLevels, setSelectedConfigLevels] = useState<string[]>(["L1", "L2", "L3", "M1", "M2"]);
  const [activeConfigFiliere, setActiveConfigFiliere] = useState("");

  const [editEcolage,     setEditEcolage]     = useState<DBEcolage | null>(null);
  const [deleteEcolageObj, setDeleteEcolageObj] = useState<DBEcolage | null>(null);
  const [deletePaiementObj, setDeletePaiementObj] = useState<DBPaiement | null>(null);

  const [ecolageForm, setEcolageForm] = useState({ montantDu: "" });
  const [approvalDesc, setApprovalDesc] = useState("");
  const [payForm, setPayForm] = useState({
    mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()),
    montant: "", date: new Date().toISOString().split("T")[0], note: "",
    mode: "Especes", transactionRef: "", preuve: "", preuveFilename: "",
  });

  // Custom UI Modals
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
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      confirmLabel: "OK"
    });
  };

  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin   = currentUser?.role === "admin";
  const etabColor = etabInfo?.color || "#2563eb";
  const filieres  = etabInfo ? etabInfo.filieres : [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const ecolageMap = useMemo(() => {
    const map = new Map<string, DBEcolage>();
    ecolages.forEach(e => map.set(e.etudiantId, e));
    return map;
  }, [ecolages]);

  const getEcolage = useCallback((s: DBStudent) => {
    const id = getStudentId(s);
    return ecolageMap.get(id);
  }, [ecolageMap]);

  const getEffectiveEcolage = useCallback((s: DBStudent): DBEcolage => {
    const campus = (s.campus || "").toLowerCase();
    const sFiliere = s.filiere || "";
    const sNiveau = s.niveau || "L1";

    // On cherche d'abord la configuration globale (qui prime sur tout)
    const config = appState.programFees.find(p =>
      p.campus.toLowerCase() === campus &&
      normalizeString(p.filiere) === normalizeString(sFiliere) &&
      p.niveau === sNiveau
    );

    const realEc = getEcolage(s);

    // Si on a un dossier réel mais pas de config, on garde le dossier tel quel
    // Mais si on a une config, elle ÉCRASE le montant dû et mensuel du dossier réel
    const finalDu = config ? config.amount : (realEc?.montantDu ?? 0);
    const finalMensuel = config ? (config.monthlyAmount ?? 0) : (realEc?.montantMensuel ?? 0);
    const finalPaye = realEc?.montantPaye ?? 0;

    const intelligentStatut = calculateIntelligentStatus(finalPaye, finalDu, finalMensuel);

    return {
      id: realEc?.id || realEc?._id,
      etudiantId: getStudentId(s),
      etudiantNom: getStudentName(s),
      matricule: s.matricule || "",
      campus: s.campus || "",
      filiere: sFiliere,
      classe: sNiveau,
      montantDu: finalDu,
      montantMensuel: finalMensuel,
      montantPaye: finalPaye,
      statut: intelligentStatut,
    };
  }, [appState.programFees, getEcolage]);

  const studentData = useMemo(() => {
    return students.map(s => ({
      student: s,
      effectiveEcolage: getEffectiveEcolage(s)
    }));
  }, [students, getEffectiveEcolage]);

  const stats = useMemo(() => {
    let paye = 0, impaye = 0, en_attente = 0, totalDu = 0, totalPaye = 0;
    studentData.forEach(({ effectiveEcolage: ec }) => {
      if (ec.statut === "paye") paye++;
      else if (ec.statut === "impaye") impaye++;
      else if (ec.statut === "en_attente") en_attente++;

      totalDu += ec.montantDu;
      totalPaye += ec.montantPaye;
    });
    return { paye, impaye, en_attente, totalDu, totalPaye };
  }, [studentData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const normFiliereFilter = normalizeString(filiereFilter);

    return studentData.filter(({ student: s, effectiveEcolage: ec }) => {
      const name = getStudentName(s).toLowerCase();
      const ok1 = !q || name.includes(q) || (s.matricule||"").toLowerCase().includes(q) || (s.email||"").toLowerCase().includes(q);
      const ok2 = filiereFilter === "Toutes" || normalizeString(s.filiere||"") === normFiliereFilter;
      const ok2b = selectedNiveaux.length === 0 || selectedNiveaux.includes(s.niveau || "L1");
      const ok3 = statutTab === "tous" || ec.statut === statutTab;
      return ok1 && ok2 && ok2b && ok3;
    });
  }, [studentData, search, filiereFilter, selectedNiveaux, statutTab]);

  const getStudentPaiements = (s: DBStudent) => {
    const id = getStudentId(s);
    return allPaiements.filter(p => p.etudiantId === id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  };

  const openPayment = async (s: DBStudent) => {
    const effEc = getEffectiveEcolage(s);
    let ec = getEcolage(s);
    if (!ec) {
      const { createEcolage } = await import("@/lib/api");
      const result = await createEcolage({
        etudiantId: effEc.etudiantId,
        etudiantNom: effEc.etudiantNom,
        matricule: effEc.matricule || "",
        campus: effEc.campus || currentUser?.etablissement || "",
        filiere: effEc.filiere,
        classe: effEc.classe,
        montantDu: effEc.montantDu,
        montantMensuel: effEc.montantMensuel,
        montantPaye: 0,
        statut: effEc.statut,
        annee: String(new Date().getFullYear()),
      });
      if (result) ec = result;
      await load();
    }
    setPayStudent(s);
    setPayEcolage(effEc);
    setPayForm({ mois: MOIS[new Date().getMonth()], annee: String(new Date().getFullYear()), montant: "", date: new Date().toISOString().split("T")[0], note: "", mode: "Especes", transactionRef: "", preuve: "", preuveFilename: "" });
  };

  const openEditEcolage = (ec: DBEcolage) => {
    setEditEcolage(ec);
    setEcolageForm({ montantDu: String(ec.montantDu) });
  };

  const handleSaveEcolage = async () => {
    if (!editEcolage) return;
    if (!isAdmin && !approvalDesc) {
      showAlert("Attention", "Veuillez fournir un motif pour la modification.", "warning"); return;
    }
    setSaving(true);
    const id = editEcolage.id || editEcolage._id || "";
    const newDu = Number(ecolageForm.montantDu);

    if (isAdmin) {
      const st = calculateIntelligentStatus(editEcolage.montantPaye, newDu, editEcolage.montantMensuel);
      await updateEcolage(id, { montantDu: newDu, statut: st });
      showAlert("Succès", "Écolage mis à jour.", "success");
    } else {
      const { createRequest } = await import("@/lib/api");
      await createRequest({
        type: "update_ecolage",
        collection: "ecolage",
        targetId: id,
        payload: { montantDu: newDu },
        description: approvalDesc,
        agentId: currentUser?.id || "",
        agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
        campus: currentUser?.etablissement || "",
        status: "pending"
      });
      showAlert("Demande envoyée", "Votre demande de modification a été envoyée à l'administrateur.", "info");
    }

    await load();
    setSaving(false);
    setEditEcolage(null);
    setApprovalDesc("");
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
    setPayForm({
      mois: m, annee: y, montant: String(p.montant), date: p.date, note: noteTxt,
      mode: p.mode || "Especes", transactionRef: p.transactionRef || "", preuve: p.preuve || "",
      preuveFilename: p.preuveFilename || ""
    });
  };


  const handleSavePayment = async () => {
    if (!payStudent || !payForm.montant) return;
    setSaving(true);
    const montant = Number(payForm.montant);
    const note = `${payForm.mois} ${payForm.annee}${payForm.note ? " — "+payForm.note : ""}`;

    if (editingPaiement) {
      const pid = editingPaiement.id || editingPaiement._id || "";
      if (isAdmin) {
        await updatePaiement(pid, { montant, date: payForm.date, mode: payForm.mode, transactionRef: payForm.transactionRef, preuve: payForm.preuve, preuveFilename: payForm.preuveFilename, note });
        if (payEcolage && (payEcolage.id || payEcolage._id)) {
          const diff = montant - editingPaiement.montant;
          const newPaye = payEcolage.montantPaye + diff;
          const st = calculateIntelligentStatus(newPaye, payEcolage.montantDu, payEcolage.montantMensuel);
          await updateEcolage(payEcolage.id || payEcolage._id || "", {
            montantPaye: newPaye,
            statut: st,
          });
        }
        showAlert("Succès", "Paiement modifié.", "success");
      } else {
        const { createRequest } = await import("@/lib/api");
        await createRequest({
          type: "update_paiement",
          collection: "paiements",
          targetId: pid,
          payload: { montant, date: payForm.date, mode: payForm.mode, transactionRef: payForm.transactionRef, preuve: payForm.preuve, preuveFilename: payForm.preuveFilename, note },
          description: approvalDesc || "Modification de paiement",
          agentId: currentUser?.id || "",
          agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
          campus: currentUser?.etablissement || "",
          status: "pending"
        });
        showAlert("Demande envoyée", "Demande de modification envoyée à l'administrateur.", "info");
      }
    } else {
      await createPaiement({
        etudiantId: getStudentId(payStudent), etudiantNom: getStudentName(payStudent),
        matricule: payStudent.matricule || "", campus: payStudent.campus || currentUser?.etablissement || "",
        filiere: payStudent.filiere || "", classe: payStudent.niveau || "L1",
        montant, date: payForm.date, mode: payForm.mode,
        transactionRef: payForm.transactionRef, preuve: payForm.preuve, preuveFilename: payForm.preuveFilename,
        agentId: currentUser?.id || "", agentNom: `${currentUser?.prenom||""} ${currentUser?.nom||""}`.trim(), note,
      });
      if (payEcolage && (payEcolage.id || payEcolage._id)) {
        const newPaye = payEcolage.montantPaye + montant;
        const st = calculateIntelligentStatus(newPaye, payEcolage.montantDu, payEcolage.montantMensuel);
        await updateEcolage(payEcolage.id || payEcolage._id || "", {
          montantPaye: newPaye,
          statut: st,
        });
      }
      showAlert("Succès", "Paiement enregistré avec succès.", "success");
    }
    await load(); setSaving(false); setPayStudent(null); setPayEcolage(null); setEditingPaiement(null); setApprovalDesc("");
  };



  const handleBulkApplyConfig = () => {
    if (bulkAmount === "" && bulkMonthly === "") return;
    const fil = activeConfigFiliere || filieres[0];
    selectedConfigLevels.forEach(lvl => {
      const existing = appState.programFees.find(f => f.campus === currentUser!.etablissement && f.filiere === fil && f.niveau === lvl);
      const newDu = bulkAmount ? Number(bulkAmount) : (existing?.amount || 0);
      const newMensuel = bulkMonthly ? Number(bulkMonthly) : (existing?.monthlyAmount || 0);
      setProgramFee(currentUser!.etablissement, fil, newDu, lvl, newMensuel);
    });
    setBulkAmount("");
    setBulkMonthly("");
  };

  const handleApplyConfigToAll = async () => {
    if (!currentUser) return;
    setSaving(true);
    const { createEcolage, updateEcolage: apiUpdateEco } = await import("@/lib/api");
    const myEtab = currentUser.etablissement;

    const campusStudents = students.filter(s => (s.campus || "").toLowerCase().includes(myEtab));

    for (const s of campusStudents) {
      const sFiliere = s.filiere || "";
      const sNiveau = s.niveau || "L1";
      const config = appState.programFees.find(p =>
        p.campus === myEtab &&
        normalizeString(p.filiere) === normalizeString(sFiliere) &&
        p.niveau === sNiveau
      );
      if (config) {
        const ec = getEcolage(s);
        if (ec) {
          const st = calculateIntelligentStatus(ec.montantPaye, config.amount, config.monthlyAmount);
          await apiUpdateEco(ec.id || ec._id || "", {
            montantDu: config.amount,
            montantMensuel: config.monthlyAmount,
            statut: st
          });
        } else {
          await createEcolage({
            etudiantId: getStudentId(s),
            etudiantNom: getStudentName(s),
            matricule: s.matricule || "",
            campus: s.campus || myEtab,
            filiere: sFiliere,
            classe: sNiveau,
            montantDu: config.amount,
            montantMensuel: config.monthlyAmount,
            montantPaye: 0,
            statut: "impaye",
            annee: String(new Date().getFullYear()),
          });
        }
      }
    }
    await load();
    setSaving(false);
    setShowConfig(false);
    showAlert("Succès", "La configuration a été appliquée à tous les étudiants du campus.", "success");
  };

  const handlePrint = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("active");
      setTimeout(() => {
        window.print();
        el.classList.remove("active");
      }, 100);
    }
  };

  const handleDeleteEcolage = async () => {
    if (!deleteEcolageObj) return;
    if (!isAdmin && !approvalDesc) {
      showAlert("Attention", "Veuillez fournir un motif pour la suppression.", "warning"); return;
    }
    setDeleting(true);

    const id = deleteEcolageObj.id || deleteEcolageObj._id || "";
    if (id) {
      if (isAdmin) {
        const { deleteEcolage: apiDelEco, deletePaiement: apiDelPay } = await import("@/lib/api");
        await apiDelEco(id);

        const stId = deleteEcolageObj.etudiantId;
        const toDelete = allPaiements.filter(p => p.etudiantId === stId);
        for (const p of toDelete) {
          const pid = p.id || p._id;
          if (pid) await apiDelPay(pid);
        }
        showAlert("Succès", "Écolage et paiements supprimés.", "info");
      } else {
        const { createRequest } = await import("@/lib/api");
        await createRequest({
          type: "delete_ecolage",
          collection: "ecolage",
          targetId: id,
          payload: { etudiantId: deleteEcolageObj.etudiantId },
          description: approvalDesc,
          agentId: currentUser?.id || "",
          agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
          campus: currentUser?.etablissement || "",
          status: "pending"
        });
        showAlert("Demande envoyée", "Votre demande de suppression a été envoyée à l'administrateur.", "info");
      }
    }

    await load(); setDeleting(false); setDeleteEcolageObj(null);
    setApprovalDesc("");
  };

  const handleDeletePaiement = async () => {
    if (!deletePaiementObj) return;
    if (!isAdmin && !approvalDesc) {
      showAlert("Attention", "Veuillez fournir un motif.", "warning"); return;
    }
    setDeleting(true);
    const id = deletePaiementObj.id || deletePaiementObj._id || "";
    if (id) {
      if (isAdmin) {
        await deletePaiement(id);
        const ec = ecolages.find(e => e.etudiantId === deletePaiementObj.etudiantId);
        if (ec && (ec.id || ec._id)) {
          const newPaye = Math.max(0, ec.montantPaye - deletePaiementObj.montant);
          const st = calculateIntelligentStatus(newPaye, ec.montantDu, ec.montantMensuel);
          await updateEcolage(ec.id || ec._id || "", { montantPaye: newPaye, statut: st });
        }
        showAlert("Succès", "Paiement supprimé.", "info");
      } else {
        const { createRequest } = await import("@/lib/api");
        await createRequest({
          type: "delete_paiement",
          collection: "paiements",
          targetId: id,
          payload: { montant: deletePaiementObj.montant, etudiantId: deletePaiementObj.etudiantId },
          description: approvalDesc,
          agentId: currentUser?.id || "",
          agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
          campus: currentUser?.etablissement || "",
          status: "pending"
        });
        showAlert("Demande envoyée", "Demande de suppression envoyée à l'administrateur.", "info");
      }
    }
    await load();
    setDeleting(false);
    setDeletePaiementObj(null);
    setApprovalDesc("");
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
    { id: "paye",       label: "Payes",      count: stats.paye,       color: "text-emerald-600", border: "border-emerald-400", icon: CheckCircle2 },
    { id: "impaye",     label: "Impayes",    count: stats.impaye,     color: "text-red-600",     border: "border-red-400",     icon: AlertTriangle},
    { id: "en_attente", label: "En attente", count: stats.en_attente,    color: "text-amber-600",   border: "border-amber-400",   icon: Clock        },
  ];

  return (
    <div className="space-y-5">
      <CustomModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

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
              const rows = filtered.map(({ student: s, effectiveEcolage: ec }) => [
                s.matricule || "",
                getStudentName(s),
                s.filiere || "",
                s.niveau || "",
                ec.statut,
                ec.montantDu,
                ec.montantPaye,
                ec.montantDu - ec.montantPaye
              ]);
              const csv = "\uFEFF" + [headers, ...rows].map(r => r.join(";")).join("\n");
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
            <Download size={15} /> Excel
          </button>
          <button
            onClick={() => handlePrint("print-all-students")}
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
            {id === "tous" && <div className="text-xs text-slate-400 mt-0.5 truncate">{formatMGA(stats.totalPaye)} / {formatMGA(stats.totalDu)}</div>}
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
          <div className="space-y-2 pb-0.5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["Toutes",...filieres].map(f => (
                <button key={f} onClick={() => { setFiliereFilter(f); }}
                  className={clsx("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
                    filiereFilter===f ? "text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                  style={filiereFilter===f ? {background:etabColor} : {}}>
                  {f==="Toutes" ? "Toutes" : f.length>24 ? f.slice(0,24)+"…" : f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto animate-in fade-in slide-in-from-left-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Niveaux:</span>
              {["L1", "L2", "L3", "M1", "M2"].map(niv => (
                <button key={niv} onClick={() => setSelectedNiveaux(prev => prev.includes(niv) ? prev.filter(x => x !== niv) : [...prev, niv])}
                  className={clsx("shrink-0 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border",
                    selectedNiveaux.includes(niv) ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100")}>
                  {niv}
                </button>
              ))}
              {selectedNiveaux.length > 0 && (
                <button onClick={() => setSelectedNiveaux([])} className="text-[10px] font-black text-brand-600 hover:underline uppercase px-2">Tous</button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{filtered.length} resultat(s) sur {students.length}</span>
          {(search || filiereFilter!=="Toutes" || statutTab!=="tous" || selectedNiveaux.length > 0) && (
            <button onClick={() => { setSearch(""); setFiliereFilter("Toutes"); setStatutTab("tous"); setSelectedNiveaux([]); }}
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
                  <tr>{["Etudiant","Filiere","Niveau","Total Annuel","Statut","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(({ student: s, effectiveEcolage: ec }) => {
                    const realEc = getEcolage(s);
                    const statut = ec.statut;
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
                          {realEc || (config && config.amount >= 0) ? (
                            <div className="text-xs space-y-0.5">
                              <div className="font-black text-slate-900">{formatMGA(ec.montantDu)}</div>
                              <div className="text-emerald-600 font-medium">Payé: {formatMGA(ec.montantPaye)}</div>
                              {ec.montantDu > ec.montantPaye && <div className="text-red-500 font-black">Reste: {formatMGA(ec.montantDu-ec.montantPaye)}</div>}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-slate-300 text-[10px] font-black uppercase italic">Non défini</span>
                              {(() => {
                                const campus = (s.campus || "").toLowerCase();
                                const config = appState.programFees.find(p => p.campus === campus && normalizeString(p.filiere) === normalizeString(s.filiere || "") && p.niveau === (s.niveau || "L1"));
                                if (config && config.amount > 0) return <div className="text-[10px] font-black text-brand-500 uppercase tracking-tighter">Prévu: {formatMGA(config.amount)}</div>;
                                return null;
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", STATUT_COLORS[statut])}>
                            <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                            {STATUT_LABELS[statut]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setProfileStudent(s); setProfileView("info"); }} title="Profil & historique"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200">
                              <Info size={14} />
                            </button>
                            <button onClick={() => openPayment(s)} title="Enregistrer paiement"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-200">
                              <CreditCard size={14} />
                            </button>
                            {realEc ? (
                              <>
                                <button onClick={() => openEditEcolage(realEc)} title="Modifier l'écolage total"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-200">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => setDeleteEcolageObj(realEc)} title="Supprimer l'écolage"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => openPayment(s)} title="Ajouter un ecolage"
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
              {filtered.map(({ student: s, effectiveEcolage: ec }) => {
                const realEc = getEcolage(s);
                const statut = ec.statut;
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
                    {(realEc || (config && config.amount >= 0)) && (
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
                      {realEc ? (
                        <>
                          <button onClick={() => openEditEcolage(realEc)}
                            className="flex items-center gap-1 text-xs text-amber-600 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-50">
                            <Edit3 size={12} /> Modifier
                          </button>
                          <button onClick={() => setDeleteEcolageObj(realEc)}
                            className="flex items-center gap-1 text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50">
                            <Trash2 size={12} /> Supprimer
                          </button>
                        </>
                      ) : (
                        <button onClick={() => openPayment(s)}
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
        const ec = getEffectiveEcolage(profileStudent);
        const statut = ec.statut;
        const name = getStudentName(profileStudent);
        const initials = name.split(" ").map(n=>n[0]||"").join("").slice(0,2).toUpperCase();
        const pays = getStudentPaiements(profileStudent);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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

                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Scolarité Annuelle</span>
                        <div className="flex gap-2">
                          {getEcolage(profileStudent) && (
                            <button onClick={() => { openEditEcolage(getEcolage(profileStudent)!); setProfileStudent(null); }}
                              className="text-xs text-amber-600 flex items-center gap-0.5 hover:underline"><Edit3 size={11} /> Modifier</button>
                          )}
                          {ec.montantDu > 0 && getEcolage(profileStudent) && (
                            <button onClick={() => { setDeleteEcolageObj(getEcolage(profileStudent)!); setProfileStudent(null); }}
                              className="text-xs text-red-500 flex items-center gap-0.5 hover:underline"><Trash2 size={11} /> Supprimer</button>
                          )}
                        </div>
                      </div>
                      {ec.montantDu > 0 ? (
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            {[
                              { label: "Total dû", value: formatMGA(ec.montantDu), color: "text-slate-900" },
                              { label: "Payé", value: formatMGA(ec.montantPaye), color: "text-emerald-600" },
                              { label: "Reste", value: formatMGA(ec.montantDu-ec.montantPaye), color: ec.montantDu>ec.montantPaye?"text-red-600":"text-emerald-600" },
                            ].map(({ label, value, color }) => (
                              <div key={label}><div className={`text-xs font-black ${color}`}>{value}</div><div className="text-[10px] font-black uppercase text-slate-400 mt-0.5 tracking-tighter">{label}</div></div>
                            ))}
                          </div>
                          {(() => {
                            const campus = (profileStudent.campus || "").toLowerCase();
                            const config = appState.programFees.find(p => p.campus === campus && normalizeString(p.filiere) === normalizeString(profileStudent.filiere || "") && p.niveau === (profileStudent.niveau || "L1"));
                            if (config && config.amount > 0 && config.amount !== ec.montantDu) {
                              return (
                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] font-bold text-amber-700 animate-pulse">
                                  <AlertTriangle size={14} className="shrink-0" />
                                  <p>Attention: Le total dû actuel ({formatMGA(ec.montantDu)}) diffère du tarif configuré pour ce niveau ({formatMGA(config.amount)}).</p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center space-y-2">
                          <div className="text-slate-400 text-xs font-medium italic">Aucun dossier d&apos;écolage initialisé.</div>
                          {(() => {
                            const campus = (profileStudent.campus || "").toLowerCase();
                            const config = appState.programFees.find(p => p.campus === campus && normalizeString(p.filiere) === normalizeString(profileStudent.filiere || "") && p.niveau === (profileStudent.niveau || "L1"));
                            if (config && config.amount > 0) {
                              return (
                                <div className="inline-block px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-100">
                                  Tarif prévu: {formatMGA(config.amount)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
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
                                  <div className="flex items-center gap-2">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">{p.mode} {p.transactionRef && `· ${p.transactionRef}`}</div>
                                    {p.preuve && (
                                      <button onClick={(e) => {
                                        e.stopPropagation();
                                        const win = window.open();
                                        if (win) win.document.write(`<body style="margin:0; background:#000; display:flex; align-items:center; justify-center"><img src="${p.preuve}" style="max-width:100%; max-height:100vh; margin:auto"></body>`);
                                      }} className="p-1 bg-brand-50 text-brand-600 rounded hover:bg-brand-100 transition-colors">
                                        <Eye size={10} />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{p.date} · {p.agentNom}</div>
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
                          <button onClick={e => { e.stopPropagation(); setDeletePaiementObj(p); }}
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
          <div id="receipt-print-area" className="only-print" style={{background:"white",padding:"20px",boxSizing:"border-box"}}>
            <div style={{fontFamily:"Arial,sans-serif",maxWidth:"400px",margin:"0 auto",padding:"20px"}}>
              <div style={{background:etabColor,color:"white",padding:"20px",borderRadius:"12px 12px 0 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                  <img src="/gsi-smartpay/logo.png" alt="Logo" style={{height:"40px",width:"40px",objectFit:"contain",background:"white",borderRadius:"8px",padding:"4px"}} />
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

          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-5 text-white" style={{background:etabColor}}>
                <div className="flex items-center justify-between mb-1">
                  <img src="/gsi-smartpay/logo.png" alt="Logo" className="h-10 w-10 object-contain bg-white rounded-lg p-1" />
                  <div className="text-xs opacity-70">RECU OFFICIEL</div>
                </div>
                <div className="text-xs opacity-70">{etabInfo?.label}</div>
              </div>
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
              <div className="px-6 pb-5 flex gap-3">
                <button onClick={() => setReceiptPaiement(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Fermer
                </button>
                <button
                  onClick={() => handlePrint("receipt-print-area")}
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
                  : <div className="text-xs text-amber-600 mt-0.5">Aucun ecolage fini</div>}
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
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Mode de paiement</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Especes", "Banque", "Mvola", "Airtel Money", "Orange Money"].map(m => (
                  <button key={m} type="button" onClick={() => setPayForm(f=>({...f, mode: m}))}
                    className={clsx("px-2 py-1.5 rounded-xl text-[10px] font-black border transition-all uppercase",
                      payForm.mode === m ? "bg-brand-600 text-white border-brand-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {payForm.mode !== "Especes" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Réf. Transaction</label>
                  <input type="text" placeholder="ID de transaction..." value={payForm.transactionRef}
                    onChange={e => setPayForm(f=>({...f, transactionRef: e.target.value}))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Justificatif (Capture/Direct)</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border-2 border-dashed border-brand-200 rounded-xl text-brand-600 cursor-pointer hover:bg-brand-50 transition-all shadow-sm">
                      <Upload size={14} />
                      <span className="text-[10px] font-bold truncate max-w-[150px]">
                        {payForm.preuveFilename || "Uploader / Photo"}
                      </span>
                      <input type="file" className="hidden" accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setPayForm(f => ({ ...f, preuve: reader.result as string, preuveFilename: file.name }));
                            reader.readAsDataURL(file);
                          }
                        }} />
                    </label>
                    {payForm.preuve && (
                      <button type="button" onClick={() => {
                        const win = window.open();
                        if (win) win.document.write(`<img src="${payForm.preuve}" style="max-width:100%">`);
                      }} className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
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
      {deleteEcolageObj && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto"><AlertTriangle size={26} className="text-red-600" /></div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Supprimer cet ecolage ?</h2>
              <p className="text-sm text-slate-500">L&apos;ecolage et TOUS les paiements associes de cet etudiant seront supprimes.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center space-y-0.5">
              <div className="font-bold text-slate-900">{deleteEcolageObj.etudiantNom}</div>
              <div className="text-sm text-red-700">{formatMGA(deleteEcolageObj.montantDu)}</div>
            </div>
            {!isAdmin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-amber-600 block">Motif de la suppression <span className="text-red-500">*</span></label>
                <textarea placeholder="Pourquoi supprimer cet écolage ?" value={approvalDesc}
                  onChange={e => setApprovalDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-amber-200 bg-amber-50/30 rounded-xl focus:outline-none min-h-[60px]" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteEcolageObj(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Non, annuler</button>
              <button onClick={handleDeleteEcolage} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : <><Trash2 size={15} />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIGURATION MODAL ─── */}
      {showConfig && (() => {
        const currentFiliere = activeConfigFiliere || filieres[0];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl p-8 flex gap-8 h-[85vh]">
              <div className="w-64 flex flex-col gap-2 overflow-y-auto pr-4 border-r border-slate-100">
                <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Secteurs</h3>
                {filieres.map(f => (
                  <button key={f} onClick={() => setActiveConfigFiliere(f)}
                    className={clsx("text-left px-4 py-3 rounded-xl text-xs font-bold transition-all",
                      currentFiliere === f ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" : "text-slate-500 hover:bg-slate-50")}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Plafonds d&apos;écolage</h2>
                    <p className="text-sm text-slate-400 mt-1">{currentFiliere}</p>
                  </div>
                  <button onClick={() => setShowConfig(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-red-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-6">
                  <div className="text-[10px] font-black uppercase text-brand-600 mb-3 tracking-widest flex items-center justify-between">
                    <span>Mise à jour rapide par niveau</span>
                    <span className="bg-brand-600 text-white px-2 py-0.5 rounded text-[9px] lowercase font-medium">Auto-calcul</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-1 bg-white p-1 rounded-lg border border-brand-200">
                      {["L1", "L2", "L3", "M1", "M2"].map(lvl => (
                        <button key={lvl} onClick={() => setSelectedConfigLevels(p => p.includes(lvl) ? p.filter(x => x !== lvl) : [...p, lvl])}
                          className={clsx("w-9 h-9 rounded-md text-[10px] font-black transition-all",
                            selectedConfigLevels.includes(lvl) ? "bg-brand-600 text-white" : "text-slate-400 hover:bg-slate-50")}>
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-1 min-w-[300px]">
                      <div className="relative flex-1">
                        <input type="number" placeholder="Total Annuel..." value={bulkAmount} onChange={e => setBulkAmount(e.target.value)}
                          className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 uppercase">Ar</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="number" placeholder="Mensuel..." value={bulkMonthly} onChange={e => setBulkMonthly(e.target.value)}
                          className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400 uppercase">Ar</span>
                      </div>
                    </div>
                    <button onClick={handleBulkApplyConfig} disabled={!bulkAmount && !bulkMonthly}
                      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase shadow-sm disabled:opacity-50 hover:bg-black">
                      Remplir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-2 pb-4">
                  {["L1", "L2", "L3", "M1", "M2"].map(niv => {
                    const config = appState.programFees.find(p => p.campus === currentUser?.etablissement && p.filiere === currentFiliere && p.niveau === niv);
                    return (
                      <div key={niv} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm group hover:border-brand-300 transition-all relative overflow-hidden">
                        {config && <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Niveau {niv}</div>
                          {config && (
                            <button onClick={() => deleteProgramFee(currentUser!.etablissement, currentFiliere, niv)}
                              className="text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="relative">
                            <label className="text-[9px] font-black text-slate-400 block mb-1">TOTAL ANNUEL (Dû)</label>
                            <input type="number" placeholder="0"
                              value={config?.amount || ""}
                              onChange={e => setProgramFee(currentUser!.etablissement, currentFiliere, Number(e.target.value), niv, config?.monthlyAmount)}
                              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold focus:outline-none focus:bg-white focus:border-brand-200 transition-all" />
                            <span className="absolute right-2 top-[24px] text-[8px] font-bold text-slate-400">Ar</span>
                          </div>
                          <div className="relative">
                            <label className="text-[9px] font-black text-slate-400 block mb-1">MENSUEL PAR DÉFAUT</label>
                            <input type="number" placeholder="0"
                              value={config?.monthlyAmount || ""}
                              onChange={e => setProgramFee(currentUser!.etablissement, currentFiliere, config?.amount || 0, niv, Number(e.target.value))}
                              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold focus:outline-none focus:bg-white focus:border-brand-200 transition-all" />
                            <span className="absolute right-2 top-[24px] text-[8px] font-bold text-slate-400">Ar</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                  <button onClick={() => setShowConfig(false)} className="flex-1 py-4 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-400 hover:bg-slate-50">Fermer</button>
                  <button onClick={handleApplyConfigToAll} disabled={saving}
                    className="flex-[2] py-4 rounded-xl bg-brand-600 text-white text-xs font-black uppercase shadow-lg shadow-brand-600/20 disabled:opacity-50 hover:scale-[1.01] transition-all">
                    {saving ? "Calcul en cours..." : "Appliquer à TOUS les étudiants"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}



      {/* ─── EDIT ECOLAGE MODAL ─── */}
      {editEcolage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Modifier l&apos;écolage</h2>
              <button onClick={() => setEditEcolage(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Étudiant</label>
                <div className="text-sm font-bold text-slate-900">{editEcolage.etudiantNom}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Montant total dû (Ar)</label>
                <input type="number" value={ecolageForm.montantDu} onChange={e=>setEcolageForm({montantDu:e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>

              {!isAdmin && (
                <div>
                  <label className="text-xs font-semibold text-amber-600 block mb-1.5">Motif de la modification <span className="text-red-500">*</span></label>
                  <textarea placeholder="Pourquoi modifier cet écolage ?" value={approvalDesc}
                    onChange={e => setApprovalDesc(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-amber-200 bg-amber-50/30 rounded-xl focus:outline-none min-h-[60px]" />
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500">
                <div className="flex justify-between mb-1">
                  <span>Déjà payé :</span>
                  <span className="font-bold text-emerald-600">{formatMGA(editEcolage.montantPaye)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nouveau reste :</span>
                  <span className="font-bold text-slate-900">{formatMGA(Math.max(0, Number(ecolageForm.montantDu) - editEcolage.montantPaye))}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditEcolage(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Annuler</button>
              <button onClick={handleSaveEcolage} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{background:etabColor}}>
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE PAIEMENT CONFIRM ─── */}
      {deletePaiementObj && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto"><AlertTriangle size={26} className="text-red-600" /></div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Supprimer ce paiement ?</h2>
              <p className="text-sm text-slate-500">Le montant sera deduit du total paye.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center space-y-0.5">
              <div className="font-bold text-slate-900">{deletePaiementObj.etudiantNom}</div>
              <div className="text-lg font-bold text-red-700">{formatMGA(deletePaiementObj.montant)}</div>
              <div className="text-xs text-slate-400">{deletePaiementObj.date} · {deletePaiementObj.note||""}</div>
            </div>
            {!isAdmin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-amber-600 block">Motif de la suppression <span className="text-red-500">*</span></label>
                <textarea placeholder="Pourquoi supprimer ce paiement ?" value={approvalDesc}
                  onChange={e => setApprovalDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-amber-200 bg-amber-50/30 rounded-xl focus:outline-none min-h-[60px]" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeletePaiementObj(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Non, annuler</button>
              <button onClick={handleDeletePaiement} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />...</> : <><Trash2 size={15} />Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINT ALL AREA ─── */}
      <div id="print-all-students" className="only-print">
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
              {filtered.map(({ student: s, effectiveEcolage: ec }, i)=>{
                const name = getStudentName(s);
                const reste = ec.montantDu - ec.montantPaye;
                return (
                  <tr key={i} style={{background:i%2===0?"white":"#fbfcfd"}}>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",fontFamily:"monospace",color:"#64748b"}}>{s.matricule||"—"}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",fontWeight:"600",color:"#1e293b"}}>{name}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",color:"#475569",maxWidth:"150px"}}>{s.filiere||"—"}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",textAlign:"center"}}>{s.niveau||"—"}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",fontWeight:"500"}}>{formatMGA(ec.montantDu)}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",color:"#059669",fontWeight:"500"}}>{formatMGA(ec.montantPaye)}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px",color:reste>0?"#dc2626":"#059669",fontWeight:"bold"}}>{formatMGA(reste)}</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"8px"}}>
                      <span style={{
                        padding:"3px 8px",borderRadius:"6px",fontWeight:"bold",fontSize:"9px",textTransform:"uppercase",
                        background:ec.statut==="paye"?"#dcfce7":ec.statut==="en_attente"?"#fef3c7":"#fee2e2",
                        color:ec.statut==="paye"?"#15803d":ec.statut==="en_attente"?"#92400e":"#991b1b",
                        border:`1px solid ${ec.statut==="paye"?"#bbf7d0":ec.statut==="en_attente"?"#fde68a":"#fecaca"}`
                      }}>
                        {STATUT_LABELS[ec.statut||"impaye"]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{marginTop:"30px",display:"flex",justifyContent:"space-between",gap:"15px"}}>
            <div style={{flex:1,border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>ETUDIANTS</div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:"#1e293b"}}>{filtered.length}</div>
            </div>
            <div style={{flex:1,border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>TOTAL PAYE</div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:"#059669"}}>{formatMGA(filtered.reduce((sum, { effectiveEcolage: ec })=>sum+ec.montantPaye, 0))}</div>
            </div>
            <div style={{flex:1,border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>RESTE A PERCEVOIR</div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:"#dc2626"}}>{formatMGA(filtered.reduce((sum, { effectiveEcolage: ec })=>sum+Math.max(0, ec.montantDu - ec.montantPaye), 0))}</div>
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
