"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Edit3, Eye, EyeOff, CheckCircle2,
  XCircle, Building2, CreditCard, GraduationCap, TrendingUp,
  ChevronDown, Search, Shield, BarChart3, RefreshCw, Trash, X
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, Etablissement, User, Role, formatMGA } from "@/lib/data";
import { fetchStudents, fetchEcolages, fetchPaiements, DBStudent, DBEcolage, DBPaiement, getStudentId, getStudentName, API_BASE } from "@/lib/api";
import clsx from "clsx";

const ETAB_LIST = Object.entries(ETABLISSEMENTS) as [Etablissement, typeof ETABLISSEMENTS[Etablissement]][];
const ROLES: Role[] = ["comptable", "agent"];
type Tab = "apercu" | "utilisateurs" | "etudiants" | "paiements";

export default function AdminPage() {
  const { appState, createUser, updateUser, deleteUser } = useAuth();
  const [tab, setTab] = useState<Tab>("apercu");

  // Real data from API
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [timeScale, setTimeScale] = useState<"jour" | "mois" | "annee">("mois");

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [searchPaiement, setSearchPaiement] = useState("");
  const [filterEtab, setFilterEtab] = useState<"tous" | Etablissement>("tous");
  const [selectedStudent, setSelectedStudent] = useState<DBStudent | null>(null);

  const [form, setForm] = useState({
    username: "", password: "", nom: "", prenom: "",
    role: "comptable" as Role, etablissement: "analakely" as Etablissement, actif: true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e, p] = await Promise.all([fetchStudents(), fetchEcolages(), fetchPaiements()]);
    setStudents(s); setEcolages(e); setPaiements(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResetData = async () => {
    if (!confirm("ATTENTION : Voulez-vous vraiment supprimer TOUS les paiements et TOUS les écolages ? Cette action est irréversible et remettra tous les compteurs à 0.")) return;
    setResetting(true);
    try {
      const { deletePaiement, deleteEcolage } = await import("@/lib/api");
      // Clear paiements
      for (const p of paiements) {
        const id = p.id || p._id;
        if (id) await deletePaiement(id);
      }
      // Clear ecolages
      for (const e of ecolages) {
        const id = e.id || e._id;
        if (id) await deleteEcolage(id);
      }
      alert("Toutes les données financières ont été réinitialisées à 0.");
      await load();
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue lors de la réinitialisation.");
    }
    setResetting(false);
  };

  const handleCreateUser = () => {
    if (!form.username || !form.password || !form.nom || !form.prenom) {
      setFormError("Tous les champs sont obligatoires"); return;
    }
    if (appState.users.find(u => u.username === form.username)) {
      setFormError("Ce nom d'utilisateur existe deja"); return;
    }
    createUser({ ...form });
    setShowCreateUser(false);
    setForm({ username: "", password: "", nom: "", prenom: "", role: "comptable", etablissement: "analakely", actif: true });
    setFormError("");
  };

  const filteredUsers = appState.users.filter(u => {
    const q = searchUser.toLowerCase();
    const matchSearch = u.username.toLowerCase().includes(q) || u.nom.toLowerCase().includes(q) || u.prenom.toLowerCase().includes(q);
    const matchEtab = filterEtab === "tous" || u.etablissement === filterEtab;
    return matchSearch && matchEtab;
  });

  // Stats per etablissement from real data
  const stats = ETAB_LIST.map(([id, info]) => {
    const etabStudents = students.filter(s => (s.campus || "").toLowerCase().includes(id));
    const etabIds = new Set(etabStudents.map(s => getStudentId(s)));
    const etabEcolages = ecolages.filter(e => etabIds.has(e.etudiantId));
    const etabPaiements = paiements.filter(p => etabIds.has(p.etudiantId));
    const totalDu = etabEcolages.reduce((s, e) => s + e.montantDu, 0);
    const totalPaye = etabPaiements.reduce((s, p) => s + p.montant, 0);
    const users = appState.users.filter(u => u.etablissement === id && u.role !== "admin");

    // Recovery stats
    const countPaye = etabEcolages.filter(e => e.statut === "paye").length;
    const countImpaye = etabStudents.length - countPaye;

    return { id, info, students: etabStudents.length, users: users.length, totalPaye, totalDu, taux: totalDu > 0 ? Math.round((totalPaye/totalDu)*100) : 0, countPaye, countImpaye };
  });

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "apercu",       label: "Apercu global",     icon: BarChart3    },
    { id: "utilisateurs", label: "Utilisateurs",       icon: Users        },
    { id: "etudiants",    label: "Tous les etudiants", icon: GraduationCap},
    { id: "paiements",    label: "Tous les paiements", icon: CreditCard   },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administration GSI</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vision globale des établissements</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleResetData} disabled={resetting || loading}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-red-100 shadow-sm">
            <Trash size={14} className={resetting ? "animate-pulse" : ""} />
            <span>Réinitialiser tout à 0</span>
          </button>
          <button onClick={load} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl shadow-sm">
            <Shield size={14} className="text-amber-600" />
            <span className="text-amber-600 text-xs font-bold">ADMIN</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-200/50 border border-slate-200 rounded-2xl p-1 overflow-x-auto shadow-inner">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* ── APERCU ── */}
      {tab === "apercu" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Utilisateurs", value: appState.users.filter(u => u.role !== "admin").length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
              { label: "Etudiants", value: loading ? "..." : students.length, icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
              { label: "Encaissements", value: loading ? "..." : formatMGA(paiements.reduce((s,p)=>s+p.montant,0)), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Campus", value: 4, icon: Building2, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`bg-white border ${border} rounded-[1.5rem] p-6 shadow-sm`}>
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bg)}>
                  <Icon size={20} className={color} />
                </div>
                <div className={clsx("text-2xl font-black tracking-tight", color)}>{value}</div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="bg-white border border-slate-200 rounded-[1.5rem] p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-slate-900 font-bold text-lg">Évolution des encaissements globaux</h3>
                <p className="text-slate-400 text-sm">Suivi temporel de toutes les transactions</p>
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(["jour", "mois", "annee"] as const).map(scale => (
                  <button key={scale} onClick={() => setTimeScale(scale)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeScale === scale ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                    {scale}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const aggregatedMap: Record<string, number> = {};
              paiements.forEach(p => {
                let key = "";
                if (timeScale === "jour") key = p.date || "";
                else if (timeScale === "mois") key = (p.date || "").slice(0, 7);
                else if (timeScale === "annee") key = (p.date || "").slice(0, 4);
                if (key) aggregatedMap[key] = (aggregatedMap[key] || 0) + p.montant;
              });

              const chartData = Object.entries(aggregatedMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-10);

              const maxVal = Math.max(...chartData.map(c => c[1]), 1);

              if (chartData.length === 0) return (
                <div className="h-48 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                  <BarChart3 size={32} className="opacity-20 mb-2" />
                  <p className="text-sm font-medium italic">Aucune donnée disponible</p>
                </div>
              );

              return (
                <div className="space-y-6">
                  {chartData.map(([label, val]) => (
                    <div key={label} className="group">
                      <div className="flex justify-between text-[11px] font-black mb-2 px-1">
                        <span className="text-slate-400 uppercase tracking-tighter">{label}</span>
                        <span className="text-emerald-600">{formatMGA(val)}</span>
                      </div>
                      <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${(val / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.map(({ id, info, students: sc, users, totalPaye, totalDu, taux, countPaye, countImpaye }) => (
              <div key={id} className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-12 rounded-full shadow-inner" style={{background:info.color}} />
                    <div>
                      <div className="text-slate-900 font-black text-base">{info.label}</div>
                      <div className="text-slate-400 text-xs font-medium">{users} agent(s) · {sc} étudiant(s)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-600">{countPaye} Payés</div>
                    <div className="text-xs font-black text-red-500">{countImpaye} Impayés</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-400">Taux de recouvrement</span>
                    <span className="text-slate-900">{taux}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full rounded-full transition-all duration-1000"
                         style={{width:`${taux}%`,background:taux>=70?"#10b981":taux>=40?"#f59e0b":"#ef4444"}} />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="text-emerald-600 font-black text-sm">{formatMGA(totalPaye)}</div>
                    <div className="text-slate-300 font-bold text-[10px]">OBJECTIF: {formatMGA(totalDu)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── UTILISATEURS ── */}
      {tab === "utilisateurs" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-400">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-3 flex-1 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Rechercher par nom ou identifiant..." value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
              </div>
              <div className="relative">
                <select value={filterEtab} onChange={e => setFilterEtab(e.target.value as "tous"|Etablissement)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                  <option value="tous">Tous les campus</option>
                  {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <button onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-brand-600/20 w-full sm:w-auto justify-center">
              <Plus size={18} /> Créer un compte
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{["Identifiant","Agent","Rôle","Campus","Statut","Actions"].map(h => (
                    <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-4">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={clsx("hover:bg-slate-50 transition-colors", !u.actif && "opacity-60")}>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-brand-600">{u.username}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{u.prenom} {u.nom}</td>
                      <td className="px-6 py-4">
                        <span className={clsx("text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider",
                          u.role==="admin"?"bg-amber-100 text-amber-700":u.role==="comptable"?"bg-blue-100 text-blue-700":"bg-emerald-100 text-emerald-700")}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] px-2.5 py-1 rounded-lg text-white font-black uppercase tracking-wider shadow-sm" style={{background:ETABLISSEMENTS[u.etablissement].color}}>
                          {u.etablissement}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.actif
                          ? <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs"><CheckCircle2 size={14}/>Actif</span>
                          : <span className="flex items-center gap-1.5 text-red-400 font-bold text-xs"><XCircle size={14}/>Désactivé</span>}
                      </td>
                      <td className="px-6 py-4">
                        {u.role !== "admin" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateUser(u.id, {actif:!u.actif})}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                              {u.actif ? "Bloquer" : "Activer"}
                            </button>
                            <button onClick={() => { if(confirm("Supprimer définitivement ce compte ?")) deleteUser(u.id); }}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <div key={u.id} className={clsx("p-5 space-y-3", !u.actif && "opacity-60")}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-slate-900 font-black">{u.prenom} {u.nom}</div>
                      <div className="font-mono text-xs font-bold text-brand-600 mt-0.5">{u.username}</div>
                    </div>
                    <span className={clsx("text-[10px] font-black uppercase px-2 py-0.5 rounded-lg",
                      u.role==="admin"?"bg-amber-100 text-amber-700":u.role==="comptable"?"bg-blue-100 text-blue-700":"bg-emerald-100 text-emerald-700")}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2.5 py-1 rounded-lg text-white font-black uppercase tracking-wider" style={{background:ETABLISSEMENTS[u.etablissement].color}}>{u.etablissement}</span>
                    {u.actif ? <span className="text-emerald-600 text-[10px] font-black">ACTIF</span> : <span className="text-red-400 text-[10px] font-black">BLOQUÉ</span>}
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => updateUser(u.id,{actif:!u.actif})}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {u.actif ? "Désactiver" : "Activer"}
                      </button>
                      <button onClick={() => { if(confirm("Supprimer ?")) deleteUser(u.id); }}
                        className="px-4 py-2 rounded-xl bg-red-50 text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ETUDIANTS ── */}
      {tab === "etudiants" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-400">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Chercher un étudiant par nom ou matricule..." value={searchStudent}
                onChange={e => setSearchStudent(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
            </div>
            <div className="relative w-full sm:w-64">
              <select value={filterEtab} onChange={e => setFilterEtab(e.target.value as "tous"|Etablissement)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option value="tous">Tous les campus</option>
                {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-brand-600" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{["Étudiant","Filière","Campus","Écolage","Statut"].map(h => (
                      <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-4">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.filter(s => {
                      const q = searchStudent.toLowerCase();
                      const matchSearch = getStudentName(s).toLowerCase().includes(q) || (s.matricule||"").toLowerCase().includes(q);
                      const matchEtab = filterEtab === "tous" || (s.campus||"").toLowerCase().includes(filterEtab);
                      return matchSearch && matchEtab;
                    }).map(s => {
                      const ec = ecolages.find(e => e.etudiantId === getStudentId(s));
                      return (
                        <tr key={getStudentId(s)} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900">{getStudentName(s)}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">{s.matricule||"PAS DE MATRICULE"}</div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{s.filiere||"—"}</td>
                          <td className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">{s.campus||"—"}</td>
                          <td className="px-6 py-4">
                            {ec && ec.montantDu > 0 ? (
                              <div className="text-xs">
                                <div className="text-slate-900 font-black">{formatMGA(ec.montantDu)}</div>
                                <div className="text-emerald-600 font-bold mt-0.5">{formatMGA(ec.montantPaye)} encaissé</div>
                              </div>
                            ) : <span className="text-slate-300 text-[10px] font-bold italic uppercase">Non défini</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-between">
                              <span className={clsx("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                                ec?.statut==="paye"?"bg-emerald-100 text-emerald-700":ec?.statut==="en_attente"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700")}>
                                {ec?.statut==="paye"?"Payé":ec?.statut==="en_attente"?"En attente":"Impayé"}
                              </span>
                              <button onClick={() => setSelectedStudent(s)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-brand-600 transition-all">
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {tab === "paiements" && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-400">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Chercher un paiement par référence ou étudiant..." value={searchPaiement}
                onChange={e => setSearchPaiement(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
            </div>
            <div className="relative w-full sm:w-64">
              <select value={filterEtab} onChange={e => setFilterEtab(e.target.value as "tous"|Etablissement)}
                className="appearance-none w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option value="tous">Tous les campus</option>
                {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-brand-600" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chargement des transactions...</p>
              </div>
            ) : paiements.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center text-slate-300">
                <CreditCard size={48} className="opacity-20 mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{["Réf","Étudiant","Montant","Date","Campus","Agent"].map(h => (
                      <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-4">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paiements.filter(p => {
                      const q = searchPaiement.toLowerCase();
                      const matchSearch = p.etudiantNom.toLowerCase().includes(q) || (p.reference||"").toLowerCase().includes(q);
                      const matchEtab = filterEtab === "tous" || (p.campus||"").toLowerCase().includes(filterEtab);
                      return matchSearch && matchEtab;
                    }).map((p, i) => (
                      <tr key={p.id||p._id||i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-mono text-[10px] font-black text-brand-600">{p.reference||"—"}</td>
                        <td className="px-6 py-4 font-black text-slate-900">{p.etudiantNom}</td>
                        <td className="px-6 py-4 font-black text-emerald-600">{formatMGA(p.montant)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{p.date}</td>
                        <td className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">{p.campus}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">{p.agentNom}</span>
                            <button onClick={() => {
                              const st = students.find(s => getStudentId(s) === p.etudiantId);
                              if(st) setSelectedStudent(st);
                            }}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-brand-600 transition-all">
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENT DETAIL MODAL (ADMIN) ── */}
      {selectedStudent && (() => {
        const ec = ecolages.find(e => e.etudiantId === getStudentId(selectedStudent));
        const pays = paiements.filter(p => p.etudiantId === getStudentId(selectedStudent)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {getStudentName(selectedStudent).charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{getStudentName(selectedStudent)}</h2>
                    <p className="text-xs font-bold text-slate-400 font-mono">{selectedStudent.matricule}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-slate-400 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Ecolage Total</div>
                    <div className="text-lg font-black text-slate-900">{formatMGA(ec?.montantDu||0)}</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total Encaissé</div>
                    <div className="text-lg font-black text-emerald-700">{formatMGA(ec?.montantPaye||0)}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <div className="text-[10px] font-black text-red-600 uppercase mb-1">Reste à payer</div>
                    <div className="text-lg font-black text-red-700">{formatMGA((ec?.montantDu||0)-(ec?.montantPaye||0))}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Historique des transactions</h3>
                  {pays.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 italic text-sm">Aucun paiement trouvé</div>
                  ) : (
                    <div className="space-y-2">
                      {pays.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                          <div>
                            <div className="text-sm font-black text-slate-900">{formatMGA(p.montant)}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.date} · {p.note || "Aucune note"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{p.reference}</div>
                            <div className="text-[10px] font-bold text-slate-300">PAR: {p.agentNom}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setSelectedStudent(null)} className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CREATE USER MODAL ── */}
      {showCreateUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-slate-900 font-black text-xl">Créer un compte</h2>
                <p className="text-slate-400 text-sm">Nouvel accès collaborateur</p>
              </div>
              <button onClick={() => setShowCreateUser(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Prénom", key: "prenom", placeholder: "Ex: Jean" },
                  { label: "Nom", key: "nom", placeholder: "Ex: Rakoto" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">{label}</label>
                    <input type="text" placeholder={placeholder}
                      value={String((form as Record<string, unknown>)[key] ?? "")}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Identifiant unique</label>
                <input type="text" placeholder="Ex: agent.analakely"
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Mot de passe provisoire</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  <button type="button" onClick={() => setShowPwd(s=>!s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Rôle</label>
                  <div className="relative">
                    <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as Role}))}
                      className="appearance-none w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                      {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Campus</label>
                  <div className="relative">
                    <select value={form.etablissement} onChange={e => setForm(f => ({...f, etablissement: e.target.value as Etablissement}))}
                      className="appearance-none w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                      {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              {formError && <p className="bg-red-50 text-red-600 text-[10px] font-black p-3 rounded-lg border border-red-100 uppercase tracking-widest">{formError}</p>}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setShowCreateUser(false); setFormError(""); }}
                className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Annuler</button>
              <button onClick={handleCreateUser}
                className="flex-1 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-600/20 transition-all">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
