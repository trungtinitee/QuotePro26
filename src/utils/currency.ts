/**
 * Utility functions for Vietnamese currency, number parsing, formatting,
 * and converting monetary amounts to Vietnamese words.
 */

export function money(n: number | string | undefined | null): string {
  const num = Math.round(Number(n) || 0);
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
}

export function moneyPlain(n: number | string | undefined | null): string {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);
}

export function formatMoneyInput(n: number | string | undefined | null): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(x);
}

/**
 * Standard Vietnamese input parser:
 * '.' is thousand separator, ',' is decimal separator.
 */
export function parseMoneyInput(v: string | number | undefined | null): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s) return 0;

  s = s.replace(/[^0-9.,-]/g, '');
  if (s.includes(',')) {
    const comma = s.lastIndexOf(',');
    const sign = s.startsWith('-') ? '-' : '';
    const body = s.replace(/-/g, '');
    const parts = body.split(',');
    const intPart = parts.slice(0, -1).join('').replace(/\./g, '').replace(/\D/g, '') || '0';
    const decPart = (parts[parts.length - 1] || '').replace(/\D/g, '').slice(0, 2);
    const normalized = sign + intPart + (decPart ? '.' + decPart : '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const normalized = s.replace(/\./g, '').replace(/(?!^)-/g, '').replace(/[^0-9-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function parseDecimalInput(v: string | number | undefined | null): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s) return 0;
  s = s.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  const i = s.indexOf(',');
  if (i >= 0) {
    const a = s.slice(0, i).replace(/,/g, '') || '0';
    const b = s.slice(i + 1).replace(/,/g, '').slice(0, 6);
    const n = Number(a + (b !== '' ? '.' + b : ''));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatDecimalInput(v: number | string | undefined | null): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return String(n).replace('.', ',');
}

export function formatMoneyLive(el: HTMLInputElement | null) {
  if (!el) return;
  const old = String(el.value || '');
  const caret = typeof el.selectionStart === 'number' ? el.selectionStart : old.length;
  const before = old.slice(0, caret);
  const hasComma = old.includes(',');
  const commaIndex = old.indexOf(',');
  const beforeComma = commaIndex >= 0 ? old.slice(0, commaIndex) : old;
  const decimalRaw = hasComma ? old.slice(commaIndex + 1).replace(/[^0-9]/g, '').slice(0, 2) : '';

  let intRaw = beforeComma.replace(/[^0-9]/g, '');
  intRaw = intRaw.replace(/^0+(?=\d)/, '');
  if (intRaw === '') intRaw = '0';
  const formattedInt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const next = hasComma ? formattedInt + ',' + decimalRaw : formattedInt;
  el.value = next;

  const digitsBefore = before.replace(/[^0-9]/g, '').length;
  const hadCommaBefore = before.includes(',');
  let pos = 0;
  let seen = 0;
  for (let i = 0; i < next.length; i++) {
    if (/\d/.test(next[i])) {
      seen++;
      if (seen <= digitsBefore) pos = i + 1;
    }
  }
  if (hadCommaBefore && next.includes(',')) {
    const commaPos = next.indexOf(',');
    if (digitsBefore >= intRaw.length) pos = Math.max(pos, commaPos + 1);
  }
  if (!digitsBefore) pos = 0;
  try {
    el.setSelectionRange(pos, pos);
  } catch {
    // Ignore selection range errors on unsupported types
  }
}

export function normalizeCommaDecimal(el: HTMLInputElement | null) {
  if (!el) return;
  const old = String(el.value || '');
  const caret = typeof el.selectionStart === 'number' ? el.selectionStart : old.length;
  const before = old.slice(0, caret);
  let v = old.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  const i = v.indexOf(',');
  if (i >= 0) {
    v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, '').slice(0, 6);
  }
  el.value = v;
  const beforeClean = before.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  try {
    el.setSelectionRange(
      Math.min(beforeClean.length, v.length),
      Math.min(beforeClean.length, v.length)
    );
  } catch {
    // Ignore selection range errors
  }
}

export function numberToVietnameseWords(n: number | string | undefined | null): string {
  let num = Math.round(Number(n) || 0);
  if (num === 0) return 'Không đồng';
  const isNegative = num < 0;
  if (isNegative) num = Math.abs(num);

  const ones = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const read3 = (x: number, full: boolean = false): string => {
    const h = Math.floor(x / 100);
    const t = Math.floor((x % 100) / 10);
    const u = x % 10;
    const a: string[] = [];
    if (h > 0 || full) a.push(ones[h] + ' trăm');
    if (t > 1) a.push(ones[t] + ' mươi');
    else if (t === 1) a.push('mười');
    else if ((h > 0 || full) && u > 0) a.push('lẻ');
    if (u > 0) {
      if (t > 1 && u === 1) a.push('mốt');
      else if (t >= 1 && u === 5) a.push('lăm');
      else a.push(ones[u]);
    }
    return a.join(' ');
  };

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (!g) continue;
    const full = i < groups.length - 1 && g < 100;
    let part = read3(g, full);
    if (units[i]) part += ' ' + units[i];
    out.push(part);
  }

  let text = out.join(' ').replace(/\s+/g, ' ').trim();
  if (isNegative) text = 'Âm ' + text;
  return text.charAt(0).toUpperCase() + text.slice(1) + ' đồng';
}

export function today(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function formatDateVN(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return dateStr;
}

export function dossierDateVN(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return `ngày ${Number(m[3])} tháng ${Number(m[2])} năm ${m[1]}`;
  }
  return dateStr;
}
