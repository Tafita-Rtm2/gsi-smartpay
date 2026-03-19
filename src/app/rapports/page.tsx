"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { FileText, Download, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, formatMGA, getStatusLabel } from "@/lib/data";

type Tab = "resultat" | "impaye" | "recouvrement" | "tresorerie";

const MONTHLY = [
  { mois: "Juil", recettes: 3200000, depenses: 1100000 },
  { mois: "Aout", recettes: 4100000, depenses: 1400000 },
  { mois: "Sept", recettes: 5800000, depenses: 1900000 },
  { mois: "Oct",  recettes: 4650000, depenses: 1600000 },
  { mois: "Nov",  recettes: 3900000, depenses: 1300000 },
  { mois: "Dec",  recettes: 2100000, depenses: 900000 },
].map(m => ({ ...m, solde: m.recettes - m.depenses }));

const REPORTS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "resultat",      label: "Compte de resultat",    icon: TrendingUp,   desc: "Recettes vs depenses" },
  { id: "impaye",        label: "Rapport des impayes",   icon: TrendingDown, desc: "Liste et analyse" },
  { id: "recouvrement",  label: "Taux de recouvrement",  icon: Percent,      desc: "Par filiere" },
  { id: "tresorerie",    label: "Etat de tresorerie",    icon: FileText,     desc: "Flux mensuel" },
];

export default function RapportsPage() {
  const { myStudents, myPayments, myExpenses, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("resultat");

  const totalEncaisse = myPayments.filter(p => p.statut === "paye").reduce((s, p) => s + p.montant, 0);
  const totalDepenses = myExpenses.reduce((s, e) => s + e.montant, 0);
  const resultatNet = totalEncaisse - totalDepenses;
  const totalDu = myStudents.reduce((s, x) => s + x.montantDu, 0);
  const totalImpaye = totalDu - totalEncaisse;
  const tauxGlobal = totalDu ? Math.round((totalEncaisse / totalDu) * 100) : 0;

  const studentsImpaye = myStudents.filter(s => s.statut === "impaye");
  const studentsPending = myStudents.filter(s => s.statut === "en_attente");

  // Recouvrement par filiere
  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const filieres = etabInfo ? etabInfo.filieres : [];
  const recouvrementData = filieres.map(f => {
    const students = myStudents.filter(s => s.filiere === f);
    const du = students.reduce((s, x) => s + x.montantDu, 0);
    const paye = students.reduce((s, x) => s + x.montantPaye, 0);
    return { filiere: f.length > 25 ? f.slice(0, 25) + "..." : f, taux: du ? Math.round((paye / du) * 100) : 0, du, paye };
  }).filter(r => r.du > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports Financiers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analyse et export des donnees</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-brand-600/20 transition-colors self-start sm:self-auto">
          <Download size={15} /> Exporter PDF
        </button>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORTS.map(({ id, label, icon: Icon, desc }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${activeTab === id ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100" : "border-slate-100 bg-white hover:border-brand-200"}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${activeTab === id ? "bg-brand-100" : "bg-slate-100"}`}>
              <Icon size={16} className={activeTab === id ? "text-brand-600" : "text-slate-500"} />
            </div>
            <div className={`text-sm font-semibold ${activeTab === id ? "text-brand-900" : "text-slate-700"}`}>{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      {/* Compte de resultat */}
      {activeTab === "resultat" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Recettes", value: formatMGA(totalEncaisse), color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Total Depenses", value: formatMGA(totalDepenses), color: "text-red-700", bg: "bg-red-50", border: "border-red-100" },
              { label: "Resultat Net", value: formatMGA(resultatNet), color: resultatNet >= 0 ? "text-brand-700" : "text-red-700", bg: "bg-brand-50", border: "border-brand-100" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`card border ${border} ${bg}`}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Evolution mensuelle (Ar)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={MONTHLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatMGA(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="recettes" name="Recettes" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="depenses" name="Depenses" fill="#fca5a5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Detail des depenses</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  {["Libelle", "Categorie", "Agent", "Montant"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {myExpenses.map(e => (
                    <tr key={e.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-700">{e.libelle}</td>
                      <td className="py-2 pr-4"><span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">{e.categorie}</span></td>
                      <td className="py-2 pr-4 text-xs text-slate-500">{e.agentNom}</td>
                      <td className="py-2 font-semibold text-red-700">{formatMGA(e.montant)}</td>
                    </tr>
                  ))}
                  {myExpenses.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-xs">Aucune depense enregistree</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Impayes */}
      {activeTab === "impaye" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Etudiants impayes", value: studentsImpaye.length, color: "text-red-700" },
              { label: "En attente", value: studentsPending.length, color: "text-amber-700" },
              { label: "Montant impaye", value: formatMGA(totalImpaye), color: "text-red-700" },
              { label: "Taux impaye", value: `${100 - tauxGlobal}%`, color: "text-red-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="card">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Etudiants impayes et en attente</h3>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{["Matricule", "Nom", "Filiere", "Classe", "Du", "Paye", "Reste", "Statut"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...studentsImpaye, ...studentsPending].map(s => (
                    <tr key={s.id} className="hover:bg-red-50/20">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.matricule}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.prenom} {s.nom}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{s.filiere}</td>
                      <td className="px-4 py-3"><span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.classe}</span></td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{formatMGA(s.montantDu)}</td>
                      <td className="px-4 py-3 text-emerald-700 text-xs">{formatMGA(s.montantPaye)}</td>
                      <td className="px-4 py-3 font-bold text-red-700 text-xs">{formatMGA(s.montantDu - s.montantPaye)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.statut === "impaye" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {getStatusLabel(s.statut)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {studentsImpaye.length === 0 && studentsPending.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400 text-sm">Aucun impaye</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-100">
              {[...studentsImpaye, ...studentsPending].map(s => (
                <div key={s.id} className="p-4 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900 text-sm">{s.prenom} {s.nom}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.statut === "impaye" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {getStatusLabel(s.statut)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{s.filiere} · {s.classe}</div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-red-600 font-bold">Reste: {formatMGA(s.montantDu - s.montantPaye)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recouvrement */}
      {activeTab === "recouvrement" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Taux global</h3>
              <span className={`text-2xl font-bold ${tauxGlobal >= 70 ? "text-emerald-600" : tauxGlobal >= 40 ? "text-amber-600" : "text-red-600"}`}>{tauxGlobal}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${tauxGlobal}%`, background: tauxGlobal >= 70 ? "#22c55e" : tauxGlobal >= 40 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Par filiere</h3>
            {recouvrementData.length === 0 && <p className="text-slate-400 text-sm">Aucune donnee</p>}
            {recouvrementData.map(({ filiere, taux, du, paye }) => (
              <div key={filiere} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 truncate mr-2">{filiere}</span>
                  <span className="font-bold text-slate-900 shrink-0">{taux}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${taux}%`, background: taux >= 70 ? "#22c55e" : taux >= 40 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{formatMGA(paye)} encaisse</span>
                  <span>sur {formatMGA(du)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tresorerie */}
      {activeTab === "tresorerie" && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Flux de tresorerie mensuel (Ar)</h3>
            <ResponsiveContainer width="100%" height={270}>
              <LineChart data={MONTHLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatMGA(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="recettes" name="Recettes" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="depenses" name="Depenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="solde" name="Solde net" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Mois", "Recettes", "Depenses", "Solde net"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MONTHLY.map(row => (
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
