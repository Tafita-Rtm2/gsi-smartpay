"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, CreditCard, RefreshCw, X, Check, Trash2, AlertTriangle, Download, Printer, GraduationCap, Upload, Eye, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchStudents, fetchOtherPayments, createOtherPayment, deleteOtherPayment,
  DBStudent, DBOtherPayment, getStudentId, getStudentName, formatMGA
} from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";
import clsx from "clsx";
import CustomModal from "@/components/CustomModal";

export default function AutresPaiementsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [payments, setPayments] = useState<DBOtherPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  // Custom UI Modals state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  const showAlert = (title: string, message: string, type: "info" | "success" | "warning" | "danger" = "info") => {
    setModalConfig({ isOpen: true, title, message, type, confirmLabel: "OK" });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: "warning" | "danger" = "warning") => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm, confirmLabel: "Confirmer" });
  };

  // Student picker
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<DBStudent | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const [form, setForm] = useState({
    libelle: "",
    montant: "",
    date: new Date().toISOString().split("T")[0],
    mode: "Especes",
    transactionRef: "",
    preuve: "",
    preuveFilename: "",
    note: "",
  });

  const [preview, setPreview] = useState<DBOtherPayment | null>(null);

  const isAdmin = currentUser?.role === "admin";
  const etabColor = currentUser ? ETABLISSEMENTS[currentUser.etablissement]?.color || "#2563eb" : "#2563eb";

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (e) {
      console.error("Load other payments error:", e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return payments.filter(p => {
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
  }, [payments, search, filterType, filterDate, filterMonth, filterYear, selectedNiveaux]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = studentSearch.toLowerCase();
      return getStudentName(s).toLowerCase().includes(q) || (s.matricule || "").toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  const handleAdd = async () => {
    setFormError("");
    if (!selectedStudent) { setFormError("Sélectionnez un étudiant"); return; }
    if (!form.libelle) { setFormError("Libellé requis"); return; }
    if (!form.montant || Number(form.montant) <= 0) { setFormError("Montant invalide"); return; }
    setSaving(true);
    const res = await createOtherPayment({
      etudiantId: getStudentId(selectedStudent),
      etudiantNom: getStudentName(selectedStudent),
      matricule: selectedStudent.matricule || "",
      campus: selectedStudent.campus || currentUser?.etablissement || "",
      filiere: selectedStudent.filiere || "",
      classe: selectedStudent.niveau || "L1",
      libelle: form.libelle,
      montant: Number(form.montant),
      date: form.date,
      mode: form.mode,
      transactionRef: form.transactionRef,
      preuve: form.preuve,
      preuveFilename: form.preuveFilename,
      agentId: currentUser?.id || "",
      agentNom: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
      note: form.note,
    });

    if (!res) {
      setFormError("Erreur lors de l'enregistrement. L'image est peut-être trop lourde.");
      setSaving(false);
      return;
    }

    showAlert("Succès", "Le paiement a été enregistré.", "success");
    await load();
    setSaving(false);
    setShowModal(false);
    setSelectedStudent(null);
    setForm({ libelle: "", montant: "", date: new Date().toISOString().split("T")[0], mode: "Especes", transactionRef: "", preuve: "", preuveFilename: "", note: "" });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const id = deleteConfirm.id || deleteConfirm._id || "";
    if (id) await deleteOtherPayment(id);
    showAlert("Supprimé", "Le paiement a été retiré.", "info");
    await load();
    setDeleting(false);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-5">
      <CustomModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

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
                  {["2024", "2025", "2026", "2027"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
            {filterType === "annee" && (
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700">
                {["2024", "2025", "2026", "2027"].map(y => <option key={y} value={y}>{y}</option>)}
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
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: etabColor, borderTopColor: "transparent" }} />
            <p className="text-slate-400 text-sm">Chargement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Ref", "Étudiant", "Libellé", "Montant", "Date", "Mode", ""].map(h => (
                  <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-4">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p, i) => (
                  <tr key={p.id || p._id || i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] font-bold text-brand-600 uppercase">{p.reference || "—"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{p.etudiantNom}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{p.libelle}</td>
                    <td className="px-6 py-4 font-black text-emerald-700">{formatMGA(p.montant)}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{p.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px] font-black uppercase">{p.mode}</span>
                        {p.preuve && (
                          <button onClick={() => {
                            const win = window.open();
                            if (win) win.document.write(`<body style="margin:0; background:#000; display:flex; align-items:center; justify-center"><img src="${p.preuve}" style="max-width:100%; max-height:100vh; margin:auto"></body>`);
                          }} title="Voir justificatif" className="p-1.5 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-all">
                            <Eye size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreview(p)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-100">
                          <Receipt size={14} />
                        </button>
                        <button onClick={() => {
                          showConfirm(
                            "Supprimer ?",
                            "Voulez-vous supprimer ce paiement ? Cette action est irréversible.",
                            () => {
                              setDeleteConfirm(p);
                              handleDelete();
                            },
                            "danger"
                          );
                        }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <CreditCard size={40} className="mx-auto opacity-10" />
                <p className="text-xs font-black uppercase tracking-widest italic">Aucun paiement trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Nouveau Paiement Divers</h2>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Encaissement administratif</p>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedStudent(null); setFormError(""); }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Étudiant</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-4 bg-brand-50 border-2 border-brand-200 rounded-2xl shadow-sm animate-in slide-in-from-top-2">
                    <span className="text-sm font-black text-slate-900">{getStudentName(selectedStudent)}</span>
                    <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-white transition-all"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" placeholder="Rechercher par nom ou matricule..." value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      onFocus={() => setShowStudentPicker(true)}
                      className="w-full pl-12 pr-4 py-4 text-sm font-bold border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-slate-50 focus:bg-white transition-all shadow-sm" />
                    {showStudentPicker && studentSearch && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 no-scrollbar animate-in fade-in zoom-in-95">
                        {filteredStudents.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase italic">Aucun profil trouvé</div>
                        ) : filteredStudents.map(s => (
                          <button key={getStudentId(s)} onClick={() => { setSelectedStudent(s); setShowStudentPicker(false); setStudentSearch(""); }}
                            className="w-full text-left px-4 py-3 hover:bg-brand-50 rounded-xl flex flex-col transition-colors">
                            <span className="font-black text-slate-900 text-sm">{getStudentName(s)}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{s.matricule} · {s.filiere}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Libellé du paiement</label>
                <input type="text" placeholder="Ex: Frais d'examen, Certificat, Badge..." value={form.libelle}
                  onChange={e => setForm({...form, libelle: e.target.value})}
                  className="w-full px-4 py-3.5 text-sm font-bold border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-slate-50 focus:bg-white transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Montant (Ar)</label>
                  <input type="number" placeholder="0" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
                    className="w-full px-4 py-3.5 text-sm font-black border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-slate-50 focus:bg-white transition-all text-brand-700" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full px-4 py-3.5 text-sm font-bold border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-slate-50 focus:bg-white transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Especes", "Banque", "Mvola", "Airtel Money", "Orange Money"].map(m => (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, mode: m }))}
                      className={clsx("px-3 py-2.5 rounded-xl text-[10px] font-black border transition-all uppercase tracking-tighter",
                        form.mode === m ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-in zoom-in-95 duration-300">
                {form.mode !== "Especes" && (
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Référence de Transaction</label>
                    <input type="text" placeholder="Ex: ID Mvola, Ref Virement..." value={form.transactionRef}
                      onChange={e => setForm(f=>({...f, transactionRef: e.target.value}))}
                      className="w-full px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Preuve / Justificatif</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 cursor-pointer hover:border-brand-500 hover:text-brand-600 transition-all">
                      <Upload size={18} />
                      <span className="text-[10px] font-black uppercase truncate max-w-[150px]">
                        {form.preuveFilename || "Uploader Image"}
                      </span>
                      <input type="file" className="hidden" accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setForm(f => ({ ...f, preuve: reader.result as string, preuveFilename: file.name }));
                            reader.readAsDataURL(file);
                          }
                        }} />
                    </label>
                    {form.preuve && (
                      <button type="button" onClick={() => {
                        const win = window.open();
                        if (win) win.document.write(`<img src="${form.preuve}" style="max-width:100%">`);
                      }} className="p-3 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 shadow-sm transition-transform active:scale-90">
                        <Eye size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {formError && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-[10px] font-black uppercase tracking-tight text-center">{formError}</div>}
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => { setShowModal(false); setSelectedStudent(null); setFormError(""); }}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-[1.5] py-4 rounded-2xl text-white text-xs font-black uppercase shadow-xl disabled:opacity-60 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                style={{ background: etabColor }}>
                {saving ? <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Traitement...</> : <><Check size={18}/> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RECEIPT PREVIEW ─── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm only-print-this" id="recu-print">
            <div className="rounded-t-2xl px-6 py-5 text-white" style={{ background: etabColor }}>
              <div className="flex items-center justify-between mb-1">
                <img src="/gsi-smartpay/logo.png" alt="Logo" className="h-10 w-10 object-contain bg-white rounded-lg p-1" />
                <div className="text-xs opacity-70 uppercase">Reçu de paiement</div>
              </div>
              <div className="text-xs opacity-70">{currentUser?.etablissement || preview.campus}</div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Référence</span>
                <span className="font-mono font-bold text-slate-900">{preview.reference || "—"}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="space-y-2 text-sm">
                {[
                  { label: "Bénéficiaire", value: preview.etudiantNom },
                  { label: "Matricule", value: preview.matricule || "—" },
                  { label: "Libellé", value: preview.libelle },
                  { label: "Date", value: preview.date },
                  { label: "Canal", value: preview.mode },
                  { label: "Agent", value: preview.agentNom },
                  ...(preview.note ? [{ label: "Note", value: preview.note }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-medium text-slate-900 text-right text-xs truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Montant perçu</span>
                <span className="text-2xl font-bold" style={{ color: etabColor }}>{formatMGA(preview.montant)}</span>
              </div>

              {preview.preuve && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Justificatif</div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group relative">
                    <img src={preview.preuve} alt="Preuve" className="w-full h-auto max-h-[150px] object-contain" />
                  </div>
                </div>
              )}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center">
                <span className="text-emerald-700 font-bold text-sm">Paiement enregistré</span>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Fermer
              </button>
              <button onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors">
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
