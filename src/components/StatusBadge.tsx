import clsx from "clsx";
type S = "paye" | "impaye" | "en_attente";
const C: Record<S,string> = { paye:"bg-emerald-100 text-emerald-700 border border-emerald-200", impaye:"bg-red-100 text-red-700 border border-red-200", en_attente:"bg-amber-100 text-amber-700 border border-amber-200" };
const L: Record<S,string> = { paye:"Paye", impaye:"Impaye", en_attente:"En attente" };
const D: Record<S,string> = { paye:"bg-emerald-500", impaye:"bg-red-500", en_attente:"bg-amber-500" };
export default function StatusBadge({ status }: { status: S }) {
  return <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", C[status])}><span className={clsx("w-1.5 h-1.5 rounded-full mr-1.5", D[status])} />{L[status]}</span>;
}
