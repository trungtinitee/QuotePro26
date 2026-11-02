import { CompanyInfo, DossierCommon, DossierDocData, DossierState, Quote } from '../types';
import {
  money,
  moneyPlain,
  formatDecimalInput,
  numberToVietnameseWords,
  formatDateVN,
  dossierDateVN,
} from './currency';
import { parseSpecLines } from './specFormat';

function xmlEsc(v: string | number | undefined | null): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlText(v: string | number | undefined | null): string {
  const s = String(v ?? '');
  if (!s) return '';
  return s
    .split(/\r?\n/)
    .map((x) => xmlEsc(x))
    .join('</w:t><w:br/><w:t xml:space="preserve">');
}

interface RunOptions {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  size?: number; // half-points: 26 = 13pt, 24 = 12pt, 30 = 15pt
  font?: string;
}

function wordRun(text: string, opt: RunOptions = {}): string {
  const t = String(text ?? '');
  if (!t) return '<w:r><w:t></w:t></w:r>';
  const rPr: string[] = [];
  if (opt.bold) rPr.push('<w:b/>');
  if (opt.italic) rPr.push('<w:i/>');
  if (opt.color) rPr.push(`<w:color w:val="${opt.color}"/>`);
  const sz = opt.size || 26; // 13pt default for VN standard
  rPr.push(`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`);
  const font = opt.font || 'Times New Roman';
  rPr.push(
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`
  );
  return `<w:r>${rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlText(t)}</w:t></w:r>`;
}

interface ParaOptions {
  align?: 'left' | 'center' | 'right' | 'both';
  spaceBefore?: number; // twips
  spaceAfter?: number; // twips
  line?: number; // 340 = ~1.4 line
  keepNext?: boolean;
  borderBottom?: boolean;
  borderLeftIndent?: number;
  borderRightIndent?: number;
  indentLeft?: number;
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
  run?: RunOptions;
}

function wordPara(
  parts: (string | { text: string; [key: string]: any })[] | string,
  opt: ParaOptions = {}
): string {
  const pPr: string[] = [];
  if (opt.align) pPr.push(`<w:jc w:val="${opt.align}"/>`);
  if (opt.spaceBefore !== undefined) pPr.push(`<w:spacing w:before="${opt.spaceBefore}"/>`);
  if (opt.spaceAfter !== undefined) pPr.push(`<w:spacing w:after="${opt.spaceAfter}"/>`);
  if (opt.line !== undefined) pPr.push(`<w:spacing w:line="${opt.line}" w:lineRule="auto"/>`);
  if (opt.indentLeft !== undefined) pPr.push(`<w:ind w:left="${opt.indentLeft}"/>`);
  if (opt.keepNext) pPr.push('<w:keepNext/>');
  if (opt.borderBottom) {
    const li = opt.borderLeftIndent ?? 0;
    const ri = opt.borderRightIndent ?? 0;
    pPr.push(`<w:ind w:left="${li}" w:right="${ri}"/>`);
    pPr.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="111111"/></w:pBdr>');
  }
  const defaultRun: RunOptions = {
    bold: opt.bold,
    italic: opt.italic,
    size: opt.size,
    color: opt.color,
    ...(opt.run || {}),
  };
  const runs = Array.isArray(parts)
    ? parts
        .map((x) =>
          typeof x === 'string'
            ? wordRun(x, defaultRun)
            : wordRun(x.text, { ...defaultRun, ...x })
        )
        .join('')
    : wordRun(parts, defaultRun);
  return `<w:p>${pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${runs || '<w:r><w:t></w:t></w:r>'}</w:p>`;
}

const DOSSIER_BORDER =
  '<w:tcBorders><w:top w:val="single" w:sz="6" w:color="111111"/><w:left w:val="single" w:sz="6" w:color="111111"/><w:bottom w:val="single" w:sz="6" w:color="111111"/><w:right w:val="single" w:sz="6" w:color="111111"/></w:tcBorders>';

interface CellPrOptions {
  width?: number;
  shade?: string;
  vAlign?: 'top' | 'center' | 'bottom';
  gridSpan?: number;
  borders?: boolean;
}

function wordCellPr(opt: CellPrOptions = {}): string {
  const p: string[] = [];
  if (opt.width) p.push(`<w:tcW w:w="${opt.width}" w:type="dxa"/>`);
  if (opt.gridSpan) p.push(`<w:gridSpan w:val="${opt.gridSpan}"/>`);
  if (opt.shade) p.push(`<w:shd w:fill="${opt.shade}"/>`);
  if (opt.vAlign) p.push(`<w:vAlign w:val="${opt.vAlign}"/>`);
  if (opt.borders) p.push(DOSSIER_BORDER);
  return p.length ? `<w:tcPr>${p.join('')}</w:tcPr>` : '';
}

function wordCell(paras: string | string[], opt: CellPrOptions = {}): string {
  const cellPr = wordCellPr(opt);
  const body = Array.isArray(paras) ? paras.join('') : paras;
  return `<w:tc>${cellPr}${body || wordPara('', { spaceAfter: 0 })}</w:tc>`;
}

function wordTable(
  rows: string[],
  widths: number[],
  opt: { borders?: boolean; noBorders?: boolean; cellMargin?: number } = {}
): string {
  const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  let tableBorders = '';
  if (opt.borders) {
    tableBorders =
      '<w:tblBorders><w:top w:val="single" w:sz="6" w:color="111111"/><w:left w:val="single" w:sz="6" w:color="111111"/><w:bottom w:val="single" w:sz="6" w:color="111111"/><w:right w:val="single" w:sz="6" w:color="111111"/><w:insideH w:val="single" w:sz="6" w:color="111111"/><w:insideV w:val="single" w:sz="6" w:color="111111"/></w:tblBorders>';
  } else if (opt.noBorders) {
    tableBorders =
      '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  }
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return `<w:tbl><w:tblPr><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${tableBorders}${
    opt.cellMargin
      ? `<w:tblCellMar><w:top w:w="${opt.cellMargin}" w:type="dxa"/><w:start w:w="${opt.cellMargin}" w:type="dxa"/><w:bottom w:w="${opt.cellMargin}" w:type="dxa"/><w:end w:w="${opt.cellMargin}" w:type="dxa"/></w:tblCellMar>`
      : ''
  }</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.join('')}</w:tbl>`;
}

function wordRow(cells: string[], opt: { header?: boolean; cantSplit?: boolean } = {}): string {
  const rp: string[] = [];
  if (opt.header) rp.push('<w:tblHeader/>');
  if (opt.cantSplit) rp.push('<w:cantSplit/>');
  return `<w:tr>${rp.length ? `<w:trPr>${rp.join('')}</w:trPr>` : ''}${cells.join('')}</w:tr>`;
}

function wordFooterXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="555555"/><w:sz w:val="18"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Trang </w:t></w:r><w:fldSimple w:instr="PAGE"/><w:r><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr="NUMPAGES"/></w:p></w:ftr>`;
}

function wordStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="340" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
}

function wordDocumentXml(body: string): string {
  // A4 portrait: width 11906 dxa, height 16838 dxa.
  // Standard VN Admin margins (Nghị định 30/2020/NĐ-CP):
  // Top: 20mm = 1134 dxa, Bottom: 20mm = 1134 dxa, Left: 25mm = 1417 dxa, Right: 15mm = 850 dxa
  const sect = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1417" w:header="500" w:footer="500" w:gutter="0"/><w:cols w:num="1"/><w:docGrid w:linePitch="360"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:lang w:val="vi-VN"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}

function wordContentTypes(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function wordRootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
}

function wordDocRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdStyle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function wordCoreProps(title: string, creator: string): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(title)}</dc:title><dc:creator>${xmlEsc(creator)}</dc:creator><cp:lastModifiedBy>${xmlEsc(creator)}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function wordAppProps(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>QuotePro Dossier</Application></Properties>`;
}

function wordConcat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function wordCrc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function wordZipStore(entries: { name: string; data: string | Uint8Array }[]): Uint8Array {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const e of entries) {
    const name = new TextEncoder().encode(e.name);
    const data = typeof e.data === 'string' ? new TextEncoder().encode(e.data) : e.data;
    const crc = wordCrc32(data);
    const lh = new Uint8Array(30 + name.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, dosTime, true);
    dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, name.length, true);
    dv.setUint16(28, 0, true);
    lh.set(name, 30);
    local.push(wordConcat([lh, data]));

    const ch = new Uint8Array(46 + name.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(name, 46);
    central.push(ch);
    offset += 30 + name.length + data.length;
  }

  const cent = wordConcat(central);
  const loc = wordConcat(local);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cent.length, true);
  ev.setUint32(16, loc.length, true);
  ev.setUint16(20, 0, true);
  return wordConcat([loc, cent, end]);
}

/**
 * Splits multiline paragraph text into individual Word paragraphs
 */
function textToParas(
  rawText: string,
  opt: ParaOptions = {}
): string[] {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    return wordPara(line, {
      align: opt.align ?? 'both',
      line: opt.line ?? 340,
      spaceBefore: opt.spaceBefore ?? 20,
      spaceAfter: opt.spaceAfter ?? 60,
      run: opt.run ?? { size: 26, font: 'Times New Roman' },
    });
  });
}

/**
 * Builds standard National Letterhead Table (Nghị định 30/2020/NĐ-CP)
 */
function buildWordLetterhead(
  companyName: string,
  docNumber: string,
  location: string,
  dateStr: string
): string {
  const leftCellParas = [
    wordPara([{ text: companyName, bold: true, size: 23, font: 'Times New Roman' }], {
      align: 'center',
      spaceBefore: 0,
      spaceAfter: 30,
      line: 280,
    }),
    wordPara('', {
      align: 'center',
      borderBottom: true,
      borderLeftIndent: 1200,
      borderRightIndent: 1200,
      spaceAfter: 30,
    }),
    wordPara([{ text: `Số: ${docNumber}`, size: 22, font: 'Times New Roman' }], {
      align: 'center',
      spaceAfter: 40,
    }),
  ];

  const rightCellParas = [
    wordPara([{ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 22, font: 'Times New Roman' }], {
      align: 'center',
      spaceBefore: 0,
      spaceAfter: 20,
      line: 260,
    }),
    wordPara([{ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 24, font: 'Times New Roman' }], {
      align: 'center',
      spaceAfter: 30,
      line: 280,
    }),
    wordPara('', {
      align: 'center',
      borderBottom: true,
      borderLeftIndent: 1000,
      borderRightIndent: 1000,
      spaceAfter: 40,
    }),
    wordPara([{ text: `${location ? `${location}, ` : ''}${dossierDateVN(dateStr)}`, italic: true, size: 23, font: 'Times New Roman' }], {
      align: 'center',
      spaceAfter: 40,
    }),
  ];

  return wordTable(
    [
      wordRow([
        wordCell(leftCellParas, { width: 4600, vAlign: 'top' }),
        wordCell(rightCellParas, { width: 5039, vAlign: 'top' }),
      ]),
    ],
    [4600, 5039],
    { noBorders: true, cellMargin: 0 }
  );
}

/**
 * Builds standard signature block (2 or 3 columns)
 */
function buildWordSignatures(
  columns: { title: string; subtitle: string; signer: string }[]
): string {
  const count = columns.length;
  const totalW = 9639;
  const colW = Math.floor(totalW / count);
  const widths = Array(count).fill(colW);

  const cells = columns.map((col) => {
    const paras = [
      wordPara([{ text: col.title, bold: true, size: 24, font: 'Times New Roman' }], {
        align: 'center',
        spaceBefore: 60,
        spaceAfter: 20,
      }),
      wordPara([{ text: col.subtitle, italic: true, size: 21, font: 'Times New Roman' }], {
        align: 'center',
        spaceAfter: 850, // Space for physical signature and stamp
      }),
      wordPara([{ text: col.signer, bold: true, size: 24, font: 'Times New Roman' }], {
        align: 'center',
        spaceAfter: 40,
      }),
    ];
    return wordCell(paras, { width: colW, vAlign: 'top' });
  });

  return wordTable([wordRow(cells, { cantSplit: true })], widths, { noBorders: true, cellMargin: 0 });
}

/**
 * Builds items quotation/equipment table in Word
 */
function buildWordItemsTable(
  rows: Quote['rows'],
  isContract: boolean,
  isDelivery: boolean
): string {
  const totalW = 9639;
  let widths: number[];
  let headers: string[];

  if (isContract) {
    // STT (5%), Tên (47%), ĐVT (8%), SL (8%), Đơn giá (16%), Thành tiền (16%)
    widths = [500, 4539, 800, 800, 1500, 1500];
    headers = ['STT', 'Tên hàng hóa, quy cách kỹ thuật chi tiết', 'ĐVT', 'SL', 'Đơn giá (đ)', 'Thành tiền (đ)'];
  } else if (isDelivery) {
    // STT (5%), Tên (53%), ĐVT (9%), SL (9%), Tình trạng thực tế (24%)
    widths = [500, 5139, 850, 850, 2300];
    headers = ['STT', 'Tên hàng hóa, quy cách kỹ thuật chi tiết', 'ĐVT', 'SL', 'Tình trạng thực tế'];
  } else {
    // STT (5%), Tên (51%), ĐVT (9%), SL (9%), Kết luận (13%), Ghi chú (13%)
    widths = [500, 4939, 800, 800, 1300, 1300];
    headers = ['STT', 'Tên hàng hóa, quy cách kỹ thuật chi tiết', 'ĐVT', 'SL', 'Kết luận', 'Ghi chú'];
  }

  const tableRows: string[] = [];

  // 1. Header row
  const headerCells = headers.map((h, i) =>
    wordCell(
      [
        wordPara([{ text: h, bold: true, size: 21, font: 'Times New Roman' }], {
          align: 'center',
          spaceBefore: 40,
          spaceAfter: 40,
          line: 260,
        }),
      ],
      { width: widths[i], shade: 'F1F5F9', borders: true, vAlign: 'center' }
    )
  );
  tableRows.push(wordRow(headerCells, { header: true, cantSplit: true }));

  // 2. Data rows
  let itemIndex = 0;
  (rows || []).forEach((r) => {
    if (r.type === 'heading') {
      const headingCell = wordCell(
        [
          wordPara([{ text: r.title || '', bold: true, size: 22, font: 'Times New Roman' }], {
            align: 'left',
            spaceBefore: 40,
            spaceAfter: 40,
          }),
        ],
        { width: totalW, gridSpan: widths.length, shade: 'F8FAFC', borders: true }
      );
      tableRows.push(wordRow([headingCell], { cantSplit: true }));
      return;
    }

    if (r.type === 'subheading') {
      const subCell = wordCell(
        [
          wordPara([{ text: r.title || '', bold: true, italic: true, size: 21, font: 'Times New Roman' }], {
            align: 'left',
            spaceBefore: 30,
            spaceAfter: 30,
          }),
        ],
        { width: totalW, gridSpan: widths.length, shade: 'FAFAFA', borders: true }
      );
      tableRows.push(wordRow([subCell], { cantSplit: true }));
      return;
    }

    if (r.type === 'subtotal') return;

    itemIndex++;
    const total = (Number(r.price) || 0) * (Number(r.qty) || 0);

    const nameParas: string[] = [
      wordPara([{ text: r.itemName || r.name || '', bold: true, size: 21, font: 'Times New Roman' }], {
        align: 'left',
        spaceBefore: 20,
        spaceAfter: r.itemName && r.name && r.name !== r.itemName ? 10 : 20,
        line: 260,
      }),
    ];

    if (r.itemName && r.name && r.name !== r.itemName) {
      const specLines = parseSpecLines(r.name);
      specLines.forEach((sl) => {
        nameParas.push(
          wordPara([{ text: `+ ${sl}`, size: 19, color: '333333', font: 'Times New Roman' }], {
            align: 'left',
            spaceBefore: 5,
            spaceAfter: 15,
            line: 240,
            indentLeft: 120,
          })
        );
      });
    }

    const rowCells: string[] = [];

    // Col 0: STT
    rowCells.push(
      wordCell(
        [wordPara([{ text: String(itemIndex), size: 20, font: 'Times New Roman' }], { align: 'center', spaceBefore: 30, spaceAfter: 30 })],
        { width: widths[0], borders: true, vAlign: 'top' }
      )
    );

    // Col 1: Tên & quy cách
    rowCells.push(wordCell(nameParas, { width: widths[1], borders: true, vAlign: 'top' }));

    // Col 2: ĐVT
    rowCells.push(
      wordCell(
        [wordPara([{ text: r.unit || 'cái', size: 20, font: 'Times New Roman' }], { align: 'center', spaceBefore: 30, spaceAfter: 30 })],
        { width: widths[2], borders: true, vAlign: 'top' }
      )
    );

    // Col 3: SL
    rowCells.push(
      wordCell(
        [wordPara([{ text: formatDecimalInput(r.qty), size: 20, font: 'Times New Roman' }], { align: 'center', spaceBefore: 30, spaceAfter: 30 })],
        { width: widths[3], borders: true, vAlign: 'top' }
      )
    );

    if (isContract) {
      // Đơn giá
      rowCells.push(
        wordCell(
          [wordPara([{ text: moneyPlain(r.price), size: 20, font: 'Times New Roman' }], { align: 'right', spaceBefore: 30, spaceAfter: 30 })],
          { width: widths[4], borders: true, vAlign: 'top' }
        )
      );
      // Thành tiền
      rowCells.push(
        wordCell(
          [wordPara([{ text: moneyPlain(total), bold: true, size: 20, font: 'Times New Roman' }], { align: 'right', spaceBefore: 30, spaceAfter: 30 })],
          { width: widths[5], borders: true, vAlign: 'top' }
        )
      );
    } else if (isDelivery) {
      rowCells.push(
        wordCell(
          [wordPara([{ text: 'Mới 100%, nguyên đai nguyên kiện, kèm CO/CQ', size: 19, font: 'Times New Roman' }], { align: 'center', spaceBefore: 30, spaceAfter: 30 })],
          { width: widths[4], borders: true, vAlign: 'top' }
        )
      );
    } else {
      rowCells.push(
        wordCell(
          [wordPara([{ text: 'Đạt yêu cầu kỹ thuật', bold: true, size: 19, font: 'Times New Roman' }], { align: 'center', spaceBefore: 30, spaceAfter: 30 })],
          { width: widths[4], borders: true, vAlign: 'top' }
        )
      );
      rowCells.push(
        wordCell(
          [wordPara([{ text: 'Mới 100%, đồng bộ', size: 19, font: 'Times New Roman' }], { align: 'center', spaceBefore: 30, spaceAfter: 30 })],
          { width: widths[5], borders: true, vAlign: 'top' }
        )
      );
    }

    tableRows.push(wordRow(rowCells, { cantSplit: true }));
  });

  return wordTable(tableRows, widths, { borders: true, cellMargin: 40 });
}

/**
 * Main structured Word document generator for Dossier
 */
export async function exportDossierDocToWord(
  activeType: string,
  dossier: DossierState,
  currentQuote: Quote,
  company: CompanyInfo,
  grandTotal: number,
  filename: string
): Promise<void> {
  const currentDocData: DossierDocData = dossier.docs?.[activeType] || {};
  const partyBName =
    dossier.customTexts?.['partyB_name'] ||
    dossier.common.partyB.name ||
    company.name ||
    'CÔNG TY TNHH TƯ VẤN – ĐẦU TƯ MÔI TRƯỜNG D-V-N';
  const contractNo = dossier.common.contractNo || currentQuote.no || '01/2026/HĐKT';
  const docDate = currentDocData.date || dossier.common.contractDate || currentQuote.date || new Date().toISOString().split('T')[0];
  const docLocation = currentDocData.location || dossier.common.location || 'Đồng Tháp';

  const bodyParas: string[] = [];

  // Helper to retrieve custom text or fallback
  const getCustom = (key: string, defText: string) =>
    dossier.customTexts?.[`${activeType}_${key}`] ?? defText;

  // 1. National Letterhead
  let docNoDisplay = currentDocData.no;
  if (!docNoDisplay) {
    switch (activeType) {
      case 'contract':
        docNoDisplay = contractNo;
        break;
      case 'deliveryReceipt':
        docNoDisplay = `BBGN/${contractNo}`;
        break;
      case 'handover':
        docNoDisplay = `BBBG/${contractNo}`;
        break;
      case 'installAcceptance':
        docNoDisplay = `BBNT-LĐ/${contractNo}`;
        break;
      case 'completionAcceptance':
        docNoDisplay = `BBNT-HT/${contractNo}`;
        break;
      case 'liquidation':
        docNoDisplay = `BBTL/${contractNo}`;
        break;
      case 'paymentRequest':
        docNoDisplay = `GĐNTT/${contractNo}`;
        break;
      default:
        docNoDisplay = contractNo;
    }
  }

  bodyParas.push(buildWordLetterhead(partyBName, docNoDisplay, docLocation, docDate));
  bodyParas.push(wordPara('', { spaceAfter: 120 }));

  // 2. Document Title & Subtitle
  let title = 'VĂN BẢN HỒ SƠ';
  let subtitle = '';

  switch (activeType) {
    case 'contract':
      title = 'HỢP ĐỒNG KINH TẾ';
      subtitle = `V/v: ${dossier.common.workTitle || dossier.common.project}`;
      break;
    case 'deliveryReceipt':
      title = 'BIÊN BẢN GIAO NHẬN THIẾT BỊ VÀ VẬT TƯ';
      subtitle = `Căn cứ Hợp đồng kinh tế số: ${contractNo} ngày ${formatDateVN(dossier.common.contractDate)}`;
      break;
    case 'handover':
      title = 'BIÊN BẢN BÀN GIAO THIẾT BỊ & HỒ SƠ KỸ THUẬT';
      subtitle = `Công trình: ${dossier.common.workTitle || dossier.common.project}`;
      break;
    case 'installAcceptance':
      title = 'BIÊN BẢN NGHIỆM THU LẮP ĐẶT & CHẠY THỬ THIẾT BỊ';
      subtitle = `Hạng mục: ${dossier.common.workTitle || dossier.common.project}`;
      break;
    case 'completionAcceptance':
      title = 'BIÊN BẢN NGHIỆM THU HOÀN THÀNH ĐƯA VÀO SỬ DỤNG';
      subtitle = `Công trình / Dự án: ${dossier.common.workTitle || dossier.common.project}`;
      break;
    case 'liquidation':
      title = 'BIÊN BẢN THANH LÝ HỢP ĐỒNG KINH TẾ';
      subtitle = `Hợp đồng số: ${contractNo} ký ngày ${formatDateVN(dossier.common.contractDate)}`;
      break;
    case 'paymentRequest':
      title = 'GIẤY ĐỀ NGHỊ THANH TOÁN';
      subtitle = `V/v: Quyết toán Hợp đồng kinh tế số ${contractNo}`;
      break;
  }

  bodyParas.push(
    wordPara([{ text: title, bold: true, size: 30, font: 'Times New Roman' }], {
      align: 'center',
      spaceBefore: 60,
      spaceAfter: 30,
      line: 360,
      keepNext: true,
    })
  );

  if (subtitle) {
    bodyParas.push(
      wordPara(
        [{ text: subtitle, bold: true, italic: true, size: 25, font: 'Times New Roman' }],
        {
          align: 'center',
          spaceBefore: 10,
          spaceAfter: 140,
          line: 320,
          keepNext: true,
        }
      )
    );
  }

  // 3. Document Body by Type
  if (activeType === 'contract') {
    const basisText = getCustom(
      'basis',
      `- Căn cứ Bộ Luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015 của Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam;\n- Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14 tháng 06 năm 2005 của Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam;\n- Căn cứ vào Bảng báo giá đã được Bên A phê duyệt và chấp thuận ký hợp đồng;\n- Căn cứ vào nhu cầu thực tế của Bên A và năng lực đáp ứng của Bên B.`
    );
    bodyParas.push(...textToParas(basisText));

    const introText = getCustom(
      'intro',
      `Hôm nay, ${dossierDateVN(dossier.common.contractDate)}, tại ${dossier.common.location}, hai bên chúng tôi gồm có:`
    );
    bodyParas.push(...textToParas(introText, { spaceBefore: 60 }));

    // Party A & B Info
    const partyAParas = [
      wordPara([{ text: '1. ĐẠI DIỆN BÊN GIAO THẦU (BÊN A):', bold: true, size: 26 }], { spaceBefore: 60, spaceAfter: 20 }),
      wordPara([{ text: `- Tên đơn vị: ${dossier.common.partyA.name}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Người đại diện: ${dossier.common.partyA.rep}        Chức vụ: ${dossier.common.partyA.title}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Địa chỉ trụ sở: ${dossier.common.partyA.address}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Số điện thoại: ${dossier.common.partyA.phone || '—'}        Mã số thuế: ${dossier.common.partyA.tax || '—'}` }], { spaceBefore: 10, spaceAfter: 30, indentLeft: 200 }),
    ];
    bodyParas.push(...partyAParas);

    const partyBParas = [
      wordPara([{ text: '2. ĐẠI DIỆN BÊN NHẬN THẦU (BÊN B):', bold: true, size: 26 }], { spaceBefore: 40, spaceAfter: 20 }),
      wordPara([{ text: `- Tên đơn vị: ${dossier.common.partyB.name}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Người đại diện: ${dossier.common.partyB.rep}        Chức vụ: ${dossier.common.partyB.title}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Địa chỉ trụ sở: ${dossier.common.partyB.address}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Số điện thoại: ${dossier.common.partyB.phone}        Mã số thuế: ${dossier.common.partyB.tax}` }], { spaceBefore: 10, spaceAfter: 15, indentLeft: 200 }),
      wordPara([{ text: `- Tài khoản ngân hàng: ${dossier.common.partyB.bank}` }], { spaceBefore: 10, spaceAfter: 40, indentLeft: 200 }),
    ];
    bodyParas.push(...partyBParas);

    bodyParas.push(
      wordPara('Hai bên cùng nhau bàn bạc và thống nhất ký kết hợp đồng kinh tế với các điều khoản cụ thể sau đây:', {
        spaceBefore: 40,
        spaceAfter: 60,
      })
    );

    // Điều 1
    bodyParas.push(wordPara('Điều 1. Nội dung công việc và danh mục thiết bị', { bold: true, spaceBefore: 60, spaceAfter: 20 } as any));
    const art1Text = getCustom(
      'article1',
      `Bên B nhận thực hiện công việc ${dossier.common.workTitle || dossier.common.project} cho Bên A theo chi tiết khối lượng, quy cách và đơn giá như sau:`
    );
    bodyParas.push(...textToParas(art1Text));

    bodyParas.push(buildWordItemsTable(currentQuote.rows, true, false));

    bodyParas.push(
      wordPara(
        `Tổng giá trị thanh toán: ${money(grandTotal)} đồng (Đã bao gồm thuế GTGT ${formatDecimalInput(currentQuote.vat)}%)`,
        { align: 'right', bold: true, spaceBefore: 40, spaceAfter: 20 } as any
      )
    );
    bodyParas.push(
      wordPara(`(Bằng chữ: ${numberToVietnameseWords(grandTotal)})`, { align: 'right', italic: true, spaceAfter: 60 })
    );

    // Điều 2
    bodyParas.push(wordPara('Điều 2. Giá trị hợp đồng và Phương thức thanh toán', { bold: true, spaceBefore: 60, spaceAfter: 20 } as any));
    const art2Text = getCustom(
      'article2',
      `- Tổng giá trị hợp đồng trọn gói là: ${money(grandTotal)} đồng (Bằng chữ: ${numberToVietnameseWords(grandTotal)}). Giá trên đã bao gồm thuế GTGT, chi phí vận chuyển, lắp đặt, bảo hành và các chi phí liên quan.\n- Phương thức thanh toán: Chuyển khoản vào tài khoản ngân hàng của Bên B.\n- Tiến độ thanh toán:\n+ Đợt 1: Bên A tạm ứng ${currentDocData.advanceRate ?? 30}% giá trị hợp đồng, tương đương ${money(currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100))} đồng ngay sau khi ký hợp đồng để Bên B chuẩn bị vật tư thiết bị.\n+ Đợt 2: Bên A thanh toán ${100 - (currentDocData.advanceRate ?? 30)}% giá trị còn lại, tương đương ${money(currentDocData.remainingAmount ?? (grandTotal - Math.round((grandTotal * 30) / 100)))} đồng trong vòng ${currentDocData.paymentDays || '05'} ngày làm việc kể từ ngày ký Biên bản nghiệm thu hoàn thành đưa vào sử dụng và nhận đầy đủ hóa đơn GTGT hợp lệ.`
    );
    bodyParas.push(...textToParas(art2Text));

    // Điều 3
    bodyParas.push(wordPara('Điều 3. Thời gian, tiến độ và địa điểm thực hiện', { bold: true, spaceBefore: 60, spaceAfter: 20 } as any));
    const art3Text = getCustom(
      'article3',
      `- Thời gian thi công, thực hiện: ${dossier.common.executionPeriod}.\n- Địa điểm bàn giao và lắp đặt: ${dossier.common.location}.\n- Thời hạn bảo hành: ${dossier.common.warranty}.`
    );
    bodyParas.push(...textToParas(art3Text));

    // Điều 4
    bodyParas.push(wordPara('Điều 4. Tiêu chuẩn kỹ thuật và nghiệm thu bàn giao', { bold: true, spaceBefore: 60, spaceAfter: 20 } as any));
    const art4Text = getCustom(
      'article4',
      `- Hàng hóa, thiết bị cung cấp mới 100%, đúng nhãn hiệu, chủng loại và các thông số kỹ thuật đã cam kết, có đầy đủ chứng chỉ chất lượng xuất xưởng CO/CQ (nếu có).\n- Sau khi hoàn thành lắp đặt, hai bên sẽ tiến hành chạy thử liên động và ký Biên bản nghiệm thu hoàn thành đưa vào sử dụng chính thức.`
    );
    bodyParas.push(...textToParas(art4Text));

    // Điều 5
    bodyParas.push(wordPara('Điều 5. Quyền và nghĩa vụ của các bên', { bold: true, spaceBefore: 60, spaceAfter: 20 } as any));
    const art5Text = getCustom(
      'article5',
      `- Quyền và nghĩa vụ của Bên A: Bàn giao mặt bằng thi công, cung cấp nguồn điện nước phục vụ thi công chạy thử; cử cán bộ giám sát và nghiệm thu; thực hiện thanh toán đúng tiến độ đã thỏa thuận.\n- Quyền và nghĩa vụ của Bên B: Cung cấp thiết bị, vật tư đúng chủng loại và tiến độ; thi công đảm bảo an toàn lao động và vệ sinh môi trường; xuất hóa đơn tài chính hợp lệ cho Bên A; chịu trách nhiệm bảo hành thiết bị theo đúng cam kết.`
    );
    bodyParas.push(...textToParas(art5Text));

    // Điều 6
    bodyParas.push(wordPara('Điều 6. Điều khoản thi hành', { bold: true, spaceBefore: 60, spaceAfter: 20 } as any));
    const art6Text = getCustom(
      'article6',
      `- Hai bên cam kết thực hiện nghiêm túc mọi điều khoản đã thỏa thuận trong hợp đồng. Mọi sửa đổi, bổ sung phải được lập thành văn bản hoặc phụ lục hợp đồng.\n- Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành ${Number(dossier.common.copiesA || 2) + Number(dossier.common.copiesB || 2)} bản, Bên A giữ ${dossier.common.copiesA || '02'} bản, Bên B giữ ${dossier.common.copiesB || '02'} bản có giá trị pháp lý như nhau./.`
    );
    bodyParas.push(...textToParas(art6Text));

    // Signatures
    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'ĐẠI DIỆN BÊN B',
          subtitle: `(${dossier.common.partyB.title || 'Giám đốc'} - Ký, đóng dấu)`,
          signer: dossier.common.partyB.rep,
        },
        {
          title: 'ĐẠI DIỆN BÊN A',
          subtitle: `(${dossier.common.partyA.title || 'Giám đốc'} - Ký, đóng dấu)`,
          signer: dossier.common.partyA.rep,
        },
      ])
    );
  } else if (activeType === 'deliveryReceipt') {
    const intro = getCustom(
      'intro',
      `Hôm nay, vào lúc ${currentDocData.handoverTime || '09 giờ 00 phút'} ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)}, tại ${currentDocData.location || dossier.common.location}.\nChúng tôi gồm các đại diện có mặt dưới đây:\n1. ĐẠI DIỆN BÊN GIAO (BÊN B): ${dossier.common.partyB.name}\n- Ông/Bà: ${currentDocData.senderName || dossier.common.partyB.rep}        Chức vụ: ${dossier.common.partyB.title || 'Kỹ thuật viên'}\n2. ĐẠI DIỆN BÊN NHẬN (BÊN A): ${dossier.common.partyA.name}\n- Ông/Bà: ${currentDocData.receiverName || dossier.common.partyA.rep}        Chức vụ: ${dossier.common.partyA.title || 'Thủ kho / Phụ trách'}\nHai bên tiến hành kiểm đếm và giao nhận số lượng thiết bị, hàng hóa phục vụ thi công công trình theo bảng kê chi tiết dưới đây:`
    );
    bodyParas.push(...textToParas(intro));

    bodyParas.push(buildWordItemsTable(currentQuote.rows, false, true));

    bodyParas.push(wordPara('Ý kiến nhận xét & Đánh giá ngoại quan:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const remarks = getCustom(
      'remarks',
      `- Toàn bộ thiết bị, vật tư được giao nhận đầy đủ về chủng loại và số lượng theo hợp đồng.\n- Tình trạng hàng hóa: Mới 100%, nguyên đai nguyên kiện, không bị móp méo, trầy xước hay rách hỏng tem niêm phong.\n- Kèm theo: Đầy đủ chứng chỉ CO/CQ và tài liệu hướng dẫn lắp đặt của nhà sản xuất.`
    );
    bodyParas.push(...textToParas(remarks));

    const conclusion = getCustom(
      'conclusion',
      'Kể từ thời điểm ký biên bản này, Bên A có trách nhiệm quản lý, bảo quản an toàn hàng hóa tại công trình. Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản làm cơ sở thực hiện các bước tiếp theo./.'
    );
    bodyParas.push(...textToParas(conclusion, { spaceBefore: 40 }));

    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'ĐẠI DIỆN BÊN GIAO',
          subtitle: '(Ký, ghi rõ họ tên)',
          signer: currentDocData.senderName || dossier.common.partyB.rep,
        },
        {
          title: 'ĐẠI DIỆN BÊN NHẬN',
          subtitle: '(Ký, ghi rõ họ tên)',
          signer: currentDocData.receiverName || dossier.common.partyA.rep,
        },
      ])
    );
  } else if (activeType === 'handover') {
    const basis = getCustom(
      'basis',
      `- Căn cứ Hợp đồng kinh tế số: ${contractNo} ngày ${formatDateVN(dossier.common.contractDate)};\n- Căn cứ quá trình vận chuyển và tập kết thiết bị tại hiện trường công trình ${dossier.common.location}.`
    );
    bodyParas.push(...textToParas(basis));

    const intro = getCustom(
      'intro',
      `Hôm nay, ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)}, các bên gồm có:\n1. Bên bàn giao (Bên B): ${dossier.common.partyB.name} - Đại diện: ${dossier.common.partyB.rep} (${dossier.common.partyB.title})\n2. Bên tiếp nhận (Bên A): ${dossier.common.partyA.name} - Đại diện: ${dossier.common.partyA.rep} (${dossier.common.partyA.title})`
    );
    bodyParas.push(...textToParas(intro, { spaceBefore: 40 }));

    bodyParas.push(wordPara('I. Danh mục thiết bị bàn giao:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    bodyParas.push(buildWordItemsTable(currentQuote.rows, false, false));

    bodyParas.push(wordPara('II. Hồ sơ và tài liệu kỹ thuật bàn giao kèm theo:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const docs = getCustom(
      'documents',
      `1. Bản vẽ sơ đồ công nghệ và hướng dẫn đấu nối thiết bị: 01 bộ.\n2. Catalogue kỹ thuật và hướng dẫn vận hành bảo dưỡng: 01 bộ.\n3. Phiếu bảo hành chính hãng của nhà sản xuất: Đầy đủ theo thiết bị.\n4. Chứng nhận chất lượng xuất xưởng CO, CQ: 01 bản sao y.`
    );
    bodyParas.push(...textToParas(docs));

    bodyParas.push(wordPara('III. Kết luận:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const conclusion = getCustom(
      'conclusion',
      'Hai bên thống nhất bàn giao toàn bộ thiết bị và hồ sơ kỹ thuật nêu trên. Thiết bị được tập kết đồng bộ, an toàn tại mặt bằng công trình, sẵn sàng cho công tác lắp đặt và đấu nối kỹ thuật./.'
    );
    bodyParas.push(...textToParas(conclusion));

    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'ĐẠI DIỆN BÊN B',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyB.rep,
        },
        {
          title: 'ĐẠI DIỆN BÊN A',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyA.rep,
        },
      ])
    );
  } else if (activeType === 'installAcceptance') {
    const basis = getCustom(
      'basis',
      `- Căn cứ Hợp đồng kinh tế số: ${contractNo} ngày ${formatDateVN(dossier.common.contractDate)};\n- Căn cứ hồ sơ thiết kế kỹ thuật và quy chuẩn thi công cơ điện hiện hành;\n- Căn cứ kết quả kiểm tra lắp đặt và chạy thử thực tế tại công trình ${dossier.common.location}.`
    );
    bodyParas.push(...textToParas(basis));

    const intro = getCustom(
      'intro',
      `Thời gian nghiệm thu: Bắt đầu từ ${currentDocData.acceptanceTime || '14 giờ 30 phút'} ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)}.\n1. Đại diện Bên A (Chủ đầu tư / Bên mua): ${dossier.common.partyA.name} - Ông/Bà: ${dossier.common.partyA.rep} (${dossier.common.partyA.title})\n2. Đại diện Bên B (Đơn vị cung cấp & thi công): ${dossier.common.partyB.name} - Ông/Bà: ${dossier.common.partyB.rep} (${dossier.common.partyB.title})`
    );
    bodyParas.push(...textToParas(intro, { spaceBefore: 40 }));

    bodyParas.push(wordPara('I. Nội dung kiểm tra và nghiệm thu công tác lắp đặt:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const content = getCustom(
      'content',
      `1. Kiểm tra vị trí lắp đặt, kết cấu giá đỡ, bệ máy và liên kết cơ khí: Đúng vị trí thiết kế, chắc chắn.\n2. Kiểm tra đấu nối đường ống công nghệ và hệ thống điện động lực/điều khiển: Kín khít, an toàn, có hệ thống tiếp địa chống giật.\n3. Chạy thử không tải và chạy thử có tải liên tục: Thiết bị vận hành ổn định, độ ồn và độ rung nằm trong giới hạn tiêu chuẩn cho phép.`
    );
    bodyParas.push(...textToParas(content));

    bodyParas.push(wordPara('II. Danh mục thiết bị được nghiệm thu lắp đặt:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    bodyParas.push(buildWordItemsTable(currentQuote.rows, false, false));

    bodyParas.push(wordPara('III. Đánh giá chất lượng và Kết luận:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const conclusion = getCustom(
      'conclusion',
      `- Đánh giá: Công tác cung cấp và lắp đặt thiết bị được thực hiện đúng quy trình kỹ thuật, đạt yêu cầu thẩm mỹ và an toàn vận hành.\n- Kết luận: ${currentDocData.conclusion || 'Hai bên thống nhất nghiệm thu công tác lắp đặt và chạy thử thiết bị, đồng ý cho phép chuyển sang giai đoạn vận hành liên động thử nghiệm và nghiệm thu hoàn thành đưa vào sử dụng chính thức./.'}`
    );
    bodyParas.push(...textToParas(conclusion));

    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'ĐẠI DIỆN BÊN B',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyB.rep,
        },
        {
          title: 'ĐẠI DIỆN BÊN A',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyA.rep,
        },
      ])
    );
  } else if (activeType === 'completionAcceptance') {
    const basis = getCustom(
      'basis',
      `- Căn cứ Hợp đồng kinh tế số: ${contractNo} ngày ${formatDateVN(dossier.common.contractDate)};\n- Căn cứ Biên bản nghiệm thu lắp đặt và chạy thử thiết bị ngày ${formatDateVN(dossier.common.contractDate)};\n- Căn cứ kết quả vận hành ổn định và đạt tiêu chuẩn chất lượng tại công trình ${dossier.common.location}.`
    );
    bodyParas.push(...textToParas(basis));

    const intro = getCustom(
      'intro',
      `Hôm nay, ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)}, tại công trình. Chúng tôi gồm có:\n1. Đại diện Bên A (Chủ đầu tư): ${dossier.common.partyA.name} - Đại diện: ${dossier.common.partyA.rep} (${dossier.common.partyA.title})\n2. Đại diện Bên B (Đơn vị thi công): ${dossier.common.partyB.name} - Đại diện: ${dossier.common.partyB.rep} (${dossier.common.partyB.title})`
    );
    bodyParas.push(...textToParas(intro, { spaceBefore: 40 }));

    bodyParas.push(wordPara('I. Đánh giá công việc hoàn thành:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const evalText = getCustom(
      'evaluation',
      `1. Về khối lượng: Bên B đã hoàn thành 100% khối lượng công việc, cung cấp và lắp đặt đầy đủ toàn bộ thiết bị theo Hợp đồng số ${contractNo}.\n2. Về chất lượng: Toàn bộ hệ thống máy móc thiết bị vận hành êm, đạt đầy đủ các thông số công suất và kỹ thuật cam kết, đảm bảo an toàn lao động và vệ sinh môi trường.\n3. Về hồ sơ tài liệu: Bên B đã bàn giao đầy đủ chứng từ xuất xưởng, hướng dẫn vận hành và phiếu bảo hành chính hãng cho Bên A.`
    );
    bodyParas.push(...textToParas(evalText));

    bodyParas.push(wordPara('II. Chi tiết danh mục thiết bị hoàn thành bàn giao:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    bodyParas.push(buildWordItemsTable(currentQuote.rows, false, false));

    bodyParas.push(wordPara('III. Kết luận nghiệm thu bàn giao:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const conclusion = getCustom(
      'conclusion',
      `- Hai bên thống nhất nghiệm thu hoàn thành toàn bộ công việc và chính thức bàn giao công trình/thiết bị cho Bên A đưa vào khai thác sử dụng kể từ ngày ký biên bản này.\n- Thời hạn bảo hành: ${dossier.common.warranty}, bắt đầu tính từ ngày ký biên bản nghiệm thu hoàn thành này.\n- Biên bản này là căn cứ pháp lý để hai bên tiến hành thanh lý hợp đồng và quyết toán tài chính./.`
    );
    bodyParas.push(...textToParas(conclusion));

    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'ĐẠI DIỆN BÊN B',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyB.rep,
        },
        {
          title: 'ĐẠI DIỆN BÊN A',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyA.rep,
        },
      ])
    );
  } else if (activeType === 'liquidation') {
    const basis = getCustom(
      'basis',
      `- Căn cứ Hợp đồng kinh tế số: ${contractNo} ngày ${formatDateVN(dossier.common.contractDate)};\n- Căn cứ Biên bản nghiệm thu hoàn thành đưa vào sử dụng ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)}.`
    );
    bodyParas.push(...textToParas(basis));

    const intro = getCustom(
      'intro',
      `Hôm nay, ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)}, tại ${dossier.common.location}. Hai bên gồm có:\n1. Bên A: ${dossier.common.partyA.name} - Đại diện: ${dossier.common.partyA.rep} (${dossier.common.partyA.title})\n2. Bên B: ${dossier.common.partyB.name} - Đại diện: ${dossier.common.partyB.rep} (${dossier.common.partyB.title})\nHai bên cùng nhau thống nhất ký biên bản thanh lý hợp đồng kinh tế với các nội dung chi tiết sau:`
    );
    bodyParas.push(...textToParas(intro, { spaceBefore: 40 }));

    // Điều 1
    bodyParas.push(wordPara('Điều 1. Nội dung công việc thực hiện', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const art1 = getCustom(
      'article1',
      `Bên B đã hoàn thành toàn bộ công tác cung cấp và lắp đặt thiết bị cho Bên A theo đúng nội dung và yêu cầu kỹ thuật quy định trong Hợp đồng số ${contractNo}. Toàn bộ công việc đã được nghiệm thu bàn giao đưa vào sử dụng.`
    );
    bodyParas.push(...textToParas(art1));

    // Điều 2
    bodyParas.push(wordPara('Điều 2. Quyết toán giá trị hợp đồng', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const advancePaid = currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100);
    const remainingToPay = currentDocData.remainingAmount ?? (grandTotal - advancePaid);

    bodyParas.push(
      wordPara(`- Giá trị hợp đồng ký kết ban đầu: ${money(grandTotal)} đồng.`, { indentLeft: 200, spaceAfter: 15 }),
      wordPara('- Giá trị phát sinh tăng / giảm: 0 đồng.', { indentLeft: 200, spaceAfter: 15 }),
      wordPara(`- Tổng giá trị nghiệm thu quyết toán: ${money(grandTotal)} đồng (Đã bao gồm thuế GTGT ${formatDecimalInput(currentQuote.vat)}%).`, { indentLeft: 200, spaceAfter: 15, bold: true } as any),
      wordPara(`(Bằng chữ: ${numberToVietnameseWords(grandTotal)}).`, { indentLeft: 400, italic: true, spaceAfter: 20 }),
      wordPara(`- Số tiền Bên A đã thanh toán tạm ứng: ${money(advancePaid)} đồng.`, { indentLeft: 200, spaceAfter: 15 }),
      wordPara(`- Số tiền còn lại Bên A có trách nhiệm thanh toán cho Bên B: ${money(remainingToPay)} đồng.`, { indentLeft: 200, bold: true, spaceAfter: 15 } as any),
      wordPara(`(Bằng chữ: ${numberToVietnameseWords(remainingToPay)}).`, { indentLeft: 400, italic: true, spaceAfter: 30 })
    );

    // Điều 3
    bodyParas.push(wordPara('Điều 3. Phương thức và thời hạn thanh toán số tiền còn lại', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const art3 = getCustom(
      'article3',
      `Bên A có trách nhiệm thanh toán dứt điểm số tiền còn lại là ${money(remainingToPay)} đồng bằng hình thức chuyển khoản vào tài khoản ngân hàng của Bên B trong vòng ${currentDocData.paymentDays || '05'} ngày làm việc kể từ ngày ký biên bản thanh lý này và nhận hóa đơn tài chính hợp lệ.`
    );
    bodyParas.push(...textToParas(art3));

    // Điều 4
    bodyParas.push(wordPara('Điều 4. Trách nhiệm bảo hành sau thanh lý', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const art4 = getCustom(
      'article4',
      `Sau khi thanh lý hợp đồng, nghĩa vụ bảo hành của Bên B đối với toàn bộ thiết bị vẫn tiếp tục có hiệu lực theo thời hạn ${dossier.common.warranty} được quy định tại Hợp đồng kinh tế số ${contractNo}.`
    );
    bodyParas.push(...textToParas(art4));

    // Điều 5
    bodyParas.push(wordPara('Điều 5. Hiệu lực thanh lý', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    const art5 = getCustom(
      'article5',
      `Hai bên xác nhận không còn bất kỳ tranh chấp, khiếu nại nào liên quan đến Hợp đồng số ${contractNo}. Ngay sau khi Bên A hoàn tất nghĩa vụ thanh toán dứt điểm số tiền nêu tại Điều 2, Hợp đồng kinh tế số ${contractNo} chính thức hết hiệu lực pháp lý./.`
    );
    bodyParas.push(...textToParas(art5));

    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'ĐẠI DIỆN BÊN B',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyB.rep,
        },
        {
          title: 'ĐẠI DIỆN BÊN A',
          subtitle: '(Ký tên và đóng dấu)',
          signer: dossier.common.partyA.rep,
        },
      ])
    );
  } else if (activeType === 'paymentRequest') {
    const recipient = getCustom(
      'recipient',
      `Kính gửi: Ban Giám đốc và Bộ phận Kế toán – Tài chính của ${dossier.common.partyA.name}`
    );
    bodyParas.push(wordPara(recipient, { bold: true, spaceBefore: 40, spaceAfter: 40 } as any));

    const basis = getCustom(
      'basis',
      `- Căn cứ Hợp đồng kinh tế số: ${contractNo} ký ngày ${formatDateVN(dossier.common.contractDate)};\n- Căn cứ Biên bản nghiệm thu hoàn thành đưa vào sử dụng ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)};\n- Căn cứ Biên bản thanh lý hợp đồng ngày ${formatDateVN(currentDocData.date || dossier.common.contractDate)};\n- Căn cứ Hóa đơn GTGT số ${currentDocData.invoiceNo || '0000123'} ngày ${formatDateVN(currentDocData.invoiceDate || dossier.common.contractDate)} do ${partyBName} phát hành.`
    );
    bodyParas.push(...textToParas(basis));

    const intro = getCustom(
      'intro',
      `Đến nay, Công ty chúng tôi (${partyBName}) đã hoàn thành toàn bộ khối lượng công tác cung cấp, lắp đặt và bàn giao hệ thống thuộc dự án ${dossier.common.workTitle || dossier.common.project}.\nKính đề nghị Quý Công ty xem xét và giải ngân thanh toán số tiền quyết toán còn lại của hợp đồng cho chúng tôi theo bảng kê chi tiết sau:`
    );
    bodyParas.push(...textToParas(intro, { spaceBefore: 40 }));

    const advancePaid = currentDocData.advanceAmount ?? Math.round((grandTotal * 30) / 100);
    const remainingToPay = currentDocData.remainingAmount ?? (grandTotal - advancePaid);

    bodyParas.push(
      wordPara(`1. Tổng giá trị nghiệm thu quyết toán hợp đồng: ${money(grandTotal)} đồng.`, { indentLeft: 200, spaceAfter: 15, bold: true } as any),
      wordPara(`2. Số tiền Quý Công ty đã thanh toán tạm ứng đợt 1: ${money(advancePaid)} đồng.`, { indentLeft: 200, spaceAfter: 15 }),
      wordPara(`3. Số tiền đề nghị thanh toán đợt này: ${money(remainingToPay)} đồng.`, { indentLeft: 200, bold: true, size: 28, spaceAfter: 15 } as any),
      wordPara(`(Bằng chữ: ${numberToVietnameseWords(remainingToPay)}).`, { indentLeft: 400, italic: true, spaceAfter: 30 })
    );

    // Bank details
    bodyParas.push(wordPara('Thông tin tài khoản thụ hưởng thanh toán:', { bold: true, spaceBefore: 40, spaceAfter: 20 } as any));
    bodyParas.push(
      wordPara(`- Tên đơn vị thụ hưởng: ${dossier.common.partyB.name}`, { indentLeft: 200, spaceAfter: 15 }),
      wordPara(`- Tài khoản số / Ngân hàng: ${dossier.common.partyB.bank}`, { indentLeft: 200, spaceAfter: 15, bold: true } as any),
      wordPara(`- Mã số thuế: ${dossier.common.partyB.tax}`, { indentLeft: 200, spaceAfter: 30 })
    );

    const conclusion = getCustom(
      'conclusion',
      `Hồ sơ gửi kèm: 01 bản chính Biên bản nghiệm thu hoàn thành, 01 bản chính Biên bản thanh lý hợp đồng và 01 bản sao Hóa đơn GTGT.\nKính mong Quý Công ty sớm xem xét và thanh toán đúng hạn. Trân trọng cảm ơn!./.`
    );
    bodyParas.push(...textToParas(conclusion, { spaceBefore: 30, run: { italic: true } }));

    // 3 signatures for payment request according to accounting standards
    bodyParas.push(wordPara('', { spaceAfter: 120 }));
    bodyParas.push(
      buildWordSignatures([
        {
          title: 'NGƯỜI ĐỀ NGHỊ',
          subtitle: '(Ký, họ tên)',
          signer: currentDocData.senderName || dossier.common.partyB.rep,
        },
        {
          title: 'KẾ TOÁN TRƯỞNG',
          subtitle: '(Ký, họ tên)',
          signer: dossier.common.partyB.rep || '—',
        },
        {
          title: 'GIÁM ĐỐC',
          subtitle: '(Ký tên, đóng dấu)',
          signer: dossier.common.partyB.rep,
        },
      ])
    );
  }

  // Package into OpenXML .docx
  const documentXml = wordDocumentXml(bodyParas.join(''));
  const entries = [
    { name: '[Content_Types].xml', data: wordContentTypes() },
    { name: '_rels/.rels', data: wordRootRels() },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: wordStylesXml() },
    { name: 'word/footer1.xml', data: wordFooterXml() },
    { name: 'word/_rels/document.xml.rels', data: wordDocRels() },
    { name: 'docProps/core.xml', data: wordCoreProps(title, partyBName) },
    { name: 'docProps/app.xml', data: wordAppProps() },
  ];

  const zip = wordZipStore(entries);
  const blob = new Blob([zip as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
