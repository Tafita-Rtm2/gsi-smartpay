"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Edit3, Eye, EyeOff, CheckCircle2,
  XCircle, Building2, CreditCard, GraduationCap, TrendingUp,
  ChevronDown, Search, Shield, BarChart3, RefreshCw, Trash, X
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, Etablissement, Role, formatMGA } from "@/lib/data";
import {
  fetchStudents, fetchEcolages, fetchPaiements,
  DBStudent, DBEcolage, DBPaiement,
  getStudentId, getStudentName
} from "@/lib/api";
import clsx from "clsx";

const ETAB_LIST = Object.entries(ETABLISSEMENTS) as [Etablissement, typeof ETABLISSEMENTS[Etablissement]][];
const ROLES: Role[] = ["comptable", "agent"];
type Tab = "apercu" | "utilisateurs" | "etudiants" | "paiements";

export default function AdminPage() {
  const { appState, createUser, updateUser, deleteUser, refreshState } = useAuth();
  const [tab, setTab] = useState<Tab>("apercu");

  // Données dynamiques
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
    try {
      const [s, e, p] = await Promise.all([fetchStudents(), fetchEcolages(), fetchPaiements()]);
      setStudents(s); setEcolages(e); setPaiements(p);
      await refreshState(); // Charger aussi les comptes staff
    } catch (err) {
      console.error("Erreur de chargement admin:", err);
    }
    setLoading(false);
  }, [refreshState]);

  useEffect(() => { load(); }, [load]);

  const handleResetData = async () => {
    if (!confirm("ATTENTION : Reinitialiser tout à 0 ?")) return;
    setResetting(true);
    try {
      const { deletePaiement, deleteEcolage } = await import("@/lib/api");
      for (const p of paiements) {
        const id = p.id || p._id;
        if (id) await deletePaiement(id);
      }
      for (const e of ecolages) {
        const id = e.id || e._id;
        if (id) await deleteEcolage(id);
      }
      alert("Données réinitialisées.");
      await load();
    } catch (e) {
      alert("Erreur lors de la réinitialisation.");
    }
    setResetting(false);
  };

  const handleCreateUser = async () => {
    if (!form.username || !form.password || !form.nom || !form.prenom) {
      setFormError("Tous les champs sont obligatoires"); return;
    }
    if (appState.users.find(u => u.username === form.username)) {
      setFormError("Cet identifiant existe deja"); return;
    }
    setLoading(true);
    await createUser({ ...form });
    setShowCreateUser(false);
    setForm({ username: "", password: "", nom: "", prenom: "", role: "comptable", etablissement: "analakely", actif: true });
    setFormError("");
    setLoading(false);
  };

  const filteredUsers = appState.users.filter(u => {
    const q = searchUser.toLowerCase();
    const matchSearch = (u.username || "").toLowerCase().includes(q) ||
                        (u.nom || "").toLowerCase().includes(q) ||
                        (u.prenom || "").toLowerCase().includes(q);
    const uEtab = u.etablissement || u.campus || "";
    const matchEtab = filterEtab === "tous" || uEtab.toLowerCase().includes(filterEtab.toLowerCase());
    return matchSearch && matchEtab;
  });

  const stats = ETAB_LIST.map(([id, info]) => {
    const etabStudents = students.filter(s => (s.campus || "").toLowerCase().includes(id));
    const etabIds = new Set(etabStudents.map(s => getStudentId(s)));
    const etabEcolages = ecolages.filter(e => etabIds.has(e.etudiantId));
    const etabPaiements = paiements.filter(p => etabIds.has(p.etudiantId));
    const totalDu = etabEcolages.reduce((s, e) => s + e.montantDu, 0);
    const totalPaye = etabPaiements.reduce((s, p) => s + p.montant, 0);
    const users = appState.users.filter(u => {
      const ue = (u.etablissement || u.campus || "").toLowerCase();
      return ue.includes(id) && u.role !== "admin";
    });
    const countPaye = etabEcolages.filter(e => e.statut === "paye").length;
    const countImpaye = etabStudents.length - countPaye;
    return { id, info, students: etabStudents.length, users: users.length, totalPaye, totalDu, taux: totalDu > 0 ? Math.round((totalPaye/totalDu)*100) : 0, countPaye, countImpaye };
  });

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "apercu",       label: "Aperçu",           icon: BarChart3    },
    { id: "utilisateurs", label: "Collaborateurs",    icon: Users        },
    { id: "etudiants",    label: "Étudiants",        icon: GraduationCap},
    { id: "paiements",    label: "Paiements",        icon: CreditCard   },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administration GSI</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestion centrale des établissements</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleResetData} disabled={resetting || loading}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-red-100">
            <Trash size={14} /> <span>Vider les finances</span>
          </button>
          <button onClick={load} disabled={loading} className="bg-white hover:bg-slate-50 text-slate-600 p-2.5 rounded-xl border border-slate-200">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl flex items-center gap-2">
            <Shield size={14} className="text-amber-600" />
            <span className="text-amber-600 text-xs font-bold uppercase tracking-tight">Admin</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-200/50 border border-slate-200 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* ── APERÇU ── */}
      {tab === "apercu" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Staff", value: appState.users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Total Étudiants", value: students.length, icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Recettes Totales", value: formatMGA(paiements.reduce((s,p)=>s+p.montant,0)), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Campus Actifs", value: 4, icon: Building2, color: "text-amber-600", bg: "bg-amber-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4", bg)}>
                  <Icon size={20} className={color} />
                </div>
                <div className={clsx("text-2xl font-black tracking-tight", color)}>{value}</div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.map(({ id, info, students: sc, users, totalPaye, totalDu, taux, countPaye, countImpaye }) => (
              <div key={id} className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-12 rounded-full" style={{background:info.color}} />
                    <div>
                      <div className="text-slate-900 font-black text-base">{info.label}</div>
                      <div className="text-slate-400 text-xs">{users} agent(s) · {sc} étudiant(s)</div>
                    </div>
                  </div>
                  <div className="text-right font-black text-[10px] uppercase">
                    <div className="text-emerald-600">{countPaye} Payés</div>
                    <div className="text-red-500">{countImpaye} Impayés</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">Recouvrement</span>
                    <span className="text-slate-900">{taux}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                         style={{width:`${taux}%`,background:taux>=70?"#10b981":taux>=40?"#f59e0b":"#ef4444"}} />
                  </div>
                  <div className="text-emerald-600 font-black text-sm pt-1">{formatMGA(totalPaye)} / {formatMGA(totalDu)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── COLLABORATEURS (STAFF) ── */}
      {tab === "utilisateurs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-3 flex-1 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Rechercher un agent..." value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <select value={filterEtab} onChange={e => setFilterEtab(e.target.value as any)}
                className="pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none">
                <option value="tous">Tous les campus</option>
                {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
              </select>
            </div>
            <button onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-brand-600/20 w-full sm:w-auto justify-center">
              <Plus size={18} /> Nouveau compte
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{["Identifiant","Agent","Rôle","Campus","Statut","Actions"].map(h => (
                    <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-4">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">Aucun collaborateur trouvé</td></tr>
                  ) : filteredUsers.map(u => {
                    const id = getStudentId(u);
                    const campus = (u.etablissement || u.campus || "analakely") as Etablissement;
                    return (
                      <tr key={id} className={clsx("hover:bg-slate-50 transition-colors", !u.actif && "opacity-60")}>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-brand-600">{u.username}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{u.prenom} {u.nom}</td>
                        <td className="px-6 py-4">
                          <span className={clsx("text-[10px] font-black uppercase px-2.5 py-1 rounded-lg",
                            u.role==="admin"?"bg-amber-100 text-amber-700":u.role==="comptable"?"bg-blue-100 text-blue-700":"bg-emerald-100 text-emerald-700")}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{campus}</td>
                        <td className="px-6 py-4">
                          {u.actif
                            ? <span className="text-emerald-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 size={14}/>Actif</span>
                            : <span className="text-red-400 font-bold text-xs flex items-center gap-1"><XCircle size={14}/>Bloqué</span>}
                        </td>
                        <td className="px-6 py-4">
                          {u.role !== "admin" && (
                            <div className="flex gap-2">
                              <button onClick={async () => {
                                setLoading(true);
                                await updateUser(id, { actif: !u.actif });
                                setLoading(false);
                              }}
                                className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                                {u.actif ? "Bloquer" : "Activer"}
                              </button>
                              <button onClick={async () => {
                                if(confirm("Supprimer ce compte définitivement ?")) {
                                  setLoading(true);
                                  await deleteUser(id);
                                  setLoading(false);
                                }
                              }}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE USER MODAL ── */}
      {showCreateUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-slate-900 font-black text-xl">Créer un compte</h2>
                <p className="text-slate-400 text-sm">Accès sécurisé pour le staff</p>
              </div>
              <button onClick={() => setShowCreateUser(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Prénom</label>
                  <input type="text" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nom</label>
                  <input type="text" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Identifiant (Username)</label>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mot de passe</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Rôle</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                    {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Campus</label>
                  <select value={form.etablissement} onChange={e => setForm({...form, etablissement: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                    {ETAB_LIST.map(([id]) => <option key={id} value={id}>{id.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              {formError && <p className="text-red-500 text-[10px] font-black uppercase">{formError}</p>}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowCreateUser(false)} className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-400 text-xs font-black uppercase">Annuler</button>
              <button onClick={handleCreateUser} disabled={loading} className="flex-1 py-4 rounded-xl bg-brand-600 text-white text-xs font-black uppercase shadow-lg shadow-brand-600/20">
                {loading ? "Création..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
