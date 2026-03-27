"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Eye, EyeOff, Lock, User, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, Etablissement, ADMIN_PASSWORD } from "@/lib/data";
import clsx from "clsx";

const ETABS: { id: Etablissement; short: string }[] = [
  { id: "analakely", short: "Analakely" },
  { id: "antsirabe", short: "Antsirabe" },
  { id: "tamatave",  short: "Tamatave"  },
  { id: "bypass",    short: "Bypass"    },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [etab, setEtab] = useState<Etablissement>("analakely");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const result = await login(username, password, etab);
    setLoading(false);
    if (result.ok) router.push("/dashboard");
    else setError(result.error || "Erreur de connexion");
  };

  const handleAdminAccess = async () => {
    setLoading(true);
    setAdminError("");
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPwd }),
      });
      const data = await res.json();
      if (data.ok) {
        // Also create a session for admin
        const adminUser = { id: "admin-1", role: "admin", etablissement: "analakely" };
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: adminUser }),
        });

        setShowAdminModal(false);
        setAdminPwd("");
        router.push("/admin");
      } else {
        setAdminError(data.error || "Mot de passe incorrect");
      }
    } catch (e) {
      setAdminError("Erreur de connexion au serveur");
    }
    setLoading(false);
  };

  const etabInfo = ETABLISSEMENTS[etab];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 relative overflow-hidden">

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" style={{ background: etabInfo.color }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" style={{ background: etabInfo.color }} />
      </div>

      {/* Admin button - top right */}
      <button onClick={() => setShowAdminModal(true)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-sm px-4 py-2.5 rounded-xl text-xs font-bold transition-all">
        <Shield size={14} className="text-amber-500" />
        <span className="hidden sm:inline">Panneau Admin</span>
      </button>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-600/20"
            style={{ background: etabInfo.color }}>
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">GSI SmartPay</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion des écolages universitaire</p>
        </div>

        {/* Etablissement tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-200/50 border border-slate-200 rounded-2xl p-1 mb-6">
          {ETABS.map(({ id, short }) => (
            <button key={id} onClick={() => { setEtab(id); setError(""); }}
              className={clsx("py-2.5 rounded-xl text-xs font-bold transition-all",
                etab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {short}
            </button>
          ))}
        </div>

        <p className="text-center text-slate-400 text-xs mb-4 font-bold uppercase tracking-wider">{etabInfo.label}</p>

        {/* Login card */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50">
          <h2 className="text-slate-900 font-bold text-xl mb-6">Connexion</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Identifiant</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Votre identifiant" value={username}
                  onChange={e => setUsername(e.target.value)} required
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPwd ? "text" : "password"} placeholder="Votre mot de passe" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-xs font-medium">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-brand-600/20 disabled:opacity-60 mt-2"
              style={{ background: etabInfo.color }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connexion...
                </span>
              ) : "Se connecter"}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-400 text-xs mt-8">
          © 2025 Groupe GSI · Système de gestion sécurisé
        </p>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-bold">Panneau Administrateur</h2>
                <p className="text-white/40 text-xs">Acces securise</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-white/50 block mb-1.5">Mot de passe admin</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="password" placeholder="Mot de passe" value={adminPwd}
                  onChange={e => { setAdminPwd(e.target.value); setAdminError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAdminAccess()} autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              {adminError && <p className="text-red-400 text-xs mt-2">{adminError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAdminModal(false); setAdminPwd(""); setAdminError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                Annuler
              </button>
              <button onClick={handleAdminAccess}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold transition-colors">
                Acceder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
