// ─── Établissements ───────────────────────────────────────────────────────────
export type EtablissementId = "analakely" | "antsirabe" | "tamatave" | "bypass";

export const ETABLISSEMENTS: Record<EtablissementId, { nom: string; couleur: string; filieres: string[] }> = {
  analakely: {
    nom: "GSI Internationale Analakely",
    couleur: "#7c3aed",
    filieres: [
      "Tourisme, Voyage & Hôtellerie",
      "Communication, Multimédia & Journalisme",
      "Informatique, Électronique & Robotique",
      "Gestion Management - Finance & Compta",
      "Gestion Management - Marketing Digital",
      "Paramédicaux - Sage-femme",
      "Paramédicaux - Infirmier",
    ],
  },
  antsirabe: {
    nom: "GSI Antsirabe",
    couleur: "#0f61f5",
    filieres: [
      "Informatique & Conception Web",
      "Gestion & Management RH",
      "Droit & Relations Internationales",
      "Tourisme, Voyage & Hôtellerie",
    ],
  },
  tamatave: {
    nom: "GSI Tamatave",
    couleur: "#0891b2",
    filieres: [
      "Management et Organisation des Affaires",
      "Droit et Relations Internationales",
      "Tourisme, Voyage et Hôtellerie",
      "Technologies Informatiques & Télécommunications",
      "Communication, Multimédia et Journalisme",
    ],
  },
  bypass: {
    nom: "GSI Bypass",
    couleur: "#059669",
    filieres: [
      "Paramédicaux - Sage-femme",
      "Paramédicaux - Infirmier",
      "Aide Soignant",
    ],
  },
};

export const CLASSES = ["L1", "L2", "L3", "M1", "M2"];
export const PAYMENT_MODES = ["espèces", "MVola", "Orange Money", "Airtel Money", "virement"];
export const EXPENSE_CATS = ["Charges", "Matériel", "RH", "Infrastructure", "Autre"];

// ─── Types ────────────────────────────────────────────────────────────────────
export type Role = "admin" | "comptable" | "agent";
export type PaymentStatus = "payé" | "impayé" | "en_attente";

export interface User {
  id: string;
  nom: string;
  prenom: string;
  username: string;
  password: string;
  role: Role;
  etablissement: EtablissementId;
  actif: boolean;
  createdAt: string;
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
  etablissement: EtablissementId;
}

export interface Payment {
  id: string;
  reference: string;
  etudiantId: string;
  etudiantNom: string;
  montant: number;
  date: string;
  mode: string;
  statut: PaymentStatus;
  agentId: string;
  agentNom: string;
  filiere: string;
  classe: string;
  etablissement: EtablissementId;
}

export interface Expense {
  id: string;
  libelle: string;
  categorie: string;
  montant: number;
  date: string;
  agentId: string;
  agentNom: string;
  etablissement: EtablissementId;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_USERS: User[] = [
  { id: "u1", nom: "Admin", prenom: "GSI", username: "admin.analakely", password: "admin123", role: "admin", etablissement: "analakely", actif: true, createdAt: "2024-09-01" },
  { id: "u2", nom: "Rabe", prenom: "Hanta", username: "hanta.analakely", password: "hanta123", role: "comptable", etablissement: "analakely", actif: true, createdAt: "2024-09-02" },
  { id: "u3", nom: "Andria", prenom: "Paul", username: "paul.antsirabe", password: "paul123", role: "agent", etablissement: "antsirabe", actif: true, createdAt: "2024-09-03" },
  { id: "u4", nom: "Rasoa", prenom: "Vola", username: "vola.tamatave", password: "vola123", role: "comptable", etablissement: "tamatave", actif: true, createdAt: "2024-09-04" },
  { id: "u5", nom: "Rajao", prenom: "Fidy", username: "fidy.bypass", password: "fidy123", role: "agent", etablissement: "bypass", actif: true, createdAt: "2024-09-05" },
];

const SEED_STUDENTS: Student[] = [
  { id: "s1", nom: "Rakoto", prenom: "Jean", matricule: "ANA-2024-001", filiere: "Informatique, Électronique & Robotique", classe: "L2", telephone: "034 12 345 67", email: "jean@gsi.mg", statut: "payé", montantDu: 1200000, montantPaye: 1200000, etablissement: "analakely" },
  { id: "s2", nom: "Rabe", prenom: "Marie", matricule: "ANA-2024-002", filiere: "Gestion Management - Finance & Compta", classe: "M1", telephone: "033 98 765 43", email: "marie@gsi.mg", statut: "impayé", montantDu: 1500000, montantPaye: 0, etablissement: "analakely" },
  { id: "s3", nom: "Andria", prenom: "Paul", matricule: "ANT-2024-001", filiere: "Informatique & Conception Web", classe: "L1", telephone: "032 11 223 34", email: "paul@gsi.mg", statut: "en_attente", montantDu: 900000, montantPaye: 450000, etablissement: "antsirabe" },
  { id: "s4", nom: "Rasoa", prenom: "Hanta", matricule: "ANT-2024-002", filiere: "Gestion & Management RH", classe: "L3", telephone: "034 55 678 90", email: "hanta@gsi.mg", statut: "payé", montantDu: 1200000, montantPaye: 1200000, etablissement: "antsirabe" },
  { id: "s5", nom: "Rajao", prenom: "Fidy", matricule: "TAM-2024-001", filiere: "Communication, Multimédia et Journalisme", classe: "L2", telephone: "033 44 556 67", email: "fidy@gsi.mg", statut: "impayé", montantDu: 950000, montantPaye: 0, etablissement: "tamatave" },
  { id: "s6", nom: "Randr", prenom: "Vola", matricule: "TAM-2024-002", filiere: "Management et Organisation des Affaires", classe: "L1", telephone: "032 77 889 90", email: "vola@gsi.mg", statut: "en_attente", montantDu: 900000, montantPaye: 300000, etablissement: "tamatave" },
  { id: "s7", nom: "Rasoar", prenom: "Lanto", matricule: "BYP-2024-001", filiere: "Paramédicaux - Sage-femme", classe: "L2", telephone: "034 22 334 45", email: "lanto@gsi.mg", statut: "payé", montantDu: 1500000, montantPaye: 1500000, etablissement: "bypass" },
  { id: "s8", nom: "Ramb", prenom: "Nivo", matricule: "BYP-2024-002", filiere: "Aide Soignant", classe: "L1", telephone: "033 66 778 89", email: "nivo@gsi.mg", statut: "impayé", montantDu: 900000, montantPaye: 0, etablissement: "bypass" },
];

const SEED_PAYMENTS: Payment[] = [
  { id: "p1", reference: "ANA-REC-0001", etudiantId: "s1", etudiantNom: "Rakoto Jean", montant: 1200000, date: "2024-09-05", mode: "MVola", statut: "payé", agentId: "u2", agentNom: "Hanta Rabe", filiere: "Informatique, Électronique & Robotique", classe: "L2", etablissement: "analakely" },
  { id: "p2", reference: "ANT-REC-0001", etudiantId: "s3", etudiantNom: "Andria Paul", montant: 450000, date: "2024-09-10", mode: "espèces", statut: "payé", agentId: "u3", agentNom: "Paul Andria", filiere: "Informatique & Conception Web", classe: "L1", etablissement: "antsirabe" },
  { id: "p3", reference: "ANT-REC-0002", etudiantId: "s4", etudiantNom: "Rasoa Hanta", montant: 1200000, date: "2024-09-12", mode: "Orange Money", statut: "payé", agentId: "u3", agentNom: "Paul Andria", filiere: "Gestion & Management RH", classe: "L3", etablissement: "antsirabe" },
  { id: "p4", reference: "TAM-REC-0001", etudiantId: "s6", etudiantNom: "Randr Vola", montant: 300000, date: "2024-09-15", mode: "espèces", statut: "payé", agentId: "u4", agentNom: "Vola Rasoa", filiere: "Management et Organisation des Affaires", classe: "L1", etablissement: "tamatave" },
  { id: "p5", reference: "BYP-REC-0001", etudiantId: "s7", etudiantNom: "Rasoar Lanto", montant: 1500000, date: "2024-09-18", mode: "virement", statut: "payé", agentId: "u5", agentNom: "Fidy Rajao", filiere: "Paramédicaux - Sage-femme", classe: "L2", etablissement: "bypass" },
];

const SEED_EXPENSES: Expense[] = [
  { id: "e1", libelle: "Facture électricité", categorie: "Charges", montant: 320000, date: "2024-10-03", agentId: "u2", agentNom: "Hanta Rabe", etablissement: "analakely" },
  { id: "e2", libelle: "Fournitures bureau", categorie: "Matériel", montant: 85000, date: "2024-10-05", agentId: "u3", agentNom: "Paul Andria", etablissement: "antsirabe" },
  { id: "e3", libelle: "Salaires personnel", categorie: "RH", montant: 2500000, date: "2024-10-31", agentId: "u4", agentNom: "Vola Rasoa", etablissement: "tamatave" },
];

// ─── Store singleton ──────────────────────────────────────────────────────────
class Store {
  users: User[] = [...SEED_USERS];
  students: Student[] = [...SEED_STUDENTS];
  payments: Payment[] = [...SEED_PAYMENTS];
  expenses: Expense[] = [...SEED_EXPENSES];
  currentUser: User | null = null;
  adminUnlocked: boolean = false;

  // ── Auth ──
  login(username: string, password: string, etablissement: EtablissementId): User | null {
    const u = this.users.find(
      u => u.username === username && u.password === password &&
        u.etablissement === etablissement && u.actif
    );
    if (u) this.currentUser = u;
    return u ?? null;
  }
  logout() { this.currentUser = null; }
  unlockAdmin(pwd: string) { this.adminUnlocked = pwd === "Nina GSI"; return this.adminUnlocked; }
  lockAdmin() { this.adminUnlocked = false; }

  // ── Users ──
  getUsers(etab?: EtablissementId) { return etab ? this.users.filter(u => u.etablissement === etab) : [...this.users]; }
  addUser(data: Omit<User, "id" | "createdAt">): User {
    const u: User = { ...data, id: `u${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    this.users.push(u); return u;
  }
  updateUser(id: string, data: Partial<User>) { this.users = this.users.map(u => u.id === id ? { ...u, ...data } : u); }
  deleteUser(id: string) { this.users = this.users.filter(u => u.id !== id); }
  toggleUser(id: string) { this.users = this.users.map(u => u.id === id ? { ...u, actif: !u.actif } : u); }

  // ── Students ──
  getStudents(etab?: EtablissementId) { return etab ? this.students.filter(s => s.etablissement === etab) : [...this.students]; }
  addStudent(data: Omit<Student, "id">): Student {
    const s: Student = { ...data, id: `s${Date.now()}` };
    this.students.push(s); return s;
  }
  updateStudent(id: string, data: Partial<Student>) { this.students = this.students.map(s => s.id === id ? { ...s, ...data } : s); }
  deleteStudent(id: string) { this.students = this.students.filter(s => s.id !== id); }

  // ── Payments ──
  getPayments(etab?: EtablissementId) { return etab ? this.payments.filter(p => p.etablissement === etab) : [...this.payments]; }
  addPayment(data: Omit<Payment, "id" | "reference">): Payment {
    const prefix = data.etablissement.slice(0, 3).toUpperCase();
    const n = this.payments.filter(p => p.etablissement === data.etablissement).length + 1;
    const p: Payment = { ...data, id: `p${Date.now()}`, reference: `${prefix}-REC-${String(n).padStart(4, "0")}` };
    this.payments.push(p);
    const st = this.students.find(s => s.id === data.etudiantId);
    if (st) {
      const np = st.montantPaye + data.montant;
      this.updateStudent(st.id, { montantPaye: np, statut: np >= st.montantDu ? "payé" : "en_attente" });
    }
    return p;
  }

  // ── Expenses ──
  getExpenses(etab?: EtablissementId) { return etab ? this.expenses.filter(e => e.etablissement === etab) : [...this.expenses]; }
  addExpense(data: Omit<Expense, "id">): Expense {
    const e: Expense = { ...data, id: `e${Date.now()}` };
    this.expenses.push(e); return e;
  }
  deleteExpense(id: string) { this.expenses = this.expenses.filter(e => e.id !== id); }

  // ── Stats ──
  getStats(etab?: EtablissementId) {
    const sts = this.getStudents(etab);
    const pays = this.getPayments(etab).filter(p => p.statut === "payé");
    const exps = this.getExpenses(etab);
    const enc = pays.reduce((s, p) => s + p.montant, 0);
    const du = sts.reduce((s, st) => s + st.montantDu, 0);
    const dep = exps.reduce((s, e) => s + e.montant, 0);
    return {
      totalEncaisse: enc, totalDu: du, totalImpaye: du - enc,
      totalDepenses: dep, resultatNet: enc - dep,
      tauxRecouvrement: du > 0 ? Math.round((enc / du) * 100) : 0,
      nbEtudiants: sts.length,
      nbPayes: sts.filter(s => s.statut === "payé").length,
      nbImpayes: sts.filter(s => s.statut === "impayé").length,
      nbEnAttente: sts.filter(s => s.statut === "en_attente").length,
    };
  }
}

export const store = new Store();

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const formatMGA = (n: number) => new Intl.NumberFormat("fr-MG").format(n) + " Ar";
export const getStatusLabel = (s: PaymentStatus) => ({ payé: "Payé", impayé: "Impayé", en_attente: "En attente" }[s]);
export const getStatusClass = (s: PaymentStatus) => ({ payé: "badge-paid", impayé: "badge-unpaid", en_attente: "badge-pending" }[s]);
