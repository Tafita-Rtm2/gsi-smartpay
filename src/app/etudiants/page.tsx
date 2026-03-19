"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, Users, RefreshCw, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS } from "@/lib/data";
import {
  fetchStudents, fetchEcolages, createEcolage,
  DBStudent, DBEcolage,
  getStudentId, getStudentName, getStudentCampus, formatMGA
} from "@/lib/api";
import clsx from "clsx";

const STATUT_COLORS = {
  paye: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  impaye: "bg-red-100 text-red-700 border border-red-200",
  en_attente: "bg-amber-100 text-amber-700 border border-amber-200",
};
const STATUT_LABELS = { paye: "Paye", impaye: "Impaye", en_attente: "En attente" };

export default function EtudiantsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [ecolages, setEcolages] = useState<DBEcolage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("Toutes");
  const [statutFilter, setStatutFilter] = useState("Tous");

  // Ecolage modal
  const [showEcolage, setShowEcolage] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<DBStudent | null>(null);
  const [ecolageForm, setEcolageForm] = useState({ montantDu: "", annee: "2024/2025", statut: "impaye" as "impaye" | "paye" | "en_attente" });
  const [saving, setSaving] = useState(false);

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [studentsData, ecolagesData] = await Promise.all([fetchStudents(), fetchEcolages()]);
    setStudents(studentsData);
    setEcolages(ecolagesData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter students by campus
  const campusStudents = students.filter(s => {
    if (isAdmin) return true;
    const campus = getStudentCampus(s);
    const myEtab = currentUser?.etablissement || "";
    return campus.includes(myEtab) || campus.includes(myEtab.slice(0, 4));
  });

  const filieres = etabInfo ? etabInfo.filieres : [];

  const filtered = campusStudents.filter(s => {
    const q = search.toLowerCase();
    const name = getStudentName(s).toLowerCase();
    const matchSearch = name.includes(q) || (s.matricule || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q);
    const matchFiliere = filiereFilter === "Toutes" || s.filiere === filiereFilter;
    const ecolage = ecolages.find(e => e.etudiantId === getStudentId(s));
    const matchStatut = statutFilter === "Tous" || (ecolage?.statut || "impaye") === statutFilter;
    return matchSearch && matchFiliere && matchStatut;
  });

  const getEcolage = (s: DBStudent) => ecolages.find(e => e.etudiantId === getStudentId(s));

  const handleSetEcolage = async () => {
    if (!selectedStudent || !ecolageForm.montantDu) return;
    setSaving(true);
    const existing = getEcolage(selectedStudent);
    const payload: Omit<DBEcolage, "id" | "_id"> = {
      etudiantId: getStudentId(selectedStudent),
      etudiantNom: getStudentName(selectedStudent),
      matricule: selectedStudent.matricule,
      campus: selectedStudent.campus || currentUser?.etablissement || "",
      filiere: selectedStudent.filiere || "",
      classe: selectedStudent.niveau || "L1",
      montantDu: Number(ecolageForm.montantDu),
      montantPaye: existing?.montantPaye || 0,
      statut: ecolageForm.statut,
      annee: ecolageForm.annee,
    };
    if (!existing) {
      await createEcolage(payload);
    }
    await load();
    setSaving(false);
    setShowEcolage(false);
    setSelectedStudent(null);
  };

  const totalDu = ecolages.filter(e => campusStudents.some(s => getStudentId(s) === e.etudiantId)).reduce((sum, e) => sum + e.montantDu, 0);
  const totalPaye = ecolages.filter(e => campusStudents.some(s => getStudentId(s) === e.etudiantId)).reduce((sum, e) => sum + e.montantPaye, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Etudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Chargement..." : `${campusStudents.length} etudiants`}
            {etabInfo && <span className="ml-2 font-medium" style={{ color: etabInfo.color }}>— {etabInfo.label}</span>}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <a href="https://groupegsi.mg/rtmggmg/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors">
            <ExternalLink size={15} /> Ajouter un etudiant
          </a>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total etudiants", value: campusStudents.length, color: "text-slate-900" },
          { label: "Avec ecolage", value: ecolages.filter(e => campusStudents.some(s => getStudentId(s) === e.etudiantId)).length, color: "text-brand-700" },
          { label: "Total du", value: formatMGA(totalDu), color: "text-slate-700" },
          { label: "Total paye", value: formatMGA(totalPaye), color: "text-emerald-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className={`text-lg font-bold ${color} truncate`}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher par nom, matricule, email..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          {!isAdmin && (
            <div className="relative">
              <select value={filiereFilter} onChange={e => setFiliereFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white max-w-[200px]">
                <option>Toutes</option>
                {filieres.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
              <option>Tous</option>
              <option value="paye">Paye</option>
              <option value="impaye">Impaye</option>
              <option value="en_attente">En attente</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Chargement depuis la base de donnees...</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Etudiant", "Email / Matricule", "Campus", "Filiere", "Niveau", "Ecolage du", "Ecolage paye", "Statut", ""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(s => {
                    const ecolage = getEcolage(s);
                    const statut = ecolage?.statut || "impaye";
                    return (
                      <tr key={getStudentId(s)} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{getStudentName(s)}</div>
                          <div className="text-xs text-slate-400">{s.contact || s.telephone || ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-500">{s.email || "—"}</div>
                          <div className="font-mono text-xs text-slate-400">{s.matricule || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[100px] truncate">{s.campus || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{s.filiere || "—"}</td>
                        <td className="px-4 py-3">
                          {s.niveau && <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.niveau}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{ecolage ? formatMGA(ecolage.montantDu) : "—"}</td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold text-xs">{ecolage ? formatMGA(ecolage.montantPaye) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", STATUT_COLORS[statut])}>
                            {STATUT_LABELS[statut]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setSelectedStudent(s); setShowEcolage(true); }}
                            className="text-xs text-brand-600 hover:underline font-medium whitespace-nowrap">
                            {ecolage ? "Voir ecolage" : "Definir ecolage"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && !loading && (
                <div className="py-12 text-center text-slate-400">
                  <Users size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucun etudiant trouve</p>
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(s => {
                const ecolage = getEcolage(s);
                const statut = ecolage?.statut || "impaye";
                return (
                  <div key={getStudentId(s)} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{getStudentName(s)}</div>
                        <div className="text-xs text-slate-400">{s.email || s.matricule || ""}</div>
                      </div>
                      <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0", STATUT_COLORS[statut])}>
                        {STATUT_LABELS[statut]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {s.filiere && <span className="truncate max-w-[200px]">{s.filiere}</span>}
                      {s.niveau && <span className="bg-brand-50 text-brand-700 font-semibold px-1.5 py-0.5 rounded-full">{s.niveau}</span>}
                    </div>
                    {ecolage && (
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-500">Du: <span className="font-bold text-slate-700">{formatMGA(ecolage.montantDu)}</span></span>
                        <span className="text-slate-500">Paye: <span className="font-bold text-emerald-600">{formatMGA(ecolage.montantPaye)}</span></span>
                      </div>
                    )}
                    <button onClick={() => { setSelectedStudent(s); setShowEcolage(true); }}
                      className="text-xs text-brand-600 font-medium hover:underline">
                      {ecolage ? "Voir / modifier ecolage" : "Definir ecolage"}
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="py-10 text-center text-slate-400 text-sm">Aucun etudiant</div>}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-slate-400 text-right">{filtered.length} resultat(s) — Donnees: groupegsi.mg</p>

      {/* Ecolage Modal */}
      {showEcolage && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Ecolage</h2>
              <button onClick={() => { setShowEcolage(false); setSelectedStudent(null); }} className="text-slate-400 hover:text-slate-600 text-xl">x</button>
            </div>

            {/* Student info */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-1">
              <div className="font-bold text-slate-900">{getStudentName(selectedStudent)}</div>
              <div className="text-xs text-slate-500">{selectedStudent.email}</div>
              <div className="flex gap-3 text-xs mt-1">
                <span className="font-mono text-slate-400">{selectedStudent.matricule || "—"}</span>
                {selectedStudent.niveau && <span className="bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">{selectedStudent.niveau}</span>}
              </div>
              <div className="text-xs text-slate-500 truncate">{selectedStudent.filiere}</div>
            </div>

            {/* Existing ecolage */}
            {(() => {
              const existing = getEcolage(selectedStudent);
              if (existing) return (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Ecolage enregistre</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Montant du", value: formatMGA(existing.montantDu), color: "text-slate-700" },
                      { label: "Montant paye", value: formatMGA(existing.montantPaye), color: "text-emerald-700" },
                      { label: "Reste a payer", value: formatMGA(existing.montantDu - existing.montantPaye), color: "text-red-700" },
                      { label: "Statut", value: STATUT_LABELS[existing.statut], color: "text-slate-700" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-3">
                        <div className="text-xs text-slate-400">{label}</div>
                        <div className={`text-sm font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 text-center">Pour modifier, utilisez la page Paiements</div>
                </div>
              );
              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Definir le montant d'ecolage</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Montant total du (Ar)</label>
                    <input type="number" placeholder="Ex: 1200000"
                      value={ecolageForm.montantDu}
                      onChange={e => setEcolageForm(f => ({ ...f, montantDu: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Annee</label>
                      <select value={ecolageForm.annee} onChange={e => setEcolageForm(f => ({ ...f, annee: e.target.value }))}
                        className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                        <option>2024/2025</option>
                        <option>2025/2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Statut initial</label>
                      <select value={ecolageForm.statut} onChange={e => setEcolageForm(f => ({ ...f, statut: e.target.value as "impaye" | "paye" | "en_attente" }))}
                        className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                        <option value="impaye">Impaye</option>
                        <option value="en_attente">En attente</option>
                        <option value="paye">Paye</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setShowEcolage(false); setSelectedStudent(null); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      Annuler
                    </button>
                    <button onClick={handleSetEcolage} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-600/20 disabled:opacity-60">
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
