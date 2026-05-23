"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Book, FileText, Bell, Users, MessageSquare, LogOut, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StaffDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("filiere");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/formation/api/auth/prof-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) setIsLoggedIn(true);
      else setError("Mot de passe incorrect");
    } catch (e) {
      setError("Erreur de connexion");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-[0_0_20px_rgba(220,38,38,0.5)]">G</div>
          </div>
          <h1 className="text-white text-2xl font-bold text-center mb-8">ESPACE PERSONNEL GSI</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-zinc-400 text-sm mb-2 block">Code d'accès sécurisé</label>
              <input
                type="password"
                className="w-full bg-zinc-800 border-zinc-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition shadow-lg">ACCÉDER AU MOTEUR</button>
          </form>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "filiere", label: "Gestion Filières", icon: Book },
    { id: "examen", label: "Examens", icon: HelpCircle },
    { id: "devoir", label: "Devoirs", icon: FileText },
    { id: "message", label: "Messages", icon: MessageSquare, badge: 3 },
    { id: "annonce", label: "Annonces", icon: Bell },
    { id: "eleve", label: "Liste Élèves", icon: Users },
  ];

  function HelpCircle(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r flex flex-col h-screen sticky top-0">
         <div className="p-8">
            <h2 className="text-2xl font-black text-red-600 italic">PROF-ADD <span className="text-zinc-400 text-xs not-italic">v1.0</span></h2>
         </div>
         <nav className="flex-1 px-4 space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition font-bold ${activeTab === item.id ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100'}`}
              >
                <div className="flex items-center gap-3">
                   <item.icon size={22} />
                   {item.label}
                </div>
                {item.badge && <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === item.id ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>{item.badge}</span>}
              </button>
            ))}
         </nav>
         <div className="p-6 border-t">
            <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 p-4 text-zinc-400 hover:text-red-600 transition font-bold">
               <LogOut size={22} />
               DÉCONNEXION
            </button>
         </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-10 overflow-auto">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-10">
               <div>
                  <p className="text-zinc-400 font-medium mb-1">Moteur de gestion</p>
                  <h1 className="text-4xl font-black text-zinc-900 uppercase">{activeTab}</h1>
               </div>
               <button className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition shadow-lg">
                  <PlusCircle size={20} /> AJOUTER
               </button>
            </div>

            {activeTab === 'filiere' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "Tourisme, Voyage & Hôtellerie",
                  "Droit & Techniques des Affaires",
                  "Bâtiment & Travaux Publics",
                  "Informatique de Gestion",
                  "Management des Affaires",
                  "Multimédia, Communication & Journalisme"
                ].map((f, i) => (
                  <div key={i} className="group bg-white p-6 rounded-3xl border border-zinc-200 hover:border-red-500 hover:shadow-xl transition cursor-pointer flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase tracking-widest">BTS</span>
                      <h3 className="text-xl font-bold text-zinc-800 mt-1">{f}</h3>
                    </div>
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition">
                       <ChevronRight size={24} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab !== 'filiere' && (
              <div className="bg-white border-2 border-dashed border-zinc-200 rounded-3xl h-[400px] flex flex-col items-center justify-center text-zinc-300">
                 <div className="mb-4"><PlusCircle size={64} /></div>
                 <p className="text-xl font-bold">Section {activeTab} en cours de développement</p>
              </div>
            )}
         </div>
      </main>
    </div>
  );
}
