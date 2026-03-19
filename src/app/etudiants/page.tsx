"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, Users, RefreshCw, ExternalLink, Info, X, Phone, Mail, GraduationCap, CreditCard, Calendar, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS } from "@/lib/data";
import {
  fetchStudents, fetchEcolages, createEcolage,
  DBStudent, DBEcolage,
  getStudentId, getStudentName, getStudentCampus, formatMGA
} from "@/lib/api";
import clsx from "clsx";

const STATUT_COLORS = {
  paye:       "bg-emerald-100 text-emerald-700 border border-emerald-200",
  impaye:     "bg-red-100 text-red-700 border border-red-200",
  en_attente: "bg-amber-100 text-amber-700 border border-amber-200",
};
const STATUT_LABELS = { paye: "Paye", impaye: "Impaye", en_attente: "En attente" };
const STATUT_DOT = { paye: "bg-emerald-500", impaye: "bg-red-500", en_attente: "bg-amber-500" };

export default function EtudiantsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [ecolages, setEcolages] = useState<DBEcolage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("Toutes");
  const [statutFilter, setStatutFilter] = useState("Tous");

  // Profile modal
  const [profileStudent, setProfileStudent] = useState<DBStudent | null>(null);

  // Ecolage modal
  const [showEcolage, setShowEcolage] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<DBStudent | null>(null);
  const [ecolageForm, setEcolageForm] = useState({
    montantDu: "", annee: "2024/2025",
    statut: "impaye" as "impaye" | "paye" | "en_attente"
  });
  const [saving, setSaving] = useState(false);

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [studentsData, ecolagesData] = await Promise.all([fetchStudents(), fetchEcolages()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const filtered = studentsData.filter(s => {
        const campus = getStudentCampus(s);
        return campus.includes(myEtab) || campus.includes(myEtab.slice(0,4));
      });
      const myIds = new Set(filtered.map(s => getStudentId(s)));
      setStudents(filtered);
      setEcolages(ecolagesData.filter(e => myIds.has(e.etudiantId)));
    } else {
      setStudents(studentsData);
      setEcolages(ecolagesData);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filieres = etabInfo ? etabInfo.filieres : [];

  const getEcolage = (s: DBStudent) => ecolages.find(e => e.etudiantId === getStudentId(s));

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const name = getStudentName(s).toLowerCase();
    const matchSearch = name.includes(q) || (s.matricule||"").toLowerCase().includes(q) || (s.email||"").toLowerCase().includes(q);
    const matchFiliere = filiereFilter === "Toutes" || s.filiere === filiereFilter;
    const ecolage = getEcolage(s);
    const statut = ecolage?.statut || "impaye";
    const matchStatut = statutFilter === "Tous" || statut === statutFilter;
    return matchSearch && matchFiliere && matchStatut;
  });

  const handleSetEcolage = async () => {
    if (!selectedStudent || !ecolageForm.montantDu) return;
    setSaving(true);
    await createEcolage({
      etudiantId: getStudentId(selectedStudent),
      etudiantNom: getStudentName(selectedStudent),
      matricule: selectedStudent.matricule,
      campus: selectedStudent.campus || currentUser?.etablissement || "",
      filiere: selectedStudent.filiere || "",
      classe: selectedStudent.niveau || "L1",
      montantDu: Number(ecolageForm.montantDu),
      montantPaye: 0,
      statut: ecolageForm.statut,
      annee: ecolageForm.annee,
    });
    await load();
    setSaving(false);
    setShowEcolage(false);
    setSelectedStudent(null);
  };

  const totalDu = ecolages.reduce((s,e) => s + e.montantDu, 0);
  const totalPaye = ecolages.reduce((s,e) => s + e.montantPaye, 0);
  const etabColor = etabInfo?.color || "#2563eb";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Etudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Chargement..." : `${students.length} etudiants`}
            {etabInfo && <span className="ml-2 font-medium" style={{color: etabColor}}>— {etabInfo.label}</span>}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <a href="https://groupegsi.mg/rtmggmg/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
            style={{background: etabColor}}>
            <ExternalLink size={15} /> Ajouter etudiant
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total etudiants", value: students.length, color: "text-slate-900" },
          { label: "Avec ecolage", value: ecolages.length, color: "text-brand-700" },
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
            <input type="text" placeholder="Nom, matricule, email..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          {!isAdmin && filieres.length > 0 && (
            <div className="relative">
              <select value={filiereFilter} onChange={e => setFiliereFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 max-w-[200px]">
                <option>Toutes</option>
                {filieres.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
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
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{borderColor: etabColor, borderTopColor: "transparent"}} />
            <p className="text-slate-400 text-sm">Chargement depuis la base de donnees...</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Etudiant", "Filiere", "Niveau", "Ecolage", "Statut", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(s => {
                    const ec = getEcolage(s);
                    const statut = ec?.statut || "impaye";
                    return (
                      <tr key={getStudentId(s)} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{background: etabColor}}>
                              {getStudentName(s).split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{getStudentName(s)}</div>
                              <div className="text-xs text-slate-400">{s.matricule || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px]">
                          <div className="truncate">{s.filiere || "—"}</div>
                          <div className="text-slate-400 truncate">{s.campus || "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {s.niveau && <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{s.niveau}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {ec ? (
                            <div className="text-xs space-y-0.5">
                              <div className="font-semibold text-slate-700">{formatMGA(ec.montantDu)}</div>
                              <div className="text-emerald-600">Paye: {formatMGA(ec.montantPaye)}</div>
                              {ec.montantDu > ec.montantPaye && (
                                <div className="text-red-500">Reste: {formatMGA(ec.montantDu - ec.montantPaye)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs italic">Non defini</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", STATUT_COLORS[statut])}>
                            <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                            {STATUT_LABELS[statut]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Info / profile button */}
                            <button
                              onClick={() => setProfileStudent(s)}
                              title="Voir le profil"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200">
                              <Info size={15} />
                            </button>
                            {/* Ecolage button */}
                            <button
                              onClick={() => { setSelectedStudent(s); setShowEcolage(true); }}
                              title={ec ? "Modifier ecolage" : "Definir ecolage"}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-200">
                              <CreditCard size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Users size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucun etudiant trouve</p>
                </div>
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(s => {
                const ec = getEcolage(s);
                const statut = ec?.statut || "impaye";
                return (
                  <div key={getStudentId(s)} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{background: etabColor}}>
                          {getStudentName(s).split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{getStudentName(s)}</div>
                          <div className="text-xs text-slate-400">{s.matricule || "—"}</div>
                        </div>
                      </div>
                      {/* Info button mobile */}
                      <button onClick={() => setProfileStudent(s)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-slate-200 shrink-0">
                        <Info size={15} />
                      </button>
                    </div>
                    <div className="ml-13 space-y-1.5 pl-13">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {s.filiere && <span className="text-slate-500 truncate max-w-[200px]">{s.filiere}</span>}
                        {s.niveau && <span className="bg-brand-50 text-brand-700 font-bold px-1.5 py-0.5 rounded-full">{s.niveau}</span>}
                      </div>
                      {ec && (
                        <div className="flex gap-3 text-xs">
                          <span className="text-slate-500">Du: <span className="font-bold text-slate-700">{formatMGA(ec.montantDu)}</span></span>
                          <span className="text-emerald-600 font-bold">{formatMGA(ec.montantPaye)} paye</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", STATUT_COLORS[statut])}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                          {STATUT_LABELS[statut]}
                        </span>
                        <button onClick={() => { setSelectedStudent(s); setShowEcolage(true); }}
                          className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                          <CreditCard size={11} /> {ec ? "Ecolage" : "Definir ecolage"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="py-10 text-center text-slate-400 text-sm">Aucun etudiant</div>}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-400 text-right">{filtered.length} resultat(s) — Source: groupegsi.mg</p>

      {/* ─── PROFILE MODAL ─────────────────────────────────────────────────── */}
      {profileStudent && (() => {
        const ec = getEcolage(profileStudent);
        const statut = ec?.statut || "impaye";
        const name = getStudentName(profileStudent);
        const initials = name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header banner */}
              <div className="relative h-24 flex items-end px-6 pb-0" style={{background: `linear-gradient(135deg, ${etabColor}dd, ${etabColor}88)`}}>
                <button onClick={() => setProfileStudent(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all">
                  <X size={14} />
                </button>
                {/* Avatar overlapping */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-lg translate-y-8"
                  style={{background: etabColor}}>
                  {initials}
                </div>
              </div>

              {/* Content */}
              <div className="pt-10 px-6 pb-6 space-y-4">
                {/* Name & status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{name}</h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{profileStudent.matricule || "Matricule non defini"}</p>
                  </div>
                  <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 mt-1", STATUT_COLORS[statut])}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", STATUT_DOT[statut])} />
                    {STATUT_LABELS[statut]}
                  </span>
                </div>

                {/* Info grid */}
                <div className="space-y-2.5">
                  {[
                    { icon: Mail, label: "Email", value: profileStudent.email || "—" },
                    { icon: Phone, label: "Contact", value: profileStudent.contact || profileStudent.telephone || "—" },
                    { icon: MapPin, label: "Campus", value: profileStudent.campus || "—" },
                    { icon: GraduationCap, label: "Filiere", value: profileStudent.filiere || "—" },
                    { icon: Calendar, label: "Niveau", value: profileStudent.niveau || "—" },
                    ...(profileStudent.annee ? [{ icon: Calendar, label: "Annee", value: profileStudent.annee }] : []),
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={13} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400 font-medium">{label}</div>
                        <div className="text-sm text-slate-800 font-medium truncate">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ecolage section */}
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ecolage</span>
                  </div>
                  {ec ? (
                    <div className="px-4 py-3 grid grid-cols-3 gap-3">
                      {[
                        { label: "Montant du", value: formatMGA(ec.montantDu), color: "text-slate-700" },
                        { label: "Paye", value: formatMGA(ec.montantPaye), color: "text-emerald-600" },
                        { label: "Reste", value: formatMGA(ec.montantDu - ec.montantPaye), color: ec.montantDu > ec.montantPaye ? "text-red-600" : "text-emerald-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <div className={`text-sm font-bold ${color}`}>{value}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-center text-slate-400 text-xs">Aucun ecolage defini</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setProfileStudent(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Fermer
                  </button>
                  <button
                    onClick={() => { setSelectedStudent(profileStudent); setProfileStudent(null); setShowEcolage(true); }}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-md"
                    style={{background: etabColor}}>
                    {ec ? "Modifier ecolage" : "Definir ecolage"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── ECOLAGE MODAL ─────────────────────────────────────────────────── */}
      {showEcolage && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Ecolage</h2>
              <button onClick={() => { setShowEcolage(false); setSelectedStudent(null); }} className="text-slate-400 text-xl leading-none">x</button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-1">
              <div className="font-bold text-slate-900">{getStudentName(selectedStudent)}</div>
              <div className="text-xs text-slate-400">{selectedStudent.email}</div>
              <div className="flex gap-2 text-xs mt-1">
                <span className="font-mono text-slate-400">{selectedStudent.matricule || "—"}</span>
                {selectedStudent.niveau && <span className="bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">{selectedStudent.niveau}</span>}
              </div>
              <div className="text-xs text-slate-500 truncate">{selectedStudent.filiere}</div>
            </div>

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
                      { label: "Annee", value: existing.annee || "—", color: "text-slate-700" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-3">
                        <div className="text-xs text-slate-400">{label}</div>
                        <div className={`text-sm font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 text-center">Pour modifier, utilisez la page Paiements</p>
                  <button onClick={() => { setShowEcolage(false); setSelectedStudent(null); }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Fermer
                  </button>
                </div>
              );
              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Definir le montant d&apos;ecolage</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Montant total du (Ar)</label>
                    <input type="number" placeholder="Ex: 1200000" value={ecolageForm.montantDu}
                      onChange={e => setEcolageForm(f => ({ ...f, montantDu: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Annee</label>
                      <select value={ecolageForm.annee} onChange={e => setEcolageForm(f => ({ ...f, annee: e.target.value }))}
                        className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                        <option>2024/2025</option>
                        <option>2025/2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Statut initial</label>
                      <select value={ecolageForm.statut} onChange={e => setEcolageForm(f => ({ ...f, statut: e.target.value as "impaye"|"paye"|"en_attente" }))}
                        className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
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
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
                      style={{background: etabColor}}>
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
