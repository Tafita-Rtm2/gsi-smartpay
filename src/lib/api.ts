// We now use our local proxy to hide the real database URL and add a layer of security
// All authentication is now handled via secure HTTP-only cookies on the server
export const API_BASE = "/api/db";

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
  campus?: string;
  filiere?: string;
  niveau?: string;
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

function parseArray<T>(data: Record<string, unknown> | unknown[]): T[] {
  if (Array.isArray(data)) return data as T[];
  for (const key of ["data", "documents", "results", "items", "records", "list"]) {
    const val = (data as Record<string, unknown>)[key];
    if (Array.isArray(val)) return val as T[];
  }
  return [];
}

async function apiGet<T>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.error) return [];
    return parseArray<T>(data);
  } catch (e) {
    console.error(`apiGet(${collection}):`, e);
    return [];
  }
}

async function apiPost<T>(collection: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return (data.document || data.data || data) as T;
  } catch (e) {
    console.error(`apiPost(${collection}):`, e);
    return null;
  }
}

async function apiPatch(collection: string, id: string, body: object): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error(`apiPatch(${collection}/${id}):`, e);
    return false;
  }
}

export async function fetchStudents(): Promise<DBStudent[]> {
  const all = await apiGet<DBStudent>("users");
  // Deduplicate by id/_id to avoid showing same student multiple times
  const seen = new Set<string>();
  return all.filter(s => {
    const id = s.id || s._id || "";
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export async function fetchEcolages(): Promise<DBEcolage[]> {
  return apiGet<DBEcolage>("ecolage");
}

export async function createEcolage(data: Omit<DBEcolage, "id" | "_id">): Promise<DBEcolage | null> {
  return apiPost<DBEcolage>("ecolage", { ...data, createdAt: new Date().toISOString() });
}

export async function updateEcolage(id: string, data: Partial<DBEcolage>): Promise<boolean> {
  return apiPatch("ecolage", id, { ...data, updatedAt: new Date().toISOString() });
}

export async function updatePaiement(id: string, data: Partial<DBPaiement>): Promise<boolean> {
  return apiPatch("paiements", id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deletePaiement(id: string): Promise<boolean> {
  return apiDelete("paiements", id);
}

export async function deleteEcolage(id: string): Promise<boolean> {
  return apiDelete("ecolage", id);
}

async function apiDelete(collection: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
    });
    return res.ok;
  } catch (e) {
    console.error(`apiDelete(${collection}/${id}):`, e);
    return false;
  }
}

export async function fetchPaiements(): Promise<DBPaiement[]> {
  return apiGet<DBPaiement>("paiements");
}

export async function createPaiement(data: Omit<DBPaiement, "id" | "_id">): Promise<DBPaiement | null> {
  const prefix = (data.campus || "GSI").slice(0, 3).toUpperCase();
  const reference = `REC-${prefix}-${Date.now().toString().slice(-6)}`;
  return apiPost<DBPaiement>("paiements", { ...data, reference, createdAt: new Date().toISOString() });
}

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
