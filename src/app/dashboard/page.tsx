"use client";

import { useState, useEffect, useCallback } from "react";
import { Book, FileText, BarChart, ClipboardList, User, Bell, LogOut, Lock, CheckCircle, HelpCircle, X, Camera, Send, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface Module {
  id: number;
  module_number: number;
  subject1_name: string;
  subject1_pdf: string;
  subject2_name: string;
  subject2_pdf: string;
  price: number;
  unlocked: boolean;
}

interface Exam {
  id: number;
  title: string;
  description: string;
  pdf_url: string;
  type: string;
  end_date: string;
  grade?: number;
  feedback?: string;
  submission_url?: string;
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("modules");
  const [modules, setModules] = useState<Module[]>([]);
  const [items, setItems] = useState<Exam[]>([]); // Covers exams, homework, exercises
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [reference, setReference] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState<number | null>(null);

  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const mRes = await fetch("/formation/api/modules");
      if (mRes.status === 401) return router.push("/");
      setModules(await mRes.json());

      const typeMap: Record<string, string> = {
        "examen": "examen",
        "devoir": "devoir",
        "exercice": "exercice"
      };

      const targetType = typeMap[activeTab] || "examen";
      const eRes = await fetch(`/formation/api/exams?type=${targetType}`);
      if (eRes.ok) setItems(await eRes.json());

      const aRes = await fetch("/formation/api/announcements");
      if (aRes.ok) setAnnouncements(await aRes.json());

      const msgRes = await fetch("/formation/api/messages");
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePurchase = (mod: Module) => {
    if (mod.module_number > 1) {
      const prev = modules.find(m => m.module_number === mod.module_number - 1);
      if (!prev?.unlocked) {
        alert("Vous devez déverrouiller le module " + (mod.module_number - 1) + " avant d'acheter celui-ci.");
        return;
      }
    }
    setSelectedModule(mod);
    setShowPurchaseModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitPayment = async () => {
    if (!reference || !proofImage || !selectedModule) {
      alert("Veuillez remplir la référence et ajouter une preuve de paiement.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/formation/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_id: selectedModule.id,
          reference,
          proof_image: proofImage,
          amount: selectedModule.price
        })
      });
      if (res.ok) {
        alert("Paiement envoyé ! L'administration va vérifier votre transaction.");
        setShowPurchaseModal(false);
        setReference("");
        setProofImage(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de l'envoi");
      }
    } catch (e) {
      alert("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage) return;
    try {
      const res = await fetch("/formation/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage })
      });
      if (res.ok) {
        setNewMessage("");
        fetchData();
      }
    } catch (e) {
      alert("Erreur d'envoi");
    }
  };

  const handleItemSubmit = async (itemId: number) => {
    const fileUrl = prompt("Entrez le lien vers votre fichier de réponse (PDF/Drive) :");
    if (!fileUrl) return;
    setItemSubmitting(itemId);
    try {
      const res = await fetch(`/formation/api/exams/${itemId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: fileUrl })
      });
      if (res.ok) {
        alert("Envoyé !");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      alert("Erreur");
    } finally {
      setItemSubmitting(null);
    }
  };

  const tabs = [
    { id: "modules", label: "Modules", icon: Book },
    { id: "exercice", label: "Exercices", icon: FileText },
    { id: "note", label: "Notes", icon: BarChart },
    { id: "devoir", label: "Devoirs", icon: ClipboardList },
    { id: "examen", label: "Examens", icon: HelpCircle },
    { id: "profil", label: "Profil", icon: User },
  ];

  const openModule = (m: Module) => {
    router.push(`/formation/viewer?mod=${m.id}&f1=${m.subject1_pdf}&f2=${m.subject2_pdf}`);
  };

  const openItemPdf = (pdf: string) => {
     window.open(`/formation/api/files/${pdf}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">G</div>
            <span className="font-bold text-xl tracking-tight uppercase">GSI FORMATION</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold ${
                activeTab === tab.id ? "bg-red-600 text-white shadow-lg" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
           <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 font-bold transition">
              <LogOut size={20} /> DECONNEXION
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <header className="bg-white border-b p-4 px-8 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{activeTab}</h2>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-zinc-100 rounded-full border border-zinc-200 flex items-center justify-center font-bold text-zinc-500 uppercase">U</div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-6xl mx-auto">
           {activeTab === "modules" && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-zinc-200 animate-pulse rounded-3xl"></div>)
                ) : (
                  modules.map((m, idx) => {
                    const isLocked = !m.unlocked;
                    const canBuy = m.module_number === 1 || modules[idx - 1]?.unlocked;

                    return (
                      <div key={m.id} className={`bg-white rounded-[2rem] p-8 border-2 transition-all duration-300 relative ${isLocked ? 'border-zinc-100 grayscale-[0.5] opacity-90' : 'border-white shadow-xl hover:-translate-y-2'}`}>
                         <div className="flex justify-between items-center mb-6">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isLocked ? 'bg-zinc-100 text-zinc-400' : 'bg-red-600 text-white'}`}>MODULE {m.module_number}</div>
                            {m.unlocked ? (
                              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-sm"><CheckCircle size={24} /></div>
                            ) : (
                              <div className="w-10 h-10 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center"><Lock size={20} /></div>
                            )}
                         </div>
                         <h3 className="font-black text-xl text-zinc-900 mb-3 uppercase tracking-tight leading-tight">{m.subject1_name || "Matière à venir"}</h3>
                         <p className="text-sm text-zinc-500 mb-8 font-medium italic">Complétez ce module pour débloquer les ressources suivantes.</p>

                         {m.unlocked ? (
                           <button onClick={() => openModule(m)} className="w-full bg-zinc-900 text-white font-black py-4 rounded-2xl hover:bg-black transition shadow-lg tracking-widest uppercase text-xs">ACCÉDER AU COURS</button>
                         ) : (
                           <button
                             disabled={!canBuy}
                             onClick={() => handlePurchase(m)}
                             className={`w-full font-black py-4 rounded-2xl transition shadow-md tracking-widest uppercase text-xs ${canBuy ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'}`}
                           >
                             {canBuy ? `ACHETER (${m.price} AR)` : "VERROUILLÉ"}
                           </button>
                         )}
                      </div>
                    );
                  })
                )}
             </div>
           )}

           {(activeTab === "examen" || activeTab === "devoir" || activeTab === "exercice") && (
              <div className="space-y-6">
                 {items.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border shadow-sm">
                       <HelpCircle size={64} className="mx-auto text-zinc-300 mb-6" />
                       <h3 className="text-2xl font-black uppercase text-zinc-400">Aucun {activeTab} programmé</h3>
                    </div>
                 ) : (
                    items.map(e => (
                       <div key={e.id} className="bg-white p-8 rounded-[2rem] border shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-2">
                                <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{activeTab}</span>
                                {e.grade !== undefined && <span className="bg-green-100 text-green-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">NOTÉ : {e.grade}/20</span>}
                             </div>
                             <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">{e.title}</h3>
                             <p className="text-zinc-500 mt-2 text-sm italic">{e.description}</p>
                             {e.feedback && <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border-l-4 border-red-600 text-xs font-bold text-zinc-600">Note du prof : {e.feedback}</div>}
                          </div>
                          <div className="flex flex-col gap-3 w-full md:w-auto">
                             <button onClick={() => openItemPdf(e.pdf_url)} className="bg-zinc-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center">LIRE LE SUJET</button>
                             <button
                                onClick={() => handleItemSubmit(e.id)}
                                disabled={itemSubmitting === e.id}
                                className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-lg transition ${e.submission_url ? 'bg-zinc-100 text-zinc-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'}`}
                             >
                                {e.submission_url ? 'MODIFIER RÉPONSE' : 'RENDRE LA COPIE'}
                             </button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           )}

           {activeTab === "note" && (
              <div className="space-y-8">
                 <div className="bg-zinc-950 p-10 rounded-[2.5rem] text-white shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><BarChart size={120} /></div>
                    <p className="text-red-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Vue Globale</p>
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">MES PERFORMANCES</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                       <div>
                          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Moyenne</p>
                          <p className="text-3xl font-black">-- / 20</p>
                       </div>
                       <div>
                          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Modules</p>
                          <p className="text-3xl font-black text-red-600">{modules.filter(m => m.unlocked).length}/20</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          <tr>
                             <th className="px-10 py-5">Évaluation</th>
                             <th className="px-10 py-5 text-right">Note</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-100">
                          {items.filter(e => e.grade !== undefined).map(e => (
                             <tr key={e.id}>
                                <td className="px-10 py-6 font-black text-zinc-900 uppercase">{e.title}</td>
                                <td className="px-10 py-6 text-right font-black text-xl text-red-600 tracking-tighter">{e.grade}/20</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {activeTab === "annonce" && (
              <div className="space-y-4">
                 {announcements.map((a, i) => (
                    <div key={i} className="bg-white p-8 rounded-3xl border-l-8 border-red-600 shadow-md">
                       <div className="flex justify-between items-start mb-4">
                          <h3 className="font-black text-xl uppercase tracking-tighter">{a.title}</h3>
                          <span className="text-[10px] font-bold text-zinc-400">{new Date(a.created_at).toLocaleDateString()}</span>
                       </div>
                       <p className="text-zinc-600 font-medium leading-relaxed">{a.content}</p>
                    </div>
                 ))}
              </div>
           )}

           {(activeTab === "profil") && (
             <div className="bg-white rounded-[2.5rem] border shadow-xl p-10 flex flex-col items-center">
                <div className="w-32 h-32 bg-zinc-100 rounded-full border-4 border-white shadow-lg mb-6 flex items-center justify-center font-black text-4xl text-zinc-300">U</div>
                <h3 className="text-2xl font-black uppercase">Mon Compte</h3>
                <p className="text-zinc-400 font-bold mb-10 tracking-widest text-xs uppercase">GSI Formation Étudiant</p>
                <div className="w-full max-w-md space-y-4">
                   <button onClick={() => router.push("/")} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-red-700 transition shadow-lg tracking-widest uppercase text-xs">
                      <LogOut size={18} /> SE DÉCONNECTER
                   </button>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-zinc-300 uppercase mt-8 tracking-widest">GSI SMARTPAY v1.2.0 • 2024</p>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Floating Support Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 bg-red-600 text-white p-5 rounded-full shadow-[0_10px_30px_rgba(220,38,38,0.4)] hover:scale-110 transition active:scale-95 z-40"
      >
         {showChat ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {/* Chat Modal */}
      {showChat && (
         <div className="fixed bottom-40 right-6 md:bottom-32 md:right-10 w-[350px] h-[500px] bg-white rounded-[2rem] shadow-2xl z-40 flex flex-col overflow-hidden border border-zinc-100 animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-6 bg-red-600 text-white flex items-center gap-4">
               <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><MessageSquare size={20} /></div>
               <div>
                  <p className="font-black text-xs uppercase tracking-widest">Support GSI</p>
                  <p className="text-[10px] font-bold opacity-80">En ligne pour vous aider</p>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
               {messages.length === 0 ? (
                  <div className="text-center py-10 opacity-30 italic text-sm">Posez votre question ici...</div>
               ) : (
                  messages.map((m, i) => (
                     <div key={i} className={`max-w-[80%] p-4 rounded-2xl text-xs font-bold ${m.sender_id === 1 ? 'bg-zinc-200 text-zinc-800' : 'bg-red-600 text-white ml-auto'}`}>
                        {m.message}
                     </div>
                  ))
               )}
            </div>
            <div className="p-4 border-t flex gap-2">
               <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Message..."
                  className="flex-1 bg-zinc-100 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-red-600 outline-none"
               />
               <button onClick={handleSendMessage} className="p-3 bg-red-600 text-white rounded-xl"><Send size={18} /></button>
            </div>
         </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedModule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="p-8 bg-zinc-950 text-white flex justify-between items-center">
                 <div>
                    <p className="text-red-500 font-black text-xs uppercase tracking-[0.2em] mb-1">Paiement sécurisé</p>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">DEVERROUILLAGE MODULE {selectedModule.module_number}</h3>
                 </div>
                 <button onClick={() => setShowPurchaseModal(false)} className="p-2 hover:bg-white/10 rounded-full transition"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-100">
                       <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">M-VOLA</p>
                       <p className="text-lg font-black text-red-600">034 64 272 51</p>
                    </div>
                    <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-100">
                       <p className="text-[10px] font-black text-zinc-400 uppercase mb-2">ORANGE MONEY</p>
                       <p className="text-lg font-black text-orange-600">038 46 457 25</p>
                    </div>
                 </div>

                 <div className="text-center py-4 bg-red-50 border-2 border-red-100 rounded-3xl">
                    <p className="text-sm font-bold text-red-600">Montant à envoyer : <span className="text-2xl font-black">{selectedModule.price} Ar</span></p>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Référence de transaction</label>
                       <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ex: 56984236..."
                        className="w-full bg-zinc-50 border-2 border-zinc-100 p-5 rounded-2xl font-bold focus:border-red-600 outline-none transition"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Preuve de paiement (Screenshot)</label>
                       <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="proof-upload"
                          />
                          <label htmlFor="proof-upload" className="w-full h-32 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-zinc-50 transition overflow-hidden">
                             {proofImage ? (
                               <img src={proofImage} className="w-full h-full object-cover" alt="Proof" />
                             ) : (
                               <>
                                 <Camera className="text-zinc-300" size={32} />
                                 <span className="text-xs font-black text-zinc-400 uppercase">Télécharger une image</span>
                               </>
                             )}
                          </label>
                       </div>
                    </div>
                 </div>

                 <button
                  onClick={submitPayment}
                  disabled={submitting}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-[1.5rem] hover:bg-red-700 transition shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 tracking-[0.1em] uppercase text-sm disabled:opacity-50"
                 >
                    {submitting ? "ENVOI EN COURS..." : <><Send size={18} /> CONFIRMER L'ACHAT</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Navigation Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 pb-6 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${
              activeTab === tab.id ? "text-red-600 scale-110" : "text-zinc-400"
            }`}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
