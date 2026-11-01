import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Key, Copy, Check } from 'lucide-react';

export const GlobalKeyModal: React.FC = () => {
  const { isGlobalKeyModalOpen, setIsGlobalKeyModalOpen, prices, showToast } = useApp();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isGlobalKeyModalOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast('Đã sao chép GlobalKey vào clipboard.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={() => setIsGlobalKeyModalOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                Danh sách GlobalKey của danh mục giá
              </h3>
              <p className="text-[11px] text-slate-500">
                Mã định danh duy nhất (UUID) đồng bộ giữa các máy tính và phiên báo giá
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGlobalKeyModalOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2.5 w-12 text-center">#</th>
                <th className="p-2.5 w-24">Mã</th>
                <th className="p-2.5">Tên hạng mục</th>
                <th className="p-2.5">GlobalKey (Khóa định danh)</th>
                <th className="p-2.5 w-16 text-center">Sao chép</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prices.map((p, index) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-2.5 text-center text-slate-400 font-mono">{index + 1}</td>
                  <td className="p-2.5 font-bold font-mono text-emerald-800">{p.code}</td>
                  <td className="p-2.5 font-medium text-slate-800">{p.name}</td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-500 break-all select-all">
                    {p.globalKey}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(p.globalKey)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                      title="Sao chép"
                    >
                      {copiedKey === p.globalKey ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsGlobalKeyModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
