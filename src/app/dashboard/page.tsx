"use client";

import { useState, useEffect } from "react";
import { Book, FileText, BarChart, ClipboardList, User, Bell, LogOut, Lock, CheckCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Module {
  id: number;
  module_number: number;
  subject1_name: string;
  price: number;
  unlocked: boolean;
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("modules");
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch("/formation/api/modules");
        if (res.status === 401) return router.push("/");
        const data = await res.json();
        setModules(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [router]);

  const tabs = [
    { id: "modules", label: "Modules", icon: Book },
    { id: "exercice", label: "Exercices", icon: FileText },
    { id: "note", label: "Notes", icon: BarChart },
    { id: "devoir", label: "Devoirs", icon: ClipboardList },
    { id: "examen", label: "Examens", icon: HelpCircle },
    { id: "profil", label: "Profil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">G</div>
            <span className="font-bold text-xl tracking-tight">GSI Formation</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                activeTab === tab.id ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
           <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition">
              <LogOut size={20} /> Déconnexion
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {/* Header mobile/desktop */}
        <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
             <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <div className="w-8 h-8 bg-gray-200 rounded-full border border-gray-300"></div>
          </div>
        </header>

        <div className="p-4 md:p-8">
           {activeTab === "modules" && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  Array(6).fill(0).map((_, i) => <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-2xl"></div>)
                ) : (
                  modules.map((m, idx) => (
                    <div key={m.id} className={`bg-white rounded-2xl p-6 border shadow-sm relative overflow-hidden ${!m.unlocked && idx > 0 && !modules[idx - 1]?.unlocked ? 'opacity-75' : ''}`}>
                       <div className="flex justify-between items-start mb-4">
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">MODULE {m.module_number}</span>
                          {m.unlocked ? (
                            <CheckCircle className="text-green-500" size={24} />
                          ) : (
                            <Lock className="text-gray-400" size={24} />
                          )}
                       </div>
                       <h3 className="font-bold text-lg mb-2">{m.subject1_name || "Matière à venir"}</h3>
                       <p className="text-sm text-gray-500 mb-6 line-clamp-2">Accédez aux cours PDF et aux ressources pédagogiques de ce module.</p>

                       {m.unlocked ? (
                         <button className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition">OUVRIR</button>
                       ) : (
                         <button className="w-full border-2 border-red-600 text-red-600 font-bold py-2 rounded-lg hover:bg-red-50 transition">DÉVERROUILLER ({m.price} Ar)</button>
                       )}
                    </div>
                  ))
                )}
             </div>
           )}

           {activeTab !== "modules" && (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="bg-gray-100 p-8 rounded-full mb-4">
                   {tabs.find(t => t.id === activeTab)?.icon({ size: 48 })}
                </div>
                <p className="text-xl font-medium">Contenu de la section {activeTab} à venir.</p>
             </div>
           )}
        </div>
      </main>

      {/* Floating Support Button */}
      <button className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-red-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition active:scale-95 z-20">
         <HelpCircle size={24} />
      </button>

      {/* Navigation Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-lg transition ${
              activeTab === tab.id ? "text-red-600" : "text-gray-400"
            }`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] mt-1 font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
