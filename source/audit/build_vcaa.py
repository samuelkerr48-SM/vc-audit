# Builds data/curriculum.json from the VCAA VC2 CSV export (VC2_ASExtract-CD-Elab-CCP_<date>.csv).
# Content descriptions, elaborations, achievement standard sentences (with VCAA's own links to content descriptions)
# and cross-curriculum priority tags. Excludes Languages, EAL, capabilities and Foundation Levels A–D.
import csv,json,re,sys,collections
# Two files from the same export: the full one (content descriptions, strands, elaborations, priorities, Level 10A)
# and the extract one (each achievement standard sentence with the content descriptions VCAA links to it).
FULL=sys.argv[1] if len(sys.argv)>1 else 'vcaa/VC2_AS-CD-Elab-CCP_20-10-2026.csv'
EXT=sys.argv[2] if len(sys.argv)>2 else 'vcaa/VC2_ASExtract-CD-Elab-CCP_20-10-2026.csv'
SRC=FULL
def load(f):
    fh=open(f,encoding='utf-8-sig');fh.readline();fh.readline();return list(csv.DictReader(fh))
R=load(FULL);X=load(EXT)
SUBJ=[('english','English','English','English'),('maths','Mathematics','Mathematics',''),('science','Science','Science',''),
 ('history','History','Humanities','History'),('geography','Geography','Humanities','Geography'),('civics','Civics and Citizenship','Humanities','Civics and Citizenship'),
 ('economics','Economics and Business','Humanities','Economics and Business'),('hpe','Health and Physical Education','Health and Physical Education',''),
 ('designtech','Design and Technologies','Technologies','Design and Technologies'),('digitech','Digital Technologies','Technologies','Digital Technologies'),
 ('dance','Dance','The Arts','Dance'),('drama','Drama','The Arts','Drama'),('media','Media Arts','The Arts','Media Arts'),('music','Music','The Arts','Music'),
 ('visualarts','Visual Arts','The Arts','Visual Arts'),('viscomm','Visual Communication Design','The Arts','Visual Communication Design')]
def lvkey(b,code):
    if b=='Level 10A':return '10A'
    if b=='Foundation':return 'F'
    if b=='Foundation to Level 2':return 'F-2'
    m=re.fullmatch(r'Levels (\d+) and (\d+)',b)
    if m:return m[1]+'-'+m[2]
    m=re.fullmatch(r'Level (\d+)',b)
    if m:return m[1]
    return None
ORDER=['F','F-2','1','1-2','2','3','3-4','4','5','5-6','6','7','7-8','8','9','9-10','10','10A']
def clean(t):
    t=(t or '').replace('\u200b','').replace('\u200d','').replace('\u00a0',' ')
    t=re.sub(r'\$\s*\\frac\{([^}]*)\}\{([^}]*)\}\s*\$',r'\1/\2',t)
    t=re.sub(r'\\frac\{([^}]*)\}\{([^}]*)\}',r'\1/\2',t)
    for a,b in [('\\pi','π'),('\\sin','sin'),('\\cos','cos'),('\\tan','tan'),('\\times','×'),('\\div','÷'),('\\leq','≤'),('\\geq','≥'),('\\sqrt','√'),('\\%','%'),('\\,',' ')]:t=t.replace(a,b)
    t=re.sub(r'\$([^$]*)\$',r'\1',t);t=re.sub(r'\s+([,.;:])',r'\1',t)
    t=re.sub(r'([a-z][.!?])(?=[A-Z])',r'\1 ',t)  # VCAA joins sentences without a space
    return re.sub(r'\s+',' ',t).strip()
out=[]
for key,name,area,disc in SUBJ:
    rs=[r for r in R if r['Learning area/Capability']==area and (r['Discipline/Language']or'')==disc]
    cds={};std=collections.OrderedDict()
    for r in rs:
        code=clean(r['Content description code']);lv=lvkey(r['Level/Band'],code)
        if not lv or not code:continue
        if code not in cds:
            cds[code]={'code':code,'level':lv,'strand':clean(r['Strand']),'substrand':clean(r['Sub-strand']) or clean(r['Strand']),'description':clean(r['Content description']),'el':[],'ccp':[]}
        e=clean(r['Elaboration'])
        if e and e not in cds[code]['el'] and e not in ('Dance','Drama','Media Arts','Music','Visual Arts'):cds[code]['el'].append(e)
        p=clean(r['Cross-curriculum priority'])
        if p and p not in cds[code]['ccp']:cds[code]['ccp'].append(p)
    for r in X:
        if r['Learning area/Capability']!=area or (r['Discipline/Language']or'')!=disc:continue
        code=clean(r['Content description code']);ex=clean(r['Achievement standard extract']);slv=lvkey(r['Level/Band'],code)
        if not ex or not slv or code not in cds:continue
        std.setdefault((slv,clean(r['Mode']),ex),set()).add(code)
    standards=collections.defaultdict(list)
    for (lv,g,t),codes in std.items():
        t=t[0].upper()+t[1:] if t else t
        standards[lv].append({'g':g,'t':t,'cds':sorted(codes)})
    lst=sorted(cds.values(),key=lambda c:(ORDER.index(c['level']),c['code']))
    levels=[l for l in ORDER if any(c['level']==l for c in lst)]
    strands=[]
    for c in lst:
        if c['strand'] not in strands:strands.append(c['strand'])
    out.append({'key':key,'name':name,'area':area,'levels':levels,'strands':strands,'cds':lst,'standards':dict(standards)})
    print(key,len(lst),levels,sum(len(v) for v in standards.values()))
json.dump({'source':'VCAA Victorian Curriculum F–10 Version 2.0 CSV export, '+re.search(r'(\d\d-\d\d-\d{4})',SRC)[1],'subjects':out},open('data/curriculum.json','w'),ensure_ascii=False,separators=(',',':'))
