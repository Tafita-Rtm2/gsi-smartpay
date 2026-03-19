// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = "admin" | "comptable" | "agent";
export type PaymentStatus = "payé" | "impayé" | "en_attente";
export type PaymentMode = "espèces" | "MVola" | "Orange Money" | "Airtel Money" | "virement";

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
  agent: string;
  filiere: string;
  classe: string;
}

export interface Expense {
  id: string;
  libelle: string;
  categorie: string;
  montant: number;
  date: string;
}

export interface Filiere {
  id: string;
  nom: string;
  classes: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const FILIERES: Filiere[] = [
  { id: "1", nom: "Informatique", classes: ["L1", "L2", "L3", "M1", "M2"] },
  { id: "2", nom: "Gestion", classes: ["L1", "L2", "L3", "M1"] },
  { id: "3", nom: "Commerce", classes: ["L1", "L2", "L3"] },
  { id: "4", nom: "Communication", classes: ["L1", "L2", "L3"] },
];

export const STUDENTS: Student[] = [
  { id: "1", nom: "Rakoto", prenom: "Jean", matricule: "GSI-2024-001", filiere: "Informatique", classe: "L2", telephone: "034 12 345 67", email: "jean.rakoto@gsi.mg", statut: "payé", montantDu: 1200000, montantPaye: 1200000 },
  { id: "2", nom: "Rabe", prenom: "Marie", matricule: "GSI-2024-002", filiere: "Gestion", classe: "M1", telephone: "033 98 765 43", email: "marie.rabe@gsi.mg", statut: "impayé", montantDu: 1500000, montantPaye: 0 },
  { id: "3", nom: "Andria", prenom: "Paul", matricule: "GSI-2024-003", filiere: "Commerce", classe: "L1", telephone: "032 11 223 34", email: "paul.andria@gsi.mg", statut: "en_attente", montantDu: 900000, montantPaye: 450000 },
  { id: "4", nom: "Rasoa", prenom: "Hanta", matricule: "GSI-2024-004", filiere: "Informatique", classe: "L3", telephone: "034 55 678 90", email: "hanta.rasoa@gsi.mg", statut: "payé", montantDu: 1200000, montantPaye: 1200000 },
  { id: "5", nom: "Rajao", prenom: "Fidy", matricule: "GSI-2024-005", filiere: "Communication", classe: "L2", telephone: "033 44 556 67", email: "fidy.rajao@gsi.mg", statut: "impayé", montantDu: 950000, montantPaye: 0 },
  { id: "6", nom: "Randr", prenom: "Vola", matricule: "GSI-2024-006", filiere: "Gestion", classe: "L1", telephone: "032 77 889 90", email: "vola.randr@gsi.mg", statut: "en_attente", montantDu: 900000, montantPaye: 300000 },
  { id: "7", nom: "Rasoar", prenom: "Lanto", matricule: "GSI-2024-007", filiere: "Informatique", classe: "M1", telephone: "034 22 334 45", email: "lanto.rasoar@gsi.mg", statut: "payé", montantDu: 1500000, montantPaye: 1500000 },
  { id: "8", nom: "Ramb", prenom: "Nivo", matricule: "GSI-2024-008", filiere: "Commerce", classe: "L3", telephone: "033 66 778 89", email: "nivo.ramb@gsi.mg", statut: "impayé", montantDu: 900000, montantPaye: 0 },
];

export const PAYMENTS: Payment[] = [
  { id: "1", reference: "REC-2024-0001", etudiantId: "1", etudiantNom: "Rakoto Jean", montant: 1200000, date: "2024-09-05", mode: "MVola", statut: "payé", agent: "Agent Dupont", filiere: "Informatique", classe: "L2" },
  { id: "2", reference: "REC-2024-0002", etudiantId: "3", etudiantNom: "Andria Paul", montant: 450000, date: "2024-09-10", mode: "espèces", statut: "payé", agent: "Agent Martin", filiere: "Commerce", classe: "L1" },
  { id: "3", reference: "REC-2024-0003", etudiantId: "4", etudiantNom: "Rasoa Hanta", montant: 1200000, date: "2024-09-12", mode: "Orange Money", statut: "payé", agent: "Agent Dupont", filiere: "Informatique", classe: "L3" },
  { id: "4", reference: "REC-2024-0004", etudiantId: "6", etudiantNom: "Randr Vola", montant: 300000, date: "2024-09-15", mode: "espèces", statut: "payé", agent: "Agent Rakoto", filiere: "Gestion", classe: "L1" },
  { id: "5", reference: "REC-2024-0005", etudiantId: "7", etudiantNom: "Rasoar Lanto", montant: 1500000, date: "2024-09-18", mode: "virement", statut: "payé", agent: "Agent Martin", filiere: "Informatique", classe: "M1" },
  { id: "6", reference: "REC-2024-0006", etudiantId: "2", etudiantNom: "Rabe Marie", montant: 0, date: "2024-10-01", mode: "espèces", statut: "impayé", agent: "—", filiere: "Gestion", classe: "M1" },
];

export const EXPENSES: Expense[] = [
  { id: "1", libelle: "Facture électricité octobre", categorie: "Charges", montant: 320000, date: "2024-10-03" },
  { id: "2", libelle: "Fournitures de bureau", categorie: "Matériel", montant: 85000, date: "2024-10-05" },
  { id: "3", libelle: "Salaires personnel", categorie: "RH", montant: 2500000, date: "2024-10-31" },
  { id: "4", libelle: "Maintenance informatique", categorie: "Matériel", montant: 150000, date: "2024-10-15" },
];

export const MONTHLY_DATA = [
  { mois: "Juil", encaisse: 3200000, impaye: 800000 },
  { mois: "Août", encaisse: 4100000, impaye: 1200000 },
  { mois: "Sept", encaisse: 5800000, impaye: 1500000 },
  { mois: "Oct",  encaisse: 4650000, impaye: 2050000 },
  { mois: "Nov",  encaisse: 3900000, impaye: 950000 },
  { mois: "Déc",  encaisse: 2100000, impaye: 600000 },
];

export const RECOVERY_BY_FILIERE = [
  { filiere: "Informatique", taux: 82 },
  { filiere: "Gestion", taux: 61 },
  { filiere: "Commerce", taux: 50 },
  { filiere: "Communication", taux: 45 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatMGA(amount: number): string {
  return new Intl.NumberFormat("fr-MG", { style: "decimal", minimumFractionDigits: 0 }).format(amount) + " Ar";
}

export function getStatusLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = { payé: "Payé", impayé: "Impayé", en_attente: "En attente" };
  return map[status];
}

export function getStatusClass(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    payé: "badge-paid",
    impayé: "badge-unpaid",
    en_attente: "badge-pending",
  };
  return map[status];
}

export const TOTAL_ENCAISSE = PAYMENTS.filter(p => p.statut === "payé").reduce((s, p) => s + p.montant, 0);
export const TOTAL_DU = STUDENTS.reduce((s, s2) => s + s2.montantDu, 0);
export const TOTAL_IMPAYE = TOTAL_DU - TOTAL_ENCAISSE;
export const TAUX_RECOUVREMENT = Math.round((TOTAL_ENCAISSE / TOTAL_DU) * 100);
