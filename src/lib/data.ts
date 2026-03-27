// ─── Types ───────────────────────────────────────────────────────────────────

export type Etablissement = "analakely" | "antsirabe" | "tamatave" | "bypass";
export type Role = "admin" | "comptable" | "agent";

export interface User {
  id: string;
  username: string;
  password: string;
  nom: string;
  prenom: string;
  role: Role;
  etablissement: Etablissement;
  actif: boolean;
  createdAt: string;
  createdBy: string;
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

// ─── Etablissements & Filieres ───────────────────────────────────────────────

export const ETABLISSEMENTS: Record<Etablissement, { label: string; filieres: string[]; color: string }> = {
  analakely: {
    label: "GSI Internationale Analakely",
    color: "#2563eb",
    filieres: [
      "Tourisme, Voyage & Hotellerie",
      "Communication, Multimedia & Journalisme",
      "Informatique, Electronique & Robotique",
      "Gestion Management des Affaires - Finance & Comptabilite",
      "Gestion Management des Affaires - Marketing Digital",
      "Paramedicaux - Sage-femme",
      "Paramedicaux - Infirmier",
    ],
  },
  antsirabe: {
    label: "GSI Antsirabe",
    color: "#7c3aed",
    filieres: [
      "Informatique & Conception Web",
      "Gestion & Management RH",
      "Droit & Relations Internationales",
      "Tourisme, Voyage & Hotellerie",
    ],
  },
  tamatave: {
    label: "GSI Tamatave",
    color: "#0891b2",
    filieres: [
      "Management et Organisation des Affaires",
      "Droit et Relations Internationales",
      "Tourisme, Voyage et Hotellerie",
      "Technologies Informatiques, Electroniques et Telecommunications",
      "Communication, Multimedia et Journalisme",
    ],
  },
  bypass: {
    label: "GSI Bypass",
    color: "#059669",
    filieres: [
      "Paramedicaux - Sage-femme",
      "Paramedicaux - Infirmier",
      "Aide Soignant",
    ],
  },
};

// ─── Default users (only admin by default) ───────────────────────────────────

export const DEFAULT_USERS: User[] = [
  {
    id: "admin-1",
    username: "admin",
    password: "", // Handled on server for security
    nom: "Administrateur",
    prenom: "GSI",
    role: "admin",
    etablissement: "analakely",
    actif: true,
    createdAt: "2024-01-01",
    createdBy: "system",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function formatMGA(amount: number): string {
  return new Intl.NumberFormat("fr-MG").format(amount) + " Ar";
}
