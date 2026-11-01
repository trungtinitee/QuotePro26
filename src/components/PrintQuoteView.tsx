import React from 'react';
import { useApp } from '../context/AppContext';
import {
  moneyPlain,
  formatDecimalInput,
  numberToVietnameseWords,
  formatDateVN,
} from '../utils/currency';
import { parseSpecLines } from '../utils/specFormat';

interface PrintQuoteViewProps {
  id?: string;
  className?: string;
  isPreview?: boolean;
}

export const PrintQuoteView: React.FC<PrintQuoteViewProps> = ({
  id = 'print-root',
  className = '',
  isPreview = false,
}) => {
  const { currentQuote, company } = useApp();

  const subtotal = (currentQuote.rows || [])
    .filter((r) => r.type === 'item')
    .reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);

  let discount = 0;
  if (currentQuote.discountEnabled) {
    discount =
      currentQuote.discountType === 'amount'
        ? Math.min(subtotal, Math.max(0, Number(currentQuote.discountValue) || 0))
        : Math.min(subtotal, Math.max(0, (subtotal * (Number(currentQuote.discountValue) || 0)) / 100));
  }

  const taxable = Math.max(0, subtotal - discount);
  const vatAmount = (taxable * (Number(currentQuote.vat) || 0)) / 100;
  const grandTotal = taxable + vatAmount;

  const contactLine = [
    company.phone && `ĐT: ${company.phone}`,
    company.tax && `MST: ${company.tax}`,
    company.email && `Email: ${company.email}`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  let itemNum = 0;
  let runningSubtotal = 0;

  return (
    <div
      id={id}
      style={{ fontFamily: 'Arial, Helvetica, "Nimbus Sans L", sans-serif' }}
      className={`${
        isPreview ? 'block' : 'hidden print:block'
      } w-full text-[#1F2A27] text-[10pt] leading-[1.35] bg-white ${className}`}
    >
      {/* 1. Company Letterhead Header */}
      <div className="flex items-center gap-4 pb-1">
        {company.logo && (
          <div className="w-24 h-24 shrink-0 flex items-center justify-center p-1">
            <img
              src={company.logo}
              alt="Logo công ty"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        <div className={`flex-1 ${company.logo ? 'text-left' : 'text-center'}`}>
          <div className="font-bold text-[14pt] text-[#0B5D45] uppercase tracking-wide leading-snug">
            {company.name || 'CÔNG TY'}
          </div>
          {company.address && (
            <div className="text-[9pt] text-[#66736E] mt-0.5 leading-tight">{company.address}</div>
          )}
          {contactLine && (
            <div className="text-[8.5pt] text-[#66736E] mt-0.5 leading-tight">{contactLine}</div>
          )}
          {company.website && (
            <div className="text-[8.5pt] text-[#66736E] mt-0.5 leading-tight">Web: {company.website}</div>
          )}
          {company.bank && (
            <div className="text-[8.5pt] text-[#66736E] mt-0.5 leading-tight">Ngân hàng: {company.bank}</div>
          )}
        </div>
      </div>

      {/* Brand accent divider line */}
      <div className="h-[2px] bg-[#117A5A] my-2 w-full" />

      {/* 2. Document Title */}
      <div className="text-center my-2.5">
        <h1 className="font-bold text-[18pt] text-[#117A5A] uppercase tracking-wider">
          BẢNG BÁO GIÁ
        </h1>
      </div>

      {/* 3. Quote Meta Info Grid (Synchronized 4-column layout like Word export) */}
      <div className="w-full text-[9pt] mb-2">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-[15%] py-0.5 text-[#66736E] font-bold">Số báo giá:</td>
              <td className="w-[35%] py-0.5 text-[#1F2A27] font-semibold">{currentQuote.no || '—'}</td>
              <td className="w-[15%] py-0.5 text-[#66736E] font-bold">Ngày:</td>
              <td className="w-[35%] py-0.5 text-[#1F2A27]">{formatDateVN(currentQuote.date)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-[#66736E] font-bold">Dự án:</td>
              <td className="py-0.5 text-[#1F2A27]">{currentQuote.project || '—'}</td>
              <td className="py-0.5 text-[#66736E] font-bold">Thời hạn:</td>
              <td className="py-0.5 text-[#1F2A27]">{currentQuote.validity || '30 ngày'}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-[#66736E] font-bold">Người lập:</td>
              <td className="py-0.5 text-[#1F2A27]">{currentQuote.creator || '—'}</td>
              <td className="py-0.5 text-[#66736E] font-bold">Kính gửi:</td>
              <td className="py-0.5 text-[#1F2A27] font-semibold">{currentQuote.customer || 'Quý Khách hàng'}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-[#66736E] font-bold">Đơn vị:</td>
              <td className="py-0.5 text-[#1F2A27]">{currentQuote.company || '—'}</td>
              <td className="py-0.5 text-[#66736E] font-bold">Địa chỉ:</td>
              <td className="py-0.5 text-[#1F2A27]">{currentQuote.address || '—'}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-[#66736E] font-bold">Điện thoại:</td>
              <td className="py-0.5 text-[#1F2A27]">{currentQuote.phone || '—'}</td>
              <td className="py-0.5"></td>
              <td className="py-0.5"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-[#B8C4BF] my-2 w-full" />

      {/* Salutation / Intro */}
      <div className="pt-1 pb-2 text-[9.5pt]">
        <div className="font-bold text-[#1F2A27] mb-0.5">Kính gửi Quý Khách hàng,</div>
        <div className="text-[#66736E] text-[9pt]">
          Cảm ơn Quý Khách hàng đã tin tưởng. Theo yêu cầu, chúng tôi xin trân trọng gửi bảng báo giá chi tiết như sau:
        </div>
      </div>

      {/* 4. Main Quotation Table */}
      <table className="w-full border-collapse border border-[#B8C4BF] text-[9pt] my-2">
        <thead>
          <tr className="bg-[#117A5A] text-white font-bold text-center">
            <th className="border border-[#B8C4BF] px-2 py-1.5 w-[6%] text-center">STT</th>
            <th className="border border-[#B8C4BF] px-2 py-1.5 w-[47%] text-left">Hạng mục / Quy cách chi tiết</th>
            <th className="border border-[#B8C4BF] px-2 py-1.5 w-[9%] text-center">ĐVT</th>
            <th className="border border-[#B8C4BF] px-2 py-1.5 w-[7%] text-center">SL</th>
            <th className="border border-[#B8C4BF] px-2 py-1.5 w-[15%] text-right">Đơn giá</th>
            <th className="border border-[#B8C4BF] px-2 py-1.5 w-[16%] text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {(currentQuote.rows || []).map((r) => {
            if (r.type === 'heading') {
              return (
                <tr key={r.id} className="bg-[#EEF7F3] text-[#0B5D45] font-bold break-inside-avoid">
                  <td colSpan={6} className="border border-[#B8C4BF] px-2.5 py-1.5 uppercase text-[9pt]">
                    {r.title}
                  </td>
                </tr>
              );
            }

            if (r.type === 'subheading') {
              return (
                <tr key={r.id} className="bg-[#F8FAF9] text-[#1F2A27] font-bold italic break-inside-avoid">
                  <td colSpan={6} className="border border-[#B8C4BF] px-2.5 py-1.5 text-[8.5pt]">
                    {r.title}
                  </td>
                </tr>
              );
            }

            if (r.type === 'subtotal') {
              const currentGroupTotal = runningSubtotal;
              runningSubtotal = 0; // reset for next group
              return (
                <tr key={r.id} className="bg-[#F5FAF7] text-[#0B5D45] font-bold break-inside-avoid">
                  <td colSpan={5} className="border border-[#B8C4BF] px-2.5 py-1 text-right uppercase text-[8.5pt]">
                    TỔNG NHÓM
                  </td>
                  <td className="border border-[#B8C4BF] px-2 py-1 text-right tabular-nums text-[8.5pt]">
                    {moneyPlain(currentGroupTotal)} đ
                  </td>
                </tr>
              );
            }

            // Item Row
            itemNum++;
            const qty = Number(r.qty) || 0;
            const price = Number(r.price) || 0;
            const lineTotal = qty * price;
            runningSubtotal += lineTotal;

            const title = String(r.itemName || r.name || '');
            const detail = r.itemName && r.name && r.name !== r.itemName ? String(r.name) : '';

            return (
              <tr key={r.id} className="break-inside-avoid">
                <td className="border border-[#B8C4BF] px-2 py-1 text-center tabular-nums text-[8.5pt]">
                  {itemNum}
                </td>
                <td className="border border-[#B8C4BF] px-2.5 py-1 align-top">
                  <div className="font-bold text-[#1F2A27] text-[9pt] leading-snug">{title}</div>
                  {detail && (
                    <div className="text-[8.5pt] text-[#55605C] leading-relaxed mt-0.5 space-y-0.5">
                      {parseSpecLines(detail).map((line, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="font-semibold text-[#1F2A27] shrink-0 select-none text-[8pt] mt-0.5">+</span>
                          <span className="break-words">{line.replace(/^[+•\-*]\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="border border-[#B8C4BF] px-2 py-1 text-center align-top text-[8.5pt]">
                  {r.unit || 'cái'}
                </td>
                <td className="border border-[#B8C4BF] px-2 py-1 text-center align-top tabular-nums text-[8.5pt]">
                  {formatDecimalInput(qty)}
                </td>
                <td className="border border-[#B8C4BF] px-2 py-1 text-right align-top tabular-nums text-[8.5pt]">
                  {moneyPlain(price)}
                </td>
                <td className="border border-[#B8C4BF] px-2 py-1 text-right align-top tabular-nums text-[8.5pt] font-semibold text-[#1F2A27]">
                  {moneyPlain(lineTotal)} đ
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 5. Totals / Financial Summary (Right-aligned, matching Word table layout) */}
      <div className="flex justify-end my-2 break-inside-avoid">
        <div className="w-80 space-y-1 text-[9pt]">
          <div className="flex justify-between py-0.5">
            <span className="text-[#66736E]">Tạm tính:</span>
            <span className="tabular-nums font-bold text-[#1F2A27]">{moneyPlain(subtotal)} đ</span>
          </div>

          {currentQuote.discountEnabled && (
            <div className="flex justify-between py-0.5 text-[#1F2A27]">
              <span className="text-[#66736E]">
                Giảm giá{' '}
                {currentQuote.discountType === 'percent'
                  ? `(${formatDecimalInput(currentQuote.discountValue)}%)`
                  : ''}
                :
              </span>
              <span className="tabular-nums font-bold">- {moneyPlain(discount)} đ</span>
            </div>
          )}

          <div className="flex justify-between py-0.5">
            <span className="text-[#66736E]">VAT ({formatDecimalInput(currentQuote.vat)}%):</span>
            <span className="tabular-nums text-[#1F2A27]">{moneyPlain(vatAmount)} đ</span>
          </div>

          <div className="flex justify-between font-bold text-[11.5pt] border-t border-[#B8C4BF] pt-1.5 mt-1 text-[#0B5D45]">
            <span>TỔNG THANH TOÁN:</span>
            <span className="tabular-nums">{moneyPlain(grandTotal)} đ</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="text-[9pt] my-2 break-inside-avoid">
        <span className="font-bold text-[#1F2A27]">Bằng chữ: </span>
        <span className="italic text-[#1F2A27]">{numberToVietnameseWords(grandTotal)}</span>
      </div>

      {/* 6. Notes & Terms */}
      {currentQuote.notes && (
        <div className="my-3 break-inside-avoid">
          <div className="font-bold text-[9pt] text-[#1F2A27] uppercase mb-1">
            Ghi chú / Điều khoản
          </div>
          <div className="border-l-2 border-[#117A5A] pl-2.5 text-[8.5pt] text-[#1F2A27] leading-relaxed whitespace-pre-wrap">
            {currentQuote.notes}
          </div>
        </div>
      )}

      {/* 7. Signature (Right-aligned Quote Creator only) */}
      <div className="flex justify-end items-start mt-6 pt-2 break-inside-avoid">
        <div className="w-56 text-center">
          <div className="font-bold text-[9.5pt] uppercase text-[#1F2A27]">NGƯỜI LẬP BÁO GIÁ</div>
          <div className="italic text-[8.5pt] text-[#66736E] mt-0.5">(Ký, ghi rõ họ tên)</div>
          <div className="h-20" />
          <div className="font-bold text-[9.5pt] text-[#1F2A27]">{currentQuote.creator || '—'}</div>
        </div>
      </div>
    </div>
  );
};
