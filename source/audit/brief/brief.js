// VC Curriculum Audit: Quick Brief, Version 1.6 — A4, navy and crimson (same layout as the other tool briefs).
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

add(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [new TableCell({ width: { size: CW, type: WidthType.DXA },
  shading: { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' }, margins: { top: 200, bottom: 200, left: 240, right: 240 },
  borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.SINGLE, size: 24, color: CRIM }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
  children: [new Paragraph({ children: [new TextRun({ text: 'VC Curriculum Audit: Quick Brief', bold: true, size: 40, color: 'FFFFFF' })], spacing: { after: 40 } }),
    new Paragraph({ children: [new TextRun({ text: 'Version 1.6 · 20 November 2026 · Every learning area except Languages, Victorian Curriculum 2.0', size: 20, color: 'FFFFFF' })], spacing: { after: 0 } })] })] })] }), P('', { after: 60 }));

add(H2('What the tool is'),
  P('VC Curriculum Audit checks a school\'s teaching sequences against **Victorian Curriculum 2.0**. Upload a unit, a term plan, a year overview or a whole school\'s program, and it shows which content descriptions are covered, which are missing, and what to look for when planning the gaps.'),
  table(['You get', 'What it shows'], [
    ['Coverage', 'Every content description for the levels you choose, marked **Covered**, **Partly covered** or **Not evident**, by strand, sub-strand and level'],
    ['Evidence', 'The lines in your documents that matched each content description, so every status can be checked'],
    ['Gaps', 'Missing content descriptions, grouped by sub-strand (or by level for a whole school), each with a **Look for** hint'],
    ['Texts, practices and routines', 'English: text types, genres, themes, skills and text diversity (including texts by Aboriginal and Torres Strait Islander authors). Maths: mathematical practices, explicit teaching and assessment routines, representations and contexts'],
    ['Insights', 'Progression across levels, achievement standards, when in the year, emphasis and thin coverage, and repeats across levels'],
    ['Report', 'A Word report (A4 landscape) or a PDF, a gap action plan in Excel, and one-page team summaries in Word, ready for a PLC, curriculum leader or school review']], [1, 2.8]),
  callout('The tool reads words, not intent. It is a starting point for a professional conversation about the curriculum, not a judgement on a team\'s teaching. Check the evidence before acting on any gap.'));

add(H2('The file'), bullets([
  '**One file:** *VC Curriculum Audit.html*. Download it, then double-click it. It opens in Chrome or Edge with no internet connection and no account. Don\'t open it from a Drive, SharePoint or Teams preview.',
  '**Private:** your files are read on your computer. Nothing is uploaded or sent anywhere, and no AI is used.',
  '**Every learning area except Languages:** **English** and **Mathematics** (buttons at the top right), and Science, History, Geography, Civics and Citizenship, Economics and Business, Health and Physical Education, Design and Technologies, Digital Technologies, Dance, Drama, Media Arts, Music, Visual Arts and Visual Communication Design (the learning area list). Learning areas set out in bands (for example Levels 3 and 4) are audited by band.',
  '**Files it reads:** Word (.docx), PDF, PowerPoint (.pptx), Excel (.xlsx, .xlsm), CSV and text, or pasted text. Add as many as you like, or a whole folder at once. Older .doc and .xls files need to be saved again as .docx or .xlsx. Scanned PDFs (pictures of pages) can\'t be read.']));

add(H2('Running an audit'),
  steps([
    '**Set up.** Name the audit and say whether the upload is **one unit or term** (gaps are expected) or **a whole year** (everything should be covered). Choose the level, or several levels, or a whole school with **Quick select**. If your files list VC2 codes, the level is chosen for you.',
    '**Add your files.** Drag in lesson planners, unit overviews, term plans or overview spreadsheets.',
    '**Run the audit** and read the **Summary**: coverage tiles, coverage by strand, what is covered at a glance, and the gap list.',
    '**Check the evidence** on the **Content descriptions** tab. Open **Show evidence** to see what matched. Change any status with the drop-down and add a note. **Not planned for this sequence** marks content you deliberately teach elsewhere, so it doesn\'t count as a gap.',
    '**Make the report** on the **Report** tab: Word, print or PDF. **Save this audit** keeps your changes and notes in a small file you can open later or share.']),
  figure('setup.png', 15, 'Set up: name, scope, level and files'),
  figure('summary.png', 15, 'Summary: covered, partly covered and not evident at a glance'),
  figure('evidence.png', 15, 'Show evidence: what the tool looked for, the lines that matched, and a place for a teacher note'));

add(H2('How each kind of document is read'),
  table(['Document', 'What counts'], [
    ['Plans: yearly overviews, scope and sequences, curriculum area plans, unit and lesson plans', 'A VC2 code written where a unit is taught, and the words of the plan'],
    ['Curriculum area maps: codes once across the top, units down the side', 'Only the ticks or AS numbers in the grid. The codes listed across the top never count'],
    ['Coverage checklists: every code listed once with a count or tick beside it (e.g. a COUNTIF tab)', 'A code only when its count is above zero or it is ticked']], [1.4, 2]),
  P('In Excel, each tab is judged on its own, so one workbook can hold a plan, a map and a checklist.'));

add(H2('Curriculum area maps'),
  P('VCAA\'s curriculum area maps list a level\'s content descriptions across the top and each teaching and learning unit down the side, with a tick and achievement standard (AS) numbers wherever a unit addresses a content description.', { keepNext: true }),
  bullets([
    '**Upload the Word file as it is.** The tool reads which content descriptions each unit is ticked against, and the AS numbers. Ticks can be Word check boxes, the tick in VCAA\'s filled-in examples, or a typed *x* or *Y*; an AS number on its own also counts.',
    '**Only ticks count.** The content descriptions listed across the top of the map, and the achievement standard sentences, are never counted as coverage. A blank template audits as nothing covered.',
    '**Check the map against the plans:** upload the unit plans with the map, and the **Curriculum area map check** lists content ticked on the map but not evident in the plans, and content evident in the plans but not ticked. The same check goes in the Word report.',
    '**Excel maps:** a school\'s map kept in Excel (codes across the top, units down the side, a tab per level) works the same way. Only a cell with an AS number counts (*5*, *15,16*, *7-8*, *14b*); a cell with *?* or other text isn\'t counted and is listed for the team to check.',
    '**Achievement standards:** the sentences the map marks (its Y/N boxes, or the AS numbers used) appear beside each statement on the Insights tab, flagged where they disagree with the audit.',
    '**Use the Word version.** Ticks can\'t be read from a PDF of a map, so a PDF map is left out of the audit, with a message.',
    '**Every learning area:** maps for Science, Humanities, HPE, Technologies and The Arts read the same way, in Word or Excel, at their VCAA bands (e.g. Levels 3 and 4).',
    '**Make a map:** the **Curriculum Area Map Creator** (*Create a map* at the top) builds a map in your school\'s Excel layout from your yearly overviews, scopes and sequences and unit plans, for any learning area. Its **Audit this map** button opens the audit with the map and those plans already added.']),
  figure('mapcard.png', 15, 'Curriculum area map check: a Level 3 map uploaded with four unit plans'));

add(H2('Whole-school audits'),
  bullets([
    '**Quick select:** **Whole school F–6**, **Whole school 7–10** (7–10A in Maths) or **All levels**. You can also tick any combination of levels.',
    '**Each file counts towards its own level.** The tool reads the level from the VC2 codes in a file, then its name (for example *L04*, *Level 4*, *Year 4*, *Foundation*), then any "Level 4" in its text. Change it with **Counts for** under each file, for example to **All selected levels** for a composite plan.',
    '**One workbook, many levels:** an Excel overview with a tab for each level (*Level 3*, *Year 4*…) is split into one entry per tab, so each tab counts towards its own level.',
    '**Workbooks with several tabs:** each tab is listed under the file. Draft, old, instruction and later-year tabs (e.g. *2027 Draft*) start left out; click a tab to include it or leave it out.',
    '**Coverage by level** shows each level\'s coverage overall and by strand, and the gap list is grouped by level, so each team sees its own gaps.']),
  figure('countsfor.png', 15, 'Counts for: each file is tied to a level, and can be changed'),
  figure('bylevel.png', 15, 'Coverage by level in a whole-school Mathematics audit'));

add(H2('VLP lessons for gaps'),
  bullets([
    '**Mathematics, Foundation to Level 10A:** under each gap, the VLP sequences and lesson numbers that teach it, the level\'s own sequences first, from the VLP Maths reference of units, lessons and content descriptions (VLP Maths Tools 19.7).',
    '**Supplementary lessons** from the VLP Maths Repository are marked. Content taught only by supplementary lessons is noted as minimal content in the VLPs.',
    '**Print VLP lessons for the gaps** (Summary and Report tabs) and **VLP lessons for the gaps (Word)** (Report tab) list each gap with every lesson\'s title and learning intention. The gap action plan has a VLP lessons column, and the Word and printed reports show the line under each gap.']),
  figure('g_vlp.png', 15, 'Gaps with the VLP sequences that teach them'));

add(H2('How the audit decides'),
  table(['Status', 'Means'], [
    ['Covered', 'The file lists the code (e.g. VC2E5LA05, VC2M4N03), or most of what the content description involves appears clearly in the sequence'],
    ['Partly covered', 'Some of it appears, or it is only mentioned in passing. Worth checking'],
    ['Not evident', 'Little or nothing found'],
    ['Not planned for this sequence', 'Set by a teacher: taught elsewhere, so not counted as a gap']], [1, 3]),
  bullets([
    '**Evidence:** in English and Mathematics, each content description is linked to the things a sequence that covers it would mention. For VC2E5LA05, that means complex sentences, dependent clauses and subordinating conjunctions. For VC2M4M04 (angles), it means acute, obtuse and reflex angles, and protractors. Something mentioned often counts more than a single passing mention.',
    '**Key words from VCAA:** every content description also has up to 12 distinctive words and phrases from its own wording and its VCAA elaborations. Words common across the whole subject count for little, and one shared word is never enough (Covered needs three distinct key words, Partly covered needs two). In the other learning areas these key words are the evidence; in English and Mathematics they back it up.',
    '**What counts most:** a line in a learning intention, success criteria or assessment counts double. A word that appears only in a vocabulary or materials list counts for much less.',
    '**Confidence in plain words** sits under each status: *strong evidence*, *good evidence*, *passing mention only*, *code listed*, *your school\'s words*, *set by you*. Filter by it to check the weakest first.',
    '**Detail matters:** a full lesson planner audits more accurately than a list of unit titles.',
    '**Version 1.0 codes** (e.g. VCELA, VCMNA) are flagged, and the sequence is mapped to Version 2.0 instead.',
    '**Codes from other levels** are listed, so you can add those levels to the audit.']));

add(figure('keywords.png', 15, 'Science: key words from the VCAA wording and elaborations, the lines that matched, and the elaborations themselves'));

add(H2('Insights'),
  P('The **Insights** tab looks across the whole audit. Use it to decide where to look, then check the plans.', { keepNext: true }),
  table(['View', 'What it shows'], [
    ['Progression across levels', 'Each idea (or sub-strand) the curriculum builds over several levels, and any **break**: a level where it is expected but not evident while other levels teach it'],
    ['Achievement standards', 'Every achievement standard statement, linked to the content descriptions VCAA connects it to, with a status from them (and the curriculum area map\'s Y/N where a map was uploaded)'],
    ['When in the year', 'Which term each content description appears in, strands not revisited, and content left to Term 4. Needs "Term 1" to "Term 4" in headings, a column, sheet names or file names'],
    ['Emphasis and thin coverage', 'Each strand\'s share of your plans beside its share of the curriculum, and content counted as covered on only one or two mentions'],
    ['Repeated across levels', 'Texts or unit titles that appear at more than one level'],
    ['Compare with a saved audit', 'What has improved or gone backwards since an earlier audit']], [1, 2.8]),
  figure('progression.png', 15, 'Progression across levels in a Science audit of Levels 3 and 4 and Levels 5 and 6'));

add(H2('Your school\'s settings'), bullets([
  '**Our school\'s words:** under **Show evidence**, add the name your school uses for a program, routine or unit (for example *Spelling Mastery*). It counts as evidence for that content description from then on. Manage the list in **Settings**.',
  '**Branding:** add your school name and logo in **Settings**. They appear on the tool and the reports.',
  '**Saving to a folder:** in **Settings**, choose a folder (for example a synced SharePoint or OneDrive folder) and reports and saved audits go straight into it.']));

add(H2('Texts, practices and routines'),
  P('**English:** text types (with core types for each band flagged when missing), text diversity and cross-curriculum priorities, genres, themes, and reading, writing, speaking and listening and literary analysis skills.'),
  P('**Other learning areas:** explicit teaching and assessment routines, cross-curriculum priorities and general capabilities.'),
  P('**Mathematics:** mathematical practices (problem solving, reasoning, modelling, algorithms, estimation, digital tools), explicit teaching and assessment routines (daily review, worked examples, mini whiteboards, hinge questions, exit tickets, enabling and extending prompts, inclusion adjustments), representations and materials, and contexts.'),
  P('A tick means the word or phrase appears in the sequence, not that it was taught in depth. Click an item to see where it appears.'),
  figure('practices.png', 15, 'Mathematics: practices found, with the key practices for the band flagged when missing'), figure('routines-crop.png', 15, 'Mathematics: explicit teaching and assessment routines found in a Level 4 unit'));

add(H2('Using it with a team'),
  steps([
    'Each team uploads its sequences for the year (or the curriculum leader uploads the whole school\'s).',
    'The team checks the evidence for anything marked Partly covered or Not evident, changes statuses where the documents don\'t show what is taught, and adds notes.',
    'Download the Word report, the **team summaries** (one page per level) and the **gap action plan** (Excel, with columns for an owner, a term, how the gap will be addressed and progress), and bring them to the PLC or curriculum meeting.',
    'Agree which gaps to plan for and where in the year they will go.',
    'Save the audit file and run the audit again after the sequences are updated.']),
  figure('reportpg.png', 15, 'The Word report: summary, coverage by level, gaps to plan for and every content description'));

add(H2('Things to know'), bullets([
  '**Curriculum wording:** content descriptions, elaborations and achievement standards come straight from VCAA\'s Victorian Curriculum F–10 Version 2.0 data export (20 October 2026; © VCAA, CC BY-NC). Every one of the 1,440 content descriptions has been checked word for word against it.',
  '**Achievement standards** are VCAA\'s achievement standard extracts, each linked to the content descriptions VCAA connects it to.',
  '**Saving:** your audit is kept in the browser you use until you start a new one. Use **Save this audit** to keep it or move it to another computer.',
  '**Scope:** a single unit is expected to have gaps. Read the result as "not in this sequence" and check where else the content is taught.',
  '**False matches:** the tool can be fooled both ways. Words used in passing can suggest coverage, and content taught under different names can be missed. The evidence view and the status drop-down are there for this.',
  '**Not a VCAA product:** the tool is a planning aid. The VCAA curriculum and the school\'s own scope and sequence remain the reference.']));

const numbering = { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } }, run: { color: CRIM } } }] }]
  .concat(NUMS.map(r => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } }, run: { bold: true, color: NAVY } } }] }))) };
const doc = new Document({
  creator: 'Sam', title: 'VC Curriculum Audit: Quick Brief',
  styles: { default: { document: { run: { font: 'Arial', size: 19, color: '1A1A2E' } } },
    paragraphStyles: [
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: NAVY, font: 'Arial' }, paragraph: { outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: CRIM, font: 'Arial' }, paragraph: { outlineLevel: 2 } }] },
  numbering,
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'VC Curriculum Audit: Quick Brief · Version 1.6 · 20 November 2026 · Page ', size: 15, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: GREY })] })] }) },
    children: body }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/VC Curriculum Audit - Quick Brief.docx', b); console.log('ok', b.length); });
