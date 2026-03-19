// ─── GSI Database API Client ─────────────────────────────────────────────────
// Base: https://groupegsi.mg/rtmggmg/api

export const API_BASE = "https://groupegsi.mg/rtmggmg/api";

// ─── Types from the real database ────────────────────────────────────────────

export interface DBStudent {
  id?: string;
  _id?: string;
  fullName?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  matricule?: string;
  contact?: string;
  telephone?: string;
  campus?: string;        // etablissement
  filiere?: string;
  niveau?: string;        // classe (L1, L2...)
  password?: string;
  photo?: string;
  annee?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBEcolage {
  id?: string;
  _id?: string;
  etudiantId: string;
  etudiantNom: string;
  matricule?: string;
  campus: string;
  filiere: string;
  classe: string;
  montantDu: number;
  montantPaye: number;
  statut: "paye" | "impaye" | "en_attente";
  paiements?: DBPaiement[];
  annee?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBPaiement {
  id?: string;
  _id?: string;
  reference?: string;
  etudiantId: string;
  etudiantNom: string;
  matricule?: string;
  campus: string;
  filiere: string;
  classe: string;
  montant: number;
  date: string;
  mode: string;
  agentId: string;
  agentNom: string;
  note?: string;
  createdAt?: string;
}

// ─── Generic API helpers ──────────────────────────────────────────────────────

async function apiGet<T>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}/${collection}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GET ${collection} failed: ${res.status}`);
    const data = await res.json();
    // API may return array directly or { data: [...] }
    return Array.isArray(data) ? data : data.data || data.documents || [];
  } catch (e) {
    console.error("API GET error:", e);
    return [];
  }
}

async function apiPost<T>(collection: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${collection} failed: ${res.status}`);
    const data = await res.json();
    return data.document || data.data || data;
  } catch (e) {
    console.error("API POST error:", e);
    return null;
  }
}

async function apiPatch(collection: string, id: string, body: object): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error("API PATCH error:", e);
    return false;
  }
}

async function apiDelete(collection: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (e) {
    console.error("API DELETE error:", e);
    return false;
  }
}

// ─── Students (users collection) ─────────────────────────────────────────────

export async function fetchStudents(): Promise<DBStudent[]> {
  return apiGet<DBStudent>("users");
}

// ─── Ecolages ─────────────────────────────────────────────────────────────────

export async function fetchEcolages(): Promise<DBEcolage[]> {
  return apiGet<DBEcolage>("ecolage");
}

export async function createEcolage(data: Omit<DBEcolage, "id" | "_id">): Promise<DBEcolage | null> {
  return apiPost<DBEcolage>("ecolage", { ...data, createdAt: new Date().toISOString() });
}

export async function updateEcolage(id: string, data: Partial<DBEcolage>): Promise<boolean> {
  return apiPatch("ecolage", id, { ...data, updatedAt: new Date().toISOString() });
}

// ─── Paiements ────────────────────────────────────────────────────────────────

export async function fetchPaiements(): Promise<DBPaiement[]> {
  return apiGet<DBPaiement>("paiements");
}

export async function createPaiement(data: Omit<DBPaiement, "id" | "_id">): Promise<DBPaiement | null> {
  const count = Math.floor(Math.random() * 9000) + 1000;
  const prefix = data.campus.slice(0, 3).toUpperCase();
  const reference = `REC-${prefix}-${count}`;
  return apiPost<DBPaiement>("paiements", {
    ...data,
    reference,
    createdAt: new Date().toISOString(),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStudentId(s: DBStudent): string {
  return s.id || s._id || "";
}

export function getStudentName(s: DBStudent): string {
  if (s.fullName) return s.fullName;
  return `${s.prenom || ""} ${s.nom || ""}`.trim();
}

export function getStudentCampus(s: DBStudent): string {
  return (s.campus || "").toLowerCase();
}

export function formatMGA(amount: number): string {
  return new Intl.NumberFormat("fr-MG").format(amount) + " Ar";
}
