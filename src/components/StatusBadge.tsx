import { PaymentStatus, getStatusClass, getStatusLabel } from "@/lib/data";
import clsx from "clsx";

export default function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", getStatusClass(status))}>
      <span className={clsx(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        status === "payé" ? "bg-emerald-500" : status === "impayé" ? "bg-red-500" : "bg-amber-500"
      )} />
      {getStatusLabel(status)}
    </span>
  );
}
