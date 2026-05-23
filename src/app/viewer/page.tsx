"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Suspense } from "react";

function PDFViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

  if (!url) return <div className="p-20 text-center font-bold">Aucun document spécifié.</div>;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col text-white select-none" onContextMenu={(e) => e.preventDefault()}>
       <header className="bg-zinc-800 p-4 border-b border-zinc-700 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <button onClick={() => router.back()} className="p-2 hover:bg-zinc-700 rounded-lg transition"><ChevronLeft /></button>
             <div className="flex items-center gap-2">
                <Lock size={16} className="text-red-500" />
                <span className="font-bold text-sm tracking-tight">LECTURE SÉCURISÉE (GSI)</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="bg-zinc-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-600 transition">PAGE PRÉCÉDENTE</button>
             <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-full">Progression: 0%</span>
             <button className="bg-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition">SUIVANT <ChevronRight size={14} className="inline ml-1" /></button>
          </div>
       </header>

       <main className="flex-1 flex justify-center p-4 md:p-8 overflow-auto">
          <div className="max-w-4xl w-full bg-white rounded-lg shadow-2xl relative">
             {/* We use an iframe with embedded mode and sandbox to restrict some interactions, though complete protection is hard on web */}
             <iframe
                src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-[85vh] rounded-lg"
                title="GSI PDF Reader"
             ></iframe>

             {/* Invisible overlay to prevent some right-clicks or drags if needed */}
             <div className="absolute inset-0 pointer-events-none"></div>
          </div>
       </main>

       <footer className="bg-zinc-800 p-4 text-center border-t border-zinc-700">
          <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em]">© UNIVERSITÉ GSI - TOUS DROITS RÉSERVÉS. COPIE INTERDITE.</p>
       </footer>
    </div>
  );
}

export default function PDFViewer() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">Chargement du lecteur sécurisé...</div>}>
      <PDFViewerContent />
    </Suspense>
  );
}
