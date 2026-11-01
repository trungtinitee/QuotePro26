import { CompanyInfo, DossierCommon, DossierDocData, Quote } from '../types';
import { money, moneyPlain, formatDecimalInput, numberToVietnameseWords, dossierDateVN } from './currency';

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
  size?: number; // 27 = 13.5pt
  font?: string;
}

function wordRun(text: string, opt: RunOptions = {}): string {
  const t = String(text ?? '');
  if (!t) return '<w:r><w:t></w:t></w:r>';
  const rPr: string[] = [];
  if (opt.bold) rPr.push('<w:b/>');
  if (opt.italic) rPr.push('<w:i/>');
  if (opt.color) rPr.push(`<w:color w:val="${opt.color}"/>`);
  const sz = opt.size || 27; // 13.5pt standard
  rPr.push(`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`);
  const font = opt.font || 'Times New Roman';
  rPr.push(
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`
  );
  return `<w:r>${rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlText(t)}</w:t></w:r>`;
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
  return `<w:tbl><w:tblPr><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${tableBorders}${opt.cellMargin ? `<w:tblCellMar><w:top w:w="${opt.cellMargin}" w:type="dxa"/><w:start w:w="${opt.cellMargin}" w:type="dxa"/><w:bottom w:w="${opt.cellMargin}" w:type="dxa"/><w:end w:w="${opt.cellMargin}" w:type="dxa"/></w:tblCellMar>` : ''}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.join('')}</w:tbl>`;
}

function wordRow(cells: string[], opt: { header?: boolean; cantSplit?: boolean } = {}): string {
  const rp: string[] = [];
  if (opt.header) rp.push('<w:tblHeader/>');
  if (opt.cantSplit) rp.push('<w:cantSplit/>');
  return `<w:tr>${rp.length ? `<w:trPr>${rp.join('')}</w:trPr>` : ''}${cells.join('')}</w:tr>`;
}

function wordFooterXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="66736E"/><w:sz w:val="18"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Trang </w:t></w:r><w:fldSimple w:instr="PAGE"/><w:r><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr="NUMPAGES"/></w:p></w:ftr>`;
}

function wordStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="345" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
}

function wordDocumentXml(body: string): string {
  const sect = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="960" w:bottom="900" w:left="960" w:header="450" w:footer="450" w:gutter="0"/><w:cols w:num="1"/><w:docGrid w:linePitch="360"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:lang w:val="vi-VN"/></w:sectPr>`;
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

export async function exportDossierDocToWord(
  docTitle: string,
  renderedHtml: string,
  filename: string
): Promise<void> {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderedHtml;

  // We convert standard paragraphs, letterhead, tables, signatures
  const bodyParas: string[] = [];

  // Parse letterhead
  const companyNameEl = tempDiv.querySelector('.dossier-company');
  const companyName = companyNameEl?.textContent?.trim() || '';
  const dateEl = tempDiv.querySelector('.dossier-doc-date');
  const dateText = dateEl?.textContent?.trim() || '';

  const leftCellParas = [
    wordPara([{ text: companyName, bold: true, size: 24, font: 'Times New Roman' }], {
      align: 'center',
      spaceAfter: 35,
      line: 300,
    }),
    wordPara('', {
      align: 'center',
      borderBottom: true,
      borderLeftIndent: 1500,
      borderRightIndent: 1500,
      spaceAfter: 20,
    }),
  ];

  const rightCellParas = [
    wordPara([{ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, size: 22, font: 'Times New Roman' }], {
      align: 'center',
      spaceAfter: 20,
      line: 280,
    }),
    wordPara([{ text: 'Độc lập - Tự do - Hạnh phúc', bold: true, size: 24, font: 'Times New Roman' }], {
      align: 'center',
      spaceAfter: 25,
      line: 300,
    }),
    wordPara('', {
      align: 'center',
      borderBottom: true,
      borderLeftIndent: 1200,
      borderRightIndent: 1200,
      spaceAfter: 40,
    }),
  ];

  if (dateText) {
    rightCellParas.push(
      wordPara([{ text: dateText, italic: true, size: 26, font: 'Times New Roman' }], {
        align: 'center',
        spaceAfter: 100,
        line: 300,
      })
    );
  }

  bodyParas.push(
    wordTable(
      [
        wordRow([
          wordCell(leftCellParas, { width: 5000, vAlign: 'top' }),
          wordCell(rightCellParas, { width: 5000, vAlign: 'top' }),
        ]),
      ],
      [5000, 5000],
      { noBorders: true, cellMargin: 0 }
    )
  );

  // Parse Titles
  const mainTitles = tempDiv.querySelectorAll('.dossier-doc-title');
  mainTitles.forEach((t) => {
    bodyParas.push(
      wordPara([{ text: t.textContent?.trim() || '', bold: true, size: 32, font: 'Times New Roman' }], {
        align: 'center',
        spaceBefore: 60,
        spaceAfter: 40,
        line: 360,
        keepNext: true,
      })
    );
  });

  const subtitle = tempDiv.querySelector('.dossier-doc-subtitle');
  if (subtitle) {
    bodyParas.push(
      wordPara(
        [{ text: subtitle.textContent?.trim() || '', bold: true, italic: true, size: 28, font: 'Times New Roman' }],
        {
          align: 'center',
          spaceBefore: 20,
          spaceAfter: 120,
          line: 350,
          keepNext: true,
        }
      )
    );
  }

  // Parse paragraphs, headings, tables, and signatures
  const elements = tempDiv.querySelectorAll(
    'p, div.font-bold, .dossier-para, .dossier-party, table.dossier-table, .dossier-sign-grid, .grid-cols-2, .grid-cols-3'
  );

  elements.forEach((el) => {
    // Avoid double processing children inside table or signatures
    if (el.closest('table') && el.tagName.toLowerCase() !== 'table') return;
    if (el.closest('.dossier-sign-grid') && !el.classList.contains('dossier-sign-grid')) return;
    if (el.closest('.grid-cols-2') && !el.classList.contains('grid-cols-2')) return;
    if (el.closest('.grid-cols-3') && !el.classList.contains('grid-cols-3')) return;
    if (el.closest('.text-center.my-6')) return; // already parsed titles

    const tagName = el.tagName.toLowerCase();
    const isHeaderGrid = el.classList.contains('items-start') && el.classList.contains('mb-6');
    if (isHeaderGrid) return; // already processed letterhead

    if (tagName === 'table') {
      // Table formatting
      const trs = el.querySelectorAll('tr');
      const tableRows: string[] = [];
      const colCount = trs[0]?.children.length || 6;
      const widths = Array.from({ length: colCount }, () => Math.floor(10000 / colCount));

      trs.forEach((tr, rIdx) => {
        const isHeader = rIdx === 0;
        const cells: string[] = [];
        tr.querySelectorAll('th, td').forEach((cell) => {
          const colspan = Number(cell.getAttribute('colspan')) || 1;
          const align = cell.classList.contains('text-right')
            ? 'right'
            : cell.classList.contains('text-center')
            ? 'center'
            : 'left';
          cells.push(
            wordCell(
              [
                wordPara(
                  [{ text: cell.textContent?.trim() || '', bold: isHeader || cell.classList.contains('font-bold'), size: 21, font: 'Times New Roman' }],
                  { align, spaceAfter: 15, line: 260 }
                ),
              ],
              {
                width: Math.floor((10000 / colCount) * colspan),
                gridSpan: colspan > 1 ? colspan : undefined,
                borders: true,
                vAlign: 'top',
              }
            )
          );
        });
        tableRows.push(wordRow(cells, { cantSplit: true, header: isHeader }));
      });

      bodyParas.push(wordTable(tableRows, widths, { borders: true, cellMargin: 40 }));
      bodyParas.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr></w:p>`);
    } else if (
      el.classList.contains('dossier-sign-grid') ||
      (el.classList.contains('grid') && (el.classList.contains('grid-cols-2') || el.classList.contains('grid-cols-3')))
    ) {
      // Signature block (2 or 3 columns)
      const signBoxes = Array.from(el.children) as HTMLElement[];
      const colCount = signBoxes.length || 2;
      const cellWidth = Math.floor(10000 / colCount);
      const signCells: string[] = [];

      signBoxes.forEach((box) => {
        const paras: string[] = [];
        const textLines = (box.innerText || '').split('\n').filter((l) => l.trim().length > 0);
        
        if (textLines.length >= 2) {
          // Top title (e.g. ĐẠI DIỆN BÊN B)
          paras.push(
            wordPara([{ text: textLines[0], bold: true, size: 27, font: 'Times New Roman' }], {
              align: 'center',
              spaceAfter: 15,
            })
          );
          // Subtitle (e.g. (Ký tên và đóng dấu))
          paras.push(
            wordPara([{ text: textLines[1], italic: true, size: 23, font: 'Times New Roman' }], {
              align: 'center',
              spaceAfter: 500, // space for signature
            })
          );
          // Signer name at bottom (if any)
          if (textLines.length >= 3) {
            paras.push(
              wordPara([{ text: textLines[textLines.length - 1], bold: true, size: 27, font: 'Times New Roman' }], {
                align: 'center',
                spaceAfter: 20,
              })
            );
          }
        } else if (textLines.length === 1) {
          paras.push(
            wordPara([{ text: textLines[0], bold: true, size: 27, font: 'Times New Roman' }], {
              align: 'center',
              spaceAfter: 20,
            })
          );
        }

        signCells.push(wordCell(paras.length ? paras : [wordPara('', { spaceAfter: 0 })], { width: cellWidth, vAlign: 'top' }));
      });

      bodyParas.push(
        wordTable([wordRow(signCells, { cantSplit: true })], Array(colCount).fill(cellWidth), {
          noBorders: true,
          cellMargin: 0,
        })
      );
    } else {
      // Paragraph or Heading
      const text = el.textContent?.trim() || '';
      if (!text) return;
      const isBold = el.classList.contains('font-bold') || el.tagName.toLowerCase() === 'strong';
      const isItalic = el.classList.contains('italic') || el.tagName.toLowerCase() === 'em';
      const align = el.classList.contains('text-center')
        ? 'center'
        : el.classList.contains('text-right')
        ? 'right'
        : 'both';

      bodyParas.push(
        wordPara([{ text, bold: isBold, italic: isItalic, size: isBold ? 28 : 27, font: 'Times New Roman' }], {
          align,
          spaceBefore: isBold ? 40 : 15,
          spaceAfter: 40,
          line: 320,
        })
      );
    }
  });

  const documentXml = wordDocumentXml(bodyParas.join(''));
  const entries = [
    { name: '[Content_Types].xml', data: wordContentTypes() },
    { name: '_rels/.rels', data: wordRootRels() },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: wordStylesXml() },
    { name: 'word/footer1.xml', data: wordFooterXml() },
    { name: 'word/_rels/document.xml.rels', data: wordDocRels() },
    { name: 'docProps/core.xml', data: wordCoreProps(docTitle, 'QuotePro Dossier') },
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
