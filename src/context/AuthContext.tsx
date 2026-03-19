"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { store, User, EtablissementId } from "@/lib/store";

interface AuthCtx {
  user: User | null;
  adminUnlocked: boolean;
  login: (u: string, p: string, e: EtablissementId) => boolean;
  logout: () => void;
  unlockAdmin: (pwd: string) => boolean;
  lockAdmin: () => void;
  refresh: () => void;
  tick: number;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick(t => t + 1);

  const login = (u: string, p: string, e: EtablissementId) => {
    const result = store.login(u, p, e);
    if (result) { setUser(result); return true; }
    return false;
  };
  const logout = () => { store.logout(); setUser(null); setAdminUnlocked(false); };
  const unlockAdmin = (pwd: string) => {
    const ok = store.unlockAdmin(pwd);
    setAdminUnlocked(ok);
    return ok;
  };
  const lockAdmin = () => { store.lockAdmin(); setAdminUnlocked(false); };

  return (
    <Ctx.Provider value={{ user, adminUnlocked, login, logout, unlockAdmin, lockAdmin, refresh, tick }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
