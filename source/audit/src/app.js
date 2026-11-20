/* VC Curriculum Audit — reads a sequence (Word, PDF, PowerPoint or text) and maps it against Victorian Curriculum 2.0.
   Everything runs in the browser: no file leaves the computer. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let LEVELS=['F','1','2','3','4','5','6','7','8','9','10'];
// Levels are single ('F', '5', '10A') or VCAA bands ('F-2', '3-4')
const LVNAME=l=>l==='F'?'Foundation':l==='F-2'?'Foundation–Level 2':/^\d+-\d+$/.test(l)?'Levels '+l.replace('-',' and '):'Level '+l;
const LVSHORT=l=>l==='F'?'Foundation':l.replace('-','–');
const lvLo=l=>{const a=String(l).split('-')[0];return a==='F'?0:parseFloat(a);},lvHi=l=>{const p=String(l).split('-'),b=p[p.length-1];return b==='F'?0:b==='10A'?10.5:parseFloat(b);};
// A single level ('F', '4') as the subject's own level: itself, or the band that contains it
function subjLevel(k){if(LEVELS.includes(k))return k;const n=k==='F'?0:k==='10A'?10.5:parseFloat(k);if(isNaN(n))return null;return LEVELS.find(l=>lvLo(l)<=n&&n<=lvHi(l))||null;}
const STATUS={cov:'Covered',part:'Partly covered',none:'Not evident',na:'Not planned for this sequence'};
const STORE='vlp.audit.v1';

// ---------- subjects ----------
const SUBJECTS={
  english:{key:'english',name:'English',full:'English Version 2.0',concepts:EN_CONCEPTS,fallback:EN_SUBSTRAND_FALLBACK,taxa:EN_TAXA,core:EN_CORE_TYPES,
    strands:['Language','Literature','Literacy'],
    oldRe:/\bVCE(LA|LT|LY)\d{3}\b/g,
    curricUrl:'https://f10.vcaa.vic.edu.au/learning-areas/english/english/curriculum',
    levelUrl:l=>'https://victoriancurriculum.vcaa.vic.edu.au/vc-english-v2/layout1.html?level='+l,
    scopeUrl:'https://f10.vcaa.vic.edu.au/learning-areas/english/english/scope-and-sequence',
    levels:['F','1','2','3','4','5','6','7','8','9','10'], taxTab:'Texts, themes & skills',
    taxOrder:['textTypes','priorities','genres','themes','skills'],
    glance:{title:'Texts at a glance',key:'textTypes',found:'Text types found',miss:'Core text types not seen',allOk:'All core types present',
      coreNote:b=>'Core types for '+(b==='early'?'Foundation–Level 2':b==='primary'?'Levels 3–6':'Levels 7–10')+': a guide to a balanced year, not a VCAA list.',
      special:{key:'priorities',idx:0,title:'Aboriginal and Torres Strait Islander texts and perspectives',miss:'VC2 Literature and contexts asks for texts by Aboriginal and Torres Strait Islander authors.'}},
    taxNote:'These checks look for words that name text types, genres, themes and skills. A tick means the word or phrase appears in the sequence, not that it was taught in depth. Open an item to check.'},
  maths:{key:'maths',name:'Mathematics',full:'Mathematics Version 2.0',concepts:MA_CONCEPTS,fallback:MA_SUBSTRAND_FALLBACK,taxa:MA_TAXA,core:MA_CORE,
    strands:['Number','Algebra','Measurement','Space','Statistics','Probability'],
    oldRe:/\bVCM(NA|MG|SP)\d{3}\b/g,
    curricUrl:'https://f10.vcaa.vic.edu.au/learning-areas/mathematics/curriculum',
    levelUrl:l=>'https://victoriancurriculum.vcaa.vic.edu.au/mathematics/mathematics-version-2-0/curriculum/f-10',
    scopeUrl:'https://f10.vcaa.vic.edu.au/learning-areas/mathematics/scope-and-sequence',
    levels:['F','1','2','3','4','5','6','7','8','9','10','10A'], taxTab:'Practices & routines',
    taxOrder:['practices','pedagogy','representations','contexts'],
    glance:{title:'Ways of working at a glance',key:'practices',found:'Mathematical practices found',miss:'Practices not seen',allOk:'All key practices present',
      coreNote:b=>'Key practices for '+(b==='early'?'Foundation–Level 2':b==='primary'?'Levels 3–6':'Levels 7–10A')+': a guide drawn from the curriculum’s emphasis on modelling, reasoning and algorithms, not a VCAA list.',
      special:null},
    taxNote:'These checks look for words that name mathematical practices, teaching and assessment routines, representations and contexts. A tick means the word or phrase appears in the sequence, not that it was taught in depth. Open an item to check.'}
};
// Every other learning area: evidence from VCAA wording and elaborations, with general teaching-routine and priority checks
const GEN_TAXA={pedagogy:MA_TAXA.pedagogy,priorities:{title:'Cross-curriculum priorities and capabilities',note:'Priorities and capabilities the sequence names.',groups:[
  ['Cross-curriculum priorities',[['Aboriginal and Torres Strait Islander histories and cultures',/aboriginal|torres strait|first nations|indigenous|\bcountry\b|traditional owners?|elders?/i],['Asia and Australia’s engagement with Asia',/\basia(n)?\b|china|chinese|japan|india|indonesia|vietnam|korea/i],['Sustainability',/sustainab|environment(al)?\b|recycl|climate|conservation|renewable/i]]],
  ['Capabilities',[['Critical and creative thinking',/critical thinking|creative thinking|reasoning|problem[- ]solving|inquiry|questioning/i],['Ethical capability',/ethic(s|al)|fairness|values|moral/i],['Intercultural capability',/intercultural|cultural (diversity|perspectives?)|cultures?/i],['Personal and social capability',/wellbeing|resilience|relationships|teamwork|collaborat|self[- ]awareness|social skills/i]]]]}};
const GEN_CORE={early:['Learning intentions and success criteria','Worked examples / I do, we do, you do','Mini whiteboards / all-student response'],primary:['Learning intentions and success criteria','Worked examples / I do, we do, you do','Mini whiteboards / all-student response','Summative assessment'],secondary:['Learning intentions and success criteria','Worked examples / I do, we do, you do','Hinge questions and CFU','Summative assessment']};
const PREFIX={english:'VC2E',maths:'VC2M',science:'VC2S',history:'VC2HH',geography:'VC2HG',civics:'VC2HC',economics:'VC2HE',hpe:'VC2HP',designtech:'VC2TDE',digitech:'VC2TDI',dance:'VC2ADA',drama:'VC2ADR',media:'VC2AMA',music:'VC2AMU',visualarts:'VC2AVA',viscomm:'VC2AVC'};
(window.VC_DATA.subjects||[]).forEach(d=>{
  const base=SUBJECTS[d.key]||{key:d.key,name:d.name,full:d.name+' Version 2.0',concepts:[],fallback:{},taxa:GEN_TAXA,core:GEN_CORE,oldRe:null,
    curricUrl:'https://f10.vcaa.vic.edu.au/',levelUrl:()=>'https://f10.vcaa.vic.edu.au/',scopeUrl:'https://f10.vcaa.vic.edu.au/',taxTab:'Routines & priorities',taxOrder:['pedagogy','priorities'],
    glance:{title:'Teaching routines at a glance',key:'pedagogy',found:'Routines found',miss:'Key routines not seen',allOk:'All key routines present',coreNote:()=>'A guide to explicit teaching routines (VTLM 2.0), not a VCAA list.',special:null},
    taxNote:'These checks look for words that name teaching and assessment routines, cross-curriculum priorities and capabilities. A tick means the word or phrase appears in the sequence, not that it was taught in depth. Open an item to check.'};
  base.area=d.area;base.cds=d.cds;base.levels=d.levels;base.standards=d.standards||{};base.strands=d.strands;
  base.codeRe=new RegExp('\\b'+PREFIX[d.key]+'[A-Z0-9]{3,8}\\b','g');base.kwOnly=!base.concepts.length;
  SUBJECTS[d.key]=base;});
let SUBJ=SUBJECTS.english;
function setSubject(k){SUBJ=SUBJECTS[k]||SUBJECTS.english;LEVELS=SUBJ.levels;prepSubject(SUBJ);}
Object.values(SUBJECTS).forEach(s=>{
  const byId=Object.fromEntries(s.concepts.map(c=>[c.id,c]));
  s.byId=byId;
  s.cds.forEach(cd=>{
    if(cd.concepts) return;
    const ids=s.concepts.filter(c=>c.t.test(cd.description)).map(c=>c.id);
    if(!ids.length)(s.fallback[cd.substrand]||s.fallback[cd.strand]||[]).forEach(f=>ids.push(f));
    cd.concepts=ids;
  });
  s.cdBy=Object.fromEntries(s.cds.map(c=>[c.code,c]));
});

// ---------- state ----------
let S={subject:'english',name:'',levels:[],scope:'unit',files:[],overrides:{},notes:{},school:'',author:'',tab:'setup'};
let R=null; // analysis result
function save(){try{const keep={...S,files:stripFiles(S.files)};localStorage.setItem(STORE,JSON.stringify(keep));}catch(e){}}
function load(){try{const j=JSON.parse(localStorage.getItem(STORE)||'null');if(j){S={...S,...j};}}catch(e){}}

// ---------- text extraction ----------
function chunk(text,max=420){
  text=text.replace(/\s+/g,' ').trim(); if(!text) return [];
  if(text.length<=max) return [text];
  const out=[];let cur='';
  text.split(/(?<=[.!?;])\s+|\s+\|\s+/).forEach(s=>{ if((cur+' '+s).length>max&&cur){out.push(cur.trim());cur=s;} else cur+=' '+s; });
  if(cur.trim()) out.push(cur.trim());
  return out.flatMap(c=>c.length>max*1.6?c.match(new RegExp('.{1,'+max+'}(\\s|$)','g')).map(x=>x.trim()):[c]);
}
// A table with terms or semesters across the top ("TERM 1" over weeks 1–10, "Semester 2" …): each row is split into one
// line per term, tagged "[Term n]" or "[Semester n]", with the row's own labels (level, strand) in front, so each unit
// counts for the term it sits under. rows: [[{c (first grid column), span, t}]]. Returns null for any other table.
const TERM_LBL=/^\s*(?:(term|t)\s*([1-4])|(semester|sem)\s*([12]))\b/i;
function termRows(rows){
  let h=-1;const col={};
  for(let i=0;i<Math.min(rows.length,5)&&h<0;i++){const lab=rows[i].filter(x=>TERM_LBL.test(x.t)&&x.t.trim().length<40);
    const names=new Set(lab.map(x=>{const m=x.t.match(TERM_LBL);return m[1]?'Term '+m[2]:'Semester '+m[4];}));
    if(names.size>=2){h=i;lab.forEach(x=>{const m=x.t.match(TERM_LBL);const n=m[1]?'Term '+m[2]:'Semester '+m[4];for(let k=x.c;k<x.c+(x.span||1);k++)col[k]=n;});}}
  if(h<0)return null;
  const first=Math.min(...Object.keys(col).map(Number));const out=[];
  rows.forEach((r,i)=>{if(i<=h){const t=r.map(x=>x.t).filter(Boolean);const uniq=[...new Set(t)];if(uniq.length)out.push(uniq.join(' | '));return;}
    const lab=r.filter(x=>x.c<first).map(x=>x.t).filter(Boolean).join(' | ');const by={};
    r.filter(x=>x.c>=first&&x.t).forEach(x=>{const ns=new Set();for(let k=x.c;k<x.c+(x.span||1);k++)if(col[k])ns.add(col[k]);if(!ns.size)ns.add(col[x.c]||'');
      ns.forEach(n=>{const a=by[n]=by[n]||[];if(a[a.length-1]!==x.t)a.push(x.t);});});
    Object.entries(by).forEach(([n,a])=>{const uniq=[...new Set(a)];chunk((lab?lab+' | ':'')+uniq.join(' | '),600).forEach(c=>out.push(n?'['+n+'] '+c:c));});});
  return out;
}
async function readDocx(buf){
  const zip=await JSZip.loadAsync(buf);
  const f=zip.file('word/document.xml'); if(!f) throw new Error('This Word file has no document body.');
  const xml=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const ptext=p=>{let t='';p.querySelectorAll('*').forEach(n=>{if(n.namespaceURI!==W)return;if(n.localName==='t')t+=n.textContent;else if(n.localName==='tab')t+=' ';else if(n.localName==='br'||n.localName==='cr')t+=' ';});return t;};
  const segs=[];const body=xml.getElementsByTagNameNS(W,'body')[0];
  const cam=camParse(body,ptext);if(cam)return {segs:cam.segs,pages:null,map:cam.map};
  const walk=node=>{[...node.children].forEach(ch=>{
    if(ch.namespaceURI!==W){walk(ch);return;}
    if(ch.localName==='p'){const t=ptext(ch);chunk(t).forEach(c=>segs.push(c));}
    else if(ch.localName==='tbl'){const trs=[...ch.children].filter(r=>r.localName==='tr');
      // grid positions (gridBefore, gridSpan; vMerge continuations are empty), for tables with terms across the top
      const grid=trs.map(tr=>{let g=0;const pr=[...tr.children].find(x=>x.localName==='trPr');if(pr){const gb=[...pr.children].find(x=>x.localName==='gridBefore');if(gb)g=+(gb.getAttributeNS(W,'val')||gb.getAttribute('w:val')||0);}
        return [...tr.children].filter(c=>c.localName==='tc').map(tc=>{const p=[...tc.children].find(x=>x.localName==='tcPr');let span=1,cont=false;
          if(p){const gs=[...p.children].find(x=>x.localName==='gridSpan');if(gs)span=+(gs.getAttributeNS(W,'val')||gs.getAttribute('w:val')||1);const vm=[...p.children].find(x=>x.localName==='vMerge');if(vm&&!/restart/.test(vm.getAttributeNS(W,'val')||vm.getAttribute('w:val')||''))cont=true;}
          const c={c:g,span,t:cont?'':[...tc.getElementsByTagNameNS(W,'p')].map(ptext).join(' ').replace(/\s+/g,' ').trim()};g+=span;return c;});});
      const tr2=termRows(grid);
      if(tr2)tr2.forEach(c=>segs.push(c));
      else grid.forEach(cells=>{const row=cells.map(x=>x.t).filter(Boolean).join(' | '); chunk(row,600).forEach(c=>segs.push(c));});}
    else if(ch.localName==='sdt'||ch.localName==='sdtContent'||ch.localName==='customXml') walk(ch);
  });};
  walk(body);
  return {segs,pages:null};
}
async function readXlsx(buf,skip){
  const zip=await JSZip.loadAsync(buf);
  const xml=async n=>{const f=zip.file(n);return f?new DOMParser().parseFromString(await f.async('string'),'application/xml'):null;};
  const tx=el=>[...el.getElementsByTagName('t')].map(t=>t.textContent).join('');
  const ss=await xml('xl/sharedStrings.xml');const strings=ss?[...ss.getElementsByTagName('si')].map(tx):[];
  // Sheet names in workbook order, mapped to their files through the relationships
  const wb=await xml('xl/workbook.xml'),rels=await xml('xl/_rels/workbook.xml.rels');const target={};
  if(rels)[...rels.getElementsByTagName('Relationship')].forEach(r=>{target[r.getAttribute('Id')]=r.getAttribute('Target');});
  let sheets=wb?[...wb.getElementsByTagName('sheet')].map(sh=>{const id=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');let t=target[id]||'';t=t.replace(/^\/?(xl\/)?/,'xl/');return {name:sh.getAttribute('name'),path:t};}):[];
  if(!sheets.length)sheets=Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort().map((path,i)=>({name:'Sheet '+(i+1),path}));
  // the tab picker: draft, archived and future-year tabs are left out unless the teacher ticks them
  const allTabs=sheets.map(sh=>sh.name);if(!skip)skip=defaultSkip(allTabs);
  const taken=sheets.filter(sh=>!skip.includes(sh.name));
  // a curriculum area map kept as a spreadsheet: read its grid, never its listing
  const docs=[];for(const sh of taken){const doc=await xml(sh.path);if(doc)docs.push({name:sh.name,doc});}
  // each sheet on its own merits: curriculum area map, coverage checklist, or a plan (overview, scope and sequence)
  const all=docs.map(d=>{const rows=camSheetRows(d.doc,strings);return {...d,rows,k:sheetKind(rows)};});
  const camSheets=all.filter(d=>d.k.kind==='cam');const cam=camSheets.length?camXlsx(camSheets.map(d=>({name:d.name,rows:d.rows}))):null;
  const checkSeg={};all.filter(d=>d.k.kind==='check').forEach(d=>{checkSeg[d.name]=checkSegs(d.name,d.rows,d.k.cells);});
  const camNames=new Set(camSheets.map(d=>d.name));
  const segs=[];let nSheets=0;const per=[];
  for(const {name,doc} of docs){const sh={name};if(camNames.has(name))continue;if(checkSeg[name]){nSheets++;checkSeg[name].forEach(c=>segs.push(c));per.push({name,segs:checkSeg[name]});continue;}
    const rows=[...doc.getElementsByTagName('row')].map(r=>[...r.getElementsByTagName('c')].map(c=>{const t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0];
      if(t==='s')return v?strings[+v.textContent]||'':'';if(t==='inlineStr'){const is=c.getElementsByTagName('is')[0];return is?tx(is):'';}if(t==='b')return '';
      const val=v?v.textContent:'';return /^-?\d+(\.\d+)?(E-?\d+)?$/i.test(val)&&!/^\d{1,3}$/.test(val)?'':val;}).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean));
    const txt=rows.filter(r=>r.length);if(!txt.length)continue;nSheets++;
    // terms or semesters across the top: one line per term (see termRows)
    const cIdx=ref=>{const m=/^([A-Z]+)/.exec(ref||'');if(!m)return -1;let n=0;for(const ch of m[1])n=n*26+ch.charCodeAt(0)-64;return n-1;};
    const span={};[...doc.getElementsByTagName('mergeCell')].forEach(m=>{const [a1,b1]=(m.getAttribute('ref')||'').split(':');if(b1)span[a1]=cIdx(b1)-cIdx(a1)+1;});
    const grid=[...doc.getElementsByTagName('row')].map(r=>[...r.getElementsByTagName('c')].map(c=>{const t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0];
      let x='';if(t==='s')x=v?strings[+v.textContent]||'':'';else if(t==='inlineStr'){const is=c.getElementsByTagName('is')[0];x=is?tx(is):'';}else if(t!=='b'&&v)x=v.textContent;
      const ref=c.getAttribute('r');return {c:cIdx(ref),span:span[ref]||1,t:String(x).replace(/\s+/g,' ').trim()};}).filter(x=>x.t));
    const tr2=termRows(grid);
    const own=['Sheet: '+sh.name];(tr2?tr2.map(x=>[x]):txt).forEach(r=>chunk(r.join(' | '),600).forEach(c=>own.push(c)));
    own.forEach(c=>segs.push(c));per.push({name:sh.name,segs:own});}
  const tabs={all:allTabs,skip:skip.filter(n=>allTabs.includes(n))};
  if(cam)return {segs:cam.segs,pages:cam.map.sheets.length,map:cam.map,plan:segs.length?{segs,pages:nSheets,per}:null,tabs};
  return {segs,pages:nSheets,per,tabs};
}
// Tabs left out by default: drafts, old or archived copies, next year's or later, instructions and lists
const SKIP_TAB=/\b(draft|old|archived?|backup|copy|previous|next year|future|proposed|instructions?|read ?me|how to|lists?|lookups?|dropdowns?|data validation|settings)\b|\(\d\)\s*$/i;
function defaultSkip(names){const yr=new Date().getFullYear();
  const sk=names.filter(n=>SKIP_TAB.test(n)||(n.match(/\b20\d\d\b/g)||[]).some(y=>+y>yr));
  return sk.length<names.length?sk:[];}
function readCsv(text){const segs=[];text.replace(/\r/g,'').split('\n').forEach(line=>{const cells=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;}else if(ch==='"')q=false;else cur+=ch;}else if(ch==='"')q=true;else if(ch===','){cells.push(cur);cur='';}else cur+=ch;}
  cells.push(cur);const row=cells.map(c=>c.trim()).filter(Boolean).join(' | ');chunk(row,600).forEach(c=>segs.push(c));});return {segs,pages:null};}
async function readPptx(buf){
  const zip=await JSZip.loadAsync(buf);
  const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0]);
  const segs=[];
  for(const n of names){const x=await zip.file(n).async('string');
    const paras=x.split(/<\/a:p>/).map(p=>(p.match(/<a:t>([^<]*)<\/a:t>/g)||[]).map(t=>t.replace(/<\/?a:t>/g,'')).join('')).map(t=>t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")).filter(t=>t.trim());
    chunk(paras.join('. '),420).forEach(c=>segs.push(c));}
  return {segs,pages:names.length};
}
let pdfReady=null;
function initPdf(){ if(pdfReady) return pdfReady;
  pdfReady=new Promise(res=>{const lib=window.pdfjsLib; const b64=$('#pdfworker').textContent.trim();
    const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    lib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([u],{type:'text/javascript'})); res(lib);});
  return pdfReady;}
async function readPdf(buf){
  const lib=await initPdf();
  const doc=await lib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise;
  const segs=[];
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p);const tc=await page.getTextContent();
    const lines=[];let last=null,cur='';
    tc.items.forEach(it=>{const y=Math.round(it.transform[5]);if(last!==null&&Math.abs(y-last)>3){lines.push(cur);cur='';}cur+=(cur&&!/\s$/.test(cur)&&!/^\s/.test(it.str)?' ':'')+it.str;last=y;if(it.hasEOL){lines.push(cur);cur='';last=null;}});
    if(cur)lines.push(cur);
    chunk(lines.join(' ').replace(/(\w)- (\w)/g,'$1$2'),420).forEach(c=>segs.push(c));
  }
  return {segs,pages:doc.numPages};
}
async function readFile(file,skip){
  const fname=file._path||file.webkitRelativePath||file.name;
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  const buf=await file.arrayBuffer();
  let r,kind;
  if(ext==='docx'||ext==='docm'||ext==='dotx'){kind='Word';r=await readDocx(buf);}
  else if(ext==='pdf'){kind='PDF';r=await readPdf(buf);}
  else if(ext==='pptx'){kind='PowerPoint';r=await readPptx(buf);}
  else if(ext==='xlsx'||ext==='xlsm'){kind='Excel';r=await readXlsx(buf,skip);LAST_TABS=r.tabs&&r.tabs.all.length>1?r.tabs:null;
    if(r.tabs&&r.tabs.all.length&&r.tabs.skip.length===r.tabs.all.length)throw new Error('Every tab is left out. Tick at least one tab.');}
  else if(ext==='csv'){kind='CSV';r=readCsv(new TextDecoder().decode(buf));}
  else if(ext==='xls') throw new Error('Older .xls files can’t be read. Open it in Excel and use File › Save As › Excel Workbook (.xlsx).');
  else if(ext==='txt'||ext==='md'){kind='Text';r={segs:chunk(new TextDecoder().decode(buf).replace(/\r/g,'').split(/\n\s*\n/).join(' . ')),pages:null};}
  else if(ext==='doc') throw new Error('Older .doc files can’t be read. Open it in Word and use File › Save As › Word Document (.docx).');
  else throw new Error('Unsupported file type (.'+ext+'). Use a Word (.docx), PDF, PowerPoint (.pptx), Excel (.xlsx) or text file.');
  // A workbook with a tab per level (e.g. "Level 3", "Year 4", "Foundation") becomes one entry per tab, so each counts for its own level.
  if(r.per&&r.per.length>1){const lvOf=n=>{const m=n.match(/\b(?:L|Lvl|Level|Year|Yr|Y)\s?-?\s?(0?10A|0?\d{1,2})(?!\d)/i)||n.match(/\b(Foundation|Prep|F)\b/i);return m?lvKey(m[1]):null;};
    const tagged=r.per.filter(p=>lvOf(p.name));const distinct=new Set(tagged.map(p=>lvOf(p.name)));
    if(distinct.size>1){const out=[];const base=fname.replace(/\.[^.]+$/,'');
      r.per.forEach(p=>{const w=p.segs.join(' ').split(/\s+/).filter(Boolean).length;if(w<15)return;out.push({name:base+' › '+p.name,kind:'Excel',segs:p.segs,pages:1,words:w});});
      if(out.length)return out;}}
  const words=r.segs.join(' ').split(/\s+/).filter(Boolean).length;
  if(r.map){const out=[{name:file.name+(r.plan?' › map':''),kind:'Curriculum area map',segs:r.segs,pages:r.pages,words:words||1,map:r.map}];
    if(r.plan){const w=r.plan.segs.join(' ').split(/\s+/).filter(Boolean).length;if(w>=15)out.push({name:file.name+' › plan',kind:kind,segs:r.plan.segs,pages:r.plan.pages,words:w});}
    return out;}
  // A curriculum area map that isn't a Word file: its ticks can't be read, and its header codes must not count as coverage
  const all=r.segs.join(' ');if(/curriculum area map|map\s+[–-]\s+(template|example)/i.test(all)&&/teaching and learning unit/i.test(all)&&/AS no\./i.test(all)){
    toast(file.name+' looks like a curriculum area map. Its ticks can only be read from the Word (.docx) version, so its listed codes are ignored.');
    return [{name:file.name,kind:kind+' (map, codes ignored)',segs:r.segs.map(x=>x.replace(CAM_CODE,'').replace(/\s{2,}/g,' ').trim()).filter(Boolean),pages:r.pages,words,mapText:true}];}
  if(words<15) throw new Error(kind==='PDF'?'No readable text found. This PDF may be a scan (an image of pages). Export it from the original Word file instead.':'No readable text found in this file.');
  return [{name:fname,kind,segs:r.segs,pages:r.pages,words}];
}

// Excel files kept in memory this session, so their tabs can be chosen again without re-adding the file
const XFILES={};
async function readFileTagged(file,skip){const rs=await readFile(file,skip);
  if(/\.xls[xm]$/i.test(file.name)){XFILES[file.name]=file;
    rs.forEach(r=>{r.src=file.name;if(LAST_TABS)r.tabs=LAST_TABS;});}
  LAST_TABS=null;return rs;}
let LAST_TABS=null;
// ---------- analysis ----------
function gre(re){return new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');}
function snippet(text,re){
  const g=gre(re);const m=g.exec(text);if(!m)return esc(text.slice(0,200));
  const s=Math.max(0,m.index-90),e=Math.min(text.length,m.index+m[0].length+110);
  let t=text.slice(s,e);const h=gre(re);
  t=esc(t).replace(new RegExp(h.source,h.flags),x=>'<mark>'+x+'</mark>');
  return (s>0?'…':'')+t+(e<text.length?'…':'');
}
function hitsFor(re,files){
  const out={segs:0,w:0,files:new Set(),perFile:{},perFileW:{},perFileI:{},perFileP:{},idx:{},ev:[]};const evs=[];
  files.forEach((f,fi)=>{const wt=meta(f).wt;f.segs.forEach((seg,si)=>{ if(re.test(seg)){const w=wt[si];out.segs++;out.w+=w;out.files.add(fi);
    out.perFile[fi]=(out.perFile[fi]||0)+1;out.perFileW[fi]=(out.perFileW[fi]||0)+w;if(w>1)out.perFileI[fi]=(out.perFileI[fi]||0)+1;if(w<1)out.perFileP[fi]=(out.perFileP[fi]||0)+1;
    (out.idx[fi]=out.idx[fi]||[]).push(si);if(evs.length<60)evs.push({f:fi,i:si,w});}});});
  out.ev=evs.sort((x,y)=>y.w-x.w).slice(0,4);return out;
}
// Thresholds scale with document length: incidental mentions in a long lesson planner shouldn't count as teaching.
const CFG={full:2,half:1,fullRel:.05,halfRel:.016,covAt:.7,partAt:.3,wIntent:2,wVoc:.5,wMat:.25,kwShare:.4,kwBlend:.85};
function thresholds(nSegs){return [Math.max(CFG.full,Math.round(nSegs*CFG.fullRel)),Math.max(CFG.half,Math.round(nSegs*CFG.halfRel))];}
function scoreCd(cd,H,fileIdx){
  const N=fileIdx==null?R_N:(S.files[fileIdx]?S.files[fileIdx].segs.length:0);const [tf,th]=thresholds(N);
  let sum=0,got=0;
  cd.concepts.forEach(id=>{const c=SUBJ.byId[id];const h=H[id];const n=fileIdx==null?h.w:(h.perFileW[fileIdx]||0);
    const v=n>=tf?1:n>=th?.5:0;if(c.opt){if(v){sum+=c.w*.5;got+=c.w*.5*v;}}else{sum+=c.w;got+=c.w*v;}});
  return sum?got/sum:0;
}
let R_N=0;
// Which level a file belongs to: teacher's choice, else codes in it, else its name, else 'Level n' in its text; '*' = all selected levels.
function lvKey(x){x=String(x).toUpperCase().replace(/^0+(?=\d)/,'');x=x==='FOUNDATION'||x==='PREP'||x==='F'?'F':x;return subjLevel(x)||x;}
const codeLevel=c=>{const cd=SUBJ.cdBy[c];return cd?String(cd.level):null;};
function detectLevel(f){
  const cnt={};f.segs.forEach(sg=>{for(const m of sg.matchAll(SUBJ.codeRe)){const l=codeLevel(m[0]);if(l)cnt[l]=(cnt[l]||0)+1;}});
  if(f.map)f.map.units.forEach(u=>u.ticks.forEach(t=>{const l=codeLevel(t.code);if(l)cnt[l]=(cnt[l]||0)+1;}));
  let e=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
  if(e.length){if(e[1]&&e[1][1]>=e[0][1]*.4)return {lv:'*',why:'codes from several levels'};return {lv:e[0][0],why:'codes in the file'};}
  const n=f.name.replace(/[_.]+/g,' ');let m=n.match(/\b(?:L|Lvl|Level|Year|Yr|Y)\s?-?\s?(0?10A|0?\d{1,2})(?![\d])/i)||n.match(/\b(Foundation|Prep)\b/i)||n.match(/\bL(F)\b/i);
  if(m){const k=lvKey(m[1]);if(LEVELS.includes(k))return {lv:k,why:'file name'};}
  const t={};f.segs.slice(0,60).forEach(sg=>{for(const x of sg.matchAll(/\b(?:Level|Year)\s(10A|10|[1-9]|Foundation|Prep)\b/gi)){const k=lvKey(x[1]);t[k]=(t[k]||0)+1;}});
  e=Object.entries(t).filter(([k])=>LEVELS.includes(k)).sort((a,b)=>b[1]-a[1]);
  if(e.length&&(!e[1]||e[1][1]<e[0][1]*.5))return {lv:e[0][0],why:'"'+LVNAME(e[0][0])+'" in the text'};
  return {lv:'*',why:'no level found'};
}
function fileLevel(f){const o=(S.fileLv||{})[f.name];if(o)return {lv:o,why:'set by you'};return detectLevel(f);}
function eligible(level){return S.files.map((f,i)=>i).filter(i=>{if(S.levels.length<2)return true;const l=fileLevel(S.files[i]).lv;return l==='*'||l===String(level);});}
function scoreSet(cd,H,E){if(!E.length)return 0;const N=E.reduce((n,i)=>n+S.files[i].segs.length,0);const [tf,th]=thresholds(N);
  let sum=0,got=0;cd.concepts.forEach(id=>{const c=SUBJ.byId[id];const h=H[id];const n=E.reduce((k,i)=>k+(h.perFileW[i]||0),0);
    const v=n>=tf?1:n>=th?.5:0;if(c.opt){if(v){sum+=c.w*.5;got+=c.w*.5*v;}}else{sum+=c.w;got+=c.w*v;}});return sum?got/sum:0;}
function statusOf(score,listed){return listed?'cov':score>=CFG.covAt?'cov':score>=CFG.partAt?'part':'none';}
function analyse(){
  const files=S.files; if(!files.length||!S.levels.length){R=null;return;}
  R_N=files.reduce((n,f)=>n+f.segs.length,0);
  const H={};SUBJ.concepts.forEach(c=>{H[c.id]=hitsFor(c.e,files);});
  // explicit codes
  const listed={},other={},old=new Set();
  files.forEach((f,fi)=>f.segs.forEach(seg=>{
    for(const m of seg.matchAll(SUBJ.codeRe)){const code=m[0];if(!SUBJ.cdBy[code])continue;(listed[code]=listed[code]||new Set()).add(fi);}
    if(SUBJ.oldRe)for(const m of seg.matchAll(SUBJ.oldRe)) old.add(m[0]);
  }));
  // curriculum area maps: a content description counts only where a unit is ticked against it (never the column headers)
  const mapped={};files.forEach((f,fi)=>{if(!f.map)return;f.map.units.forEach(u=>u.ticks.forEach(t=>{if(!SUBJ.cdBy[t.code])return;(mapped[t.code]=mapped[t.code]||[]).push({fi,unit:u.name,sem:u.sem,as:t.as});}));});
  const cds=SUBJ.cds.filter(c=>S.levels.includes(String(c.level)));
  const rows=cds.map(cd=>{
    const fileScores=files.map((f,fi)=>f.map||f.mapText?0:SUBJ.kwOnly?kwScore(cd,[fi]).score:scoreCd(cd,H,fi));const E0=eligible(cd.level);
    // a map's own text (unit names, the template) is not evidence: only its ticks count
    const E=E0.filter(i=>!files[i].map&&!files[i].mapText);
    // Best of this level's files together and its strongest single file, so a topic taught in one unit of a whole-school upload still counts.
    let score=Math.max(scoreSet(cd,H,E),...E.map(i=>fileScores[i]),0);const isListed=!!listed[cd.code];
    // Key terms from the VCAA wording and elaborations: the main evidence where there is no concept library, a support elsewhere
    const K=kwScore(cd,E);const kwS=SUBJ.kwOnly?K.score:K.score*CFG.kwBlend;const kwLed=kwS>score;if(kwLed)score=kwS;
    let school=null,schoolLift=false;const terms=wordsFor(cd.code);
    if(terms.length){const re=wordRe(terms);const ev=[];let n=0;E.forEach(i=>files[i].segs.forEach((sg,si)=>{if(re.test(sg)){n++;if(ev.length<3)ev.push({f:i,i:si,w:1});}}));school={terms,n,ev,re};const sc=n>=2?1:n?0.5:0;if(sc>score){schoolLift=statusOf(sc,false)!==statusOf(score,false);score=sc;}}
    const isMapped=mapped[cd.code]||[];const hasPlans=E.length>0,hasMap=files.some(f=>f.map&&(!f.map.codes||!f.map.codes.length||f.map.codes.includes(cd.code)));
    // the check a map is for: does each tick show up in the plans, and is everything taught ticked?
    const mapFlag=isMapped.length&&hasPlans&&!isListed&&score<CFG.partAt?'notInPlans':!isMapped.length&&hasMap&&hasPlans&&(isListed||score>=CFG.partAt)?'notOnMap':null;
    const auto=statusOf(score,isListed||isMapped.length>0);const ov=S.overrides[cd.code];
    const perFile=files.map((f,fi)=>(listed[cd.code]&&listed[cd.code].has(fi))||isMapped.some(m=>m.fi===fi)?'cov':statusOf(fileScores[fi],false));
    const found=cd.concepts.filter(id=>H[id].segs>0),missing=cd.concepts.filter(id=>H[id].segs===0);
    // evidence units (concepts found, or key terms found) with the lines they were found in, for the insight views
    const evid=[];found.filter(id=>!SUBJ.byId[id].opt).forEach(id=>{const idx={};E.forEach(i=>{if(H[id].idx[i])idx[i]=H[id].idx[i];});if(Object.keys(idx).length)evid.push({id,idx});});
    if(kwLed||SUBJ.kwOnly||!evid.length)K.hits.filter(h=>h.v>0).forEach(h=>{const idx={};h.where.forEach(([i,si])=>(idx[i]=idx[i]||[]).push(si));evid.push({id:'kw:'+h.t,idx});});
    return {cd,score,listed:isListed,mapped:isMapped.length?isMapped:null,mapFlag,auto,status:ov||auto,overridden:!!ov,perFile,found,missing,E,school,schoolLift,kw:K.hits,kwLed,evid};
  });
  Object.keys(listed).forEach(c=>{if(!rows.find(r=>r.cd.code===c))other[c]=listed[c];});
  Object.keys(mapped).forEach(c=>{if(!rows.find(r=>r.cd.code===c)&&!other[c])other[c]=new Set(mapped[c].map(m=>m.fi));});
  // taxonomies
  const tax={};
  Object.entries(SUBJ.taxa).forEach(([k,t])=>{tax[k]=t.groups.map(([g,items])=>[g,items.map(([label,re])=>({label,re,h:hitsFor(re,files)}))]);});
  R={H,rows,listed,mapped,other,old:[...old],tax,when:new Date()};
}
function counts(rows){const c={cov:0,part:0,none:0,na:0};rows.forEach(r=>c[r.status]++);return c;}
function band(){const mx=Math.max(...S.levels.map(lvHi));return mx<=2?'early':mx<=6?'primary':'secondary';}

// ---------- rendering helpers ----------
function bar(c,total){total=total||1;const w=k=>(100*c[k]/total).toFixed(1)+'%';
  return `<div class="bar" title="${c.cov} covered, ${c.part} partly, ${c.none} not evident${c.na?', '+c.na+' not planned':''}"><span class="c" style="width:${w('cov')}"></span><span class="p" style="width:${w('part')}"></span><span class="x" style="width:${w('na')}"></span><span class="n" style="width:${w('none')}"></span></div>`;}
function tag(st){return `<span class="tag s-${st}">${STATUS[st]}</span>`;}
function evHtml(ev,re,max=3){return ev.slice(0,max).map(e=>{const f=S.files[e.f];return `<div class="ev">${snippet(f.segs[e.i],re)}<div class="src">${esc(f.name)}${e.w>1?' · <b>learning intention, success criteria or assessment</b>':e.w<1?' · vocabulary or materials list (counts less)':''}</div></div>`;}).join('');}
function toast(t,ms){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),ms||2600);}
function levelLabel(){if(!S.levels.length)return '';const ls=LEVELS.filter(l=>S.levels.includes(l));if(ls.length===1)return LVNAME(ls[0]);
  const idx=ls.map(l=>LEVELS.indexOf(l));const contiguous=idx.every((v,i)=>!i||v===idx[i-1]+1);
  if(contiguous&&ls.length>1&&(ls.length>2||ls.some(l=>l.includes('-')))){const lo=lvLo(ls[0]),hi=lvHi(ls[ls.length-1]),hs=hi===10.5?'10A':String(hi);
    const whole=ls.length===LEVELS.length||(lo===0&&hi===6)||(lo===7&&hi>=10)?'Whole school ':'';return whole+(lo===0?'Foundation–Level '+hs:'Levels '+lo+'–'+hs);}
  return 'Levels '+ls.map(LVSHORT).join(', ');}
const PRESETS=()=>{const hasA=LEVELS.includes('10A');const p=LEVELS.filter(l=>lvHi(l)<=6),sec=LEVELS.filter(l=>lvLo(l)>=7);const out=[];if(p.length>1)out.push(['Whole school F–6',p]);if(sec.length>1)out.push([hasA?'Whole school 7–10A':'Whole school 7–10',sec]);out.push([(lvLo(LEVELS[0])===0?'All levels F':'All levels '+lvLo(LEVELS[0]))+'–'+(hasA?'10A':'10'),LEVELS.slice()]);return out;};

// ---------- tabs ----------
const TABS=()=>[['setup','1. Set up'],['summary','2. Summary'],['cds','Content descriptions'],['texts',SUBJ.taxTab],['insights','Insights'],['report','Report'],['help','How to use']];
function renderTabs(){
  $('#tabs').innerHTML=TABS().map(([k,l])=>{const dis=k!=='setup'&&k!=='help'&&!R;const b=k==='insights'&&R&&S.levels.length>1&&insights().breaks.length?`<span class="badge">${insights().breaks.length}</span>`:k==='cds'&&R?`<span class="badge">${counts(R.rows).none}</span>`:'';
    return `<button data-tab="${k}" class="${S.tab===k?'on':''}" ${dis?'disabled style="opacity:.45"':''}>${l}${b}</button>`;}).join('');
  $$('#tabs button').forEach(b=>b.onclick=()=>{if(b.disabled)return;S.tab=b.dataset.tab;render();window.scrollTo(0,0);});
}
function render(){
  renderTabs();
  const v={setup:vSetup,summary:vSummary,cds:vCds,texts:vTexts,insights:vInsights,report:vReport,help:vHelp}[S.tab]||vSetup;
  $('#view').innerHTML=v(); bind[S.tab]&&bind[S.tab]();
}
const bind={};

// ---------- Setup ----------
function tabPicker(f){const live=!!XFILES[f.src];
  return `<div class="tabpick small"><b>${esc(f.src)}</b>: tabs read ${f.tabs.all.map(n=>`<button class="chip sm ${f.tabs.skip.includes(n)?'':'on'}" data-xtab="${esc(n)}" data-xsrc="${esc(f.src)}" ${live?'':'disabled'}>${esc(n)}</button>`).join('')}${live?'':' <span class="muted">Add the file again to change the tabs.</span>'}</div>`;}
function vSetup(){
  const lv=LEVELS.map(l=>`<button class="chip ${S.levels.includes(l)?'on':''}" data-lv="${l}">${LVSHORT(l)}</button>`).join('');
  const files=S.files.map((f,i)=>{const codes=new Set();f.segs.forEach(s=>{for(const m of s.matchAll(SUBJ.codeRe))codes.add(m[0]);});
    const pick=f.tabs&&S.files.findIndex(x=>x.src===f.src)===i?tabPicker(f):'';
    return pick+`<div class="file"><span class="tag s-na">${f.kind}</span><div style="flex:1"><div class="nm">${esc(f.name)}</div><div class="meta">${S.levels.length>1?(()=>{const fl=fileLevel(f),d=detectLevel(f);return `<label>Counts for <select data-flv="${esc(f.name)}"><option value="">Auto: ${d.lv==='*'?'all selected levels':LVNAME(d.lv)} (${esc(d.why)})</option><option value="*" ${(S.fileLv||{})[f.name]==='*'?'selected':''}>All selected levels</option>${LEVELS.filter(l=>S.levels.includes(l)).map(l=>`<option value="${l}" ${(S.fileLv||{})[f.name]===l?'selected':''}>${LVNAME(l)}</option>`).join('')}</select></label> · `;})():''}${f.words.toLocaleString()} words${f.pages?' · '+f.pages+(f.kind==='PowerPoint'?' slides':f.kind==='Excel'?(f.pages===1?' sheet':' sheets'):' pages'):''}${codes.size?' · '+codes.size+' curriculum codes listed':''}</div></div><button class="x" data-rm="${i}" title="Remove">✕</button></div>`;}).join('');
  return `
  <div class="note">Audit a teaching sequence against <b>Victorian Curriculum 2.0 ${SUBJ.full}</b>. Upload the sequence and the tool shows which content descriptions it covers, which are missing, and ${SUBJ.key==='maths'?'which mathematical practices, teaching routines, representations and contexts it includes':'which text types, genres, themes and skills it includes'}. <b>Your files stay on this computer.</b> Nothing is uploaded or sent anywhere.</div>
  <div class="card"><h2><span class="step">1</span>What are you auditing?</h2>
    <div class="row" style="margin-top:10px">
      <div><label class="small muted">Sequence or plan name</label><input type="text" id="seqName" placeholder="${SUBJ.key==='maths'?'e.g. Term 2 – Fractions and decimals':'e.g. Term 2 – Narrative and \'Bindi\' text study'}" value="${esc(S.name)}"></div>
      <div><label class="small muted">What does the upload cover?</label><br>
        <div class="chips"><button class="chip ${S.scope==='unit'?'on':''}" data-scope="unit">One unit or term</button><button class="chip ${S.scope==='year'?'on':''}" data-scope="year">A whole year</button></div>
        <div class="small muted">${S.scope==='unit'?'One unit won’t cover everything. Missing content descriptions are shown as gaps to plan for elsewhere in the year.':'A whole-year plan should cover every content description for the level at least once.'}</div></div>
    </div>
    <h3>Curriculum level <span class="small muted">(choose one, several for a composite class or a group of year levels, or a whole school)</span></h3>
    <div class="chips" id="lvchips">${lv}</div>
    <div class="chips"><span class="small muted" style="align-self:center">Quick select:</span>${PRESETS().map(([lab,ls],i)=>`<button class="chip ${ls.length===S.levels.length&&ls.every(l=>S.levels.includes(l))?'on':''}" data-preset="${i}">${lab}</button>`).join('')}${S.levels.length?'<button class="chip" data-preset="clear">Clear</button>':''}</div>
    ${S.levels.length>1?`<div class="small muted">With more than one level, each file counts towards its own level. The tool reads the level from the file’s codes, name or text. Check the <b>Counts for</b> setting under each file below.</div>`:''}
    ${S.levels.length>2?`<div class="small muted">${S.levels.length} levels selected: ${esc(levelLabel())}. Add every sequence for these levels so the audit can see the whole program.</div>`:''}
  </div>
  <div class="card"><h2><span class="step">2</span>Add your sequence</h2>
    <p class="small muted" style="margin:2px 0 10px">Word (.docx), PDF, PowerPoint (.pptx), Excel (.xlsx, .csv) or text files. Add several files to audit a term or a year together. Lesson planners, unit overviews, term plans, scope and sequence charts and yearly overview spreadsheets all work.</p>
    <div class="drop" id="drop"><strong>Drag files or a whole folder here</strong> or <button class="btn sm" id="pick">Choose files</button> <button class="btn sm ghost" id="pickDir">Choose a folder</button><input type="file" id="fileIn" multiple accept=".docx,.pdf,.pptx,.xlsx,.xlsm,.csv,.xls,.txt,.md,.doc" class="hide"><input type="file" id="dirIn" webkitdirectory multiple class="hide"><div class="small muted" style="margin-top:6px">A folder brings in every plan inside it. Subfolders named for a level (e.g. “Year 3”) or a term (“Term 2”) tell the tool where each file belongs.</div><div class="small muted" style="margin-top:6px">Scanned PDFs (pictures of pages) can’t be read. Use the original Word file.</div></div>
    <div id="busy" class="small muted"></div>
    <div class="files">${files||''}</div>
    <details style="margin-top:8px"><summary>Or paste text instead</summary><textarea id="paste" placeholder="Paste the sequence, unit overview or lesson titles here"></textarea><button class="btn sm ghost" id="addPaste">Add pasted text</button></details>
  </div>
  <div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><button class="btn red" id="run" ${S.files.length&&S.levels.length?'':'disabled'}>Run the audit →</button>
    <span class="small muted">${!S.levels.length?'Choose a level. ':''}${!S.files.length?'Add at least one file.':''}</span>
    <span style="margin-left:auto" class="small"><button class="btn sm ghost" id="openSaved">Open a saved audit</button> <input type="file" id="openIn" accept=".json" class="hide"> ${S.files.length?'<button class="btn sm ghost" id="clearAll">Start a new audit</button>':''}</span></div>`;
}
bind.setup=()=>{
  $('#seqName').oninput=e=>{S.name=e.target.value;save();};
  $$('[data-scope]').forEach(b=>b.onclick=()=>{S.scope=b.dataset.scope;analyse();save();render();});
  $$('[data-lv]').forEach(b=>b.onclick=()=>{const l=b.dataset.lv;S.levels=S.levels.includes(l)?S.levels.filter(x=>x!==l):[...S.levels,l];S.levels=LEVELS.filter(x=>S.levels.includes(x));analyse();save();render();});
  $$('[data-preset]').forEach(b=>b.onclick=()=>{const k=b.dataset.preset;if(k==='clear')S.levels=[];else{S.levels=PRESETS()[+k][1].slice();S.scope='year';}analyse();save();render();});
  const inp=$('#fileIn');$('#pick').onclick=e=>{e.stopPropagation();inp.click();};
  inp.onchange=()=>addFiles([...inp.files]);
  const di=$('#dirIn');$('#pickDir').onclick=e=>{e.stopPropagation();di.click();};di.onchange=()=>addFiles([...di.files]);
  const d=$('#drop');['dragenter','dragover'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();d.classList.add('over');}));
  ['dragleave','drop'].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();d.classList.remove('over');}));
  d.addEventListener('drop',e=>{droppedFiles(e.dataTransfer).then(addFiles);});
  $$('[data-flv]').forEach(sel=>sel.onchange=()=>{S.fileLv=S.fileLv||{};if(sel.value)S.fileLv[sel.dataset.flv]=sel.value;else delete S.fileLv[sel.dataset.flv];analyse();save();});
  $$('[data-xtab]').forEach(b=>b.onclick=async()=>{const src=b.dataset.xsrc,n=b.dataset.xtab;const f=S.files.find(x=>x.src===src);if(!f||!XFILES[src])return;
    const sk=new Set(f.tabs.skip);sk.has(n)?sk.delete(n):sk.add(n);if(sk.size===f.tabs.all.length){toast('Keep at least one tab.');return;}
    const keepLv={};S.files.filter(x=>x.src===src).forEach(x=>{if((S.fileLv||{})[x.name])keepLv[x.name]=S.fileLv[x.name];});
    await addFiles([XFILES[src]],[...sk]);Object.assign(S.fileLv=S.fileLv||{},keepLv);});
  $$('[data-rm]').forEach(b=>b.onclick=()=>{S.files.splice(+b.dataset.rm,1);analyse();save();render();});
  $('#addPaste').onclick=()=>{const t=$('#paste').value;if(t.trim().split(/\s+/).length<15){toast('Paste a bit more text first.');return;}
    S.files.push({name:'Pasted text '+(S.files.filter(f=>f.kind==='Pasted').length+1),kind:'Pasted',segs:chunk(t.replace(/\r/g,'').split(/\n\s*\n/).join(' . ')),pages:null,words:t.split(/\s+/).length});analyse();save();render();};
  $('#run').onclick=()=>{analyse();S.tab='summary';save();render();window.scrollTo(0,0);};
  $('#openSaved').onclick=()=>$('#openIn').click();
  $('#openIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.vlpAudit)throw 0;S={...S,...j.state};S.subject=j.state.subject||'english';setSubject(S.subject);renderSubj();analyse();save();S.tab=R?'summary':'setup';render();toast('Audit opened.');}catch(err){toast('That isn’t a saved audit file.');}};
  const c=$('#clearAll');if(c)c.onclick=()=>{if(!confirmInline(c))return;S={...S,name:'',files:[],overrides:{},notes:{}};R=null;save();render();};
};
function confirmInline(btn){if(btn.dataset.sure)return true;btn.dataset.sure=1;btn.textContent='Click again to clear everything';setTimeout(()=>{if(btn.isConnected){delete btn.dataset.sure;btn.textContent='Start a new audit';}},4000);return false;}
async function addFiles(list,skip){
  const busy=$('#busy');let skipped=0;const bulk=list.some(f=>f._path||f.webkitRelativePath);
  if(bulk){const n0=list.length;list=list.filter(f=>OKEXT.test(f.name)&&!/^(~\$|\.)/.test(f.name));skipped=n0-list.length;}
  const before=S.files.length;
  for(const f of list){busy.textContent='Reading '+f.name+'…';
    try{const rs=await readFileTagged(f,skip);S.files=S.files.filter(x=>x.src!==f.name);rs.forEach(r=>{S.files=S.files.filter(x=>x.name!==r.name);S.files.push(r);});if(rs.length>1&&!skip)toast(f.name+': '+rs.length+' entries added (a map, a plan, or a tab per level).');
      const tb=rs[0]&&rs[0].tabs;if(tb&&tb.skip.length&&!skip)toast(f.name+': left out '+tb.skip.join(', ')+'. Tick a tab under the file to include it.',6000);}
    catch(e){toast(f.name+': '+(e.message||'could not be read'));console.error(e);}}
  busy.textContent='';
  // Suggest a level from codes in the files if none chosen
  if(!S.levels.length){const lv={};S.files.forEach(f=>f.segs.forEach(s=>{for(const m of s.matchAll(SUBJ.codeRe)){const l=codeLevel(m[0]);if(l)lv[l]=(lv[l]||0)+1;}}));
    const best=Object.entries(lv).filter(([,n])=>n>=3).map(([l])=>l);if(best.length){S.levels=LEVELS.filter(x=>best.includes(x));best.splice(0,best.length,...S.levels);toast('Level set from the codes in your file: '+best.map(LVNAME).join(', ')+'. Change it if needed.');}}
  // No codes: take the levels from file and folder names
  if(!S.levels.length){const ls=new Set(S.files.map(f=>detectLevel(f)).filter(d=>d.lv!=='*'&&d.why==='file name').map(d=>d.lv));if(ls.size){S.levels=LEVELS.filter(x=>ls.has(x));if(S.levels.length>2)S.scope='year';toast('Level'+(ls.size>1?'s':'')+' set from the file and folder names: '+S.levels.map(LVNAME).join(', ')+'. Change if needed.',5000);}}
  if(bulk)toast('Added '+(S.files.length-before)+' file'+(S.files.length-before===1?'':'s')+' from the folder'+(skipped?' ('+skipped+' other file'+(skipped===1?'':'s')+' skipped)':'')+'.',5000);
  if(!S.name&&S.files.length===1)S.name=S.files[0].name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
  analyse();save();render();
}

// ---------- Summary ----------
function vSummary(){
  if(!R)return '<div class="empty">Run the audit first.</div>';
  const c=counts(R.rows),n=R.rows.length,pct=k=>Math.round(100*c[k]/n);
  const strands=SUBJ.strands.map(st=>{const rs=R.rows.filter(r=>r.cd.strand===st);const cc=counts(rs);
    const subs=[...new Set(rs.map(r=>r.cd.substrand))].filter(ss=>ss!==st).map(ss=>{const r2=rs.filter(r=>r.cd.substrand===ss);const c2=counts(r2);
      return `<tr><td style="padding-left:22px">${esc(ss)}</td><td>${bar(c2,r2.length)}</td><td class="right small">${c2.cov}/${r2.length}</td></tr>`;}).join('');
    return `<tr class="grp"><td>${st}</td><td>${bar(cc,rs.length)}</td><td class="right">${cc.cov}/${rs.length}</td></tr>${subs}`;}).join('');
  const isYear=S.scope==='year';
  // gaps
  const gaps=R.rows.filter(r=>r.status==='none'||(isYear&&r.status==='part'));
  const byLevel=S.levels.length>2;const bySub={};gaps.forEach(r=>{const k=byLevel?LVNAME(String(r.cd.level))+' · '+r.cd.strand:r.cd.substrand;(bySub[k]=bySub[k]||[]).push(r);});
  const order=byLevel?(a,b)=>LEVELS.indexOf(String(a[1][0].cd.level))-LEVELS.indexOf(String(b[1][0].cd.level))||SUBJ.strands.indexOf(a[1][0].cd.strand)-SUBJ.strands.indexOf(b[1][0].cd.strand):(a,b)=>b[1].length-a[1].length;
  const gapHtml=Object.entries(bySub).sort(order).map(([ss,rs])=>`<div class="gap"><div class="h">${esc(ss)} <span class="small muted">(${rs.length})</span></div>${rs.map(r=>`<div class="small" style="margin-top:4px">${S.levels.length>1&&!byLevel?`<span class="lvlh">${LVNAME(String(r.cd.level))}</span>`:''}<span class="code">${r.cd.code}</span> ${esc(r.cd.description)} ${r.status==='part'?tag('part'):''}<div class="lookfor"><b>Look for:</b> ${esc(lookFor(r))}</div>${vlpLine(r.cd)?`<div class="lookfor vlp">${esc(vlpLine(r.cd))}</div>`:''}</div>`).join('')}</div>`).join('');
  // core text types
  const G=SUBJ.glance;const tt=R.tax[G.key].flatMap(([,it])=>it);const core=SUBJ.core[band()];const missCore=core.filter(l=>{const x=tt.find(t=>t.label===l);return !x||x.h.segs===0;});
  const fn=G.special?R.tax[G.special.key][0][1][G.special.idx]:null;
  const warns=[];
  if(R.old.length)warns.push(`This sequence lists <b>Victorian Curriculum 1.0</b> codes (${R.old.slice(0,6).join(', ')}${R.old.length>6?'…':''}). Version 2.0 is now required. The audit maps the sequence to Version 2.0 codes.`);
  const otherCodes=Object.keys(R.other);if(otherCodes.length)warns.push(`The files also list ${otherCodes.length} code${otherCodes.length>1?'s':''} from other levels (${otherCodes.slice(0,8).join(', ')}${otherCodes.length>8?'…':''}). Only ${esc(levelLabel())} is audited. Add a level above to include them.`);
  const listedN=R.rows.filter(r=>r.listed).length;
  const fileMatrix=S.files.length>6?`<div class="card"><h2>Which file covers what</h2><p class="small muted">Content descriptions each file covers at the level it counts towards.</p><div style="overflow:auto"><table><tr><th>File</th>${S.levels.length>1?'<th>Counts for</th>':''}<th style="min-width:160px">Coverage</th><th class="right">Covered</th><th class="right">Partly</th>${SUBJ.strands.map(st=>`<th class="right">${st}</th>`).join('')}</tr>${S.files.map((f,fi)=>[f,fi]).sort((x,y)=>{const l=z=>{const v=fileLevel(z).lv;return v==='*'?99:LEVELS.indexOf(v);};return l(x[0])-l(y[0])||x[0].name.localeCompare(y[0].name);}).map(([f,fi])=>{const fl=fileLevel(f).lv;const rs=R.rows.filter(r=>S.levels.length<2||fl==='*'||String(r.cd.level)===fl);const cc={cov:0,part:0,none:0,na:0};rs.forEach(r=>cc[r.perFile[fi]]++);
      return `<tr><td class="small"><b>${esc(f.name)}</b></td>${S.levels.length>1?`<td class="small">${fl==='*'?'All levels':LVNAME(fl)}</td>`:''}<td>${bar(cc,rs.length)}</td><td class="right">${cc.cov}</td><td class="right">${cc.part}</td>${SUBJ.strands.map(st=>{const x=rs.filter(r=>r.cd.strand===st);const k=x.filter(r=>r.perFile[fi]==='cov').length;return `<td class="right small">${k?k:'<span class="muted">–</span>'}</td>`;}).join('')}</tr>`;}).join('')}</table></div></div>`
  :S.files.length>1?`<div class="card"><h2>Which file covers what</h2><p class="small muted">Content descriptions covered (green) or partly covered (amber) in each file.</p><div style="overflow:auto"><table class="matrix"><tr><th>Strand</th>${S.files.map(f=>`<th class="small">${esc(f.name.length>28?f.name.slice(0,26)+'…':f.name)}${S.levels.length>1?`<div style="text-transform:none">${(l=>l==='*'?'all levels':LVNAME(l))(fileLevel(f).lv)}</div>`:''}</th>`).join('')}</tr>${SUBJ.strands.map(st=>{const rs=R.rows.filter(r=>r.cd.strand===st);return `<tr><td>${st}</td>${S.files.map((f,fi)=>{const cc={cov:0,part:0,none:0,na:0};rs.forEach(r=>cc[r.perFile[fi]]++);return `<td style="min-width:120px">${bar(cc,rs.length)}<div class="small muted">${cc.cov} covered, ${cc.part} partly</div></td>`;}).join('')}</tr>`;}).join('')}</table></div></div>`:'';
  return `
  <div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><div><h2>${esc(auditTitle())}</h2><div class="muted small">${esc(levelLabel())} · Victorian Curriculum 2.0 ${SUBJ.full} · ${S.files.length} file${S.files.length>1?'s':''} · ${isYear?'whole-year audit':'single unit/term audit'}</div></div>
   <div class="noprint"><button class="btn sm ghost" data-go="cds">Check each content description</button> <button class="btn sm" data-go="report">Make the report</button></div></div>
   <div class="tiles">
    <div class="tile cov"><div class="big">${c.cov}<span style="font-size:16px"> / ${n}</span></div><div class="lab">content descriptions covered (${pct('cov')}%)</div></div>
    <div class="tile part"><div class="big">${c.part}</div><div class="lab">partly covered: some evidence, worth checking</div></div>
    <div class="tile none"><div class="big">${c.none}</div><div class="lab">${isYear?'not evident: gaps to plan for':'not in this sequence: plan elsewhere in the year'}</div></div>
    <div class="tile nav"><div class="big">${listedN}</div><div class="lab">codes for ${S.levels.length>1?'these levels':'this level'} listed in the files${c.na?` · ${c.na} marked not planned`:''}</div></div>
   </div>
   ${warns.map(w=>`<div class="warn">${w}</div>`).join('')}
   <div class="small muted">How to read this: <span class="tag s-cov">Covered</span> the sequence lists the code, or shows clear evidence of what it describes. <span class="tag s-part">Partly covered</span> some of it is there. <span class="tag s-none">Not evident</span> nothing found. The tool matches words, so check the evidence and change any status on the Content descriptions tab.</div>
  </div>
  <div class="row">
   <div class="card" style="flex:1.3 1 420px"><h2>Coverage by strand${SUBJ.strands.some(st=>R.rows.some(r=>r.cd.strand===st&&r.cd.substrand!==st))?' and sub-strand':''}</h2><table>${strands}</table>
    <div class="small muted" style="margin-top:8px"><span class="dot c"></span> covered &nbsp; <span class="dot" style="background:#f0a630"></span> partly &nbsp; <span class="dot" style="background:#e7b3c0"></span> not evident</div></div>
   <div class="card" style="flex:1 1 320px"><h2>${G.title}</h2>
    <h3>${G.found}</h3><div class="chips">${tt.filter(t=>t.h.segs).map(t=>`<span class="tag s-cov">${esc(t.label)}</span>`).join('')||'<span class="muted small">None detected</span>'}</div>
    <h3>${G.miss}</h3><div class="chips">${missCore.map(l=>`<span class="tag s-none">${esc(l)}</span>`).join('')||`<span class="tag s-cov">${G.allOk}</span>`}</div>
    <p class="small muted">${G.coreNote(band())}</p>
    ${fn?`<h3>${G.special.title}</h3>
    <div>${fn.h.segs?`<span class="tag s-cov">Evident (${fn.h.segs} mention${fn.h.segs>1?'s':''})</span>`:`<span class="tag s-none">Not evident</span> <span class="small muted">${G.special.miss}</span>`}</div>`:''}
    <div style="margin-top:10px"><button class="btn sm ghost" data-go="texts">See ${esc(SUBJ.taxTab.toLowerCase())}</button></div>
   </div>
  </div>
  ${mapCard()}
  ${levelCard()}
  ${fileMatrix}
  <div class="card"><h2>${isYear?'Gaps to plan for':'Not in this sequence'}</h2><p class="small muted">${isYear?(S.levels.length>2?'Content descriptions with no or only partial evidence, grouped by level and strand.':'Content descriptions with no or only partial evidence, grouped by sub-strand, biggest gaps first.'):'Content descriptions this sequence doesn’t address. These need to be covered by other units this year.'} Mark any that are taught in ways the document doesn’t show on the Content descriptions tab.</p>${vlpCard()}${gapHtml||'<p>No gaps found. Every content description has evidence.</p>'}</div>`;
}
function byLevelRows(){return LEVELS.filter(l=>S.levels.includes(l)).map(l=>{const rs=R.rows.filter(r=>String(r.cd.level)===l);return {l,rs,c:counts(rs),st:SUBJ.strands.map(st=>{const x=rs.filter(r=>r.cd.strand===st);return {st,n:x.length,cov:x.filter(r=>r.status==='cov').length};})};});}
function auditTitle(){return S.name||(S.levels.length>2?'Whole-school audit':S.files.length>1?'Curriculum audit':'Untitled sequence');}
function mapUnits(r){const by={};r.mapped.forEach(m=>{const k=m.unit;(by[k]=by[k]||{unit:m.unit,sem:m.sem,as:new Set(),files:new Set()});m.as.forEach(n=>by[k].as.add(n));by[k].files.add(m.fi);});return Object.values(by);}
function mapEvHtml(r){if(!r.mapped)return '';return `<div class="ev"><b>Ticked on the curriculum area map</b> for ${mapUnits(r).map(u=>`<b>${esc(u.unit)}</b>${u.sem?' ('+esc(/^\d$/.test(u.sem)?'Semester '+u.sem:u.sem)+')':''}${u.as.size?' · AS sentence'+(u.as.size>1?'s ':' ')+[...u.as].sort((a,b)=>a-b).join(', '):''}`).join('; ')}<div class="src">${[...new Set(r.mapped.map(m=>S.files[m.fi].name))].map(esc).join(', ')}</div></div>${r.mapFlag==='notInPlans'?'<div class="warn small">The plans you uploaded show no evidence of this content description. Check the unit plan, or untick it on the map.</div>':''}`;}
function mapCard(){const maps=S.files.filter(f=>f.map),mt=S.files.filter(f=>f.mapText);if(!R)return '';
  const mtw=mt.length?`<div class="warn">${mt.map(f=>esc(f.name)).join(', ')} ${mt.length>1?'look':'looks'} like a curriculum area map, but ticks can only be read from the Word (.docx) version. ${mt.length>1?'They are':'It is'} left out of the audit, so the content descriptions listed in ${mt.length>1?'them':'it'} don’t count as coverage. Upload the Word file instead.</div>`:'';
  if(!maps.length)return mtw?`<div class="card"><h2>Curriculum area map</h2>${mtw}</div>`:'';
  const units=maps.reduce((n,f)=>n+f.map.units.length,0);const ticked=R.rows.filter(r=>r.mapped).length;const plans=S.files.length>maps.length;
  const notIn=R.rows.filter(r=>r.mapFlag==='notInPlans'),notOn=R.rows.filter(r=>r.mapFlag==='notOnMap');const blank=R.rows.filter(r=>!r.mapped);
  const li=rs=>rs.map(r=>`<div class="small" style="margin-top:3px"><span class="code">${r.cd.code}</span> ${esc(r.cd.description)}</div>`).join('');
  return `<div class="card"><h2>Curriculum area map check</h2>${mtw}
   <p class="small muted">${maps.map(f=>esc(f.name)+(f.map.sheets&&f.map.sheets.length>1?' ('+f.map.sheets.length+' tabs)':'')).join(', ')}: ${units} teaching and learning unit${units===1?'':'s'}, ${ticked} of ${R.rows.length} content descriptions ticked. Only ticks count: the content descriptions listed across the top of the map are not coverage.</p>
   ${plans?`<div class="row"><div><h3>On the map, not evident in the plans (${notIn.length})</h3>${li(notIn)||'<div class="small muted">None. Every tick has evidence in the plans.</div>'}</div>
     <div><h3>Evident in the plans, not ticked on the map (${notOn.length})</h3>${li(notOn)||'<div class="small muted">None.</div>'}</div></div>`
   :`<div class="warn">Only the map was uploaded, so coverage here is what the map says. Add the unit plans too, and the audit checks each tick against them.</div>${blank.length?`<h3>Not ticked for any unit (${blank.length})</h3>${li(blank)}`:''}`}
   ${(()=>{const q=maps.flatMap(f=>(f.map.queries||[]).filter(x=>R.rows.some(r=>r.cd.code===x.code)));return q.length?`<h3>Marked without a number (${q.length}): not counted</h3><p class="small muted">These cells have something other than an AS number in them, so they aren’t counted as coverage. Check them with the team.</p>${q.map(x=>`<div class="small" style="margin-top:3px"><span class="code">${x.code}</span> “${esc(x.v)}” for <b>${esc(x.unit)}</b>${x.sheet?` <span class="muted">(${esc(x.sheet)})</span>`:''}</div>`).join('')}`:'';})()}
   ${maps.some(f=>f.map.as.length)?`<p class="small muted" style="margin-top:8px">The achievement standard sentences the map marks are shown beside each statement on the Insights tab.</p>`:''}</div>`;}
function levelCard(){if(S.levels.length<2)return '';const rows=byLevelRows();
  return `<div class="card"><h2>Coverage by level</h2><p class="small muted">Content descriptions covered at each level, overall and by strand.</p><div style="overflow:auto"><table><tr><th>Level</th><th style="min-width:160px">Overall</th><th class="right">Covered</th>${SUBJ.strands.map(st=>`<th class="right">${st}</th>`).join('')}</tr>
   ${rows.map(x=>`<tr><td><b>${LVNAME(x.l)}</b></td><td>${bar(x.c,x.rs.length)}</td><td class="right">${x.c.cov}/${x.rs.length} <span class="small muted">(${Math.round(100*x.c.cov/(x.rs.length||1))}%)</span></td>${x.st.map(y=>`<td class="right small">${y.n?`<span class="${y.cov===y.n?'':y.cov===0?'tag s-none':''}">${y.cov}/${y.n}</span>`:'–'}</td>`).join('')}</tr>`).join('')}</table></div></div>`;}
function elabFor(cd,strip){const el=(cd.el||[]).filter(e=>e.length>20);if(!el.length)return '';return el[0];}
function lookFor(r){if(SUBJ.kwOnly||!r.cd.concepts.length){const e=elabFor(r.cd);const miss=(r.cd.kw||[]).filter(k=>!(r.kw||[]).some(h=>h.t===k.t&&h.v)).slice(0,4).map(k=>surf(k.t));return (e?'VCAA example: '+e+'. ':'')+(miss.length?'Key words not seen: '+miss.join(', ')+'.':'');}const pick=l=>l.filter(id=>!SUBJ.byId[id].opt).sort((x,y)=>SUBJ.byId[y].w-SUBJ.byId[x].w);let ids=pick(r.missing);if(!ids.length)ids=pick(r.cd.concepts);if(!ids.length)ids=r.cd.concepts;return ids.slice(0,2).map(id=>SUBJ.byId[id].hint).join(' ');}
bind.summary=()=>{bindVlp();$$('[data-go]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.go;render();window.scrollTo(0,0);});};

// ---------- Content descriptions ----------
let F={strand:'',status:'',q:'',open:{},lv:''};
function vCds(){
  if(!R)return '';
  const rows=R.rows.filter(r=>(!F.conf||conf(r)===F.conf)&&(!F.lv||String(r.cd.level)===F.lv)&&(!F.strand||r.cd.strand===F.strand)&&(!F.status||r.status===F.status)&&(!F.q||(r.cd.code+' '+r.cd.description).toLowerCase().includes(F.q.toLowerCase())));
  let html='',lastSt='',lastSub='',lastLv='';const multi=S.levels.length>1;
  const sorted=[...rows].sort((a,b)=>SUBJ.strands.indexOf(a.cd.strand)-SUBJ.strands.indexOf(b.cd.strand)||a.cd.substrand.localeCompare(b.cd.substrand)||LEVELS.indexOf(String(a.cd.level))-LEVELS.indexOf(String(b.cd.level))||a.cd.code.localeCompare(b.cd.code));
  sorted.forEach(r=>{const cd=r.cd;
    if(cd.strand!==lastSt){html+=`<tr class="grp"><td colspan="4">${cd.strand}</td></tr>`;lastSt=cd.strand;lastSub='';}
    if(cd.substrand!==lastSub){if(cd.substrand!==cd.strand)html+=`<tr class="sub"><td colspan="4">${esc(cd.substrand)}</td></tr>`;lastSub=cd.substrand;}
    const open=F.open[cd.code];
    const ev=open?`<div>${r.listed?`<div class="ev">Code <b>${cd.code}</b> is listed in: ${[...R.listed[cd.code]].map(i=>esc(S.files[i].name)).join(', ')}</div>`:''}${mapEvHtml(r)}
      ${cd.concepts.map(id=>{const c=SUBJ.byId[id],h=R.H[id];return `<div style="margin-top:8px"><b class="small">${h.segs?'✓':'✗'} ${esc(c.label)}</b> <span class="small muted">${h.segs?h.segs+' place'+(h.segs>1?'s':''):'not found'}</span>${h.segs?evHtml(h.ev,c.e,2):`<div class="lookfor">${esc(c.hint)}</div>`}</div>`;}).join('')}
      ${kwPanel(r)}
      ${r.school&&r.school.n?`<div style="margin-top:8px"><b class="small">✓ Your school’s words</b> <span class="small muted">${r.school.n} place${r.school.n>1?'s':''}</span>${evHtml(r.school.ev,r.school.re,2)}</div>`:''}
      <div style="margin-top:10px" class="small"><b>Our school’s words for this</b> <span class="muted">a program, routine or unit name that means this is taught (e.g. “Spelling Mastery”). The tool will count it from now on.</span>
        <div class="chips">${wordsFor(cd.code).map(t=>`<span class="chip" style="font-weight:400">${esc(t)} <button class="x" style="background:none;border:0;color:var(--crimson);padding:0 0 0 4px" data-wrm="${esc(cd.code+'\u0001'+t)}" title="Remove">✕</button></span>`).join('')}</div>
        <input type="text" data-word="${cd.code}" placeholder="Add a word or phrase, then press Enter" style="max-width:380px"></div>
      <div style="margin-top:8px"><input type="text" data-note="${cd.code}" placeholder="Teacher note (e.g. taught in Term 3 spelling block)" value="${esc(S.notes[cd.code]||'')}"></div></div>`:'';
    html+=`<tr><td><span class="code">${cd.code}</span>${multi?`<div><span class="lvlh">${LVNAME(String(cd.level))}</span></div>`:''}</td>
      <td class="cdtext">${esc(cd.description)}${S.notes[cd.code]&&!open?`<div class="small" style="color:var(--navy)">📝 ${esc(S.notes[cd.code])}</div>`:''}
      <div><button class="btn sm ghost" style="margin-top:6px" data-open="${cd.code}">${open?'Hide evidence':'Show evidence'}</button> <a class="small" href="${SUBJ.levelUrl(cd.level)}" target="_blank" rel="noopener">VCAA ↗</a></div>${ev}</td>
      <td>${tag(r.status)}${false?'':`<div class="small conf" title="${esc(CONFHELP[conf(r)]||'')}">${conf(r)}</div>`}${r.mapFlag?`<div class="small mapflag" title="${r.mapFlag==='notInPlans'?'Ticked on the curriculum area map, but the plans show no evidence of it.':'The plans show evidence of it, but it isn’t ticked on the curriculum area map.'}">${r.mapFlag==='notInPlans'?'⚠ on the map, not in the plans':'⚠ in the plans, not on the map'}</div>`:''}</td>
      <td><select data-ov="${cd.code}" title="Change the status"><option value="">Auto (${STATUS[r.auto]})</option>${['cov','part','none','na'].map(k=>`<option value="${k}" ${S.overrides[cd.code]===k?'selected':''}>${STATUS[k]}</option>`).join('')}</select></td></tr>`;
  });
  const c=counts(R.rows);
  return `<div class="card"><h2>Content descriptions: ${esc(levelLabel())}</h2>
   <p class="small muted">Every content description for ${S.levels.length>1?'the selected levels':'the level'}, with its status and the evidence found. Open <b>Show evidence</b> to see the lines in your document that matched. Use the drop-down to change a status: your decision is kept in the report. <a href="${SUBJ.curricUrl}" target="_blank" rel="noopener">Victorian Curriculum 2.0 ${SUBJ.name} ↗</a></p>
   <div class="filters">${S.levels.length>1?`<select id="fLv"><option value="">All levels</option>${LEVELS.filter(l=>S.levels.includes(l)).map(l=>`<option value="${l}" ${F.lv===l?'selected':''}>${LVNAME(l)}</option>`).join('')}</select>`:''}<select id="fStrand"><option value="">All strands</option>${SUBJ.strands.map(s=>`<option ${F.strand===s?'selected':''}>${s}</option>`).join('')}</select>
    <select id="fConf"><option value="">Any confidence</option>${[...new Set(R.rows.map(conf))].sort().map(k=>`<option ${F.conf===k?'selected':''}>${k}</option>`).join('')}</select>
    <select id="fStatus"><option value="">All statuses</option>${['cov','part','none','na'].map(k=>`<option value="${k}" ${F.status===k?'selected':''}>${STATUS[k]} (${c[k]})</option>`).join('')}</select>
    <input type="text" id="fQ" placeholder="Search codes or words" style="max-width:240px" value="${esc(F.q)}">
    <button class="btn sm ghost" id="openAll">Show all evidence</button><button class="btn sm ghost" id="closeAll">Hide all</button>
    <span class="small muted" style="margin-left:auto">${rows.length} shown</span></div>
   <table><tr><th>Code</th><th>Content description</th><th>Status</th><th>Change</th></tr>${html}</table></div>`;
}
bind.cds=()=>{
  const fl=$('#fLv');if(fl)fl.onchange=e=>{F.lv=e.target.value;render();};
  $('#fConf').onchange=e=>{F.conf=e.target.value;render();};
  $('#fStrand').onchange=e=>{F.strand=e.target.value;render();};$('#fStatus').onchange=e=>{F.status=e.target.value;render();};
  $('#fQ').oninput=e=>{F.q=e.target.value;const p=e.target.selectionStart;render();const q=$('#fQ');q.focus();q.setSelectionRange(p,p);};
  $('#openAll').onclick=()=>{R.rows.forEach(r=>F.open[r.cd.code]=1);render();};$('#closeAll').onclick=()=>{F.open={};render();};
  $$('[data-open]').forEach(b=>b.onclick=()=>{const k=b.dataset.open;F.open[k]=!F.open[k];render();});
  $$('[data-ov]').forEach(s=>s.onchange=()=>{const k=s.dataset.ov;if(s.value)S.overrides[k]=s.value;else delete S.overrides[k];analyse();save();render();});
  $$('[data-word]').forEach(i=>i.onchange=()=>{if(addWord(i.dataset.word,i.value)){analyse();save();render();}else toast('Type at least 3 letters.');});
  $$('[data-wrm]').forEach(b=>b.onclick=()=>{const [code,t]=b.dataset.wrm.split('\u0001');delWord(SUBJ.key,code,t);analyse();save();render();});
  $$('[data-note]').forEach(i=>i.onchange=()=>{const k=i.dataset.note;if(i.value.trim())S.notes[k]=i.value.trim();else delete S.notes[k];save();});
};

// ---------- Texts, themes, skills ----------
let TX={open:null};
function vTexts(){
  if(!R)return '';
  const core=SUBJ.core[band()];
  const sec=(k)=>{const t=SUBJ.taxa[k];return `<div class="card"><h2>${t.title}</h2><p class="small muted">${t.note} Click an item to see where it appears.</p>${R.tax[k].map(([g,items])=>`${g?`<h3>${g}</h3>`:''}<div class="taxgrid">${items.map((it,ii)=>{const id=k+'|'+g+'|'+ii;const isCore=k===SUBJ.glance.key&&core.includes(it.label);
      return `<div class="tx ${it.h.segs?'found':'missing'} ${isCore?'core':''} ${TX.open===id&&it.h.segs?'open':''}" data-tx="${esc(id)}"><div class="t">${it.h.segs?'✓':'–'} ${esc(it.label)}${isCore?' <span class="tag s-na">core</span>':''}</div><div class="m">${it.h.segs?it.h.segs+' mention'+(it.h.segs>1?'s':'')+' · '+[...it.h.files].map(i=>esc(S.files[i].name)).join(', '):'Not found'}</div>${TX.open===id&&it.h.segs?evHtml(it.h.ev,it.re,3):''}</div>`;}).join('')}</div>`).join('')}</div>`;};
  return `<div class="note">${SUBJ.taxNote}</div>${SUBJ.taxOrder.map(sec).join('')}`;
}
bind.texts=()=>{$$('[data-tx]').forEach(d=>d.onclick=()=>{TX.open=TX.open===d.dataset.tx?null:d.dataset.tx;const y=window.scrollY;render();window.scrollTo(0,y);});};

// ---------- Report ----------
function vReport(){
  if(!R)return '';
  return `<div class="card"><h2>Make the report</h2><p class="small muted">The report lists every content description with its status (including your changes and notes), the gaps to plan for, and the text types, genres, themes and skills found.</p>
   <div class="row"><div><label class="small muted">School</label><input type="text" id="rSchool" value="${esc(schoolName())}" placeholder="School name"></div><div><label class="small muted">Prepared by</label><input type="text" id="rAuthor" value="${esc(S.author)}" placeholder="Name / team"></div></div>
   <div style="margin-top:12px"><label><input type="checkbox" id="rEv" ${S.repEv!==false?'checked':''}> Include an evidence line for each content description</label></div>
   <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn red" id="docx">Download Word report (.docx)</button><button class="btn" id="print">Print or save as PDF</button><button class="btn ghost" id="saveJson">Save this audit to open later</button></div>
   <h3>For planning</h3><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="gapX">Gap action plan (Excel)</button><button class="btn" id="teamD">Team summaries (Word, one page per level)</button></div>
   ${vlpOn()?`<h3>VLP lessons for the gaps</h3><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="vlpD">VLP lessons for the gaps (Word)</button><button class="btn" id="vlpP">Print VLP lessons for the gaps</button></div>
   <p class="small muted" style="margin-top:8px">Each gap with every VLP maths lesson that teaches it: sequence, lesson, title and learning intention, from <i>${esc(VLP_REF.src)}</i>. Supplementary lessons from the VLP Maths Repository are marked.</p>`:''}
   <p class="small muted" style="margin-top:8px">The <b>gap action plan</b> lists every gap with columns for an owner, a term, how it will be addressed and progress. <b>Team summaries</b> give each level one page: its coverage, its first gaps and what to look for, ready for a PLC.</p>
   <p class="small muted" style="margin-top:12px">Save the audit to keep your status changes and notes. Open it again from the Set up tab, or send it to a colleague.</p></div>`;
}
bind.report=()=>{
  $('#rSchool').oninput=e=>{S.school=e.target.value;save();};$('#rAuthor').oninput=e=>{S.author=e.target.value;save();};
  $('#rEv').onchange=e=>{S.repEv=e.target.checked;save();};
  $('#print').onclick=()=>{$('#printArea').innerHTML=reportHtml();window.print();};
  $('#docx').onclick=async()=>{const b=$('#docx');b.disabled=true;b.textContent='Building…';try{const blob=await buildDocx();await deliver(blob,fileBase()+'.docx');}catch(e){console.error(e);toast('Couldn’t build the Word file.');}b.disabled=false;b.textContent='Download Word report (.docx)';};
  $('#gapX').onclick=async()=>{try{await deliver(await buildGapXlsx(),fileBase()+'_gap-action-plan.xlsx');}catch(e){console.error(e);toast('Couldn’t build the Excel file.');}};
  if($('#vlpD'))$('#vlpD').onclick=async()=>{try{await deliver(await buildVlpDocx(),fileBase()+'_VLP-lessons-for-gaps.docx');}catch(e){console.error(e);toast('Couldn’t build the Word file.');}};
  if($('#vlpP'))$('#vlpP').onclick=vlpPrint;
  $('#teamD').onclick=async()=>{try{await deliver(await buildTeamDocx(),fileBase()+'_team-summaries.docx');}catch(e){console.error(e);toast('Couldn’t build the Word file.');}};
  $('#saveJson').onclick=()=>{const st={...S,files:stripFiles(S.files),subject:SUBJ.key};deliver(new Blob([JSON.stringify({vlpAudit:1,saved:new Date().toISOString(),state:st})],{type:'application/json'}),fileBase()+'.audit.json');};
};
function fileBase(){return ('VC-Curriculum-Audit_'+SUBJ.name+'_'+levelLabel()+'_'+(S.name||auditTitle())).replace(/[–—]/g,'-').replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-').slice(0,90);}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
function kwPanel(r){const cd=r.cd;const k=(r.kw||[]).filter(h=>h.n).sort((a,b)=>b.v-a.v||b.n-a.n);const miss=(cd.kw||[]).filter(t=>!k.some(h=>h.t===t.t));
  const ev=k.slice(0,3).map(h=>{const [fi,si]=h.where[0];return {f:fi,i:si,w:meta(S.files[fi]).wt[si]};});
  return `<div style="margin-top:8px"><b class="small">${k.some(h=>h.v)?'✓':'✗'} Key words from the VCAA wording and elaborations</b> <span class="small muted">${SUBJ.kwOnly?'the evidence for this learning area':r.kwLed?'these gave the strongest evidence':'supporting evidence'}</span>
    <div class="chips">${k.map(h=>`<span class="tag ${h.v?'s-cov':'s-part'}" title="${h.n} place${h.n>1?'s':''}">${esc(surf(h.t))} · ${h.n}</span>`).join('')}${miss.map(t=>`<span class="tag s-none">${esc(surf(t.t))}</span>`).join('')}</div>
    ${ev.length?evHtml(ev,kwReAny(k.slice(0,8).map(h=>h.t)),2):''}
    ${(cd.el||[]).length?`<details style="margin-top:6px"><summary class="small">VCAA elaborations (${cd.el.length})</summary><ul class="small">${cd.el.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></details>`:''}</div>`;}
function evLine(r){
  if(r.listed)return 'Code listed in the sequence.';
  if(r.mapped)return 'Ticked on the curriculum area map: '+[...new Set(r.mapped.map(m=>m.unit))].join('; ')+'.';
  if(SUBJ.kwOnly||r.kwLed||!r.found.length){const h=(r.kw||[]).filter(x=>x.v).sort((a,b)=>b.n-a.n)[0];if(!h)return '';const [fi,si]=h.where[0];const seg=S.files[fi].segs[si];const m=kwRe(h.t).exec(seg);if(!m)return '';
    const s0=Math.max(0,m.index-60),e0=Math.min(seg.length,m.index+m[0].length+70);return (s0?'…':'')+seg.slice(s0,e0)+(e0<seg.length?'…':'');}
  const id=r.found.sort((a,b)=>R.H[b].segs-R.H[a].segs)[0];if(!id)return '';
  const h=R.H[id],seg=S.files[h.ev[0].f].segs[h.ev[0].i];const m=gre(SUBJ.byId[id].e).exec(seg);if(!m)return '';
  const s=Math.max(0,m.index-60),e=Math.min(seg.length,m.index+m[0].length+70);return (s?'…':'')+seg.slice(s,e)+(e<seg.length?'…':'');
}
function taxRows(list,missCore){const out=[];SUBJ.taxOrder.forEach((k,i)=>{out.push([SUBJ.taxa[k].title,list(k)]);if(i===0)out.push([SUBJ.glance.miss,missCore.join(', ')||'None']);});return out;}
function reportHtml(){
  const c=counts(R.rows),n=R.rows.length;const date=new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  const rowsH=SUBJ.strands.map(st=>{const rs=R.rows.filter(r=>r.cd.strand===st);let last='';return `<tr><td colspan="4" style="background:#E8F7F8;font-weight:700;color:#1F1646">${st}</td></tr>`+rs.map(r=>{const sub=r.cd.substrand!==last?`<tr><td colspan="4" style="font-weight:600;color:#1F1646">${esc(r.cd.substrand)}</td></tr>`:'';last=r.cd.substrand;
    return (r.cd.substrand!==r.cd.strand?sub:'')+`<tr class="tr"><td><b>${r.cd.code}</b></td><td>${esc(r.cd.description)}${S.repEv!==false&&r.status!=='none'?`<div style="color:#5d5a70;font-size:10.5px">${esc(evLine(r))}</div>`:''}</td><td>${tag(r.status)}${r.overridden?'<div style="font-size:10px">teacher-set</div>':''}</td><td>${esc(S.notes[r.cd.code]||'')}</td></tr>`;}).join('');}).join('');
  const gaps=R.rows.filter(r=>r.status==='none'||r.status==='part');
  const G=SUBJ.glance;const tt=R.tax[G.key].flatMap(([,it])=>it);const missCore=SUBJ.core[band()].filter(l=>{const x=tt.find(t=>t.label===l);return !x||!x.h.segs;});
  const list=k=>R.tax[k].flatMap(([,it])=>it).filter(i=>i.h.segs).map(i=>esc(i.label)).join(', ')||'None detected';
  const lg=(brand()||{}).logo;
  return `<div class="pr">${lg?`<img src="${lg}" alt="" style="max-height:44px;float:right">`:''}<h1>Curriculum audit: ${esc(auditTitle())}</h1>
   <div>${esc(schoolName())}${schoolName()?' · ':''}Victorian Curriculum 2.0 ${SUBJ.full} · ${esc(levelLabel())} · ${date}${S.author?' · Prepared by '+esc(S.author):''}</div>
   <div style="margin-top:4px;color:#5d5a70">Files: ${S.files.map(f=>esc(f.name)).join('; ')}</div>
   <h2>Summary</h2><p><b>${c.cov}</b> of ${n} content descriptions covered, <b>${c.part}</b> partly covered, <b>${c.none}</b> not evident${c.na?', '+c.na+' not planned for this sequence':''}.</p>
   <table><tr><th>Strand</th><th>Covered</th><th>Partly</th><th>Not evident</th></tr>${SUBJ.strands.map(st=>{const cc=counts(R.rows.filter(r=>r.cd.strand===st));return `<tr><td>${st}</td><td>${cc.cov}</td><td>${cc.part}</td><td>${cc.none}</td></tr>`;}).join('')}</table>
   ${S.levels.length>1?`<h2>Coverage by level</h2><table><tr><th>Level</th><th>Covered</th><th>Partly</th><th>Not evident</th>${SUBJ.strands.map(st=>`<th>${st} covered</th>`).join('')}</tr>${byLevelRows().map(x=>`<tr><td>${LVNAME(x.l)}</td><td>${x.c.cov}/${x.rs.length}</td><td>${x.c.part}</td><td>${x.c.none}</td>${x.st.map(y=>`<td>${y.n?y.cov+'/'+y.n:'–'}</td>`).join('')}</tr>`).join('')}</table>`:''}
   ${S.files.some(f=>f.map)?`<h2>Curriculum area map check</h2><p>${R.rows.filter(r=>r.mapped).length} of ${R.rows.length} content descriptions ticked on the map. Only ticks count.</p>${R.rows.filter(r=>r.mapFlag).length?`<table><tr><th>Code</th><th>Content description</th><th>Check</th></tr>${R.rows.filter(r=>r.mapFlag).map(r=>`<tr class="tr"><td><b>${r.cd.code}</b></td><td>${esc(r.cd.description)}</td><td>${r.mapFlag==='notInPlans'?'On the map, not in the plans':'In the plans, not on the map'}</td></tr>`).join('')}</table>`:''}`:''}
   <h2>Gaps to plan for</h2>${gaps.length?`<table><tr><th>Code</th><th>Content description</th><th>Status</th></tr>${gaps.map(r=>`<tr class="tr"><td><b>${r.cd.code}</b></td><td>${esc(r.cd.description)}<div style="color:#5d5a70;font-size:10.5px">Look for: ${esc(lookFor(r))}</div>${vlpLine(r.cd)?`<div style="color:#1F1646;font-size:10.5px">${esc(vlpLine(r.cd))}</div>`:''}</td><td>${tag(r.status)}</td></tr>`).join('')}</table>`:'<p>None.</p>'}
   <h2>${esc(SUBJ.taxTab.replace('&','and'))}</h2><table>${taxRows(list,missCore).map(([x,y])=>`<tr><td style="width:200px"><b>${esc(x)}</b></td><td>${esc(y)}</td></tr>`).join('')}</table>
   ${insightLines().length?`<h2>Insights</h2>${insightLines().map(([h,l])=>`<p><b>${esc(h)}</b></p><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`).join('')}`:''}
   <h2>All content descriptions</h2><table><tr><th>Code</th><th>Content description</th><th>Status</th><th>Notes</th></tr>${rowsH}</table>
   <p style="font-size:10px;color:#5d5a70;margin-top:14px">Content descriptions © VCAA, Victorian Curriculum F–10 Version 2.0, licensed CC BY-NC. The audit matches words in the sequence. Statuses marked teacher-set were changed by the school.</p></div>`;
}

// ---------- Word report (docx built in the browser) ----------
function xe(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const COL={cov:'DFF3EF',part:'FFF1D6',none:'FDE4EA',na:'ECEBF2'},TXT={cov:'0F7B6C',part:'8A5200',none:'B0002A',na:'6B6880'};
function run(t,o={}){return `<w:r><w:rPr>${o.b?'<w:b/>':''}${o.i?'<w:i/>':''}${o.c?`<w:color w:val="${o.c}"/>`:''}<w:sz w:val="${o.sz||20}"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;}
function para(runs,o={}){return `<w:p><w:pPr>${o.style?`<w:pStyle w:val="${o.style}"/>`:''}<w:spacing w:before="${o.before||0}" w:after="${o.after==null?60:o.after}"/>${o.keep?'<w:keepNext/>':''}</w:pPr>${runs}</w:p>`;}
function cell(content,o={}){const w=o.w||2000;return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span?`<w:gridSpan w:val="${o.span}"/>`:''}${o.fill?`<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>`:''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/></w:tcMar></w:tcPr>${content||para('')}</w:tc>`;}
function table(widths,rows,head){const grid=widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(b=>`<w:${b} w:val="single" w:sz="4" w:space="0" w:color="C9C7D6"/>`).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${head?`<w:tr><w:trPr><w:tblHeader/></w:trPr>${head.map((h,i)=>cell(para(run(h,{b:1,c:'FFFFFF',sz:18})),{w:widths[i],fill:bcol('main')})).join('')}</w:tr>`:''}${rows.join('')}</w:tbl>`;}
function tr(cells){return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join('')}</w:tr>`;}
async function buildDocx(){
  const c=counts(R.rows),n=R.rows.length;const date=new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  const W=[1500,9000,1900,2900];let body='';
  const NV=bcol('main'),CR=bcol('accent');
  body+=para(run('Curriculum audit',{b:1,sz:20,c:CR}),{after:0});
  body+=para(run(auditTitle(),{b:1,sz:36,c:NV}),{after:40});
  body+=para(run([schoolName(),'Victorian Curriculum 2.0 '+SUBJ.full,levelLabel(),date,S.author?'Prepared by '+S.author:''].filter(Boolean).join('  ·  '),{sz:20,c:'5D5A70'}));
  body+=para(run('Files audited: '+S.files.map(f=>f.name).join('; '),{sz:18,c:'5D5A70'}),{after:160});
  const h2=t=>para(run(t,{b:1,sz:26,c:NV}),{before:200,after:80,keep:1});
  body+=h2('Summary');
  body+=para(run(`${c.cov} of ${n} content descriptions covered, ${c.part} partly covered, ${c.none} not evident${c.na?', '+c.na+' not planned for this sequence':''}.`,{sz:22}));
  const sw=[4000,2000,2000,2000];
  body+=table(sw,SUBJ.strands.map(st=>{const cc=counts(R.rows.filter(r=>r.cd.strand===st));const tot=cc.cov+cc.part+cc.none+cc.na;
    return tr([cell(para(run(st,{b:1})),{w:sw[0]}),cell(para(run(cc.cov+' / '+tot,{c:TXT.cov,b:1})),{w:sw[1],fill:COL.cov}),cell(para(run(String(cc.part),{c:TXT.part,b:1})),{w:sw[2],fill:COL.part}),cell(para(run(String(cc.none),{c:TXT.none,b:1})),{w:sw[3],fill:COL.none})]);}),['Strand','Covered','Partly','Not evident']);
  if(S.levels.length>1){body+=h2('Coverage by level');const ns=SUBJ.strands.length;const lw=[2200,1700,1300,1500].concat(SUBJ.strands.map(()=>Math.floor(8000/ns)));
    body+=table(lw,byLevelRows().map(x=>tr([cell(para(run(LVNAME(x.l),{b:1,sz:18})),{w:lw[0]}),cell(para(run(x.c.cov+' / '+x.rs.length,{b:1,sz:18,c:TXT.cov})),{w:lw[1],fill:COL.cov}),cell(para(run(String(x.c.part),{sz:18,c:TXT.part})),{w:lw[2],fill:COL.part}),cell(para(run(String(x.c.none),{sz:18,c:TXT.none})),{w:lw[3],fill:COL.none})].concat(x.st.map((y,i)=>cell(para(run(y.n?y.cov+'/'+y.n:'–',{sz:18})),{w:lw[4+i]}))))),['Level','Covered','Partly','Not evident'].concat(SUBJ.strands));}
  // curriculum area map check
  if(S.files.some(f=>f.map)){const mp=S.files.filter(f=>f.map);body+=h2('Curriculum area map check');
    const notIn=R.rows.filter(r=>r.mapFlag==='notInPlans'),notOn=R.rows.filter(r=>r.mapFlag==='notOnMap'),plans=S.files.length>mp.length;
    body+=para(run(mp.map(f=>f.name).join(', ')+': '+R.rows.filter(r=>r.mapped).length+' of '+R.rows.length+' content descriptions ticked for a teaching and learning unit. Only ticks count; the content descriptions listed across the top of the map are not coverage.'+(plans?'':' Only the map was uploaded, so coverage is what the map says.'),{sz:18}));
    if(plans){const mw=[1500,10500,2300];const lst=(rs,lab)=>rs.map(r=>tr([cell(para(run(r.cd.code,{b:1,sz:18})),{w:mw[0]}),cell(para(run(r.cd.description,{sz:18})),{w:mw[1]}),cell(para(run(lab,{b:1,sz:16,c:'8A5200'})),{w:mw[2],fill:COL.part})]));
      const rows=lst(notIn,'On the map, not in the plans').concat(lst(notOn,'In the plans, not on the map'));
      body+=rows.length?table(mw,rows,['Code','Content description','Check']):para(run('Every tick has evidence in the plans, and everything evident in the plans is ticked.',{sz:18}));}}
  // gaps
  body+=h2(S.scope==='year'?'Gaps to plan for':'Not in this sequence (plan elsewhere in the year)');
  const gaps=R.rows.filter(r=>r.status==='none'||r.status==='part');
  body+=gaps.length?table([1500,10500,2300],gaps.map(r=>tr([cell(para(run(r.cd.code,{b:1,sz:18})),{w:1500}),cell(para(run(r.cd.description,{sz:18}))+para(run('Look for: '+lookFor(r),{i:1,sz:16,c:'5D5A70'}))+(vlpLine(r.cd)?para(run(vlpLine(r.cd),{sz:16,c:'1F1646'})):''),{w:10500}),cell(para(run(STATUS[r.status],{b:1,sz:18,c:TXT[r.status]})),{w:2300,fill:COL[r.status]})])),['Code','Content description','Status']):para(run('None.'));
  // texts
  body+=h2(SUBJ.taxTab.replace('&','and'));
  const G=SUBJ.glance;const tt=R.tax[G.key].flatMap(([,it])=>it);const missCore=SUBJ.core[band()].filter(l=>{const x=tt.find(t=>t.label===l);return !x||!x.h.segs;});
  const list=k=>R.tax[k].flatMap(([,it])=>it).filter(i=>i.h.segs).map(i=>i.label).join(', ')||'None detected';
  const tw=[3300,11000];
  body+=table(tw,taxRows(list,missCore).map(([a,b])=>tr([cell(para(run(a,{b:1,sz:18})),{w:tw[0],fill:'E8F7F8'}),cell(para(run(b,{sz:18})),{w:tw[1]})])));
  const IL=insightLines();if(IL.length){body+=h2('Insights');IL.forEach(([h,l])=>{body+=para(run(h,{b:1,sz:20,c:CR}),{before:100,after:40,keep:1});l.forEach(x=>{body+=para(run('•  '+x,{sz:18}),{after:30});});});}
  // all cds
  body+=h2('All content descriptions');
  const rows=[];
  SUBJ.strands.forEach(st=>{const rs=R.rows.filter(r=>r.cd.strand===st);if(!rs.length)return;const flat=rs.every(r=>r.cd.substrand===st);
    rows.push(tr([cell(para(run(st,{b:1,c:'1F1646'})),{w:W.reduce((a,b)=>a+b),span:4,fill:'B8E9EB'})]));let last='';
    rs.forEach(r=>{if(r.cd.substrand!==last&&!flat){rows.push(tr([cell(para(run(r.cd.substrand,{b:1,sz:18,c:'1F1646'})),{w:W.reduce((a,b)=>a+b),span:4,fill:'F3F3F9'})]));last=r.cd.substrand;}
      const ev=S.repEv!==false&&r.status!=='none'?evLine(r):'';
      rows.push(tr([cell(para(run(r.cd.code,{b:1,sz:18})),{w:W[0]}),cell(para(run(r.cd.description,{sz:18}))+(ev?para(run(ev,{i:1,sz:15,c:'5D5A70'})):''),{w:W[1]}),cell(para(run(STATUS[r.status],{b:1,sz:18,c:TXT[r.status]}))+(r.overridden?para(run('teacher-set',{sz:14,c:'5D5A70'})):''),{w:W[2],fill:COL[r.status]}),cell(para(run(S.notes[r.cd.code]||'',{sz:18})),{w:W[3]})]));});});
  body+=table(W,rows,['Code','Content description','Status','Notes']);
  body+=para(run('Content descriptions © VCAA, Victorian Curriculum F–10 Version 2.0, licensed CC BY-NC. The audit matches words in the sequence; statuses marked teacher-set were changed by the school.',{sz:15,c:'5D5A70',i:1}),{before:200});
  return packDocx(body,true);
}
// Wrap a document body as a .docx, with the school's logo at the top if there is one
async function packDocx(body,landscape){
  const b=brand()||{};let logo='',extraRel='',extraCt='';const zip=new JSZip();
  if(b.logo&&/^data:image\/png;base64,/.test(b.logo)){const cy=420000,cx=Math.round(cy*((b.lw||96)/(b.lh||96)));
    zip.file('word/media/logo.png',b.logo.split(',')[1],{base64:true});extraRel='<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>';extraCt='<Default Extension="png" ContentType="image/png"/>';
    logo=`<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Logo" descr="School logo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;}
  const pg=landscape?'<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>':'<w:pgSz w:w="11906" w:h="16838"/>';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${logo}${body}<w:sectPr>${pg}<w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+extraCt+'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+extraRel+'</Relationships>');
  zip.file('word/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>');
  zip.file('word/document.xml',doc);
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

// ---------- Help ----------
function vHelp(){return `<div class="card help"><h2>How to use the Curriculum Audit</h2>
 <h3>1. Set up</h3><ol><li>Name the sequence, then choose whether the upload is <b>one unit or term</b> or <b>a whole year</b>. A unit is expected to have gaps; a year plan should cover everything.</li>
 <li>Choose the subject (top right: English, Mathematics, or another learning area from the list), then the curriculum level. Science, HASS, Technologies, HPE and The Arts are set out in bands (e.g. Levels 3 and 4); a file for Level 3 counts for the Levels 3 and 4 band. Pick several for a composite class or a group of levels, or use <b>Quick select</b> for a whole school (Foundation–Level 6, Levels 7–10, or every level). A whole-school audit shows coverage by level and groups the gaps by level. If your file lists VC2 codes, the level is chosen for you.</li>
 <li>Drag in your Word, PDF, PowerPoint or Excel files, or a whole folder of them (lesson planners, unit overviews, term plans, yearly overview spreadsheets). In Excel, every worksheet is read, one row at a time; a sheet named for a level (e.g. “Level 4”) helps the tool place the file. Add several to audit a term or a year together.</li></ol>
 <h3>How each kind of document is read</h3><ul><li><b>Plans</b> (yearly overviews, scope and sequences, curriculum area plans, unit and lesson plans): a VC2 code written where a unit is taught counts, and so do the words of the plan.</li><li><b>Curriculum area maps</b> (codes once across the top, units down the side): only the ticks or AS numbers in the grid count, never the codes listed across the top.</li><li><b>Coverage checklists</b> (every code listed once with a count or tick beside it, e.g. a COUNTIF tab): a code counts only when its count is above zero or it is ticked.</li><li>In Excel, each tab is judged on its own, so one workbook can hold a plan, a map and a checklist.</li></ul>
 <h3>Excel workbooks with several tabs</h3><ul><li>Each tab is listed under the file with a button for each. Tabs that look like drafts, old copies, instructions or a later year (for example “2027 Draft”) are left out to start with; click a tab to include or leave it out.</li></ul>
 <h3>VLP lessons for gaps (Mathematics)</h3><ul><li>Under each gap the audit lists the VLP sequences and lesson numbers that teach that content description, from the VLP Maths reference of units, lessons and content descriptions (VLP Maths Tools 19.7, Foundation to Level 10A). Supplementary lessons from the VLP Maths Repository are marked.</li><li><b>Print VLP lessons for the gaps</b> (on the Summary and the Report tab) gives each gap with every lesson's title and learning intention; the Report tab also has it as a Word document.</li></ul>
 <h3>From the Map Creator</h3><ul><li>In the Curriculum Area Map Creator, <b>Audit this map</b> opens this audit with the new map and the plans it was made from already added, so the curriculum area map check runs straight away.</li></ul>
 <h3>Curriculum area maps</h3><ul><li>Upload a VCAA <b>curriculum area map</b> (the Word file) as it is. The tool reads which content descriptions each teaching and learning unit is ticked against, and the AS numbers beside them. Ticks can be Word check boxes, the ü tick in VCAA’s examples, or a typed x or Y; an AS number on its own also counts.</li><li>A school’s map kept in <b>Excel</b> (codes across the top, units down the side, a tab per level) works too. There, only a cell with an AS number counts (5, 15,16, 7-8 or 14b). A cell with “?” or anything else without a number isn’t counted; it is listed for checking.</li><li><b>Only ticks count.</b> The unit names, the content descriptions and codes listed across the top of the map, and the achievement standard sentences, are never counted as coverage. A blank template audits as nothing covered.</li><li>Upload the unit plans with the map and the <b>Curriculum area map check</b> lists content descriptions ticked on the map but not evident in the plans, and content evident in the plans but not ticked. The map’s achievement standard Y/N boxes appear beside each statement on Insights.</li><li>A map saved as a PDF can’t be read reliably (its ticks are lost), so it is left out with a message. Use the Word version.</li></ul>
 <h3>2. Read the summary</h3><ul><li>The tiles show how many content descriptions are covered, partly covered or not evident.</li><li>The strand table shows where coverage is thin.</li><li>The gap list groups missing content descriptions by sub-strand, with what to look for in a sequence that covers them.</li><li>With several files, <b>Which file covers what</b> shows each file’s contribution.</li></ul>
 <h3>3. Check and adjust</h3><ul><li>On <b>Content descriptions</b>, open <b>Show evidence</b> to see the lines in your document that matched.</li><li>Change any status with the drop-down: for example, ${SUBJ.key==='maths'?'number fact fluency taught in a separate daily block':'spelling taught in a separate block'} that isn’t in this document. Add a note to explain.</li><li><b>Not planned for this sequence</b> marks content you deliberately teach elsewhere, so it isn’t counted as a gap.</li>
 <li><b>Confidence</b> sits under each status in plain words: <i>strong evidence</i> (named in a learning intention, success criteria or assessment), <i>good evidence</i>, <i>passing mention only</i> (found only in vocabulary or materials lists), and so on. Filter by confidence to check the weakest first.</li>
 <li><b>Our school’s words:</b> under Show evidence, add the name your school uses for a program, routine or unit (e.g. “Spelling Mastery”). The tool counts it as evidence for that content description from then on. Manage the list in Settings.</li></ul>
 <h3>4. Insights</h3><ul><li><b>Progression across levels</b> (two or more levels): each idea the curriculum builds over several levels, and any level where it is expected but not evident.</li>
 <li><b>Achievement standards:</b> each statement (from VCAA’s achievement standard extracts) with the content descriptions VCAA links to it, taking its status from them. Every learning area and level.</li>
 <li><b>When in the year:</b> the term each content description appears in, strands not revisited, and content left to Term 4. Needs “Term 1” to “Term 4” in headings, a column, sheet names or file names.</li>
 <li><b>Emphasis and thin coverage:</b> each strand’s share of your plans beside its share of the curriculum, and content that counts as covered on only one or two mentions.</li>
 <li><b>Repeated across levels:</b> texts or unit titles that appear at more than one level.</li>
 <li><b>Compare with a saved audit:</b> what has improved or gone backwards since an earlier audit.</li>
 <li style="list-style:none;margin-left:-20px"></li></ul>
 <h3>5. Report</h3><ul><li>Download a Word report (A4 landscape) or print it or save it as a PDF.</li><li><b>Save this audit</b> keeps your changes in a small file you can open later or share.</li><li><b>Gap action plan (Excel)</b> lists every gap with columns for an owner, a term, how it will be addressed and progress.</li><li><b>Team summaries</b> give each level one page for its PLC.</li><li><b>Settings</b> (top right): school name, logo and colours; saving reports straight into your SharePoint folder (Edge or Chrome); your school’s words; and <b>Save a copy for your school</b>, which builds your branding and words into a copy of the file for staff.</li></ul>
 <h3>How the audit decides</h3><ul>
 <li><b>Codes:</b> if a VC2 code (e.g. VC2E5LA05) is written in your file, that content description counts as covered.</li>
 <li><b>Evidence:</b> each content description is linked to a few things a sequence covering it would mention. ${SUBJ.key==='maths'?'For VC2M4M04 (angles), that includes angles, acute, obtuse and reflex, and protractors.':'For VC2E5LA05, that includes complex sentences, dependent clauses and subordinating conjunctions.'} The tool looks for those words. A mention in a learning intention, success criteria or assessment counts double; a mention in a vocabulary list counts half and in a materials list a quarter.</li>
 <li><b>Key words from the VCAA wording and elaborations:</b> each content description also has up to 12 distinctive words and phrases taken from its own wording and its VCAA elaborations. Words common across the whole subject count for little. For English and Mathematics these back up the main evidence; for the other learning areas they are the evidence. One shared word is never enough: covered needs three distinct key words, partly covered needs two.</li>
 <li><b>Covered</b> = most of the expected evidence is there. <b>Partly</b> = some is. <b>Not evident</b> = little or none.</li>
 <li>It reads words, not intent. A detailed lesson planner audits more accurately than a list of titles. Always check the evidence before acting on a gap.</li>
 <li>No AI is used, and nothing leaves your computer. Your work is kept in this browser until you start a new audit.</li></ul>
 <h3>Victorian Curriculum 2.0</h3><p>Content descriptions, elaborations and achievement standards are from the VCAA Victorian Curriculum F–10 Version 2.0 data export (20 October 2026), © VCAA, licensed CC BY-NC. <a href="${SUBJ.curricUrl}" target="_blank" rel="noopener">Open the curriculum ↗</a> · <a href="${SUBJ.scopeUrl}" target="_blank" rel="noopener">Scope and sequence charts ↗</a></p>
 <p class="small muted">VC Curriculum Audit 1.5 · every Victorian Curriculum 2.0 learning area except Languages, single levels to whole school; Word, PDF, PowerPoint and Excel. Switch subject with the buttons and the learning area list at the top right.</p></div>`;}

/*MAP*/
/*KW*/
/*PLUS*/
/*VLP*/
// ---------- subject switch ----------
function renderSubj(){
  const others=Object.values(SUBJECTS).filter(x=>x.key!=='english'&&x.key!=='maths');const areas=[...new Set(others.map(x=>x.area))];
  $('#subj').innerHTML=['english','maths'].map(k=>SUBJECTS[k]).map(x=>`<button data-subj="${x.key}" class="${SUBJ.key===x.key?'on':''}">${x.name}</button>`).join('')+
    `<select id="subjMore" class="${others.some(x=>x.key===SUBJ.key)?'on':''}" title="Other learning areas"><option value="">${others.some(x=>x.key===SUBJ.key)?'':'More learning areas…'}</option>${areas.map(a=>`<optgroup label="${esc(a)}">${others.filter(x=>x.area===a).map(x=>`<option value="${x.key}" ${SUBJ.key===x.key?'selected':''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const go=k=>{if(!k||k===SUBJ.key)return;
    S.subject=k;setSubject(k);S.levels=[];S.overrides={};S.notes={};S.fileLv={};F={strand:'',status:'',q:'',open:{},lv:''};TX.open=null;CMP=null;
    analyse();if(!R&&!['setup','help'].includes(S.tab))S.tab='setup';save();renderSubj();render();
    toast('Switched to '+SUBJ.name+'. Choose a level'+(S.files.length?' (your files are kept)':'')+'.');};
  $$('[data-subj]').forEach(b=>b.onclick=()=>go(b.dataset.subj));$('#subjMore').onchange=e=>go(e.target.value);
}
// ---------- boot ----------
function boot(){
  load();setSubject(S.subject);S.levels=(S.levels||[]).filter(l=>LEVELS.includes(l));applyBrand();$('#setBtn').onclick=openSettings;
  renderSubj();
  analyse(); if(!R&&!['setup','help'].includes(S.tab))S.tab='setup';
  render();
  if(location.hash==='#from-map-creator')fromMapCreator();
}
// The Map Creator's "Audit this map": a fresh audit of the map and the plans it was built from
async function fromMapCreator(){
  history.replaceState(null,'',location.pathname);
  let h=null;try{const db=await new Promise((res,rej)=>{const r=indexedDB.open('vc-handoff',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
    h=await new Promise((res,rej)=>{const tx=db.transaction('h','readwrite');const st=tx.objectStore('h');const g=st.get('pending');g.onsuccess=()=>{st.delete('pending');res(g.result);};g.onerror=()=>rej(g.error);});}catch(e){console.error(e);}
  if(!h||Date.now()-h.at>30*60*1000){toast('Nothing to audit from the Map Creator. Build the map again, then click Audit this map.');return;}
  S={...S,subject:h.subject,name:'Curriculum area map check',files:[],overrides:{},notes:{},fileLv:{},levels:[],scope:'year',tab:'setup'};setSubject(S.subject);renderSubj();
  S.levels=LEVELS.filter(l=>(h.levels||[]).includes(l));
  await addFiles(h.files.map(f=>new File([f.buf],f.name)));
  if(!S.levels.length){S.tab='setup';render();toast('Choose the levels to audit, then run the audit.');return;}
  analyse();S.tab='summary';save();render();window.scrollTo(0,0);
  toast('Map and '+(h.files.length-1)+' plan'+(h.files.length===2?'':'s')+' added from the Map Creator.');
}
window.VCAudit={readXlsx,vlpFor:cd=>vlpFor(cd),vlpHtml:()=>vlpHtml(),buildVlpDocx:()=>buildVlpDocx(),insights:()=>insights(),conf:r=>conf(r),buildGapXlsx:()=>buildGapXlsx(),buildTeamDocx:()=>buildTeamDocx(),SP,kv,CFG,analyse:()=>{analyse();return R;},get S(){return S;},set S(v){S=v;},readFile,render,buildDocx,reportHtml};
document.addEventListener('DOMContentLoaded',boot);
})();
