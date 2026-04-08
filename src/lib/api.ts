// We now use our local proxy to hide the real database URL and add a layer of security
// All authentication is now handled via secure HTTP-only cookies on the server
// Note: We use a relative path to support deployment in subdirectories (cPanel)
export const API_BASE = "/gsi-smartpay/api/db/";

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
  // Account properties for staff
  username?: string;
  password?: string;
  role?: string;
  actif?: boolean;
  createdBy?: string;
  etablissement?: string;
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
  montantMensuel?: number;
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
  transactionRef?: string;
  preuve?: string;
  preuveFilename?: string;
  agentId: string;
  agentNom: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBOtherPayment {
  id?: string;
  _id?: string;
  reference?: string;
  etudiantId: string;
  etudiantNom: string;
  matricule?: string;
  campus: string;
  filiere: string;
  classe: string;
  libelle: string;
  montant: number;
  date: string;
  mode: string;
  agentId: string;
  agentNom: string;
  note?: string;
  preuve?: string;
  preuveFilename?: string;
  transactionRef?: string;
  createdAt?: string;
}

export interface DBRequest {
  id?: string;
  _id?: string;
  type: "update_ecolage" | "delete_ecolage" | "update_paiement" | "delete_paiement";
  collection: "ecolage" | "paiements";
  targetId: string;
  payload: any;
  description: string;
  agentId: string;
  agentNom: string;
  campus: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DBExpense {
  id?: string;
  _id?: string;
  libelle: string;
  categorie: string;
  montant: number;
  date: string;
  etablissement: string;
  agentId: string;
  agentNom: string;
}

export interface DBFee {
  id?: string;
  _id?: string;
  campus: string;
  filiere: string;
  niveau: string;
  amount: number;
  monthlyAmount?: number;
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
    const res = await fetch(`${API_BASE}${collection}`, {
      method: "GET",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return parseArray<T>(data);
  } catch (e) {
    console.error(`apiGet(${collection}):`, e);
    return [];
  }
}

async function apiPost<T>(collection: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.document || data.data || data) as T;
  } catch (e) {
    console.error(`apiPost(${collection}):`, e);
    return null;
  }
}

async function apiPatch(collection: string, id: string, body: object): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${collection}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error(`apiPatch(${collection}/${id}):`, e);
    return false;
  }
}

async function apiDelete(collection: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${collection}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch (e) {
    console.error(`apiDelete(${collection}/${id}):`, e);
    return false;
  }
}

// -- ÉTUDIANTS --
export async function fetchStudents(): Promise<DBStudent[]> {
  const all = await apiGet<DBStudent>("users");
  const seen = new Set<string>();
  return all.filter(s => {
    const id = s.id || s._id || "";
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// -- ECOLAGES & PAIEMENTS --
export async function fetchEcolages(): Promise<DBEcolage[]> {
  return apiGet<DBEcolage>("ecolage");
}

export async function createEcolage(data: Omit<DBEcolage, "id" | "_id">): Promise<DBEcolage | null> {
  return apiPost<DBEcolage>("ecolage", { ...data, createdAt: new Date().toISOString() });
}

export async function updateEcolage(id: string, data: Partial<DBEcolage>): Promise<boolean> {
  return apiPatch("ecolage", id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteEcolage(id: string): Promise<boolean> {
  return apiDelete("ecolage", id);
}

export async function bulkUpdateEcolages(ops: { id: string, data: Partial<DBEcolage> }[]): Promise<void> {
  const body = {
    ops: ops.map(op => ({
      method: "PATCH",
      collection: "ecolage",
      id: op.id,
      data: { ...op.data, updatedAt: new Date().toISOString() }
    }))
  };
  await fetch(`${API_BASE}bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function bulkCreateEcolages(dataList: Omit<DBEcolage, "id" | "_id">[]): Promise<void> {
  const body = {
    ops: dataList.map(data => ({
      method: "POST",
      collection: "ecolage",
      data: { ...data, createdAt: new Date().toISOString() }
    }))
  };
  await fetch(`${API_BASE}bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function fetchPaiements(): Promise<DBPaiement[]> {
  return apiGet<DBPaiement>("paiements");
}

export async function createPaiement(data: Omit<DBPaiement, "id" | "_id">): Promise<DBPaiement | null> {
  const prefix = (data.campus || "GSI").slice(0, 3).toUpperCase();
  const reference = `REC-${prefix}-${Date.now().toString().slice(-6)}`;
  return apiPost<DBPaiement>("paiements", { ...data, reference, createdAt: new Date().toISOString() });
}

export async function updatePaiement(id: string, data: Partial<DBPaiement>): Promise<boolean> {
  return apiPatch("paiements", id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deletePaiement(id: string): Promise<boolean> {
  return apiDelete("paiements", id);
}

// -- AUTRES PAIEMENTS --
export async function fetchOtherPayments(): Promise<DBOtherPayment[]> {
  return apiGet<DBOtherPayment>("autres_paiements");
}

export async function createOtherPayment(data: Omit<DBOtherPayment, "id" | "_id">): Promise<DBOtherPayment | null> {
  const prefix = (data.campus || "GSI").slice(0, 3).toUpperCase();
  const reference = `DIV-${prefix}-${Date.now().toString().slice(-6)}`;
  return apiPost<DBOtherPayment>("autres_paiements", { ...data, reference, createdAt: new Date().toISOString() });
}

export async function deleteOtherPayment(id: string): Promise<boolean> {
  return apiDelete("autres_paiements", id);
}

// -- REQUESTS (APPROBATIONS) --
export async function fetchRequests(): Promise<DBRequest[]> {
  return apiGet<DBRequest>("requests");
}

export async function createRequest(data: Omit<DBRequest, "id" | "_id">): Promise<DBRequest | null> {
  return apiPost<DBRequest>("requests", { ...data, status: "pending", createdAt: new Date().toISOString() });
}

export async function updateRequest(id: string, data: Partial<DBRequest>): Promise<boolean> {
  return apiPatch("requests", id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteRequest(id: string): Promise<boolean> {
  return apiDelete("requests", id);
}

// -- STAFF (Dédié) --
export async function fetchStaff(): Promise<DBStudent[]> {
  return apiGet<DBStudent>("staff");
}

export async function createStaff(data: Partial<DBStudent>): Promise<DBStudent | null> {
  return apiPost<DBStudent>("staff", { ...data, createdAt: new Date().toISOString() });
}

export async function updateStaff(id: string, data: Partial<DBStudent>): Promise<boolean> {
  return apiPatch("staff", id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteStaff(id: string): Promise<boolean> {
  return apiDelete("staff", id);
}

// -- DÉPENSES (EXPENSES) --
export async function fetchExpenses(): Promise<DBExpense[]> {
  return apiGet<DBExpense>("expenses");
}

export async function createExpense(data: Omit<DBExpense, "id" | "_id">): Promise<DBExpense | null> {
  return apiPost<DBExpense>("expenses", { ...data });
}

export async function updateExpense(id: string, data: Partial<DBExpense>): Promise<boolean> {
  return apiPatch("expenses", id, { ...data });
}

export async function deleteExpense(id: string): Promise<boolean> {
  return apiDelete("expenses", id);
}

// -- CONFIGURATION ÉCOLAGES (FEES) --
export async function fetchFees(): Promise<DBFee[]> {
  return apiGet<DBFee>("fees");
}

export async function saveFee(data: Omit<DBFee, "id" | "_id">): Promise<DBFee | null> {
  const all = await fetchFees();
  const existing = all.find(f => f.campus === data.campus && f.filiere === data.filiere && f.niveau === data.niveau);
  if (existing) {
    const id = existing.id || existing._id || "";
    await apiPatch("fees", id, data);
    return { ...existing, ...data };
  }
  return apiPost<DBFee>("fees", { ...data });
}

export async function saveFeesBulk(dataList: Omit<DBFee, "id" | "_id">[]): Promise<void> {
  const all = await fetchFees();
  for (const data of dataList) {
    const existing = all.find(f => f.campus === data.campus && f.filiere === data.filiere && f.niveau === data.niveau);
    if (existing) {
      const id = existing.id || existing._id || "";
      await apiPatch("fees", id, data);
    } else {
      await apiPost<DBFee>("fees", { ...data });
    }
  }
}

export async function deleteFee(id: string): Promise<boolean> {
  return apiDelete("fees", id);
}

// -- HELPERS --
export function getStudentId(s: DBStudent): string { return s.id || s._id || ""; }
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

/**
 * Calcule l'état du paiement de l'écolage.
 * Basé sur l'année scolaire (Octobre à Septembre).
 * "paye" si l'étudiant est à jour pour le mois actuel ou a tout payé.
 * "en_attente" si un paiement partiel a été fait mais n'est pas à jour.
 * "impaye" si aucun paiement n'a été fait.
 */
export function calculateIntelligentStatus(paye: number, du: number, mensuel?: number): "paye" | "impaye" | "en_attente" {
  if (du <= 0) return "impaye";
  if (paye >= du && du > 0) return "paye";
  if (paye <= 0) return "impaye";

  if (!mensuel || mensuel <= 0) {
    return "en_attente";
  }

  // Calcul basé sur l'exemple utilisateur : Mars (Mois 1), Avril (Mois 2)...
  // Si on est en Mars, on doit avoir payé 1 * mensuel.
  // Si on est en Avril, on doit avoir payé 2 * mensuel.
  const now = new Date();
  const month = now.getMonth(); // 0=Jan, 1=Fev, 2=Mar...

  // Index relatif à Mars (Mars = 0)
  // Formule: (month - 2 + 12) % 12
  // Note: On utilise +1 pour inclure le mois en cours
  const relMonth = (month - 2 + 12) % 12;

  // Montant attendu à ce jour (cumulative)
  const expectedToDate = (relMonth + 1) * mensuel;

  if (paye >= expectedToDate) return "paye";

  return "impaye";
}
