"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, Printer, Download, EyeOff, ChevronRight, ChevronLeft } from "lucide-react";

function ViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleId = searchParams.get("mod");
  const f1 = searchParams.get("f1");
  const f2 = searchParams.get("f2");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentFile, setCurrentFile] = useState(f1);
  const [progression, setProgression] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/formation/api/modules");
        if (res.status === 401) {
          router.push("/formation");
          return;
        }

        const data = await res.json();
        const mod = data.find((m: any) => m.id.toString() === moduleId);
        if (!mod || !mod.unlocked) {
          setError("Ce module est verrouillé. Veuillez l'acheter pour y accéder.");
        } else {
           setProgression(mod.progression || 0);
        }
      } catch (e) {
        setError("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s" || e.key === "c")) {
        e.preventDefault();
        alert("Action non autorisée pour la protection du contenu GSI.");
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moduleId, router]);

  const updateProgression = async (newVal: number) => {
     if (newVal > progression) {
        setProgression(newVal);
        await fetch(`/formation/api/modules/${moduleId}/progression`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ progression: newVal })
        });
     }
  };

  if (loading) return (
    <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center">
       <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
       <p className="text-white font-black mt-8 tracking-widest uppercase text-xs">Vérification de sécurité...</p>
    </div>
  );

  if (error) return (
    <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
       <div className="bg-red-600/10 p-10 rounded-full mb-8"><Lock size={64} className="text-red-600" /></div>
       <h1 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">{error}</h1>
       <button onClick={() => router.back()} className="bg-white text-black font-black px-8 py-4 rounded-2xl hover:bg-zinc-200 transition">RETOUR AU TABLEAU DE BORD</button>
    </div>
  );

  return (
    <div className="h-screen bg-zinc-900 flex flex-col overflow-hidden select-none">
       {/* Top Bar */}
       <header className="bg-zinc-950 border-b border-zinc-800 p-4 px-8 flex justify-between items-center z-20">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white flex items-center gap-2 font-bold transition">
             <ArrowLeft size={20} /> QUITTER LE MODULE
          </button>

          <div className="flex flex-col items-center">
             <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Module {moduleId} - GSI</p>
             <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${progression}%` }}></div>
             </div>
             <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase">{progression}% complété</p>
          </div>

          <div className="flex gap-4 opacity-30 cursor-not-allowed">
             <Printer size={20} className="text-zinc-500" />
             <Download size={20} className="text-zinc-500" />
          </div>
       </header>

       {/* Content */}
       <div className="flex-1 relative bg-zinc-800 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-md p-3 px-6 rounded-2xl border border-zinc-700 flex items-center gap-3 z-20 shadow-2xl">
             <EyeOff size={16} className="text-red-500" />
             <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">Protection Active</p>
          </div>

          {/* Secure Frame */}
          <div className="w-full max-w-5xl h-[85%] bg-white rounded-xl shadow-2xl overflow-hidden relative group">
             <iframe
               src={`/formation/api/files/${currentFile}#toolbar=0&navpanes=0&scrollbar=0`}
               className="w-full h-full border-none"
               onLoad={() => {
                  if (currentFile === f2) updateProgression(100);
                  else updateProgression(50);
               }}
             />
             {/* Invisible blocker for right click on iframe (though we have listener) */}
             <div className="absolute inset-0 bg-transparent pointer-events-none"></div>

             {/* Watermark */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <p className="text-[12rem] font-black text-black -rotate-12">GSI FORMATION</p>
             </div>
          </div>

          {/* Controls */}
          <div className="p-6 flex gap-4 z-20">
             <button
               onClick={() => setCurrentFile(f1)}
               className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition ${currentFile === f1 ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
             >
                <ChevronLeft size={18} /> Matière 1
             </button>
             <button
               onClick={() => {
                  setCurrentFile(f2);
                  updateProgression(100);
               }}
               className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition ${currentFile === f2 ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
             >
                Matière 2 <ChevronRight size={18} />
             </button>
          </div>
       </div>
    </div>
  );
}

export default function SecureViewer() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
