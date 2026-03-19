"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ExternalLink, Info, X, Phone, Mail, GraduationCap, CreditCard, Calendar, MapPin, Edit3, Trash2, Check, AlertTriangle, Users, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS } from "@/lib/data";
import { fetchStudents, fetchEcolages, createEcolage, updateEcolage, DBStudent, DBEcolage, getStudentId, getStudentName, getStudentCampus, formatMGA } from "@/lib/api";
import clsx from "clsx";

const STATUT_COLORS = {
  paye: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  impaye: "bg-red-100 text-red-700 border border-red-200",
  en_attente: "bg-amber-100 text-amber-700 border border-amber-200",
};
const STATUT_LABELS = { paye: "Paye", impaye: "Impaye", en_attente: "En attente" };
const STATUT_DOT = { paye: "bg-emerald-500", impaye: "bg-red-500", en_attente: "bg-amber-500" };

type FilterTab = "tous" | "paye" | "impaye" | "en_attente";

export default function EtudiantsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [ecolages, setEcolages] = useState<DBEcolage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("Toutes");
  const [statutTab, setStatutTab] = useState<FilterTab>("tous");

  // Modals
  const [profileStudent, setProfileStudent] = useState<DBStudent | null>(null);
  const [ecolageStudent, setEcolageStudent] = useState<DBStudent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DBEcolage | null>(null);
  const [editEcolage, setEditEcolage] = useState<DBEcolage | null>(null);

  const [ecolageForm, setEcolageForm] = useState({ montantDu: "", annee: "2025/2026", statut: "impaye" as "impaye" | "paye" | "en_attente" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin = currentUser?.role === "admin";
  const etabColor = etabInfo?.color || "#2563eb";

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e] = await Promise.all([fetchStudents(), fetchEcolages()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myS = s.filter(st => getStudentCampus(st).includes(myEtab) || getStudentCampus(st).includes(myEtab.slice(0,4)));
      const myIds = new Set(myS.map(st => getStudentId(st)));
      setStudents(myS);
      setEcolages(e.filter(ec => myIds.has(ec.etudiantId)));
    } else { setStudents(s); setEcolages(e); }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filieres = etabInfo ? etabInfo.filieres : [];
  const getEcolage = (s: DBStudent) => ecolages.find(e => e.etudiantId === getStudentId(s));

  // Fixed filter logic - reset properly
  const filtered = students.filter(s => {
    const q = search.toLowerCase().trim();
    const name = getStudentName(s).toLowerCase();
    const matchSearch = !q || name.includes(q) || (s.matricule||"").toLowerCase().includes(q) || (s.email||"").toLowerCase().includes(q);
    const matchFiliere = filiereFilter === "Toutes" || (s.filiere || "") === filiereFilter;
    const ec = getEcolage(s);
    const statut = ec?.statut || "impaye";
    const matchStatut = statutTab === "tous" || statut === statutTab;
    return matchSearch && matchFiliere && matchStatut;
  });

  // Stats
  const totalDu = ecolages.reduce((s,e) => s+e.montantDu, 0);
  const totalPaye = ecolages.reduce((s,e) => s+e.montantPaye, 0);
  const countPaye = students.filter(s => getEcolage(s)?.statut === "paye").length;
  const countImpaye = students.filter(s => !getEcolage(s) || getEcolage(s)?.statut === "impaye").length;
  const countPending = students.filter(s => getEcolage(s)?.statut === "en_attente").length;

  const handleCreateEcolage = async () => {
    if (!ecolageStudent || !ecolageForm.montantDu) return;
    setSaving(true);
    await createEcolage({
      etudiantId: getStudentId(ecolageStudent),
      etudiantNom: getStudentName(ecolageStudent),
      matricule: ecolageStudent.matricule,
      campus: ecolageStudent.campus || currentUser?.etablissement || "",
      filiere: ecolageStudent.filiere || "",
      classe: ecolageStudent.niveau || "L1",
      montantDu: Number(ecolageForm.montantDu),
      montantPaye: 0,
      statut: ecolageForm.statut,
      annee: ecolageForm.annee,
    });
    await load(); setSaving(false); setEcolageStudent(null);
  };

  const handleEditEcolage = async () => {
    if (!editEcolage) return;
    setSaving(true);
    const id = editEcolage.id || editEcolage._id || "";
    await updateEcolage(id, { montantDu: Number(ecolageForm.montantDu), statut: ecolageForm.statut, annee: ecolageForm.annee });
    await load(); setSaving(false); setEditEcolage(null);
  };

  const handleDeleteEcolage = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    // We patch montantDu to 0 and mark deleted — since the API doesn't have DELETE for docs easily
    const id = deleteConfirm.id || deleteConfirm._id || "";
    await updateEcolage(id, { montantDu: 0, montantPaye: 0, statut: "impaye" as const });
    await load(); setDeleting(false); setDeleteConfirm(null);
  };

  const openEdit = (ec: DBEcolage) => {
    setEcolageForm({ montantDu: String(ec.montantDu), annee: ec.annee || "2025/2026", statut: ec.statut });
    setEditEcolage(ec);
  };

  const STAT_TABS: { id: FilterTab; label: string; count: number; color: string; icon: React.ElementType }[] = [
    { id: "tous", label: "Tous", count: students.length, color: "text-slate-700", icon: Users },
    { id: "paye", label: "Payes", count: countPaye, color: "text-emerald-600", icon: CheckCircle2 },
    { id: "impaye", label: "Impayes", count: countImpaye, color: "text-red-600", icon: AlertTriangle },
    { id: "en_attente", label: "En attente", count: countPending, color: "text-amber-600", icon: Clock },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Etudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Chargement..." : `${students.length} etudiants`}
            {etabInfo && <span className="ml-2 font-medium" style={{color: etabColor}}>— {etabInfo.label}</span>}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <a href="https://groupegsi.mg/web/admincreat/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
            style={{background: etabColor}}>
            <ExternalLink size={15} /> Ajouter etudiant
          </a>
        </div>
      </div>

      {/* Stats + filter tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_TABS.map(({ id, label, count, color, icon: Icon }) => (
          <button key={id} onClick={() => setStatutTab(id)}
            className={clsx("card text-left transition-all border-2", statutTab === id ? "shadow-md" : "border-transparent hover:border-slate-200")}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={15} className={color} />
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            {id === "tous" && <div className="text-xs text-slate-400 mt-0.5">{formatMGA(totalPaye)} / {formatMGA(totalDu)}</div>}
          </button>
        ))}
      </div>

      {/* Search + filiere filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher par nom, matricule, email..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          {!isAdmin && filieres.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {["Toutes", ...filieres].map(f => (
                <button key={f} onClick={() => setFiliereFilter(f)}
                  className={clsx("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
                    filiereFilter === f ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}
                  style={filiereFilter === f ? { background: etabColor } : {}}>
                  {f === "Toutes" ? "Toutes les filieres" : f.length > 20 ? f.slice(0,20)+"..." : f}
                </button>
              ))}
            </div>
          )}
        </div>
        {(search || filiereFilter !== "Toutes" || statutTab !== "tous") && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">{filtered.length} resultat(s)</span>
            <button onClick={() => { setSearch(""); setFiliereFilter("Toutes"); setStatutTab("tous"); }}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              <X size={11} /> Reinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{borderColor: etabColor, borderTopColor:"transparent"}} />
            <p className="text-slate-400 text-sm">Chargement depuis la base de donnees...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Aucun etudiant trouve</p>
            <button onClick={() => { setSearch(""); setFiliereFilter("Toutes"); setStatutTab("tous"); }}
              className="text-xs text-brand-600 hover:underline mt-2">Reinitialiser les filtres</button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Etudiant", "Filiere / Campus", "Niveau", "Ecolage", "Statut", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(s => {
                    const ec = getEcolage(s);
                    const statut = ec?.statut || "impaye";
                    const name = getStudentName(s);
                    const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                    const photo = s.photo;
                    return (
                      <tr key={getStudentId(s)} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm"
                              style={{background: etabColor}}>
                              {photo ? (
                                <img src={photo} alt={name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{name}</div>
                              <div className="text-xs text-slate-400 font-mono">{s.matricule || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px]">
                          <div className="truncate">{s.filiere || "—"}</div>
                          <div className="text-slate-400 truncate">{s.campus || "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {s.niveau && <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{s.niveau}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {ec ? (
                            <div className="text-xs space-y-0.5">
                              <div className="font-semibold text-slate-700">{formatMGA(ec.montantDu)}</div>
                              <div className="text-emerald-600">Paye: {formatMGA(ec.montantPaye)}</div>
                              {ec.montantDu > ec.montantPaye && <div className="text-red-500">Reste: {formatMGA(ec.montantDu-ec.montantPaye)}</div>}
                              {ec.annee && <div className="text-slate-300 text-xs">{ec.annee}</div>}
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
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setProfileStudent(s)} title="Voir profil"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200">
                              <Info size={14} />
                            </button>
                            <button onClick={() => { setEcolageStudent(s); if(ec) openEdit(ec); else setEcolageForm({montantDu:"",annee:"2025/2026",statut:"impaye"}); }} title="Ecolage"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-200">
                              <CreditCard size={14} />
                            </button>
                            {ec && (
                              <>
                                <button onClick={() => { openEdit(ec); setEcolageStudent(s); }} title="Modifier ecolage"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-200">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => setDeleteConfirm(ec)} title="Supprimer ecolage"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">
                                  <Trash2 size={14} />
                                </button>
                              </>
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
                const name = getStudentName(s);
                const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                return (
                  <div key={getStudentId(s)} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm"
                          style={{background: etabColor}}>
                          {s.photo ? (
                            <img src={s.photo} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{name}</div>
                          <div className="text-xs text-slate-400 font-mono">{s.matricule || "—"}</div>
                        </div>
                      </div>
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0", STATUT_COLORS[statut])}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                        {STATUT_LABELS[statut]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mb-1">{s.filiere}</div>
                    {ec && (
                      <div className="flex gap-3 text-xs mb-2">
                        <span className="text-slate-500">Du: <span className="font-bold text-slate-700">{formatMGA(ec.montantDu)}</span></span>
                        <span className="text-emerald-600 font-bold">{formatMGA(ec.montantPaye)} paye</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setProfileStudent(s)} className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"><Info size={12} /> Profil</button>
                      <button onClick={() => { setEcolageStudent(s); if(ec) openEdit(ec); else setEcolageForm({montantDu:"",annee:"2025/2026",statut:"impaye"}); }} className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50"><CreditCard size={12} /> Ecolage</button>
                      {ec && <button onClick={() => setDeleteConfirm(ec)} className="flex items-center gap-1 text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50"><Trash2 size={12} /> Supprimer</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-slate-400 text-right">{filtered.length} resultat(s) — Source: groupegsi.mg</p>

      {/* ─── PROFILE MODAL ─── */}
      {profileStudent && (() => {
        const ec = getEcolage(profileStudent);
        const statut = ec?.statut || "impaye";
        const name = getStudentName(profileStudent);
        const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="relative h-28 flex items-end px-6" style={{background:`linear-gradient(135deg,${etabColor}dd,${etabColor}88)`}}>
                <button onClick={() => setProfileStudent(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
                  <X size={14} />
                </button>
                <div className="w-18 h-18 rounded-2xl overflow-hidden border-4 border-white shadow-lg translate-y-9 w-16 h-16"
                  style={{background: etabColor}}>
                  {profileStudent.photo ? (
                    <img src={profileStudent.photo} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">{initials}</div>
                  )}
                </div>
              </div>
              <div className="pt-10 px-6 pb-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{name}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{profileStudent.matricule || "Matricule non defini"}</p>
                  </div>
                  <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 mt-1", STATUT_COLORS[statut])}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                    {STATUT_LABELS[statut]}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { icon: Mail, label: "Email", value: profileStudent.email || "—" },
                    { icon: Phone, label: "Contact", value: profileStudent.contact || profileStudent.telephone || "—" },
                    { icon: MapPin, label: "Campus", value: profileStudent.campus || "—" },
                    { icon: GraduationCap, label: "Filiere", value: profileStudent.filiere || "—" },
                    { icon: Calendar, label: "Niveau", value: profileStudent.niveau || "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={13} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400 font-medium">{label}</div>
                        <div className="text-sm text-slate-800 font-medium truncate">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ecolage</span>
                    {ec && (
                      <div className="flex gap-1">
                        <button onClick={() => { openEdit(ec); setProfileStudent(null); setEcolageStudent(profileStudent); }} className="text-xs text-amber-600 hover:underline flex items-center gap-1"><Edit3 size={11} /> Modifier</button>
                        <span className="text-slate-300">·</span>
                        <button onClick={() => { setDeleteConfirm(ec); setProfileStudent(null); }} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 size={11} /> Supprimer</button>
                      </div>
                    )}
                  </div>
                  {ec ? (
                    <div className="px-4 py-3 grid grid-cols-3 gap-3">
                      {[
                        { label: "Montant du", value: formatMGA(ec.montantDu), color: "text-slate-700" },
                        { label: "Paye", value: formatMGA(ec.montantPaye), color: "text-emerald-600" },
                        { label: "Reste", value: formatMGA(ec.montantDu-ec.montantPaye), color: ec.montantDu>ec.montantPaye?"text-red-600":"text-emerald-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <div className={`text-sm font-bold ${color}`}>{value}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="px-4 py-3 text-center text-slate-400 text-xs">Aucun ecolage defini</div>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setProfileStudent(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Fermer</button>
                  <button onClick={() => { setEcolageStudent(profileStudent); setProfileStudent(null); if(!ec) setEcolageForm({montantDu:"",annee:"2025/2026",statut:"impaye"}); }}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{background:etabColor}}>
                    {ec ? "Voir ecolage" : "Definir ecolage"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── ECOLAGE MODAL (Create or Edit) ─── */}
      {ecolageStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editEcolage ? "Modifier ecolage" : "Definir ecolage"}</h2>
              <button onClick={() => { setEcolageStudent(null); setEditEcolage(null); }} className="text-slate-400 text-xl leading-none">x</button>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="font-bold text-slate-900">{getStudentName(ecolageStudent)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{ecolageStudent.email} · {ecolageStudent.matricule}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{ecolageStudent.filiere}</div>
            </div>
            {editEcolage && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-amber-700">
                <Edit3 size={13} /> Modification de l&apos;ecolage existant
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Montant total du (Ar)</label>
                <input type="number" placeholder="Ex: 1200000" value={ecolageForm.montantDu}
                  onChange={e => setEcolageForm(f=>({...f,montantDu:e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Annee scolaire</label>
                  <select value={ecolageForm.annee} onChange={e=>setEcolageForm(f=>({...f,annee:e.target.value}))}
                    className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    <option>2024/2025</option>
                    <option>2025/2026</option>
                    <option>2026/2027</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Statut</label>
                  <select value={ecolageForm.statut} onChange={e=>setEcolageForm(f=>({...f,statut:e.target.value as "impaye"|"paye"|"en_attente"}))}
                    className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                    <option value="impaye">Impaye</option>
                    <option value="en_attente">En attente</option>
                    <option value="paye">Paye</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEcolageStudent(null); setEditEcolage(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={editEcolage ? handleEditEcolage : handleCreateEcolage} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60" style={{background:etabColor}}>
                {saving ? "Enregistrement..." : editEcolage ? "Modifier" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-2">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Supprimer cet ecolage ?</h2>
              <p className="text-sm text-slate-500">Cette action reinitialise le montant et le statut de l&apos;etudiant. Les paiements associes ne sont pas supprimes.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
              <div className="font-bold text-slate-900">{deleteConfirm.etudiantNom}</div>
              <div className="text-sm text-red-700 mt-0.5">{formatMGA(deleteConfirm.montantDu)} — {deleteConfirm.annee}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDeleteEcolage} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Suppression...</>
                ) : (
                  <><Trash2 size={15} />Oui, supprimer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
