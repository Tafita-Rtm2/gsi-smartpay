"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Receipt, Download, Search, Eye, Printer, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchPaiements, fetchStudents, DBPaiement, DBStudent, getStudentId, formatMGA } from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";

export default function RecusPage() {
  const { currentUser } = useAuth();
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<DBPaiement | null>(null);

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const isAdmin = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [pays, studs] = await Promise.all([fetchPaiements(), fetchStudents()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myIds = new Set(studs.filter(s => (s.campus || "").toLowerCase().includes(myEtab)).map(s => getStudentId(s)));
      setPaiements(pays.filter(p => myIds.has(p.etudiantId)));
    } else {
      setPaiements(pays);
    }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return paiements.filter(p =>
      (p.etudiantNom || "").toLowerCase().includes(q) ||
      (p.reference || "").toLowerCase().includes(q) ||
      (p.matricule || "").toLowerCase().includes(q)
    );
  }, [paiements, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recus</h1>
          <p className="text-sm text-slate-500 mt-0.5">{loading ? "Chargement..." : `${paiements.length} recus`}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors self-start">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
        </button>
      </div>

      <div className="card">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher un recu..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mx-auto mb-3" /><p className="text-slate-400 text-sm">Chargement...</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <div key={p.id || p._id || i} className="card hover:shadow-md transition-shadow border border-slate-100">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (etabInfo?.color || "#2563eb") + "22" }}>
                  <Receipt size={18} style={{ color: etabInfo?.color || "#2563eb" }} />
                </div>
                <span className="text-xs font-mono text-slate-400">{p.reference || "—"}</span>
              </div>
              <div className="flex justify-between items-start mb-0.5">
                <div className="font-bold text-slate-900 truncate pr-2">{p.etudiantNom}</div>
                {p.preuve && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded uppercase">
                    <Eye size={10} /> Photo
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-400 mb-3 truncate">{p.matricule} · {p.filiere || ""} {p.classe ? `· ${p.classe}` : ""}</div>
              <div className="text-2xl font-bold mb-3" style={{ color: etabInfo?.color || "#2563eb" }}>{formatMGA(p.montant)}</div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                <span>{p.date}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-full">{p.mode}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreview(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Eye size={13} /> Apercu
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                  style={{ background: etabInfo?.color || "#2563eb" }}
                  onClick={() => window.print()}>
                  <Download size={13} /> PDF
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Receipt size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun recu</p>
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" id="recu-print">
            <div className="rounded-t-2xl px-6 py-5 text-white" style={{ background: etabInfo?.color || "#2563eb" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-lg">GSI SmartPay</div>
                <div className="text-xs opacity-70">RECU OFFICIEL</div>
              </div>
              <div className="text-xs opacity-70">{etabInfo?.label || preview.campus}</div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono font-bold text-slate-900">{preview.reference || "—"}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="space-y-2 text-sm">
                {[
                  { label: "Etudiant", value: preview.etudiantNom },
                  { label: "Matricule", value: preview.matricule || "—" },
                  { label: "Filiere", value: `${preview.filiere || "—"} ${preview.classe ? "— " + preview.classe : ""}` },
                  { label: "Date", value: preview.date },
                  { label: "Mode", value: preview.mode },
                  { label: "Agent", value: preview.agentNom },
                  ...(preview.note ? [{ label: "Note", value: preview.note }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-medium text-slate-900 text-right text-xs truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold">Montant paye</span>
                <span className="text-2xl font-bold" style={{ color: etabInfo?.color || "#2563eb" }}>{formatMGA(preview.montant)}</span>
              </div>

              {preview.preuve && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Justificatif de paiement</div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group relative">
                    <img src={preview.preuve} alt="Preuve" className="w-full h-auto max-h-[200px] object-contain" />
                    <button onClick={() => {
                      const win = window.open();
                      if (win) win.document.write(`<body style="margin:0; background:#000; display:flex; align-items:center; justify-center"><img src="${preview.preuve}" style="max-width:100%; max-height:100vh; margin:auto"></body>`);
                    }} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-xs font-bold"><Eye size={16}/> Agrandir</div>
                    </button>
                  </div>
                </div>
              )}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center">
                <span className="text-emerald-700 font-bold text-sm">Paiement confirme</span>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Fermer
              </button>
              <button onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors">
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
