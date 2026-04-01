"use client";
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from "lucide-react";
import clsx from "clsx";

type ModalType = "info" | "success" | "warning" | "danger";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmLabel?: string;
  cancelLabel?: string;
  showConfirm?: boolean;
}

const TYPE_CONFIG = {
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-100",
    border: "border-blue-200",
    btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
    btn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-100",
    border: "border-amber-200",
    btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
  },
  danger: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    border: "border-red-200",
    btn: "bg-red-600 hover:bg-red-700 shadow-red-600/20"
  }
};

export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  showConfirm = true
}: CustomModalProps) {
  if (!isOpen) return null;

  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", config.bg)}>
            <Icon size={32} className={config.color} />
          </div>

          <h2 className="text-slate-900 font-black text-xl mb-2">{title}</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">{message}</p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 text-slate-400 text-xs font-black uppercase hover:bg-slate-50 transition-colors"
            >
              {cancelLabel}
            </button>

            {showConfirm && (
              <button
                onClick={() => {
                  onConfirm?.();
                  onClose();
                }}
                className={clsx("flex-1 py-3.5 rounded-xl text-white text-xs font-black uppercase shadow-lg transition-all active:scale-95", config.btn)}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
