# Builds src/vlpref.js from "VLP Maths - Units, lessons and content descriptions.xlsx" (Sam, 20 Nov 2026;
# built from the VLP Maths Tools 19.7 data, Primary F–6 and Secondary 7–10A).
# Usage: python3 build_vlpref.py vlpref/vlp-maths-reference.xlsx
import sys, json, re, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
lv = lambda s: 'F' if s == 'Foundation' else str(s).replace('Level ', '')
src = 'VLP Maths – Units, lessons and content descriptions (VLP Maths Tools 19.7)'
seqs, key = [], {}
for r in wb['Sequences'].iter_rows(min_row=5, values_only=True):
    if not r[0] or not r[2]: continue
    k = (lv(r[0]), str(r[1] or ''), r[2]); key[k] = len(seqs)
    seqs.append([lv(r[0]), str(r[1] or ''), r[2], r[3] or ''])
les = []
for r in wb['Lessons'].iter_rows(min_row=5, values_only=True):
    if not r[0] or not r[2]: continue
    k = (lv(r[0]), str(r[1] or ''), r[2])
    if k not in key: key[k] = len(seqs); seqs.append([k[0], k[1], k[2], r[3] or ''])
    codes = re.findall(r'VC2M\w+', str(r[7] or ''))
    li = re.sub(r'\s+', ' ', str(r[9] or '')).strip()
    les.append([key[k], str(r[4] or ''), str(r[5] or ''), 1 if str(r[6]).startswith('Supp') else 0, ' '.join(codes), li])
out = 'const VLP_REF=' + json.dumps({'src': src, 'seqs': seqs, 'les': les}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open('src/vlpref.js', 'w', encoding='utf-8').write(out)
print(len(seqs), 'sequences', len(les), 'lessons', len(out) // 1024, 'KB')
