import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AutoResizeTextarea } from '../common/AutoResizeTextarea';
import { DecimalInput } from '../common/DecimalInput';
import {
  Coins,
  Plus,
  Save,
  RotateCcw,
  Key,
  Search,
  Copy,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Table,
  LayoutGrid,
} from 'lucide-react';
import {
  money,
  formatMoneyInput,
  parseMoneyInput,
  formatDecimalInput,
  parseDecimalInput,
  formatMoneyLive,
  normalizeCommaDecimal,
} from '../../utils/currency';
import { searchKeywordsMatch } from '../../utils/id';
import { formatDetailMultiline } from '../../utils/specFormat';

export const PriceCatalogTab: React.FC = () => {
  const {
    prices,
    addPriceItem,
    updatePriceItem,
    deletePriceItem,
    duplicatePriceItem,
    clearAllPrices,
    priceDraftDirty,
    savePriceChanges,
    discardPriceDraft,
    setIsGlobalKeyModalOpen,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [catalogViewMode, setCatalogViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  const groups = useMemo(() => {
    const set = new Set<string>();
    prices.forEach((p) => {
      if (p.group?.trim()) set.add(p.group.trim());
    });
    return Array.from(set);
  }, [prices]);

  const filteredPrices = useMemo(() => {
    return prices.filter((p) => {
      if (selectedGroup !== 'all' && p.group?.trim() !== selectedGroup) {
        return false;
      }
      return searchKeywordsMatch(`${p.code} ${p.name} ${p.group} ${p.detail}`, searchTerm);
    });
  }, [prices, searchTerm, selectedGroup]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Intro & Guide Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-inner">
              <Coins className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-800">
                Danh mục hạng mục &amp; Thiết lập đơn giá bán
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Giá bán = Giá vốn × Hệ số lợi nhuận. Đơn giá tại đây là giá nguồn cho các báo giá mới.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGlobalKeyModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              title="Xem danh sách GlobalKey định danh"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem GlobalKey</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Cards Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Actions Bar (Responsive PC/Tablet/Phone) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-3">
          {/* Top row: Actions, Status & View Mode */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => addPriceItem()}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm hạng mục</span>
              </button>

              <button
                type="button"
                onClick={savePriceChanges}
                className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  priceDraftDirty
                    ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                    : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cập nhật giá</span>
              </button>

              {priceDraftDirty && (
                <button
                  type="button"
                  onClick={discardPriceDraft}
                  className="inline-flex items-center gap-1 min-h-[38px] bg-white hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 transition"
                  title="Bỏ các thay đổi chưa lưu chính thức"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hủy nháp</span>
                </button>
              )}

              {/* Status indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                  priceDraftDirty
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {priceDraftDirty ? (
                  <>
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Có thay đổi nháp</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span className="hidden sm:inline">Đã lưu chính thức</span>
                  </>
                )}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setCatalogViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  catalogViewMode === 'cards'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ</span>
              </button>

              <button
                type="button"
                onClick={() => setCatalogViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  catalogViewMode === 'table'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Bảng</span>
              </button>
            </div>
          </div>

          {/* Search & Group filters (Full width on mobile, responsive on PC) */}
          <div className="flex items-center gap-2 flex-col sm:flex-row w-full">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm: từ khóa 1; từ khóa 2..."
                className="w-full min-h-[40px] pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none transition"
              />
            </div>

            {groups.length > 0 && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full sm:w-auto min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none text-slate-700 font-medium shrink-0"
              >
                <option value="all">Tất cả nhóm ({prices.length})</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content: Cards or Table */}
        {filteredPrices.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            Không có hạng mục nào trong danh mục giá. Bấm <strong>+ Thêm hạng mục</strong> để bắt đầu.
          </div>
        ) : catalogViewMode === 'cards' ? (
          /* Cards View for Mobile/Tablet */
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
            {filteredPrices.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 hover:border-emerald-200 transition"
              >
                {/* Header: Code badge, Group input, Duplicate, Delete */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                      {p.code}
                    </span>
                    <input
                      type="text"
                      value={p.group || ''}
                      onChange={(e) => updatePriceItem(p.id, { group: e.target.value })}
                      placeholder="Nhóm (VD: Thiết bị, Vật tư)..."
                      className="text-[11px] text-slate-600 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none font-medium max-w-[140px]"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => duplicatePriceItem(p.id)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Nhân đôi hạng mục"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePriceItem(p.id)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa hạng mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tên hạng mục
                  </label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePriceItem(p.id, { name: e.target.value })}
                    placeholder="Nhập tên hạng mục..."
                    className="w-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-semibold text-slate-800"
                  />
                </div>

                {/* Specs */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quy cách kỹ thuật / Chi tiết
                    </label>
                    {p.detail && /(?:^|\s)\+\s+/.test(p.detail) && (
                      <button
                        type="button"
                        onClick={() => updatePriceItem(p.id, { detail: formatDetailMultiline(p.detail) })}
                        className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        title="Tự động tách các mục dấu '+' thành từng dòng riêng"
                      >
                        <span>Tách dòng (+)</span>
                      </button>
                    )}
                  </div>
                  <AutoResizeTextarea
                    value={p.detail}
                    onChange={(e) => updatePriceItem(p.id, { detail: e.target.value })}
                    placeholder="Mô tả kỹ thuật, xuất xứ, thông số..."
                    className="w-full p-2.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none transition leading-relaxed auto-grow item-detail-textarea"
                    minHeight={36}
                  />
                </div>

                {/* Numbers Grid: ĐVT, Giá vốn, Hệ số, Giá bán */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">
                      ĐVT
                    </label>
                    <input
                      type="text"
                      value={p.unit}
                      onChange={(e) => updatePriceItem(p.id, { unit: e.target.value })}
                      placeholder="cái..."
                      className="w-full min-h-[40px] text-center p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-medium text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-right">
                      Giá vốn (đ)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatMoneyInput(p.cost)}
                      onInput={(e) => formatMoneyLive(e.currentTarget)}
                      onChange={(e) =>
                        updatePriceItem(p.id, { cost: parseMoneyInput(e.target.value) })
                      }
                      className="w-full min-h-[40px] text-right p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-mono font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-right">
                      Hệ số lãi
                    </label>
                    <DecimalInput
                      value={p.profitFactor}
                      onChange={(val) => updatePriceItem(p.id, { profitFactor: val })}
                      className="w-full min-h-[40px] text-right p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 outline-none font-mono font-medium text-slate-800"
                      placeholder="1,2"
                    />
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider text-right block">
                      Giá bán (đ)
                    </span>
                    <span className="font-mono font-black text-xs sm:text-sm text-emerald-900 text-right mt-0.5">
                      {money(p.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Master Catalog Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3 w-24">Mã</th>
                  <th className="p-3 min-w-[180px]">Tên hạng mục</th>
                  <th className="p-3 min-w-[240px]">Chi tiết hạng mục / Quy cách</th>
                  <th className="p-3 w-20 text-center">ĐVT</th>
                  <th className="p-3 w-28 text-right">Giá vốn</th>
                  <th className="p-3 w-28 text-right">Hệ số lãi</th>
                  <th className="p-3 w-32 text-right">Giá bán</th>
                  <th className="p-3 w-28">Nhóm</th>
                  <th className="p-3 w-24 text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPrices.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      {/* Mã */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={p.code}
                          readOnly
                          className="w-full min-h-[36px] p-1 font-mono font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-100 rounded text-xs text-center cursor-not-allowed"
                          title="Mã tự động do hệ thống cấp"
                        />
                      </td>

                      {/* Tên */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => updatePriceItem(p.id, { name: e.target.value })}
                          placeholder="Tên hạng mục..."
                          className="w-full min-h-[36px] p-1 font-semibold text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none"
                        />
                      </td>

                      {/* Chi tiết */}
                      <td className="p-2.5">
                        <div className="relative group/spec">
                          <AutoResizeTextarea
                            value={p.detail}
                            onChange={(e) => updatePriceItem(p.id, { detail: e.target.value })}
                            placeholder="Mô tả kỹ thuật, xuất xứ..."
                            className="w-full p-1 text-slate-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none text-xs leading-relaxed auto-grow item-detail-textarea"
                            minHeight={32}
                          />
                          {p.detail && /(?:^|\s)\+\s+/.test(p.detail) && (
                            <button
                              type="button"
                              onClick={() => updatePriceItem(p.id, { detail: formatDetailMultiline(p.detail) })}
                              className="hidden group-hover/spec:inline-flex text-[10px] text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-1.5 py-0.5 rounded font-bold absolute right-1 bottom-1 shadow-xs transition cursor-pointer"
                              title="Tự động tách các mục '+' thành từng dòng riêng"
                            >
                              Tách dòng (+)
                            </button>
                          )}
                        </div>
                      </td>

                      {/* ĐVT */}
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          value={p.unit}
                          onChange={(e) => updatePriceItem(p.id, { unit: e.target.value })}
                          placeholder="cái..."
                          className="w-full min-h-[36px] p-1 text-center font-medium text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none"
                        />
                      </td>

                      {/* Giá vốn */}
                      <td className="p-2.5 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatMoneyInput(p.cost)}
                          onInput={(e) => formatMoneyLive(e.currentTarget)}
                          onChange={(e) =>
                            updatePriceItem(p.id, { cost: parseMoneyInput(e.target.value) })
                          }
                          className="w-full min-h-[36px] p-1 text-right font-mono font-medium text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none"
                        />
                      </td>

                      {/* Hệ số */}
                      <td className="p-2.5 text-right">
                        <DecimalInput
                          value={p.profitFactor}
                          onChange={(val) => updatePriceItem(p.id, { profitFactor: val })}
                          className="w-full min-h-[36px] p-1 text-right font-mono font-medium text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none"
                          placeholder="1,2"
                        />
                      </td>

                      {/* Giá bán */}
                      <td className="p-2.5 text-right">
                        <span className="font-mono font-extrabold text-emerald-800 text-xs sm:text-sm">
                          {money(p.price)}
                        </span>
                      </td>

                      {/* Nhóm */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={p.group}
                          onChange={(e) => updatePriceItem(p.id, { group: e.target.value })}
                          placeholder="Nhóm..."
                          className="w-full min-h-[36px] p-1 text-slate-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-600 rounded outline-none"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicatePriceItem(p.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                            title="Nhân đôi hạng mục"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePriceItem(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
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

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị <strong>{filteredPrices.length}</strong> / {prices.length} đơn giá trong danh mục.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAllPrices}
              className="text-rose-600 hover:text-rose-700 hover:underline font-semibold"
            >
              Xóa toàn bộ đơn giá...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
