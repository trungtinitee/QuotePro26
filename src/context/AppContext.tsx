import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CompanyInfo,
  PriceItem,
  Quote,
  QuoteRow,
  TabType,
  ToastMessage,
  DossierState,
} from '../types';
import {
  today,
  parseMoneyInput,
  parseDecimalInput,
  numberToVietnameseWords,
} from '../utils/currency';
import {
  uid,
  createGlobalKey,
  generateUniqueQuoteNo,
  generateUniquePriceCode,
  priceCodePrefixFromCode,
  normalizePriceCode,
} from '../utils/id';
import { exportQuoteToWord, downloadJsonFile } from '../utils/exportWord';
import { formatDetailMultiline } from '../utils/specFormat';

const STORAGE_KEY = 'quotepro_v1';
const PRICE_DRAFT_KEY = STORAGE_KEY + '_price_draft';

const defaultCompany: CompanyInfo = {
  name: 'CÔNG TY TNHH TƯ VẤN – ĐẦU TƯ MÔI TRƯỜNG D-V-N',
  tax: '1402123456',
  phone: '0912 345 678',
  address: 'Số 123 Đường Nguyễn Huệ, Phường 1, TP. Cao Lãnh, Đồng Tháp',
  email: 'moitruongdvn@gmail.com',
  website: 'www.dvn-environment.com.vn',
  bank: 'Vietcombank - STK: 0123456789 - CN Đồng Tháp',
  logo: '',
};

const defaultPrices: PriceItem[] = [
  {
    id: 'p1',
    globalKey: 'gk-dv-001',
    code: 'DV-001',
    name: 'Tư vấn hệ thống xử lý nước thải',
    detail: 'Khảo sát hiện trạng, tư vấn giải pháp công nghệ và lập phương án kỹ thuật chi tiết.',
    unit: 'gói',
    cost: 4000000,
    profitFactor: 1.25,
    price: 5000000,
    group: 'Dịch vụ',
  },
  {
    id: 'p2',
    globalKey: 'gk-tb-001',
    code: 'TB-001',
    name: 'Bơm chìm nước thải công nghiệp',
    detail: 'Bơm chìm thân inox chuyên dụng nước thải axit, kèm phụ kiện khớp nối nhanh tiêu chuẩn.',
    unit: 'cái',
    cost: 6800000,
    profitFactor: 1.25,
    price: 8500000,
    group: 'Thiết bị',
  },
  {
    id: 'p3',
    globalKey: 'gk-vt-001',
    code: 'VT-001',
    name: 'Ống PVC Tiền Phong D60 C2',
    detail: 'Ống nhựa PVC D60 class 2 chịu áp, co lơ phụ kiện đồng bộ theo thực tế lắp đặt.',
    unit: 'm',
    cost: 68000,
    profitFactor: 1.25,
    price: 85000,
    group: 'Vật tư',
  },
  {
    id: 'p4',
    globalKey: 'gk-tb-002',
    code: 'TB-002',
    name: 'Máy thổi khí con sò 2HP',
    detail: 'Máy thổi khí sục khí bề mặt và bể hiếu khí, lưu lượng 2.5 m3/phút, độ ồn thấp.',
    unit: 'bộ',
    cost: 9500000,
    profitFactor: 1.2,
    price: 11400000,
    group: 'Thiết bị',
  },
];

export function createNewQuote(existingQuotes: Quote[] = []): Quote {
  return {
    id: uid(),
    syncKey: createGlobalKey(),
    no: generateUniqueQuoteNo(existingQuotes),
    project: '',
    date: today(),
    validity: '30 ngày',
    creator: 'Nguyễn Văn A',
    customer: 'Công ty Cổ phần Chế biến Thủy sản Miền Tây',
    company: 'Công ty CP CBTS Miền Tây',
    address: 'KCN Sông Hậu, Huyện Châu Thành, Hậu Giang',
    phone: '0293 388 9999',
    vat: 10,
    discountEnabled: false,
    discountType: 'percent',
    discountValue: 0,
    tndnRate: 20,
    otherCosts: 0,
    notes: '1. Đơn giá trên đã bao gồm chi phí vận chuyển đến công trình.\n2. Thời gian giao hàng: trong vòng 10 - 15 ngày kể từ ngày ký hợp đồng.\n3. Thanh toán: tạm ứng 30% khi ký HĐ, 70% còn lại sau khi nghiệm thu và bàn giao.\n4. Bảo hành thiết bị: 12 tháng kể từ ngày ký biên bản bàn giao.',
    rows: [
      {
        id: uid(),
        type: 'heading',
        title: 'A. THIẾT BỊ VÀ VẬT TƯ CHÍNH',
        price: 0,
        qty: 0,
      },
      {
        id: uid(),
        type: 'item',
        priceId: 'p2',
        globalKey: 'gk-tb-001',
        code: 'TB-001',
        itemName: 'Bơm chìm nước thải công nghiệp',
        name: 'Bơm chìm thân inox chuyên dụng nước thải axit, kèm phụ kiện khớp nối nhanh tiêu chuẩn.',
        unit: 'cái',
        qty: 2,
        cost: 6800000,
        profitFactor: 1.25,
        price: 8500000,
        group: 'Thiết bị',
      },
      {
        id: uid(),
        type: 'item',
        priceId: 'p4',
        globalKey: 'gk-tb-002',
        code: 'TB-002',
        itemName: 'Máy thổi khí con sò 2HP',
        name: 'Máy thổi khí sục khí bề mặt và bể hiếu khí, lưu lượng 2.5 m3/phút, độ ồn thấp.',
        unit: 'bộ',
        qty: 1,
        cost: 9500000,
        profitFactor: 1.2,
        price: 11400000,
        group: 'Thiết bị',
      },
      {
        id: uid(),
        type: 'subtotal',
        price: 0,
        qty: 0,
      },
      {
        id: uid(),
        type: 'heading',
        title: 'B. DỊCH VỤ VÀ NHÂN CÔNG',
        price: 0,
        qty: 0,
      },
      {
        id: uid(),
        type: 'item',
        priceId: 'p1',
        globalKey: 'gk-dv-001',
        code: 'DV-001',
        itemName: 'Tư vấn hệ thống xử lý nước thải',
        name: 'Khảo sát hiện trạng, tư vấn giải pháp công nghệ và lập phương án kỹ thuật chi tiết.',
        unit: 'gói',
        qty: 1,
        cost: 4000000,
        profitFactor: 1.25,
        price: 5000000,
        group: 'Dịch vụ',
      },
    ],
  };
}

export interface NoticeOptions {
  title: string;
  message: string;
  isHtml?: boolean;
  buttons?: { label: string; value: any; variant?: 'primary' | 'secondary' | 'danger' }[];
}

interface AppContextValue {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  company: CompanyInfo;
  updateCompany: (patch: Partial<CompanyInfo>) => void;
  currentQuote: Quote;
  updateCurrentQuote: (patch: Partial<Quote>) => void;
  updateQuoteRow: (rowId: string, patch: Partial<QuoteRow>) => void;
  addQuoteRow: () => void;
  addQuoteHeading: () => void;
  addQuoteSubheading: () => void;
  addQuoteGroupTotal: () => void;
  removeQuoteRow: (rowId: string) => void;
  reorderQuoteRows: (newRows: QuoteRow[]) => void;
  savedQuotes: Quote[];
  saveQuote: () => boolean;
  newQuote: () => void;
  loadSavedQuote: (id: string) => void;
  deleteSavedQuote: (id: string) => void;
  duplicateSavedQuote: (id: string) => void;
  prices: PriceItem[];
  addPriceItem: (item?: Partial<PriceItem>) => void;
  updatePriceItem: (id: string, patch: Partial<PriceItem>) => void;
  deletePriceItem: (id: string) => void;
  duplicatePriceItem: (id: string) => void;
  clearAllPrices: () => void;
  priceDraftDirty: boolean;
  savePriceChanges: () => void;
  discardPriceDraft: () => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  notice: (NoticeOptions & { resolve: (val: any) => void }) | null;
  showNotice: (options: NoticeOptions) => Promise<any>;
  closeNotice: () => void;
  activePickerRowId: string | null;
  openPricePicker: (rowId: string) => void;
  closePricePicker: () => void;
  selectPriceForQuoteRow: (priceId: string) => void;
  activeQuickEditRowId: string | null;
  openQuickEdit: (rowId: string) => void;
  closeQuickEdit: () => void;
  applyQuickEdit: (action: 'update' | 'updateAll' | 'create', values: Partial<PriceItem>) => void;
  isGlobalKeyModalOpen: boolean;
  setIsGlobalKeyModalOpen: (open: boolean) => void;
  isPrintPreviewOpen: boolean;
  openPrintPreview: () => void;
  closePrintPreview: () => void;
  printQuote: () => void;
  directPrint: () => void;
  exportQuoteWord: () => Promise<void>;
  exportCurrentQuoteSync: () => void;
  exportQuotesBackup: () => void;
  importQuotesJson: (file: File) => Promise<void>;
  exportPricesJson: () => void;
  importPricesJson: (file: File) => Promise<void>;
  syncAllQuoteItemsFromCatalog: () => Promise<void>;
  updatePricesFromCurrent: () => Promise<void>;
  updatePriceFromCurrentForRow: (rowId: string) => void;
  addAllMissingPricesFromQuote: () => Promise<void>;
  addMissingPriceFromQuoteRow: (rowId: string, silent?: boolean) => boolean;
  findCatalogPrice: (row: QuoteRow) => PriceItem | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('quote');
  const [company, setCompany] = useState<CompanyInfo>(defaultCompany);
  const [prices, setPrices] = useState<PriceItem[]>(defaultPrices);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<Quote>(() => createNewQuote([]));

  const [persistedPricesSnapshot, setPersistedPricesSnapshot] = useState<PriceItem[]>(defaultPrices);
  const [priceDraftDirty, setPriceDraftDirty] = useState<boolean>(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notice, setNotice] = useState<(NoticeOptions & { resolve: (val: any) => void }) | null>(null);

  const [activePickerRowId, setActivePickerRowId] = useState<string | null>(null);
  const [activeQuickEditRowId, setActiveQuickEditRowId] = useState<string | null>(null);
  const [isGlobalKeyModalOpen, setIsGlobalKeyModalOpen] = useState<boolean>(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showNotice = useCallback((options: NoticeOptions): Promise<any> => {
    return new Promise((resolve) => {
      setNotice({ ...options, resolve });
    });
  }, []);

  const closeNotice = useCallback(() => {
    if (notice) {
      notice.resolve(false);
      setNotice(null);
    }
  }, [notice]);

  // Load database on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.company && typeof parsed.company === 'object') {
          setCompany({ ...defaultCompany, ...parsed.company });
        }
        if (Array.isArray(parsed.prices) && parsed.prices.length > 0) {
          const loadedPrices = parsed.prices.map((p: any) => ({
            ...p,
            globalKey: p.globalKey || createGlobalKey(),
            cost: Number(p.cost) || Number(p.price) || 0,
            profitFactor: Number(p.profitFactor) || 1.2,
            price: Number(p.price) || Math.round((Number(p.cost) || 0) * (Number(p.profitFactor) || 1.2)),
          }));
          setPrices(loadedPrices);
          setPersistedPricesSnapshot(loadedPrices);
        }
        if (Array.isArray(parsed.quotes)) {
          setSavedQuotes(parsed.quotes);
        }
        if (parsed.currentQuote && typeof parsed.currentQuote === 'object') {
          setCurrentQuote({
            ...createNewQuote(parsed.quotes || []),
            ...parsed.currentQuote,
            rows: Array.isArray(parsed.currentQuote.rows) ? parsed.currentQuote.rows : [],
          });
        }
      }

      // Check for price draft
      const draftRaw = localStorage.getItem(PRICE_DRAFT_KEY);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft && Array.isArray(draft.prices)) {
          setPrices(draft.prices);
          setPriceDraftDirty(true);
          showToast('Đã khôi phục bản nháp bảng giá chưa lưu chính thức.', 'info');
        }
      }
    } catch (e) {
      console.warn('QuotePro: Error loading storage', e);
    }
  }, [showToast]);

  // Save to localStorage
  const saveToStorage = useCallback(
    (opts?: { newCompany?: CompanyInfo; newPrices?: PriceItem[]; newQuotes?: Quote[]; newCurrentQuote?: Quote; includeDraft?: boolean }) => {
      try {
        const comp = opts?.newCompany || company;
        const commitPrices = opts?.includeDraft ? (opts?.newPrices || prices) : persistedPricesSnapshot;
        const qs = opts?.newQuotes || savedQuotes;
        const curQ = opts?.newCurrentQuote || currentQuote;

        const payload = {
          company: comp,
          prices: commitPrices,
          quotes: qs,
          currentQuote: curQ,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
      } catch (e) {
        console.warn('QuotePro: Failed to save to localStorage', e);
        return false;
      }
    },
    [company, prices, persistedPricesSnapshot, savedQuotes, currentQuote]
  );

  // Auto save draft of current quote
  useEffect(() => {
    saveToStorage();
  }, [currentQuote, company, saveToStorage]);

  // Handle company updates
  const updateCompany = useCallback((patch: Partial<CompanyInfo>) => {
    setCompany((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  }, []);

  // Handle current quote updates
  const updateCurrentQuote = useCallback((patch: Partial<Quote>) => {
    setCurrentQuote((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateQuoteRow = useCallback((rowId: string, patch: Partial<QuoteRow>) => {
    setCurrentQuote((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  }, []);

  const addQuoteRow = useCallback(() => {
    const newRow: QuoteRow = {
      id: uid(),
      type: 'item',
      price: 0,
      qty: 1,
      name: '',
      unit: '',
    };
    setCurrentQuote((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
  }, []);

  const addQuoteHeading = useCallback(() => {
    setCurrentQuote((prev) => {
      const existingHeadings = prev.rows.filter((r) => r.type === 'heading').length;
      const letter = String.fromCharCode(65 + existingHeadings);
      const newRow: QuoteRow = {
        id: uid(),
        type: 'heading',
        title: `${letter}. `,
        price: 0,
        qty: 0,
      };
      return {
        ...prev,
        rows: [...prev.rows, newRow],
      };
    });
  }, []);

  const addQuoteSubheading = useCallback(() => {
    const newRow: QuoteRow = {
      id: uid(),
      type: 'subheading',
      title: '',
      price: 0,
      qty: 0,
    };
    setCurrentQuote((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
  }, []);

  const addQuoteGroupTotal = useCallback(() => {
    const newRow: QuoteRow = {
      id: uid(),
      type: 'subtotal',
      price: 0,
      qty: 0,
    };
    setCurrentQuote((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
  }, []);

  const removeQuoteRow = useCallback((rowId: string) => {
    setCurrentQuote((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => r.id !== rowId),
    }));
  }, []);

  const reorderQuoteRows = useCallback((newRows: QuoteRow[]) => {
    setCurrentQuote((prev) => ({
      ...prev,
      rows: newRows,
    }));
  }, []);

  // Quote Catalog Lookup helper
  const findCatalogPrice = useCallback(
    (row: QuoteRow): PriceItem | undefined => {
      if (!row) return undefined;
      if (row.globalKey) {
        const match = prices.find((p) => p.globalKey && p.globalKey === row.globalKey);
        if (match) return match;
      }
      if (row.priceId) {
        const match = prices.find((p) => p.id === row.priceId);
        if (match) return match;
      }
      if (row.code) {
        const match = prices.find(
          (p) => p.code && normalizePriceCode(p.code) === normalizePriceCode(row.code)
        );
        if (match) return match;
      }
      if (row.itemName) {
        const match = prices.find((p) => p.name === row.itemName);
        if (match) return match;
      }
      return undefined;
    },
    [prices]
  );

  // Price Catalog Actions
  const markPriceDirty = useCallback((newPrices: PriceItem[]) => {
    setPrices(newPrices);
    setPriceDraftDirty(true);
    try {
      localStorage.setItem(PRICE_DRAFT_KEY, JSON.stringify({ version: 1, prices: newPrices }));
    } catch {}
  }, []);

  const addPriceItem = useCallback((item?: Partial<PriceItem>) => {
    setPrices((prev) => {
      const code = generateUniquePriceCode(prev, 'CT');
      const newItem: PriceItem = {
        id: uid(),
        globalKey: createGlobalKey(),
        code,
        name: 'Hạng mục mới',
        detail: '',
        unit: 'cái',
        cost: 0,
        profitFactor: 1.25,
        price: 0,
        group: 'Chung',
        ...item,
      };
      const next = [newItem, ...prev];
      markPriceDirty(next);
      return next;
    });
  }, [markPriceDirty]);

  const updatePriceItem = useCallback(
    (id: string, patch: Partial<PriceItem>) => {
      setPrices((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          const updated = { ...p, ...patch };
          if ('cost' in patch || 'profitFactor' in patch) {
            const cost = Number(updated.cost) || 0;
            const factor = Number(updated.profitFactor) || 1.2;
            updated.price = Math.round(cost * factor);
          }
          return updated;
        });
        markPriceDirty(next);
        return next;
      });
    },
    [markPriceDirty]
  );

  const deletePriceItem = useCallback(
    (id: string) => {
      setPrices((prev) => {
        const next = prev.filter((p) => p.id !== id);
        markPriceDirty(next);
        return next;
      });
      showToast('Đã xóa hạng mục khỏi bảng giá (nháp).');
    },
    [markPriceDirty, showToast]
  );

  const duplicatePriceItem = useCallback(
    (id: string) => {
      setPrices((prev) => {
        const src = prev.find((p) => p.id === id);
        if (!src) return prev;
        const prefix = priceCodePrefixFromCode(src.code);
        const code = generateUniquePriceCode(prev, prefix);
        const copy: PriceItem = {
          ...src,
          id: uid(),
          globalKey: createGlobalKey(),
          code,
          name: `${src.name} (bản sao)`,
        };
        const next = [copy, ...prev];
        markPriceDirty(next);
        return next;
      });
      showToast('Đã nhân đôi hạng mục.');
    },
    [markPriceDirty, showToast]
  );

  const clearAllPrices = useCallback(async () => {
    const ok = await showNotice({
      title: 'Xóa toàn bộ danh mục giá?',
      message: 'Toàn bộ đơn giá trong danh mục sẽ bị xóa. Thao tác này sẽ ở dạng nháp cho tới khi bạn bấm "Lưu cập nhật giá".',
      buttons: [
        { label: 'Hủy', value: false, variant: 'secondary' },
        { label: 'Xóa toàn bộ', value: true, variant: 'danger' },
      ],
    });
    if (!ok) return;
    setPrices([]);
    markPriceDirty([]);
    showToast('Đã xóa toàn bộ đơn giá trong bảng giá nháp.');
  }, [showNotice, markPriceDirty, showToast]);

  const savePriceChanges = useCallback(() => {
    setPersistedPricesSnapshot(prices);
    setPriceDraftDirty(false);
    try {
      localStorage.removeItem(PRICE_DRAFT_KEY);
    } catch {}
    saveToStorage({ newPrices: prices, includeDraft: true });
    showToast('Đã lưu cập nhật giá chính thức!');
  }, [prices, saveToStorage, showToast]);

  const discardPriceDraft = useCallback(async () => {
    const ok = await showNotice({
      title: 'Hủy các thay đổi bảng giá chưa lưu?',
      message: 'Danh mục sẽ khôi phục về lần lưu chính thức gần nhất. Các báo giá đã lưu không bị thay đổi.',
      buttons: [
        { label: 'Tiếp tục chỉnh sửa', value: false, variant: 'secondary' },
        { label: 'Hủy nháp', value: true, variant: 'danger' },
      ],
    });
    if (!ok) return;
    setPrices(persistedPricesSnapshot);
    setPriceDraftDirty(false);
    try {
      localStorage.removeItem(PRICE_DRAFT_KEY);
    } catch {}
    showToast('Đã hủy thay đổi nháp, khôi phục bảng giá trước đó.');
  }, [persistedPricesSnapshot, showNotice, showToast]);

  // Saved quotes management
  const saveQuote = useCallback((): boolean => {
    const no = String(currentQuote.no || '').trim();
    if (!no) {
      showNotice({
        title: 'Thiếu số báo giá',
        message: 'Vui lòng nhập số báo giá hợp lệ trước khi lưu.',
      });
      return false;
    }

    const normalizedNo = no.toUpperCase().replace(/\s+/g, '');
    let existingIndex = savedQuotes.findIndex((q) => q.id === currentQuote.id);
    if (existingIndex < 0 && currentQuote.syncKey) {
      existingIndex = savedQuotes.findIndex((q) => q.syncKey === currentQuote.syncKey);
    }

    const dupIndex = savedQuotes.findIndex(
      (q, idx) => idx !== existingIndex && q.no.toUpperCase().replace(/\s+/g, '') === normalizedNo
    );
    if (dupIndex >= 0) {
      showNotice({
        title: 'Số báo giá đã tồn tại',
        message: `Số báo giá "${no}" đã được sử dụng cho khách hàng "${savedQuotes[dupIndex].customer || 'Khách hàng'}". Vui lòng đổi số báo giá khác.`,
      });
      return false;
    }

    const quoteToSave: Quote = {
      ...currentQuote,
      updatedAt: new Date().toISOString(),
    };

    let updatedQuotes: Quote[];
    if (existingIndex >= 0) {
      updatedQuotes = savedQuotes.map((q, idx) => (idx === existingIndex ? quoteToSave : q));
    } else {
      updatedQuotes = [quoteToSave, ...savedQuotes];
    }

    setSavedQuotes(updatedQuotes);
    saveToStorage({ newQuotes: updatedQuotes });
    showToast(`Đã lưu báo giá ${no} thành công!`);
    return true;
  }, [currentQuote, savedQuotes, saveToStorage, showNotice, showToast]);

  const newQuote = useCallback(() => {
    const nextQ = createNewQuote(savedQuotes);
    setCurrentQuote(nextQ);
    showToast('Đã tạo biểu mẫu báo giá mới.');
  }, [savedQuotes, showToast]);

  const loadSavedQuote = useCallback(
    (id: string) => {
      const found = savedQuotes.find((q) => q.id === id);
      if (found) {
        setCurrentQuote(JSON.parse(JSON.stringify(found)));
        setActiveTab('quote');
        showToast(`Đã tải báo giá ${found.no}.`);
      }
    },
    [savedQuotes, showToast]
  );

  const deleteSavedQuote = useCallback(
    async (id: string) => {
      const q = savedQuotes.find((x) => x.id === id);
      const ok = await showNotice({
        title: 'Xóa báo giá đã lưu?',
        message: `Báo giá "${q?.no || id}" của khách hàng "${q?.customer || ''}" sẽ bị xóa vĩnh viễn khỏi danh sách lưu.`,
        buttons: [
          { label: 'Hủy', value: false, variant: 'secondary' },
          { label: 'Xóa báo giá', value: true, variant: 'danger' },
        ],
      });
      if (!ok) return;

      const next = savedQuotes.filter((x) => x.id !== id);
      setSavedQuotes(next);
      saveToStorage({ newQuotes: next });
      showToast('Đã xóa báo giá đã lưu.');
    },
    [savedQuotes, showNotice, saveToStorage, showToast]
  );

  const duplicateSavedQuote = useCallback(
    (id: string) => {
      const found = savedQuotes.find((q) => q.id === id);
      if (!found) return;
      const copy: Quote = {
        ...JSON.parse(JSON.stringify(found)),
        id: uid(),
        syncKey: createGlobalKey(),
        no: generateUniqueQuoteNo(savedQuotes),
        date: today(),
        updatedAt: new Date().toISOString(),
      };
      const next = [copy, ...savedQuotes];
      setSavedQuotes(next);
      saveToStorage({ newQuotes: next });
      setCurrentQuote(copy);
      setActiveTab('quote');
      showToast(`Đã nhân đôi báo giá thành số mới ${copy.no}.`);
    },
    [savedQuotes, saveToStorage, showToast]
  );

  // Quick edit modal logic
  const openQuickEdit = useCallback((rowId: string) => {
    setActiveQuickEditRowId(rowId);
  }, []);

  const closeQuickEdit = useCallback(() => {
    setActiveQuickEditRowId(null);
  }, []);

  const applyQuickEdit = useCallback(
    (action: 'update' | 'updateAll' | 'create', values: Partial<PriceItem>) => {
      if (!activeQuickEditRowId) return;
      const row = currentQuote.rows.find((r) => r.id === activeQuickEditRowId);
      if (!row || row.type !== 'item') return;

      const catalogItem = findCatalogPrice(row);
      const cost = Number(values.cost) || 0;
      const factor = Number(values.profitFactor) || 1.2;
      const price = Math.round(cost * factor);
      const name = String(values.name || row.itemName || '').trim();
      const detail = String(values.detail || '');
      const unit = String(values.unit || row.unit || '').trim();
      const group = String(values.group || row.group || 'Chung').trim();

      const targetCode = (catalogItem?.code || row.code || '').trim().toUpperCase();
      const targetGlobalKey = catalogItem?.globalKey || row.globalKey;
      const targetPriceId = catalogItem?.id || row.priceId;
      const targetName = (catalogItem?.name || row.itemName || '').trim().toLowerCase();

      const isRowMatching = (r: QuoteRow) => {
        if (r.type !== 'item') return false;
        if (r.id === activeQuickEditRowId) return true;
        if (targetCode && r.code && r.code.trim().toUpperCase() === targetCode) return true;
        if (targetGlobalKey && r.globalKey && r.globalKey === targetGlobalKey) return true;
        if (targetPriceId && r.priceId && r.priceId === targetPriceId) return true;
        if (!targetCode && targetName && r.itemName && r.itemName.trim().toLowerCase() === targetName) return true;
        return false;
      };

      if (action === 'create') {
        const code = generateUniquePriceCode(prices, priceCodePrefixFromCode(row.code || 'CT'));
        const newItem: PriceItem = {
          id: uid(),
          globalKey: createGlobalKey(),
          code,
          name,
          detail,
          unit,
          cost,
          profitFactor: factor,
          price,
          group,
        };
        const nextPrices = [newItem, ...prices];
        markPriceDirty(nextPrices);

        updateQuoteRow(activeQuickEditRowId, {
          priceId: newItem.id,
          globalKey: newItem.globalKey,
          code: newItem.code,
          itemName: newItem.name,
          name: detail,
          unit,
          cost,
          profitFactor: factor,
          price,
          group,
        });
        showToast(`Đã tạo hạng mục mới (${newItem.code}) trong bảng giá.`);
      } else if (action === 'updateAll') {
        let activeCatalog = catalogItem;
        let nextPrices = [...prices];

        if (activeCatalog) {
          const updatedCatalog: PriceItem = {
            ...activeCatalog,
            name,
            detail,
            unit,
            group,
            cost,
            profitFactor: factor,
            price,
          };
          nextPrices = prices.map((p) => (p.id === activeCatalog!.id ? updatedCatalog : p));
          activeCatalog = updatedCatalog;
        } else {
          const code = row.code?.trim() || generateUniquePriceCode(prices, 'CT');
          const newItem: PriceItem = {
            id: uid(),
            globalKey: row.globalKey || createGlobalKey(),
            code,
            name,
            detail,
            unit,
            cost,
            profitFactor: factor,
            price,
            group,
          };
          nextPrices = [newItem, ...prices];
          activeCatalog = newItem;
        }

        markPriceDirty(nextPrices);

        let matchCount = 0;
        setCurrentQuote((prev) => ({
          ...prev,
          rows: prev.rows.map((r) => {
            if (isRowMatching(r)) {
              matchCount++;
              return {
                ...r,
                priceId: activeCatalog!.id,
                globalKey: activeCatalog!.globalKey,
                code: activeCatalog!.code,
                itemName: name,
                name: detail,
                unit,
                cost,
                profitFactor: factor,
                price,
                group,
              };
            }
            return r;
          }),
        }));

        showToast(
          `Đã cập nhật bảng giá và đồng loạt ${matchCount} dòng cùng mã (${activeCatalog.code}) trong báo giá.`
        );
      } else {
        // action === 'update': chỉ cập nhật dòng hiện tại và cập nhật danh mục giá
        let activeCatalog = catalogItem;
        let nextPrices = [...prices];

        if (activeCatalog) {
          const updatedCatalog: PriceItem = {
            ...activeCatalog,
            name,
            detail,
            unit,
            group,
            cost,
            profitFactor: factor,
            price,
          };
          nextPrices = prices.map((p) => (p.id === activeCatalog!.id ? updatedCatalog : p));
          activeCatalog = updatedCatalog;
        } else {
          const code = row.code?.trim() || generateUniquePriceCode(prices, 'CT');
          const newItem: PriceItem = {
            id: uid(),
            globalKey: row.globalKey || createGlobalKey(),
            code,
            name,
            detail,
            unit,
            cost,
            profitFactor: factor,
            price,
            group,
          };
          nextPrices = [newItem, ...prices];
          activeCatalog = newItem;
        }

        markPriceDirty(nextPrices);

        updateQuoteRow(activeQuickEditRowId, {
          priceId: activeCatalog.id,
          globalKey: activeCatalog.globalKey,
          code: activeCatalog.code,
          itemName: name,
          name: detail,
          unit,
          cost,
          profitFactor: factor,
          price,
          group,
        });
        showToast('Đã cập nhật bảng giá và dòng báo giá hiện tại.');
      }

      closeQuickEdit();
    },
    [activeQuickEditRowId, currentQuote.rows, findCatalogPrice, prices, markPriceDirty, updateQuoteRow, showToast, closeQuickEdit]
  );

  // Price Picker logic
  const openPricePicker = useCallback((rowId: string) => {
    setActivePickerRowId(rowId);
  }, []);

  const closePricePicker = useCallback(() => {
    setActivePickerRowId(null);
  }, []);

  const selectPriceForQuoteRow = useCallback(
    (priceId: string) => {
      if (!activePickerRowId) return;
      const p = prices.find((item) => item.id === priceId);
      if (!p) return;

      updateQuoteRow(activePickerRowId, {
        priceId: p.id,
        globalKey: p.globalKey,
        code: p.code,
        itemName: p.name,
        name: formatDetailMultiline(p.detail),
        unit: p.unit,
        price: p.price,
        cost: p.cost,
        profitFactor: p.profitFactor,
        group: p.group,
        detailIsCustom: false,
      });

      closePricePicker();
      showToast(`Đã áp giá hạng mục "${p.name}".`);
    },
    [activePickerRowId, prices, updateQuoteRow, closePricePicker, showToast]
  );

  // Single Quote Item Sync
  const updatePriceFromCurrentForRow = useCallback(
    (rowId: string) => {
      const row = currentQuote.rows.find((r) => r.id === rowId && r.type === 'item');
      if (!row) return;
      const cat = findCatalogPrice(row);
      if (!cat) {
        showToast('Không tìm thấy hạng mục này trong bảng giá.', 'error');
        return;
      }
      updateQuoteRow(rowId, { price: cat.price });
      showToast(`Đã cập nhật đơn giá ${cat.name}: ${cat.price.toLocaleString('vi-VN')} đ.`);
    },
    [currentQuote.rows, findCatalogPrice, updateQuoteRow, showToast]
  );

  // Sync All items
  const syncAllQuoteItemsFromCatalog = useCallback(async () => {
    const rows = currentQuote.rows.filter((r) => r.type === 'item');
    const matched = rows.filter((r) => findCatalogPrice(r));
    if (!matched.length) {
      showToast('Không có hạng mục nào khớp với bảng giá để đồng bộ.');
      return;
    }

    const ok = await showNotice({
      title: 'Đồng bộ nội dung từ bảng giá?',
      message: `Hệ thống sẽ cập nhật tên hạng mục, mô tả chi tiết, đơn vị tính và nhóm từ bảng giá cho ${matched.length}/${rows.length} hạng mục có liên kết. Đơn giá và số lượng sẽ được giữ nguyên.`,
      buttons: [
        { label: 'Hủy', value: false, variant: 'secondary' },
        { label: 'Đồng bộ ngay', value: true, variant: 'primary' },
      ],
    });
    if (!ok) return;

    setCurrentQuote((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.type !== 'item') return r;
        const cat = findCatalogPrice(r);
        if (!cat) return r;
        return {
          ...r,
          priceId: cat.id,
          globalKey: cat.globalKey,
          code: cat.code,
          itemName: cat.name,
          name: formatDetailMultiline(cat.detail),
          unit: cat.unit,
          group: cat.group,
          detailIsCustom: false,
        };
      }),
    }));
    showToast(`Đã đồng bộ nội dung cho ${matched.length} hạng mục từ bảng giá.`);
  }, [currentQuote.rows, findCatalogPrice, showNotice, showToast]);

  const updatePricesFromCurrent = useCallback(async () => {
    const rows = currentQuote.rows.filter((r) => r.type === 'item');
    const diffs: { row: QuoteRow; cat: PriceItem }[] = [];
    rows.forEach((r) => {
      const cat = findCatalogPrice(r);
      if (cat && Number(r.price) !== Number(cat.price)) {
        diffs.push({ row: r, cat });
      }
    });

    if (diffs.length === 0) {
      showToast('Tất cả đơn giá trong báo giá đã khớp với bảng giá hiện tại.');
      return;
    }

    const ok = await showNotice({
      title: 'Cập nhật giá mới từ bảng giá?',
      message: `Có ${diffs.length} hạng mục có đơn giá khác với bảng giá hiện hành. Chỉ cập nhật đơn giá bán; tên, mô tả và số lượng được giữ nguyên.`,
      buttons: [
        { label: 'Hủy', value: false, variant: 'secondary' },
        { label: `Cập nhật ${diffs.length} giá mới`, value: true, variant: 'primary' },
      ],
    });
    if (!ok) return;

    setCurrentQuote((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.type !== 'item') return r;
        const cat = findCatalogPrice(r);
        if (!cat) return r;
        return { ...r, price: cat.price };
      }),
    }));
    showToast(`Đã cập nhật đơn giá mới cho ${diffs.length} hạng mục.`);
  }, [currentQuote.rows, findCatalogPrice, showNotice, showToast]);

  const addMissingPriceFromQuoteRow = useCallback(
    (rowId: string, silent = false): boolean => {
      const r = currentQuote.rows.find((x) => x.id === rowId && x.type === 'item');
      if (!r || !r.itemName) return false;
      const cat = findCatalogPrice(r);
      if (cat) return false;

      const code = generateUniquePriceCode(prices, priceCodePrefixFromCode(r.code || 'CT'));
      const newItem: PriceItem = {
        id: uid(),
        globalKey: r.globalKey || createGlobalKey(),
        code,
        name: r.itemName,
        detail: r.name || '',
        unit: r.unit || 'cái',
        cost: Number(r.cost) || 0,
        profitFactor: Number(r.profitFactor) || 1.25,
        price: Number(r.price) || 0,
        group: r.group || 'Chung',
      };

      const nextPrices = [newItem, ...prices];
      markPriceDirty(nextPrices);
      updateQuoteRow(rowId, {
        priceId: newItem.id,
        globalKey: newItem.globalKey,
        code: newItem.code,
      });

      if (!silent) {
        showToast(`Đã thêm "${newItem.name}" vào bảng giá nháp.`);
      }
      return true;
    },
    [currentQuote.rows, findCatalogPrice, prices, markPriceDirty, updateQuoteRow, showToast]
  );

  const addAllMissingPricesFromQuote = useCallback(async () => {
    const rows = currentQuote.rows.filter((r) => r.type === 'item' && r.itemName);
    const missing = rows.filter((r) => !findCatalogPrice(r));

    if (!missing.length) {
      showToast('Tất cả các hạng mục trong báo giá đã tồn tại trong bảng giá.');
      return;
    }

    const ok = await showNotice({
      title: 'Thêm hạng mục vào bảng giá?',
      message: `Bạn sắp thêm ${missing.length} hạng mục từ báo giá hiện tại vào danh mục giá (ở trạng thái nháp). Đơn giá báo giá được giữ làm giá bán.`,
      buttons: [
        { label: 'Hủy', value: false, variant: 'secondary' },
        { label: `Thêm ${missing.length} hạng mục`, value: true, variant: 'primary' },
      ],
    });
    if (!ok) return;

    let added = 0;
    missing.forEach((r) => {
      if (addMissingPriceFromQuoteRow(r.id, true)) added++;
    });
    showToast(`Đã thêm ${added} hạng mục vào bảng giá nháp. Nhớ bấm "Lưu cập nhật giá" để lưu chính thức.`);
  }, [currentQuote.rows, findCatalogPrice, showNotice, addMissingPriceFromQuoteRow, showToast]);

  // Export & Print actions
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const openPrintPreview = useCallback(() => setIsPrintPreviewOpen(true), []);
  const closePrintPreview = useCallback(() => setIsPrintPreviewOpen(false), []);
  const printQuote = useCallback(() => {
    setIsPrintPreviewOpen(true);
  }, []);
  const directPrint = useCallback(() => {
    window.print();
  }, []);

  const exportQuoteWord = useCallback(async () => {
    try {
      await exportQuoteToWord(currentQuote, company);
      showToast('Đã xuất file Word (.docx) chuẩn mẫu in ấn.');
    } catch (e: any) {
      console.error(e);
      showToast('Lỗi khi xuất Word: ' + (e?.message || e), 'error');
    }
  }, [currentQuote, company, showToast]);

  const exportCurrentQuoteSync = useCallback(() => {
    const payload = {
      type: 'QuotePro-QuoteSync',
      version: 4,
      mode: 'single',
      exportedAt: new Date().toISOString(),
      quote: currentQuote,
    };
    downloadJsonFile(payload, `quotepro-bao-gia-${currentQuote.no || today()}.json`);
    showToast('Đã xuất gói đồng bộ báo giá hiện tại.');
  }, [currentQuote, showToast]);

  const exportQuotesBackup = useCallback(() => {
    const payload = {
      type: 'QuotePro-Quotes',
      version: 4,
      mode: 'full',
      exportedAt: new Date().toISOString(),
      company,
      quotes: savedQuotes,
      currentQuote,
    };
    downloadJsonFile(payload, `quotepro-sao-luu-toan-bo-${today()}.json`);
    showToast('Đã xuất file sao lưu toàn bộ dữ liệu báo giá.');
  }, [company, savedQuotes, currentQuote, showToast]);

  const importQuotesJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.type === 'QuotePro-QuoteSync' && data.quote) {
          setCurrentQuote(data.quote);
          setActiveTab('quote');
          showToast(`Đã nhập báo giá đồng bộ ${data.quote.no}.`);
          return;
        }

        if (Array.isArray(data.quotes) || Array.isArray(data)) {
          const list = Array.isArray(data.quotes) ? data.quotes : data;
          setSavedQuotes(list);
          if (data.company) setCompany(data.company);
          if (data.currentQuote) setCurrentQuote(data.currentQuote);
          else if (list.length > 0) setCurrentQuote(list[0]);
          saveToStorage({ newQuotes: list, newCompany: data.company, newCurrentQuote: data.currentQuote });
          showToast(`Đã khôi phục thành công ${list.length} báo giá.`);
          return;
        }

        if (data.rows && data.no) {
          setCurrentQuote(data);
          setActiveTab('quote');
          showToast(`Đã tải báo giá ${data.no}.`);
          return;
        }

        throw new Error('Định dạng file báo giá không tương thích.');
      } catch (err: any) {
        showNotice({
          title: 'Lỗi nhập dữ liệu',
          message: 'Không thể đọc file JSON báo giá: ' + (err?.message || err),
        });
      }
    },
    [saveToStorage, showNotice, showToast]
  );

  const exportPricesJson = useCallback(() => {
    const payload = {
      type: 'QuotePro-Prices',
      version: 2,
      exportedAt: new Date().toISOString(),
      prices,
    };
    downloadJsonFile(payload, `quotepro-bang-gia-${today()}.json`);
    showToast('Đã xuất file bảng giá JSON.');
  }, [prices, showToast]);

  const importPricesJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const list = Array.isArray(data.prices) ? data.prices : Array.isArray(data) ? data : null;
        if (!list) throw new Error('Không tìm thấy danh sách đơn giá hợp lệ trong file.');

        const imported = list.map((p: any) => ({
          id: p.id || uid(),
          globalKey: p.globalKey || createGlobalKey(),
          code: p.code || generateUniquePriceCode([], 'CT'),
          name: p.name || 'Hạng mục',
          detail: p.detail || '',
          unit: p.unit || 'cái',
          cost: Number(p.cost) || Number(p.price) || 0,
          profitFactor: Number(p.profitFactor) || 1.25,
          price: Number(p.price) || Math.round((Number(p.cost) || 0) * (Number(p.profitFactor) || 1.25)),
          group: p.group || 'Chung',
        }));

        setPrices(imported);
        setPersistedPricesSnapshot(imported);
        setPriceDraftDirty(false);
        try {
          localStorage.removeItem(PRICE_DRAFT_KEY);
        } catch {}
        saveToStorage({ newPrices: imported, includeDraft: true });
        showToast(`Đã nhập và lưu chính thức ${imported.length} hạng mục đơn giá.`);
      } catch (err: any) {
        showNotice({
          title: 'Lỗi nhập bảng giá',
          message: 'Không thể đọc file JSON bảng giá: ' + (err?.message || err),
        });
      }
    },
    [saveToStorage, showNotice, showToast]
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
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
      saveQuote,
      newQuote,
      loadSavedQuote,
      deleteSavedQuote,
      duplicateSavedQuote,
      prices,
      addPriceItem,
      updatePriceItem,
      deletePriceItem,
      duplicatePriceItem,
      clearAllPrices,
      priceDraftDirty,
      savePriceChanges,
      discardPriceDraft,
      toasts,
      showToast,
      removeToast,
      notice,
      showNotice,
      closeNotice,
      activePickerRowId,
      openPricePicker,
      closePricePicker,
      selectPriceForQuoteRow,
      activeQuickEditRowId,
      openQuickEdit,
      closeQuickEdit,
      applyQuickEdit,
      isGlobalKeyModalOpen,
      setIsGlobalKeyModalOpen,
      isPrintPreviewOpen,
      openPrintPreview,
      closePrintPreview,
      printQuote,
      directPrint,
      exportQuoteWord,
      exportCurrentQuoteSync,
      exportQuotesBackup,
      importQuotesJson,
      exportPricesJson,
      importPricesJson,
      syncAllQuoteItemsFromCatalog,
      updatePricesFromCurrent,
      updatePriceFromCurrentForRow,
      addAllMissingPricesFromQuote,
      addMissingPriceFromQuoteRow,
      findCatalogPrice,
    }),
    [
      activeTab,
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
      saveQuote,
      newQuote,
      loadSavedQuote,
      deleteSavedQuote,
      duplicateSavedQuote,
      prices,
      addPriceItem,
      updatePriceItem,
      deletePriceItem,
      duplicatePriceItem,
      clearAllPrices,
      priceDraftDirty,
      savePriceChanges,
      discardPriceDraft,
      toasts,
      showToast,
      removeToast,
      notice,
      showNotice,
      closeNotice,
      activePickerRowId,
      openPricePicker,
      closePricePicker,
      selectPriceForQuoteRow,
      activeQuickEditRowId,
      openQuickEdit,
      closeQuickEdit,
      applyQuickEdit,
      isGlobalKeyModalOpen,
      isPrintPreviewOpen,
      openPrintPreview,
      closePrintPreview,
      printQuote,
      directPrint,
      exportQuoteWord,
      exportCurrentQuoteSync,
      exportQuotesBackup,
      importQuotesJson,
      exportPricesJson,
      importPricesJson,
      syncAllQuoteItemsFromCatalog,
      updatePricesFromCurrent,
      updatePriceFromCurrentForRow,
      addAllMissingPricesFromQuote,
      addMissingPriceFromQuoteRow,
      findCatalogPrice,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
