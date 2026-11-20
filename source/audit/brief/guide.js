// VC Curriculum Audit: How to use — step-by-step guide, A4 portrait, navy and crimson (same look as the Quick Brief).
const fs = require('fs');
const D = require('/opt/npm-tools/node_modules/docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
  ImageRun, Footer, PageNumber, LevelFormat, HeadingLevel, TableLayoutType } = D;
const NAVY = '1F1646', CRIM = 'D40032', MINT = 'E7F5F5', GREY = '5D5A73', LINE = 'C9C5D9';
const CW = 11906 - 2 * 1020;
const SHOT = __dirname + '/';
function runs(t, o = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let i = 0, m;
  while ((m = re.exec(t))) {
    if (m.index > i) out.push(new TextRun({ text: t.slice(i, m.index), ...o }));
    const b = m[0].startsWith('**');
    out.push(new TextRun({ text: m[0].replace(/^\*+|\*+$/g, ''), bold: b || o.bold, italics: !b || o.italics, color: o.color }));
    i = m.index + m[0].length;
  }
  if (i < t.length) out.push(new TextRun({ text: t.slice(i), ...o }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.r || {}), spacing: { after: o.after ?? 100, before: o.before ?? 0 }, keepNext: o.keepNext });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })], spacing: { before: 240, after: 100 }, keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: CRIM, space: 2 } } });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t })], spacing: { before: 160, after: 80 }, keepNext: true });
let listN = 0; const NUMS = [];
const bullets = items => items.map(t => new Paragraph({ numbering: { reference: 'bul', level: 0 }, children: runs(t), spacing: { after: 70 } }));
const steps = items => { const ref = 'num' + (++listN); NUMS.push(ref); return items.map(t => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 70 } })); };
const cellB = { top: { style: BorderStyle.SINGLE, size: 4, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE }, left: { style: BorderStyle.SINGLE, size: 4, color: LINE }, right: { style: BorderStyle.SINGLE, size: 4, color: LINE } };
function table(head, rows, fr) {
  const tot = fr.reduce((a, b) => a + b, 0), w = fr.map(f => Math.floor(CW * f / tot)); w[w.length - 1] += CW - w.reduce((a, b) => a + b, 0);
  const mk = (cells, hdr, band) => new TableRow({ tableHeader: hdr, cantSplit: true, children: cells.map((c, i) => new TableCell({
    width: { size: w[i], type: WidthType.DXA }, borders: cellB, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: hdr ? { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' } : band ? { type: ShadingType.CLEAR, fill: 'F4F3F8', color: 'auto' } : undefined,
    children: [new Paragraph({ children: runs(c, hdr ? { bold: true, color: 'FFFFFF' } : i === 0 ? { bold: true } : {}), spacing: { after: 0 } })] })) });
  return [new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, rows: [mk(head, true)].concat(rows.map((r, k) => mk(r, false, k % 2))) }), P('', { after: 60 })];
}
function figure(file, maxWcm, cap) {
  const buf = fs.readFileSync(SHOT + file);
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
  const wpx = Math.round(maxWcm / 2.54 * 96), hpx = Math.round(wpx * H / W);
  return [new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 40 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: wpx, height: hpx },
      altText: { title: cap, description: cap, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 }, children: [new TextRun({ text: cap, italics: true, size: 16, color: GREY })] })];
}
const callout = t => new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [new TableCell({ width: { size: CW, type: WidthType.DXA },
  shading: { type: ShadingType.CLEAR, fill: MINT, color: 'auto' }, margins: { top: 100, bottom: 100, left: 160, right: 160 },
  borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
  children: [new Paragraph({ children: runs(t), spacing: { after: 0 } })] })] })] });
const body = []; const add = (...xs) => xs.forEach(x => Array.isArray(x) ? body.push(...x) : body.push(x));
const tip = t => callout('**Tip:** ' + t);
const H1band = (title, sub) => [new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [new TableCell({ width: { size: CW, type: WidthType.DXA },
  shading: { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' }, margins: { top: 200, bottom: 200, left: 240, right: 240 },
  borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.SINGLE, size: 24, color: CRIM }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
  children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 40, color: 'FFFFFF' })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: sub, size: 20, color: 'FFFFFF' })], spacing: { after: 0 } })] })] })] }), P('', { after: 60 })];

add(H1band('VC Curriculum Audit: How to use', 'A step-by-step guide for teachers, teams and curriculum leaders · Version 1.6 · November 2026'));

add(P('VC Curriculum Audit checks your school\'s maths, English or other learning area documents against **Victorian Curriculum 2.0**. It shows which content descriptions are covered, which are missing, and what to look for when you plan the gaps. This guide walks you through an audit from start to finish. Allow about 20 minutes for your first audit.'));

add(H2('1. Open the tool'),
  table(['Option', 'How'], [
    ['In a browser (recommended)', 'Go to **samuelkerr48-sm.github.io/vc-audit** in Chrome or Edge. Nothing to download and no account.'],
    ['As an app', 'Chrome or Edge on a computer: click the **install** icon at the right of the address bar. Android: **⋮** › **Install app**. iPhone or iPad (Safari): **Share** › **Add to Home Screen**. It then opens in its own window with its own icon and works offline.'],
    ['As a file', 'If you were given *VC Curriculum Audit.html*, save it to your computer and double-click it. Don\'t open it from a Teams, SharePoint or Drive preview.']], [1, 2.6]),
  callout('**Private:** your files are read on your own computer. Nothing is uploaded or sent anywhere, and no AI is used. Your work is kept in the browser you used until you start a new audit.'),
  figure('g_header.png', 16, 'The top of the tool: subject buttons, the list of other learning areas, and Settings'));

add(H2('2. Gather your documents'),
  P('The tool works out what kind of document each file is and reads it the right way. You can add several kinds together.'),
  table(['Document', 'Examples', 'What the tool counts'], [
    ['Plans', 'Yearly overviews, scope and sequences, curriculum area plans, unit plans, lesson planners, term plans', 'Curriculum codes written where a unit is taught, and the words of the plan (learning intentions, success criteria, activities)'],
    ['Curriculum area maps', 'The VCAA map in Word, the VCAA Excel template, or your school\'s own map with codes across the top and units down the side', 'Only the ticks or AS numbers in the grid. The codes and descriptions listed across the top never count'],
    ['Coverage checklists', 'A tab that lists every code once with a count or tick beside it (e.g. a COUNTIF tab)', 'A code only when its count is above zero or it is ticked']], [1, 1.7, 2.2]),
  bullets([
    '**File types:** Word (.docx), PDF, PowerPoint (.pptx), Excel (.xlsx), CSV and text. Older .doc and .xls files: open them and **Save As** .docx or .xlsx first.',
    '**Detail helps:** a full lesson planner audits more accurately than a list of unit titles. Codes written in the plan (e.g. VC2M3N04) make the audit most accurate.',
    '**Maps:** use the Word or Excel version, not a PDF. Ticks can\'t be read from a PDF, so a PDF map is left out (you\'ll see a message).',
    '**Scanned PDFs** (pictures of pages) can\'t be read. Use the original Word file.',
    '**In Excel, each tab is judged on its own**, so one workbook can hold a plan, a map and a checklist. Each tab is listed under the file: click a tab to include it or leave it out. Draft, old, instruction and later-year tabs (e.g. *2027 Draft*) start left out.']));

add(H2('3. Set up the audit'),
  steps([
    '**Choose the subject** at the top right: **English**, **Mathematics**, or another learning area from **More learning areas…** (Science, Humanities, HPE, Technologies, The Arts).',
    '**Name the audit**, e.g. *Level 3 Mathematics – Semester 1*. The name goes on the reports.',
    '**Say what the upload covers.** **One unit or term**: gaps are expected and shown as "plan elsewhere in the year". **A whole year**: every content description should be covered.',
    '**Choose the level.** Click one level, several (a composite class or a team), or use **Quick select** for **Whole school F–6**, **Whole school 7–10** or **All levels**. Science, Humanities, Technologies, HPE and The Arts use VCAA bands (e.g. Levels 3 and 4). If your files contain VC2 codes, the level is chosen for you.']),
  figure('g_scope.png', 15, 'Step 1: name, scope and level'));

add(H2('4. Add your files'),
  steps([
    '**Drag your files** onto the box, click **Choose files**, or click **Choose a folder** to bring in every plan in a folder at once.',
    'Or open **Or paste text instead** to paste a plan straight in.',
    '**Check each file\'s label.** A curriculum area map shows **Curriculum area map**. With more than one level selected, each file shows **Counts for** with the level the tool found (from its codes, its name such as *Year 4* or *L04*, or its text). Change it if it\'s wrong, or choose **All selected levels** for a composite plan.',
    'For an Excel workbook, check the **tabs read** line under it. A tab with a line through it is left out; click it to include it.',
    'Click **Run the audit**.']),
  figure('g_files.png', 15, 'Step 2: four unit plans and a curriculum area map added'),
  figure('g_tabs.png', 15, 'An Excel workbook: next year\'s tabs are left out until you click them'),
  tip('Give files clear names with the level in them (e.g. *Level 4 Fractions unit.docx*). The tool uses the name to place each file at the right level.'));

add(H2('5. Read the summary'),
  bullets([
    '**The four tiles:** content descriptions **Covered**, **Partly covered** (some evidence, worth checking), **Not evident** (gaps), and how many codes are written in your files.',
    '**Coverage by strand and sub-strand** shows where coverage is thin. With several levels, **Coverage by level** shows each level\'s coverage.',
    '**Curriculum area map check** (when a map is uploaded with plans): content ticked on the map but not evident in the plans, and content evident in the plans but not ticked on the map. Cells marked "?" or without an AS number are listed to check.',
    '**Gaps to plan for** lists each missing content description with **Look for**: what a plan that covers it would include.',
    '**VLP lessons for gaps** (Mathematics): under each gap, the VLP sequences and lesson numbers that teach it, Foundation to Level 10A (from the VLP Maths reference of units, lessons and content descriptions). Supplementary lessons from the VLP Maths Repository are marked, and content taught only by supplementary lessons is noted as minimal in the VLPs. **Print VLP lessons for the gaps** lists every lesson\'s title and learning intention for each gap']),
  figure('g_vlp.png', 15, 'Gaps to plan for, with the VLP sequences that teach each one'),
  figure('g_summary.png', 15, 'The summary tiles'),
  figure('g_mapcheck.png', 15, 'Curriculum area map check: a map uploaded with four unit plans'));

add(H2('Make a curriculum area map (Map Creator)'),
  P('The **Curriculum Area Map Creator** builds a curriculum area map from your plans. Open it from **Create a map** at the top of the audit (or **samuelkerr48-sm.github.io/vc-audit/map-creator**).'),
  steps([
    'Choose the learning area: **Mathematics**, **English**, or another from **Other learning areas** (every learning area has a template in the same layout, a tab per level or band).',
    'Add your yearly overviews, scopes and sequences, curriculum area plans and unit plans. The tool finds the units in each; lesson planners are read as one unit each, and items that aren\'t units (camps, NAPLAN, revision, assessment weeks) are left out and listed. Unit names show the class structure (e.g. *F/1 · Number detectives*).',
    'Check the map: click any cell to tick, clear or change the achievement standard number. **?** marks a possible match to check.',
    'Click **Download the curriculum area map** for the Excel file, or **Audit this map** to open the audit with the map and the plans already added, so the map check runs straight away.']),
  figure('g_creator.png', 15, 'The Map Creator: units found in the plans, ticked against each content description'));

add(H2('6. Check the evidence'),
  P('The tool matches words, so always check before acting on a result. Open the **Content descriptions** tab.'),
  steps([
    'Click **Show evidence** under any content description to see why it got its status: the code if it is written in a file, the map tick and AS numbers, and the lines from your plans that matched, with learning intentions and success criteria marked.',
    'If the status is wrong, change it with the drop-down at the right. Your choice is kept and shows as *set by you* in the reports.',
    'Choose **Not planned for this sequence** for content you deliberately teach elsewhere, so it isn\'t counted as a gap.',
    'Add a **teacher note** to explain a decision (e.g. *taught in the daily number fact fluency block*).',
    'If your school has its own name for a program or routine (e.g. *Spelling Mastery*), add it under **Our school\'s words for this**. It then counts as evidence for that content description in every audit.']),
  figure('g_evidence_c.png', 11.5, 'Show evidence: the map tick, the matched lines from the plans, and where to change the status'),
  figure('g_filters.png', 16, 'Filters: show one level, strand, status or confidence, or search for a code or word'),
  tip('Filter by **Partly covered** first. These are the content descriptions most worth a conversation.'));

add(H2('7. Look across the whole audit (Insights)'),
  table(['View', 'Use it to'], [
    ['Progression across levels', 'Spot a **break**: a level where an idea is expected but not evident while other levels teach it'],
    ['Achievement standards', 'See each achievement standard statement with the content descriptions VCAA links to it, and its status (and the map\'s marks, if a map was uploaded)'],
    ['When in the year', 'See which term each content description is taught, and content left to Term 4. Needs "Term 1" to "Term 4" in headings, sheet names or file names'],
    ['Emphasis and thin coverage', 'Compare each strand\'s share of your plans with its share of the curriculum'],
    ['Repeated across levels', 'Find texts or unit titles used at more than one level'],
    ['Compare with a saved audit', 'See what has improved or gone backwards since an earlier audit']], [1, 2.6]));

add(H2('8. Make the reports'),
  P('Open the **Report** tab, add the school name and who prepared it, then choose:'),
  table(['Button', 'You get'], [
    ['Download Word report', 'An A4 landscape report: summary, coverage by level, map check, gaps to plan for, and every content description with its status and notes'],
    ['Print or save as PDF', 'The same report through the browser\'s print window'],
    ['Gap action plan (Excel)', 'Every gap with columns for an owner, a term, how it will be addressed and progress'],
    ['Team summaries (Word)', 'One page per level: its coverage, first gaps and what to look for. Ready for a PLC'],
    ['VLP lessons for the gaps (Word, or Print)', 'Mathematics: each gap with every VLP lesson that teaches it (sequence, lesson, title, learning intention). The gap action plan also has a VLP lessons column'],
    ['Save this audit to open later', 'A small file that keeps your status changes and notes. Open it again from **Set up › Open a saved audit**, or send it to a colleague']], [1, 2.6]),
  figure('g_report.png', 15, 'The Report tab'));

add(H2('9. Settings: your school'),
  P('Click **Settings** at the top right.'),
  bullets([
    '**School branding:** your school name, logo and colours on the tool and its reports.',
    '**SharePoint folder:** connect your synced Teaching and Learning folder, and reports save straight into *Curriculum audits*. Use Chrome if Edge doesn\'t show the folder picker.',
    '**Our school\'s words:** see and manage the program and routine names added under Show evidence.',
    '**Share with your staff:** saves a copy of the tool with your branding and school words built in.']),
  figure('g_settings_c.png', 9, 'Settings'));

add(H2('Running an audit with a team'),
  steps([
    'Before the meeting, the curriculum leader uploads the team\'s plans (and map, if there is one) and runs the audit.',
    'In the meeting, start with the **summary** and the **map check**, then filter **Content descriptions** by **Partly covered** and **Not evident**.',
    'For each one, open **Show evidence**: is it really missing, or taught but not written down? Change statuses and add notes as you go.',
    'Agree which gaps to plan for, then download the **gap action plan** and fill in an owner and a term for each.',
    'Save the audit. After the plans are updated, open it again, add the new plans and run it again to see the change.']),
  callout('The audit is a starting point for a professional conversation about the curriculum, not a judgement on a team\'s teaching.'));

add(H2('Troubleshooting'),
  table(['What you see', 'What to do'], [
    ['Almost everything covered from a blank template or a list of codes', 'Check the file is labelled correctly under Add your sequence. A reference list of every code (e.g. a printed scope and sequence chart) counts as a plan, so leave reference documents out'],
    ['Far fewer covered than expected', 'Check each file\'s **Counts for** level. Make sure maps are Word or Excel, not PDF. Check codes are written as VC2 codes (Version 1.0 codes are flagged, not counted)'],
    ['A file won\'t load', 'Save .doc or .xls files as .docx or .xlsx. Scanned PDFs can\'t be read; use the original'],
    ['The tool looks out of date', 'Close it and open it again while online: the app updates itself'],
    ['My audit has gone', 'Audits are kept in the browser you used. Use **Save this audit** to keep a copy, and open it from **Set up**'],
    ['Results look wrong for one content description', 'Open **Show evidence**, change the status with the drop-down, and add a note']], [1.3, 2.3]));

add(H2('Good to know'), bullets([
  '**Curriculum content** comes straight from VCAA\'s Victorian Curriculum F–10 Version 2.0 data (20 October 2026; © VCAA, CC BY-NC), checked word for word. Every code links to the VCAA site.',
  '**Not a VCAA product:** the tool is a planning aid. The VCAA curriculum and your school\'s own scope and sequence remain the reference.',
  '**More detail** on how statuses are decided is in the *How to use* tab inside the tool and in the *VC Curriculum Audit – Quick Brief*.']));

const numbering = { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } }, run: { color: CRIM } } }] }]
  .concat(NUMS.map(r => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } }, run: { bold: true, color: NAVY } } }] }))) };
const doc = new Document({
  creator: 'Sam', title: 'VC Curriculum Audit: How to use',
  styles: { default: { document: { run: { font: 'Arial', size: 19, color: '1A1A2E' } } },
    paragraphStyles: [
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: NAVY, font: 'Arial' }, paragraph: { outlineLevel: 1, spacing: { before: 240, after: 100 }, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: CRIM, font: 'Arial' }, paragraph: { outlineLevel: 2, spacing: { before: 160, after: 80 }, keepNext: true } }] },
  numbering,
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'VC Curriculum Audit: How to use · Version 1.6 · November 2026 · Page ', size: 15, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: GREY })] })] }) },
    children: body }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/VC Curriculum Audit - How to use.docx', b); console.log('ok', b.length); });
