"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import { FileText, Download, TrendingUp, TrendingDown, Percent } from "lucide-react";
import {
  MONTHLY_DATA, RECOVERY_BY_FILIERE, STUDENTS, PAYMENTS, EXPENSES,
  TOTAL_ENCAISSE, TOTAL_IMPAYE, TAUX_RECOUVREMENT, formatMGA
} from "@/lib/data";

const REPORTS = [
  { id: "resultat", label: "Compte de résultat", icon: TrendingUp, desc: "Recettes vs dépenses" },
  { id: "impaye", label: "Rapport des impayés", icon: TrendingDown, desc: "Liste et analyse des impayés" },
  { id: "recouvrement", label: "Taux de recouvrement", icon: Percent, desc: "Par filière et par classe" },
  { id: "tresorerie", label: "État de trésorerie", icon: FileText, desc: "Flux de trésorerie mensuel" },
];

export default function RapportsPage() {
  const [activeReport, setActiveReport] = useState("resultat");

  const totalDepenses = EXPENSES.reduce((s, e) => s + e.montant, 0);
  const resultatNet = TOTAL_ENCAISSE - totalDepenses;
  const studentsImpaye = STUDENTS.filter(s => s.statut === "impayé");
  const studentsPending = STUDENTS.filter(s => s.statut === "en_attente");

  const tresorerieData = MONTHLY_DATA.map(m => ({
    mois: m.mois,
    recettes: m.encaisse,
    depenses: Math.round(m.encaisse * 0.35),
    solde: Math.round(m.encaisse * 0.65),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports Financiers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analyse et export des données</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors self-start sm:self-auto">
          <Download size={15} /> Exporter PDF
        </button>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORTS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setActiveReport(id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeReport === id
                ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100"
                : "border-slate-100 bg-white hover:border-brand-200"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
              activeReport === id ? "bg-brand-100" : "bg-slate-100"
            }`}>
              <Icon size={16} className={activeReport === id ? "text-brand-600" : "text-slate-500"} />
            </div>
            <div className={`text-sm font-semibold ${activeReport === id ? "text-brand-900" : "text-slate-700"}`}>{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      {/* Compte de résultat */}
      {activeReport === "resultat" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Recettes", value: formatMGA(TOTAL_ENCAISSE), color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Total Dépenses", value: formatMGA(totalDepenses), color: "text-red-700", bg: "bg-red-50", border: "border-red-100" },
              { label: "Résultat Net", value: formatMGA(resultatNet), color: resultatNet >= 0 ? "text-brand-700" : "text-red-700", bg: "bg-brand-50", border: "border-brand-100" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`card border ${border} ${bg}`}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Évolution mensuelle (Ar)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatMGA(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="encaisse" name="Recettes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="impaye" name="Impayés" fill="#fca5a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense breakdown */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Détail des dépenses</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-400 pb-2">Libellé</th>
                    <th className="text-left text-xs font-semibold text-slate-400 pb-2">Catégorie</th>
                    <th className="text-left text-xs font-semibold text-slate-400 pb-2">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPENSES.map(e => (
                    <tr key={e.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-700">{e.libelle}</td>
                      <td className="py-2 pr-4"><span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">{e.categorie}</span></td>
                      <td className="py-2 font-semibold text-red-700">{formatMGA(e.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Impayés */}
      {activeReport === "impaye" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Impayés", value: studentsImpaye.length, color: "text-red-700" },
              { label: "En attente", value: studentsPending.length, color: "text-amber-700" },
              { label: "Montant impayé", value: formatMGA(TOTAL_IMPAYE), color: "text-red-700" },
              { label: "Taux impayé", value: `${100 - TAUX_RECOUVREMENT}%`, color: "text-red-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Étudiants avec impayés ou en attente</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Matricule", "Nom", "Filière", "Classe", "Dû", "Payé", "Reste", "Statut"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...studentsImpaye, ...studentsPending].map(s => (
                    <tr key={s.id} className="hover:bg-red-50/20">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.matricule}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.prenom} {s.nom}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.filiere}</td>
                      <td className="px-4 py-3"><span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.classe}</span></td>
                      <td className="px-4 py-3 text-slate-700">{formatMGA(s.montantDu)}</td>
                      <td className="px-4 py-3 text-emerald-700">{formatMGA(s.montantPaye)}</td>
                      <td className="px-4 py-3 font-bold text-red-700">{formatMGA(s.montantDu - s.montantPaye)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.statut === "impayé" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>{s.statut === "impayé" ? "Impayé" : "En attente"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recouvrement par filière */}
      {activeReport === "recouvrement" && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Taux de recouvrement par filière</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={RECOVERY_BY_FILIERE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="filiere" tick={{ fontSize: 12, fill: "#64748b" }} width={100} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="taux" name="Taux" radius={[0, 6, 6, 0]}
                  fill="#2563eb"
                  label={{ position: "right", fontSize: 11, fill: "#334155", formatter: (v: number) => `${v}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {RECOVERY_BY_FILIERE.map(({ filiere, taux }) => (
              <div key={filiere} className="card text-center">
                <div className={`text-3xl font-bold mb-1 ${taux >= 75 ? "text-emerald-600" : taux >= 55 ? "text-amber-600" : "text-red-600"}`}>
                  {taux}%
                </div>
                <div className="text-sm font-semibold text-slate-700">{filiere}</div>
                <div className={`text-xs mt-1 ${taux >= 75 ? "text-emerald-500" : taux >= 55 ? "text-amber-500" : "text-red-500"}`}>
                  {taux >= 75 ? "Bon" : taux >= 55 ? "Moyen" : "Faible"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trésorerie */}
      {activeReport === "tresorerie" && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Flux de trésorerie mensuel (Ar)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={tresorerieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatMGA(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="recettes" name="Recettes" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="solde" name="Solde net" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Mois", "Recettes", "Dépenses", "Solde net"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tresorerieData.map(row => (
                  <tr key={row.mois} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.mois}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">{formatMGA(row.recettes)}</td>
                    <td className="px-4 py-3 text-red-700 font-medium">{formatMGA(row.depenses)}</td>
                    <td className="px-4 py-3 font-bold text-brand-700">{formatMGA(row.solde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
