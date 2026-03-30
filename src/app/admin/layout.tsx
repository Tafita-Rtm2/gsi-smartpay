import { Shield } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div className="text-slate-900 font-bold text-sm">Panneau Administrateur</div>
            <div className="text-slate-400 text-xs">GSI SmartPay</div>
          </div>
        </div>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl font-bold transition-all hover:bg-slate-50">
          Retour login
        </Link>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
