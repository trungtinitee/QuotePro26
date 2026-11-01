import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Receipt,
  DollarSign,
  PieChart,
  ShieldAlert,
  Table,
  LayoutGrid,
} from 'lucide-react';
import {
  money,
  formatDecimalInput,
  parseDecimalInput,
  formatMoneyInput,
  parseMoneyInput,
  formatMoneyLive,
  normalizeCommaDecimal,
} from '../../utils/currency';

export const AnalysisTab: React.FC = () => {
  const { currentQuote, updateCurrentQuote, findCatalogPrice } = useApp();

  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  const taxRate = Math.max(0, Number(currentQuote.tndnRate) || 0);
  const otherCosts = Math.max(0, Number(currentQuote.otherCosts) || 0);

  const items = useMemo(() => {
    return (currentQuote.rows || []).filter((r) => r.type === 'item');
  }, [currentQuote.rows]);

  const analysis = useMemo(() => {
    let subtotal = 0;
    let costTotal = 0;
    const missingItems: string[] = [];

    const itemDetails = items.map((r, i) => {
      const qty = Number(r.qty) || 0;
      const salePrice = Number(r.price) || 0;
      const saleTotal = salePrice * qty;
      subtotal += saleTotal;

      const cat = findCatalogPrice(r);
      const hasCost = cat && Number.isFinite(Number(cat.cost)) && Number(cat.cost) >= 0;
      const unitCost = hasCost ? Number(cat!.cost) : null;
      const itemCostTotal = unitCost !== null ? unitCost * qty : 0;
      costTotal += itemCostTotal;

      const profit = unitCost !== null ? (salePrice - unitCost) * qty : null;

      if (!cat) {
        missingItems.push(r.itemName || r.name || `Hạng mục #${i + 1}`);
      }

      return {
        row: r,
        catalogItem: cat,
        qty,
        salePrice,
        saleTotal,
        unitCost,
        itemCostTotal,
        profit,
      };
    });

    let discount = 0;
    if (currentQuote.discountEnabled) {
      discount =
        currentQuote.discountType === 'amount'
          ? Math.min(subtotal, Math.max(0, Number(currentQuote.discountValue) || 0))
          : Math.min(subtotal, Math.max(0, (subtotal * (Number(currentQuote.discountValue) || 0)) / 100));
    }

    const revenue = Math.max(0, subtotal - discount);
    const estimatedProfit = revenue - costTotal;
    const estimatedTax = estimatedProfit > 0 ? (estimatedProfit * taxRate) / 100 : 0;
    const finalProfit = estimatedProfit - estimatedTax - otherCosts;
    const margin = revenue > 0 ? (estimatedProfit / revenue) * 100 : 0;
    const finalMargin = revenue > 0 ? (finalProfit / revenue) * 100 : 0;

    return {
      subtotal,
      discount,
      revenue,
      costTotal,
      estimatedProfit,
      estimatedTax,
      otherCosts,
      finalProfit,
      margin,
      finalMargin,
      itemDetails,
      missingItems,
    };
  }, [items, currentQuote.discountEnabled, currentQuote.discountType, currentQuote.discountValue, taxRate, otherCosts, findCatalogPrice]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-inner">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-800">
              Phân tích doanh thu &amp; Biên lợi nhuận báo giá
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống lấy doanh thu từ báo giá hiện tại và đối chiếu với giá vốn nguồn trong bảng giá để tính toán hiệu quả tài chính.
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Parameters Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-500" />
          <span>Thông số chi phí &amp; thuế thu nhập</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Thuế thu nhập doanh nghiệp - TNDN (%)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={formatDecimalInput(currentQuote.tndnRate ?? 20)}
                onInput={(e) => normalizeCommaDecimal(e.currentTarget)}
                onChange={(e) =>
                  updateCurrentQuote({ tndnRate: parseDecimalInput(e.target.value) })
                }
                className="w-full min-h-[40px] px-3 py-2 pr-7 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-mono text-right font-medium"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                %
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Mặc định 20% theo quy định thuế TNDN hiện hành</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Chi phí khác (Vận chuyển, bốc xếp, tiếp khách, v.v.)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formatMoneyInput(currentQuote.otherCosts ?? 0)}
              onInput={(e) => formatMoneyLive(e.currentTarget)}
              onChange={(e) =>
                updateCurrentQuote({ otherCosts: parseMoneyInput(e.target.value) })
              }
              placeholder="0"
              className="w-full min-h-[40px] px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-mono text-right font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">Được trừ trực tiếp trước khi ra lợi nhuận ròng cuối cùng</p>
          </div>
        </div>

        {analysis.missingItems.length > 0 && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý: </strong>
              Có <strong>{analysis.missingItems.length}</strong> hạng mục chưa tìm thấy giá vốn trong danh mục giá ({analysis.missingItems.join(', ')}). Chi phí giá vốn của các hạng mục này đang tạm tính là 0 đ. Hãy thêm giá vốn trong tab "Cập nhật giá" để phân tích chính xác nhất.
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng giá báo giá
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-slate-800 mt-1">
            {money(analysis.subtotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Chưa trừ chiết khấu &amp; VAT</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Giảm giá / Chiết khấu
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-amber-700 mt-1">
            {money(analysis.discount)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Theo tỷ lệ hoặc số tiền</div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Doanh thu phân tích
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-black font-mono text-emerald-950 mt-1">
            {money(analysis.revenue)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">Doanh thu thuần chưa VAT</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng chi phí giá gốc
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-rose-800 mt-1">
            {money(analysis.costTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Giá vốn tổng các hạng mục</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Lợi nhuận ước tính
          </div>
          <div
            className={`text-sm sm:text-lg lg:text-xl font-bold font-mono mt-1 ${
              analysis.estimatedProfit < 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {money(analysis.estimatedProfit)}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            Biên gộp: {analysis.margin.toFixed(2).replace('.', ',')}%
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Thuế TNDN ước tính
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-slate-800 mt-1">
            {money(analysis.estimatedTax)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {formatDecimalInput(taxRate)}% trên lợi nhuận dương
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Chi phí khác
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-bold font-mono text-slate-800 mt-1">
            {money(analysis.otherCosts)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Chi phí phát sinh ngoài giá vốn</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-emerald-900">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
            Lợi nhuận cuối cùng
          </div>
          <div
            className={`text-base sm:text-xl lg:text-2xl font-black font-mono mt-1 ${
              analysis.finalProfit < 0 ? 'text-rose-300' : 'text-white'
            }`}
          >
            {money(analysis.finalProfit)}
          </div>
          <div className="text-[10px] text-emerald-200 font-bold mt-1">
            Biên ròng: {analysis.finalMargin.toFixed(2).replace('.', ',')}%
          </div>
        </div>
      </div>

      {/* Item-by-item Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-800">
              Chi tiết phân tích theo từng hạng mục
            </h3>
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              ({analysis.itemDetails.length} mục)
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng</span>
            </button>
          </div>
        </div>

        {analysis.itemDetails.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
            Chưa có hạng mục nào để phân tích. Hãy tạo hạng mục trong tab "Tạo báo giá".
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View for Mobile/Tablet */
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
            {analysis.itemDetails.map((item, idx) => {
              const hasCost = item.unitCost !== null;
              const profit = item.profit;

              return (
                <div
                  key={item.row.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-mono font-bold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {item.catalogItem?.code || item.row.code || '—'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium shrink-0">
                      SL: <strong className="text-slate-800 font-mono">{formatDecimalInput(item.qty)}</strong> {item.row.unit || 'cái'}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                    {item.row.itemName || item.row.name || 'Hạng mục'}
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Giá vốn</span>
                      <span className="font-mono font-bold text-slate-700">
                        {hasCost ? money(item.unitCost) : <span className="text-amber-600 font-medium">Chưa có</span>}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Chi phí gốc</span>
                      <span className="font-mono font-bold text-slate-800">
                        {hasCost ? money(item.itemCostTotal) : '—'}
                      </span>
                    </div>

                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block font-semibold uppercase">Doanh thu</span>
                      <span className="font-mono font-bold text-emerald-900">
                        {money(item.saleTotal)}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border ${profit === null ? 'bg-slate-50 border-slate-200' : profit >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      <span className="text-[10px] block font-semibold uppercase opacity-80">Lợi nhuận</span>
                      <span className="font-mono font-black">
                        {profit === null ? '—' : money(profit)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3 w-24">Mã</th>
                  <th className="p-3 min-w-[200px]">Tên hạng mục</th>
                  <th className="p-3 w-16 text-center">ĐVT</th>
                  <th className="p-3 w-16 text-center">SL</th>
                  <th className="p-3 w-28 text-right">Giá gốc</th>
                  <th className="p-3 w-28 text-right">Chi phí vốn</th>
                  <th className="p-3 w-28 text-right">Doanh thu</th>
                  <th className="p-3 w-28 text-right">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.itemDetails.map((item, idx) => {
                  const hasCost = item.unitCost !== null;
                  const profit = item.profit;

                  return (
                    <tr key={item.row.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-emerald-800">
                        {item.catalogItem?.code || item.row.code || '—'}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {item.row.itemName || item.row.name || 'Hạng mục'}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-medium">
                        {item.row.unit || 'cái'}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-700">
                        {formatDecimalInput(item.qty)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {hasCost ? (
                          <span className="text-slate-700">{money(item.unitCost)}</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Chưa có</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {hasCost ? (
                          <span className="text-slate-800 font-semibold">{money(item.itemCostTotal)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {money(item.saleTotal)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {profit === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className={profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {money(profit)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
