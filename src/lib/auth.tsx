"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User, Student, Payment, Expense,
  DEFAULT_USERS, DEFAULT_STUDENTS, DEFAULT_PAYMENTS, DEFAULT_EXPENSES,
  Etablissement, generateId,
} from "@/lib/data";

interface AppState {
  users: User[];
  students: Student[];
  payments: Payment[];
  expenses: Expense[];
}

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  appState: AppState;
  login: (username: string, password: string, etablissement: Etablissement) => { ok: boolean; error?: string };
  logout: () => void;
  // Admin actions
  createUser: (data: Omit<User, "id" | "createdAt" | "createdBy">) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // Student actions
  addStudent: (s: Omit<Student, "id">) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  // Payment actions
  addPayment: (p: Omit<Payment, "id" | "reference">) => void;
  // Expense actions
  addExpense: (e: Omit<Expense, "id">) => void;
  // Filtered by current user etablissement (or all if admin)
  myStudents: Student[];
  myPayments: Payment[];
  myExpenses: Expense[];
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "gsi_app_state";
const SESSION_KEY = "gsi_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>({
    users: DEFAULT_USERS,
    students: DEFAULT_STUDENTS,
    payments: DEFAULT_PAYMENTS,
    expenses: DEFAULT_EXPENSES,
  });

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAppState(JSON.parse(saved));
      else localStorage.setItem(STORAGE_KEY, JSON.stringify({
        users: DEFAULT_USERS, students: DEFAULT_STUDENTS,
        payments: DEFAULT_PAYMENTS, expenses: DEFAULT_EXPENSES,
      }));

      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const user = JSON.parse(session) as User;
        // Re-verify user still exists & active
        const state = saved ? JSON.parse(saved) : { users: DEFAULT_USERS };
        const found = state.users.find((u: User) => u.id === user.id && u.actif);
        if (found) setCurrentUser(found);
      }
    } catch {}
  }, []);

  const persist = (state: AppState) => {
    setAppState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const login = (username: string, password: string, etablissement: Etablissement) => {
    const user = appState.users.find(
      u => u.username === username && u.password === password
    );
    if (!user) return { ok: false, error: "Identifiant ou mot de passe incorrect" };
    if (!user.actif) return { ok: false, error: "Ce compte est désactivé" };
    // Admin can login from any etablissement tab
    if (user.role !== "admin" && user.etablissement !== etablissement) {
      return { ok: false, error: `Ce compte n'appartient pas à ${etablissement}` };
    }
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { ok: true };
  };

  const logout = () => {
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
    const next = { ...appState, users: [...appState.users, newUser] };
    persist(next);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const next = { ...appState, users: appState.users.map(u => u.id === id ? { ...u, ...data } : u) };
    persist(next);
  };

  const deleteUser = (id: string) => {
    const next = { ...appState, users: appState.users.filter(u => u.id !== id) };
    persist(next);
  };

  const addStudent = (s: Omit<Student, "id">) => {
    const next = { ...appState, students: [...appState.students, { ...s, id: generateId() }] };
    persist(next);
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    const next = { ...appState, students: appState.students.map(s => s.id === id ? { ...s, ...data } : s) };
    persist(next);
  };

  const addPayment = (p: Omit<Payment, "id" | "reference">) => {
    const count = appState.payments.filter(x => x.etablissement === p.etablissement).length + 1;
    const prefix = p.etablissement.slice(0, 3).toUpperCase();
    const reference = `REC-${prefix}-${String(count).padStart(4, "0")}`;
    const newP: Payment = { ...p, id: generateId(), reference };
    const next = { ...appState, payments: [...appState.payments, newP] };
    persist(next);
  };

  const addExpense = (e: Omit<Expense, "id">) => {
    const next = { ...appState, expenses: [...appState.expenses, { ...e, id: generateId() }] };
    persist(next);
  };

  const isAdmin = currentUser?.role === "admin";
  const etab = currentUser?.etablissement;

  const myStudents = isAdmin ? appState.students : appState.students.filter(s => s.etablissement === etab);
  const myPayments = isAdmin ? appState.payments : appState.payments.filter(p => p.etablissement === etab);
  const myExpenses = isAdmin ? appState.expenses : appState.expenses.filter(e => e.etablissement === etab);

  return (
    <AuthContext.Provider value={{
      currentUser, isAdmin, appState, login, logout,
      createUser, updateUser, deleteUser,
      addStudent, updateStudent, addPayment, addExpense,
      myStudents, myPayments, myExpenses,
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
