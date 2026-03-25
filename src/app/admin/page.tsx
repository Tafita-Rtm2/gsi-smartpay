"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Edit3, Eye, EyeOff, CheckCircle2,
  XCircle, Building2, CreditCard, GraduationCap, TrendingUp,
  ChevronDown, Search, Shield, BarChart3, RefreshCw, Trash
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
      // Clear paiements
      for (const p of paiements) {
        const id = p.id || p._id;
        if (id) await fetch(`${API_BASE}/db/paiements/${id}`, { method: "DELETE" });
      }
      // Clear ecolages
      for (const e of ecolages) {
        const id = e.id || e._id;
        if (id) await fetch(`${API_BASE}/db/ecolage/${id}`, { method: "DELETE" });
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
    return { id, info, students: etabStudents.length, users: users.length, totalPaye, totalDu, taux: totalDu > 0 ? Math.round((totalPaye/totalDu)*100) : 0 };
  });

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "apercu",       label: "Apercu global",     icon: BarChart3    },
    { id: "utilisateurs", label: "Utilisateurs",       icon: Users        },
    { id: "etudiants",    label: "Tous les etudiants", icon: GraduationCap},
    { id: "paiements",    label: "Tous les paiements", icon: CreditCard   },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Administration GSI</h1>
          <p className="text-white/40 text-sm mt-0.5">Vision globale — donnees reelles</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleResetData} disabled={resetting || loading}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs font-medium transition-colors border border-red-500/20">
            <Trash size={13} className={resetting ? "animate-pulse" : ""} />
            <span className="hidden sm:inline">Réinitialiser tout à 0</span>
          </button>
          <button onClick={load} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors border border-white/10">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
            <Shield size={14} className="text-amber-400" />
            <span className="text-amber-400 text-xs font-bold">ADMIN</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
              tab === id ? "bg-amber-500 text-slate-900" : "text-white/50 hover:text-white/80")}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── APERCU ── */}
      {tab === "apercu" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Utilisateurs", value: appState.users.filter(u => u.role !== "admin").length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Etudiants", value: loading ? "..." : students.length, icon: GraduationCap, color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Paiements", value: loading ? "..." : formatMGA(paiements.reduce((s,p)=>s+p.montant,0)), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Etablissements", value: 4, icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", bg)}>
                  <Icon size={18} className={color} />
                </div>
                <div className={clsx("text-xl font-bold", color)}>{value}</div>
                <div className="text-white/40 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold">Evolution des encaissements globaux</h3>
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {(["jour", "mois", "annee"] as const).map(scale => (
                  <button key={scale} onClick={() => setTimeScale(scale)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${timeScale === scale ? "bg-amber-500 text-slate-900" : "text-white/40 hover:text-white/80"}`}>
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

              if (chartData.length === 0) return <div className="h-40 flex items-center justify-center text-white/20 text-sm italic">Aucune donnee</div>;

              return (
                <div className="space-y-4">
                  {chartData.map(([label, val]) => (
                    <div key={label} className="group">
                      <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
                        <span className="text-white/40">{label}</span>
                        <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">{formatMGA(val)}</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${(val / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map(({ id, info, students: sc, users, totalPaye, totalDu, taux }) => (
              <div key={id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-10 rounded-full" style={{background:info.color}} />
                  <div>
                    <div className="text-white font-bold text-sm">{info.label}</div>
                    <div className="text-white/40 text-xs">{users} agent(s) · {sc} etudiant(s)</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Recouvrement</span>
                    <span className="font-bold text-white">{taux}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${taux}%`,background:taux>=70?"#22c55e":taux>=40?"#f59e0b":"#ef4444"}} />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-emerald-400">{formatMGA(totalPaye)}</span>
                    <span className="text-white/30">/ {formatMGA(totalDu)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── UTILISATEURS ── */}
      {tab === "utilisateurs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" placeholder="Rechercher..." value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div className="relative">
                <select value={filterEtab} onChange={e => setFilterEtab(e.target.value as "tous"|Etablissement)}
                  className="appearance-none pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="tous">Tous</option>
                  {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>
            <button onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded-xl text-sm font-bold transition-colors self-start">
              <Plus size={15} /> Creer un compte
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>{["Identifiant","Nom complet","Role","Etablissement","Cree le","Statut","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-white/40 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={clsx("hover:bg-white/5 transition-colors", !u.actif && "opacity-50")}>
                      <td className="px-4 py-3 font-mono text-xs text-amber-400">{u.username}</td>
                      <td className="px-4 py-3 font-semibold text-white">{u.prenom} {u.nom}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                          u.role==="admin"?"bg-amber-500/20 text-amber-400":u.role==="comptable"?"bg-blue-500/20 text-blue-400":"bg-emerald-500/20 text-emerald-400")}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{background:ETABLISSEMENTS[u.etablissement].color+"44"}}>
                          {u.etablissement}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{u.createdAt}</td>
                      <td className="px-4 py-3">
                        {u.actif
                          ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={12}/>Actif</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12}/>Desactive</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== "admin" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateUser(u.id, {actif:!u.actif})}
                              className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white transition-all">
                              {u.actif ? "Desactiver" : "Activer"}
                            </button>
                            <button onClick={() => { if(confirm("Supprimer ce compte ?")) deleteUser(u.id); }}
                              className="text-xs px-2 py-1 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-white/5">
              {filteredUsers.map(u => (
                <div key={u.id} className={clsx("p-4 space-y-2", !u.actif && "opacity-50")}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold">{u.prenom} {u.nom}</div>
                      <div className="font-mono text-xs text-amber-400">{u.username}</div>
                    </div>
                    <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                      u.role==="admin"?"bg-amber-500/20 text-amber-400":u.role==="comptable"?"bg-blue-500/20 text-blue-400":"bg-emerald-500/20 text-emerald-400")}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full text-white font-semibold" style={{background:ETABLISSEMENTS[u.etablissement].color+"44"}}>{u.etablissement}</span>
                    {u.actif ? <span className="text-emerald-400">Actif</span> : <span className="text-red-400">Desactive</span>}
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex gap-2">
                      <button onClick={() => updateUser(u.id,{actif:!u.actif})}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white">
                        {u.actif ? "Desactiver" : "Activer"}
                      </button>
                      <button onClick={() => { if(confirm("Supprimer ?")) deleteUser(u.id); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-400/20 text-red-400">
                        Supprimer
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
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Rechercher un etudiant..." value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center text-white/40">Chargement...</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>{["Nom","Matricule","Filiere","Campus","Ecolage","Statut"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-white/40 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {students.filter(s => {
                      const q = searchStudent.toLowerCase();
                      return getStudentName(s).toLowerCase().includes(q) || (s.matricule||"").toLowerCase().includes(q);
                    }).map(s => {
                      const ec = ecolages.find(e => e.etudiantId === getStudentId(s));
                      return (
                        <tr key={getStudentId(s)} className="hover:bg-white/5">
                          <td className="px-4 py-3 font-semibold text-white">{getStudentName(s)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-white/50">{s.matricule||"—"}</td>
                          <td className="px-4 py-3 text-xs text-white/60 max-w-[160px] truncate">{s.filiere||"—"}</td>
                          <td className="px-4 py-3 text-xs text-white/50">{s.campus||"—"}</td>
                          <td className="px-4 py-3">
                            {ec && ec.montantDu > 0 ? (
                              <div className="text-xs">
                                <div className="text-white/70">{formatMGA(ec.montantDu)}</div>
                                <div className="text-emerald-400">{formatMGA(ec.montantPaye)}</div>
                              </div>
                            ) : <span className="text-white/20 text-xs italic">Non defini</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                              ec?.statut==="paye"?"bg-emerald-500/20 text-emerald-400":ec?.statut==="en_attente"?"bg-amber-500/20 text-amber-400":"bg-red-500/20 text-red-400")}>
                              {ec?.statut==="paye"?"Paye":ec?.statut==="en_attente"?"En attente":"Impaye"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-white/5">
                {students.filter(s => {
                      const q = searchStudent.toLowerCase();
                      return getStudentName(s).toLowerCase().includes(q) || (s.matricule||"").toLowerCase().includes(q);
                    }).map(s => {
                  const ec = ecolages.find(e => e.etudiantId === getStudentId(s));
                  return (
                    <div key={getStudentId(s)} className="p-4 space-y-1">
                      <div className="text-white font-semibold text-sm">{getStudentName(s)}</div>
                      <div className="text-white/40 text-xs">{s.filiere} · {s.campus}</div>
                      {ec && ec.montantDu > 0 && (
                        <div className="text-xs text-emerald-400">{formatMGA(ec.montantPaye)} / {formatMGA(ec.montantDu)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {tab === "paiements" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Rechercher un paiement..." value={searchPaiement}
              onChange={e => setSearchPaiement(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center text-white/40">Chargement...</div>
          ) : paiements.length === 0 ? (
            <div className="py-10 text-center text-white/40 text-sm">Aucun paiement</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>{["Reference","Etudiant","Montant","Mode","Date","Note","Agent"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-white/40 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paiements.filter(p => {
                      const q = searchPaiement.toLowerCase();
                      return p.etudiantNom.toLowerCase().includes(q) || (p.reference||"").toLowerCase().includes(q);
                    }).map((p, i) => (
                      <tr key={p.id||p._id||i} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-xs text-amber-400">{p.reference||"—"}</td>
                        <td className="px-4 py-3 text-white font-semibold">{p.etudiantNom}</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">{formatMGA(p.montant)}</td>
                        <td className="px-4 py-3"><span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{p.mode}</span></td>
                        <td className="px-4 py-3 text-white/40 text-xs">{p.date}</td>
                        <td className="px-4 py-3 text-white/40 text-xs">{p.note||"—"}</td>
                        <td className="px-4 py-3 text-white/60 text-xs">{p.agentNom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-white/5">
                {paiements.filter(p => {
                      const q = searchPaiement.toLowerCase();
                      return p.etudiantNom.toLowerCase().includes(q) || (p.reference||"").toLowerCase().includes(q);
                    }).map((p, i) => (
                  <div key={p.id||p._id||i} className="p-4 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white font-semibold text-sm">{p.etudiantNom}</span>
                      <span className="text-emerald-400 font-bold">{formatMGA(p.montant)}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-white/40">
                      <span>{p.date}</span><span>{p.note||""}</span><span>{p.agentNom}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      )}

      {/* ── CREATE USER MODAL ── */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Creer un compte</h2>
              <button onClick={() => setShowCreateUser(false)} className="text-white/40 hover:text-white text-xl leading-none">x</button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Prenom", key: "prenom", placeholder: "Ex: Jean" },
                { label: "Nom", key: "nom", placeholder: "Ex: Rakoto" },
                { label: "Identifiant (username)", key: "username", placeholder: "Ex: agent.analakely" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-white/50 block mb-1">{label}</label>
                  <input type="text" placeholder={placeholder}
                    value={String((form as Record<string, unknown>)[key] ?? "")}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-white/50 block mb-1">Mot de passe</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} placeholder="Mot de passe"
                    value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                    className="w-full pl-3 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                  <button type="button" onClick={() => setShowPwd(s=>!s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/50 block mb-1">Role</label>
                  <div className="relative">
                    <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as Role}))}
                      className="appearance-none w-full px-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/50 block mb-1">Etablissement</label>
                  <div className="relative">
                    <select value={form.etablissement} onChange={e => setForm(f => ({...f, etablissement: e.target.value as Etablissement}))}
                      className="appearance-none w-full px-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                      {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>
              </div>
              {formError && <p className="text-red-400 text-xs">{formError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowCreateUser(false); setFormError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5">Annuler</button>
              <button onClick={handleCreateUser}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold">Creer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
