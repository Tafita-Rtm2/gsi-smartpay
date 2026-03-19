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
  {
    id: "user-1",
    username: "comptable.analakely",
    password: "gsi2024",
    nom: "Rakoto",
    prenom: "Jean",
    role: "comptable",
    etablissement: "analakely",
    actif: true,
    createdAt: "2024-09-01",
    createdBy: "admin-1",
  },
  {
    id: "user-2",
    username: "agent.antsirabe",
    password: "gsi2024",
    nom: "Rabe",
    prenom: "Marie",
    role: "agent",
    etablissement: "antsirabe",
    actif: true,
    createdAt: "2024-09-01",
    createdBy: "admin-1",
  },
  {
    id: "user-3",
    username: "comptable.tamatave",
    password: "gsi2024",
    nom: "Andria",
    prenom: "Paul",
    role: "comptable",
    etablissement: "tamatave",
    actif: true,
    createdAt: "2024-09-01",
    createdBy: "admin-1",
  },
  {
    id: "user-4",
    username: "agent.bypass",
    password: "gsi2024",
    nom: "Rasoa",
    prenom: "Hanta",
    role: "agent",
    etablissement: "bypass",
    actif: true,
    createdAt: "2024-09-01",
    createdBy: "admin-1",
  },
];

// ─── Mock Students ────────────────────────────────────────────────────────────

export const DEFAULT_STUDENTS: Student[] = [
  { id: "s1", nom: "Rakoto", prenom: "Jean", matricule: "ANA-2024-001", filiere: "Informatique, Electronique & Robotique", classe: "L2", telephone: "034 12 345 67", email: "jean@gsi.mg", statut: "paye", montantDu: 1200000, montantPaye: 1200000, etablissement: "analakely", annee: "2024/2025" },
  { id: "s2", nom: "Rabe", prenom: "Marie", matricule: "ANA-2024-002", filiere: "Gestion Management des Affaires - Finance & Comptabilité", classe: "M1", telephone: "033 98 765 43", email: "marie@gsi.mg", statut: "impaye", montantDu: 1500000, montantPaye: 0, etablissement: "analakely", annee: "2024/2025" },
  { id: "s3", nom: "Andria", prenom: "Paul", matricule: "ANT-2024-001", filiere: "Informatique & Conception Web", classe: "L1", telephone: "032 11 223 34", email: "paul@gsi.mg", statut: "en_attente", montantDu: 900000, montantPaye: 450000, etablissement: "antsirabe", annee: "2024/2025" },
  { id: "s4", nom: "Rasoa", prenom: "Hanta", matricule: "TAM-2024-001", filiere: "Technologies Informatiques, Electroniques et Télécommunications", classe: "L3", telephone: "034 55 678 90", email: "hanta@gsi.mg", statut: "paye", montantDu: 1100000, montantPaye: 1100000, etablissement: "tamatave", annee: "2024/2025" },
  { id: "s5", nom: "Rajao", prenom: "Fidy", matricule: "BYP-2024-001", filiere: "Paramédicaux - Infirmier", classe: "L2", telephone: "033 44 556 67", email: "fidy@gsi.mg", statut: "impaye", montantDu: 950000, montantPaye: 0, etablissement: "bypass", annee: "2024/2025" },
  { id: "s6", nom: "Randr", prenom: "Vola", matricule: "ANT-2024-002", filiere: "Gestion & Management RH", classe: "L1", telephone: "032 77 889 90", email: "vola@gsi.mg", statut: "en_attente", montantDu: 900000, montantPaye: 300000, etablissement: "antsirabe", annee: "2024/2025" },
  { id: "s7", nom: "Rasoar", prenom: "Lanto", matricule: "ANA-2024-003", filiere: "Communication, Multimédia & Journalisme", classe: "M1", telephone: "034 22 334 45", email: "lanto@gsi.mg", statut: "paye", montantDu: 1500000, montantPaye: 1500000, etablissement: "analakely", annee: "2024/2025" },
  { id: "s8", nom: "Ramb", prenom: "Nivo", matricule: "TAM-2024-002", filiere: "Tourisme, Voyage et Hôtellerie", classe: "L3", telephone: "033 66 778 89", email: "nivo@gsi.mg", statut: "impaye", montantDu: 900000, montantPaye: 0, etablissement: "tamatave", annee: "2024/2025" },
];

export const DEFAULT_PAYMENTS: Payment[] = [
  { id: "p1", reference: "REC-ANA-0001", etudiantId: "s1", etudiantNom: "Rakoto Jean", montant: 1200000, date: "2024-09-05", mode: "MVola", statut: "paye", agentId: "user-1", agentNom: "Rakoto Jean", filiere: "Informatique, Electronique & Robotique", classe: "L2", etablissement: "analakely" },
  { id: "p2", reference: "REC-ANT-0001", etudiantId: "s3", etudiantNom: "Andria Paul", montant: 450000, date: "2024-09-10", mode: "especes", statut: "paye", agentId: "user-2", agentNom: "Rabe Marie", filiere: "Informatique & Conception Web", classe: "L1", etablissement: "antsirabe" },
  { id: "p3", reference: "REC-TAM-0001", etudiantId: "s4", etudiantNom: "Rasoa Hanta", montant: 1100000, date: "2024-09-12", mode: "Orange Money", statut: "paye", agentId: "user-3", agentNom: "Andria Paul", filiere: "Technologies Informatiques, Electroniques et Télécommunications", classe: "L3", etablissement: "tamatave" },
  { id: "p4", reference: "REC-ANA-0002", etudiantId: "s7", etudiantNom: "Rasoar Lanto", montant: 1500000, date: "2024-09-18", mode: "virement", statut: "paye", agentId: "user-1", agentNom: "Rakoto Jean", filiere: "Communication, Multimédia & Journalisme", classe: "M1", etablissement: "analakely" },
];

export const DEFAULT_EXPENSES: Expense[] = [
  { id: "e1", libelle: "Facture électricité octobre", categorie: "Charges", montant: 320000, date: "2024-10-03", etablissement: "analakely", agentId: "user-1", agentNom: "Rakoto Jean" },
  { id: "e2", libelle: "Fournitures de bureau", categorie: "Matériel", montant: 85000, date: "2024-10-05", etablissement: "antsirabe", agentId: "user-2", agentNom: "Rabe Marie" },
  { id: "e3", libelle: "Salaires personnel", categorie: "RH", montant: 2500000, date: "2024-10-31", etablissement: "tamatave", agentId: "user-3", agentNom: "Andria Paul" },
];

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
