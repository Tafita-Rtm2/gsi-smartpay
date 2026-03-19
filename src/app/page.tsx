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
    await new Promise(r => setTimeout(r, 600));
    const result = login(username, password, etab);
    setLoading(false);
    if (result.ok) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Erreur de connexion");
    }
  };

  const handleAdminAccess = () => {
    if (adminPwd === ADMIN_PASSWORD) {
      setShowAdminModal(false);
      setAdminPwd("");
      router.push("/admin");
    } else {
      setAdminError("Mot de passe incorrect");
    }
  };

  const etabInfo = ETABLISSEMENTS[etab];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, ${etabInfo.color}22 100%)` }}>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/4"
          style={{ background: etabInfo.color }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4"
          style={{ background: etabInfo.color }} />
      </div>

      {/* Admin button */}
      <button onClick={() => setShowAdminModal(true)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all">
        <Shield size={14} />
        <span className="hidden sm:inline">Panneau Admin</span>
      </button>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-2xl"
            style={{ background: etabInfo.color + "44" }}>
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GSI SmartPay</h1>
          <p className="text-white/40 text-sm mt-1">Gestion des écolages</p>
        </div>

        {/* Etablissement tabs */}
        <div className="grid grid-cols-4 gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
          {ETABS.map(({ id, short }) => (
            <button key={id} onClick={() => { setEtab(id); setError(""); }}
              className={clsx("py-2.5 rounded-xl text-xs font-bold transition-all",
                etab === id ? "text-white shadow-lg" : "text-white/40 hover:text-white/60"
              )}
              style={etab === id ? { background: ETABLISSEMENTS[id].color } : {}}>
              {short}
            </button>
          ))}
        </div>

        <p className="text-center text-white/50 text-xs mb-5 font-medium">{etabInfo.label}</p>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-5">Connexion</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1.5">Identifiant</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" placeholder="Votre identifiant" value={username}
                  onChange={e => setUsername(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input type={showPwd ? "text" : "password"} placeholder="Votre mot de passe" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all" />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5 text-red-300 text-xs">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all shadow-lg disabled:opacity-60 mt-1"
              style={{ background: etabInfo.color }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connexion...
                </span>
              ) : "Se connecter"}
            </button>
          </form>
          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-center">
            <p className="text-xs text-white/25">Demo: comptable.analakely / gsi2024</p>
          </div>
        </div>
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
                <p className="text-white/40 text-xs">Accès sécurisé</p>
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
                Accéder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
