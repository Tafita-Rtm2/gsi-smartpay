"use client";
import { useState } from "react";
import {
  Users, Plus, Trash2, Edit3, Eye, EyeOff, CheckCircle2,
  XCircle, Building2, CreditCard, GraduationCap, TrendingUp,
  ChevronDown, Search, Shield, BarChart3
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  ETABLISSEMENTS, Etablissement, User, Role,
  formatMGA, getStatusLabel, getStatusClass
} from "@/lib/data";
import clsx from "clsx";

const ETAB_LIST = Object.entries(ETABLISSEMENTS) as [Etablissement, typeof ETABLISSEMENTS[Etablissement]][];
const ROLES: Role[] = ["comptable", "agent"];

type Tab = "apercu" | "utilisateurs" | "etudiants" | "paiements";

export default function AdminPage() {
  const { appState, createUser, updateUser, deleteUser, myStudents, myPayments } = useAuth();
  const [tab, setTab] = useState<Tab>("apercu");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [filterEtab, setFilterEtab] = useState<"tous" | Etablissement>("tous");

  // Create user form
  const [form, setForm] = useState({
    username: "", password: "", nom: "", prenom: "",
    role: "comptable" as Role, etablissement: "analakely" as Etablissement, actif: true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");

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

  // Stats per etablissement
  const stats = ETAB_LIST.map(([id, info]) => {
    const students = appState.students.filter(s => s.etablissement === id);
    const payments = appState.payments.filter(p => p.etablissement === id && p.statut === "paye");
    const users = appState.users.filter(u => u.etablissement === id && u.role !== "admin");
    const totalDu = students.reduce((s, x) => s + x.montantDu, 0);
    const totalPaye = payments.reduce((s, x) => s + x.montant, 0);
    return { id, info, students: students.length, users: users.length, totalPaye, totalDu, taux: totalDu ? Math.round((totalPaye / totalDu) * 100) : 0 };
  });

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "apercu",       label: "Apercu global",    icon: BarChart3 },
    { id: "utilisateurs", label: "Utilisateurs",      icon: Users },
    { id: "etudiants",    label: "Tous les etudiants",icon: GraduationCap },
    { id: "paiements",    label: "Tous les paiements",icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Administration GSI</h1>
          <p className="text-white/40 text-sm mt-0.5">Vision globale de tous les etablissements</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
          <Shield size={14} className="text-amber-400" />
          <span className="text-amber-400 text-xs font-bold">ADMIN</span>
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total utilisateurs", value: appState.users.filter(u => u.role !== "admin").length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Total etudiants", value: appState.students.length, icon: GraduationCap, color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Total paiements", value: formatMGA(appState.payments.filter(p => p.statut === "paye").reduce((s, p) => s + p.montant, 0)), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
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

          {/* Per etablissement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map(({ id, info, students, users, totalPaye, totalDu, taux }) => (
              <div key={id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-10 rounded-full" style={{ background: info.color }} />
                  <div>
                    <div className="text-white font-bold text-sm">{info.label}</div>
                    <div className="text-white/40 text-xs">{users} agent(s) · {students} etudiant(s)</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Recouvrement</span>
                    <span className="font-bold text-white">{taux}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${taux}%`, background: taux >= 70 ? "#22c55e" : taux >= 40 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
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
                <select value={filterEtab} onChange={e => setFilterEtab(e.target.value as "tous" | Etablissement)}
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
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    {["Utilisateur", "Nom complet", "Role", "Etablissement", "Cree le", "Statut", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-white/40 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={clsx("hover:bg-white/5 transition-colors", !u.actif && "opacity-50")}>
                      <td className="px-4 py-3 font-mono text-xs text-amber-400">{u.username}</td>
                      <td className="px-4 py-3 font-semibold text-white">{u.prenom} {u.nom}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                          u.role === "admin" ? "bg-amber-500/20 text-amber-400" :
                          u.role === "comptable" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400")}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
                          style={{ background: ETABLISSEMENTS[u.etablissement].color + "44" }}>
                          {u.etablissement}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{u.createdAt}</td>
                      <td className="px-4 py-3">
                        {u.actif
                          ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={12} />Actif</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} />Desactive</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== "admin" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateUser(u.id, { actif: !u.actif })}
                              className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/50 hover:border-white/30 hover:text-white transition-all">
                              {u.actif ? "Desactiver" : "Activer"}
                            </button>
                            <button onClick={() => setEditUser(u)}
                              className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/50 hover:border-amber-400/50 hover:text-amber-400 transition-all">
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => { if (confirm("Supprimer ce compte ?")) deleteUser(u.id); }}
                              className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/50 hover:border-red-400/50 hover:text-red-400 transition-all">
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/5">
              {filteredUsers.map(u => (
                <div key={u.id} className={clsx("p-4 space-y-2", !u.actif && "opacity-50")}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold">{u.prenom} {u.nom}</div>
                      <div className="font-mono text-xs text-amber-400">{u.username}</div>
                    </div>
                    <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                      u.role === "admin" ? "bg-amber-500/20 text-amber-400" :
                      u.role === "comptable" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400")}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full text-white font-semibold"
                      style={{ background: ETABLISSEMENTS[u.etablissement].color + "44" }}>
                      {u.etablissement}
                    </span>
                    {u.actif
                      ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} />Actif</span>
                      : <span className="text-red-400 flex items-center gap-1"><XCircle size={11} />Desactive</span>}
                  </div>
                  {u.role !== "admin" && (
                    <div className="flex gap-2">
                      <button onClick={() => updateUser(u.id, { actif: !u.actif })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white transition-all">
                        {u.actif ? "Desactiver" : "Activer"}
                      </button>
                      <button onClick={() => { if (confirm("Supprimer ?")) deleteUser(u.id); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-all">
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
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  {["Matricule", "Nom", "Filiere", "Classe", "Etablissement", "Du", "Paye", "Statut"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-white/40 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appState.students.map(s => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{s.matricule}</td>
                    <td className="px-4 py-3 font-semibold text-white">{s.prenom} {s.nom}</td>
                    <td className="px-4 py-3 text-white/60 text-xs max-w-[180px] truncate">{s.filiere}</td>
                    <td className="px-4 py-3"><span className="bg-brand-500/20 text-brand-400 text-xs px-2 py-0.5 rounded-full font-bold">{s.classe}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
                        style={{ background: ETABLISSEMENTS[s.etablissement].color + "44" }}>
                        {s.etablissement}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">{formatMGA(s.montantDu)}</td>
                    <td className="px-4 py-3 text-emerald-400 text-xs font-semibold">{formatMGA(s.montantPaye)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                        s.statut === "paye" ? "bg-emerald-500/20 text-emerald-400" :
                        s.statut === "impaye" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>
                        {getStatusLabel(s.statut)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-white/5">
            {appState.students.map(s => (
              <div key={s.id} className="p-4 space-y-1">
                <div className="flex justify-between">
                  <span className="text-white font-semibold text-sm">{s.prenom} {s.nom}</span>
                  <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                    s.statut === "paye" ? "bg-emerald-500/20 text-emerald-400" :
                    s.statut === "impaye" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>
                    {getStatusLabel(s.statut)}
                  </span>
                </div>
                <div className="text-xs text-white/40">{s.filiere} · {s.classe}</div>
                <div className="flex gap-3 text-xs">
                  <span className="text-white/50">Du: {formatMGA(s.montantDu)}</span>
                  <span className="text-emerald-400">Paye: {formatMGA(s.montantPaye)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {tab === "paiements" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  {["Reference", "Etudiant", "Montant", "Mode", "Date", "Agent", "Etablissement"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-white/40 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appState.payments.filter(p => p.statut === "paye").map(p => (
                  <tr key={p.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-amber-400">{p.reference}</td>
                    <td className="px-4 py-3 text-white font-semibold">{p.etudiantNom}</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">{formatMGA(p.montant)}</td>
                    <td className="px-4 py-3"><span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{p.mode}</span></td>
                    <td className="px-4 py-3 text-white/40 text-xs">{p.date}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{p.agentNom}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
                        style={{ background: ETABLISSEMENTS[p.etablissement].color + "44" }}>
                        {p.etablissement}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-white/5">
            {appState.payments.filter(p => p.statut === "paye").map(p => (
              <div key={p.id} className="p-4 space-y-1">
                <div className="flex justify-between">
                  <span className="text-white font-semibold text-sm">{p.etudiantNom}</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatMGA(p.montant)}</span>
                </div>
                <div className="flex gap-2 text-xs text-white/40">
                  <span>{p.date}</span><span>{p.mode}</span><span>{p.agentNom}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold inline-block"
                  style={{ background: ETABLISSEMENTS[p.etablissement].color + "44" }}>
                  {p.etablissement}
                </span>
              </div>
            ))}
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
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-white/50 block mb-1">Mot de passe</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} placeholder="Mot de passe"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/50 block mb-1">Role</label>
                  <div className="relative">
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                      className="appearance-none w-full px-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/50 block mb-1">Etablissement</label>
                  <div className="relative">
                    <select value={form.etablissement} onChange={e => setForm(f => ({ ...f, etablissement: e.target.value as Etablissement }))}
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
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                Annuler
              </button>
              <button onClick={handleCreateUser}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold transition-colors">
                Creer le compte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
