"use client";
import { useState } from "react";
import { Search, Plus, ChevronDown, Users } from "lucide-react";
import { STUDENTS, FILIERES, formatMGA } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";

export default function EtudiantsPage() {
  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState("Toutes");
  const [statut, setStatut] = useState("Tous");

  const filtered = STUDENTS.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.nom.toLowerCase().includes(q) || s.prenom.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q);
    const matchFiliere = filiere === "Toutes" || s.filiere === filiere;
    const matchStatut = statut === "Tous" || s.statut === statut;
    return matchSearch && matchFiliere && matchStatut;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Étudiants</h1>
          <p className="text-sm text-slate-500 mt-0.5">{STUDENTS.length} étudiants inscrits</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors self-start sm:self-auto">
          <Plus size={16} /> Ajouter un étudiant
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou matricule..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="relative">
            <select
              value={filiere}
              onChange={e => setFiliere(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
            >
              <option>Toutes</option>
              {FILIERES.map(f => <option key={f.id}>{f.nom}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statut}
              onChange={e => setStatut(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
            >
              <option>Tous</option>
              <option value="payé">Payé</option>
              <option value="impayé">Impayé</option>
              <option value="en_attente">En attente</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="card p-0 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Matricule", "Nom & Prénom", "Filière", "Classe", "Contact", "Montant dû", "Payé", "Statut", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.matricule}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{s.prenom} {s.nom}</div>
                    <div className="text-xs text-slate-400">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.filiere}</td>
                  <td className="px-4 py-3">
                    <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.classe}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.telephone}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{formatMGA(s.montantDu)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{formatMGA(s.montantPaye)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.statut} /></td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-brand-600 hover:underline font-medium">Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun étudiant trouvé</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
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
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded-full">{s.classe}</span>
                <span>{s.filiere}</span>
                <span>{s.telephone}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-slate-400">Dû : </span><span className="font-bold text-slate-700">{formatMGA(s.montantDu)}</span></div>
                <div><span className="text-slate-400">Payé : </span><span className="font-bold text-emerald-600">{formatMGA(s.montantPaye)}</span></div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun étudiant trouvé</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-right">{filtered.length} résultat(s) affiché(s)</p>
    </div>
  );
}
