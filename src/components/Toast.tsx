import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none print:hidden">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-200 animate-in slide-in-from-top-2 ${
              isError
                ? 'bg-white border-rose-200 text-rose-900 border-l-4 border-l-rose-500'
                : isInfo
                ? 'bg-white border-blue-200 text-blue-900 border-l-4 border-l-blue-500'
                : 'bg-white border-emerald-200 text-emerald-950 border-l-4 border-l-emerald-600'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isError ? (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              ) : isInfo ? (
                <Info className="w-4 h-4 text-blue-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>

            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
