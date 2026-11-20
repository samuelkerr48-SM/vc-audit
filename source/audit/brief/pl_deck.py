# 30-minute PL deck: VC Curriculum Audit and the Curriculum Area Map Creator.
# DET Schools sector style recreated with python-pptx (mint header slides with salmon band and red/white triangles,
# white content slides with navy titles). If the DET template file is supplied as argv[1], its layouts are used:
# Title Slide, 3_Title Slide (section dividers), Title and Content.
import sys, os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = HERE + 'VC Curriculum Audit - Professional learning.pptx'
NAVY, CRIM, MINT, SALMON, GREY = '1F1646', 'D40032', 'B8E9EB', 'F9D2CA', '5D5A73'
rgb = RGBColor.from_string
TPL = sys.argv[1] if len(sys.argv) > 1 else None
p = Presentation(TPL) if TPL else Presentation()
if not TPL: p.slide_width, p.slide_height = Inches(13.333), Inches(7.5)
W, H = 13.333, 7.5
L = {l.name: l for l in p.slide_layouts}
blank = L.get('Blank') or p.slide_layouts[6]

def tri(s, pts, color):
    fb = s.shapes.build_freeform(Inches(pts[0][0]), Inches(pts[0][1]))
    fb.add_line_segments([(Inches(x), Inches(y)) for x, y in pts[1:]], close=True)
    sh = fb.convert_to_shape(); sh.fill.solid(); sh.fill.fore_color.rgb = rgb(color); sh.line.fill.background(); sh.shadow.inherit = False

def text(s, x, y, w, h, paras, anchor='t'):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); tf = tb.text_frame; tf.word_wrap = True
    tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[anchor]
    for i, q in enumerate(paras):
        q = q if isinstance(q, dict) else {'t': q}
        par = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        par.space_after = Pt(q.get('after', 8))
        segs = q['t'].split('**')
        for k, seg in enumerate(segs):
            if not seg: continue
            r = par.add_run(); r.text = seg; f = r.font; f.size = Pt(q.get('sz', 18)); f.name = 'Arial'
            f.bold = q.get('b', False) or k % 2 == 1; f.color.rgb = rgb(q.get('c', NAVY))
    return tb

def bg(s, c): f = s.background.fill; f.solid(); f.fore_color.rgb = rgb(c)

def header(s, label):
    bg(s, MINT)
    tri(s, [(0, 2.5), (11.0, 2.5), (12.13, 5.0), (11.0, 7.5), (0, 7.5)], SALMON)
    tri(s, [(W, 2.5), (W, 7.5), (12.13, 5.0)], CRIM)
    tri(s, [(12.13, 5.0), (W, 7.5), (11.0, 7.5)], 'FFFFFF')
    b = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.96), Inches(0.72), Inches(4.86), Inches(0.47))
    b.fill.background(); b.line.color.rgb = rgb(NAVY); b.line.width = Pt(4.5)
    tf = b.text_frame; tf.text = label; r = tf.paragraphs[0].runs[0]; r.font.size = Pt(18); r.font.color.rgb = rgb(NAVY); r.font.name = 'Arial'
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER

def notes(s, t): s.notes_slide.notes_text_frame.text = t

def title_slide(title, sub, n):
    s = p.slides.add_slide(L.get('Title Slide', blank) if TPL else blank)
    if TPL:
        s.shapes.title.text = title
        if len(s.placeholders) > 1: s.placeholders[1].text = sub
    else:
        header(s, 'PROFESSIONAL LEARNING')
        text(s, 0.72, 3.3, 9.6, 1.6, [{'t': title, 'sz': 36, 'after': 4}], 'b')
        text(s, 0.72, 5.0, 9.6, 0.9, [{'t': sub, 'sz': 20}])
    notes(s, n); return s

SEC = [0]
def divider(title, sub, n):
    SEC[0] += 1
    s = p.slides.add_slide(L.get('3_Title Slide', blank) if TPL else blank)
    if TPL:
        s.shapes.title.text = title
    else:
        header(s, 'PART %d' % SEC[0])
        text(s, 0.72, 3.3, 9.6, 1.6, [{'t': title, 'sz': 34, 'after': 4}], 'b')
        if sub: text(s, 0.72, 5.0, 9.6, 0.9, [{'t': sub, 'sz': 20}])
    notes(s, n); return s

def content(title, paras=None, img=None, n='', img_w=None, left_w=5.6):
    s = p.slides.add_slide(L.get('Title and Content', blank) if TPL else blank)
    if TPL and s.shapes.title is not None:
        s.shapes.title.text = title
        for ph in list(s.placeholders):
            if ph.placeholder_format.idx != 0: ph._element.getparent().remove(ph._element)
        top = 1.6
    else:
        bg(s, 'FFFFFF')
        text(s, 0.6, 0.35, 12.1, 0.9, [{'t': title, 'sz': 30, 'after': 0}], 'm')
        ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(1.25), Inches(1.4), Inches(0.07)); ln.fill.solid(); ln.fill.fore_color.rgb = rgb(CRIM); ln.line.fill.background()
        top = 1.55
    if img:
        im = Image.open(HERE + img); ar = im.height / im.width
        if paras:
            x0 = 0.6 + left_w + 0.3; maxw = W - x0 - 0.5
        else:
            x0 = 0.6; maxw = W - 1.2
        w = img_w or maxw; hh = w * ar
        if hh > H - top - 0.4: hh = H - top - 0.4; w = hh / ar
        if not paras: x0 = (W - w) / 2
        pic = s.shapes.add_picture(HERE + img, Inches(x0), Inches(top + 0.1), width=Inches(w))
        pic.line.color.rgb = rgb('C9C5D9'); pic.line.width = Pt(0.75)
    if paras:
        text(s, 0.6, top + 0.1, left_w if img else W - 1.2, H - top - 0.5, [q if isinstance(q, dict) else {'t': '▪ ' + q if not q.startswith(('1', '2', '3', '4', '5')) else q, 'sz': 17} for q in paras])
    notes(s, n); return s

def table_slide(title, head, rows, n, widths):
    s = content(title, n=n)
    x, y = 0.6, 1.7
    t = s.shapes.add_table(len(rows) + 1, len(head), Inches(x), Inches(y), Inches(sum(widths)), Inches(0.5 * (len(rows) + 1))).table
    for j, wv in enumerate(widths): t.columns[j].width = Inches(wv)
    for i, row in enumerate([head] + rows):
        for j, v in enumerate(row):
            c = t.cell(i, j); c.text = v; para = c.text_frame.paragraphs[0]; r = para.runs[0]
            r.font.size = Pt(15); r.font.name = 'Arial'; r.font.bold = i == 0 or j == 0
            r.font.color.rgb = rgb('FFFFFF' if i == 0 else NAVY)
            c.fill.solid(); c.fill.fore_color.rgb = rgb(NAVY if i == 0 else ('F4F3F8' if i % 2 == 0 else 'FFFFFF'))
    return s

# ---------------- the deck (about 30 minutes) ----------------
title_slide('Checking curriculum coverage with VC Curriculum Audit',
  'Audit plans and curriculum area maps against Victorian Curriculum 2.0, and build a map from your plans',
  '1 min. Welcome. Today: what the audit shows, how to read it with a team, and how the Map Creator builds a curriculum area map from the plans you already have.')

content('Learning intentions and success criteria', [
  {'t': 'We are learning to', 'b': True, 'c': CRIM, 'sz': 18},
  'use VC Curriculum Audit to see which content descriptions our plans cover',
  'build and check a curriculum area map with the Map Creator',
  {'t': 'We will know we have it when we can', 'b': True, 'c': CRIM, 'sz': 18},
  'run an audit on one of our own plans and explain one result from its evidence',
  'name two gaps for our team, with a VLP sequence or plan to address each',
  'make a map from our plans and say what the map check shows'],
  n='1 min. Read the success criteria aloud. Teachers will try each one in the activity.')

divider('What the audit shows', 'Coverage you can check, not a judgement', '30 sec.')

content('Covered, partly covered, not evident', [
  'Upload plans: yearly overviews, scope and sequences, unit plans, lesson planners',
  'Every content description at the level gets a status: **Covered**, **Partly covered** or **Not evident**',
  'A VC2 code written where a unit is taught counts; so do the plan’s words, matched to VCAA’s wording and elaborations',
  'Every status shows its evidence, and the team can change it',
  'Files stay on the computer: nothing is uploaded and no AI is used'],
  img='g_summary.png', n='3 min. Show the tiles. Stress that a word match is a starting point: always open the evidence before acting.')

table_slide('Each kind of document is read differently',
  ['Document', 'What counts'],
  [['Plans (overviews, scope and sequences, unit plans)', 'Codes written where a unit is taught, and the words of the plan'],
   ['Curriculum area maps (Word or Excel, any learning area)', 'Only the ticks or AS numbers in the grid, never the codes across the top'],
   ['Coverage checklists (e.g. a COUNTIF tab)', 'A code only when its count is above zero or it is ticked'],
   ['Excel workbooks with several tabs', 'Each tab on its own; draft and next-year tabs start left out']],
  '2 min. A blank map template audits as nothing covered. Click a tab under an Excel file to include or leave it out.', [5.2, 6.9])

divider('Running an audit', 'Set up, add files, check the evidence', '30 sec.')

content('Set up and add your files', [
  '1  Choose the learning area and the level (or **Quick select** for a whole school)',
  '2  Say whether the upload is **one unit or term** or **a whole year**',
  '3  Drag in plans, maps or a whole folder',
  '4  Check each file’s **Counts for** level and, for Excel, the **tabs read**',
  '5  **Run the audit**'], img='g_files.png',
  n='3 min. Live demo if possible: samuelkerr48-sm.github.io/vc-audit. Use a real team plan.')

content('Check the evidence before acting', [
  '**Show evidence**: the code, the map tick, and the lines that matched',
  'Change a status, or mark **Not planned for this sequence**',
  'Add a teacher note to explain a decision',
  'Start with **Partly covered**: the most useful conversations'], img='g_evidence_c.png', img_w=5.6,
  n='3 min. Model the professional conversation: is it missing, or taught but not written down?')

content('Gaps, with the VLP sequences that teach them', [
  '**Gaps to plan for** lists each missing content description with what to look for',
  'Each gap lists the VLP sequences and lessons that teach it (Foundation to Level 10A); print them with titles and learning intentions',
  'Content the Department marks as minimal in the VLPs is noted, with the Repository’s supplementary lesson',
  'Download the **gap action plan** (Excel) to give each gap an owner and a term'], img='g_vlp.png',
  n='3 min. Show Print VLP lessons for the gaps. The same list is on the Report tab as a Word document, and in the gap action plan.')

divider('Curriculum area maps', 'Make one from your plans, then check it', '30 sec.')

content('The Curriculum Area Map Creator', [
  'Open **Create a map** at the top of the audit',
  'Every learning area has a template: a tab per level or band, AS numbers by strand',
  'Add overviews and unit plans: units are found, and non-units (camps, NAPLAN, revision) are left out',
  'Click a cell to tick, clear or change the AS number; **?** is a possible match',
  '**Download** the Excel map, or **Audit this map**'], img='g_creator.png',
  n='3 min. Composite classes show their structure in the unit name, e.g. 3/4 · Unlocking larger numbers.')

content('The map check', [
  'Upload the map with the plans it describes (or click **Audit this map**)',
  '**On the map, not in the plans**: a tick to check',
  '**In the plans, not on the map**: a tick to add',
  'Cells marked “?” or without an AS number are listed to check'], img='g_mapcheck.png',
  n='2 min. The map is only as good as the plans behind it: this check keeps them in step.')

content('Try it (10 minutes)', [
  '1  Open samuelkerr48-sm.github.io/vc-audit in Chrome or Edge',
  '2  Audit one of your team’s plans at your level',
  '3  Open the evidence for one **Partly covered** result: agree its status',
  '4  Name two gaps and a VLP sequence or plan for each',
  '5  Click **Create a map**, add the same plans, then **Audit this map**',
  {'t': 'Share: one result that surprised you, and one gap you will plan for.', 'b': True, 'c': CRIM, 'sz': 17}],
  n='10 min. Circulate. Teachers without a plan can use a VLP sequence overview.')

content('Next steps', [
  'Run the audit with your team before planning next term',
  'Save the audit, then run it again after the plans are updated to see the change',
  'Keep the map and plans together: rebuild the map when units change',
  'Guides: **VC Curriculum Audit – How to use** and the **Quick Brief**',
  {'t': 'The audit is a starting point for a professional conversation about the curriculum, not a judgement on a team’s teaching.', 'c': GREY, 'sz': 15}],
  n='1 min. Close with the success criteria: can each team name two gaps and a plan for each?')

p.save(OUT); print('saved', OUT, len(p.slides), 'slides')
