import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, AlertTriangle } from 'lucide-react';

export const NoticeModal: React.FC = () => {
  const { notice, closeNotice } = useApp();

  if (!notice) return null;

  const buttons = notice.buttons || [
    { label: 'Đóng', value: true, variant: 'secondary' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={closeNotice}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-emerald-700" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800">
              {notice.title || 'Thông báo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeNotice}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {notice.isHtml ? (
            <div
              className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2"
              dangerouslySetInnerHTML={{ __html: notice.message }}
            />
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {notice.message}
            </p>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2">
          {buttons.map((btn, index) => {
            const isDanger = btn.variant === 'danger';
            const isPrimary = btn.variant === 'primary';
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  notice.resolve(btn.value);
                  closeNotice();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition active:scale-95 ${
                  isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                    : isPrimary
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
