"use client";
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { FileText, TrendingUp, TrendingDown, Percent, RefreshCw, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS } from "@/lib/data";
import { fetchStudents, fetchEcolages, fetchPaiements, DBStudent, DBEcolage, DBPaiement, getStudentId, formatMGA } from "@/lib/api";

type Tab = "resultat" | "impaye" | "recouvrement" | "tresorerie";

const REPORTS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "resultat",     label: "Compte de resultat",   icon: TrendingUp,   desc: "Recettes vs depenses" },
  { id: "impaye",       label: "Rapport des impayes",  icon: TrendingDown, desc: "Liste et analyse" },
  { id: "recouvrement", label: "Taux de recouvrement", icon: Percent,      desc: "Par filiere" },
  { id: "tresorerie",   label: "Etat de tresorerie",   icon: FileText,     desc: "Flux mensuel" },
];

export default function RapportsPage() {
  const { currentUser, myExpenses } = useAuth();
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("resultat");

  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const etabColor = etabInfo?.color || "#2563eb";
  const isAdmin   = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e, p] = await Promise.all([fetchStudents(), fetchEcolages(), fetchPaiements()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myS = s.filter(st => (st.campus || "").toLowerCase().includes(myEtab));
      const myIds = new Set(myS.map(st => getStudentId(st)));
      setStudents(myS);
      setEcolages(e.filter(ec => myIds.has(ec.etudiantId)));
      setPaiements(p.filter(pay => myIds.has(pay.etudiantId)));
    } else {
      setStudents(s); setEcolages(e); setPaiements(p);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  // Real stats only
  const totalEncaisse  = paiements.reduce((s, p) => s + p.montant, 0);
  const totalDepenses  = myExpenses.reduce((s, e) => s + e.montant, 0);
  const resultatNet    = totalEncaisse - totalDepenses;
  const totalDu        = ecolages.reduce((s, e) => s + e.montantDu, 0);
  const totalImpaye    = Math.max(0, totalDu - ecolages.reduce((s, e) => s + e.montantPaye, 0));
  const tauxGlobal     = totalDu > 0 ? Math.round((totalEncaisse / totalDu) * 100) : 0;

  const studentsImpaye  = students.filter(s => { const ec = ecolages.find(e => e.etudiantId === getStudentId(s)); return !ec || ec.statut === "impaye"; });
  const studentsPending = students.filter(s => { const ec = ecolages.find(e => e.etudiantId === getStudentId(s)); return ec?.statut === "en_attente"; });

  // Build monthly data from real paiements only
  const monthlyMap: Record<string, { recettes: number }> = {};
  paiements.forEach(p => {
    const m = (p.date || "").slice(0, 7);
    if (m) monthlyMap[m] = { recettes: (monthlyMap[m]?.recettes || 0) + p.montant };
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, v]) => ({ mois: mois.slice(5) + "/" + mois.slice(0, 4), ...v }));

  // Recouvrement par filiere from real data
  const filieres = etabInfo ? etabInfo.filieres : [];
  const recouvrementData = filieres.map(f => {
    const studs = students.filter(s => (s.filiere || "") === f);
    const du = studs.reduce((sum, s) => { const ec = ecolages.find(e => e.etudiantId === getStudentId(s)); return sum + (ec?.montantDu || 0); }, 0);
    const paye = studs.reduce((sum, s) => { const ec = ecolages.find(e => e.etudiantId === getStudentId(s)); return sum + (ec?.montantPaye || 0); }, 0);
    return { filiere: f.length > 25 ? f.slice(0, 25) + "..." : f, taux: du > 0 ? Math.round((paye / du) * 100) : 0, du, paye };
  }).filter(r => r.du > 0);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: etabColor, borderTopColor: "transparent" }} />
      <p className="text-slate-400 text-sm">Chargement des donnees reelles...</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports Financiers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Donnees reelles depuis la base de donnees</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
            style={{ background: etabColor }}>
            <Printer size={15} /> Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORTS.map(({ id, label, icon: Icon, desc }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${activeTab === id ? "shadow-md" : "border-slate-100 bg-white hover:border-slate-200"}`}
            style={activeTab === id ? { borderColor: etabColor, background: etabColor + "11" } : {}}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2`}
              style={{ background: activeTab === id ? etabColor + "33" : "#f1f5f9" }}>
              <Icon size={16} style={{ color: activeTab === id ? etabColor : "#64748b" }} />
            </div>
            <div className="text-sm font-semibold text-slate-700">{label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      {/* ── Compte de resultat ── */}
      {activeTab === "resultat" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Recettes",  value: formatMGA(totalEncaisse), color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Total Depenses",  value: formatMGA(totalDepenses), color: "text-red-700",     bg: "bg-red-50",     border: "border-red-100"     },
              { label: "Resultat Net",    value: formatMGA(resultatNet),   color: resultatNet >= 0 ? "text-brand-700" : "text-red-700", bg: "bg-brand-50", border: "border-brand-100" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`card border ${border} ${bg}`}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {monthlyData.length > 0 ? (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Encaissements par mois (donnees reelles)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatMGA(v)} />
                  <Bar dataKey="recettes" name="Recettes" fill={etabColor} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="card text-center py-8 text-slate-400 text-sm">Aucun paiement enregistre pour afficher le graphique</div>
          )}

          {/* Real expenses */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Detail des depenses</h3>
            {myExpenses.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Aucune depense enregistree</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    {["Libelle","Categorie","Agent","Montant"].map(h => (
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
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Impayes ── */}
      {activeTab === "impaye" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Impayes",       value: studentsImpaye.length,  color: "text-red-700"   },
              { label: "En attente",    value: studentsPending.length, color: "text-amber-700" },
              { label: "Montant impaye",value: formatMGA(totalImpaye), color: "text-red-700"   },
              { label: "Taux impaye",   value: `${100 - tauxGlobal}%`, color: "text-red-700"   },
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
            {studentsImpaye.length === 0 && studentsPending.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Aucun impaye</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["Matricule","Nom","Filiere","Classe","Du","Paye","Reste","Statut"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...studentsImpaye, ...studentsPending].map(s => {
                      const ec = ecolages.find(e => e.etudiantId === getStudentId(s));
                      return (
                        <tr key={getStudentId(s)} className="hover:bg-red-50/20">
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.matricule || "—"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{s.fullName || `${s.prenom||""} ${s.nom||""}`.trim()}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{s.filiere || "—"}</td>
                          <td className="px-4 py-3"><span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.niveau || "—"}</span></td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{formatMGA(ec?.montantDu || 0)}</td>
                          <td className="px-4 py-3 text-emerald-700 text-xs">{formatMGA(ec?.montantPaye || 0)}</td>
                          <td className="px-4 py-3 font-bold text-red-700 text-xs">{formatMGA((ec?.montantDu || 0) - (ec?.montantPaye || 0))}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ec?.statut === "en_attente" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              {ec?.statut === "en_attente" ? "En attente" : "Impaye"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recouvrement ── */}
      {activeTab === "recouvrement" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Taux global</h3>
              <span className={`text-2xl font-bold ${tauxGlobal >= 70 ? "text-emerald-600" : tauxGlobal >= 40 ? "text-amber-600" : "text-red-600"}`}>{tauxGlobal}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${tauxGlobal}%`, background: tauxGlobal >= 70 ? "#22c55e" : tauxGlobal >= 40 ? "#f59e0b" : "#ef4444" }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{formatMGA(ecolages.reduce((s,e)=>s+e.montantPaye,0))} encaisse</span>
              <span>sur {formatMGA(totalDu)}</span>
            </div>
          </div>

          {recouvrementData.length === 0 ? (
            <div className="card text-center py-8 text-slate-400 text-sm">Aucune donnee d&apos;ecolage definie</div>
          ) : (
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Par filiere</h3>
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
                    <span>{formatMGA(paye)} paye</span>
                    <span>sur {formatMGA(du)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tresorerie ── */}
      {activeTab === "tresorerie" && (
        <div className="space-y-4">
          {monthlyData.length === 0 ? (
            <div className="card text-center py-10 text-slate-400 text-sm">Aucun paiement enregistre</div>
          ) : (
            <>
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Flux de tresorerie (donnees reelles)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatMGA(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="recettes" name="Recettes" stroke={etabColor} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["Mois","Recettes"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {monthlyData.map(row => (
                      <tr key={row.mois} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-700">{row.mois}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{formatMGA(row.recettes)}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50 font-bold">
                      <td className="px-4 py-3 text-slate-700">TOTAL</td>
                      <td className="px-4 py-3 text-emerald-700">{formatMGA(totalEncaisse)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
