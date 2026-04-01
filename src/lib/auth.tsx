"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Etablissement, generateId } from "@/lib/data";
import {
  fetchStaff, createStaff, updateStaff, deleteStaff,
  fetchExpenses, createExpense, updateExpense, deleteExpense,
  fetchFees, saveFee, DBExpense, DBFee, DBStudent
} from "@/lib/api";

interface ProgramFee {
  campus: Etablissement;
  filiere: string;
  niveau: string;
  amount: number;
  monthlyAmount?: number;
}

interface AppState {
  users: DBStudent[];
  expenses: DBExpense[];
  programFees: ProgramFee[];
}

interface LoginResult {
  ok: boolean;
  error?: string;
  user?: any;
}

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  appState: AppState;
  login: (username: string, password: string, etablissement: Etablissement) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshState: () => Promise<void>;
  // User management (Staff)
  createUser: (data: Omit<User, "id" | "createdAt" | "createdBy">) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  // Expenses management
  addExpense: (e: Omit<DBExpense, "id" | "_id">) => Promise<void>;
  updateExpense: (id: string, data: Partial<DBExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  myExpenses: DBExpense[];
  // Program Fees management
  setProgramFee: (campus: Etablissement, filiere: string, amount: number, niveau: string, monthlyAmount?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "gsi_session_v3";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>({
    users: [],
    expenses: [],
    programFees: [],
  });

  const refreshState = useCallback(async () => {
    const [staff, expenses, fees] = await Promise.all([
      fetchStaff(),
      fetchExpenses(),
      fetchFees()
    ]);
    setAppState({
      users: staff,
      expenses: expenses,
      programFees: fees.map(f => ({
        campus: f.campus as Etablissement,
        filiere: f.filiere,
        amount: f.amount,
        niveau: f.niveau || "L1",
        monthlyAmount: f.monthlyAmount
      }))
    });
  }, []);

  useEffect(() => {
    // 1. Tenter de restaurer la session locale
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const user = JSON.parse(session) as User;
        setCurrentUser(user);
      } catch {}
    }
    // 2. Charger les données initiales depuis la DB
    refreshState();
  }, [refreshState]);

  const login = async (username: string, password: string, etablissement: Etablissement): Promise<LoginResult> => {
    try {
      const res = await fetch("/gsi-smartpay/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, etablissement }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Erreur de connexion" };

      const user = data.user;
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));

      // Re-charger les données spécifiques à l'utilisateur
      await refreshState();
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: "Impossible de contacter le serveur d'authentification" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/gsi-smartpay/api/auth/logout/", { method: "POST" });
    } catch {}
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const createUser = async (data: any) => {
    const res = await createStaff({
      ...data,
      actif: true,
      createdBy: currentUser?.id || "admin"
    });
    if (res) await refreshState();
  };

  const updateUserProfile = async (id: string, data: any) => {
    const ok = await updateStaff(id, data);
    if (ok) await refreshState();
  };

  const deleteUserProfile = async (id: string) => {
    const ok = await deleteStaff(id);
    if (ok) await refreshState();
  };

  const addExpenseToDb = async (e: any) => {
    const res = await createExpense(e);
    if (res) await refreshState();
  };

  const updateExpenseInDb = async (id: string, data: any) => {
    const ok = await updateExpense(id, data);
    if (ok) await refreshState();
  };

  const deleteExpenseInDb = async (id: string) => {
    const ok = await deleteExpense(id);
    if (ok) await refreshState();
  };

  const setProgramFeeInDb = async (campus: Etablissement, filiere: string, amount: number, niveau: string, monthlyAmount?: number) => {
    const res = await saveFee({ campus, filiere, amount, niveau, monthlyAmount });
    if (res) await refreshState();
  };

  const isAdmin = currentUser?.role === "admin";
  const myExpenses = isAdmin
    ? appState.expenses
    : appState.expenses.filter(e => (e.etablissement || "").toLowerCase().includes((currentUser?.etablissement || "").toLowerCase()));

  return (
    <AuthContext.Provider value={{
      currentUser, isAdmin, appState, login, logout, refreshState,
      createUser, updateUser: updateUserProfile, deleteUser: deleteUserProfile,
      addExpense: addExpenseToDb, updateExpense: updateExpenseInDb, deleteExpense: deleteExpenseInDb, myExpenses,
      setProgramFee: setProgramFeeInDb,
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
