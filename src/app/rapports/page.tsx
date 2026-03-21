"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, Percent, RefreshCw, Printer, FileText, Download, Users, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ETABLISSEMENTS } from "@/lib/data";
import { fetchStudents, fetchEcolages, fetchPaiements, DBStudent, DBEcolage, DBPaiement, getStudentId, formatMGA } from "@/lib/api";

type Tab = "resultat" | "impaye" | "recouvrement" | "impression";

const MOIS_LABELS = ["Jan","Fev","Mar","Avr","Mai","Juin","Juil","Aout","Sep","Oct","Nov","Dec"];

export default function RapportsPage() {
  const { currentUser, myExpenses } = useAuth();
  const [students,  setStudents]  = useState<DBStudent[]>([]);
  const [ecolages,  setEcolages]  = useState<DBEcolage[]>([]);
  const [paiements, setPaiements] = useState<DBPaiement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("resultat");
  const printRef = useRef<HTMLDivElement>(null);

  // Filters for impression
  const [impMois,  setImpMois]  = useState("tous");
  const [impAnnee, setImpAnnee] = useState("2026");
  const [impType,  setImpType]  = useState<"tous"|"paye"|"impaye">("tous");

  const etabInfo  = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const etabColor = etabInfo?.color || "#2563eb";
  const isAdmin   = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [s, e, p] = await Promise.all([fetchStudents(), fetchEcolages(), fetchPaiements()]);
    if (!isAdmin && currentUser) {
      const myEtab = currentUser.etablissement;
      const myS = s.filter(st => (st.campus||"").toLowerCase().includes(myEtab));
      const myIds = new Set(myS.map(st => getStudentId(st)));
      setStudents(myS); setEcolages(e.filter(ec=>myIds.has(ec.etudiantId))); setPaiements(p.filter(pay=>myIds.has(pay.etudiantId)));
    } else { setStudents(s); setEcolages(e); setPaiements(p); }
    setLoading(false);
  }, [isAdmin, currentUser]);

  useEffect(() => { load(); }, [load]);

  const totalEncaisse = paiements.reduce((s,p)=>s+p.montant,0);
  const totalDepenses = myExpenses.reduce((s,e)=>s+e.montant,0);
  const resultatNet   = totalEncaisse - totalDepenses;
  const totalDu       = ecolages.reduce((s,e)=>s+e.montantDu,0);
  const tauxGlobal    = totalDu>0 ? Math.round((totalEncaisse/totalDu)*100) : 0;
  const studentsImpaye  = students.filter(s => { const ec=ecolages.find(e=>e.etudiantId===getStudentId(s)); return !ec||ec.statut==="impaye"; });
  const studentsPending = students.filter(s => { const ec=ecolages.find(e=>e.etudiantId===getStudentId(s)); return ec?.statut==="en_attente"; });

  // Monthly data as simple array (no Recharts to avoid blue bug)
  const monthlyMap: Record<string, number> = {};
  paiements.forEach(p => {
    const m = (p.date||"").slice(0,7);
    if (m) monthlyMap[m] = (monthlyMap[m]||0) + p.montant;
  });
  const monthlyData = Object.entries(monthlyMap).sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v]) => ({ mois: k, label: MOIS_LABELS[parseInt(k.slice(5))-1]+"/"+k.slice(2,4), montant: v }));
  const maxMontant = Math.max(...monthlyData.map(m=>m.montant), 1);

  // Recouvrement par filiere
  const filieres = etabInfo ? etabInfo.filieres : [];
  const recouvrementData = filieres.map(f => {
    const studs = students.filter(s=>(s.filiere||"")===f);
    const du   = studs.reduce((sum,s)=>{const ec=ecolages.find(e=>e.etudiantId===getStudentId(s));return sum+(ec?.montantDu||0);},0);
    const paye = studs.reduce((sum,s)=>{const ec=ecolages.find(e=>e.etudiantId===getStudentId(s));return sum+(ec?.montantPaye||0);},0);
    return { filiere: f, taux: du>0?Math.round((paye/du)*100):0, du, paye };
  }).filter(r=>r.du>0);

  // Impression filter
  const paiementsFiltres = paiements.filter(p => {
    const dateOk = impMois==="tous" ? (p.date||"").startsWith(impAnnee) : (p.date||"").startsWith(`${impAnnee}-${impMois}`);
    return dateOk;
  });
  const studentsFiltres = students.filter(s => {
    const ec = ecolages.find(e=>e.etudiantId===getStudentId(s));
    if (impType==="paye")   return ec?.statut==="paye";
    if (impType==="impaye") return !ec || ec.statut==="impaye" || ec.statut==="en_attente";
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const TABS = [
    { id: "resultat" as Tab,      label: "Compte de resultat",   icon: TrendingUp   },
    { id: "impaye" as Tab,        label: "Impayes",              icon: TrendingDown },
    { id: "recouvrement" as Tab,  label: "Recouvrement",         icon: Percent      },
    { id: "impression" as Tab,    label: "Impression / Export",  icon: Printer      },
  ];

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{borderColor:etabColor,borderTopColor:"transparent"}} />
      <p className="text-slate-400 text-sm">Chargement...</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports Financiers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Donnees reelles — {etabInfo?.label}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl text-sm">
            <RefreshCw size={14} />
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md"
            style={{background:etabColor}}>
            <Printer size={15} /> Imprimer
          </button>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({id, label, icon: Icon}) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab===id?"bg-white shadow-sm":"text-slate-500 hover:text-slate-700"}`}
            style={activeTab===id?{color:etabColor}:{}}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* ── Compte de resultat ── */}
      {activeTab==="resultat" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {label:"Total Recettes",  value:formatMGA(totalEncaisse), color:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-100"},
              {label:"Total Depenses",  value:formatMGA(totalDepenses), color:"text-red-700",     bg:"bg-red-50",     border:"border-red-100"},
              {label:"Resultat Net",    value:formatMGA(resultatNet),   color:resultatNet>=0?"text-brand-700":"text-red-700", bg:"bg-brand-50", border:"border-brand-100"},
            ].map(({label,value,color,bg,border})=>(
              <div key={label} className={`card border ${border} ${bg}`}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Custom bar chart - NO Recharts (causes blue bug) */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Encaissements par mois</h3>
            {monthlyData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">Aucun paiement</div>
            ) : (
              <div className="space-y-2">
                {monthlyData.map(({mois, label, montant}) => (
                  <div key={mois} className="flex items-center gap-3">
                    <div className="text-xs text-slate-500 w-14 shrink-0 text-right">{label}</div>
                    <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg flex items-center pl-2 transition-all"
                        style={{width:`${Math.max(5,(montant/maxMontant)*100)}%`, background:etabColor}}>
                        <span className="text-white text-xs font-bold whitespace-nowrap">{formatMGA(montant)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses detail */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Detail des depenses</h3>
            {myExpenses.length===0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Aucune depense enregistree</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100">
                  {["Libelle","Categorie","Agent","Montant"].map(h=>(
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {myExpenses.map(e=>(
                    <tr key={e.id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-700">{e.libelle}</td>
                      <td className="py-2 pr-4"><span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full">{e.categorie}</span></td>
                      <td className="py-2 pr-4 text-xs text-slate-500">{e.agentNom}</td>
                      <td className="py-2 font-semibold text-red-700">{formatMGA(e.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Impayes ── */}
      {activeTab==="impaye" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {label:"Impayes",        value:studentsImpaye.length,  color:"text-red-700"},
              {label:"En attente",     value:studentsPending.length, color:"text-amber-700"},
              {label:"Montant impaye", value:formatMGA(Math.max(0,totalDu-totalEncaisse)), color:"text-red-700"},
              {label:"Taux impaye",    value:`${100-tauxGlobal}%`,   color:"text-red-700"},
            ].map(({label,value,color})=>(
              <div key={label} className="card">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Etudiants impayes / en attente</h3>
              <span className="text-xs text-slate-400">{studentsImpaye.length+studentsPending.length} etudiant(s)</span>
            </div>
            {studentsImpaye.length===0&&studentsPending.length===0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Aucun impaye</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>{["Nom","Matricule","Filiere","Niveau","Total du","Paye","Reste","Statut"].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...studentsImpaye,...studentsPending].map(s=>{
                      const ec=ecolages.find(e=>e.etudiantId===getStudentId(s));
                      const name = s.fullName || `${s.prenom||""} ${s.nom||""}`.trim();
                      return (
                        <tr key={getStudentId(s)} className="hover:bg-red-50/20">
                          <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.matricule||"—"}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{s.filiere||"—"}</td>
                          <td className="px-4 py-3"><span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">{s.niveau||"—"}</span></td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{formatMGA(ec?.montantDu||0)}</td>
                          <td className="px-4 py-3 text-emerald-700 text-xs">{formatMGA(ec?.montantPaye||0)}</td>
                          <td className="px-4 py-3 font-bold text-red-700 text-xs">{formatMGA((ec?.montantDu||0)-(ec?.montantPaye||0))}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ec?.statut==="en_attente"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>
                              {ec?.statut==="en_attente"?"En attente":"Impaye"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recouvrement ── */}
      {activeTab==="recouvrement" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Taux global de recouvrement</h3>
              <span className={`text-2xl font-bold ${tauxGlobal>=70?"text-emerald-600":tauxGlobal>=40?"text-amber-600":"text-red-600"}`}>{tauxGlobal}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{width:`${tauxGlobal}%`,background:tauxGlobal>=70?"#22c55e":tauxGlobal>=40?"#f59e0b":"#ef4444"}} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{formatMGA(ecolages.reduce((s,e)=>s+e.montantPaye,0))} encaisse</span>
              <span>sur {formatMGA(totalDu)}</span>
            </div>
          </div>
          {recouvrementData.length===0 ? (
            <div className="card text-center py-8 text-slate-400 text-sm">Aucune donnee d&apos;ecolage</div>
          ) : (
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Par filiere</h3>
              {recouvrementData.map(({filiere,taux,du,paye})=>(
                <div key={filiere} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate mr-2">{filiere}</span>
                    <span className="font-bold text-slate-900 shrink-0">{taux}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${taux}%`,background:taux>=70?"#22c55e":taux>=40?"#f59e0b":"#ef4444"}} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="text-emerald-600">{formatMGA(paye)} paye</span>
                    <span>sur {formatMGA(du)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Impression / Export ── */}
      {activeTab==="impression" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Parametres d&apos;impression</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Annee</label>
                <select value={impAnnee} onChange={e=>setImpAnnee(e.target.value)}
                  className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {["2025","2026","2027"].map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Mois</label>
                <select value={impMois} onChange={e=>setImpMois(e.target.value)}
                  className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="tous">Toute l&apos;annee</option>
                  {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i)=>(
                    <option key={m} value={m}>{["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][i]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Statut etudiants</label>
                <select value={impType} onChange={e=>setImpType(e.target.value as "tous"|"paye"|"impaye")}
                  className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="tous">Tous les etudiants</option>
                  <option value="paye">Payes uniquement</option>
                  <option value="impaye">Impayes / En attente</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs text-slate-600">
                <span className="font-bold text-slate-900">{paiementsFiltres.length}</span> paiement(s) dans la periode
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs text-slate-600">
                <span className="font-bold text-emerald-700">{formatMGA(paiementsFiltres.reduce((s,p)=>s+p.montant,0))}</span> total encaisse
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs text-slate-600">
                <span className="font-bold text-slate-900">{studentsFiltres.length}</span> etudiant(s)
              </div>
            </div>
          </div>

          {/* Print preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Apercu — {impMois==="tous" ? `Annee ${impAnnee}` : `${["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][parseInt(impMois)-1]} ${impAnnee}`}
              </h3>
              <button onClick={handlePrint}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                style={{background:etabColor}}>
                <Printer size={14}/> Imprimer cette liste
              </button>
            </div>

            {/* Paiements table */}
            {paiementsFiltres.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Paiements effectues</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        {["Reference","Etudiant","Montant","Date","Note","Agent"].map(h=>(
                          <th key={h} className="text-left font-semibold text-slate-500 px-3 py-2 border border-slate-100">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paiementsFiltres.map((p,i)=>(
                        <tr key={p.id||i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono border border-slate-100 text-slate-400">{p.reference||"—"}</td>
                          <td className="px-3 py-2 font-semibold border border-slate-100 text-slate-900">{p.etudiantNom}</td>
                          <td className="px-3 py-2 font-bold border border-slate-100 text-emerald-700">{formatMGA(p.montant)}</td>
                          <td className="px-3 py-2 border border-slate-100 text-slate-500">{p.date}</td>
                          <td className="px-3 py-2 border border-slate-100 text-slate-400">{p.note||"—"}</td>
                          <td className="px-3 py-2 border border-slate-100 text-slate-500">{p.agentNom}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50 font-bold">
                        <td colSpan={2} className="px-3 py-2 border border-slate-100 text-slate-700">TOTAL</td>
                        <td className="px-3 py-2 border border-slate-100 text-emerald-700">{formatMGA(paiementsFiltres.reduce((s,p)=>s+p.montant,0))}</td>
                        <td colSpan={3} className="border border-slate-100" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Students table */}
            {studentsFiltres.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Liste des etudiants ({impType==="paye"?"Payes":impType==="impaye"?"Impayes":"Tous"})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        {["Matricule","Nom","Filiere","Niveau","Total du","Paye","Reste","Statut"].map(h=>(
                          <th key={h} className="text-left font-semibold text-slate-500 px-3 py-2 border border-slate-100">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentsFiltres.map(s=>{
                        const ec=ecolages.find(e=>e.etudiantId===getStudentId(s));
                        const name=s.fullName||`${s.prenom||""} ${s.nom||""}`.trim();
                        return (
                          <tr key={getStudentId(s)} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono border border-slate-100 text-slate-400">{s.matricule||"—"}</td>
                            <td className="px-3 py-2 font-semibold border border-slate-100 text-slate-900">{name}</td>
                            <td className="px-3 py-2 border border-slate-100 text-slate-500 max-w-[100px] truncate">{s.filiere||"—"}</td>
                            <td className="px-3 py-2 border border-slate-100 text-center"><span className="bg-brand-50 text-brand-700 font-bold px-1.5 py-0.5 rounded">{s.niveau||"—"}</span></td>
                            <td className="px-3 py-2 border border-slate-100 text-slate-700">{formatMGA(ec?.montantDu||0)}</td>
                            <td className="px-3 py-2 border border-slate-100 text-emerald-700">{formatMGA(ec?.montantPaye||0)}</td>
                            <td className="px-3 py-2 border border-slate-100 font-bold text-red-700">{formatMGA((ec?.montantDu||0)-(ec?.montantPaye||0))}</td>
                            <td className="px-3 py-2 border border-slate-100">
                              <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${ec?.statut==="paye"?"bg-emerald-100 text-emerald-700":ec?.statut==="en_attente"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>
                                {ec?.statut==="paye"?"Paye":ec?.statut==="en_attente"?"En attente":"Impaye"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {paiementsFiltres.length===0 && studentsFiltres.length===0 && (
              <div className="py-10 text-center text-slate-400 text-sm">Aucune donnee pour cette periode</div>
            )}
          </div>
        </div>
      )}

      {/* Print area hidden on screen, shown when printing */}
      <div id="receipt-print-area" style={{display:"none"}}>
        <div style={{fontFamily:"Arial,sans-serif",padding:"20px",background:"white"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",paddingBottom:"12px",borderBottom:`3px solid ${etabColor}`}}>
            <div>
              <div style={{fontSize:"20px",fontWeight:"bold",color:etabColor}}>GSI SmartPay</div>
              <div style={{fontSize:"13px",color:"#64748b"}}>{etabInfo?.label}</div>
            </div>
            <div style={{textAlign:"right",fontSize:"12px",color:"#64748b"}}>
              <div>Rapport financier</div>
              <div>{impMois==="tous"?`Annee ${impAnnee}`:["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"][parseInt(impMois)-1]+" "+impAnnee}</div>
              <div>Imprime le {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"20px"}}>
            {[
              {label:"Total Recettes",value:formatMGA(totalEncaisse),color:"#059669"},
              {label:"Total Depenses",value:formatMGA(totalDepenses),color:"#dc2626"},
              {label:"Resultat Net",  value:formatMGA(resultatNet),  color:etabColor},
            ].map(({label,value,color})=>(
              <div key={label} style={{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px"}}>{label}</div>
                <div style={{fontSize:"18px",fontWeight:"bold",color}}>{value}</div>
              </div>
            ))}
          </div>

          {/* Paiements */}
          {paiementsFiltres.length>0 && (
            <div style={{marginBottom:"20px"}}>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#334155",marginBottom:"8px",textTransform:"uppercase"}}>Paiements effectues ({paiementsFiltres.length})</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:etabColor+"22"}}>
                    {["Reference","Etudiant","Montant","Date","Note","Agent"].map(h=>(
                      <th key={h} style={{border:"1px solid #e2e8f0",padding:"6px 8px",textAlign:"left",color:"#475569",fontWeight:"600"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paiementsFiltres.map((p,i)=>(
                    <tr key={i} style={{background:i%2===0?"white":"#f8fafc"}}>
                      <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",fontFamily:"monospace",color:"#94a3b8"}}>{p.reference||"—"}</td>
                      <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",fontWeight:"600"}}>{p.etudiantNom}</td>
                      <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",fontWeight:"bold",color:"#059669"}}>{formatMGA(p.montant)}</td>
                      <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",color:"#64748b"}}>{p.date}</td>
                      <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",color:"#94a3b8"}}>{p.note||"—"}</td>
                      <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",color:"#64748b"}}>{p.agentNom}</td>
                    </tr>
                  ))}
                  <tr style={{background:etabColor+"22",fontWeight:"bold"}}>
                    <td colSpan={2} style={{border:"1px solid #e2e8f0",padding:"6px 8px"}}>TOTAL PAIEMENTS</td>
                    <td style={{border:"1px solid #e2e8f0",padding:"6px 8px",color:"#059669"}}>{formatMGA(paiementsFiltres.reduce((s,p)=>s+p.montant,0))}</td>
                    <td colSpan={3} style={{border:"1px solid #e2e8f0"}}/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Students */}
          {studentsFiltres.length>0 && (
            <div>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#334155",marginBottom:"8px",textTransform:"uppercase"}}>Liste des etudiants ({studentsFiltres.length})</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:etabColor+"22"}}>
                    {["Matricule","Nom","Filiere","Niveau","Total du","Paye","Reste","Statut"].map(h=>(
                      <th key={h} style={{border:"1px solid #e2e8f0",padding:"6px 8px",textAlign:"left",color:"#475569",fontWeight:"600"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentsFiltres.map((s,i)=>{
                    const ec=ecolages.find(e=>e.etudiantId===getStudentId(s));
                    const name=s.fullName||`${s.prenom||""} ${s.nom||""}`.trim();
                    return (
                      <tr key={i} style={{background:i%2===0?"white":"#f8fafc"}}>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",fontFamily:"monospace",color:"#94a3b8"}}>{s.matricule||"—"}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",fontWeight:"600"}}>{name}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",color:"#64748b",maxWidth:"120px"}}>{(s.filiere||"—").slice(0,30)}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",textAlign:"center"}}>{s.niveau||"—"}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px"}}>{formatMGA(ec?.montantDu||0)}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",color:"#059669"}}>{formatMGA(ec?.montantPaye||0)}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px",fontWeight:"bold",color:((ec?.montantDu||0)-(ec?.montantPaye||0))>0?"#dc2626":"#059669"}}>{formatMGA((ec?.montantDu||0)-(ec?.montantPaye||0))}</td>
                        <td style={{border:"1px solid #e2e8f0",padding:"5px 8px"}}>
                          <span style={{
                            padding:"2px 6px",borderRadius:"4px",fontWeight:"bold",fontSize:"10px",
                            background:ec?.statut==="paye"?"#dcfce7":ec?.statut==="en_attente"?"#fef3c7":"#fee2e2",
                            color:ec?.statut==="paye"?"#15803d":ec?.statut==="en_attente"?"#92400e":"#991b1b"
                          }}>
                            {ec?.statut==="paye"?"Paye":ec?.statut==="en_attente"?"En attente":"Impaye"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{textAlign:"center",marginTop:"24px",color:"#94a3b8",fontSize:"10px",borderTop:"1px solid #e2e8f0",paddingTop:"12px"}}>
            Document genere par GSI SmartPay — {new Date().toLocaleDateString("fr-FR")} — {etabInfo?.label}
          </div>
        </div>
      </div>
    </div>
  );
}
