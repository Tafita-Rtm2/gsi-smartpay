import { Shield } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-amber-400" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Panneau Administrateur</div>
            <div className="text-white/40 text-xs">GSI SmartPay</div>
          </div>
        </div>
        <Link href="/" className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
          Retour login
        </Link>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
