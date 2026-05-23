"use client";

import { useState, useEffect } from "react";
import { Check, X, Shield, TrendingUp, Users, DollarSign, Eye, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/formation/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsLoggedIn(true);
        fetchPayments();
      }
      else setError("Mot de passe incorrect");
    } catch (e) {
      setError("Erreur de connexion");
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch("/formation/api/admin/payments");
      const data = await res.json();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (id: number) => {
    if (!confirm("Voulez-vous vraiment valider ce paiement ?")) return;
    try {
      const res = await fetch(`/formation/api/admin/payments/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setPayments(payments.filter((p: any) => p.id !== id));
      }
    } catch (e) {
      alert("Erreur lors de la validation");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
          <div className="flex justify-center mb-8">
             <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-orange-500 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-lg">N</div>
          </div>
          <h1 className="text-white text-3xl font-black text-center mb-2 tracking-tighter">ADMIN NINA</h1>
          <p className="text-zinc-500 text-center mb-10 font-medium">Contrôle de sécurité GSI Formation</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                className="w-full bg-zinc-800/50 border-zinc-700 text-white p-5 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition text-center text-xl tracking-[0.5em]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center font-bold uppercase tracking-widest animate-bounce">{error}</p>}
            <button className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-zinc-200 transition shadow-[0_0_30px_rgba(255,255,255,0.1)]">DÉVERROUILLER L'ACCÈS</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-8 py-6 flex justify-between items-center sticky top-0 z-20">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-2xl font-black text-zinc-900">ADMINISTRATION NINA</h1>
         </div>
         <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-4">
                <div className="text-right">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Directrice</p>
                    <p className="font-bold text-zinc-800">Nina GSI</p>
                </div>
                <div className="w-10 h-10 bg-zinc-100 rounded-full border"></div>
            </div>
            <button onClick={() => setIsLoggedIn(false)} className="bg-zinc-100 p-2 rounded-lg text-zinc-500 hover:text-red-600 transition">
                <X size={20} />
            </button>
         </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full">
         {/* Stats */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[
                { label: "Paiements en attente", val: payments.length, icon: Shield, color: "text-orange-600", bg: "bg-orange-100" },
                { label: "Total Recettes", val: "1,240,000 Ar", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
                { label: "Étudiants Actifs", val: "156", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
                { label: "Croissance", val: "+12%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
            ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
                    <div className={`w-14 h-14 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center`}>
                        <s.icon size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-zinc-400 uppercase">{s.label}</p>
                        <p className="text-2xl font-black text-zinc-900">{s.val}</p>
                    </div>
                </div>
            ))}
         </div>

         {/* Verification Table */}
         <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center">
                <h2 className="text-xl font-black text-zinc-900">VERIFICATION DES PAIEMENTS</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input type="text" placeholder="Rechercher un élève..." className="pl-10 pr-4 py-2 bg-zinc-50 border rounded-xl outline-none focus:ring-2 focus:ring-red-600 transition" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-zinc-400 text-xs font-black uppercase">
                        <tr>
                            <th className="px-8 py-4">Étudiant</th>
                            <th className="px-8 py-4">Filière</th>
                            <th className="px-8 py-4">Module</th>
                            <th className="px-8 py-4">Montant</th>
                            <th className="px-8 py-4">Référence</th>
                            <th className="px-8 py-4">Preuve</th>
                            <th className="px-8 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={7} className="px-8 py-8 h-20 bg-zinc-50/50"></td>
                                </tr>
                            ))
                        ) : payments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-8 py-20 text-center text-zinc-400 font-bold text-xl">AUCUN PAIEMENT EN ATTENTE</td>
                            </tr>
                        ) : payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-zinc-50 transition">
                                <td className="px-8 py-5 font-bold text-zinc-900">{p.student_name}</td>
                                <td className="px-8 py-5 text-sm text-zinc-500">{p.filiere_name}</td>
                                <td className="px-8 py-5">
                                    <span className="bg-zinc-100 px-2 py-1 rounded text-xs font-black">MOD {p.module_number}</span>
                                </td>
                                <td className="px-8 py-5 font-black text-red-600">{p.amount} Ar</td>
                                <td className="px-8 py-5 font-mono text-xs">{p.reference}</td>
                                <td className="px-8 py-5">
                                    <button className="flex items-center gap-1 text-blue-600 font-bold hover:underline">
                                        <Eye size={16} /> Voir proof
                                    </button>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            onClick={() => approvePayment(p.id)}
                                            className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition shadow-lg"
                                        >
                                            <Check size={20} />
                                        </button>
                                        <button className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 transition">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
      </main>
    </div>
  );
}
