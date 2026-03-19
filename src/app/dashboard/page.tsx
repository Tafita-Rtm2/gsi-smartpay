"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, CreditCard,
  AlertCircle, CheckCircle2, Clock, ArrowRight
} from "lucide-react";
import Link from "next/link";
import {
  STUDENTS, PAYMENTS, MONTHLY_DATA, RECOVERY_BY_FILIERE,
  TOTAL_ENCAISSE, TOTAL_IMPAYE, TAUX_RECOUVREMENT, formatMGA
} from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

export default function DashboardPage() {
  const recentPayments = PAYMENTS.slice(0, 5);
  const studentsUnpaid = STUDENTS.filter(s => s.statut === "impayé").length;
  const studentsPaid = STUDENTS.filter(s => s.statut === "payé").length;
  const studentsPending = STUDENTS.filter(s => s.statut === "en_attente").length;

  const pieData = [
    { name: "Payé", value: studentsPaid },
    { name: "Impayé", value: studentsUnpaid },
    { name: "En attente", value: studentsPending },
  ];

  const statsCards = [
    {
      label: "Total encaissé",
      value: formatMGA(TOTAL_ENCAISSE),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Total impayé",
      value: formatMGA(TOTAL_IMPAYE),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      label: "Taux de recouvrement",
      value: `${TAUX_RECOUVREMENT}%`,
      icon: CheckCircle2,
      color: "text-brand-600",
      bg: "bg-brand-50",
      border: "border-brand-100",
    },
    {
      label: "Total étudiants",
      value: STUDENTS.length.toString(),
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
  ];

  const alertCards = [
    { label: "Étudiants avec impayés", value: studentsUnpaid, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "En attente de paiement", value: studentsPending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Paiements confirmés", value: studentsPaid, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vue d'ensemble financière — Année 2024/2025</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Mis à jour à l'instant
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`card border ${border}`}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-lg font-bold text-slate-900 truncate">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Alert row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {alertCards.map(({ label, value, icon: Icon, color, bg }) => (
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly bar chart */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Encaissements vs Impayés (Ar)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_DATA} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatMGA(v)} />
              <Bar dataKey="encaisse" name="Encaissé" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="impaye" name="Impayé" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Répartition étudiants</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recovery by filiere */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Taux de recouvrement par filière</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RECOVERY_BY_FILIERE.map(({ filiere, taux }) => (
            <div key={filiere}>
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span className="font-medium">{filiere}</span>
                <span className="font-bold">{taux}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${taux}%`,
                    background: taux >= 75 ? "#22c55e" : taux >= 55 ? "#f59e0b" : "#ef4444"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent payments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Paiements récents</h2>
          <Link href="/paiements" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Référence", "Étudiant", "Montant", "Mode", "Date", "Statut"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">{p.reference}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate-800">{p.etudiantNom}</td>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900">{formatMGA(p.montant)}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{p.mode}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{p.date}</td>
                  <td className="py-2.5"><StatusBadge status={p.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
