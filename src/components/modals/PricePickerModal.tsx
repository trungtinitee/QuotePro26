import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Tag, DollarSign, Layers } from 'lucide-react';
import { searchKeywordsMatch } from '../../utils/id';
import { money } from '../../utils/currency';
import { parseSpecLines } from '../../utils/specFormat';

const SpecDisplay: React.FC<{ detail: string }> = ({ detail }) => {
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(() => parseSpecLines(detail), [detail]);

  if (!lines.length) return null;

  const maxInitial = 5;
  const hasMore = lines.length > maxInitial;
  const displayedLines = expanded || !hasMore ? lines : lines.slice(0, maxInitial);

  return (
    <div className="mt-2.5 space-y-1.5 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/90 group-hover:bg-emerald-50/40 group-hover:border-emerald-200/60 transition">
      {displayedLines.map((line, idx) => (
        <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-md bg-emerald-100/80 text-emerald-800 text-[11px] font-bold shrink-0 mt-0.5 select-none">
            +
          </span>
          <span className="break-words font-normal text-slate-700 leading-snug">
            {line}
          </span>
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline pt-1 flex items-center gap-1 cursor-pointer"
        >
          {expanded ? '▲ Thu gọn quy cách' : `▼ Xem thêm ${lines.length - maxInitial} mục quy cách...`}
        </button>
      )}
    </div>
  );
};

export const PricePickerModal: React.FC = () => {
  const { activePickerRowId, closePricePicker, selectPriceForQuoteRow, prices } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

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

  if (!activePickerRowId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={closePricePicker}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                Chọn hạng mục áp giá
              </h3>
              <p className="text-[11px] text-slate-500">
                Áp giá bán, quy cách và đơn vị tính từ bảng giá vào dòng báo giá
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePricePicker}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Tìm kiếm: từ khóa 1; từ khóa 2 (ngăn cách bằng dấu ;)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none transition"
            />
          </div>

          {groups.length > 0 && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none transition text-slate-700 font-medium"
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

        {/* Price Items List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-3">
          {filteredPrices.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Không tìm thấy hạng mục nào phù hợp.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Thử tìm bằng từ khóa khác hoặc chuyển sang tab "Cập nhật giá" để thêm mới.
              </p>
            </div>
          ) : (
            filteredPrices.map((item) => (
              <div
                key={item.id}
                onClick={() => selectPriceForQuoteRow(item.id)}
                className="group p-3.5 sm:p-4 rounded-xl hover:bg-emerald-50/60 border border-slate-200/90 hover:border-emerald-300 cursor-pointer transition shadow-2xs hover:shadow-xs bg-white"
              >
                {/* Top: Code, Name, Group, Unit, Price */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                      {item.code}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-900 transition">
                      {item.name}
                    </h4>
                    {item.group && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {item.group}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      ĐVT: <strong className="text-slate-700">{item.unit || 'cái'}</strong>
                    </span>
                    <div className="text-right">
                      <div className="font-extrabold text-xs sm:text-sm text-emerald-800 font-mono bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-0.5 rounded-lg">
                        {money(item.price)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications / Details on clean separate lines */}
                {item.detail && <SpecDisplay detail={item.detail} />}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Tìm thấy <strong>{filteredPrices.length}</strong> / {prices.length} hạng mục
          </span>
          <button
            type="button"
            onClick={closePricePicker}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
