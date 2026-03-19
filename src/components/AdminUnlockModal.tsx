"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminUnlockModal({ onClose }: { onClose: () => void }) {
  const { unlockAdmin } = useAuth();
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) { setError("Trop de tentatives. Réessayez plus tard."); return; }
    const ok = unlockAdmin(pwd);
    if (ok) {
      router.push("/admin");
      onClose();
    } else {
      setAttempts(a => a + 1);
      setError(`Mot de passe incorrect. (${attempts + 1}/5)`);
      setPwd("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield size={18} className="text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Panneau Administrateur</div>
              <div className="text-xs text-white/40">Accès restreint</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/50 block mb-1.5">Mot de passe administrateur</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={show ? "text" : "password"}
                value={pwd}
                onChange={e => { setPwd(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoFocus
                disabled={attempts >= 5}
                className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
              />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-300">{error}</div>
          )}

          <button type="submit" disabled={!pwd || attempts >= 5}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Accéder au panneau
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-4">
          Cet accès est enregistré et surveillé
        </p>
      </div>
    </div>
  );
}
