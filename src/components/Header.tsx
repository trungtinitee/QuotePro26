import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  BarChart3,
  Coins,
  FolderArchive,
  Save,
  Printer,
  FileDown,
  FileUp,
  Share2,
  Trash2,
  Menu,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TabType } from '../types';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    saveQuote,
    printQuote,
    exportQuoteWord,
    exportCurrentQuoteSync,
    exportQuotesBackup,
    importQuotesJson,
    exportPricesJson,
    importPricesJson,
    clearAllPrices,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const quoteFileInputRef = useRef<HTMLInputElement>(null);
  const priceFileInputRef = useRef<HTMLInputElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importQuotesJson(file);
      e.target.value = '';
    }
  };

  const handlePriceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importPricesJson(file);
      e.target.value = '';
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'quote', label: 'Tạo báo giá', icon: <FileText className="w-4 h-4" /> },
    { id: 'analysis', label: 'Phân tích lợi nhuận', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'price', label: 'Cập nhật giá', icon: <Coins className="w-4 h-4" /> },
    { id: 'dossier', label: 'Hồ sơ kinh tế', icon: <FolderArchive className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md border-b border-emerald-900/40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
              <Layers className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  QuotePro
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-900/60 border border-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-200 hidden sm:inline-block">
                  V4.5 Pro
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 hidden sm:block -mt-0.5">
                Quản lý &amp; tạo báo giá chuyên nghiệp
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 bg-emerald-900/50 p-1 rounded-xl border border-emerald-700/50">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 md:px-2.5 lg:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    active
                      ? 'bg-white text-emerald-950 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions Zone: Quick save, Print & File Menu Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={menuRef}>
            <button
              type="button"
              onClick={saveQuote}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white min-h-[40px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition border border-emerald-600/60"
              title="Lưu báo giá hiện tại vào trình duyệt"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Lưu</span>
            </button>

            <button
              type="button"
              onClick={printQuote}
              className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white min-h-[40px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition border border-white/15"
              title="In báo giá hoặc xuất PDF trình duyệt"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">In / PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center gap-1 bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95 min-h-[40px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold shadow transition border border-emerald-100"
              aria-label="Mở menu tệp"
            >
              <Menu className="w-4 h-4 text-emerald-800" />
              <span className="hidden sm:inline">Tệp</span>
              <ChevronDown className="w-3 h-3 text-emerald-700 opacity-80" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 text-slate-800 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Thao tác báo giá
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    saveQuote();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <Save className="w-4 h-4 text-emerald-600" />
                  <span>Lưu báo giá hiện tại</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    printQuote();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>In báo giá (Chuẩn A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    exportQuoteWord();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2.5 transition"
                >
                  <FileDown className="w-4 h-4 text-blue-600" />
                  <span>Xuất báo giá sang Word (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    exportCurrentQuoteSync();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Xuất gói đồng bộ báo giá hiện tại</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    exportQuotesBackup();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <FileDown className="w-4 h-4 text-slate-600" />
                  <span>Sao lưu toàn bộ báo giá (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    quoteFileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <FileUp className="w-4 h-4 text-slate-600" />
                  <span>Nhập file báo giá (JSON)</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Danh mục đơn giá
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    exportPricesJson();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <FileDown className="w-4 h-4 text-amber-600" />
                  <span>Xuất danh mục giá (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    priceFileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
                >
                  <FileUp className="w-4 h-4 text-amber-600" />
                  <span>Nhập danh mục giá (JSON)</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    clearAllPrices();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Xóa toàn bộ đơn giá</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={quoteFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleQuoteFileChange}
      />
      <input
        ref={priceFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handlePriceFileChange}
      />
    </header>
  );
};
