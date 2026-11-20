/* Curriculum Area Map Creator: engine.
   Reads yearly overviews, scopes and sequences, curriculum area plans and unit plans; finds the teaching and
   learning units in them; works out which VC2 content descriptions each unit addresses; and fills the school's
   curriculum area map template (a tab per level, codes across, units down, an AS number in each cell). */

// ---------- subjects (Maths and English) ----------
const CM_SUBJECTS={};
(function(){
  const meta={
    maths:{name:'Mathematics',concepts:MA_CONCEPTS,fallback:MA_SUBSTRAND_FALLBACK},
    english:{name:'English',concepts:EN_CONCEPTS,fallback:EN_SUBSTRAND_FALLBACK}};
  // every other learning area is matched on VCAA's own wording and elaborations (key terms), as in the audit
  const PREFIX={english:'VC2E',maths:'VC2M',science:'VC2S',history:'VC2HH',geography:'VC2HG',civics:'VC2HC',economics:'VC2HE',hpe:'VC2HP',designtech:'VC2TDE',digitech:'VC2TDI',dance:'VC2ADA',drama:'VC2ADR',media:'VC2AMA',music:'VC2AMU',visualarts:'VC2AVA',viscomm:'VC2AVC'};
  (VC_DATA.subjects||[]).forEach(d=>{const m=meta[d.key]||{name:d.name,concepts:[],fallback:{}};if(!PREFIX[d.key])return;
    const s={key:d.key,name:m.name,area:d.area,concepts:m.concepts,fallback:m.fallback,kwOnly:!m.concepts.length,cds:d.cds,levels:d.levels,strands:d.strands,standards:d.standards||{},
      codeRe:new RegExp('\\b'+PREFIX[d.key]+'(?:F|10A|\\d{1,2})[A-Z]{1,3}\\d{2}\\b','g')};
    s.byId=Object.fromEntries(s.concepts.map(c=>[c.id,c]));
    s.cds.forEach(cd=>{if(cd.concepts)return;const ids=s.concepts.filter(c=>c.t.test(cd.description)).map(c=>c.id);
      if(!ids.length)(s.fallback[cd.substrand]||s.fallback[cd.strand]||[]).forEach(f=>ids.push(f));cd.concepts=ids;});
    s.cdBy=Object.fromEntries(s.cds.map(c=>[c.code,c]));
    CM_SUBJECTS[d.key]=s;});
})();
let SUBJ=null;           // the subject in use (the borrowed scoring code reads it)
const S={files:[]};      // the units being scored, as "files" (the borrowed scoring code reads S.files)
let R_N=0;
const CFG={full:2,half:1,fullRel:.05,halfRel:.016,covAt:.7,partAt:.3,wIntent:2,wVoc:.5,wMat:.25,kwShare:.4,kwBlend:.85};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function useSubject(k){SUBJ=CM_SUBJECTS[k];prepSubject(SUBJ);if(SUBJ.kwOnly)levelTerms(SUBJ);return SUBJ;}
// Learning areas without concept lists: add each content description's distinctive words within its own level.
// Across all levels a word like "heat" is common in Science, so it isn't a key term; within Levels 3 and 4 it
// points to two content descriptions, so a unit about heat should match them.
function levelTerms(s){if(s.cds.every(c=>c.kw&&c.kw._lv))return;
  s.levels.forEach(lv=>{const cds=s.cds.filter(c=>String(c.level)===lv);const n=cds.length;if(n<3)return;const df=new Map();
    const T=cds.map(cd=>{const t=new Set([...termsOf(cd.description)].filter(x=>!x.includes(' ')&&x.length>=4&&!STOP.has(x)));t.forEach(x=>df.set(x,(df.get(x)||0)+1));return t;});
    cds.forEach((cd,k)=>{const have=new Set((cd.kw||[]).map(x=>x.t));const add=[...T[k]].filter(t=>!have.has(t)&&df.get(t)<=Math.max(2,n/4))
      .map(t=>({t,w:Math.log((n+1)/(df.get(t)+.5)),bi:false})).sort((a,b)=>b.w-a.w).slice(0,Math.max(0,12-have.size));
      cd.kw=(cd.kw||[]).filter(x=>!x.lv).concat(add.map(x=>({...x,lv:1})));cd.kw._lv=1;});});
  s.cds.forEach(c=>{if(c.kw)c.kw._lv=1;});}

// ---------- levels ----------
const LV_ORDER=['F','1','2','3','4','5','6','7','8','9','10','10A'];
const LVNAME=l=>l==='F'?'Foundation':/^F-(\d+)$/.test(l)?'Foundation to Level '+l.slice(2):/^\d+-\d+$/.test(l)?'Levels '+l.replace('-',' and '):'Level '+l;
// A single level ("Year 3") to the subject's band ("3-4") where the curriculum is written in bands
const LV_NUM=l=>l==='F'?0:l==='10A'?10.5:+l;
function bandOf(l){if(!l||!SUBJ||SUBJ.levels.includes(l))return l;if(/-/.test(l))return l;const n=LV_NUM(l);
  const b=SUBJ.levels.find(x=>{const m=x.match(/^(F|\d+)-(\d+)$/);return m&&LV_NUM(m[1])<=n&&n<=+m[2];});return b||l;}
function lvKey(x){x=String(x).toUpperCase().replace(/^0+(?=\d)/,'');return x==='FOUNDATION'||x==='PREP'||x==='F'||x==='0'?'F':x;}
// "Year 3", "Level 10A", "Prep", "Foundation", "L4", "Yr 7", "Grade 2"
const LV_RE=/\b(?:Level|Lvl|Year|Yr|Grade|Gr|L|Y)\s?-?\s?(10A|10|0?[1-9])(?![\d])|\b(Foundation|Prep)\b/i;
function levelIn(t){const m=String(t||'').match(LV_RE);if(!m)return null;return lvKey(m[1]||m[2]);}
// several levels in one label ("Years 3 and 4", "Levels 5–6"): the first
const codeLevel=c=>{const cd=SUBJ.cdBy[c];return cd?String(cd.level):null;};
// A VC2 code typed without its 2 (VCM1ST01): read as VC2M1ST01. Old VC1 codes (VCMNA123) don't fit this pattern.
function fixCodes(text){return String(text).replace(/\bVC(?=[ME](?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}\b)/g,'VC2');}
function codesIn(text){text=fixCodes(text);const out=[];for(const m of String(text).matchAll(SUBJ.codeRe))if(SUBJ.cdBy[m[0]])out.push(m[0]);return out;}

// ---------- reading files into blocks ----------
// A block is a grid (a table or a worksheet: rows of {c, t}) or text (lines, some marked as headings).
const W_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const kids=(n,name)=>{const out=[];for(let c=n.firstChild;c;c=c.nextSibling)if(c.nodeType===1&&(!name||c.localName===name))out.push(c);return out;};
const desc=(n,name)=>[...n.getElementsByTagNameNS?n.getElementsByTagNameNS(W_NS,name):[]];
function wText(p){let t='';const walk=n=>{for(let c=n.firstChild;c;c=c.nextSibling){if(c.nodeType!==1)continue;
  if(c.localName==='t')t+=c.textContent;else if(c.localName==='tab')t+=' ';else if(c.localName==='br'||c.localName==='cr')t+='\n';
  else if(c.localName==='delText'||c.localName==='instrText')continue;else walk(c);}};walk(p);return t;}
function wStyle(p){const pr=kids(p,'pPr')[0];if(!pr)return '';const st=kids(pr,'pStyle')[0];return st?(st.getAttributeNS(W_NS,'val')||st.getAttribute('w:val')||''):'';}
async function readDocx(buf){
  const zip=await JSZip.loadAsync(buf);const f=zip.file('word/document.xml');if(!f)throw new Error('This Word file has no document body.');
  const xml=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  const body=xml.getElementsByTagNameNS(W_NS,'body')[0];const blocks=[];let lines=[];let tn=0;
  const flush=()=>{if(lines.length){blocks.push({type:'text',lines});lines=[];}};
  const cellText=tc=>desc(tc,'p').map(wText).map(s=>s.trim()).filter(Boolean).join('\n');
  const grid=tbl=>{const rows=[];let lastHead='';
    kids(tbl,'tr').forEach(tr=>{let g=0;const pr=kids(tr,'trPr')[0];if(pr){const gb=kids(pr,'gridBefore')[0];if(gb)g=+(gb.getAttributeNS(W_NS,'val')||0);}
      const tcs=[];const coll=n=>kids(n).forEach(c=>{if(c.localName==='tc')tcs.push(c);else if(c.localName==='sdt'||c.localName==='sdtContent'||c.localName==='customXml')coll(c);});coll(tr);
      const row=[];tcs.forEach(tc=>{const p=kids(tc,'tcPr')[0];let span=1,vm=null;
        if(p){const gs=kids(p,'gridSpan')[0];if(gs)span=+(gs.getAttributeNS(W_NS,'val')||1);const v=kids(p,'vMerge')[0];if(v)vm=v.getAttributeNS(W_NS,'val')||'continue';}
        // nested tables are read as text of the cell
        const t=vm==='continue'?'':cellText(tc);if(t)row.push({c:g,t,span});g+=span;});
      rows.push(row);});
    return rows;};
  const walk=node=>kids(node).forEach(ch=>{
    if(ch.localName==='p'){const t=wText(ch).replace(/\s+/g,' ').trim();if(!t)return;const st=wStyle(ch);
      const h=/^(Title)$/i.test(st)?1:(/^Heading\s?(\d)$/i.exec(st)||[])[1];lines.push({t,h:h?+h:0});}
    else if(ch.localName==='tbl'){flush();tn++;blocks.push({type:'grid',name:'Table '+tn,rows:grid(ch)});}
    else if(ch.localName==='sdt'||ch.localName==='sdtContent'||ch.localName==='customXml')walk(ch);});
  walk(body);flush();return blocks;
}
function colIdx(ref){const m=/^([A-Z]+)/.exec(ref||'');if(!m)return -1;let n=0;for(const ch of m[1])n=n*26+ch.charCodeAt(0)-64;return n-1;}
function colName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
async function readXlsx(buf){
  const zip=await JSZip.loadAsync(buf);
  const xml=async n=>{const f=zip.file(n);return f?new DOMParser().parseFromString(await f.async('string'),'application/xml'):null;};
  const tx=el=>[...el.getElementsByTagName('t')].map(t=>t.textContent).join('');
  const ss=await xml('xl/sharedStrings.xml');const strings=ss?[...ss.getElementsByTagName('si')].map(tx):[];
  const wb=await xml('xl/workbook.xml'),rels=await xml('xl/_rels/workbook.xml.rels');const target={};
  if(rels)[...rels.getElementsByTagName('Relationship')].forEach(r=>{target[r.getAttribute('Id')]=r.getAttribute('Target');});
  const sheets=wb?[...wb.getElementsByTagName('sheet')].map(sh=>{const id=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let t=target[id]||'';t=t.replace(/^\/?(xl\/)?/,'xl/');return {name:sh.getAttribute('name'),path:t,hidden:/hidden/.test(sh.getAttribute('state')||'')};}):[];
  const blocks=[];
  for(const sh of sheets){if(sh.hidden)continue;const doc=await xml(sh.path);if(!doc)continue;const rows=[];
    [...doc.getElementsByTagName('row')].forEach(r=>{const ri=(+r.getAttribute('r')||rows.length+1)-1;const row=[];
      [...r.getElementsByTagName('c')].forEach((c,k)=>{const t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0];let s='';
        if(t==='s')s=v?strings[+v.textContent]||'':'';else if(t==='inlineStr'){const is=c.getElementsByTagName('is')[0];s=is?tx(is):'';}else if(t==='b'||t==='e')s='';else s=v?v.textContent:'';
        s=String(s).replace(/\r/g,'').trim();if(/^\d+\.0+$/.test(s))s=s.replace(/\.0+$/,'');
        if(s)row.push({c:c.getAttribute('r')?colIdx(c.getAttribute('r')):k,t:s,span:1});});
      rows[ri]=row;});
    for(let i=0;i<rows.length;i++)if(!rows[i])rows[i]=[];
    // merged cells: note the span so a unit across weeks is one unit
    [...doc.getElementsByTagName('mergeCell')].forEach(m=>{const [a,b]=(m.getAttribute('ref')||'').split(':');if(!b)return;
      const r0=+a.replace(/[A-Z]+/,'')-1,c0=colIdx(a),c1=colIdx(b);const cell=(rows[r0]||[]).find(x=>x.c===c0);if(cell)cell.span=c1-c0+1;});
    if(rows.some(r=>r.length))blocks.push({type:'grid',name:sh.name,rows});}
  return blocks;
}
async function readPptx(buf){
  const zip=await JSZip.loadAsync(buf);
  const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0]);
  const lines=[];const dec=t=>t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
  for(const n of names){const x=await zip.file(n).async('string');
    const paras=x.split(/<\/a:p>/).map(p=>(p.match(/<a:t>([^<]*)<\/a:t>/g)||[]).map(t=>t.replace(/<\/?a:t>/g,'')).join('')).map(dec).filter(t=>t.trim());
    paras.forEach((t,i)=>lines.push({t:t.trim(),h:i===0?2:0}));}
  return [{type:'text',lines}];
}
let pdfReady=null;
function initPdf(){if(pdfReady)return pdfReady;
  pdfReady=new Promise(res=>{const lib=window.pdfjsLib;const b64=document.getElementById('pdfworker').textContent.trim();
    const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    lib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([u],{type:'text/javascript'}));res(lib);});
  return pdfReady;}
async function readPdf(buf){
  const lib=await initPdf();const doc=await lib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise;const lines=[];
  for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p);const tc=await page.getTextContent();let last=null,cur='',big=0;
    const push=()=>{const t=cur.replace(/\s+/g,' ').trim();if(t)lines.push({t,h:big>=14&&t.length<90?2:0});cur='';big=0;};
    tc.items.forEach(it=>{const y=Math.round(it.transform[5]);if(last!==null&&Math.abs(y-last)>3)push();
      cur+=(cur&&!/\s$/.test(cur)&&!/^\s/.test(it.str)?' ':'')+it.str;big=Math.max(big,Math.abs(it.transform[0]));last=y;if(it.hasEOL){push();last=null;}});push();}
  return [{type:'text',lines}];
}
function readText(str){return [{type:'text',lines:str.replace(/\r/g,'').split('\n').map(t=>t.trim()).filter(Boolean).map(t=>({t,h:0}))}];}
function readCsv(text){const rows=[];text.replace(/\r/g,'').split('\n').forEach(line=>{const cells=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;}else if(ch==='"')q=false;else cur+=ch;}else if(ch==='"')q=true;else if(ch===','){cells.push(cur);cur='';}else cur+=ch;}
  cells.push(cur);rows.push(cells.map((t,c)=>({c,t:t.trim(),span:1})).filter(x=>x.t));});return [{type:'grid',name:'CSV',rows}];}
async function readAny(name,buf){
  const ext=(name.split('.').pop()||'').toLowerCase();
  if(ext==='docx'||ext==='docm'||ext==='dotx')return {kind:'Word',blocks:await readDocx(buf)};
  if(ext==='xlsx'||ext==='xlsm')return {kind:'Excel',blocks:await readXlsx(buf)};
  if(ext==='pptx')return {kind:'PowerPoint',blocks:await readPptx(buf)};
  if(ext==='pdf')return {kind:'PDF',blocks:await readPdf(buf)};
  if(ext==='csv')return {kind:'CSV',blocks:readCsv(new TextDecoder().decode(buf))};
  if(ext==='txt'||ext==='md')return {kind:'Text',blocks:readText(new TextDecoder().decode(buf))};
  if(ext==='doc')throw new Error('Older .doc files can’t be read. Open it in Word and use File › Save As › Word Document (.docx).');
  if(ext==='xls')throw new Error('Older .xls files can’t be read. Open it in Excel and use File › Save As › Excel Workbook (.xlsx).');
  throw new Error('Unsupported file type (.'+ext+'). Use Word, Excel, PowerPoint, PDF or text.');
}

// ---------- finding the units ----------
const UNIT_HDR=/^(teaching and learning units?|unit(s)?( (title|name|of work|focus))?|topics?|titles?|focus|learning focus|(learning )?sequences?|themes?|big ideas?|inquir(y|ies)|text study|area of study|concepts?|content( focus)?|strand focus|sub-?strand)\b/i;
const TIME_CELL=/^(w(ee)?ks?\.?\s*\d{1,2}(\s*[-–]\s*\d{1,2})?|\d{1,2}|term\s*[1-4]|t[1-4]|semester\s*[12]|sem\s*[12])$/i;
const TIME_HDR=/^(term|semester|sem|weeks?|wk|when|timing|time|duration|length|date)s?\b/i;
const LEVEL_HDR=/^(year|level|grade|yr|class)( levels?)?\b/i;
const CODE_HDR=/(content descriptions?|codes?|vc2|curriculum( links?| focus)?|descriptors?|achievement standard)/i;
// Not units of work: calendar items, revision and consolidation, testing and data collection, fluency/games blocks, catch-up time
const EVENT=/\b(camp|naplan|excursion|incursion|holidays?|carnival|swimming|sports? day|athletics|pupil[- ]free|curriculum day|public holiday|reports?( due| writing)?|parent[- ]teacher|interviews|transition|graduation|book week|concert|school event|calendar|pyjama day|breakfast|revision|revise|consolidat\w*|catch[- ]?up|flex(ible)? (week|time|days?)|buffer( week)?|pat( maths| reading| adaptive| testing)?|essential assessment|on[- ]demand|pre[- ]?tests?|post[- ]?tests?|testing|running records|data (collection|week)|benchmark(ing)?|(maths?|mathematics) online interview|\bmoi\b|assessment (week|checks?|tasks?|period)|(number|maths?) games|fluency (tasks?|blocks?|games|practice)|warm[- ]?ups?|class(room)? (set[- ]?up|routines)|getting to know|start of year|end of year)\b|beginning[- ]of[- ]year assessment|^assessments?( week)?$/i;
// Row labels of a lesson planner (a DET sequence overview): parts of a lesson, not units
const PLANNER_LABEL=/^(lesson( \d+)?|learning intentions?|success criteria|vocabulary|key vocabulary|daily review|explicit teaching|worked examples?|hinge questions?|(independent|guided|supported) practice|enabl(e|ing) prompts?|extend(ing)? prompts?|materials|resources|inclusion|differentiation|assessment|exit tickets?|warm[- ]?ups?|reflection|teacher notes|some students|specific students|cfu|check(ing)? for understanding|i do|we do|you do|launch|summary|plenary|mini whiteboards|key questions|misconceptions|lesson focus|focus|notes)\b/i;
const LESSONS=/\(\s*\d+\s+lessons?\s*\)/i;
const NOT_UNIT=/^(n\/?a|tbc|tba|-+|–|—|\?|x|y|yes|no|nil|none|holidays?|break|revision|consolidation|review)$/i;
function rowText(r){return r.map(x=>x.t).join(' | ');}
function semOf(t){t=String(t||'');let m=t.match(/\bsem(?:ester)?\s*([12])\b/i);if(m)return {sem:+m[1]};
  m=t.match(/\b(?:term|t)\s*([1-4])\b/i);if(m)return {term:+m[1],sem:+m[1]<=2?1:2};return null;}
// first line of a cell, trimmed to a unit-name length
function unitName(t){let s=String(t).split('\n').map(x=>x.trim()).filter(Boolean)[0]||'';s=s.replace(/\s*\|\s*/g,' ').replace(/\s+/g,' ').replace(CAM_CODE,'').replace(/[\s,;:–-]+$/,'').trim();
  if(s.length>90){const cut=s.slice(0,90);s=cut.slice(0,Math.max(cut.lastIndexOf(' '),40))+'…';}return s;}
function isTimeLabel(t){return TIME_CELL.test(String(t).trim())||/^(term|semester)\s*[1-4]\b/i.test(String(t).trim());}

// Decide how a grid holds its units, and read them out.
// rows:  a header row names the columns, and each row below is a unit (or a unit continues over several rows)
// cells: the header row is a run of weeks or terms, and each filled cell below is a unit (a curriculum area plan)
function gridLayout(rows){
  const filled=rows.map((r,i)=>({i,r})).filter(x=>x.r.length);if(!filled.length)return null;
  let best=null;
  for(const {i,r} of filled.slice(0,8)){
    const time=r.filter(x=>isTimeLabel(x.t));
    if(time.length>=3)return {mode:'cells',head:i,firstTime:Math.min(...time.map(x=>x.c))};
    // levels across the top (Foundation | Year 1 | Year 2 …), terms or weeks down the side
    const lvs=r.filter(x=>x.t.length<30&&levelIn(x.t)&&!UNIT_HDR.test(x.t));
    if(lvs.length>=2&&new Set(lvs.map(x=>levelIn(x.t))).size>=2)return {mode:'cells',head:i,firstTime:Math.min(...lvs.map(x=>x.c))};
    const uc=r.find(x=>UNIT_HDR.test(x.t)&&x.t.length<40);
    if(uc&&r.length>=2&&!best)best={mode:'rows',head:i,unitCol:uc.c,cols:r};
  }
  if(best)return best;
  // no header to go by: the column with the most unit-like cells (short text, not codes, not numbers)
  const cnt={};filled.forEach(({r})=>r.forEach(x=>{const t=x.t.trim();if(t.length>=3&&t.length<=80&&!/^\d+([.,]\d+)?$/.test(t)&&!(t.match(CAM_CODE)||[]).length&&!isTimeLabel(t))cnt[x.c]=(cnt[x.c]||0)+1;}));
  const col=Object.entries(cnt).sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0];
  if(!col||col[1]<2)return null;
  return {mode:'rows',head:-1,unitCol:+col[0],cols:[]};
}
function unitsFromGrid(block,ctx){
  const rows=block.rows;const L=gridLayout(rows);if(!L)return [];
  const out=[];let level=levelIn(block.name)||ctx.level||null,when=semOf(block.name);
  const push=(name,text,lv,w,where)=>{name=unitName(name);if(!name||NOT_UNIT.test(name)||name.length<3)return null;
    const u={name,text:[text],level:lv,sem:w?w.sem:null,term:w?w.term:null,where,event:EVENT.test(name)};out.push(u);return u;};
  const labelOf=r=>r.filter(x=>x.c<L.firstTime).map(x=>x.t).join(' ');
  const bandRows=L.mode==='cells'?rows.map((r,i)=>i).filter(i=>i>L.head&&rows[i].some(x=>x.c<L.firstTime&&/^units?( titles?| names?)?$/i.test(x.t.trim()))):[];
  if(bandRows.length){
    // A plan in bands: a "Unit" row names the units across the weeks, and the rows under it (a level's lesson plans,
    // its content descriptors, assessment) fill in each unit, column by column, until the next "Unit" row or a gap.
    // A row's level comes from its label ("Year 1 Victorian Lesson Plans"); an unlabelled row keeps the one above.
    bandRows.forEach((ur,b)=>{
      const lab=labelOf(rows[ur]);const lv0=levelIn(lab);if(lv0)level=lv0;const w0=semOf(lab);if(w0)when=w0;
      // a composite class's structure (F/1, 3/4) in the label column, so its units read "F/1 · Unit"
      const sm=(rows[ur].concat(rows[ur-1]||[])).filter(x=>x.c<L.firstTime).map(x=>x.t.match(/\b(F|Foundation|Prep|\d{1,2})\s*[\/&–-]\s*(\d{1,2}|10A)\b/i)).find(Boolean);
      const struct=sm?(/^(f|foundation|prep)$/i.test(sm[1])?'F':sm[1])+'/'+sm[2]:'';
      const cells=rows[ur].filter(x=>x.c>=L.firstTime).sort((a,b)=>a.c-b.c);
      const units=cells.map((x,k)=>({x,from:x.c,to:Math.max(x.c+x.span-1,(cells[k+1]?cells[k+1].c:1e4)-1),by:{}}));
      let sub=null,gap=0;const end=b+1<bandRows.length?bandRows[b+1]:rows.length;
      for(let i=ur+1;i<end;i++){const r=rows[i];if(!r.length){if(++gap>=2)break;continue;}gap=0;
        const l=labelOf(r);if(l){const lv=levelIn(l);if(lv)sub=lv;const w=semOf(l);if(w)when=w;}
        r.filter(x=>x.c>=L.firstTime).forEach(x=>{const u=units.find(u=>x.c>=u.from&&x.c<=u.to);if(!u)return;
          const k=sub||level||'?';(u.by[k]=u.by[k]||[]).push((l?l.replace(/\s+/g,' ')+': ':'')+x.t);});}
      units.forEach(u=>{const name=unitName(u.x.t);if(!name||NOT_UNIT.test(name))return;
        const lvs=Object.keys(u.by);const codes=lvs.flatMap(k=>codesIn(u.by[k].join(' ')));
        const ev=EVENT.test(name)&&!codes.length;
        (lvs.length?lvs:[level||'?']).forEach(k=>{
          // codes for another level in this level's row are noted, not counted here
          const own=k==='?'?null:k;const txt=u.by[k]||[];const stray=codesIn(txt.join(' ')).filter(c=>own&&codeLevel(c)!==bandOf(own));
          out.push({name:struct?struct+' · '+name:name,text:['Unit: '+u.x.t,...txt],level:own,sem:when?when.sem:null,term:when?when.term:null,where:block.name+' › '+unitName(lab||'Unit'),event:ev,stray});});});
    });
    return out;
  }
  if(L.mode==='cells'){
    // columns before the first week/term column label the row: the level, the semester or term
    const header=rows[L.head];const colHead={};header.forEach(x=>{colHead[x.c]=x.t;});
    let cur=null;
    for(let i=L.head+1;i<rows.length;i++){const r=rows[i];if(!r.length)continue;
      const lab=r.filter(x=>x.c<L.firstTime).map(x=>x.t).join(' ');
      if(lab){const lv=levelIn(lab);if(lv)level=lv;const w=semOf(lab);if(w)when=w;}
      // a header row repeated below (Week | 1 | 2 …)
      if(r.filter(x=>x.c>=L.firstTime&&isTimeLabel(x.t)).length>=3)continue;
      cur=null;
      r.filter(x=>x.c>=L.firstTime).forEach(x=>{
        const ch=colHead[x.c]||'';const w=semOf(ch)||when;const lvc=ch.length<30?levelIn(ch):null;
        const prev=out[out.length-1];
        // the same text again in the next column (copied across, not merged): one unit
        if(prev&&prev._row===i&&prev._raw===x.t){prev._span+=x.span;return;}
        // the same unit carried on from the row above (weeks down the side): one unit
        const up=out.find(o=>o._col===x.c&&o._row===i-1&&o._raw===x.t);if(up){up._row=i;return;}
        const u=push(x.t,x.t,lvc||level,w,block.name+(lab?' › '+unitName(lab):''));if(u){u._row=i;u._raw=x.t;u._span=x.span;u._col=x.c;}});
    }
  }else{
    const H={};(L.cols||[]).forEach(x=>{H[x.c]=x.t;});
    const timeCol=(L.cols||[]).find(x=>TIME_HDR.test(x.t)&&x.c!==L.unitCol),lvCol=(L.cols||[]).find(x=>LEVEL_HDR.test(x.t)&&x.c!==L.unitCol);
    let cur=null;
    for(let i=L.head+1;i<rows.length;i++){const r=rows[i];if(!r.length)continue;
      const all=rowText(r);
      // a row that is only a label: "Term 2", "Level 4", "Semester 1"
      if(r.length===1&&r[0].t.length<50){const lv=levelIn(r[0].t),w=semOf(r[0].t);if(lv||w){if(lv)level=lv;if(w)when=w;cur=null;continue;}}
      // a header row repeated below
      if(r.some(x=>x.c===L.unitCol&&UNIT_HDR.test(x.t)&&x.t.length<40)){cur=null;continue;}
      const nameCell=r.find(x=>x.c===L.unitCol);
      const lv=lvCol?levelIn((r.find(x=>x.c===lvCol.c)||{}).t):null;const w=timeCol?semOf((r.find(x=>x.c===timeCol.c)||{}).t||''):null;
      // the evidence: each cell with its column heading, so "Content descriptions: VC2M3N01" keeps its meaning
      const text=r.map(x=>(H[x.c]&&x.c!==L.unitCol&&!TIME_HDR.test(H[x.c])?H[x.c]+': ':'')+x.t).join(' | ');
      if(!nameCell){if(cur)cur.text.push(text);continue;}
      const rl=levelIn(r.filter(x=>x.c<L.unitCol).map(x=>x.t).join(' '));
      const rw=semOf(r.filter(x=>x.c<L.unitCol).map(x=>x.t).join(' '));
      if(rl)level=rl;if(rw)when=rw;
      // the same unit over several rows (a row per week): one unit
      const prev=out[out.length-1];
      if(prev&&cur===prev&&unitName(nameCell.t)===prev.name&&(lv||level)===prev.level){prev.text.push(text);continue;}
      cur=push(nameCell.t,text,lv||level,w||when,block.name);if(!cur)continue;
    }
  }
  out.forEach(u=>{delete u._raw;});
  return out;
}
// Sections under headings in a text block: "Unit 3: Fractions", "Term 2 Weeks 1–4: …", or Word headings
const SECTION=/^(unit|topic|sequence|teaching and learning unit|module)\s*[\d.]+\b|^(term\s*[1-4]\s*[,:–-]?\s*)?w(ee)?ks?\s*\d{1,2}\s*[-–]\s*\d{1,2}\b|^term\s*[1-4]\s*[:–-]/i;
function unitsFromText(block,ctx){
  const lines=block.lines;const heads=lines.map((l,i)=>({i,l})).filter(({l})=>(l.h>=1&&l.h<=3&&l.t.length<100)||(SECTION.test(l.t)&&l.t.length<100));
  const out=[];let level=ctx.level||null,when=null;
  heads.forEach((h,k)=>{const end=k+1<heads.length?heads[k+1].i:lines.length;const body=lines.slice(h.i+1,end).map(l=>l.t);
    const lv=levelIn(h.l.t);if(lv)level=lv;const w=semOf(h.l.t);if(w)when=w;
    if(!body.length&&!SECTION.test(h.l.t))return;   // a heading with nothing under it is a label, not a unit
    out.push({name:unitName(h.l.t.replace(/^(unit|topic|sequence|module)\s*([\d.]+)\s*[:.–-]?\s*/i,(m,a,b)=>'Unit '+b+': ').replace(/:\s*$/,'')),text:[h.l.t,...body],level,sem:when?when.sem:null,term:when?when.term:null,where:'heading',event:false});});
  return out;
}
// What kind of document is this? An overview (many short units) or a unit plan (one unit, lots of detail)?
const OVERVIEW_NAME=/overview|scope( and|\s*&)?\s*sequence|\bs\s*&\s*s\b|curriculum area plan|\bCAP\b|year(ly)? plan|annual plan|term plan|whole[- ]school|program(me)?\b|planner/i;
const UNITPLAN_NAME=/unit plan|teaching and learning unit|\bTLU\b|lesson|sequence of lessons|work ?sample|assessment task/i;
function titleOf(blocks,file){const t=blocks.flatMap(b=>b.type==='text'?b.lines:[]).find(l=>l.h&&l.t.length>3&&l.t.length<100);
  return t?t.t:file.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').replace(/^\d+[-_ ]*[a-f0-9]{6,}[-_ ]*/i,'');}
function findUnits(doc){
  const lvFile=levelIn(doc.name.replace(/[_.]+/g,' '));
  const ctx={level:lvFile};
  let units=[];doc.blocks.forEach(b=>{const u=b.type==='grid'?unitsFromGrid(b,ctx):unitsFromText(b,ctx);units.push(...u);});
  const words=s=>s.join(' ').split(/\s+/).filter(Boolean).length;
  const allWords=doc.blocks.reduce((n,b)=>n+(b.type==='grid'?b.rows.reduce((k,r)=>k+words(r.map(x=>x.t)),0):words(b.lines.map(l=>l.t))),0);
  units.forEach(u=>{if(u.event&&codesIn(u.text.join(' ')).length)u.event=false;});
  // things worth telling the teacher: codes typed without the 2, codes in another level's row
  const notes=[];const all=units.flatMap(u=>u.text).join(' ');
  const typos=[...new Set((all.match(/\bVC[ME](?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}\b/g)||[]))];
  if(typos.length)notes.push(typos.join(', ')+(typos.length>1?' were':' was')+' read as '+typos.map(t=>t.replace(/^VC/,'VC2')).join(', ')+'.');
  const stray=units.filter(u=>u.stray&&u.stray.length);
  if(stray.length)notes.push(stray.map(u=>u.stray.join(', ')+' in '+LVNAME(u.level)+' “'+u.name+'”').join('; ')+': '+(stray.reduce((n,u)=>n+u.stray.length,0)>1?'these codes are':'this code is')+' for another level, so '+(stray.reduce((n,u)=>n+u.stray.length,0)>1?'they aren’t':'it isn’t')+' ticked there.');
  const real=units.filter(u=>!u.event);
  const avg=real.length?real.reduce((n,u)=>n+words(u.text),0)/real.length:0;
  let mode;
  const planner=real.length>=4&&real.filter(u=>PLANNER_LABEL.test(u.name)).length>=real.length*.4;
  if(planner){mode='whole';notes.push('Read as one unit: this looks like a lesson planner (its rows are parts of lessons, such as learning intentions and success criteria).');}
  else if(real.filter(u=>LESSONS.test(u.name)).length>=2)mode='split';
  else if(OVERVIEW_NAME.test(doc.name)&&real.length>=2)mode='split';
  else if(UNITPLAN_NAME.test(doc.name)&&!OVERVIEW_NAME.test(doc.name))mode='whole';
  else mode=real.length>=3&&avg<120?'split':real.length>=2&&avg<60?'split':'whole';
  const whole={name:unitName(titleOf(doc.blocks,doc.name)),text:doc.blocks.flatMap(b=>b.type==='grid'?b.rows.map(rowText):b.lines.map(l=>l.t)),level:lvFile,sem:null,term:null,where:'whole file',event:false};
  const w=semOf(doc.name);if(w){whole.sem=w.sem;whole.term=w.term;}
  return {mode,split:units,whole,words:allWords,notes};
}

// ---------- scoring the units ----------
function unitSegs(u){return u.text.flatMap(t=>chunk(fixCodes(t),420));}
// The level a unit counts for: what the plan said, else the codes in it, else the file's level
function unitLevel(u,fallback){if(u.level)return u.level;const n={};codesIn(u.text.join(' ')).forEach(c=>{const l=codeLevel(c);n[l]=(n[l]||0)+1;});
  const e=Object.entries(n).sort((a,b)=>b[1]-a[1]);return e.length?e[0][0]:fallback||null;}
// For each unit and each content description at its level: 'code' (written in the plan), 'cov' (clear evidence),
// 'part' (some evidence: offered as a possible tick), or nothing.
function scoreUnits(units){
  S.files=units.map(u=>({name:u.name,segs:u.segs}));R_N=S.files.reduce((n,f)=>n+f.segs.length,0);
  const H={};SUBJ.concepts.forEach(c=>{H[c.id]=hitsFor(c.e,S.files);});
  units.forEach((u,fi)=>{u.hits={};const lv=u.lv;if(!lv)return;
    // a row of an overview is a summary: one clear mention is the unit's focus, not a passing word
    const short=u.segs.length<=4;CFG.full=short?1:2;
    const listed=new Set(codesIn(u.segs.join(' ')));
    SUBJ.cds.filter(c=>String(c.level)===lv).forEach(cd=>{
      if(listed.has(cd.code)){u.hits[cd.code]={st:'code',score:1,why:'Code '+cd.code+' is written in the plan.'};return;}
      // a plan that lists codes is precise about its coverage: words alone don't add a tick, only suggest one
      const s1=scoreCd(cd,H,fi);const K=kwScore(cd,[fi]);const dK=K.hits.filter(h=>h.v>0).length;
      const s2=short?(dK>=3?CFG.covAt:dK>=2?CFG.partAt+.1:0):K.score*CFG.kwBlend;const score=Math.max(s1,s2);
      if(score<CFG.partAt)return;
      let st=score>=CFG.covAt?'cov':'part';if(listed.size&&st==='cov')st='part';
      const ev=[];cd.concepts.forEach(id=>{const c=SUBJ.byId[id];if(!c||c.opt)return;const h=H[id];if(h.perFile[fi])ev.push(c.label);});
      const kw=K.hits.filter(h=>h.v>0).map(h=>surf(h.t));
      u.hits[cd.code]={st,score,kw:kw.length,why:(ev.length?'Matches: '+ev.slice(0,3).join('; ')+'. ':'')+(kw.length?'Key terms: '+kw.slice(0,5).join(', ')+'.':'')};
    });});
  CFG.full=2;return units;
}

// ---------- the template ----------
// One tab per level: VC2 codes in the header row (alone, or at the end of the content description), a "Unit Title" |
// "Semester" header, unit rows numbered down column A, then the achievement standards key (strand, number, sentence).
const CAM_CODE=/\bVC2[A-Z]{1,4}(?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}\b/g;
function parseTemplate(sheets){
  // sheets: [{name, path, xml (string), doc (DOM), rows (from readXlsx-style parsing)}]
  const out=[];
  sheets.forEach(sh=>{
    const rows=sh.rows;const cr=rows.findIndex(r=>r&&r.filter(x=>(x.t.match(CAM_CODE)||[]).length===1).length>=3);if(cr<0)return;
    const cols=rows[cr].filter(x=>(x.t.match(CAM_CODE)||[]).length===1).map(x=>({c:x.c,code:x.t.match(CAM_CODE)[0]}));
    const first=Math.min(...cols.map(x=>x.c));
    let uCol=-1,sCol=-1,nCol=-1,headRow=-1;
    for(let i=0;i<Math.min(rows.length,cr+5);i++)(rows[i]||[]).forEach(x=>{if(x.c>=first)return;
      if(uCol<0&&/^(unit|teaching and learning unit)/i.test(x.t)){uCol=x.c;headRow=i;}if(sCol<0&&/^(semester|term)/i.test(x.t))sCol=x.c;});
    if(uCol<0){uCol=first>=2?first-2:0;sCol=first>=2?first-1:-1;headRow=cr;}
    // unit rows: from below the header to the achievement standards key
    let asRow=rows.length;for(let i=headRow+1;i<rows.length;i++){if((rows[i]||[]).some(x=>/^achievement (standard|strands)|^key\b/i.test(x.t))){asRow=i;break;}}
    const unitRows=[];for(let i=headRow+1;i<asRow;i++)unitRows.push(i);
    nCol=[0,1,2].find(c=>c<uCol&&unitRows.some(i=>(rows[i]||[]).some(x=>x.c===c&&/^\d+$/.test(x.t))));
    // the key: number and sentence, under a strand (or language mode) name that may be merged down
    const as=[];let strand='';
    for(let i=asRow;i<rows.length;i++){const r=rows[i]||[];if(!r.length)continue;const e=r.filter(x=>x.c>=first-1).sort((a,b)=>a.c-b.c);
      const k=e.findIndex(x=>/^\d{1,2}$/.test(x.t));const before=e.slice(0,k<0?e.length:k).filter(x=>x.c>=first&&!/^achievement/i.test(x.t));
      if(before.length)strand=before[before.length-1].t;if(k<0)continue;const t=e.slice(k+1).map(x=>x.t).sort((a,b)=>b.length-a.length)[0];
      if(t&&t.length>12)as.push({n:+e[k].t,t,strand,row:i});}
    // the drop-down list of AS labels (N1, A7, Sp13 … Not covered), if the template has one
    const dv=(sh.xml.match(/<dataValidation\b[^>]*sqref="([^"]+)"[^>]*>\s*<formula1>([^<]*)<\/formula1>/)||[]);
    const list=dv[2]?dv[2].replace(/&quot;/g,'"').replace(/^"|"$/g,'').split(',').map(s=>s.trim()).filter(Boolean):[];
    const labelOf={};list.forEach(l=>{const m=l.match(/^([A-Za-z]*)\s*(\d+)$/);if(m)labelOf[+m[2]]=l;});
    const yesOnly=list.length&&!Object.keys(labelOf).length?list.find(l=>/^(yes|y|✓|tick)$/i.test(l)):null;
    const notCovered=list.find(l=>/not covered/i.test(l))||null;
    as.forEach(a=>{a.label=labelOf[a.n]||String(a.n);});
    const level=(cols.length?codeLevel(cols[0].code):null)||bandOf(levelIn(sh.name));
    out.push({name:sh.name,path:sh.path,level,codes:cols,first,uCol,sCol,nCol,headRow,unitRows,asRow,as,list,yesOnly,notCovered,dvRef:dv[1]||null});
  });
  return out;
}
// Link the template's achievement standard sentences to content descriptions, through VCAA's achievement standard
// extracts (which list the content descriptions each part builds on). A template may split an extract into sentences:
// each sentence then keeps the content descriptions whose wording it shares.
function linkTemplate(T){
  T.forEach(sh=>{const lv=sh.level;const st=(SUBJ.standards[lv]||[]);const cds=SUBJ.cds.filter(c=>String(c.level)===lv);
    const atLv=c=>SUBJ.cdBy[c]&&String(SUBJ.cdBy[c].level)===lv;
    const share=(a,cd)=>{const T2=termsOf(cd.description+' '+(cd.el||[]).join(' '));let v=0;termsOf(a.t).forEach(t=>{if(T2.has(t)){const f=(SUBJ._df.get(t)||0)/SUBJ._N;if(f<.25)v+=SUBJ._idf(t);}});return v;};
    // which VCAA extract each sentence comes from
    sh.as.forEach(a=>{const ta=new Set(toks(a.t).filter(w=>!STOP.has(w)&&w.length>2).map(stem));let best=null,bv=0;
      st.forEach(s=>{const ts=new Set(toks(s.t).map(stem));let n=0;ta.forEach(w=>{if(ts.has(w))n++;});const v=ta.size?n/ta.size:0;if(v>bv){bv=v;best=s;}});
      a._best=best&&bv>=.6?best:null;});
    sh.as.forEach(a=>{const b=a._best;let links=b?(b.cds||[]).filter(atLv):[];
      // the extract is split over several sentences: each keeps the content descriptions it speaks to
      const split=b&&sh.as.filter(o=>o._best===b).length>1;
      if(split&&links.length>1){const sc=links.map(c=>({c,v:share(a,SUBJ.cdBy[c])})).filter(x=>x.v>=2);if(sc.length)links=sc.map(x=>x.c);}
      if(!links.length)links=cds.map(cd=>({c:cd.code,v:share(a,cd)})).filter(x=>x.v>=3).sort((x,y)=>y.v-x.v).slice(0,4).map(x=>x.c);
      a.links=links;});
    // a content description that a split extract left out goes back to every sentence of that extract
    const seen=new Set(sh.as.flatMap(a=>a.links));
    sh.as.forEach(a=>{if(a._best)(a._best.cds||[]).forEach(c=>{if(!seen.has(c)&&atLv(c))a.links.push(c);});});});
  return T;
}
// The achievement standard label for a unit's tick on a content description: one whose extract builds on it,
// choosing the one whose words the unit shares most.
function asFor(sh,code,unitText){
  if(sh.yesOnly)return sh.yesOnly;
  const cand=sh.as.filter(a=>a.links&&a.links.includes(code));
  let pool=cand.length?cand:sh.as.filter(a=>SUBJ.cdBy[code]&&a.strand&&a.strand.toLowerCase().startsWith(SUBJ.cdBy[code].strand.toLowerCase().slice(0,4)));
  if(!pool.length)pool=sh.as;if(!pool.length)return '✓';
  if(pool.length===1)return pool[0].label;
  const ut=termsOf(unitText);const cdT=termsOf(SUBJ.cdBy[code].description);
  let best=pool[0],bv=-1;pool.forEach(a=>{let v=0;termsOf(a.t).forEach(t=>{if(ut.has(t))v+=1;if(cdT.has(t))v+=.5;});if(v>bv){bv=v;best=a;}});
  return best.label;
}

// ---------- writing the filled map ----------
function xmlEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cellRe(ref){return new RegExp('<c r="'+ref+'"(?=[\\s/>])([^>]*?)(?:/>|>([\\s\\S]*?)</c>)');}
function setCell(xml,ref,val,opts={}){
  const re=cellRe(ref);const m=xml.match(re);const row=+ref.replace(/[A-Z]+/,'');
  let attrs=m?m[1].replace(/\s+t="[^"]*"/,''):'';if(opts.style!=null)attrs=attrs.replace(/\s+s="\d+"/,'')+' s="'+opts.style+'"';
  const body=val==null||val===''?'<c r="'+ref+'"'+attrs+'/>':typeof val==='number'?'<c r="'+ref+'"'+attrs+'><v>'+val+'</v></c>':'<c r="'+ref+'"'+attrs+' t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(val)+'</t></is></c>';
  if(m)return xml.replace(re,body);
  // the cell isn't there: add it to its row, in column order
  const rre=new RegExp('<row r="'+row+'"([^>]*)>([\\s\\S]*?)</row>');const rm=xml.match(rre);
  if(!rm){const rs=new RegExp('<row r="'+row+'"([^>]*)/>');if(rs.test(xml))return xml.replace(rs,'<row r="'+row+'"$1>'+body+'</row>');return xml;}
  const ci=colIdx(ref);const cells=rm[2].match(/<c r="[A-Z]+\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)||[];
  let at=cells.findIndex(c=>colIdx(c.match(/r="([A-Z]+)/)[1])>ci);const nc=at<0?[...cells,body]:[...cells.slice(0,at),body,...cells.slice(at)];
  return xml.replace(rre,'<row r="'+row+'"'+rm[1]+'>'+nc.join('')+'</row>');
}
function styleOf(xml,ref){const m=xml.match(cellRe(ref));if(!m)return null;const s=m[1].match(/\ss="(\d+)"/);return s?+s[1]:null;}
// Make room for more units than the template has rows: copy the last unit row and push everything below it down
function insertRows(xml,afterRow,n){
  if(n<=0)return xml;
  const shift=ref=>ref.replace(/([A-Z]+)(\d+)/g,(m,c,r)=>+r>afterRow?c+(+r+n):m);
  // rows below: renumber, last first
  xml=xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>|<row r="(\d+)"([^>]*)\/>/g,(m,r,a,body,r2,a2)=>{
    if(r2){return +r2>afterRow?'<row r="'+(+r2+n)+'"'+a2+'/>':m;}
    if(+r<=afterRow)return m;return '<row r="'+(+r+n)+'"'+a+'>'+body.replace(/<c r="([A-Z]+)(\d+)"/g,(x,c,k)=>'<c r="'+c+(+k+n)+'"')+'</row>';});
  const tpl=xml.match(new RegExp('<row r="'+afterRow+'"([^>]*)>([\\s\\S]*?)</row>'));
  if(tpl){let add='';for(let k=1;k<=n;k++){const rr=afterRow+k;add+='<row r="'+rr+'"'+tpl[1]+'>'+tpl[2].replace(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g,'<c r="$1'+rr+'"$2/>')+'</row>';}
    xml=xml.replace(tpl[0],tpl[0]+add);}
  xml=xml.replace(/<mergeCell ref="([^"]+)"/g,(m,ref)=>'<mergeCell ref="'+shift(ref)+'"');
  xml=xml.replace(/(<dataValidation\b[^>]*sqref=")([^"]+)"/g,(m,a,ref)=>a+ref.split(' ').map(rg=>{const [p,q]=rg.split(':');if(!q)return shift(p);
    const r1=+p.replace(/[A-Z]+/,''),r2=+q.replace(/[A-Z]+/,'');return r1<=afterRow&&r2>=afterRow?p+':'+q.replace(/\d+/,r2+n):shift(p)+':'+shift(q);}).join(' ')+'"');
  xml=xml.replace(/(<conditionalFormatting\b[^>]*sqref=")([^"]+)"/g,(m,a,ref)=>a+ref.split(' ').map(rg=>rg.split(':').map(shift).join(':')).join(' ')+'"');
  xml=xml.replace(/<dimension ref="([^"]+)"/,(m,ref)=>'<dimension ref="'+ref.split(':').map((p,i)=>i?shift(p):p).join(':')+'"');
  return xml;
}
// plan: {sheetName: [{name, sem, ticks:{code:label}}]}
async function fillTemplate(buf,T,plan,opts={}){
  const zip=await JSZip.loadAsync(buf);
  for(const sh of T){const units=plan[sh.name];if(!units||!units.length)continue;
    let xml=await zip.file(sh.path).async('string');
    const rows0=sh.unitRows.slice();const extra=Math.max(0,units.length-rows0.length);
    if(extra){xml=insertRows(xml,rows0[rows0.length-1]+1,extra);for(let k=1;k<=extra;k++)rows0.push(rows0[rows0.length-1]+1);}
    // a plain (not italic "SAMPLE") style for unit names
    const r1=rows0[1]!=null?rows0[1]+1:rows0[0]+1;const nameStyle=styleOf(xml,colName(sh.uCol)+r1);const semStyle=sh.sCol>=0?styleOf(xml,colName(sh.sCol)+r1):null;
    const lastRow=rows0[rows0.length-1]+1;
    rows0.forEach((ri,k)=>{const R=ri+1;const u=units[k];
      if(sh.nCol!=null&&sh.nCol>=0&&k>=sh.unitRows.length)xml=setCell(xml,colName(sh.nCol)+R,k+1);
      if(!u){ // an unused row: clear the template's sample
        if(k===0){xml=setCell(xml,colName(sh.uCol)+R,'',{style:nameStyle});if(sh.sCol>=0)xml=setCell(xml,colName(sh.sCol)+R,'',{style:semStyle});}
        return;}
      xml=setCell(xml,colName(sh.uCol)+R,u.name,{style:nameStyle});
      if(sh.sCol>=0)xml=setCell(xml,colName(sh.sCol)+R,u.sem?(/^\d+$/.test(String(u.sem))?+u.sem:String(u.sem)):'',{style:semStyle});
      sh.codes.forEach(col=>{const v=u.ticks[col.code];const ref=colName(col.c)+R;
        if(v)xml=setCell(xml,ref,v);else if(opts.notCovered&&sh.notCovered)xml=setCell(xml,ref,sh.notCovered);else xml=setCell(xml,ref,'');});});
    zip.file(sh.path,xml);}
  // ask Excel to recalculate nothing, but drop any cached calc chain that could point at moved cells
  if(zip.file('xl/calcChain.xml')){zip.remove('xl/calcChain.xml');const ct=await zip.file('[Content_Types].xml').async('string');zip.file('[Content_Types].xml',ct.replace(/<Override[^>]*calcChain[^>]*\/>/,''));
    const wr=zip.file('xl/_rels/workbook.xml.rels');if(wr){const t=await wr.async('string');zip.file('xl/_rels/workbook.xml.rels',t.replace(/<Relationship[^>]*calcChain[^>]*\/>/,''));}}
  return zip.generateAsync({type:opts.type||'blob',compression:'DEFLATE',compressionOptions:{level:6},mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
// Read a template workbook: sheet paths, raw XML and parsed rows
async function loadTemplate(buf){
  const zip=await JSZip.loadAsync(buf);
  const xml=async n=>{const f=zip.file(n);return f?await f.async('string'):null;};
  const blocks=await readXlsx(buf);
  const wb=new DOMParser().parseFromString(await xml('xl/workbook.xml'),'application/xml');
  const rels=new DOMParser().parseFromString(await xml('xl/_rels/workbook.xml.rels'),'application/xml');const target={};
  [...rels.getElementsByTagName('Relationship')].forEach(r=>{target[r.getAttribute('Id')]=r.getAttribute('Target');});
  const sheets=[];for(const sh of [...wb.getElementsByTagName('sheet')]){const id=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const path=(target[id]||'').replace(/^\/?(xl\/)?/,'xl/');const b=blocks.find(x=>x.name===sh.getAttribute('name'));if(!b)continue;
    sheets.push({name:b.name,path,xml:await xml(path),rows:b.rows});}
  const T=linkTemplate(parseTemplate(sheets));
  if(!T.length)throw new Error('No curriculum area map tabs found: each tab needs a row of VC2 codes across the top.');
  return T;
}

// ---------- putting it together ----------
// docs: [{name, kind, blocks, U (findUnits), mode ('split'|'whole'), attach (unit key or null)}]
const CONTENT=t=>new Set(toks(t).filter(w=>w.length>2&&!/^(unit|plan|level|year|term|week|weeks|lesson|lessons|sequence|maths|mathematics|english|overview|the|and|for|docx|pdf|xlsx|semester|planner|tlu)$/.test(w)&&!/^\d+$/.test(w)).map(stem));
function nameMatch(a,b){const A=CONTENT(a),B=CONTENT(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(w=>{if(B.has(w))n++;});return n/Math.min(A.size,B.size);}
function unitNo(t){const m=String(t).match(/(?:^|\s)(\d{1,2}\.\d{1,2})(?=\s|$|:)/);return m?m[1]:null;}
function buildUnits(docs,defaultLevel){
  const units=[];let k=0;
  docs.forEach(d=>{if(d.mode==='split'){d.U.split.forEach((u,i)=>{units.push({...u,key:d.name+'#'+i,src:[d.name],id:k++});});}});
  // whole files: their own unit, or more evidence for an overview's unit of the same name
  docs.forEach(d=>{if(d.mode!=='whole')return;const w=d.U.whole;
    let target=null;
    if(d.attach==null||d.attach==='auto'){const no=unitNo(w.name)||unitNo(d.name);
      const cands=units.filter(u=>!u.event&&(!w.level||!u.level||u.level===w.level));
      target=no?cands.find(u=>unitNo(u.name)===no):null;
      if(!target){let best=0;cands.forEach(u=>{const v=nameMatch(u.name,w.name);if(v>best&&v>=.6){best=v;target=u;}});}}
    else if(d.attach!=='own')target=units.find(u=>u.key===d.attach)||null;
    if(target){target.text=target.text.concat(w.text);target.src.push(d.name);d.attachedTo=target.key;}
    else{d.attachedTo=null;units.push({...w,key:d.name+'#whole',src:[d.name],id:k++});}});
  units.forEach(u=>{u.segs=unitSegs(u);u.lv=bandOf(unitLevel(u,defaultLevel));});
  return units;
}
const semRank=u=>(u.sem||9)*10+(u.term||0);
// The ticks for one unit: codes and clear evidence, plus possible matches if asked; then the teacher's changes
function unitTicks(u,sh,over,opts){const t={};if(!sh)return t;const o=over||{};
  const txt=u.segs.join(' ');
  sh.codes.forEach(col=>{const h=u.hits[col.code];const ov=o[col.code];
    if(ov!==undefined){if(ov)t[col.code]=ov===true?asFor(sh,col.code,txt):ov;return;}
    if(h&&(h.st==='code'||h.st==='cov'||(h.st==='part'&&opts.possible)))t[col.code]=asFor(sh,col.code,txt);});
  return t;}
function planFor(units,T,state,opts){
  const plan={};
  T.forEach(sh=>{const us=units.filter(u=>u.lv===sh.level&&!u.event&&!(state.removed||{})[u.key]).map((u,i)=>({u,i})).sort((a,b)=>semRank(a.u)-semRank(b.u)||a.i-b.i).map(x=>x.u);
    const order=(state.order||{})[sh.name];if(order)us.sort((a,b)=>{const x=order.indexOf(a.key),y=order.indexOf(b.key);return (x<0?1e4:x)-(y<0?1e4:y);});
    plan[sh.name]=us.map(u=>({key:u.key,name:(state.names||{})[u.key]||u.name,sem:(state.sems||{})[u.key]!==undefined?(state.sems||{})[u.key]:u.sem,ticks:unitTicks(u,sh,(state.over||{})[u.key],opts)}));});
  return plan;
}
