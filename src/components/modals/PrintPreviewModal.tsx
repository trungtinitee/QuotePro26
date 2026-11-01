import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PrintQuoteView } from '../PrintQuoteView';
import { Printer, FileDown, X, Eye, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export const PrintPreviewModal: React.FC = () => {
  const {
    isPrintPreviewOpen,
    closePrintPreview,
    exportQuoteWord,
    currentQuote,
  } = useApp();

  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 60;
      if (window.innerWidth < 1024) return 85;
    }
    return 100;
  });

  if (!isPrintPreviewOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(150, prev + 15));
  const handleZoomOut = () => setZoom((prev) => Math.max(45, prev - 15));
  const handleResetZoom = () => setZoom(100);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/85 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150 print:hidden"
      onClick={closePrintPreview}
    >
      {/* Top Floating Control Bar */}
      <div
        className="w-full bg-slate-900/95 border-b border-slate-700/80 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-white shrink-0 z-10 shadow-lg gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-xs sm:text-base text-white truncate">
              Xem trước khi in
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">
              Số: <span className="font-mono text-emerald-300 font-semibold">{currentQuote.no || 'Chưa đặt số'}</span>
            </p>
          </div>
        </div>

        {/* Action & Zoom Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-slate-800/80 rounded-xl border border-slate-700 p-0.5 text-xs text-slate-300">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 font-mono text-[11px] hover:text-white transition"
              title="Về kích thước chuẩn 100%"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Fit / 100% toggle on mobile */}
          <button
            type="button"
            onClick={() => setZoom((prev) => (prev <= 70 ? 100 : 60))}
            className="sm:hidden px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 transition"
            title="Chuyển đổi kích thước hiển thị"
          >
            {zoom <= 70 ? 'Toàn trang' : '100%'}
          </button>

          {/* Word export button */}
          <button
            type="button"
            onClick={exportQuoteWord}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold transition active:scale-95 shadow-xs"
            title="Xuất trực tiếp file Word (.docx) sang máy tính"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Xuất file Word</span>
            <span className="sm:hidden">Word</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40"
            title="Mở hộp thoại In hoặc Lưu dưới dạng file PDF chuẩn A4"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">In / Lưu PDF</span>
            <span className="xs:hidden">In</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={closePrintPreview}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700"
            aria-label="Đóng xem trước"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Viewport: Centered A4 Sheet with responsive zoom */}
      <div className="flex-1 overflow-auto p-2 sm:p-6 md:p-8 flex justify-center items-start bg-slate-900/60">
        <div
          style={{
            transform: zoom === 100 ? 'none' : `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: '210mm',
            minWidth: '680px',
          }}
          className="bg-white text-slate-900 shadow-2xl p-6 sm:p-10 md:p-12 rounded-sm border border-slate-300/80 my-2"
          onClick={(e) => e.stopPropagation()}
        >
          <PrintQuoteView id="modal-preview-content" isPreview={true} className="p-0" />
        </div>
      </div>
    </div>
  );
};
