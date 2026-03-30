"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User, DEFAULT_USERS, Etablissement, generateId,
  Expense,
} from "@/lib/data";

// Auth only handles users, local expenses and program configurations
// Students, payments, ecolages come directly from the real API
interface ProgramFee {
  campus: Etablissement;
  filiere: string;
  amount: number;
}

interface AppState {
  users: User[];
  expenses: Expense[]; // local expenses only
  programFees: ProgramFee[];
}

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  appState: AppState;
  login: (username: string, password: string, etablissement: Etablissement) => Promise<LoginResult>;
  logout: () => Promise<void>;
  // Admin user management
  createUser: (data: Omit<User, "id" | "createdAt" | "createdBy">) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // Local expenses only
  addExpense: (e: Omit<Expense, "id">) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  myExpenses: Expense[];
  // Program Fees management
  setProgramFee: (campus: Etablissement, filiere: string, amount: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "gsi_users_v3"; // only users now
const SESSION_KEY = "gsi_session_v3";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>({
    users: DEFAULT_USERS,
    expenses: [],
    programFees: [],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAppState({
          users: parsed.users || DEFAULT_USERS,
          expenses: parsed.expenses || [],
          programFees: parsed.programFees || [],
        });
        // Restore session
        const session = localStorage.getItem(SESSION_KEY);
        if (session) {
          const user = JSON.parse(session) as User;
          const found = (parsed.users || DEFAULT_USERS).find((u: User) => u.id === user.id && u.actif);
          if (found) setCurrentUser(found);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: DEFAULT_USERS, expenses: [] }));
      }
    } catch {}
  }, []);

  const persist = (state: AppState) => {
    setAppState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const login = async (username: string, password: string, etablissement: Etablissement): Promise<LoginResult> => {
    const user = appState.users.find(u => u.username === username && u.password === password);
    if (!user) return { ok: false, error: "Identifiant ou mot de passe incorrect" };
    if (!user.actif) return { ok: false, error: "Ce compte est desactive" };
    if (user.role !== "admin" && user.etablissement !== etablissement) {
      return { ok: false, error: `Ce compte n'appartient pas a ${etablissement}` };
    }

    // Server-side session creation
    try {
      await fetch("/gsi-smartpay/api/auth/session/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });
    } catch (e) {
      console.error("Session creation error:", e);
    }

    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { ok: true };
  };

  const logout = async () => {
    try {
      await fetch("/gsi-smartpay/api/auth/logout/", { method: "POST" });
    } catch {}
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const createUser = (data: Omit<User, "id" | "createdAt" | "createdBy">) => {
    const newUser: User = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: currentUser?.id || "admin",
    };
    persist({ ...appState, users: [...appState.users, newUser] });
  };

  const updateUser = (id: string, data: Partial<User>) => {
    persist({ ...appState, users: appState.users.map(u => u.id === id ? { ...u, ...data } : u) });
  };

  const deleteUser = (id: string) => {
    persist({ ...appState, users: appState.users.filter(u => u.id !== id) });
  };

  const addExpense = (e: Omit<Expense, "id">) => {
    const newE: Expense = { ...e, id: generateId() };
    persist({ ...appState, expenses: [...appState.expenses, newE] });
  };

  const updateExpense = (id: string, data: Partial<Expense>) => {
    persist({ ...appState, expenses: appState.expenses.map(e => e.id === id ? { ...e, ...data } : e) });
  };

  const deleteExpense = (id: string) => {
    persist({ ...appState, expenses: appState.expenses.filter(e => e.id !== id) });
  };

  const setProgramFee = (campus: Etablissement, filiere: string, amount: number) => {
    const existing = appState.programFees.find(p => p.campus === campus && p.filiere === filiere);
    let newList;
    if (existing) {
      newList = appState.programFees.map(p => (p.campus === campus && p.filiere === filiere) ? { ...p, amount } : p);
    } else {
      newList = [...appState.programFees, { campus, filiere, amount }];
    }
    persist({ ...appState, programFees: newList });
  };

  const isAdmin = currentUser?.role === "admin";
  const myExpenses = isAdmin
    ? appState.expenses
    : appState.expenses.filter(e => e.etablissement === currentUser?.etablissement);

  return (
    <AuthContext.Provider value={{
      currentUser, isAdmin, appState, login, logout,
      createUser, updateUser, deleteUser,
      addExpense, updateExpense, deleteExpense, myExpenses,
      setProgramFee,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
