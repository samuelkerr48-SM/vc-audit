# Builds an English F–10 curriculum area map workbook in the same layout and style as the school's Mathematics template.
# Achievement standards are numbered sentence by sentence, as in the Maths template, labelled by mode: SL (Speaking and
# Listening), RV (Reading and Viewing), W (Writing), e.g. SL1, SL2, RV3 … W9.
import json, copy, math, re, sys, openpyxl
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as L
src, data, out = sys.argv[1], sys.argv[2], sys.argv[3]
d=json.loads(open(data,encoding='utf8').read()[len('window.VC_DATA='):].rstrip().rstrip(';'))
en=[x for x in d['subjects'] if x['key']=='english'][0]
mw=openpyxl.load_workbook(src); m=mw['Level 3']
def sty(c): return dict(font=copy.copy(c.font),fill=copy.copy(c.fill),border=copy.copy(c.border),alignment=copy.copy(c.alignment),number_format=c.number_format)
def put(ws,ref,val,st):
    c=ws[ref]; c.value=val
    for k,v in st.items(): setattr(c,k,v)
# strand colours: the first three strand colours of the maths template (yellow, blue, pink); AS rows coloured by mode the same way
H=[sty(m['D1']),sty(m['M1']),sty(m['P1'])]; CD=[sty(m['D2']),sty(m['M2']),sty(m['P2'])]
ASd=[sty(m['D14']),sty(m['D20']),sty(m['D22'])]; ASn=[sty(m['E14']),sty(m['E20']),sty(m['E22'])]; ASt=[sty(m['F14']),sty(m['F20']),sty(m['F22'])]
S={k:sty(m[k]) for k in ['A1','B1','B2','B3','C3','A4','B4','C4','B5','C5','D4','B14']}
STRANDS=['Language','Literature','Literacy']; MODES=[('Speaking and Listening','SL'),('Reading and Viewing','RV'),('Writing','W')]
ABBR=re.compile(r'\b(e\.g|i\.e|etc|cf|vs)\.$',re.I)
def sentences(t):
    # split an extract into sentences; keep "e.g." and the like inside the sentence
    parts=re.split(r'(?<=[.!?])\s+(?=[A-Z])',t.strip());out=[]
    for p in parts:
        if out and ABBR.search(out[-1]):out[-1]+=' '+p
        else:out.append(p)
    return [x.strip() for x in out if x.strip()]
wb=openpyxl.Workbook(); wb.remove(wb.active)
for lv in en['levels']:
    ws=wb.create_sheet('Foundation' if lv=='F' else 'Level '+lv)
    cds=sorted([c for c in en['cds'] if c['level']==lv], key=lambda c:(STRANDS.index(c['strand']),c['code']))
    first=4; last=first+len(cds)-1
    ws.column_dimensions['A'].width=3.63; ws.column_dimensions['B'].width=21.63; ws.column_dimensions['C'].width=12.63
    for i in range(first,last+1): ws.column_dimensions[L(i)].width=13.13
    ws.sheet_format.defaultColWidth=12.63
    put(ws,'B1','Strand',S['B1']); ws.merge_cells('B1:C1')
    col=first
    for si,st in enumerate(STRANDS):
        n=sum(1 for c in cds if c['strand']==st)
        if not n: continue
        put(ws,L(col)+'1',st,H[si])
        for k in range(col+1,col+n): put(ws,L(k)+'1',None,H[si])
        if n>1: ws.merge_cells(f'{L(col)}1:{L(col+n-1)}1')
        col+=n
    put(ws,'B2','Content Description (CD)',S['B2']); ws.merge_cells('B2:C2')
    for i,c in enumerate(cds):
        put(ws,L(first+i)+'2',c['description']+'\n '+c['code'],CD[STRANDS.index(c['strand'])])
    ws.row_dimensions[2].height=max(261,13.5*math.ceil(max(len(c['description'])+12 for c in cds)/15))
    put(ws,'B3','Unit Title',S['B3']); put(ws,'C3','Semester',S['C3'])
    for r in range(4,14):
        put(ws,f'A{r}',float(r-3),S['A4'])
        put(ws,f'B{r}','SAMPLE' if r==4 else None,S['B4'] if r==4 else S['B5'])
        put(ws,f'C{r}',1.0 if r==4 else None,S['C4'] if r==4 else S['C5'])
        for k in range(first,last+1): put(ws,L(k)+str(r),None,S['D4'])
    # achievement standard: every sentence numbered, under its language mode
    rows=[]
    for e in en['standards'][lv]:
        mi=[x[0] for x in MODES].index(e['g'])
        for t in sentences(e['t']): rows.append((mi,t))
    r0=14; labels=[]
    per_line=max(40,int(sum(ws.column_dimensions[L(k)].width for k in range(6,last+1))*1.15))
    for i,(mi,t) in enumerate(rows):
        r=r0+i; labels.append(MODES[mi][1]+str(i+1))
        put(ws,f'D{r}',MODES[mi][0],ASd[mi]); put(ws,f'E{r}',float(i+1),ASn[mi]); put(ws,f'F{r}',t,ASt[mi])
        ws[f'F{r}'].alignment=openpyxl.styles.Alignment(wrap_text=True,vertical='top')
        for k in range(7,last+1): put(ws,L(k)+str(r),None,ASt[mi])
        ws.merge_cells(f'F{r}:{L(last)}{r}')
        ws.row_dimensions[r].height=max(16,15*math.ceil(len(t)/per_line))
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
wb.save(out); print('saved',out,[(ws.title) for ws in wb.worksheets])
