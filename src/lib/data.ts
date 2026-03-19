// ─── Types ───────────────────────────────────────────────────────────────────

export type Etablissement = "analakely" | "antsirabe" | "tamatave" | "bypass";
export type Role = "admin" | "comptable" | "agent";
export type PaymentStatus = "paye" | "impaye" | "en_attente";
export type PaymentMode = "especes" | "MVola" | "Orange Money" | "Airtel Money" | "virement";

export interface User {
  id: string;
  username: string;
  password: string; // in real app: hashed
  nom: string;
  prenom: string;
  role: Role;
  etablissement: Etablissement;
  actif: boolean;
  createdAt: string;
  createdBy: string; // admin id
}

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  classe: string;
  telephone: string;
  email: string;
  statut: PaymentStatus;
  montantDu: number;
  montantPaye: number;
  etablissement: Etablissement;
  annee: string;
}

export interface Payment {
  id: string;
  reference: string;
  etudiantId: string;
  etudiantNom: string;
  montant: number;
  date: string;
  mode: PaymentMode;
  statut: PaymentStatus;
  agentId: string;
  agentNom: string;
  filiere: string;
  classe: string;
  etablissement: Etablissement;
  note?: string;
}

export interface Expense {
  id: string;
  libelle: string;
  categorie: string;
  montant: number;
  date: string;
  etablissement: Etablissement;
  agentId: string;
  agentNom: string;
}

// ─── Etablissements & Filières ───────────────────────────────────────────────

export const ETABLISSEMENTS: Record<Etablissement, { label: string; filieres: string[]; color: string }> = {
  analakely: {
    label: "GSI Internationale Analakely",
    color: "#2563eb",
    filieres: [
      "Tourisme, Voyage & Hôtellerie",
      "Communication, Multimédia & Journalisme",
      "Informatique, Electronique & Robotique",
      "Gestion Management des Affaires - Finance & Comptabilité",
      "Gestion Management des Affaires - Marketing Digital",
      "Paramédicaux - Sage-femme",
      "Paramédicaux - Infirmier",
    ],
  },
  antsirabe: {
    label: "GSI Antsirabe",
    color: "#7c3aed",
    filieres: [
      "Informatique & Conception Web",
      "Gestion & Management RH",
      "Droit & Relations Internationales",
      "Tourisme, Voyage & Hôtellerie",
    ],
  },
  tamatave: {
    label: "GSI Tamatave",
    color: "#0891b2",
    filieres: [
      "Management et Organisation des Affaires",
      "Droit et Relations Internationales",
      "Tourisme, Voyage et Hôtellerie",
      "Technologies Informatiques, Electroniques et Télécommunications",
      "Communication, Multimédia et Journalisme",
    ],
  },
  bypass: {
    label: "GSI Bypass",
    color: "#059669",
    filieres: [
      "Paramédicaux - Sage-femme",
      "Paramédicaux - Infirmier",
      "Aide Soignant",
    ],
  },
};

export const CLASSES = ["L1", "L2", "L3", "M1", "M2"];

// ─── Users (mock - stored in localStorage in browser) ────────────────────────

export const ADMIN_PASSWORD = "Nina GSI";

export const DEFAULT_USERS: User[] = [
  {
    id: "admin-1",
    username: "admin",
    password: "Nina GSI",
    nom: "Administrateur",
    prenom: "GSI",
    role: "admin",
    etablissement: "analakely",
    actif: true,
    createdAt: "2024-01-01",
    createdBy: "system",
  },
];

// ─── Mock Students ────────────────────────────────────────────────────────────

export const DEFAULT_STUDENTS: Student[] = [];

export const DEFAULT_PAYMENTS: Payment[] = [];

export const DEFAULT_EXPENSES: Expense[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatMGA(amount: number): string {
  return new Intl.NumberFormat("fr-MG").format(amount) + " Ar";
}

export function getStatusLabel(status: PaymentStatus): string {
  return { paye: "Payé", impaye: "Impayé", en_attente: "En attente" }[status];
}

export function getStatusClass(status: PaymentStatus): string {
  return { paye: "badge-paid", impaye: "badge-unpaid", en_attente: "badge-pending" }[status];
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function generateRef(etablissement: Etablissement, count: number): string {
  const prefix = etablissement.slice(0, 3).toUpperCase();
  return `REC-${prefix}-${String(count).padStart(4, "0")}`;
}
