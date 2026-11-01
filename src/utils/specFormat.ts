/**
 * Helper utilities for parsing and formatting item specifications and details.
 * Vietnamese commercial and engineering quotations commonly use bullet points
 * like "+ ", "- ", "• " or separate lines for technical specifications.
 */

/**
 * Splits specification text into individual lines/bullet items.
 * Handles:
 * - Explicit newlines (\r\n, \n)
 * - Inline bullet separators: "+ " (e.g. "+ Công suất: 2kW + Điện áp: 380V")
 * - Inline bullet separators: "• ", "- "
 */
export function parseSpecLines(detail: string | undefined | null): string[] {
  if (!detail) return [];
  const raw = String(detail).trim();
  if (!raw) return [];

  // Normalize line endings and split
  const rawLines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check if the line contains multiple inline "+ " bullet items:
    // e.g. "+ Công suất: 2,2 kw + Điện áp: 3pha/380v/50hz + Đường kính đầu hút/thổi: DN50"
    if (/(?:^|\s)\+\s+/.test(trimmed)) {
      const parts = trimmed
        .split(/(?:^|\s)\+\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        parts.forEach((p) => result.push(p));
        continue;
      }
    }

    // Check if the line contains multiple inline "• " or "- " bullets
    if (/(?:^|\s)[•\-]\s+/.test(trimmed)) {
      const parts = trimmed
        .split(/(?:^|\s)[•\-]\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        parts.forEach((p) => result.push(p));
        continue;
      }
    }

    // Single line: strip redundant leading bullet symbol (+, -, •, *) if present
    const cleaned = trimmed.replace(/^[+•\-*]\s*/, '').trim();
    if (cleaned) {
      result.push(cleaned);
    }
  }

  return result.length > 0 ? result : [raw];
}

/**
 * Re-joins specification lines into standard multi-line text with "+ " bullets.
 * Useful when copying or applying catalog items to quotes so they display
 * line-by-line in textareas and documents.
 */
export function formatDetailMultiline(detail: string | undefined | null): string {
  if (!detail) return '';
  const lines = parseSpecLines(detail);
  if (lines.length <= 1) return String(detail).trim();
  return lines.map((l) => (l.startsWith('+') ? l : `+ ${l}`)).join('\n');
}
