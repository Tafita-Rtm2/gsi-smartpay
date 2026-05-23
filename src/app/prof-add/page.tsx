"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Book, FileText, Bell, Users, MessageSquare, LogOut, ChevronRight, X, Send, CheckCircle, Clock, Trash2, HelpCircle, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";

interface Filiere {
  id: number;
  name: string;
  type: string;
}

interface Submission {
  id: number;
  student_name: string;
  exam_title: string;
  filiere_name: string;
  file_url: string;
  submitted_at: string;
  grade?: number;
  type: string;
}

interface Student {
   id: number;
   full_name: string;
   email: string;
   filiere_name: string;
   created_at: string;
}

export default function StaffDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("filiere");
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState<Filiere | null>(null);

  // Forms
  const [showAddModule, setShowAddModule] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    module_number: 1,
    subject1_name: "",
    subject2_name: "",
    price: 50000,
    file1: null as File | null,
    file2: null as File | null
  });

  const [showAddItem, setShowAddItem] = useState<{show: boolean, type: 'examen' | 'devoir' | 'exercice'}>({show: false, type: 'examen'});
  const [itemForm, setItemForm] = useState({
    title: "",
    description: "",
    pdf_file: null as File | null,
    end_date: ""
  });

  const [showGradeModal, setShowGradeModal] = useState<Submission | null>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");

   // Announcements
   const [announcementForm, setAnnouncementForm] = useState({
      title: "",
      content: "",
      filiere_ids: [] as number[]
   });

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const typeMap: Record<string, string> = {
         "filiere": "examen",
         "examen": "examen",
         "devoir": "devoir",
         "exercice": "exercice"
      };
      const targetType = typeMap[activeTab] || "examen";

      const sRes = await fetch(`/formation/api/staff/submissions?type=${targetType}`);
      if (sRes.ok) setSubmissions(await sRes.json());

      const stRes = await fetch("/formation/api/staff/students");
      if (stRes.ok) setStudents(await stRes.json());
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isLoggedIn) {
       setFilieres([
          { id: 1, name: "Tourisme, Voyage & Hôtellerie", type: "BTS" },
          { id: 2, name: "Droit & Techniques des Affaires", type: "BTS" },
          { id: 3, name: "Bâtiment & Travaux Publics", type: "BTS" },
          { id: 4, name: "Informatique de Gestion", type: "BTS" },
          { id: 5, name: "Management des Affaires", type: "BTS" },
          { id: 6, name: "Multimédia, Communication & Journalisme", type: "BTS" },
       ]);
       fetchData();
    }
  }, [isLoggedIn, fetchData]);

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

  const uploadFile = async (file: File) => {
    return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = async () => {
          try {
             const res = await fetch("/formation/api/staff/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: file.name, base64Data: reader.result })
             });
             const data = await res.json();
             if (res.ok) resolve(data.url);
             else reject(data.error);
          } catch (e) { reject(e); }
       };
       reader.readAsDataURL(file);
    });
  };

  const handleAddModule = async () => {
    if (!selectedFiliere) return;
    try {
      let url1 = "";
      let url2 = "";
      if (moduleForm.file1) url1 = await uploadFile(moduleForm.file1) as string;
      if (moduleForm.file2) url2 = await uploadFile(moduleForm.file2) as string;

      const res = await fetch("/formation/api/staff/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filiere_id: selectedFiliere.id,
          module_number: moduleForm.module_number,
          subject1_name: moduleForm.subject1_name,
          subject2_name: moduleForm.subject2_name,
          price: moduleForm.price,
          subject1_pdf: url1.split('/').pop(),
          subject2_pdf: url2.split('/').pop(),
        })
      });
      if (res.ok) {
        alert("Module ajouté !");
        setShowAddModule(false);
      }
    } catch (e) {
      alert("Erreur lors de l'ajout");
    }
  };

  const handleAddItem = async () => {
    if (!selectedFiliere) return;
    try {
      let pdf_url = "";
      if (itemForm.pdf_file) pdf_url = await uploadFile(itemForm.pdf_file) as string;

      const res = await fetch("/formation/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filiere_id: selectedFiliere.id,
          title: itemForm.title,
          description: itemForm.description,
          pdf_url: pdf_url.split('/').pop(),
          end_date: itemForm.end_date,
          type: showAddItem.type
        })
      });
      if (res.ok) {
        alert(`${showAddItem.type} publié !`);
        setShowAddItem({...showAddItem, show: false});
      }
    } catch (e) {
      alert("Erreur");
    }
  };

  const submitGrade = async () => {
    if (!showGradeModal) return;
    try {
      const res = await fetch(`/formation/api/staff/submissions/${showGradeModal.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: gradeValue, feedback: feedbackValue })
      });
      if (res.ok) {
        alert("Note enregistrée !");
        setShowGradeModal(null);
        fetchData();
      }
    } catch (e) {
      alert("Erreur");
    }
  };

  const handleSendAnnouncement = async () => {
     try {
        const res = await fetch("/formation/api/announcements", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify(announcementForm)
        });
        if (res.ok) {
           alert("Annonce publiée !");
           setAnnouncementForm({ title: "", content: "", filiere_ids: [] });
        }
     } catch (e) {
        alert("Erreur");
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
    { id: "filiere", label: "Gestion Filières", icon: Book, badge: 0 },
    { id: "examen", label: "Corrections Examen", icon: CheckCircle, badge: submissions.filter(s => s.type === 'examen').length },
    { id: "devoir", label: "Corrections Devoir", icon: ClipboardList, badge: submissions.filter(s => s.type === 'devoir').length },
    { id: "exercice", label: "Corrections Exercice", icon: FileText, badge: submissions.filter(s => s.type === 'exercice').length },
    { id: "eleve", label: "Liste Élèves", icon: Users, badge: 0 },
    { id: "annonce", label: "Annonces", icon: Bell, badge: 0 },
  ];

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
                <div className="flex items-center gap-3 text-xs uppercase tracking-tight">
                   <item.icon size={18} />
                   {item.label}
                </div>
                {item.badge > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === item.id ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>{item.badge}</span>}
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
         <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-10">
               <div>
                  <p className="text-zinc-400 font-medium mb-1 tracking-[0.2em] uppercase text-xs">Moteur de gestion GSI</p>
                  <h1 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter">{activeTab}</h1>
               </div>
               {activeTab === 'filiere' && selectedFiliere && (
                 <div className="flex gap-4">
                    <button onClick={() => setShowAddModule(true)} className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg">
                        <PlusCircle size={20} /> MODULE
                    </button>
                    <button onClick={() => setShowAddItem({show: true, type: 'examen'})} className="bg-red-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition shadow-lg text-xs uppercase">
                        EXAMEN
                    </button>
                    <button onClick={() => setShowAddItem({show: true, type: 'devoir'})} className="bg-orange-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 transition shadow-lg text-xs uppercase">
                        DEVOIR
                    </button>
                    <button onClick={() => setShowAddItem({show: true, type: 'exercice'})} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg text-xs uppercase">
                        EXERCICE
                    </button>
                 </div>
               )}
            </div>

            {activeTab === 'filiere' && !selectedFiliere && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filieres.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFiliere(f)}
                    className="group bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-red-500 shadow-sm hover:shadow-2xl transition cursor-pointer flex flex-col justify-between h-48"
                  >
                    <div>
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full">{f.type}</span>
                      <h3 className="text-xl font-black text-zinc-800 mt-4 leading-tight uppercase tracking-tighter">{f.name}</h3>
                    </div>
                    <div className="flex items-center text-zinc-400 font-bold text-xs group-hover:text-red-600 transition">
                       GÉRER LA FILIÈRE <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'filiere' && selectedFiliere && (
               <div className="space-y-6">
                  <button onClick={() => setSelectedFiliere(null)} className="text-zinc-400 hover:text-red-600 font-bold flex items-center gap-2 transition mb-4">
                     <X size={20} /> FERMER {selectedFiliere.name}
                  </button>
                  <div className="bg-white p-10 rounded-[2.5rem] border shadow-xl">
                     <h2 className="text-2xl font-black mb-8 uppercase">Configuration des Contenus</h2>
                     <p className="text-zinc-500 mb-10 italic font-bold">Utilisez les boutons en haut à droite pour ajouter du contenu à cette filière.</p>
                  </div>
               </div>
            )}

            {(activeTab === 'examen' || activeTab === 'devoir' || activeTab === 'exercice') && (
              <div className="space-y-6">
                 {submissions.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border shadow-sm">
                       <CheckCircle size={64} className="mx-auto text-green-500 mb-6" />
                       <h3 className="text-2xl font-black uppercase tracking-tighter">Tout est noté</h3>
                       <p className="text-zinc-400 mt-2 font-bold">Aucune soumission en attente pour {activeTab}.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 gap-4">
                       {submissions.map(sub => (
                          <div key={sub.id} className="bg-white p-6 rounded-3xl border hover:shadow-xl transition flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400">
                                   <FileText size={28} />
                                </div>
                                <div>
                                   <p className="font-black text-zinc-900 uppercase tracking-tight">{sub.student_name}</p>
                                   <p className="text-xs font-bold text-red-600 uppercase">{sub.filiere_name} • {sub.exam_title}</p>
                                   <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-bold uppercase">
                                      <Clock size={10} /> {new Date(sub.submitted_at).toLocaleDateString()}
                                   </p>
                                </div>
                             </div>
                             <div className="flex gap-3">
                                <a href={`/formation/api/files/${sub.file_url}`} target="_blank" className="bg-zinc-100 text-zinc-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition">LIRE</a>
                                <button onClick={() => setShowGradeModal(sub)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition shadow-lg">NOTER</button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'eleve' && (
               <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-zinc-950 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                           <th className="px-10 py-5">Nom Complet</th>
                           <th className="px-10 py-5">Email</th>
                           <th className="px-10 py-5">Filière</th>
                           <th className="px-10 py-5">Inscription</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100">
                        {students.map(s => (
                           <tr key={s.id} className="hover:bg-zinc-50 transition">
                              <td className="px-10 py-6 font-black text-zinc-900 uppercase">{s.full_name}</td>
                              <td className="px-10 py-6 text-sm font-bold text-zinc-500">{s.email}</td>
                              <td className="px-10 py-6 font-bold text-red-600 text-xs uppercase">{s.filiere_name}</td>
                              <td className="px-10 py-6 text-xs text-zinc-400 font-bold">{new Date(s.created_at).toLocaleDateString()}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {activeTab === 'annonce' && (
               <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] border shadow-xl">
                  <h2 className="text-2xl font-black mb-6 uppercase">Publier une annonce</h2>
                  <div className="space-y-6">
                     <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Ciblage (Filières)</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-zinc-50 rounded-xl border">
                           {filieres.map(f => (
                              <label key={f.id} className="flex items-center gap-2 cursor-pointer hover:text-red-600 transition text-sm font-bold">
                                 <input
                                    type="checkbox"
                                    checked={announcementForm.filiere_ids.includes(f.id)}
                                    onChange={(e) => {
                                       const ids = e.target.checked
                                          ? [...announcementForm.filiere_ids, f.id]
                                          : announcementForm.filiere_ids.filter(id => id !== f.id);
                                       setAnnouncementForm({...announcementForm, filiere_ids: ids});
                                    }}
                                 />
                                 {f.name}
                              </label>
                           ))}
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Titre de l'annonce</label>
                        <input
                           type="text"
                           className="w-full bg-zinc-50 border-2 border-zinc-100 p-4 rounded-xl outline-none focus:border-red-600 transition font-bold"
                           placeholder="Ex: Report de l'examen..."
                           value={announcementForm.title}
                           onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Message</label>
                        <textarea
                           rows={6}
                           className="w-full bg-zinc-50 border-2 border-zinc-100 p-4 rounded-xl outline-none focus:border-red-600 transition font-bold"
                           placeholder="Écrivez votre message ici..."
                           value={announcementForm.content}
                           onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                        ></textarea>
                     </div>
                     <button
                        onClick={handleSendAnnouncement}
                        className="w-full bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-red-700 transition shadow-lg tracking-widest uppercase text-xs"
                     >
                        <Send size={18} /> ENVOYER L'ANNONCE
                     </button>
                  </div>
               </div>
            )}
         </div>
      </main>

      {/* MODALS */}
      {showAddModule && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
               <div className="p-8 bg-zinc-950 text-white flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tighter">AJOUTER UN MODULE</h3>
                  <button onClick={() => setShowAddModule(false)}><X size={24} /></button>
               </div>
               <div className="p-8 space-y-4">
                  <input type="number" placeholder="Numéro du module" className="w-full bg-zinc-50 p-4 rounded-xl border" value={moduleForm.module_number} onChange={e => setModuleForm({...moduleForm, module_number: parseInt(e.target.value)})} />
                  <input type="text" placeholder="Nom de la matière 1" className="w-full bg-zinc-50 p-4 rounded-xl border font-bold" value={moduleForm.subject1_name} onChange={e => setModuleForm({...moduleForm, subject1_name: e.target.value})} />
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black uppercase text-zinc-400">PDF Matière 1</label>
                     <input type="file" className="text-xs" onChange={e => setModuleForm({...moduleForm, file1: e.target.files?.[0] || null})} />
                  </div>
                  <input type="text" placeholder="Nom de la matière 2" className="w-full bg-zinc-50 p-4 rounded-xl border font-bold" value={moduleForm.subject2_name} onChange={e => setModuleForm({...moduleForm, subject2_name: e.target.value})} />
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black uppercase text-zinc-400">PDF Matière 2</label>
                     <input type="file" className="text-xs" onChange={e => setModuleForm({...moduleForm, file2: e.target.files?.[0] || null})} />
                  </div>
                  <input type="number" placeholder="Prix (Ar)" className="w-full bg-zinc-50 p-4 rounded-xl border font-bold" value={moduleForm.price} onChange={e => setModuleForm({...moduleForm, price: parseInt(e.target.value)})} />
                  <button onClick={handleAddModule} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-700 transition uppercase tracking-widest text-xs">ENREGISTRER LE MODULE</button>
               </div>
            </div>
         </div>
      )}

      {showAddItem.show && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-zinc-950 text-white flex justify-between items-center uppercase font-black">
                  <h3 className="text-xl tracking-tighter">AJOUTER {showAddItem.type}</h3>
                  <button onClick={() => setShowAddItem({...showAddItem, show: false})}><X size={24} /></button>
               </div>
               <div className="p-8 space-y-4">
                  <input type="text" placeholder="Titre" className="w-full bg-zinc-50 p-4 rounded-xl border font-bold" value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} />
                  <textarea placeholder="Instructions" className="w-full bg-zinc-50 p-4 rounded-xl border font-bold" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] font-black uppercase text-zinc-400">Fichier PDF</label>
                     <input type="file" className="text-xs" onChange={e => setItemForm({...itemForm, pdf_file: e.target.files?.[0] || null})} />
                  </div>
                  <input type="datetime-local" className="w-full bg-zinc-50 p-4 rounded-xl border font-bold" value={itemForm.end_date} onChange={e => setItemForm({...itemForm, end_date: e.target.value})} />
                  <button onClick={handleAddItem} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-700 transition uppercase tracking-widest text-xs">PUBLIER</button>
               </div>
            </div>
         </div>
      )}

      {showGradeModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
               <div className="p-8 bg-zinc-950 text-white flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tighter">NOTER LA COPIE</h3>
                  <button onClick={() => setShowGradeModal(null)}><X size={24} /></button>
               </div>
               <div className="p-8 space-y-6">
                  <div className="text-center">
                     <p className="text-zinc-400 text-[10px] font-black uppercase">Étudiant</p>
                     <p className="text-xl font-black uppercase">{showGradeModal.student_name}</p>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Note (sur 20)</label>
                     <input type="number" max={20} className="w-full bg-zinc-50 p-5 rounded-2xl border-2 border-zinc-100 font-black text-2xl text-center focus:border-red-600 outline-none transition" value={gradeValue} onChange={e => setGradeValue(e.target.value)} />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-zinc-400 uppercase mb-2 block">Commentaires</label>
                     <textarea rows={4} className="w-full bg-zinc-50 p-4 rounded-xl border outline-none focus:border-red-600 transition" placeholder="Excellent travail, continuez ainsi..." value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)}></textarea>
                  </div>
                  <button onClick={submitGrade} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-red-700 transition uppercase tracking-widest text-xs">ENREGISTRER LA NOTE</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
