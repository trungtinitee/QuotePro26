import { CompanyInfo, Quote } from '../types';
import { moneyPlain, formatDecimalInput, numberToVietnameseWords, formatDateVN } from './currency';
import { parseSpecLines } from './specFormat';

function wordXmlEsc(v: string | number | undefined | null): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wordText(v: string | number | undefined | null): string {
  const s = String(v ?? '');
  if (!s) return '';
  return s
    .split(/\r?\n/)
    .map((x) => wordXmlEsc(x))
    .join('</w:t><w:br/><w:t xml:space="preserve">');
}

interface RunOptions {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  size?: number; // in half-points (20 = 10pt)
  font?: string;
}

function wordRun(text: string, opt: RunOptions = {}): string {
  const t = String(text ?? '');
  if (!t) return '<w:r><w:t></w:t></w:r>';
  const rPr: string[] = [];
  if (opt.bold) rPr.push('<w:b/>');
  if (opt.italic) rPr.push('<w:i/>');
  if (opt.color) rPr.push(`<w:color w:val="${opt.color}"/>`);
  if (opt.size) rPr.push(`<w:sz w:val="${opt.size}"/><w:szCs w:val="${opt.size}"/>`);
  if (opt.font) {
    rPr.push(
      `<w:rFonts w:ascii="${opt.font}" w:hAnsi="${opt.font}" w:eastAsia="${opt.font}" w:cs="${opt.font}"/>`
    );
  }
  return `<w:r>${rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : ''}<w:t xml:space="preserve">${wordText(t)}</w:t></w:r>`;
}

interface ParaOptions {
  align?: 'left' | 'center' | 'right' | 'both';
  spaceBefore?: number;
  spaceAfter?: number;
  line?: number;
  keepNext?: boolean;
  borderBottom?: boolean;
  borderLeftIndent?: number;
  borderRightIndent?: number;
  run?: RunOptions;
}

function wordPara(parts: (string | { text: string; [key: string]: any })[] | string, opt: ParaOptions = {}): string {
  const pPr: string[] = [];
  if (opt.align) pPr.push(`<w:jc w:val="${opt.align}"/>`);
  if (opt.spaceBefore !== undefined) pPr.push(`<w:spacing w:before="${opt.spaceBefore}"/>`);
  if (opt.spaceAfter !== undefined) pPr.push(`<w:spacing w:after="${opt.spaceAfter}"/>`);
  if (opt.line !== undefined) pPr.push(`<w:spacing w:line="${opt.line}" w:lineRule="auto"/>`);
  if (opt.keepNext) pPr.push('<w:keepNext/>');
  if (opt.borderBottom) {
    const li = opt.borderLeftIndent ?? 0;
    const ri = opt.borderRightIndent ?? 0;
    pPr.push(`<w:ind w:left="${li}" w:right="${ri}"/>`);
    pPr.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="111111"/></w:pBdr>');
  }
  const runs = Array.isArray(parts)
    ? parts
        .map((x) => (typeof x === 'string' ? wordRun(x, opt.run || {}) : wordRun(x.text, x as RunOptions)))
        .join('')
    : wordRun(parts, opt.run || {});
  return `<w:p>${pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${runs || '<w:r><w:t></w:t></w:r>'}</w:p>`;
}

const WORD_BORDER =
  '<w:tcBorders><w:top w:val="single" w:sz="6" w:color="B8C4BF"/><w:left w:val="single" w:sz="6" w:color="B8C4BF"/><w:bottom w:val="single" w:sz="6" w:color="B8C4BF"/><w:right w:val="single" w:sz="6" w:color="B8C4BF"/></w:tcBorders>';

interface CellPrOptions {
  width?: number;
  shade?: string;
  pad?: number;
  vAlign?: 'top' | 'center' | 'bottom';
  gridSpan?: number;
  noWrap?: boolean;
  borders?: boolean;
}

function wordCellPr(opt: CellPrOptions = {}): string {
  const p: string[] = [];
  if (opt.width) p.push(`<w:tcW w:w="${opt.width}" w:type="dxa"/>`);
  if (opt.gridSpan) p.push(`<w:gridSpan w:val="${opt.gridSpan}"/>`);
  if (opt.shade) p.push(`<w:shd w:fill="${opt.shade}"/>`);
  if (opt.vAlign) p.push(`<w:vAlign w:val="${opt.vAlign}"/>`);
  if (opt.noWrap) p.push('<w:noWrap/>');
  if (opt.borders) p.push(WORD_BORDER);
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
      '<w:tblBorders><w:top w:val="single" w:sz="6" w:color="B8C4BF"/><w:left w:val="single" w:sz="6" w:color="B8C4BF"/><w:bottom w:val="single" w:sz="6" w:color="B8C4BF"/><w:right w:val="single" w:sz="6" w:color="B8C4BF"/><w:insideH w:val="single" w:sz="6" w:color="B8C4BF"/><w:insideV w:val="single" w:sz="6" w:color="B8C4BF"/></w:tblBorders>';
  } else if (opt.noBorders) {
    tableBorders =
      '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  }
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return `<w:tbl><w:tblPr><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${tableBorders}${opt.cellMargin ? `<w:tblCellMar><w:top w:w="${opt.cellMargin}" w:type="dxa"/><w:start w:w="${opt.cellMargin}" w:type="dxa"/><w:bottom w:w="${opt.cellMargin}" w:type="dxa"/><w:end w:w="${opt.cellMargin}" w:type="dxa"/></w:tblCellMar>` : ''}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.join('')}</w:tbl>`;
}

function wordRow(cells: string[], opt: { header?: boolean; cantSplit?: boolean } = {}): string {
  const rp: string[] = [];
  if (opt.header) rp.push('<w:tblHeader/>');
  if (opt.cantSplit) rp.push('<w:cantSplit/>');
  return `<w:tr>${rp.length ? `<w:trPr>${rp.join('')}</w:trPr>` : ''}${cells.join('')}</w:tr>`;
}

function wordHeaderCell(text: string, width: number, align: 'center' | 'left' | 'right' = 'center'): string {
  return wordCell(
    [
      wordPara([{ text, bold: true, color: 'FFFFFF', size: 18, font: 'Arial' }], {
        align,
        spaceBefore: 0,
        spaceAfter: 0,
      }),
    ],
    { width, shade: '117A5A', vAlign: 'center', pad: 90, borders: true }
  );
}

function wordImageXml(relId: string, cx = 914400, cy = 914400): string {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Company Logo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Company Logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

function wordLogoParagraph(imageXml: string): string {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r>${imageXml}</w:r></w:p>`;
}

function wordFooterXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="66736E"/><w:sz w:val="16"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Trang </w:t></w:r><w:fldSimple w:instr="PAGE"/><w:r><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr="NUMPAGES"/></w:p></w:ftr>`;
}

function wordStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="70" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:style></w:styles>`;
}

function wordDocumentXml(body: string, _hasLogo = false): string {
  const sect = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="800" w:right="850" w:bottom="800" w:left="850" w:header="450" w:footer="450" w:gutter="0"/><w:cols w:num="1"/><w:docGrid w:linePitch="360"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:lang w:val="vi-VN"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}${sect}</w:body></w:document>`;
}

function wordContentTypes(hasLogo: boolean, mime = 'image/png'): string {
  const ext = mime === 'image/jpeg' ? 'jpeg' : 'png';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${hasLogo ? `<Default Extension="${ext}" ContentType="${mime}"/>` : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function wordRootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
}

function wordDocRels(hasLogo: boolean, imageName = 'image1.png'): string {
  const logo = hasLogo
    ? `<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdStyle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${logo}</Relationships>`;
}

function wordCoreProps(title: string, creator: string): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${wordXmlEsc(title)}</dc:title><dc:creator>${wordXmlEsc(creator)}</dc:creator><cp:lastModifiedBy>${wordXmlEsc(creator)}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function wordAppProps(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>QuotePro</Application></Properties>`;
}

function wordDataUrlBytes(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) throw new Error('Logo không ở dạng dữ liệu hợp lệ.');
  const bin = atob(m[2]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes: out };
}

async function wordLogoDataUrl(src: string): Promise<{ mime: string; bytes: Uint8Array }> {
  const raw = wordDataUrlBytes(src);
  if (raw.mime === 'image/png' || raw.mime === 'image/jpeg') return raw;
  if (raw.mime === 'image/webp') {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Không đọc được logo WebP.'));
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    if (!canvas.width || !canvas.height) throw new Error('Kích thước logo không hợp lệ.');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('Không chuyển được logo WebP sang PNG.');
    const buf = new Uint8Array(await blob.arrayBuffer());
    return { mime: 'image/png', bytes: buf };
  }
  return raw;
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

interface ZipEntry {
  name: string;
  data: string | Uint8Array;
}

function wordZipStore(entries: ZipEntry[]): Uint8Array {
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

export async function exportQuoteToWord(quote: Quote, company: CompanyInfo): Promise<void> {
  const widths = [620, 4730, 900, 700, 1500, 1550];
  const body: string[] = [];
  const hasLogo = !!company.logo;
  let logoRaw: { mime: string; bytes: Uint8Array } | null = null;
  if (hasLogo) {
    try {
      logoRaw = await wordLogoDataUrl(company.logo);
    } catch (e) {
      console.warn('Cannot load company logo for Word export', e);
    }
  }

  // Header: company details
  const companyParas: string[] = [];
  if (company.name) {
    companyParas.push(
      wordPara([{ text: company.name, bold: true, size: 23, color: '0B5D45', font: 'Arial' }], {
        spaceAfter: 55,
        line: 250,
        keepNext: true,
      })
    );
  }
  if (company.address) {
    companyParas.push(
      wordPara([{ text: company.address, size: 15, color: '66736E', font: 'Arial' }], {
        spaceAfter: 35,
        line: 230,
      })
    );
  }
  const contact = [
    company.phone && 'ĐT: ' + company.phone,
    company.tax && 'MST: ' + company.tax,
    company.email && 'Email: ' + company.email,
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (contact) {
    companyParas.push(
      wordPara([{ text: contact, size: 14, color: '66736E', font: 'Arial' }], {
        spaceAfter: 25,
        line: 220,
      })
    );
  }
  if (company.website) {
    companyParas.push(
      wordPara([{ text: 'Web: ' + company.website, size: 14, color: '66736E', font: 'Arial' }], {
        spaceAfter: 25,
        line: 220,
      })
    );
  }
  if (company.bank) {
    companyParas.push(
      wordPara([{ text: 'Ngân hàng: ' + company.bank, size: 15, color: '66736E', font: 'Arial' }], {
        spaceAfter: 0,
        line: 230,
      })
    );
  }

  if (logoRaw) {
    const headerCells = [
      wordCell([wordLogoParagraph(wordImageXml('rIdLogo', 820000, 820000))], {
        width: 1800,
        vAlign: 'center',
        pad: 70,
      }),
      wordCell(companyParas, { width: 8200, vAlign: 'center', pad: 70 }),
    ];
    body.push(wordTable([wordRow(headerCells)], [1800, 8200], { noBorders: true }));
  } else {
    body.push(
      wordTable([wordRow([wordCell(companyParas, { width: 10000, vAlign: 'center', pad: 0 })])], [10000], {
        noBorders: true,
      })
    );
  }

  // Divider
  body.push(
    `<w:p><w:pPr><w:ind w:left="0" w:right="206"/><w:spacing w:before="40" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="117A5A"/></w:pBdr></w:pPr></w:p>`
  );

  // Title
  body.push(
    wordPara([{ text: 'BẢNG BÁO GIÁ', bold: true, size: 28, color: '117A5A', font: 'Arial' }], {
      align: 'center',
      spaceBefore: 20,
      spaceAfter: 75,
      line: 300,
      keepNext: true,
    })
  );

  // Quote info grid
  const infoPairs: [string, string, string, string][] = [
    ['Số báo giá', quote.no || '', 'Ngày', formatDateVN(quote.date) || ''],
    ['Dự án', quote.project || '', 'Thời hạn', quote.validity || ''],
    ['Người lập', quote.creator || '', 'Kính gửi', quote.customer || ''],
    ['Đơn vị', quote.company || '', 'Địa chỉ', quote.address || ''],
    ['Điện thoại', quote.phone || '', '', ''],
  ];

  const infoRows = infoPairs.map((r) =>
    wordRow(
      [
        wordCell(
          [
            wordPara([{ text: r[0] + ':', bold: true, size: 15, color: '66736E', font: 'Arial' }], {
              spaceAfter: 0,
              line: 220,
            }),
          ],
          { width: 1500, pad: 0, vAlign: 'center' }
        ),
        wordCell(
          [
            wordPara([{ text: r[1], size: 15, color: '1F2A27', font: 'Arial' }], {
              spaceAfter: 0,
              line: 220,
            }),
          ],
          { width: 3500, pad: 0, vAlign: 'center' }
        ),
        wordCell(
          [
            r[2]
              ? wordPara([{ text: r[2] + ':', bold: true, size: 15, color: '66736E', font: 'Arial' }], {
                  spaceAfter: 0,
                  line: 220,
                })
              : wordPara('', { spaceAfter: 0 }),
          ],
          { width: 1500, pad: 0, vAlign: 'center' }
        ),
        wordCell(
          [
            r[3]
              ? wordPara([{ text: r[3], size: 15, color: '1F2A27', font: 'Arial' }], {
                  spaceAfter: 0,
                  line: 220,
                })
              : wordPara('', { spaceAfter: 0 }),
          ],
          { width: 3500, pad: 0, vAlign: 'center' }
        ),
      ],
      { cantSplit: true }
    )
  );

  body.push(wordTable(infoRows, [1500, 3500, 1500, 3500], { noBorders: true, cellMargin: 0 }));

  // Intro text
  body.push(
    `<w:p><w:pPr><w:ind w:left="0" w:right="206"/><w:spacing w:before="0" w:after="55"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="B8C4BF"/></w:pBdr></w:pPr></w:p>`
  );
  body.push(
    wordPara([{ text: 'Kính gửi Quý Khách hàng,', bold: true, size: 18, color: '1F2A27', font: 'Arial' }], {
      align: 'left',
      spaceBefore: 0,
      spaceAfter: 15,
      line: 240,
      keepNext: true,
    })
  );
  body.push(
    wordPara(
      [
        {
          text: 'Cảm ơn Quý Khách hàng đã tin tưởng. Theo yêu cầu, chúng tôi xin gửi báo giá chi tiết như sau:',
          size: 17,
          color: '66736E',
          font: 'Arial',
        },
      ],
      { align: 'left', spaceBefore: 0, spaceAfter: 70, line: 260, keepNext: true }
    )
  );

  // Table rows
  const tableRows: string[] = [
    wordRow(
      [
        wordHeaderCell('STT', 620),
        wordHeaderCell('Hạng mục / đề mục', 4730, 'left'),
        wordHeaderCell('ĐVT', 900),
        wordHeaderCell('SL', 700),
        wordHeaderCell('Đơn giá', 1500, 'right'),
        wordHeaderCell('Thành tiền', 1550, 'right'),
      ],
      { header: true, cantSplit: true }
    ),
  ];

  let itemNo = 0;
  let runningSubtotal = 0;
  for (const r of quote.rows || []) {
    if (r.type === 'heading' || r.type === 'subheading') {
      const title = String(r.title || '');
      if (!title.trim()) continue;
      tableRows.push(
        wordRow(
          [
            wordCell(
              [
                wordPara(
                  [
                    {
                      text: title,
                      bold: true,
                      italic: r.type === 'subheading',
                      size: 17,
                      color: r.type === 'heading' ? '0B5D45' : '1F2A27',
                      font: 'Arial',
                    },
                  ],
                  { spaceAfter: 0, line: 240 }
                ),
              ],
              {
                width: 10000,
                shade: r.type === 'heading' ? 'EEF7F3' : 'F8FAF9',
                gridSpan: 6,
                pad: 80,
                borders: true,
              }
            ),
          ],
          { cantSplit: true }
        )
      );
      continue;
    }

    if (r.type === 'subtotal') {
      tableRows.push(
        wordRow(
          [
            wordCell(
              [
                wordPara([{ text: 'TỔNG NHÓM', bold: true, size: 17, color: '0B5D45', font: 'Arial' }], {
                  align: 'right',
                  spaceAfter: 0,
                }),
              ],
              { width: 8450, shade: 'F5FAF7', gridSpan: 5, pad: 70, borders: true }
            ),
            wordCell(
              [
                wordPara(
                  [{ text: moneyPlain(runningSubtotal) + ' đ', bold: true, size: 17, color: '0B5D45', font: 'Arial' }],
                  { align: 'right', spaceAfter: 0 }
                ),
              ],
              { width: 1550, shade: 'F5FAF7', pad: 70, borders: true }
            ),
          ],
          { cantSplit: true }
        )
      );
      runningSubtotal = 0;
      continue;
    }

    itemNo++;
    const qty = Number(r.qty) || 0;
    const price = Number(r.price) || 0;
    const lineTotal = qty * price;
    runningSubtotal += lineTotal;

    const detailParas: string[] = [];
    const title = String(r.itemName || r.name || '');
    const detail = r.itemName && r.name && r.name !== r.itemName ? String(r.name) : '';
    if (title) {
      detailParas.push(
        wordPara([{ text: title, bold: true, size: 17, color: '1F2A27', font: 'Arial' }], {
          spaceAfter: detail ? 30 : 0,
          line: 245,
          keepNext: true,
        })
      );
    }
    if (detail) {
      const specLines = parseSpecLines(detail);
      specLines.forEach((sLine, sIdx) => {
        const bulletText = `+ ${sLine.replace(/^[+•\-*]\s*/, '')}`;
        detailParas.push(
          wordPara([{ text: bulletText, size: 15, color: '66736E', font: 'Arial' }], {
            spaceAfter: sIdx === specLines.length - 1 ? 0 : 20,
            line: 240,
          })
        );
      });
    }

    tableRows.push(
      wordRow(
        [
          wordCell(
            [wordPara([{ text: String(itemNo), size: 15, font: 'Arial' }], { align: 'center', spaceAfter: 0 })],
            { width: 620, vAlign: 'top', pad: 70, borders: true }
          ),
          wordCell(detailParas, { width: 4730, vAlign: 'top', pad: 70, borders: true }),
          wordCell(
            [wordPara([{ text: String(r.unit || ''), size: 15, font: 'Arial' }], { align: 'center', spaceAfter: 0 })],
            { width: 900, vAlign: 'top', pad: 70, borders: true }
          ),
          wordCell(
            [wordPara([{ text: formatDecimalInput(qty), size: 15, font: 'Arial' }], { align: 'center', spaceAfter: 0 })],
            { width: 700, vAlign: 'top', pad: 70, borders: true }
          ),
          wordCell(
            [wordPara([{ text: moneyPlain(price), size: 15, font: 'Arial' }], { align: 'right', spaceAfter: 0 })],
            { width: 1500, vAlign: 'top', pad: 70, borders: true }
          ),
          wordCell(
            [
              wordPara([{ text: moneyPlain(lineTotal) + ' đ', size: 15, font: 'Arial' }], {
                align: 'right',
                spaceAfter: 0,
              }),
            ],
            { width: 1550, vAlign: 'top', pad: 70, borders: true }
          ),
        ],
        { cantSplit: true }
      )
    );
  }

  body.push(wordTable(tableRows, widths, { cellMargin: 45, borders: true }));
  body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="35"/></w:pPr></w:p>`);

  // Totals
  const subtotal = (quote.rows || [])
    .filter((r) => r.type === 'item')
    .reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  let discount = 0;
  if (quote.discountEnabled) {
    discount =
      quote.discountType === 'amount'
        ? Math.min(subtotal, Math.max(0, Number(quote.discountValue) || 0))
        : Math.min(subtotal, Math.max(0, (subtotal * (Number(quote.discountValue) || 0)) / 100));
  }
  const taxable = Math.max(0, subtotal - discount);
  const vatAmount = (taxable * (Number(quote.vat) || 0)) / 100;
  const grandTotal = taxable + vatAmount;

  const totalRows = [
    wordRow(
      [
        wordCell(
          [
            wordPara([{ text: 'Tạm tính', size: 16, color: '66736E', font: 'Arial' }], {
              align: 'right',
              spaceAfter: 0,
            }),
          ],
          { width: 8200, pad: 0 }
        ),
        wordCell(
          [
            wordPara([{ text: moneyPlain(subtotal) + ' đ', size: 16, bold: true, color: '1F2A27', font: 'Arial' }], {
              align: 'right',
              spaceAfter: 0,
            }),
          ],
          { width: 1800, pad: 0 }
        ),
      ],
      { cantSplit: true }
    ),
  ];

  if (quote.discountEnabled) {
    totalRows.push(
      wordRow(
        [
          wordCell(
            [
              wordPara(
                [
                  {
                    text:
                      quote.discountType === 'amount'
                        ? 'Giảm giá'
                        : 'Giảm giá (' + formatDecimalInput(quote.discountValue) + '%)',
                    size: 16,
                    color: '66736E',
                    font: 'Arial',
                  },
                ],
                { align: 'right', spaceAfter: 0 }
              ),
            ],
            { width: 8200, pad: 0 }
          ),
          wordCell(
            [
              wordPara([{ text: moneyPlain(discount) + ' đ', size: 16, color: '1F2A27', font: 'Arial' }], {
                align: 'right',
                spaceAfter: 0,
              }),
            ],
            { width: 1800, pad: 0 }
          ),
        ],
        { cantSplit: true }
      )
    );
  }

  totalRows.push(
    wordRow(
      [
        wordCell(
          [
            wordPara(
              [{ text: 'VAT (' + formatDecimalInput(quote.vat) + '%)', size: 16, color: '66736E', font: 'Arial' }],
              { align: 'right', spaceAfter: 0 }
            ),
          ],
          { width: 8200, pad: 0 }
        ),
        wordCell(
          [
            wordPara([{ text: moneyPlain(vatAmount) + ' đ', size: 16, color: '1F2A27', font: 'Arial' }], {
              align: 'right',
              spaceAfter: 0,
            }),
          ],
          { width: 1800, pad: 0 }
        ),
      ],
      { cantSplit: true }
    )
  );

  totalRows.push(
    wordRow(
      [
        wordCell(
          [
            wordPara([{ text: 'TỔNG THANH TOÁN', bold: true, size: 18, color: '0B5D45', font: 'Arial' }], {
              align: 'right',
              spaceBefore: 35,
              spaceAfter: 0,
            }),
          ],
          { width: 8200, pad: 0 }
        ),
        wordCell(
          [
            wordPara(
              [{ text: moneyPlain(grandTotal) + ' đ', bold: true, size: 19, color: '0B5D45', font: 'Arial' }],
              { align: 'right', spaceBefore: 35, spaceAfter: 0 }
            ),
          ],
          { width: 1800, pad: 0 }
        ),
      ],
      { cantSplit: true }
    )
  );

  body.push(wordTable(totalRows, [8200, 1800], { noBorders: true, cellMargin: 0 }));

  // Amount in words
  body.push(
    wordPara(
      [
        { text: 'Bằng chữ: ', bold: true, size: 17, color: '1F2A27', font: 'Arial' },
        { text: numberToVietnameseWords(grandTotal), size: 17, color: '1F2A27', font: 'Arial' },
      ],
      { spaceBefore: 55, spaceAfter: 65, line: 250 }
    )
  );

  // Notes
  if (String(quote.notes || '').trim()) {
    body.push(
      wordPara([{ text: 'Ghi chú / Điều khoản', bold: true, size: 18, color: '1F2A27', font: 'Arial' }], {
        spaceBefore: 45,
        spaceAfter: 30,
        line: 250,
        keepNext: true,
      })
    );
    const noteParas = String(quote.notes || '')
      .split(/\r?\n/)
      .map((line) =>
        wordPara([{ text: line, size: 16, color: '1F2A27', font: 'Arial' }], {
          spaceAfter: 25,
          line: 255,
        })
      );
    body.push(
      wordTable([wordRow([wordCell(noteParas, { width: 10000, pad: 0 })], { cantSplit: true })], [10000], {
        noBorders: true,
      })
    );
  }

  // Signature
  const sigName = quote.creator || '';
  body.push(
    wordTable(
      [
        wordRow([
          wordCell([wordPara('', { spaceAfter: 0 })], { width: 6200, pad: 0 }),
          wordCell(
            [
              wordPara([{ text: 'NGƯỜI LẬP BÁO GIÁ', bold: true, size: 18, font: 'Arial' }], {
                align: 'center',
                spaceAfter: 18,
                keepNext: true,
              }),
              wordPara([{ text: '(Ký, ghi rõ họ tên)', italic: true, size: 15, color: '66736E', font: 'Arial' }], {
                align: 'center',
                spaceAfter: 180,
                keepNext: true,
              }),
              wordPara('', { spaceAfter: 250 }),
              wordPara([{ text: sigName, bold: true, size: 17, font: 'Arial' }], {
                align: 'center',
                spaceAfter: 0,
              }),
            ],
            { width: 3800, pad: 0 }
          ),
        ]),
      ],
      [6200, 3800],
      { noBorders: true }
    )
  );

  const imageName = logoRaw?.mime === 'image/jpeg' ? 'image1.jpeg' : 'image1.png';
  const documentXml = wordDocumentXml(body.join(''), !!logoRaw);
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: wordContentTypes(!!logoRaw, logoRaw?.mime || 'image/png') },
    { name: '_rels/.rels', data: wordRootRels() },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: wordStylesXml() },
    { name: 'word/footer1.xml', data: wordFooterXml() },
    { name: 'word/_rels/document.xml.rels', data: wordDocRels(!!logoRaw, imageName) },
    { name: 'docProps/core.xml', data: wordCoreProps(`Báo giá ${quote.no}`, company.name || 'QuotePro') },
    { name: 'docProps/app.xml', data: wordAppProps() },
  ];
  if (logoRaw) {
    entries.push({ name: 'word/media/' + imageName, data: logoRaw.bytes });
  }

  const zip = wordZipStore(entries);
  const blob = new Blob([zip as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const safeNo = String(quote.no || 'Bao_gia')
    .replace(/[^\w\-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const downloadName = `quotepro-bao-gia-${safeNo}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
