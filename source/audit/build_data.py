# Builds data/curriculum.json from the structured copy of the VCAA Victorian Curriculum F-10 V2.0 site (scriffle/cognito curriculum_data.js).
# Excludes EAL and Foundation Levels A-D. Converts LaTeX maths to plain text. Splits achievement standards into statements.
import json, re, subprocess, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/ext/cog/curriculum_data.js'
js = f"const fs=require('fs');const s=fs.readFileSync({json.dumps(SRC)},'utf8');const D=new Function(s.replace(/^const DATA\\s*=/,'return ')+';')();process.stdout.write(JSON.stringify(D));"
D = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)

def lvkey(n):
    n = n.strip()
    if n == 'Foundation': return 'F'
    if n == 'Foundation to Level 2': return 'F-2'
    m = re.fullmatch(r'Level (\d+A?)', n)
    if m: return m.group(1)
    m = re.fullmatch(r'Levels (\d+) and (\d+)', n)
    if m: return f'{m.group(1)}-{m.group(2)}'
    return None

def plain(t):
    t = t.replace('\u200d', '').replace('\u00a0', ' ')
    t = re.sub(r'\$\s*\\frac\{([^}]*)\}\{([^}]*)\}\s*\$', r'\1/\2', t)
    t = re.sub(r'\\frac\{([^}]*)\}\{([^}]*)\}', r'\1/\2', t)
    t = t.replace('\\pi', 'π').replace('\\sin', 'sin').replace('\\cos', 'cos').replace('\\tan', 'tan').replace('\\times', '×').replace('\\div', '÷').replace('\\leq', '≤').replace('\\geq', '≥').replace('\\sqrt', '√').replace('\\%', '%').replace('\\,', ' ')
    t = re.sub(r'\$([^$]*)\$', r'\1', t)
    t = re.sub(r'\s+([,.;:])', r'\1', t)
    return re.sub(r'\s+', ' ', t).strip()

HEADERS = ['Speaking and Listening', 'Speaking and listening', 'Reading and Viewing', 'Reading and viewing', 'Writing', 'Dance', 'Drama', 'Media Arts', 'Music', 'Visual Arts', 'Visual Communication Design',
           'Number', 'Algebra', 'Measurement', 'Space', 'Statistics', 'Probability']
def statements(text):
    text = plain(text)
    if not text or text.startswith('There is no achievement standard'): return []
    text = re.sub(r'([.!?])(?=[A-Z])', r'\1 ', text)
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    out, group = [], ''
    for p in parts:
        p = p.strip()
        for h in sorted(HEADERS, key=len, reverse=True):
            if p.startswith(h + ' ') and re.match(r'[A-Z]', p[len(h) + 1:]) and not p.startswith(h + ' and '):
                group = h.capitalize() if h[0].isupper() else h; p = p[len(h) + 1:]; break
        if re.search(r'demonstrate the following skills', p): continue
        if len(p.split()) >= 4: out.append({'g': group, 't': p.rstrip('.')})
    return out

ORDER = [('english', 'English', 'English', 'English'), ('maths', 'Mathematics', 'Mathematics', 'Mathematics'), ('science', 'Science', 'Science', 'Science'),
         ('history', 'Humanities', 'History', 'History'), ('geography', 'Humanities', 'Geography', 'Geography'), ('civics', 'Humanities', 'Civics and Citizenship', 'Civics and Citizenship'),
         ('economics', 'Humanities', 'Economics and Business', 'Economics and Business'), ('hpe', 'Health and Physical Education', None, 'Health and Physical Education'),
         ('designtech', 'Technologies', 'Design and Technologies', 'Design and Technologies'), ('digitech', 'Technologies', 'Digital Technologies', 'Digital Technologies'),
         ('dance', 'The Arts', 'Dance', 'Dance'), ('drama', 'The Arts', 'Drama', 'Drama'), ('media', 'The Arts', 'Media Arts', 'Media Arts'), ('music', 'The Arts', 'Music', 'Music'),
         ('visualarts', 'The Arts', 'Visual Arts', 'Visual Arts'), ('viscomm', 'The Arts', 'Visual Communication Design', 'Visual Communication Design')]
areas = {a['n']: a for a in D['h'].values()}
out = []
for key, area, sub, name in ORDER:
    A = areas[area]; S = A['d'].get(sub) if sub and sub in A['d'] else list(A['d'].values())[0]
    cds, stds, levels = [], {}, []
    for lvName, L in S['l'].items():
        lk = lvkey(lvName)
        if not lk: continue
        if lk not in levels: levels.append(lk)
        st = statements(D['as'].get(L.get('ai'), '') if L.get('ai') else '')
        if st: stds[lk] = st
        for stn, ST in (L.get('st') or {}).items():
            for ssn, SS in (ST.get('ss') or {}).items():
                for cd in SS.get('cd') or []:
                    cds.append({'code': cd['c'], 'level': lk, 'strand': stn.strip(), 'substrand': (ssn or stn).strip(), 'description': plain(cd['d']),
                                'el': [plain(e) for e in (cd.get('e') or []) if len(plain(e).split()) > 2]})
    def lsort(k):
        if k == 'F': return 0
        if k == 'F-2': return 0.5
        m = re.match(r'(\d+)', k); return int(m.group(1)) + (0.5 if k.endswith('A') else 0) + (0.1 if '-' in k else 0)
    levels.sort(key=lsort)
    strands = list(dict.fromkeys(c['strand'] for c in cds))
    out.append({'key': key, 'name': name, 'area': area, 'levels': levels, 'strands': strands, 'cds': cds, 'standards': stds})
    print(f"{name:30s} {len(cds):4d} cds levels={levels} standards={ {k: len(v) for k, v in stds.items()} }")
json.dump({'source': 'Victorian Curriculum F–10 Version 2.0 (VCAA), from a structured copy of the VCAA curriculum website', 'subjects': out}, open('/home/claude/ca/data/curriculum.json', 'w'), ensure_ascii=False, separators=(',', ':'))
