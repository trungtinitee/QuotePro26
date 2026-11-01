export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function createGlobalKey(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const a = new Uint8Array(16);
    window.crypto.getRandomValues(a);
    a[6] = (a[6] & 15) | 64;
    a[8] = (a[8] & 63) | 128;
    const h = Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('');
    return (
      h.slice(0, 8) +
      '-' +
      h.slice(8, 12) +
      '-' +
      h.slice(12, 16) +
      '-' +
      h.slice(16, 20) +
      '-' +
      h.slice(20)
    );
  }
  return (
    'gk-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 12) +
    '-' +
    Math.random().toString(36).slice(2, 12)
  );
}

export function normalizedQuoteNo(value: string | undefined | null): string {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function generateUniqueQuoteNo(
  existingQuotes: { no?: string }[] = [],
  year: number = new Date().getFullYear()
): string {
  const used = new Set(
    existingQuotes.map((q) => normalizedQuoteNo(q.no)).filter(Boolean)
  );
  const re = new RegExp('^BG-' + String(year) + '-(\\d+)$', 'i');
  let max = 0;
  used.forEach((no) => {
    const m = no.match(re);
    if (m) max = Math.max(max, Number(m[1]) || 0);
  });
  let n = max + 1;
  let candidate = '';
  do {
    candidate = 'BG-' + year + '-' + String(n).padStart(3, '0');
    n++;
  } while (used.has(normalizedQuoteNo(candidate)));
  return candidate;
}

export function normalizePriceCode(v: string | undefined | null): string {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function generateUniquePriceCode(
  existingPrices: { code?: string }[] = [],
  prefix: string = 'CT'
): string {
  const base = String(prefix || 'CT').trim().replace(/[-_\s]+$/, '') || 'CT';
  const existing = new Set(
    existingPrices.map((p) => normalizePriceCode(p.code)).filter(Boolean)
  );
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + esc + '(?:[-_\\s]?)(\\d+)$', 'i');
  let max = 0;
  let width = 3;
  existing.forEach((code) => {
    const m = code.match(re);
    if (m) {
      max = Math.max(max, Number(m[1]) || 0);
      width = Math.max(width, m[1].length);
    }
  });
  let n = Math.max(1, max + 1);
  let code = '';
  do {
    code = base + '-' + String(n).padStart(width, '0');
    n++;
  } while (existing.has(normalizePriceCode(code)));
  return code;
}

export function priceCodePrefixFromCode(code: string | undefined | null): string {
  const src = String(code || '').trim().replace(/[-_\s]*COPY$/i, '').trim();
  if (!src) return 'CT';
  const m = src.match(/^(.*?)(?:[-_\s]?)(\d+)$/);
  if (m && m[1].trim()) return m[1].trim().replace(/[-_\s]+$/, '') || 'CT';
  return src;
}

export function searchKeywordsMatch(text: string, query: string): boolean {
  const terms = String(query || '')
    .toLowerCase()
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
  const haystack = String(text || '').toLowerCase();
  return terms.length === 0 || terms.every((term) => haystack.includes(term));
}
