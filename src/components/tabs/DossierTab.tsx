import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderArchive,
  RefreshCw,
  Printer,
  FileDown,
  Save,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  Building,
  ChevronDown,
  Edit3,
  Eye,
  SlidersHorizontal,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import {
  money,
  moneyPlain,
  formatDecimalInput,
  numberToVietnameseWords,
  dossierDateVN,
  formatDateVN,
} from '../../utils/currency';
import { exportDossierDocToWord } from '../../utils/exportDossierWord';
import { DossierCommon, DossierDocData, DossierState } from '../../types';

export const DOSSIER_TYPES = [
  { id: 'contract', name: 'Hợp đồng kinh tế', short: 'Hợp đồng', code: 'HĐKT' },
  { id: 'deliveryReceipt', name: 'Biên bản giao nhận thiết bị', short: 'Giao nhận', code: 'BBGN' },
  { id: 'handover', name: 'Biên bản bàn giao thiết bị & hồ sơ', short: 'Bàn giao', code: 'BBBG' },
  { id: 'installAcceptance', name: 'Biên bản nghiệm thu lắp đặt', short: 'NT lắp đặt', code: 'NTLĐ' },
  { id: 'completionAcceptance', name: 'Biên bản nghiệm thu hoàn thành', short: 'NT hoàn thành', code: 'NTHT' },
  { id: 'liquidation', name: 'Biên bản thanh lý hợp đồng', short: 'Thanh lý', code: 'BBTL' },
  { id: 'paymentRequest', name: 'Giấy đề nghị thanh toán', short: 'Đề nghị TT', code: 'GĐNTT' },
];

export const DossierTab: React.FC = () => {
  const { currentQuote, updateCurrentQuote, company, showToast, saveQuote } = useApp();
  const [activeType, setActiveType] = useState<string>('contract');
  const [viewMode, setViewMode] = useState<'preview' | 'form'>('preview');
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [commonExpanded, setCommonExpanded] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 60;
      if (window.innerWidth < 1024) return 85;
    }
    return 100;
  });
  const previewRef = useRef<HTMLDivElement>(null);

  // Financial calculations
  const subtotal = useMemo(() => {
    return (currentQuote.rows || [])
      .filter((r) => r.type === 'item')
      .reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  }, [currentQuote.rows]);

  const discountAmount = useMemo(() => {
    if (!currentQuote.discountEnabled) return 0;
    if (currentQuote.discountType === 'amount') {
      return Math.min(subtotal, Math.max(0, Number(currentQuote.discountValue) || 0));
    }
    return Math.min(subtotal, Math.max(0, (subtotal * (Number(currentQuote.discountValue) || 0)) / 100));
  }, [currentQuote.discountEnabled, currentQuote.discountType, currentQuote.discountValue, subtotal]);

  const taxable = Math.max(0, subtotal - discountAmount);
  const vatAmount = (taxable * (Number(currentQuote.vat) || 0)) / 100;
  const grandTotal = taxable + vatAmount;

  // Initialize dossier defaults
  const dossier: DossierState = useMemo(() => {
    const existing = currentQuote.dossier;
    const defaultAdvanceRate = 30; // 30% default advance
    const defaultAdvanceAmount = Math.round((grandTotal * defaultAdvanceRate) / 100);
    const defaultRemaining = grandTotal - defaultAdvanceAmount;

    const common: DossierCommon = {
      contractNo: existing?.common?.contractNo || currentQuote.no || 'HĐ-2026/D-V-N',
      contractDate: existing?.common?.contractDate || currentQuote.date || new Date().toISOString().split('T')[0],
      project: existing?.common?.project || currentQuote.project || 'Cung cấp và lắp đặt thiết bị xử lý nước',
      workTitle: existing?.common?.workTitle || currentQuote.project || 'Cung cấp, lắp đặt và hoàn thiện hệ thống thiết bị',
      location: existing?.common?.location || 'Đồng Tháp',
      executionPeriod: existing?.common?.executionPeriod || '15 ngày kể từ ngày ký hợp đồng và nhận tạm ứng',
      warranty: existing?.common?.warranty || currentQuote.validity || '12 tháng kể từ ngày ký biên bản nghiệm thu đưa vào sử dụng',
      partyA: {
        name: existing?.common?.partyA?.name || currentQuote.company || currentQuote.customer || 'CÔNG TY TNHH KHÁCH HÀNG',
        rep: existing?.common?.partyA?.rep || currentQuote.customer || 'Nguyễn Văn A',
        title: existing?.common?.partyA?.title || 'Giám đốc',
        address: existing?.common?.partyA?.address || currentQuote.address || 'Khu công nghiệp, tỉnh Đồng Tháp',
        phone: existing?.common?.partyA?.phone || currentQuote.phone || '',
        tax: existing?.common?.partyA?.tax || '',
        bank: existing?.common?.partyA?.bank || '',
      },
      partyB: {
        name: existing?.common?.partyB?.name || company.name || 'CÔNG TY TNHH TƯ VẤN – ĐẦU TƯ MÔI TRƯỜNG D-V-N',
        rep: existing?.common?.partyB?.rep || currentQuote.creator || 'Lê Hoàng Trung',
        title: existing?.common?.partyB?.title || 'Giám đốc',
        address: existing?.common?.partyB?.address || company.address || 'Số 142/3, QL 80, ấp An Hòa, Xã An Nhơn, Huyện Châu Thành, Tỉnh Đồng Tháp',
        phone: existing?.common?.partyB?.phone || company.phone || '0983 234 449',
        tax: existing?.common?.partyB?.tax || company.tax || '1402223849',
        bank: existing?.common?.partyB?.bank || company.bank || 'Vietcombank - CN Sa Đéc (STK: 0601000620808)',
      },
      copiesA: existing?.common?.copiesA || '02',
      copiesB: existing?.common?.copiesB || '02',
    };

    const docs: Record<string, DossierDocData> = existing?.docs || {};
    // Ensure active document has defaults
    if (!docs[activeType]) {
      docs[activeType] = {
        no: existing?.docs?.[activeType]?.no || `${activeType.toUpperCase().slice(0, 4)}-${common.contractNo}`,
        date: existing?.docs?.[activeType]?.date || common.contractDate,
        location: existing?.docs?.[activeType]?.location || common.location,
        advanceRate: existing?.docs?.[activeType]?.advanceRate ?? defaultAdvanceRate,
        advanceAmount: existing?.docs?.[activeType]?.advanceAmount ?? defaultAdvanceAmount,
        remainingAmount: existing?.docs?.[activeType]?.remainingAmount ?? defaultRemaining,
        paymentDays: existing?.docs?.[activeType]?.paymentDays || '05',
        invoiceNo: existing?.docs?.[activeType]?.invoiceNo || '0000123',
        invoiceDate: existing?.docs?.[activeType]?.invoiceDate || common.contractDate,
        handoverTime: existing?.docs?.[activeType]?.handoverTime || '09 giờ 00 phút',
        acceptanceTime: existing?.docs?.[activeType]?.acceptanceTime || '14 giờ 30 phút',
        signA: existing?.docs?.[activeType]?.signA || common.partyA.rep,
        signATitle: existing?.docs?.[activeType]?.signATitle || common.partyA.title,
        signB: existing?.docs?.[activeType]?.signB || common.partyB.rep,
        signBTitle: existing?.docs?.[activeType]?.signBTitle || common.partyB.title,
        senderName: existing?.docs?.[activeType]?.senderName || common.partyB.rep,
        receiverName: existing?.docs?.[activeType]?.receiverName || common.partyA.rep,
        conclusion: existing?.docs?.[activeType]?.conclusion || 'Đạt yêu cầu kỹ thuật theo hồ sơ thiết kế, thiết bị vận hành ổn định và an toàn.',
      };
    }

    return {
      common,
      docs,
      content: existing?.content || {},
      customTexts: existing?.customTexts || {},
    };
  }, [currentQuote, company, activeType, grandTotal]);

  const currentDocData = dossier.docs[activeType] || {};

  // Update dossier state
  const updateDossier = (patch: Partial<DossierState>) => {
    const updated = {
      ...dossier,
      ...patch,
    };
    updateCurrentQuote({ dossier: updated });
  };

  const updateCommonField = (field: keyof DossierCommon, value: any) => {
    updateDossier({
      common: {
        ...dossier.common,
        [field]: value,
      },
    });
  };

  const updatePartyA = (patch: Partial<DossierCommon['partyA']>) => {
    updateDossier({
      common: {
        ...dossier.common,
        partyA: { ...dossier.common.partyA, ...patch },
      },
    });
  };

  const updatePartyB = (patch: Partial<DossierCommon['partyB']>) => {
    updateDossier({
      common: {
        ...dossier.common,
        partyB: { ...dossier.common.partyB, ...patch },
      },
    });
  };

  const updateDocField = (field: keyof DossierDocData, value: any) => {
    updateDossier({
      docs: {
        ...dossier.docs,
        [activeType]: {
          ...(dossier.docs[activeType] || {}),
          [field]: value,
        },
      },
    });
  };

  // Direct custom text modification
  const handleCustomTextChange = (key: string, text: string) => {
    updateDossier({
      customTexts: {
        ...(dossier.customTexts || {}),
        [`${activeType}_${key}`]: text,
      },
    });
  };

  const getCustomText = (key: string, defaultText: string) => {
    return dossier.customTexts?.[`${activeType}_${key}`] ?? defaultText;
  };

  // Save dossier to quote officially
  const handleSaveToQuote = () => {
    updateCurrentQuote({ dossier });
    saveQuote();
    showToast(`Đã lưu thành công bộ hồ sơ kinh tế vào báo giá số ${currentQuote.no || ''}!`);
  };

  // Sync from quote
  const syncFromQuote = () => {
    updateDossier({
      common: {
        ...dossier.common,
        contractNo: currentQuote.no || dossier.common.contractNo,
        contractDate: currentQuote.date || dossier.common.contractDate,
        project: currentQuote.project || dossier.common.project,
        workTitle: currentQuote.project || dossier.common.workTitle,
        partyA: {
          ...dossier.common.partyA,
          name: currentQuote.company || currentQuote.customer || dossier.common.partyA.name,
          rep: currentQuote.customer || dossier.common.partyA.rep,
          address: currentQuote.address || dossier.common.partyA.address,
          phone: currentQuote.phone || dossier.common.partyA.phone,
        },
        partyB: {
          ...dossier.common.partyB,
          name: company.name || dossier.common.partyB.name,
          rep: currentQuote.creator || dossier.common.partyB.rep,
          address: company.address || dossier.common.partyB.address,
          phone: company.phone || dossier.common.partyB.phone,
          tax: company.tax || dossier.common.partyB.tax,
          bank: company.bank || dossier.common.partyB.bank,
        },
      },
    });
    showToast('Đã đồng bộ lại thông tin dự án từ báo giá.');
  };

  // Reset custom texts to system defaults
  const handleResetDocument = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục nội dung văn bản này về mẫu quy chuẩn ban đầu?')) {
      const nextCustom = { ...(dossier.customTexts || {}) };
      Object.keys(nextCustom).forEach((k) => {
        if (k.startsWith(`${activeType}_`)) delete nextCustom[k];
      });
      updateDossier({ customTexts: nextCustom });
      showToast('Đã khôi phục nội dung văn bản về mẫu chuẩn.');
    }
  };

  // High quality print
  const handlePrint = () => {
    window.print();
  };

  // Export Word single dossier document
  const handleExportWord = async () => {
    if (!previewRef.current) return;
    try {
      const currentDoc = DOSSIER_TYPES.find((d) => d.id === activeType)?.name || 'Hồ sơ';
      const filename = `${DOSSIER_TYPES.find((d) => d.id === activeType)?.code || 'HS'}_${dossier.common.contractNo || 'QuotePro'}`.replace(
        /[^\w\-]+/g,
        '_'
      );
      await exportDossierDocToWord(currentDoc, previewRef.current.innerHTML, filename);
      showToast(`Đã xuất thành công ${currentDoc} sang file Word (.docx) chuẩn thể thức.`);
    } catch (e: any) {
      console.error(e);
      showToast('Lỗi xuất Word: ' + (e?.message || e), 'error');
    }
  };

  // Render items table
  const renderDocumentTable = () => {
    const isContract = activeType === 'contract';
    const isDelivery = activeType === 'deliveryReceipt';

    let itemNum = 0;
    return (
      <div className="overflow-x-auto my-3">
        <table className="dossier-table w-full min-w-[580px] border-collapse text-[10pt] font-['Times_New_Roman',serif] border border-black leading-snug">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1.5 w-10">STT</th>
              <th className="border border-black p-1.5 text-left">Tên hàng hóa, quy cách kỹ thuật chi tiết</th>
              <th className="border border-black p-1.5 w-16">ĐVT</th>
              <th className="border border-black p-1.5 w-16">SL</th>
              {isContract && (
                <>
                  <th className="border border-black p-1.5 w-28 text-right">Đơn giá (đ)</th>
                  <th className="border border-black p-1.5 w-32 text-right">Thành tiền (đ)</th>
                </>
              )}
              {isDelivery && <th className="border border-black p-1.5 w-32">Tình trạng thực tế</th>}
              {!isContract && !isDelivery && (
                <>
                  <th className="border border-black p-1.5 w-28">Kết luận</th>
                  <th className="border border-black p-1.5 w-28">Ghi chú</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {(currentQuote.rows || []).map((r) => {
              if (r.type === 'heading') {
                return (
                  <tr key={r.id} className="font-bold bg-slate-50 break-inside-avoid">
                    <td colSpan={isContract ? 6 : isDelivery ? 5 : 6} className="border border-black p-1.5 uppercase">
                      {r.title}
                    </td>
                  </tr>
                );
              }
              if (r.type === 'subheading') {
                return (
                  <tr key={r.id} className="font-bold italic break-inside-avoid">
                    <td colSpan={isContract ? 6 : isDelivery ? 5 : 6} className="border border-black p-1.5">
                      {r.title}
                    </td>
                  </tr>
                );
              }
              if (r.type === 'subtotal') {
                return null;
              }

              itemNum++;
              const total = (Number(r.price) || 0) * (Number(r.qty) || 0);

              return (
                <tr key={r.id} className="break-inside-avoid">
                  <td className="border border-black p-1.5 text-center">{itemNum}</td>
                  <td className="border border-black p-1.5 align-top">
                    <div className="font-bold">{r.itemName || r.name}</div>
                    {r.itemName && r.name && r.name !== r.itemName && (
                      <div className="text-[9pt] text-slate-700 mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {r.name}
                      </div>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center align-top">{r.unit || 'cái'}</td>
                  <td className="border border-black p-1.5 text-center align-top">{formatDecimalInput(r.qty)}</td>
                  {isContract && (
                    <>
                      <td className="border border-black p-1.5 text-right align-top">{moneyPlain(r.price)}</td>
                      <td className="border border-black p-1.5 text-right align-top font-bold">{moneyPlain(total)}</td>
                    </>
                  )}
                  {isDelivery && (
                    <td className="border border-black p-1.5 text-center align-top text-[9pt]">
                      Mới 100%, nguyên đai nguyên kiện, kèm CO/CQ
                    </td>
                  )}
                  {!isContract && !isDelivery && (
                    <>
                      <td className="border border-black p-1.5 text-center align-top font-semibold text-emerald-800">
                        Đạt yêu cầu kỹ thuật
                      </td>
                      <td className="border border-black p-1.5 text-center align-top text-[9pt]">
                        Mới 100%, đồng bộ
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const activeDocMeta = DOSSIER_TYPES.find((d) => d.id === activeType) || DOSSIER_TYPES[0];

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* 1. Header Toolbar (Responsive PC/Tablet/Phone) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 shadow-inner">
              <FolderArchive className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base sm:text-lg text-slate-800">
                  Bộ hồ sơ kinh tế &amp; Nghiệm thu thanh lý
                </h2>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Nghị định 30/2020/NĐ-CP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đầy đủ 7 loại văn bản chuẩn pháp lý: Hợp đồng, Giao nhận, Bàn giao, Nghiệm thu, Thanh lý &amp; Đề nghị TT.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveToQuote}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm min-h-[38px]"
              title="Lưu toàn bộ chỉnh sửa hồ sơ này cùng với báo giá hiện tại"
            >
              <Save className="w-4 h-4" />
              <span className="hidden xs:inline">Lưu hồ sơ vào báo giá</span>
              <span className="xs:hidden">Lưu</span>
            </button>

            <button
              type="button"
              onClick={syncFromQuote}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 min-h-[38px]"
              title="Đồng bộ lại thông tin dự án, đơn giá và đối tác từ báo giá"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Đồng bộ từ báo giá</span>
              <span className="sm:hidden">Đồng bộ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs min-h-[38px]"
              title="In trực tiếp hồ sơ đang chọn ra giấy hoặc xuất file PDF chuẩn A4"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">In hồ sơ (A4)</span>
              <span className="xs:hidden">In A4</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs min-h-[38px]"
              title="Xuất hồ sơ này ra file Word (.docx) chuẩn thể thức"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Xuất Word (.docx)</span>
              <span className="xs:hidden">Word</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Document Selection Tabs (Responsive horizontal slider on phone) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2 sm:p-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {DOSSIER_TYPES.map((d, index) => {
            const isActive = activeType === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveType(d.id)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 shrink-0 min-h-[40px] ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{d.name}</span>
                <span className="sm:hidden">{d.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Common Project Data Card (Collapsible) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setCommonExpanded(!commonExpanded)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2.5">
            <Building className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-800">
              Dữ liệu pháp nhân &amp; Dự án (Bên A, Bên B, Địa điểm, Hợp đồng)
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>{commonExpanded ? 'Thu gọn' : 'Chỉnh sửa pháp nhân'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                commonExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {commonExpanded && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Số hợp đồng
                </label>
                <input
                  type="text"
                  value={dossier.common.contractNo}
                  onChange={(e) => updateCommonField('contractNo', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Ngày hợp đồng
                </label>
                <input
                  type="date"
                  value={dossier.common.contractDate}
                  onChange={(e) => updateCommonField('contractDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Tên công trình / Hạng mục thực hiện
                </label>
                <input
                  type="text"
                  value={dossier.common.workTitle}
                  onChange={(e) => updateCommonField('workTitle', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Địa điểm thực hiện
                </label>
                <input
                  type="text"
                  value={dossier.common.location}
                  onChange={(e) => updateCommonField('location', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Thời gian thực hiện
                </label>
                <input
                  type="text"
                  value={dossier.common.executionPeriod}
                  onChange={(e) => updateCommonField('executionPeriod', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Thời hạn bảo hành
                </label>
                <input
                  type="text"
                  value={dossier.common.warranty}
                  onChange={(e) => updateCommonField('warranty', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Parties info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              {/* Party A */}
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-xs text-blue-900 uppercase flex items-center justify-between">
                  <span>Bên A – Bên giao thầu (Chủ đầu tư / Khách hàng)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tên đơn vị</label>
                    <input
                      type="text"
                      value={dossier.common.partyA.name}
                      onChange={(e) => updatePartyA({ name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Người đại diện</label>
                    <input
                      type="text"
                      value={dossier.common.partyA.rep}
                      onChange={(e) => updatePartyA({ rep: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Chức vụ</label>
                    <input
                      type="text"
                      value={dossier.common.partyA.title}
                      onChange={(e) => updatePartyA({ title: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Địa chỉ trụ sở</label>
                    <input
                      type="text"
                      value={dossier.common.partyA.address}
                      onChange={(e) => updatePartyA({ address: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Số điện thoại</label>
                    <input
                      type="text"
                      value={dossier.common.partyA.phone}
                      onChange={(e) => updatePartyA({ phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Mã số thuế</label>
                    <input
                      type="text"
                      value={dossier.common.partyA.tax}
                      onChange={(e) => updatePartyA({ tax: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Party B */}
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-xs text-emerald-900 uppercase flex items-center justify-between">
                  <span>Bên B – Bên nhận thầu (Nhà thầu / Đơn vị lập)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tên đơn vị</label>
                    <input
                      type="text"
                      value={dossier.common.partyB.name}
                      onChange={(e) => updatePartyB({ name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Người đại diện</label>
                    <input
                      type="text"
                      value={dossier.common.partyB.rep}
                      onChange={(e) => updatePartyB({ rep: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Chức vụ</label>
                    <input
                      type="text"
                      value={dossier.common.partyB.title}
                      onChange={(e) => updatePartyB({ title: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Địa chỉ trụ sở</label>
                    <input
                      type="text"
                      value={dossier.common.partyB.address}
                      onChange={(e) => updatePartyB({ address: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Mã số thuế</label>
                    <input
                      type="text"
                      value={dossier.common.partyB.tax}
                      onChange={(e) => updatePartyB({ tax: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tài khoản ngân hàng</label>
                    <input
                      type="text"
                      value={dossier.common.partyB.bank}
                      onChange={(e) => updatePartyB({ bank: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Action bar with Mode Switch & Inline Edit Toggle */}
      <div className="bg-slate-100/80 p-2 sm:p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === 'preview'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem văn bản A4</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              viewMode === 'form'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Điều chỉnh thông số ({activeDocMeta.short})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {viewMode === 'preview' && (
            <>
              {/* Zoom Controls */}
              <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(45, prev - 15))}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(100)}
                  className="px-1.5 sm:px-2 py-1 font-mono text-[11px] font-bold hover:text-slate-900 transition"
                  title="Về tỷ lệ chuẩn 100%"
                >
                  {zoomScale}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(150, prev + 15))}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Edit Toggle */}
              <button
                type="button"
                onClick={() => setIsInlineEditing(!isInlineEditing)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                  isInlineEditing
                    ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Cho phép nhấp chuột sửa trực tiếp câu từ ngay trên trang A4"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden xs:inline">{isInlineEditing ? 'Đang sửa trực tiếp' : 'Sửa trực tiếp trên A4'}</span>
                <span className="xs:hidden">{isInlineEditing ? 'Đang sửa' : 'Sửa A4'}</span>
              </button>

              {/* Reset text */}
              <button
                type="button"
                onClick={handleResetDocument}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200 transition"
                title="Khôi phục câu từ về mẫu chuẩn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5. Document Specific Form Mode */}
      {viewMode === 'form' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-slate-800">
              Tùy chỉnh thông số văn bản: {activeDocMeta.name}
            </h3>
            <p className="text-xs text-slate-500">
              Các thông số tại đây sẽ tự động liên kết và điền vào các vị trí tương ứng trong biểu mẫu A4.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Số văn bản / Số biên bản
              </label>
              <input
                type="text"
                value={currentDocData.no || ''}
                onChange={(e) => updateDocField('no', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Ngày lập văn bản
              </label>
              <input
                type="date"
                value={currentDocData.date || dossier.common.contractDate}
                onChange={(e) => updateDocField('date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Địa điểm lập
              </label>
              <input
                type="text"
                value={currentDocData.location || dossier.common.location}
                onChange={(e) => updateDocField('location', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none text-slate-800"
              />
            </div>

            {activeType === 'contract' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Tỷ lệ tạm ứng đợt 1 (%)
                  </label>
                  <input
                    type="number"
                    value={currentDocData.advanceRate ?? 30}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const adv = Math.round((grandTotal * rate) / 100);
                      updateDocField('advanceRate', rate);
                      updateDocField('advanceAmount', adv);
                      updateDocField('remainingAmount', grandTotal - adv);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Thời hạn thanh toán sau nghiệm thu (ngày)
                  </label>
                  <input
                    type="text"
                    value={currentDocData.paymentDays || '05'}
                    onChange={(e) => updateDocField('paymentDays', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none font-bold"
                  />
                </div>
              </>
            )}

            {(activeType === 'liquidation' || activeType === 'paymentRequest') && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Số tiền Bên A đã tạm ứng (đ)
                  </label>
                  <input
                    type="number"
                    value={currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updateDocField('advanceAmount', val);
                      updateDocField('remainingAmount', Math.max(0, grandTotal - val));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Số tiền còn lại phải thanh toán (đ)
                  </label>
                  <input
                    type="number"
                    value={currentDocData.remainingAmount ?? (grandTotal - (currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100)))}
                    onChange={(e) => updateDocField('remainingAmount', Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none font-bold text-emerald-800"
                  />
                </div>

                {activeType === 'paymentRequest' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Số Hóa đơn GTGT
                      </label>
                      <input
                        type="text"
                        value={currentDocData.invoiceNo || '0000123'}
                        onChange={(e) => updateDocField('invoiceNo', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Ngày hóa đơn GTGT
                      </label>
                      <input
                        type="date"
                        value={currentDocData.invoiceDate || dossier.common.contractDate}
                        onChange={(e) => updateDocField('invoiceDate', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none text-slate-800"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {(activeType === 'deliveryReceipt' || activeType === 'handover' || activeType === 'installAcceptance' || activeType === 'completionAcceptance') && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Người giao hàng / Kỹ thuật Bên B
                  </label>
                  <input
                    type="text"
                    value={currentDocData.senderName || dossier.common.partyB.rep}
                    onChange={(e) => updateDocField('senderName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Người nhận hàng / Kỹ thuật Bên A
                  </label>
                  <input
                    type="text"
                    value={currentDocData.receiverName || dossier.common.partyA.rep}
                    onChange={(e) => updateDocField('receiverName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none text-slate-800 font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Đánh giá &amp; Kết luận nghiệm thu
                  </label>
                  <input
                    type="text"
                    value={currentDocData.conclusion || 'Đạt yêu cầu kỹ thuật theo hồ sơ thiết kế, thiết bị vận hành ổn định và an toàn.'}
                    onChange={(e) => updateDocField('conclusion', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none text-slate-800 font-medium"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setViewMode('preview');
                showToast('Đã áp dụng các thông số vào biểu mẫu A4.');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Áp dụng và xem văn bản A4</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Live Administrative Document Preview (Realistic A4 Sheet) */}
      <div className="w-full overflow-auto flex justify-center py-2 sm:py-4 bg-slate-100/60 rounded-2xl p-2 sm:p-4">
        <div
          ref={previewRef}
          id="dossier-print-root"
          style={{
            transform: zoomScale === 100 ? 'none' : `scale(${zoomScale / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: '210mm',
            minWidth: '680px',
          }}
          className="bg-white text-slate-900 shadow-2xl p-6 sm:p-12 md:p-14 rounded-xs border border-slate-300/80 font-['Times_New_Roman',serif] text-[13pt] leading-[1.4] my-2 transition-all"
        >
          {/* Header Quốc hiệu - Tiêu ngữ & Đơn vị theo chuẩn Nghị định 30/2020/NĐ-CP */}
          <div className="grid grid-cols-2 gap-4 items-start mb-6 text-center">
            <div>
              <div
                contentEditable={isInlineEditing}
                suppressContentEditableWarning
                onBlur={(e) => handleCustomTextChange('partyB_name', e.currentTarget.innerText)}
                className={`font-bold text-[11.5pt] uppercase tracking-tight ${isInlineEditing ? 'outline-dashed outline-amber-400 p-0.5' : ''}`}
              >
                {getCustomText('partyB_name', dossier.common.partyB.name || company.name || 'CÔNG TY TNHH TƯ VẤN – ĐẦU TƯ MÔI TRƯỜNG D-V-N')}
              </div>
              <div className="w-24 h-[1px] bg-black mx-auto my-1.5" />
              <div className="text-[11pt]">
                Số: {currentDocData.no || `${activeDocMeta.code}/${dossier.common.contractNo}`}
              </div>
            </div>

            <div>
              <div className="font-bold text-[11.5pt] uppercase whitespace-nowrap">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="font-bold text-[12.5pt]">Độc lập - Tự do - Hạnh phúc</div>
              <div className="w-32 h-[1px] bg-black mx-auto my-1.5" />
              <div className="italic text-[11.5pt] mt-1">
                {dossier.common.location && `${dossier.common.location}, `}
                {dossierDateVN(currentDocData.date || dossier.common.contractDate)}
              </div>
            </div>
          </div>

          {/* DOCUMENT 1: HỢP ĐỒNG KINH TẾ */}
          {activeType === 'contract' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  HỢP ĐỒNG KINH TẾ
                </h1>
                <div className="dossier-doc-subtitle text-[13pt] font-bold italic mt-1 border-b border-black pb-1.5 inline-block">
                  V/v: {dossier.common.workTitle || dossier.common.project}
                </div>
              </div>

              <div className="space-y-2 text-justify">
                <div
                  contentEditable={isInlineEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCustomTextChange('contract_basis', e.currentTarget.innerText)}
                  className={`space-y-1 ${isInlineEditing ? 'outline-dashed outline-amber-400 p-1 rounded' : ''}`}
                >
                  <p>- Căn cứ Bộ Luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015 của Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam;</p>
                  <p>- Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14 tháng 06 năm 2005 của Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam;</p>
                  <p>- Căn cứ vào Bảng báo giá đã được Bên A phê duyệt và chấp thuận ký hợp đồng;</p>
                  <p>- Căn cứ vào nhu cầu thực tế của Bên A và năng lực đáp ứng của Bên B.</p>
                </div>

                <p className="pt-2">
                  Hôm nay, {dossierDateVN(dossier.common.contractDate)}, tại {dossier.common.location}, hai bên chúng tôi gồm có:
                </p>

                {/* Parties */}
                <div className="dossier-party space-y-1.5 my-3">
                  <div className="font-bold uppercase">1. ĐẠI DIỆN BÊN GIAO THẦU (BÊN A):</div>
                  <div>- Tên đơn vị: <strong>{dossier.common.partyA.name}</strong></div>
                  <div>- Người đại diện: <strong>{dossier.common.partyA.rep}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {dossier.common.partyA.title}</div>
                  <div>- Địa chỉ trụ sở: {dossier.common.partyA.address}</div>
                  <div>- Số điện thoại: {dossier.common.partyA.phone || '—'} &nbsp;&nbsp;&nbsp;&nbsp; Mã số thuế: {dossier.common.partyA.tax || '—'}</div>
                </div>

                <div className="dossier-party space-y-1.5 my-3">
                  <div className="font-bold uppercase">2. ĐẠI DIỆN BÊN NHẬN THẦU (BÊN B):</div>
                  <div>- Tên đơn vị: <strong>{dossier.common.partyB.name}</strong></div>
                  <div>- Người đại diện: <strong>{dossier.common.partyB.rep}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {dossier.common.partyB.title}</div>
                  <div>- Địa chỉ trụ sở: {dossier.common.partyB.address}</div>
                  <div>- Số điện thoại: {dossier.common.partyB.phone} &nbsp;&nbsp;&nbsp;&nbsp; Mã số thuế: {dossier.common.partyB.tax}</div>
                  <div>- Tài khoản ngân hàng: {dossier.common.partyB.bank}</div>
                </div>

                <p className="pt-2">
                  Hai bên cùng nhau bàn bạc và thống nhất ký kết hợp đồng kinh tế với các điều khoản cụ thể sau đây:
                </p>

                {/* Article 1 */}
                <div className="font-bold pt-2">Điều 1. Nội dung công việc và danh mục thiết bị</div>
                <p>
                  Bên B nhận thực hiện công việc {dossier.common.workTitle || dossier.common.project} cho Bên A theo chi tiết khối lượng, quy cách và đơn giá như sau:
                </p>

                {renderDocumentTable()}

                <div className="font-bold my-2 text-right">
                  Tổng giá trị thanh toán: {money(grandTotal)} (Đã bao gồm thuế GTGT {formatDecimalInput(currentQuote.vat)}%)
                </div>
                <div className="italic mb-3">
                  (Bằng chữ: {numberToVietnameseWords(grandTotal)})
                </div>

                {/* Article 2 */}
                <div className="font-bold pt-2">Điều 2. Giá trị hợp đồng và Phương thức thanh toán</div>
                <p>
                  - Tổng giá trị hợp đồng trọn gói là: <strong>{money(grandTotal)}</strong> đồng (Bằng chữ: {numberToVietnameseWords(grandTotal)}). Giá trên đã bao gồm thuế GTGT, chi phí vận chuyển, lắp đặt, bảo hành và các chi phí liên quan.
                </p>
                <p>- Phương thức thanh toán: Chuyển khoản vào tài khoản ngân hàng của Bên B.</p>
                <p>
                  - Tiến độ thanh toán:
                  <br />+ Đợt 1: Bên A tạm ứng {currentDocData.advanceRate ?? 30}% giá trị hợp đồng, tương đương <strong>{money(currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100))}</strong> đồng ngay sau khi ký hợp đồng để Bên B chuẩn bị vật tư thiết bị.
                  <br />+ Đợt 2: Bên A thanh toán {100 - (currentDocData.advanceRate ?? 30)}% giá trị còn lại, tương đương <strong>{money(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))}</strong> đồng trong vòng {currentDocData.paymentDays || '05'} ngày làm việc kể từ ngày ký Biên bản nghiệm thu hoàn thành đưa vào sử dụng và nhận đầy đủ hóa đơn GTGT hợp lệ.
                </p>

                {/* Article 3 */}
                <div className="font-bold pt-2">Điều 3. Thời gian, tiến độ và địa điểm thực hiện</div>
                <p>- Thời gian thi công, thực hiện: {dossier.common.executionPeriod}.</p>
                <p>- Địa điểm bàn giao và lắp đặt: {dossier.common.location}.</p>
                <p>- Thời hạn bảo hành: {dossier.common.warranty}.</p>

                {/* Article 4 */}
                <div className="font-bold pt-2">Điều 4. Tiêu chuẩn kỹ thuật và nghiệm thu bàn giao</div>
                <p>
                  - Hàng hóa, thiết bị cung cấp mới 100%, đúng nhãn hiệu, chủng loại và các thông số kỹ thuật đã cam kết, có đầy đủ chứng chỉ chất lượng xuất xưởng CO/CQ (nếu có).
                </p>
                <p>
                  - Sau khi hoàn thành lắp đặt, hai bên sẽ tiến hành chạy thử liên động và ký Biên bản nghiệm thu hoàn thành đưa vào sử dụng chính thức.
                </p>

                {/* Article 5 */}
                <div className="font-bold pt-2">Điều 5. Quyền và nghĩa vụ của các bên</div>
                <p>
                  - <strong>Quyền và nghĩa vụ của Bên A:</strong> Bàn giao mặt bằng thi công, cung cấp nguồn điện nước phục vụ thi công chạy thử; cử cán bộ giám sát và nghiệm thu; thực hiện thanh toán đúng tiến độ đã thỏa thuận.
                </p>
                <p>
                  - <strong>Quyền và nghĩa vụ của Bên B:</strong> Cung cấp thiết bị, vật tư đúng chủng loại và tiến độ; thi công đảm bảo an toàn lao động và vệ sinh môi trường; xuất hóa đơn tài chính hợp lệ cho Bên A; chịu trách nhiệm bảo hành thiết bị theo đúng cam kết.
                </p>

                {/* Article 6 */}
                <div className="font-bold pt-2">Điều 6. Điều khoản thi hành</div>
                <p>
                  - Hai bên cam kết thực hiện nghiêm túc mọi điều khoản đã thỏa thuận trong hợp đồng. Mọi sửa đổi, bổ sung phải được lập thành văn bản hoặc phụ lục hợp đồng.
                </p>
                <p>
                  - Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành {Number(dossier.common.copiesA || 2) + Number(dossier.common.copiesB || 2)} bản, Bên A giữ {dossier.common.copiesA || '02'} bản, Bên B giữ {dossier.common.copiesB || '02'} bản có giá trị pháp lý như nhau./.
                </p>
              </div>

              {/* Signatures */}
              <div className="dossier-sign-grid grid grid-cols-2 gap-8 text-center mt-8 pt-4 break-inside-avoid">
                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
                  <div className="italic text-[11pt]">{dossier.common.partyB.title || 'Giám đốc'}</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyB.rep}</div>
                </div>

                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                  <div className="italic text-[11pt]">{dossier.common.partyA.title || 'Giám đốc'}</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyA.rep}</div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 2: BIÊN BẢN GIAO NHẬN THIẾT BỊ VÀ VẬT TƯ */}
          {activeType === 'deliveryReceipt' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  BIÊN BẢN GIAO NHẬN THIẾT BỊ VÀ VẬT TƯ
                </h1>
                <div className="dossier-doc-subtitle text-[12.5pt] font-bold italic mt-1">
                  Căn cứ Hợp đồng kinh tế số: {dossier.common.contractNo} ngày {formatDateVN(dossier.common.contractDate)}
                </div>
              </div>

              <div className="space-y-2 text-justify">
                <p>
                  Hôm nay, vào lúc {currentDocData.handoverTime || '09 giờ 00 phút'} ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)}, tại {currentDocData.location || dossier.common.location}.
                </p>
                <p>Chúng tôi gồm các đại diện có mặt dưới đây:</p>

                <div className="my-2 space-y-1">
                  <p><strong>1. ĐẠI DIỆN BÊN GIAO (BÊN B):</strong> {dossier.common.partyB.name}</p>
                  <p className="pl-4">- Ông/Bà: <strong>{currentDocData.senderName || dossier.common.partyB.rep}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {dossier.common.partyB.title || 'Kỹ thuật viên'}</p>
                  <p><strong>2. ĐẠI DIỆN BÊN NHẬN (BÊN A):</strong> {dossier.common.partyA.name}</p>
                  <p className="pl-4">- Ông/Bà: <strong>{currentDocData.receiverName || dossier.common.partyA.rep}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {dossier.common.partyA.title || 'Thủ kho / Phụ trách'}</p>
                </div>

                <p>Hai bên tiến hành kiểm đếm và giao nhận số lượng thiết bị, hàng hóa phục vụ thi công công trình theo bảng kê chi tiết dưới đây:</p>

                {renderDocumentTable()}

                <div className="font-bold pt-2">Ý kiến nhận xét &amp; Đánh giá ngoại quan:</div>
                <p>
                  - Toàn bộ thiết bị, vật tư được giao nhận đầy đủ về chủng loại và số lượng theo hợp đồng.
                  <br />- Tình trạng hàng hóa: Mới 100%, nguyên đai nguyên kiện, không bị móp méo, trầy xước hay rách hỏng tem niêm phong.
                  <br />- Kèm theo: Đầy đủ chứng chỉ CO/CQ và tài liệu hướng dẫn lắp đặt của nhà sản xuất.
                </p>
                <p>
                  Kể từ thời điểm ký biên bản này, Bên A có trách nhiệm quản lý, bảo quản an toàn hàng hóa tại công trình. Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản làm cơ sở thực hiện các bước tiếp theo./.
                </p>
              </div>

              <div className="dossier-sign-grid grid grid-cols-2 gap-8 text-center mt-8 pt-4 break-inside-avoid">
                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN GIAO</div>
                  <div className="italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{currentDocData.senderName || dossier.common.partyB.rep}</div>
                </div>

                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN NHẬN</div>
                  <div className="italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{currentDocData.receiverName || dossier.common.partyA.rep}</div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 3: BIÊN BẢN BÀN GIAO THIẾT BỊ VÀ TÀI LIỆU KỸ THUẬT */}
          {activeType === 'handover' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  BIÊN BẢN BÀN GIAO THIẾT BỊ &amp; HỒ SƠ KỸ THUẬT
                </h1>
                <div className="dossier-doc-subtitle text-[12.5pt] font-bold italic mt-1">
                  Công trình: {dossier.common.workTitle || dossier.common.project}
                </div>
              </div>

              <div className="space-y-2 text-justify">
                <p>- Căn cứ Hợp đồng kinh tế số: {dossier.common.contractNo} ngày {formatDateVN(dossier.common.contractDate)};</p>
                <p>- Căn cứ quá trình vận chuyển và tập kết thiết bị tại hiện trường công trình {dossier.common.location}.</p>

                <p className="pt-2">Hôm nay, ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)}, các bên gồm có:</p>
                <div className="my-2 space-y-1">
                  <p><strong>1. Bên bàn giao (Bên B):</strong> {dossier.common.partyB.name} - Đại diện: <strong>{dossier.common.partyB.rep}</strong> ({dossier.common.partyB.title})</p>
                  <p><strong>2. Bên tiếp nhận (Bên A):</strong> {dossier.common.partyA.name} - Đại diện: <strong>{dossier.common.partyA.rep}</strong> ({dossier.common.partyA.title})</p>
                </div>

                <div className="font-bold pt-2">I. Danh mục thiết bị bàn giao:</div>
                {renderDocumentTable()}

                <div className="font-bold pt-2">II. Hồ sơ và tài liệu kỹ thuật bàn giao kèm theo:</div>
                <p>
                  1. Bản vẽ sơ đồ công nghệ và hướng dẫn đấu nối thiết bị: 01 bộ.
                  <br />2. Catalogue kỹ thuật và hướng dẫn vận hành bảo dưỡng: 01 bộ.
                  <br />3. Phiếu bảo hành chính hãng của nhà sản xuất: Đầy đủ theo thiết bị.
                  <br />4. Chứng nhận chất lượng xuất xưởng CO, CQ: 01 bản sao y.
                </p>

                <div className="font-bold pt-2">III. Kết luận:</div>
                <p>
                  Hai bên thống nhất bàn giao toàn bộ thiết bị và hồ sơ kỹ thuật nêu trên. Thiết bị được tập kết đồng bộ, an toàn tại mặt bằng công trình, sẵn sàng cho công tác lắp đặt và đấu nối kỹ thuật./.
                </p>
              </div>

              <div className="dossier-sign-grid grid grid-cols-2 gap-8 text-center mt-8 pt-4 break-inside-avoid">
                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
                  <div className="italic text-[11pt]">(Ký và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyB.rep}</div>
                </div>

                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                  <div className="italic text-[11pt]">(Ký và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyA.rep}</div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 4: BIÊN BẢN NGHIỆM THU LẮP ĐẶT VÀ CHẠY THỬ THIẾT BỊ */}
          {activeType === 'installAcceptance' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  BIÊN BẢN NGHIỆM THU LẮP ĐẶT &amp; CHẠY THỬ THIẾT BỊ
                </h1>
                <div className="dossier-doc-subtitle text-[12.5pt] font-bold italic mt-1">
                  Hạng mục: {dossier.common.workTitle || dossier.common.project}
                </div>
              </div>

              <div className="space-y-2 text-justify">
                <p>- Căn cứ Hợp đồng kinh tế số: {dossier.common.contractNo} ngày {formatDateVN(dossier.common.contractDate)};</p>
                <p>- Căn cứ hồ sơ thiết kế kỹ thuật và quy chuẩn thi công cơ điện hiện hành;</p>
                <p>- Căn cứ kết quả kiểm tra lắp đặt và chạy thử thực tế tại công trình {dossier.common.location}.</p>

                <p className="pt-2">
                  Thời gian nghiệm thu: Bắt đầu từ {currentDocData.acceptanceTime || '14 giờ 30 phút'} ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)}.
                </p>
                <div className="my-2 space-y-1">
                  <p><strong>1. Đại diện Bên A (Chủ đầu tư / Bên mua):</strong> {dossier.common.partyA.name}</p>
                  <p className="pl-4">- Ông/Bà: <strong>{dossier.common.partyA.rep}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {dossier.common.partyA.title}</p>
                  <p><strong>2. Đại diện Bên B (Đơn vị cung cấp &amp; thi công):</strong> {dossier.common.partyB.name}</p>
                  <p className="pl-4">- Ông/Bà: <strong>{dossier.common.partyB.rep}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {dossier.common.partyB.title}</p>
                </div>

                <div className="font-bold pt-2">I. Nội dung kiểm tra và nghiệm thu công tác lắp đặt:</div>
                <p>
                  1. Kiểm tra vị trí lắp đặt, kết cấu giá đỡ, bệ máy và liên kết cơ khí: Đúng vị trí thiết kế, chắc chắn.
                  <br />2. Kiểm tra đấu nối đường ống công nghệ và hệ thống điện động lực/điều khiển: Kín khít, an toàn, có hệ thống tiếp địa chống giật.
                  <br />3. Chạy thử không tải và chạy thử có tải liên tục: Thiết bị vận hành ổn định, độ ồn và độ rung nằm trong giới hạn tiêu chuẩn cho phép.
                </p>

                <div className="font-bold pt-2">II. Danh mục thiết bị được nghiệm thu lắp đặt:</div>
                {renderDocumentTable()}

                <div className="font-bold pt-2">III. Đánh giá chất lượng và Kết luận:</div>
                <p>
                  - Đánh giá: Công tác cung cấp và lắp đặt thiết bị được thực hiện đúng quy trình kỹ thuật, đạt yêu cầu thẩm mỹ và an toàn vận hành.
                  <br />- Kết luận: {currentDocData.conclusion || 'Hai bên thống nhất nghiệm thu công tác lắp đặt và chạy thử thiết bị, đồng ý cho phép chuyển sang giai đoạn vận hành liên động thử nghiệm và nghiệm thu hoàn thành đưa vào sử dụng chính thức./.'}
                </p>
              </div>

              <div className="dossier-sign-grid grid grid-cols-2 gap-8 text-center mt-8 pt-4 break-inside-avoid">
                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
                  <div className="italic text-[11pt]">(Ký và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyB.rep}</div>
                </div>

                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                  <div className="italic text-[11pt]">(Ký và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyA.rep}</div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 5: BIÊN BẢN NGHIỆM THU HOÀN THÀNH ĐƯA VÀO SỬ DỤNG */}
          {activeType === 'completionAcceptance' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  BIÊN BẢN NGHIỆM THU HOÀN THÀNH ĐƯA VÀO SỬ DỤNG
                </h1>
                <div className="dossier-doc-subtitle text-[12.5pt] font-bold italic mt-1">
                  Công trình / Dự án: {dossier.common.workTitle || dossier.common.project}
                </div>
              </div>

              <div className="space-y-2 text-justify">
                <p>- Căn cứ Hợp đồng kinh tế số: {dossier.common.contractNo} ngày {formatDateVN(dossier.common.contractDate)};</p>
                <p>- Căn cứ Biên bản nghiệm thu lắp đặt và chạy thử thiết bị ngày {formatDateVN(dossier.common.contractDate)};</p>
                <p>- Căn cứ kết quả vận hành ổn định và đạt tiêu chuẩn chất lượng tại công trình {dossier.common.location}.</p>

                <p className="pt-2">Hôm nay, ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)}, tại công trình. Chúng tôi gồm có:</p>
                <div className="my-2 space-y-1">
                  <p><strong>1. Đại diện Bên A (Chủ đầu tư):</strong> {dossier.common.partyA.name} - Đại diện: <strong>{dossier.common.partyA.rep}</strong> ({dossier.common.partyA.title})</p>
                  <p><strong>2. Đại diện Bên B (Đơn vị thi công):</strong> {dossier.common.partyB.name} - Đại diện: <strong>{dossier.common.partyB.rep}</strong> ({dossier.common.partyB.title})</p>
                </div>

                <div className="font-bold pt-2">I. Đánh giá công việc hoàn thành:</div>
                <p>
                  1. Về khối lượng: Bên B đã hoàn thành 100% khối lượng công việc, cung cấp và lắp đặt đầy đủ toàn bộ thiết bị theo Hợp đồng số {dossier.common.contractNo}.
                  <br />2. Về chất lượng: Toàn bộ hệ thống máy móc thiết bị vận hành êm, đạt đầy đủ các thông số công suất và kỹ thuật cam kết, đảm bảo an toàn lao động và vệ sinh môi trường.
                  <br />3. Về hồ sơ tài liệu: Bên B đã bàn giao đầy đủ chứng từ xuất xưởng, hướng dẫn vận hành và phiếu bảo hành chính hãng cho Bên A.
                </p>

                <div className="font-bold pt-2">II. Chi tiết danh mục thiết bị hoàn thành bàn giao:</div>
                {renderDocumentTable()}

                <div className="font-bold pt-2">III. Kết luận nghiệm thu bàn giao:</div>
                <p>
                  - Hai bên thống nhất nghiệm thu hoàn thành toàn bộ công việc và chính thức bàn giao công trình/thiết bị cho Bên A đưa vào khai thác sử dụng kể từ ngày ký biên bản này.
                  <br />- Thời hạn bảo hành: {dossier.common.warranty}, bắt đầu tính từ ngày ký biên bản nghiệm thu hoàn thành này.
                  <br />- Biên bản này là căn cứ pháp lý để hai bên tiến hành thanh lý hợp đồng và quyết toán tài chính./.
                </p>
              </div>

              <div className="dossier-sign-grid grid grid-cols-2 gap-8 text-center mt-8 pt-4 break-inside-avoid">
                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
                  <div className="italic text-[11pt]">(Ký tên và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyB.rep}</div>
                </div>

                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                  <div className="italic text-[11pt]">(Ký tên và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyA.rep}</div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 6: BIÊN BẢN THANH LÝ HỢP ĐỒNG KINH TẾ */}
          {activeType === 'liquidation' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  BIÊN BẢN THANH LÝ HỢP ĐỒNG KINH TẾ
                </h1>
                <div className="dossier-doc-subtitle text-[12.5pt] font-bold italic mt-1">
                  Hợp đồng số: {dossier.common.contractNo} ký ngày {formatDateVN(dossier.common.contractDate)}
                </div>
              </div>

              <div className="space-y-2 text-justify">
                <p>- Căn cứ Hợp đồng kinh tế số: {dossier.common.contractNo} ngày {formatDateVN(dossier.common.contractDate)};</p>
                <p>- Căn cứ Biên bản nghiệm thu hoàn thành đưa vào sử dụng ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)}.</p>

                <p className="pt-2">Hôm nay, ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)}, tại {dossier.common.location}. Hai bên gồm có:</p>
                <div className="my-2 space-y-1">
                  <p><strong>1. Bên A:</strong> {dossier.common.partyA.name} - Đại diện: <strong>{dossier.common.partyA.rep}</strong> ({dossier.common.partyA.title})</p>
                  <p><strong>2. Bên B:</strong> {dossier.common.partyB.name} - Đại diện: <strong>{dossier.common.partyB.rep}</strong> ({dossier.common.partyB.title})</p>
                </div>

                <p>Hai bên cùng nhau thống nhất ký biên bản thanh lý hợp đồng kinh tế với các nội dung chi tiết sau:</p>

                <div className="font-bold pt-2">Điều 1. Nội dung công việc thực hiện</div>
                <p>
                  Bên B đã hoàn thành toàn bộ công tác cung cấp và lắp đặt thiết bị cho Bên A theo đúng nội dung và yêu cầu kỹ thuật quy định trong Hợp đồng số {dossier.common.contractNo}. Toàn bộ công việc đã được nghiệm thu bàn giao đưa vào sử dụng.
                </p>

                <div className="font-bold pt-2">Điều 2. Quyết toán giá trị hợp đồng</div>
                <div className="pl-4 space-y-1">
                  <p>- Giá trị hợp đồng ký kết ban đầu: <strong>{money(grandTotal)}</strong> đồng.</p>
                  <p>- Giá trị phát sinh tăng / giảm: <strong>0</strong> đồng.</p>
                  <p>- Tổng giá trị nghiệm thu quyết toán: <strong>{money(grandTotal)}</strong> đồng (Đã bao gồm thuế GTGT {formatDecimalInput(currentQuote.vat)}%).</p>
                  <p className="italic pl-2">(Bằng chữ: {numberToVietnameseWords(grandTotal)}).</p>
                  <p>- Số tiền Bên A đã thanh toán tạm ứng: <strong>{money(currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100))}</strong> đồng.</p>
                  <p className="text-emerald-950 font-bold">
                    - Số tiền còn lại Bên A có trách nhiệm thanh toán cho Bên B: <strong>{money(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))}</strong> đồng.
                  </p>
                  <p className="italic pl-2">(Bằng chữ: {numberToVietnameseWords(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))}).</p>
                </div>

                <div className="font-bold pt-2">Điều 3. Phương thức và thời hạn thanh toán số tiền còn lại</div>
                <p>
                  Bên A có trách nhiệm thanh toán dứt điểm số tiền còn lại là <strong>{money(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))}</strong> đồng bằng hình thức chuyển khoản vào tài khoản ngân hàng của Bên B trong vòng {currentDocData.paymentDays || '05'} ngày làm việc kể từ ngày ký biên bản thanh lý này và nhận hóa đơn tài chính hợp lệ.
                </p>

                <div className="font-bold pt-2">Điều 4. Trách nhiệm bảo hành sau thanh lý</div>
                <p>
                  Sau khi thanh lý hợp đồng, nghĩa vụ bảo hành của Bên B đối với toàn bộ thiết bị vẫn tiếp tục có hiệu lực theo thời hạn {dossier.common.warranty} được quy định tại Hợp đồng kinh tế số {dossier.common.contractNo}.
                </p>

                <div className="font-bold pt-2">Điều 5. Hiệu lực thanh lý</div>
                <p>
                  Hai bên xác nhận không còn bất kỳ tranh chấp, khiếu nại nào liên quan đến Hợp đồng số {dossier.common.contractNo}. Ngay sau khi Bên A hoàn tất nghĩa vụ thanh toán dứt điểm số tiền nêu tại Điều 2, Hợp đồng kinh tế số {dossier.common.contractNo} chính thức hết hiệu lực pháp lý./.
                </p>
              </div>

              <div className="dossier-sign-grid grid grid-cols-2 gap-8 text-center mt-8 pt-4 break-inside-avoid">
                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
                  <div className="italic text-[11pt]">(Ký tên và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyB.rep}</div>
                </div>

                <div className="dossier-sign">
                  <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                  <div className="italic text-[11pt]">(Ký tên và đóng dấu)</div>
                  <div className="space h-20" />
                  <div className="font-bold">{dossier.common.partyA.rep}</div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT 7: GIẤY ĐỀ NGHỊ THANH TOÁN */}
          {activeType === 'paymentRequest' && (
            <div>
              <div className="text-center my-6">
                <h1 className="dossier-doc-title text-[16pt] font-bold uppercase tracking-tight">
                  GIẤY ĐỀ NGHỊ THANH TOÁN
                </h1>
                <div className="dossier-doc-subtitle text-[12.5pt] font-bold italic mt-1">
                  V/v: Quyết toán Hợp đồng kinh tế số {dossier.common.contractNo}
                </div>
              </div>

              <div className="space-y-3 text-justify">
                <p>
                  <strong>Kính gửi:</strong> Ban Giám đốc và Bộ phận Kế toán – Tài chính của <strong>{dossier.common.partyA.name}</strong>
                </p>

                <p>- Căn cứ Hợp đồng kinh tế số: {dossier.common.contractNo} ký ngày {formatDateVN(dossier.common.contractDate)};</p>
                <p>- Căn cứ Biên bản nghiệm thu hoàn thành đưa vào sử dụng ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)};</p>
                <p>- Căn cứ Biên bản thanh lý hợp đồng ngày {formatDateVN(currentDocData.date || dossier.common.contractDate)};</p>
                <p>- Căn cứ Hóa đơn GTGT số {currentDocData.invoiceNo || '0000123'} ngày {formatDateVN(currentDocData.invoiceDate || dossier.common.contractDate)} do {dossier.common.partyB.name} phát hành.</p>

                <p className="pt-1">
                  Đến nay, Công ty chúng tôi ({dossier.common.partyB.name}) đã hoàn thành toàn bộ khối lượng công tác cung cấp, lắp đặt và bàn giao hệ thống thuộc dự án <em>{dossier.common.workTitle || dossier.common.project}</em>.
                </p>

                <p>
                  Kính đề nghị Quý Công ty xem xét và giải ngân thanh toán số tiền quyết toán còn lại của hợp đồng cho chúng tôi theo bảng kê chi tiết sau:
                </p>

                <div className="pl-4 space-y-1 my-2">
                  <p>1. Tổng giá trị nghiệm thu quyết toán hợp đồng: <strong>{money(grandTotal)}</strong> đồng.</p>
                  <p>2. Số tiền Quý Công ty đã thanh toán tạm ứng đợt 1: <strong>{money(currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100))}</strong> đồng.</p>
                  <p className="font-bold text-emerald-950 text-[14pt]">
                    3. Số tiền đề nghị thanh toán đợt này: {money(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))}
                  </p>
                  <p className="italic pl-2 text-[12pt]">
                    (Bằng chữ: {numberToVietnameseWords(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))}).
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-300">
                  <p className="font-bold">Thông tin tài khoản thụ hưởng thanh toán:</p>
                  <div className="pl-4 space-y-0.5">
                    <p>- Tên đơn vị thụ hưởng: <strong>{dossier.common.partyB.name}</strong></p>
                    <p>- Tài khoản số / Ngân hàng: <strong>{dossier.common.partyB.bank}</strong></p>
                    <p>- Mã số thuế: <strong>{dossier.common.partyB.tax}</strong></p>
                  </div>
                </div>

                <p className="pt-1">
                  <em>Hồ sơ gửi kèm: 01 bản chính Biên bản nghiệm thu hoàn thành, 01 bản chính Biên bản thanh lý hợp đồng và 01 bản sao Hóa đơn GTGT.</em>
                </p>
                <p>Kính mong Quý Công ty sớm xem xét và thanh toán đúng hạn. Trân trọng cảm ơn!./.</p>
              </div>

              {/* 3 signatures for payment request according to accounting standards */}
              <div className="grid grid-cols-3 gap-4 text-center mt-8 pt-4 break-inside-avoid">
                <div>
                  <div className="font-bold uppercase text-[11pt]">NGƯỜI ĐỀ NGHỊ</div>
                  <div className="italic text-[10pt]">(Ký, họ tên)</div>
                  <div className="h-20" />
                  <div className="font-bold text-[11.5pt]">{currentDocData.senderName || dossier.common.partyB.rep}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-[11pt]">KẾ TOÁN TRƯỞNG</div>
                  <div className="italic text-[10pt]">(Ký, họ tên)</div>
                  <div className="h-20" />
                  <div className="font-bold text-[11.5pt]">{dossier.common.partyB.rep || '—'}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-[11pt]">GIÁM ĐỐC</div>
                  <div className="italic text-[10pt]">(Ký tên và đóng dấu)</div>
                  <div className="h-20" />
                  <div className="font-bold text-[11.5pt]">{dossier.common.partyB.rep}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
