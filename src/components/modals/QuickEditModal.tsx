import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Settings, ArrowRight, AlertCircle, PlusCircle, Check, Layers, RefreshCw } from 'lucide-react';
import {
  parseMoneyInput,
  formatMoneyInput,
  parseDecimalInput,
  formatDecimalInput,
  money,
  formatMoneyLive,
  normalizeCommaDecimal,
} from '../../utils/currency';
import { AutoResizeTextarea } from '../common/AutoResizeTextarea';
import { formatDetailMultiline } from '../../utils/specFormat';

export const QuickEditModal: React.FC = () => {
  const {
    activeQuickEditRowId,
    closeQuickEdit,
    applyQuickEdit,
    currentQuote,
    findCatalogPrice,
  } = useApp();

  const currentRow = useMemo(() => {
    return currentQuote.rows.find((r) => r.id === activeQuickEditRowId && r.type === 'item');
  }, [currentQuote.rows, activeQuickEditRowId]);

  const catalogItem = useMemo(() => {
    return currentRow ? findCatalogPrice(currentRow) : undefined;
  }, [currentRow, findCatalogPrice]);

  const targetCode = (catalogItem?.code || currentRow?.code || '').trim().toUpperCase();
  const targetGlobalKey = catalogItem?.globalKey || currentRow?.globalKey;
  const targetPriceId = catalogItem?.id || currentRow?.priceId;
  const targetName = (catalogItem?.name || currentRow?.itemName || currentRow?.name || '').trim().toLowerCase();

  const matchingRows = useMemo(() => {
    if (!currentRow) return [];
    return currentQuote.rows.filter((r) => {
      if (r.type !== 'item') return false;
      if (r.id === currentRow.id) return true;
      if (targetCode && r.code && r.code.trim().toUpperCase() === targetCode) return true;
      if (targetGlobalKey && r.globalKey && r.globalKey === targetGlobalKey) return true;
      if (targetPriceId && r.priceId && r.priceId === targetPriceId) return true;
      if (!targetCode && targetName && r.itemName && r.itemName.trim().toLowerCase() === targetName) return true;
      return false;
    });
  }, [currentQuote.rows, currentRow, targetCode, targetGlobalKey, targetPriceId, targetName]);

  const sameCodeCount = matchingRows.length;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [unit, setUnit] = useState('');
  const [costStr, setCostStr] = useState('');
  const [factorStr, setFactorStr] = useState('');
  const [group, setGroup] = useState('');

  useEffect(() => {
    if (currentRow) {
      setCode(catalogItem?.code || currentRow.code || '(Hệ thống tự tạo mã)');
      setName(catalogItem?.name || currentRow.itemName || currentRow.name || '');
      setDetail(catalogItem?.detail || currentRow.name || '');
      setUnit(catalogItem?.unit || currentRow.unit || 'cái');
      setCostStr(formatMoneyInput(catalogItem ? catalogItem.cost : currentRow.cost || 0));
      setFactorStr(formatDecimalInput(catalogItem ? catalogItem.profitFactor : currentRow.profitFactor || 1.25));
      setGroup(catalogItem?.group || currentRow.group || 'Chung');
    }
  }, [currentRow, catalogItem]);

  if (!activeQuickEditRowId || !currentRow) return null;

  const cost = parseMoneyInput(costStr);
  const factor = parseDecimalInput(factorStr);
  const calculatedSellingPrice = Math.round(cost * factor);

  const handleApply = (action: 'update' | 'updateAll' | 'create') => {
    applyQuickEdit(action, {
      name,
      detail,
      unit,
      cost,
      profitFactor: factor,
      price: calculatedSellingPrice,
      group,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={closeQuickEdit}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                Điều chỉnh nhanh hạng mục
              </h3>
              <p className="text-[11px] text-slate-500">
                {catalogItem
                  ? `Đang liên kết với: ${catalogItem.code} - ${catalogItem.name}`
                  : 'Hạng mục chưa có trong danh mục giá nguồn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeQuickEdit}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Fields */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Mã hạng mục
              </label>
              <input
                type="text"
                value={code}
                disabled
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                title="Mã hạng mục được hệ thống tự động quản lý"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Đơn vị tính (ĐVT)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cái, bộ, m, gói..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-600 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tên hạng mục
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên hạng mục..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:border-emerald-600 outline-none transition font-semibold text-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Mô tả chi tiết kỹ thuật
              </label>
              {detail && /(?:^|\s)\+\s+/.test(detail) && (
                <button
                  type="button"
                  onClick={() => setDetail(formatDetailMultiline(detail))}
                  className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  title="Tự động tách các mục dấu '+' thành từng dòng riêng"
                >
                  <span>Tách dòng (+)</span>
                </button>
              )}
            </div>
            <AutoResizeTextarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Nhập quy cách, xuất xứ, thông số kỹ thuật chi tiết..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-600 outline-none transition leading-relaxed auto-grow item-detail-textarea"
              minHeight={72}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Giá vốn (đ)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={costStr}
                onInput={(e) => formatMoneyLive(e.currentTarget)}
                onChange={(e) => setCostStr(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:border-emerald-600 outline-none transition font-mono text-right font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Hệ số lợi nhuận
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={factorStr}
                onInput={(e) => normalizeCommaDecimal(e.currentTarget)}
                onChange={(e) => setFactorStr(e.target.value)}
                placeholder="1,2"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:border-emerald-600 outline-none transition font-mono text-right font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Nhóm hạng mục
              </label>
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Thiết bị, Dịch vụ..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-600 outline-none transition"
              />
            </div>
          </div>

          {/* Real-time Price Preview Box */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                Giá bán dự kiến
              </div>
              <div className="text-[11px] text-emerald-700">
                Giá vốn × Hệ số = {money(cost)} × {formatDecimalInput(factor)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-extrabold text-emerald-900 font-mono">
                {money(calculatedSellingPrice)}
              </span>
            </div>
          </div>

          {sameCodeCount > 1 && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
              <Layers className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold flex items-center gap-1.5 flex-wrap">
                  <span>Tìm thấy {sameCodeCount} hạng mục cùng mã</span>
                  {targetCode && (
                    <span className="font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[11px] font-bold">
                      {targetCode}
                    </span>
                  )}
                  <span>trong báo giá này</span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Bấm nút <strong>"Cập nhật đồng loạt"</strong> bên dưới để áp dụng giá mới ({money(calculatedSellingPrice)}) và quy cách cho toàn bộ <strong>{sameCodeCount} dòng</strong> này cùng lúc.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={closeQuickEdit}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition text-center min-h-[42px]"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={() => handleApply('create')}
            className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 min-h-[42px]"
            title="Tạo thành một hạng mục mới độc lập trong bảng giá với mã tự sinh mới, không ảnh hưởng đến các dòng khác"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Tạo mã mới độc lập</span>
          </button>

          <button
            type="button"
            onClick={() => handleApply('update')}
            className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition flex items-center justify-center gap-1.5 min-h-[42px]"
            title="Chỉ cập nhật bảng giá và duy nhất dòng hiện tại trong báo giá"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chỉ cập nhật dòng này</span>
          </button>

          {sameCodeCount > 1 ? (
            <button
              type="button"
              onClick={() => handleApply('updateAll')}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 animate-pulse min-h-[42px]"
              title={`Cập nhật bảng giá và áp dụng đồng loạt cho tất cả ${sameCodeCount} dòng có cùng mã trong báo giá`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cập nhật đồng loạt ({sameCodeCount} dòng)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleApply('updateAll')}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 min-h-[42px]"
              title="Lưu vào bảng giá và cập nhật báo giá"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu &amp; Cập nhật bảng giá</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
