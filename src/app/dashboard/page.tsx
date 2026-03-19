"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, CreditCard, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS, formatMGA } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];
const MONTHLY = [
  { mois: "Juil", encaisse: 3200000, impaye: 800000 },
  { mois: "Aout", encaisse: 4100000, impaye: 1200000 },
  { mois: "Sept", encaisse: 5800000, impaye: 1500000 },
  { mois: "Oct",  encaisse: 4650000, impaye: 2050000 },
  { mois: "Nov",  encaisse: 3900000, impaye: 950000 },
  { mois: "Dec",  encaisse: 2100000, impaye: 600000 },
];

export default function DashboardPage() {
  const { myStudents, myPayments, currentUser } = useAuth();
  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;

  const paid = myStudents.filter(s => s.statut === "paye");
  const unpaid = myStudents.filter(s => s.statut === "impaye");
  const pending = myStudents.filter(s => s.statut === "en_attente");
  const totalEncaisse = myPayments.filter(p => p.statut === "paye").reduce((s, p) => s + p.montant, 0);
  const totalDu = myStudents.reduce((s, x) => s + x.montantDu, 0);
  const totalImpaye = totalDu - totalEncaisse;
  const taux = totalDu ? Math.round((totalEncaisse / totalDu) * 100) : 0;

  const pieData = [
    { name: "Paye", value: paid.length },
    { name: "Impaye", value: unpaid.length },
    { name: "En attente", value: pending.length },
  ];

  const recentPayments = myPayments.slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          {etabInfo && <p className="text-sm mt-0.5 font-medium" style={{ color: etabInfo.color }}>{etabInfo.label}</p>}
        </div>
        <span className="flex items-center gap-2 text-xs bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          En ligne
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total encaisse", value: formatMGA(totalEncaisse), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { label: "Total impaye", value: formatMGA(totalImpaye), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
          { label: "Taux recouvrement", value: `${taux}%`, icon: CheckCircle2, color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-100" },
          { label: "Total etudiants", value: myStudents.length.toString(), icon: Users, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Etudiants avec impayes", value: unpaid.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          { label: "En attente", value: pending.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Paiements confirmes", value: paid.length, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Encaissements vs Impayes (Ar)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatMGA(v)} />
              <Bar dataKey="encaisse" name="Encaisse" fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="impaye" name="Impaye" fill="#fca5a5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Repartition etudiants</h2>
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

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Paiements recents</h2>
          <Link href="/paiements" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Reference", "Etudiant", "Montant", "Mode", "Agent", "Statut"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{p.reference}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate-800">{p.etudiantNom}</td>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900">{formatMGA(p.montant)}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{p.mode}</td>
                  <td className="py-2.5 pr-4 text-slate-500 text-xs">{p.agentNom}</td>
                  <td className="py-2.5"><StatusBadge status={p.statut} /></td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs">Aucun paiement enregistre</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
