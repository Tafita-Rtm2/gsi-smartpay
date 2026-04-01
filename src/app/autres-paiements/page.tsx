"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, CreditCard, RefreshCw, X, Check, Trash2, AlertTriangle, Download, Printer, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchStudents, fetchOtherPayments, createOtherPayment, deleteOtherPayment,
  DBStudent, DBOtherPayment, getStudentId, getStudentName, formatMGA
} from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";
import clsx from "clsx";

export default function AutresPaiementsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [payments, setPayments] = useState<DBOtherPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [timeScale, setTimeScale] = useState<"jour" | "mois" | "annee">("mois");

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterMonth, setFilterMonth] = useState(["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterType, setFilterType] = useState<"jour" | "mois" | "annee">("mois");
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DBOtherPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Student picker
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<DBStudent | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const [form, setForm] = useState({
    libelle: "",
    montant: "",
    date: new Date().toISOString().split("T")[0],
    mode: "Especes",
    note: "",
  });

  const isAdmin = currentUser?.role === "admin";
  const etabColor = currentUser ? ETABLISSEMENTS[currentUser.etablissement]?.color || "#2563eb" : "#2563eb";

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s] = await Promise.all([fetchOtherPayments(), fetchStudents()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myS = s.filter(st => (st.campus || "").toLowerCase().includes(myEtab));
      const myIds = new Set(myS.map(st => getStudentId(st)));
      setPayments(p.filter(pay => myIds.has(pay.etudiantId)));
      setStudents(myS);
    } else {
      setPayments(p); setStudents(s);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = (p.etudiantNom || "").toLowerCase().includes(q) || (p.libelle || "").toLowerCase().includes(q);

    let matchTime = false;
    if (filterType === "jour") {
      matchTime = p.date === filterDate;
    } else if (filterType === "mois") {
      const d = new Date(p.date);
      const moisFr = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][d.getMonth()];
      matchTime = moisFr === filterMonth && String(d.getFullYear()) === filterYear;
    } else {
      matchTime = p.date.startsWith(filterYear);
    }

    const matchNiveau = selectedNiveaux.length === 0 || selectedNiveaux.includes(p.classe || "");

    return matchSearch && matchTime && matchNiveau;
  });

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    return getStudentName(s).toLowerCase().includes(q) || (s.matricule || "").toLowerCase().includes(q);
  });

  const handleAdd = async () => {
    setFormError("");
    if (!selectedStudent) { setFormError("Sélectionnez un étudiant"); return; }
    if (!form.libelle) { setFormError("Libellé requis"); return; }
    if (!form.montant || Number(form.montant) <= 0) { setFormError("Montant invalide"); return; }
    setSaving(true);
    await createOtherPayment({
      etudiantId: getStudentId(selectedStudent),
      etudiantNom: getStudentName(selectedStudent),
      matricule: selectedStudent.matricule,
      campus: selectedStudent.campus || currentUser?.etablissement || "",
      filiere: selectedStudent.filiere || "",
      classe: selectedStudent.niveau || "L1",
      libelle: form.libelle,
      montant: Number(form.montant),
      date: form.date,
      mode: form.mode,
      agentId: currentUser?.id || "",
      agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
      note: form.note,
    });

    await load();
    setSaving(false);
    setShowModal(false);
    setSelectedStudent(null);
    setForm({ libelle: "", montant: "", date: new Date().toISOString().split("T")[0], mode: "", note: "" });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const id = deleteConfirm.id || deleteConfirm._id || "";
    if (id) await deleteOtherPayment(id);
    await load();
    setDeleting(false);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-black tracking-tight">Autres Paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Encaissements hors-écolage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Étudiant", "Matricule", "Libellé", "Montant", "Date", "Mode", "Agent"];
            const rows = filtered.map(p => [p.etudiantNom, p.matricule, p.libelle, p.montant, p.date, p.mode, p.agentNom]);
            const csv = "\uFEFF" + [headers, ...rows].map(r => r.join(";")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.body.appendChild(document.createElement("a"));
            link.href = URL.createObjectURL(blob);
            link.download = `autres_paiements_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            document.body.removeChild(link);
          }} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-slate-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-slate-50">
            <Printer size={14} /> Imprimer
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg transition-all hover:scale-[1.02]"
            style={{ background: etabColor }}>
            <Plus size={16} /> Nouveau paiement
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher un paiement..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-100 bg-slate-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="flex gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-600">
              <option value="jour">Jour</option>
              <option value="mois">Mois</option>
              <option value="annee">Année</option>
            </select>
            {filterType === "jour" && (
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none" />
            )}
            {filterType === "mois" && (
              <>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700">
                  {["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700">
                  {["2024", "2025", "2026"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {filterType === "annee" && (
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700">
                {["2024", "2025", "2026"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase mr-2 flex items-center">Filtrer par niveau :</span>
          {["L1", "L2", "L3", "M1", "M2"].map(n => (
            <button key={n}
              onClick={() => setSelectedNiveaux(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])}
              className={clsx("px-4 py-1.5 rounded-xl text-[10px] font-black transition-all border uppercase",
                selectedNiveaux.includes(n) ? "bg-brand-600 text-white border-brand-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
              {n}
            </button>
          ))}
          {selectedNiveaux.length > 0 && (
            <button onClick={() => setSelectedNiveaux([])} className="text-[10px] font-black text-brand-600 hover:underline ml-2 uppercase tracking-tight">Réinitialiser</button>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{["Étudiant", "Libellé", "Montant", "Date", "Mode", "Agent", ""].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((p, i) => (
              <tr key={p.id || p._id || i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900">{p.etudiantNom}</td>
                <td className="px-4 py-3 text-slate-700">{p.libelle}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{formatMGA(p.montant)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.date}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.mode}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{p.agentNom}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setDeleteConfirm(p)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-400">Aucun paiement trouvé</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nouveau Paiement Divers</h2>
              <button onClick={() => { setShowModal(false); setSelectedStudent(null); setFormError(""); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Étudiant</label>
              {selectedStudent ? (
                <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded-xl">
                  <span className="text-sm font-bold text-slate-900">{getStudentName(selectedStudent)}</span>
                  <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Rechercher un étudiant..." value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    onFocus={() => setShowStudentPicker(true)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none" />
                  {showStudentPicker && studentSearch && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                      {filteredStudents.map(s => (
                        <button key={getStudentId(s)} onClick={() => { setSelectedStudent(s); setShowStudentPicker(false); setStudentSearch(""); }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{getStudentName(s)} ({s.matricule})</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Libellé du paiement (Saisie libre)</label>
              <input type="text" placeholder="Ex: Frais d'examen, Certificat, etc." value={form.libelle}
                onChange={e => setForm({...form, libelle: e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Montant (Ar)</label>
                <input type="number" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 tracking-widest">Mode de paiement</label>
              <div className="grid grid-cols-2 gap-2">
                {["Especes", "Banque", "Mvola", "Airtel Money", "Orange Money"].map(m => (
                  <button key={m} type="button" onClick={() => setForm(f => ({ ...f, mode: m }))}
                    className={clsx("px-3 py-2.5 rounded-xl text-[10px] font-black border transition-all uppercase tracking-tight",
                      form.mode === m ? "bg-brand-600 text-white border-brand-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="text-red-500 text-xs">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium">Annuler</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: etabColor }}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600"><AlertTriangle size={24} /></div>
            <div className="text-center">
              <h2 className="font-bold text-lg">Supprimer ce paiement ?</h2>
              <p className="text-sm text-slate-500">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-medium">Annuler</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold">{deleting ? "..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
