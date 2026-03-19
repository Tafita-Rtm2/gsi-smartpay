"use client";
import { useState } from "react";
import { Search, Plus, ChevronDown, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, formatMGA, Student } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";

export default function EtudiantsPage() {
  const { myStudents, addStudent, currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState("Toutes");
  const [statut, setStatut] = useState("Tous");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", email: "", filiere: "", classe: "L1", montantDu: "" });

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const filieres = etabInfo ? etabInfo.filieres : [];

  const filtered = myStudents.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.nom.toLowerCase().includes(q) || s.prenom.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q);
    const matchFiliere = filiere === "Toutes" || s.filiere === filiere;
    const matchStatut = statut === "Tous" || s.statut === statut;
    return matchSearch && matchFiliere && matchStatut;
  });

  const handleAdd = () => {
    if (!form.nom || !form.prenom || !form.filiere || !form.montantDu) return;
    const etab = currentUser!.etablissement;
    const prefix = etab.slice(0, 3).toUpperCase();
    const count = myStudents.filter(s => s.etablissement === etab).length + 1;
    addStudent({
      nom: form.nom, prenom: form.prenom,
      matricule: `${prefix}-2025-${String(count).padStart(3, "0")}`,
      filiere: form.filiere, classe: form.classe,
      telephone: form.telephone, email: form.email,
      statut: "impaye", montantDu: Number(form.montantDu), montantPaye: 0,
      etablissement: etab, annee: "2024/2025",
    });
    setShowModal(false);
    setForm({ nom: "", prenom: "", telephone: "", email: "", filiere: "", classe: "L1", montantDu: "" });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Etudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">{myStudents.length} etudiants inscrits</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors self-start sm:self-auto">
          <Plus size={16} /> Ajouter un etudiant
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher par nom ou matricule..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="relative">
            <select value={filiere} onChange={e => setFiliere(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white max-w-[200px]">
              <option>Toutes</option>
              {filieres.map(f => <option key={f}>{f}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={statut} onChange={e => setStatut(e.target.value)}
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

      <div className="card p-0 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Matricule", "Nom & Prenom", "Filiere", "Classe", "Contact", "Montant du", "Paye", "Statut"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.matricule}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{s.prenom} {s.nom}</div>
                    <div className="text-xs text-slate-400">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{s.filiere}</td>
                  <td className="px-4 py-3"><span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.classe}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.telephone}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMGA(s.montantDu)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{formatMGA(s.montantPaye)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun etudiant trouve</p>
            </div>
          )}
        </div>
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map(s => (
            <div key={s.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{s.prenom} {s.nom}</div>
                  <div className="text-xs font-mono text-slate-400">{s.matricule}</div>
                </div>
                <StatusBadge status={s.statut} />
              </div>
              <div className="text-xs text-slate-500 truncate">{s.filiere}</div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-slate-400">Du: </span><span className="font-bold text-slate-700">{formatMGA(s.montantDu)}</span></div>
                <div><span className="text-slate-400">Paye: </span><span className="font-bold text-emerald-600">{formatMGA(s.montantPaye)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nouvel etudiant</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">x</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "Prenom", key: "prenom", placeholder: "Ex: Jean" }, { label: "Nom", key: "nom", placeholder: "Ex: Rakoto" }].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
                    <input type="text" placeholder={placeholder} value={(form as Record<string,string>)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Filiere</label>
                <div className="relative">
                  <select value={form.filiere} onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))}
                    className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                    <option value="">Choisir une filiere</option>
                    {filieres.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Classe</label>
                  <div className="relative">
                    <select value={form.classe} onChange={e => setForm(f => ({ ...f, classe: e.target.value }))}
                      className="appearance-none w-full px-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
                      {["L1","L2","L3","M1","M2"].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Montant du (Ar)</label>
                  <input type="number" placeholder="Ex: 900000" value={form.montantDu}
                    onChange={e => setForm(f => ({ ...f, montantDu: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Telephone</label>
                <input type="text" placeholder="03X XX XXX XX" value={form.telephone}
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
                <input type="email" placeholder="email@exemple.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleAdd}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-md shadow-brand-600/20">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
