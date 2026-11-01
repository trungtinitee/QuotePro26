export interface CompanyInfo {
  name: string;
  tax: string;
  phone: string;
  address: string;
  email: string;
  website: string;
  bank: string;
  logo: string; // base64 data url
}

export interface PriceItem {
  id: string;
  globalKey: string;
  code: string;
  name: string;
  detail: string;
  unit: string;
  cost: number;
  profitFactor: number;
  price: number;
  group: string;
}

export type QuoteRowType = 'item' | 'heading' | 'subheading' | 'subtotal';

export interface QuoteRow {
  id: string;
  type: QuoteRowType;
  priceId?: string;
  globalKey?: string;
  code?: string;
  itemName?: string;
  name?: string; // specific description for this quote
  unit?: string;
  price: number;
  qty: number;
  cost?: number;
  profitFactor?: number;
  group?: string;
  detailIsCustom?: boolean;
  title?: string; // For heading & subheading
}

export interface Quote {
  id: string;
  syncKey: string;
  no: string;
  project: string;
  date: string;
  validity: string;
  creator: string;
  customer: string;
  company: string;
  address: string;
  phone: string;
  vat: number;
  discountEnabled: boolean;
  discountType: 'percent' | 'amount';
  discountValue: number;
  tndnRate: number;
  otherCosts: number;
  notes: string;
  rows: QuoteRow[];
  dossier?: DossierState;
  createdAt?: string;
  updatedAt?: string;
}

export interface DossierParty {
  name: string;
  rep: string;
  title: string;
  address: string;
  phone: string;
  tax: string;
  bank: string;
}

export interface DossierCommon {
  contractNo: string;
  contractDate: string;
  project: string;
  workTitle: string;
  location: string;
  executionPeriod: string;
  warranty: string;
  partyA: DossierParty;
  partyB: DossierParty;
  copiesA: string;
  copiesB: string;
}

export interface DossierContentBlock {
  text: string;
  autoText: string;
  custom: boolean;
}

export interface DossierDocData {
  no?: string;
  date?: string;
  location?: string;
  copies?: string;
  copiesA?: string;
  copiesB?: string;
  paymentDays?: string;
  method?: string;
  amount?: number;
  amountWords?: string;
  advanceRate?: number;
  advanceAmount?: number;
  remainingAmount?: number;
  invoiceNo?: string;
  invoiceDate?: string;
  handoverTime?: string;
  acceptanceTime?: string;
  customContent?: string;
  warranty?: string;
  signA?: string;
  signATitle?: string;
  signB?: string;
  signBTitle?: string;
  signB2?: string;
  signB2Title?: string;
  contactPerson?: string;
  receiverName?: string;
  receiverTitle?: string;
  senderName?: string;
  senderTitle?: string;
  partyARep?: string;
  partyATitle?: string;
  partyBRep?: string;
  partyBTitle?: string;
  conclusion?: string;
  startTime?: string;
  endTime?: string;
  quality?: string;
  other?: string;
  settledAmount?: number;
  advance?: number;
  payable?: number;
  purpose?: string;
  invoiceNote?: string;
  signer?: string;
  signerTitle?: string;
  createdAt?: string;
  itemNotes?: Record<string, string>;
}

export interface DossierState {
  common: DossierCommon;
  docs: Record<string, DossierDocData>;
  content?: Record<string, Record<string, DossierContentBlock>>;
  customTexts?: Record<string, string>;
}

export type TabType = 'quote' | 'analysis' | 'price' | 'dossier';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}
