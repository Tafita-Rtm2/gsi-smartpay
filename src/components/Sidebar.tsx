"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, BookOpen, FileText, Receipt, LogOut, Menu, X, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { fetchRequests } from "@/lib/api";
import { ETABLISSEMENTS } from "@/lib/data";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/etudiants",  label: "Etudiants",       icon: Users },
  { href: "/paiements",  label: "Paiements",        icon: CreditCard },
  { href: "/autres-paiements", label: "Autres Paiements", icon: CreditCard },
  { href: "/journal",    label: "Journal financier",icon: BookOpen },
  { href: "/rapports",   label: "Rapports",         icon: FileText },
  { href: "/recus",      label: "Recus",            icon: Receipt },
  { href: "/admin",      label: "Admin",            icon: LayoutDashboard, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchRequests().then(res => {
        setPendingCount(res.filter(r => r.status === "pending").length);
      }).catch(() => {});
    }
  }, [currentUser]);

  const handleLogout = () => { logout(); router.push("/"); };

  const etabInfo = currentUser ? ETABLISSEMENTS[currentUser.etablissement] : null;
  const initials = currentUser ? `${currentUser.prenom[0]}${currentUser.nom[0]}`.toUpperCase() : "??";
  const roleLabel: Record<string, string> = { admin: "Administrateur", comptable: "Comptable", agent: "Agent" };

  const NavLinks = () => (
    <nav className="flex flex-col gap-0.5 flex-1">
      {NAV.filter(item => !item.adminOnly || currentUser?.role === "admin").map(({ href, label, icon: Icon, adminOnly }) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              active ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                     : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            {adminOnly && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = () => (
    <div className="p-3 border-t border-slate-100">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: etabInfo?.color || "#2563eb" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{currentUser?.prenom} {currentUser?.nom}</div>
          <div className="text-xs text-slate-400">{roleLabel[currentUser?.role || "agent"]}</div>
        </div>
        <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={15} />
        </button>
      </div>
      {etabInfo && (
        <div className="mt-2 mx-2 px-2 py-1 rounded-lg text-xs font-semibold text-center text-white"
          style={{ background: etabInfo.color }}>
          {etabInfo.label}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <GraduationCap size={14} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">GSI SmartPay</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
          <Menu size={20} />
        </button>
      </div>

      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      <aside className={clsx("lg:hidden fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <span className="font-bold text-slate-900">GSI SmartPay</span>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="flex-1 p-3 overflow-y-auto"><NavLinks /></div>
        <UserCard />
      </aside>

      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-100 flex-col z-30">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">GSI SmartPay</div>
              <div className="text-xs text-slate-400">Gestion Ecolages</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 overflow-y-auto flex flex-col"><NavLinks /></div>
        <UserCard />
      </aside>
    </>
  );
}
