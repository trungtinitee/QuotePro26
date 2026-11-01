import React, { useRef, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AutoResizeTextarea } from '../common/AutoResizeTextarea';
import {
  Building2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  FolderPlus,
  Trash2,
  Image,
  GripVertical,
  Settings,
  ChevronDown,
  ChevronUp,
  History,
  Percent,
  Copy,
  FolderOpen,
  ArrowUpDown,
  Table,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  money,
  moneyPlain,
  formatMoneyInput,
  parseMoneyInput,
  formatDecimalInput,
  parseDecimalInput,
  numberToVietnameseWords,
  formatMoneyLive,
  normalizeCommaDecimal,
} from '../../utils/currency';
import { QuoteRow } from '../../types';
import { formatDetailMultiline } from '../../utils/specFormat';

export const QuoteTab: React.FC = () => {
  const {
    company,
    updateCompany,
    currentQuote,
    updateCurrentQuote,
    updateQuoteRow,
    addQuoteRow,
    addQuoteHeading,
    addQuoteSubheading,
    addQuoteGroupTotal,
    removeQuoteRow,
    reorderQuoteRows,
    savedQuotes,
    loadSavedQuote,
    deleteSavedQuote,
    duplicateSavedQuote,
    newQuote,
    openPricePicker,
    openQuickEdit,
    syncAllQuoteItemsFromCatalog,
    updatePricesFromCurrent,
    updatePriceFromCurrentForRow,
    addAllMissingPricesFromQuote,
    findCatalogPrice,
    showToast,
  } = useApp();

  const [companyExpanded, setCompanyExpanded] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showToast('Vui lòng chọn ảnh định dạng PNG, JPG hoặc WebP.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateCompany({ logo: String(reader.result || '') });
      showToast('Đã cập nhật logo công ty.');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return (currentQuote.rows || [])
      .filter((r) => r.type === 'item')
      .reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  }, [currentQuote.rows]);

  const discountAmount = useMemo(() => {
    if (!currentQuote.discountEnabled) return 0;
    if (currentQuote.discountType === 'amount') {
      return Math.min(subtotal, Math.max(0, Number(currentQuote.discountValue) || 0));
    }
    return Math.min(subtotal, Math.max(0, (subtotal * (Number(currentQuote.discountValue) || 0)) / 100));
  }, [currentQuote.discountEnabled, currentQuote.discountType, currentQuote.discountValue, subtotal]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatAmount = (taxableAmount * (Number(currentQuote.vat) || 0)) / 100;
  const grandTotal = taxableAmount + vatAmount;

  // Subtotal for a group row
  const getSubtotalForRow = (rowId: string) => {
    const rows = currentQuote.rows || [];
    const idx = rows.findIndex((r) => r.id === rowId && r.type === 'subtotal');
    if (idx < 0) return 0;
    let start = 0;
    for (let i = idx - 1; i >= 0; i--) {
      if (rows[i]?.type === 'subtotal') {
        start = i + 1;
        break;
      }
    }
    return rows
      .slice(start, idx)
      .filter((r) => r?.type === 'item')
      .reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  };

  // Drag and drop reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const newRows = [...currentQuote.rows];
    const item = newRows.splice(draggedIdx, 1)[0];
    newRows.splice(index, 0, item);
    setDraggedIdx(index);
    reorderQuoteRows(newRows);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  // Touch & Mobile row reordering
  const moveRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentQuote.rows.length) return;
    const newRows = [...currentQuote.rows];
    const item = newRows.splice(index, 1)[0];
    newRows.splice(targetIndex, 0, item);
    reorderQuoteRows(newRows);
  };

  // Row display mode: 'cards' (touch-first card list) or 'table' (dense grid)
  const [rowViewMode, setRowViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  let itemCounter = 0;

  return (
    <div className="space-y-6">
      {/* 1. Company Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200">
        <button
          type="button"
          onClick={() => setCompanyExpanded(!companyExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                Thông tin công ty (Đơn vị báo giá)
                {company.name && (
                  <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                    · {company.name}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500">
                Hiển thị trên phần đầu của báo giá và các mẫu biên bản hợp đồng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>{companyExpanded ? 'Thu gọn' : 'Chỉnh sửa'}</span>
            {companyExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {companyExpanded && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Tên công ty
                </label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => updateCompany({ name: e.target.value })}
                  placeholder="CÔNG TY TNHH..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-semibold text-slate-800 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mã số thuế (MST)
                </label>
                <input
                  type="text"
                  value={company.tax}
                  onChange={(e) => updateCompany({ tax: e.target.value })}
                  placeholder="0123456789"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-mono min-h-[40px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Địa chỉ trụ sở
                </label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => updateCompany({ address: e.target.value })}
                  placeholder="Địa chỉ công ty..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={(e) => updateCompany({ phone: e.target.value })}
                  placeholder="0912..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email liên hệ
                </label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => updateCompany({ email: e.target.value })}
                  placeholder="contact@..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Thông tin tài khoản ngân hàng
                </label>
                <input
                  type="text"
                  value={company.bank}
                  onChange={(e) => updateCompany({ bank: e.target.value })}
                  placeholder="Tên ngân hàng, số TK, chủ TK..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={company.website}
                  onChange={(e) => updateCompany({ website: e.target.value })}
                  placeholder="www.congty.com"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
                />
              </div>

              {/* Logo Upload Section */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Logo công ty
                </label>
                <div className="flex items-center gap-2">
                  {company.logo ? (
                    <div className="relative group shrink-0">
                      <img
                        src={company.logo}
                        alt="Logo"
                        className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => updateCompany({ logo: '' })}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow hover:bg-rose-600 transition"
                        title="Xóa logo"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
                  >
                    <Image className="w-3.5 h-3.5 text-slate-500" />
                    <span>{company.logo ? 'Thay logo' : 'Tải logo lên'}</span>
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Quote General Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-800">
                Thông tin báo giá &amp; Khách hàng
              </h2>
              <p className="text-[11px] text-slate-500">
                Số báo giá, khách hàng, dự án và các điều khoản tính thuế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={newQuote}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Số báo giá
            </label>
            <input
              type="text"
              value={currentQuote.no}
              onChange={(e) => updateCurrentQuote({ no: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-bold text-slate-800 font-mono min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tên dự án / Công trình
            </label>
            <input
              type="text"
              value={currentQuote.project}
              onChange={(e) => updateCurrentQuote({ project: e.target.value })}
              placeholder="VD: Cung cấp & lắp đặt hệ thống..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Ngày báo giá
            </label>
            <input
              type="date"
              value={currentQuote.date}
              onChange={(e) => updateCurrentQuote({ date: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Thời hạn báo giá
            </label>
            <input
              type="text"
              value={currentQuote.validity}
              onChange={(e) => updateCurrentQuote({ validity: e.target.value })}
              placeholder="30 ngày..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Người lập báo giá
            </label>
            <input
              type="text"
              value={currentQuote.creator}
              onChange={(e) => updateCurrentQuote({ creator: e.target.value })}
              placeholder="Họ tên người lập..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-medium min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Người nhận / Khách hàng
            </label>
            <input
              type="text"
              value={currentQuote.customer}
              onChange={(e) => updateCurrentQuote({ customer: e.target.value })}
              placeholder="Ông / Bà..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Đơn vị / Công ty khách hàng
            </label>
            <input
              type="text"
              value={currentQuote.company}
              onChange={(e) => updateCurrentQuote({ company: e.target.value })}
              placeholder="Tên doanh nghiệp đối tác..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-semibold text-slate-800 min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Số điện thoại khách hàng
            </label>
            <input
              type="text"
              value={currentQuote.phone}
              onChange={(e) => updateCurrentQuote({ phone: e.target.value })}
              placeholder="09..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Địa chỉ khách hàng / Công trình
            </label>
            <input
              type="text"
              value={currentQuote.address}
              onChange={(e) => updateCurrentQuote({ address: e.target.value })}
              placeholder="Địa chỉ nhận hàng hoặc thi công..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Thuế VAT (%)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={formatDecimalInput(currentQuote.vat)}
                onInput={(e) => normalizeCommaDecimal(e.currentTarget)}
                onChange={(e) =>
                  updateCurrentQuote({ vat: parseDecimalInput(e.target.value) })
                }
                className="w-full px-3 py-2 pr-7 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-mono text-right font-medium min-h-[40px]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                %
              </span>
            </div>
          </div>

          {/* Discount Settings */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Giảm giá / Chiết khấu
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  checked={currentQuote.discountEnabled}
                  onChange={(e) =>
                    updateCurrentQuote({ discountEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ms-2 text-xs text-slate-700 font-medium">Áp dụng</span>
              </label>

              {currentQuote.discountEnabled && (
                <div className="flex items-center gap-1.5 flex-1 min-w-[140px] animate-in fade-in duration-100">
                  <select
                    value={currentQuote.discountType}
                    onChange={(e) =>
                      updateCurrentQuote({
                        discountType: e.target.value as 'percent' | 'amount',
                      })
                    }
                    className="px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium min-h-[40px]"
                  >
                    <option value="percent">%</option>
                    <option value="amount">Số tiền</option>
                  </select>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      currentQuote.discountType === 'amount'
                        ? formatMoneyInput(currentQuote.discountValue)
                        : formatDecimalInput(currentQuote.discountValue)
                    }
                    onInput={(e) =>
                      currentQuote.discountType === 'amount'
                        ? formatMoneyLive(e.currentTarget)
                        : normalizeCommaDecimal(e.currentTarget)
                    }
                    onChange={(e) => {
                      const val =
                        currentQuote.discountType === 'amount'
                          ? parseMoneyInput(e.target.value)
                          : parseDecimalInput(e.target.value);
                      updateCurrentQuote({ discountValue: val });
                    }}
                    placeholder="0"
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-mono text-right min-h-[40px]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quotation Items Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Primary Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={addQuoteRow}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Hạng mục</span>
            </button>

            <button
              type="button"
              onClick={addQuoteHeading}
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 transition"
              title="Thêm phân mục chính A, B, C..."
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Đề mục A/B/C</span>
            </button>

            <button
              type="button"
              onClick={addQuoteSubheading}
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 transition"
              title="Thêm tiêu đề phụ in nghiêng"
            >
              <span>+ Tiêu đề phụ</span>
            </button>

            <button
              type="button"
              onClick={addQuoteGroupTotal}
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 transition"
              title="Thêm dòng tính tổng cho nhóm trước đó"
            >
              <span>+ Tổng nhóm</span>
            </button>
          </div>

          {/* Sync & View Mode Toggle */}
          <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={syncAllQuoteItemsFromCatalog}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
                title="Đồng bộ lại tên, mô tả và ĐVT của tất cả hạng mục theo danh mục giá"
              >
                <RefreshCw className="w-3 h-3 text-emerald-700" />
                <span className="hidden sm:inline">Đồng bộ</span>
              </button>

              <button
                type="button"
                onClick={updatePricesFromCurrent}
                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-emerald-200 transition"
                title="Lấy giá bán mới nhất từ danh mục giá cho các hạng mục đã đổi giá"
              >
                <RefreshCw className="w-3 h-3 text-emerald-700" />
                <span>Cập nhật giá</span>
              </button>

              <button
                type="button"
                onClick={addAllMissingPricesFromQuote}
                className="hidden lg:inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-200 transition"
                title="Thêm các hạng mục tự gõ trong báo giá vào danh mục giá (nháp)"
              >
                <Plus className="w-3 h-3 text-amber-600" />
                <span>Thêm vào bảng giá</span>
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setRowViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  rowViewMode === 'cards'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng thẻ (tối ưu thao tác vuốt chạm trên điện thoại & máy tính bảng)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ</span>
              </button>

              <button
                type="button"
                onClick={() => setRowViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  rowViewMode === 'table'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng bảng đầy đủ (PC hoặc kéo ngang)"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Bảng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {currentQuote.rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            Chưa có hạng mục nào trong báo giá. Bấm <strong>+ Hạng mục</strong> để bắt đầu.
          </div>
        ) : rowViewMode === 'cards' ? (
          /* Card View (Mobile & Tablet touch optimized) */
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
            {currentQuote.rows.map((row, index) => {
              if (row.type === 'heading') {
                return (
                  <div
                    key={row.id}
                    className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveRow(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-emerald-700 disabled:opacity-20 rounded"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(index, 'down')}
                          disabled={index === currentQuote.rows.length - 1}
                          className="p-1 text-slate-400 hover:text-emerald-700 disabled:opacity-20 rounded"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={row.title || ''}
                        onChange={(e) => updateQuoteRow(row.id, { title: e.target.value })}
                        placeholder="Nhập tiêu đề đề mục (VD: A. THIẾT BỊ CHÍNH)..."
                        className="w-full bg-white px-3 py-2 border border-emerald-200/80 rounded-xl font-bold text-sm text-emerald-950 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuoteRow(row.id)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                      title="Xóa đề mục"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              if (row.type === 'subheading') {
                return (
                  <div
                    key={row.id}
                    className="p-2.5 bg-slate-100/90 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveRow(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(index, 'down')}
                          disabled={index === currentQuote.rows.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={row.title || ''}
                        onChange={(e) => updateQuoteRow(row.id, { title: e.target.value })}
                        placeholder="Nhập tiêu đề phụ in nghiêng..."
                        className="w-full bg-white px-3 py-1.5 border border-slate-200 rounded-xl font-bold italic text-xs text-slate-700 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuoteRow(row.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                      title="Xóa tiêu đề phụ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              if (row.type === 'subtotal') {
                const rowSubtotal = getSubtotalForRow(row.id);
                return (
                  <div
                    key={row.id}
                    className="p-3 bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveRow(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-emerald-700 disabled:opacity-20 rounded"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(index, 'down')}
                          disabled={index === currentQuote.rows.length - 1}
                          className="p-1 text-slate-400 hover:text-emerald-700 disabled:opacity-20 rounded"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                        TỔNG NHÓM
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm sm:text-base text-emerald-900">
                        {money(rowSubtotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuoteRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Xóa dòng tổng nhóm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              // Item Card
              itemCounter++;
              const catItem = findCatalogPrice(row);
              const isPriceDifferent = catItem && Number(row.price) !== Number(catItem.price);
              const lineTotal = (Number(row.price) || 0) * (Number(row.qty) || 0);

              return (
                <div
                  key={row.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 hover:border-emerald-200 transition"
                >
                  {/* Card Header: STT, Badges, Up/Down, QuickEdit, Delete */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {itemCounter}
                      </span>

                      {/* Sync Badges */}
                      {!catItem ? (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Chưa có trong bảng giá
                        </span>
                      ) : isPriceDifferent ? (
                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Giá khác bảng giá
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Đã đồng bộ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Touch Move Up/Down */}
                      <button
                        type="button"
                        onClick={() => moveRow(index, 'up')}
                        disabled={index === 0}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg disabled:opacity-20 transition"
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveRow(index, 'down')}
                        disabled={index === currentQuote.rows.length - 1}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg disabled:opacity-20 transition"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {isPriceDifferent && (
                        <button
                          type="button"
                          onClick={() => updatePriceFromCurrentForRow(row.id)}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          title="Cập nhật đơn giá bán mới từ bảng giá cho riêng hạng mục này"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openQuickEdit(row.id)}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Điều chỉnh nhanh thông số & bảng giá"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeQuoteRow(row.id)}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa hạng mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Item Name Button Trigger */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Tên hạng mục áp giá
                    </label>
                    <button
                      type="button"
                      onClick={() => openPricePicker(row.id)}
                      className="w-full text-left min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 font-bold text-xs sm:text-sm text-slate-800 hover:text-emerald-900 transition flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{row.itemName || 'Chọn hạng mục áp giá...'}</span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                        Đổi giá
                      </span>
                    </button>
                  </div>

                  {/* Specification / Description */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Quy cách chi tiết cho báo giá
                      </label>
                      {row.name && /(?:^|\s)\+\s+/.test(row.name) && (
                        <button
                          type="button"
                          onClick={() =>
                            updateQuoteRow(row.id, {
                              name: formatDetailMultiline(row.name),
                              detailIsCustom: true,
                            })
                          }
                          className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          title="Tự động tách các mục dấu '+' thành từng dòng riêng"
                        >
                          <span>Tách dòng (+)</span>
                        </button>
                      )}
                    </div>
                    <AutoResizeTextarea
                      value={row.name || ''}
                      onChange={(e) =>
                        updateQuoteRow(row.id, {
                          name: e.target.value,
                          detailIsCustom: true,
                        })
                      }
                      placeholder="Mô tả kỹ thuật riêng cho báo giá này..."
                      className="w-full p-2.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none transition leading-relaxed auto-grow item-detail-textarea"
                      minHeight={36}
                    />
                  </div>

                  {/* Input Grid: Unit, Qty, Price */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">
                        ĐVT
                      </label>
                      <input
                        type="text"
                        value={row.unit || ''}
                        onChange={(e) => updateQuoteRow(row.id, { unit: e.target.value })}
                        placeholder="cái..."
                        className="w-full min-h-[40px] text-center p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-medium text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">
                        Số lượng
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatDecimalInput(row.qty)}
                        onInput={(e) => normalizeCommaDecimal(e.currentTarget)}
                        onChange={(e) =>
                          updateQuoteRow(row.id, { qty: parseDecimalInput(e.target.value) })
                        }
                        className="w-full min-h-[40px] text-center p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-mono font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-right">
                        Đơn giá (đ)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatMoneyInput(row.price)}
                        onInput={(e) => formatMoneyLive(e.currentTarget)}
                        onChange={(e) =>
                          updateQuoteRow(row.id, { price: parseMoneyInput(e.target.value) })
                        }
                        className="w-full min-h-[40px] text-right p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Total Bar for Card */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Thành tiền:</span>
                    <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-800">
                      {money(lineTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View (Dense grid with Touch-Friendly Up/Down controls) */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3 w-16 text-center">STT</th>
                  <th className="p-3 min-w-[280px]">Hạng mục / Quy cách chi tiết</th>
                  <th className="p-3 w-20 text-center">ĐVT</th>
                  <th className="p-3 w-24 text-center">Số lượng</th>
                  <th className="p-3 w-32 text-right">Đơn giá</th>
                  <th className="p-3 w-36 text-right">Thành tiền</th>
                  <th className="p-3 w-28 text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {currentQuote.rows.map((row, index) => {
                  if (row.type === 'heading') {
                    return (
                      <tr
                        key={row.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-emerald-50/70 border-y border-emerald-200/80 group ${
                          draggedIdx === index ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center text-slate-400 group-hover:text-slate-600">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveRow(index, 'up')}
                                disabled={index === 0}
                                className="text-slate-400 hover:text-emerald-700 disabled:opacity-20"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRow(index, 'down')}
                                disabled={index === currentQuote.rows.length - 1}
                                className="text-slate-400 hover:text-emerald-700 disabled:opacity-20"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td colSpan={5} className="p-2.5">
                          <input
                            type="text"
                            value={row.title || ''}
                            onChange={(e) => updateQuoteRow(row.id, { title: e.target.value })}
                            placeholder="Nhập tiêu đề đề mục (VD: A. THIẾT BỊ CHÍNH)..."
                            className="w-full bg-transparent font-bold text-sm text-emerald-900 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeQuoteRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Xóa đề mục"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (row.type === 'subheading') {
                    return (
                      <tr
                        key={row.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-slate-50 border-y border-slate-200/60 group ${
                          draggedIdx === index ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center text-slate-400 group-hover:text-slate-600">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveRow(index, 'up')}
                                disabled={index === 0}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRow(index, 'down')}
                                disabled={index === currentQuote.rows.length - 1}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td colSpan={5} className="p-2.5">
                          <input
                            type="text"
                            value={row.title || ''}
                            onChange={(e) => updateQuoteRow(row.id, { title: e.target.value })}
                            placeholder="Nhập tiêu đề phụ in nghiêng..."
                            className="w-full bg-transparent font-bold italic text-xs text-slate-700 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeQuoteRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Xóa tiêu đề phụ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (row.type === 'subtotal') {
                    const rowSubtotal = getSubtotalForRow(row.id);
                    return (
                      <tr
                        key={row.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-emerald-50/40 border-t-2 border-emerald-300/80 font-bold text-emerald-950 group ${
                          draggedIdx === index ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center text-slate-400 group-hover:text-slate-600">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </td>
                        <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[11px]">
                          TỔNG NHÓM
                        </td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-emerald-900">
                          {money(rowSubtotal)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeQuoteRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Xóa dòng tổng nhóm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Item Row
                  itemCounter++;
                  const catItem = findCatalogPrice(row);
                  const isPriceDifferent =
                    catItem && Number(row.price) !== Number(catItem.price);
                  const lineTotal = (Number(row.price) || 0) * (Number(row.qty) || 0);

                  return (
                    <tr
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        draggedIdx === index ? 'opacity-40 bg-slate-100' : ''
                      }`}
                    >
                      {/* Drag & STT with Touch Arrows */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition">
                            <GripVertical className="w-3 h-3" />
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveRow(index, 'up')}
                              disabled={index === 0}
                              className="text-slate-300 hover:text-emerald-700 disabled:opacity-20"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRow(index, 'down')}
                              disabled={index === currentQuote.rows.length - 1}
                              className="text-slate-300 hover:text-emerald-700 disabled:opacity-20"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <span className="font-mono font-semibold text-slate-600 text-xs">
                            {itemCounter}
                          </span>
                        </div>
                      </td>

                      {/* Name & Details */}
                      <td className="p-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => openPricePicker(row.id)}
                              className="text-left font-bold text-slate-800 hover:text-emerald-700 transition cursor-pointer max-w-full text-xs sm:text-sm"
                            >
                              {row.itemName || 'Chọn hạng mục áp giá...'}
                            </button>

                            {/* Catalog sync status badges */}
                            {!catItem ? (
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Chưa có trong bảng giá
                              </span>
                            ) : isPriceDifferent ? (
                              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                Giá khác bảng giá
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Đã đồng bộ
                              </span>
                            )}
                          </div>

                          <div className="relative group/qspec">
                            <AutoResizeTextarea
                              value={row.name || ''}
                              onChange={(e) =>
                                updateQuoteRow(row.id, {
                                  name: e.target.value,
                                  detailIsCustom: true,
                                })
                              }
                              placeholder="Mô tả riêng cho báo giá này..."
                              className="w-full p-1.5 text-xs text-slate-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded-lg outline-none transition leading-relaxed auto-grow item-detail-textarea"
                              minHeight={32}
                            />
                            {row.name && /(?:^|\s)\+\s+/.test(row.name) && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuoteRow(row.id, {
                                    name: formatDetailMultiline(row.name),
                                    detailIsCustom: true,
                                  })
                                }
                                className="hidden group-hover/qspec:inline-flex text-[10px] text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-1.5 py-0.5 rounded font-bold absolute right-1 bottom-1 shadow-xs transition cursor-pointer"
                                title="Tự động tách các mục dấu '+' thành từng dòng riêng"
                              >
                                Tách dòng (+)
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ĐVT */}
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          value={row.unit || ''}
                          onChange={(e) => updateQuoteRow(row.id, { unit: e.target.value })}
                          placeholder="cái..."
                          className="w-full text-center p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none font-medium text-slate-700 min-h-[36px]"
                        />
                      </td>

                      {/* Số lượng */}
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatDecimalInput(row.qty)}
                          onInput={(e) => normalizeCommaDecimal(e.currentTarget)}
                          onChange={(e) =>
                            updateQuoteRow(row.id, { qty: parseDecimalInput(e.target.value) })
                          }
                          className="w-full text-center p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none font-mono font-semibold text-slate-800 min-h-[36px]"
                        />
                      </td>

                      {/* Đơn giá */}
                      <td className="p-2.5 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatMoneyInput(row.price)}
                          onInput={(e) => formatMoneyLive(e.currentTarget)}
                          onChange={(e) =>
                            updateQuoteRow(row.id, { price: parseMoneyInput(e.target.value) })
                          }
                          className="w-full text-right p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none font-mono font-bold text-slate-800 min-h-[36px]"
                        />
                      </td>

                      {/* Thành tiền */}
                      <td className="p-2.5 text-right font-mono font-extrabold text-slate-900 text-xs sm:text-sm">
                        {money(lineTotal)}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isPriceDifferent && (
                            <button
                              type="button"
                              onClick={() => updatePriceFromCurrentForRow(row.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition"
                              title="Cập nhật đơn giá bán mới từ bảng giá cho riêng hạng mục này"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openQuickEdit(row.id)}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                            title="Điều chỉnh nhanh thông số & bảng giá"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeQuoteRow(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Xóa hạng mục"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals & Notes Section */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Notes & Terms */}
            <div className="lg:col-span-7 space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Ghi chú / Điều khoản báo giá
              </label>
              <textarea
                rows={5}
                value={currentQuote.notes}
                onChange={(e) => updateCurrentQuote({ notes: e.target.value })}
                placeholder="Điều khoản thanh toán, thời gian giao hàng, bảo hành..."
                className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none leading-relaxed"
              />
            </div>

            {/* Calculations Box */}
            <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Tạm tính (chưa VAT)</span>
                <span className="font-mono font-bold text-slate-800">{money(subtotal)}</span>
              </div>

              {currentQuote.discountEnabled && (
                <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                  <span>
                    Giảm giá{' '}
                    {currentQuote.discountType === 'percent'
                      ? `(${formatDecimalInput(currentQuote.discountValue)}%)`
                      : ''}
                  </span>
                  <span className="font-mono font-bold">- {money(discountAmount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>VAT ({formatDecimalInput(currentQuote.vat)}%)</span>
                <span className="font-mono font-bold text-slate-800">{money(vatAmount)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm text-emerald-950 uppercase tracking-tight block">
                    TỔNG THANH TOÁN
                  </span>
                  <span className="text-[10px] text-slate-400">Đã bao gồm thuế VAT</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-lg sm:text-xl text-emerald-800 font-mono">
                    {money(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">Bằng chữ: </span>
                <span className="italic">{numberToVietnameseWords(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Saved Quotes Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-800">
              Danh sách báo giá đã lưu ({savedQuotes.length})
            </h3>
          </div>
        </div>

        {savedQuotes.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">
            Chưa có báo giá nào được lưu. Bấm "Lưu báo giá" ở thanh menu trên cùng để lưu trữ.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {savedQuotes.map((q) => {
              const qTotal = (q.rows || [])
                .filter((r) => r.type === 'item')
                .reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
              const isCurrent = q.id === currentQuote.id;

              return (
                <div
                  key={q.id}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50 transition ${
                    isCurrent ? 'bg-emerald-50/50 border border-emerald-200/60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold font-mono text-emerald-800 text-xs">{q.no}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-800 text-xs truncate max-w-xs">
                        {q.customer || 'Khách hàng'}
                      </span>
                      {q.company && (
                        <span className="text-[11px] text-slate-500 hidden sm:inline truncate max-w-xs">
                          ({q.company})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <span>Ngày: {q.date}</span>
                      {q.project && <span> · Dự án: {q.project}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadSavedQuote(q.id)}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition"
                    >
                      Mở
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateSavedQuote(q.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                      title="Nhân đôi báo giá"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedQuote(q.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Xóa báo giá"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Floating Mini-Total Bar */}
      <div className="md:hidden fixed bottom-[68px] left-3 right-3 z-30 bg-emerald-950/95 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-emerald-700/50 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-200 print:hidden">
        <div>
          <span className="text-[10px] text-emerald-300 block font-medium uppercase tracking-wider">Tổng thanh toán:</span>
          <span className="font-mono font-black text-sm text-emerald-200">{money(grandTotal)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addQuoteRow}
            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Hạng mục</span>
          </button>
        </div>
      </div>
    </div>
  );
};
