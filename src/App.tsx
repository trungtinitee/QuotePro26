import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { NoticeModal } from './components/modals/NoticeModal';
import { PricePickerModal } from './components/modals/PricePickerModal';
import { QuickEditModal } from './components/modals/QuickEditModal';
import { GlobalKeyModal } from './components/modals/GlobalKeyModal';
import { PrintPreviewModal } from './components/modals/PrintPreviewModal';
import { QuoteTab } from './components/tabs/QuoteTab';
import { AnalysisTab } from './components/tabs/AnalysisTab';
import { PriceCatalogTab } from './components/tabs/PriceCatalogTab';
import { DossierTab } from './components/tabs/DossierTab';
import { PrintQuoteView } from './components/PrintQuoteView';
import {
  FileText,
  BarChart3,
  Coins,
  FolderArchive,
  Layers,
} from 'lucide-react';
import { TabType } from './types';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const mobileNavItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'quote', label: 'Báo giá', icon: <FileText className="w-5 h-5" /> },
    { id: 'analysis', label: 'Phân tích', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'price', label: 'Đơn giá', icon: <Coins className="w-5 h-5" /> },
    { id: 'dossier', label: 'Hồ sơ', icon: <FolderArchive className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-28 md:pb-12 print:p-0 print:m-0 print:max-w-none print:w-full">
        {activeTab === 'quote' && <div className="print:hidden"><QuoteTab /></div>}
        {activeTab === 'analysis' && <div className="print:hidden"><AnalysisTab /></div>}
        {activeTab === 'price' && <div className="print:hidden"><PriceCatalogTab /></div>}
        {activeTab === 'dossier' && (
          <div className="print:block print:w-full print:m-0 print:p-0">
            <DossierTab />
          </div>
        )}

        {/* Dedicated Print / PDF Layout for Quote Tab */}
        {activeTab !== 'dossier' && <PrintQuoteView />}
      </main>

      {/* Desktop Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-400 print:hidden hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>QuotePro V4.5 · Quản lý &amp; tạo báo giá chuyên nghiệp</span>
          </div>
          <div>
            Dữ liệu tự động lưu trữ trên bộ nhớ trình duyệt (Local Storage) an toàn và bảo mật.
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Taskbar */}
      <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-40 flex items-center justify-around print:hidden mb-[env(safe-area-inset-bottom,0px)]">
        {mobileNavItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
                active
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`${active ? 'text-emerald-200' : 'text-slate-400'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] mt-0.5 whitespace-nowrap ${active ? 'text-white' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modals & Toasts */}
      <NoticeModal />
      <PricePickerModal />
      <QuickEditModal />
      <GlobalKeyModal />
      <PrintPreviewModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
