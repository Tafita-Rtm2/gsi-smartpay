"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, FileText,
  BookOpen, Receipt, Bell, Settings, LogOut,
  GraduationCap, X, Menu
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard",  label: "Tableau de bord",    icon: LayoutDashboard },
  { href: "/etudiants",  label: "Étudiants",           icon: Users },
  { href: "/paiements",  label: "Paiements",           icon: CreditCard },
  { href: "/journal",    label: "Journal financier",   icon: BookOpen },
  { href: "/rapports",   label: "Rapports",            icon: FileText },
  { href: "/recus",      label: "Reçus",               icon: Receipt },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 flex-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              active
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-brand-900 text-sm">GSI SmartPay</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={clsx(
        "lg:hidden fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-brand-900 text-sm leading-tight">GSI SmartPay</div>
              <div className="text-xs text-slate-400">Gestion Écolages</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="flex flex-col flex-1 p-3 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-700">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">Admin GSI</div>
              <div className="text-xs text-slate-400">Administrateur</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-100 flex-col z-30">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-brand-900 leading-tight">GSI SmartPay</div>
              <div className="text-xs text-slate-400">Gestion Écolages</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-3 overflow-y-auto gap-1">
          <NavLinks />
          <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-all">
              <Bell size={17} /> <span>Notifications</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-all">
              <Settings size={17} /> <span>Paramètres</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={17} /> <span>Déconnexion</span>
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-700">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">Admin GSI</div>
              <div className="text-xs text-slate-400">Administrateur</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
