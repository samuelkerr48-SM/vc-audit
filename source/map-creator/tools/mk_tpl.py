# Builds a curriculum area map workbook for any Victorian Curriculum 2.0 learning area, in the layout and style of the
# school's Mathematics template: a tab per level (or band of levels), content descriptions across, grouped and coloured
# by strand; ten unit rows; then the achievement standard, sentence by sentence, numbered and labelled by strand
# (e.g. SU1, SU2, SI3 … for Science), with a drop-down of those labels in every unit cell.
# Usage: python3 mk_tpl.py <maths template.xlsx> <curriculum.json> <subject key> <out.xlsx>
import json, copy, math, re, sys, openpyxl
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as L
src, data, key, out = sys.argv[1:5]
d=json.load(open(data,encoding='utf8'))
sub=[x for x in d['subjects'] if x['key']==key][0]
mw=openpyxl.load_workbook(src); m=mw['Level 3']
def sty(c): return dict(font=copy.copy(c.font),fill=copy.copy(c.fill),border=copy.copy(c.border),alignment=copy.copy(c.alignment),number_format=c.number_format)
def put(ws,ref,val,st):
    c=ws[ref]; c.value=val
    for k,v in st.items(): setattr(c,k,v)
HC=['D','M','P','U','W','Z']; AR=[14,20,22,26,28,30]
H=[sty(m[c+'1']) for c in HC]; CD=[sty(m[c+'2']) for c in HC]
ASd=[sty(m['D%d'%r]) for r in AR]; ASn=[sty(m['E%d'%r]) for r in AR]; ASt=[sty(m['F%d'%r]) for r in AR]
S={k:sty(m[k]) for k in ['A1','B1','B2','B3','C3','A4','B4','C4','B5','C5','D4','B14']}
STRANDS=sub['strands']
SMALL={'and','of','the','as','a','in','for','to'}
def abbr(st):
    st=re.split(r'\s+[–-]\s+',st)[0]
    w=[x for x in re.findall(r"[A-Za-z]+",st) if x.lower() not in SMALL]
    return ''.join(x[0].upper() for x in w) or st[:2].upper()
AB={}
for st in STRANDS:
    a=abbr(st)
    while a in AB.values(): a=a+st[len(a)].lower() if len(st)>len(a) else a+'x'
    AB[st]=a
ABBR=re.compile(r'\b(e\.g|i\.e|etc|cf|vs)\.$',re.I)
def sentences(t):
    parts=re.split(r'(?<=[.!?])\s+(?=[A-Z])',t.strip());o=[]
    for p in parts:
        if o and ABBR.search(o[-1]):o[-1]+=' '+p
        else:o.append(p)
    return [x.strip() for x in o if x.strip()]
cdBy={c['code']:c for c in sub['cds']}
def tabname(lv):
    if lv=='F': return 'Foundation'
    mm=re.match(r'^(F|\d+)-(\d+)$',lv)
    if mm: return ('Foundation' if mm.group(1)=='F' else 'Level '+mm.group(1))+' to Level '+mm.group(2) if mm.group(1)=='F' else 'Levels '+mm.group(1)+' and '+mm.group(2)
    return 'Level '+lv
wb=openpyxl.Workbook(); wb.remove(wb.active)
for lv in sub['levels']:
    cds=sorted([c for c in sub['cds'] if c['level']==lv], key=lambda c:(STRANDS.index(c['strand']),c['code']))
    if not cds: continue
    ws=wb.create_sheet(tabname(lv)[:31])
    first=4; last=first+len(cds)-1
    ws.column_dimensions['A'].width=3.63; ws.column_dimensions['B'].width=21.63; ws.column_dimensions['C'].width=12.63
    for i in range(first,last+1): ws.column_dimensions[L(i)].width=13.13
    put(ws,'B1','Strand',S['B1']); ws.merge_cells('B1:C1')
    col=first
    for si,st in enumerate(STRANDS):
        n=sum(1 for c in cds if c['strand']==st)
        if not n: continue
        put(ws,L(col)+'1',st,H[si%6])
        for k in range(col+1,col+n): put(ws,L(k)+'1',None,H[si%6])
        if n>1: ws.merge_cells(f'{L(col)}1:{L(col+n-1)}1')
        col+=n
    put(ws,'B2','Content Description (CD)',S['B2']); ws.merge_cells('B2:C2')
    for i,c in enumerate(cds):
        put(ws,L(first+i)+'2',c['description']+'\n '+c['code'],CD[STRANDS.index(c['strand'])%6])
    ws.row_dimensions[2].height=max(261,13.5*math.ceil(max(len(c['description'])+12 for c in cds)/15))
    put(ws,'B3','Unit Title',S['B3']); put(ws,'C3','Semester',S['C3'])
    for r in range(4,14):
        put(ws,f'A{r}',float(r-3),S['A4'])
        put(ws,f'B{r}','SAMPLE' if r==4 else None,S['B4'] if r==4 else S['B5'])
        put(ws,f'C{r}',1.0 if r==4 else None,S['C4'] if r==4 else S['C5'])
        for k in range(first,last+1): put(ws,L(k)+str(r),None,S['D4'])
    # the achievement standard: each sentence under the strand of the content descriptions it builds on
    rows=[]
    for e in sub['standards'].get(lv,[]):
        cnt={}
        for c in e.get('cds',[]):
            if c in cdBy: cnt[cdBy[c]['strand']]=cnt.get(cdBy[c]['strand'],0)+1
        st=max(cnt,key=cnt.get) if cnt else STRANDS[0]
        for t in sentences(e['t']): rows.append((STRANDS.index(st),t))
    rows.sort(key=lambda x:x[0])
    r0=14; labels=[]
    per_line=max(40,int(sum(ws.column_dimensions[L(k)].width for k in range(6,max(last,8)+1))*1.15))
    lastc=max(last,8)
    for i,(si,t) in enumerate(rows):
        r=r0+i; labels.append(AB[STRANDS[si]]+str(i+1))
        put(ws,f'D{r}',STRANDS[si],ASd[si%6]); put(ws,f'E{r}',float(i+1),ASn[si%6]); put(ws,f'F{r}',t,ASt[si%6])
        ws[f'F{r}'].alignment=openpyxl.styles.Alignment(wrap_text=True,vertical='top')
        for k in range(7,lastc+1): put(ws,L(k)+str(r),None,ASt[si%6])
        ws.merge_cells(f'F{r}:{L(lastc)}{r}')
        ws.row_dimensions[r].height=max(16,15*math.ceil(len(t)/per_line))
    if rows:
        rl=r0+len(rows)-1
        put(ws,f'B{r0}','Achievement Standards (AS)',S['B14']); ws.merge_cells(f'B{r0}:C{rl}')
        i=0
        while i<len(rows):
            j=i
            while j+1<len(rows) and rows[j+1][0]==rows[i][0]: j+=1
            if j>i: ws.merge_cells(f'D{r0+i}:D{r0+j}')
            i=j+1
    dv=DataValidation(type='list',formula1='"'+','.join(labels+['Not covered'])+'"',allow_blank=True,showErrorMessage=True)
    dv.add(f'D4:{L(last)}13'); ws.add_data_validation(dv)
    ws.freeze_panes='D1'
wb.save(out); print(key,len(wb.worksheets),'tabs',{ws.title:ws.max_column for ws in wb.worksheets})
