"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Users, CreditCard, AlertCircle, CheckCircle2, Clock, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS } from "@/lib/data";
import { fetchStudents, fetchEcolages, fetchPaiements, DBStudent, DBEcolage, DBPaiement, getStudentId, formatMGA } from "@/lib/api";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading,   setLoading]   = useState(true);

  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin   = currentUser?.role === "admin";
  const etabColor = etabInfo?.color || "#2563eb";

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

  // Real stats from DB only
  const totalEncaisse = paiements.reduce((s, p) => s + p.montant, 0);
  const totalDu       = ecolages.reduce((s, e) => s + e.montantDu, 0);
  const totalImpaye   = Math.max(0, totalDu - ecolages.reduce((s, e) => s + e.montantPaye, 0));
  const taux          = totalDu > 0 ? Math.round((totalEncaisse / totalDu) * 100) : 0;

  const paid    = ecolages.filter(e => e.statut === "paye").length;
  const unpaid  = ecolages.filter(e => e.statut === "impaye").length;
  const pending = ecolages.filter(e => e.statut === "en_attente").length;

  const pieData = [
    { name: "Paye",       value: paid    },
    { name: "Impaye",     value: unpaid  },
    { name: "En attente", value: pending },
  ];

  const recentPaiements = [...paiements].reverse().slice(0, 5);

  // Build monthly chart from real paiements
  const monthlyMap: Record<string, number> = {};
  paiements.forEach(p => {
    const month = p.date ? p.date.slice(0, 7) : "?";
    monthlyMap[month] = (monthlyMap[month] || 0) + p.montant;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mois, montant]) => ({ mois: mois.slice(5), montant }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          {etabInfo && <p className="text-sm font-medium mt-0.5" style={{ color: etabColor }}>{etabInfo.label}</p>}
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-xs bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: etabColor, borderTopColor: "transparent" }} />
          <p className="text-slate-400">Chargement des donnees...</p>
        </div>
      ) : (
        <>
          {/* Stat cards — only 3, no "impaye" card with negative icon */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total encaissé",     value: formatMGA(totalEncaisse), icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "CA Annuel Prévu",    value: formatMGA(totalDu),       icon: CreditCard,   color: "text-brand-600",   bg: "bg-brand-50",   border: "border-brand-100"   },
              { label: "Taux recouvrement",  value: `${taux}%`,               icon: CheckCircle2, color: "text-brand-600",   bg: "bg-brand-50",   border: "border-brand-100"   },
              { label: "Total étudiants",    value: students.length.toString(),icon: Users,        color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-100"  },
              { label: "Transactions",       value: paiements.length.toString(),icon: CreditCard,  color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200"   },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`card border ${border}`}>
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={color} />
                </div>
                <div className="text-lg font-bold text-slate-900 truncate">{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Alert row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Etudiants impayes",  value: unpaid,  icon: AlertCircle,  color: "text-red-600",     bg: "bg-red-50"     },
              { label: "En attente",         value: pending, icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50"   },
              { label: "Ecolages payes",     value: paid,    icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Encaissements par mois (Ar)</h2>
              {monthlyData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-slate-300 text-sm">
                  Aucune donnee de paiement
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatMGA(v)} />
                    <Bar dataKey="montant" name="Encaisse" fill={etabColor} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Statuts ecolages</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent payments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">Paiements recents</h2>
              <Link href="/paiements" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                Voir tout <ArrowRight size={12} />
              </Link>
            </div>
            {recentPaiements.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Aucun paiement enregistre</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Reference", "Etudiant", "Montant", "Date", "Note", "Agent"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPaiements.map((p, i) => (
                      <tr key={p.id || p._id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{p.reference || "—"}</td>
                        <td className="py-2.5 pr-4 font-medium text-slate-800">{p.etudiantNom}</td>
                        <td className="py-2.5 pr-4 font-bold text-emerald-700">{formatMGA(p.montant)}</td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs">{p.date}</td>
                        <td className="py-2.5 pr-4 text-slate-400 text-xs">{p.note || "—"}</td>
                        <td className="py-2.5 text-slate-500 text-xs">{p.agentNom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
