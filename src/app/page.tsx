"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Eye, EyeOff, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/dashboard"), 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-800/30 via-transparent to-transparent" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">GSI SmartPay</h1>
          <p className="text-brand-300 text-sm mt-1">Plateforme de gestion des écolages</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-6">Connexion</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-200 block mb-1.5">Identifiant</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
                <input
                  type="text"
                  placeholder="admin@gsi.mg"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-200 block mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-300 hover:text-white"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-brand-200 cursor-pointer">
                <input type="checkbox" className="rounded border-white/20" />
                Se souvenir de moi
              </label>
              <button type="button" className="text-brand-300 hover:text-white transition-colors">
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-brand-50 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                  Connexion...
                </span>
              ) : "Se connecter"}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-center">
            <p className="text-xs text-brand-300">Mode démo — cliquez sur Connexion</p>
          </div>
        </div>

        {/* Roles hint */}
        <div className="mt-5 flex justify-center gap-4 text-xs text-brand-400">
          {["Admin", "Comptable", "Agent"].map(role => (
            <span key={role} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              {role}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
