// ===================== VCAA curriculum area maps (Word) =====================
// A map lists every content description of a level in its column headers (with the code), and each teaching and learning
// unit in the first column. A content description counts only where a unit's box is ticked (or an AS number is entered)
// under it. The header listing is never coverage. Achievement standard tables with numbered sentences and a Y/N box are read too.
const MAP_W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',MAP_W14='http://schemas.microsoft.com/office/word/2010/wordml';
// Tick glyphs: ☒ ☑ ✓ ✔ ✗ ✘ ■ ●, Wingdings ü (F0FC) þ (F0FE) û ý ø, typed x / y / yes / tick
const TICK_CH=/[☒☑✓✔✗✘■●▪]/,WING_TICK=new Set(['F0FC','F0FE','F0FB','F0FD','F078','F0F8','F06E','F0A2','00FC','00FE','00FB','00FD','2713','2714']);
function camCellInfo(tc){
  // text (as a person reads it), plus whether the cell holds a tick
  let t='',tick=false,box=false;
  tc.querySelectorAll('*').forEach(n=>{
    if(n.namespaceURI===MAP_W14&&n.localName==='checked'){const v=n.getAttributeNS(MAP_W14,'val')||n.getAttribute('w14:val');box=true;if(v==='1'||v==='true')tick=true;}
    if(n.namespaceURI!==MAP_W)return;
    if(n.localName==='t'){const s=n.textContent;
      // a run in a symbol font: ü/þ in Wingdings is a tick
      const rpr=n.parentNode&&[...n.parentNode.children].find(x=>x.localName==='rPr');const fonts=rpr?[...rpr.children].find(x=>x.localName==='rFonts'):null;
      const sym=fonts&&/wingdings|webdings|symbol/i.test((fonts.getAttributeNS(MAP_W,'ascii')||'')+(fonts.getAttributeNS(MAP_W,'hAnsi')||'')+(fonts.getAttributeNS(MAP_W,'cs')||''));
      if(sym&&/[üþûýx]/.test(s))tick=true;else t+=s;
      if(/☐/.test(s))box=true;}
    else if(n.localName==='sym'){const c=(n.getAttributeNS(MAP_W,'char')||'').toUpperCase();if(WING_TICK.has(c)||WING_TICK.has(c.replace(/^F0/,'00')))tick=true;else if(c==='F0A8'||c==='F06F'||c==='F071')box=true;}
    else if(n.localName==='tab'||n.localName==='br')t+=' ';
    else if(n.localName==='p'&&t&&!/\s$/.test(t))t+=' ';});
  t=t.replace(/\s+/g,' ').trim();
  if(TICK_CH.test(t))tick=true;
  const rest=t.replace(/[☐☒☑✓✔✗✘■●▪]/g,'').trim();
  if(/^(x|y|yes|tick|ticked|done|ü|þ)$/i.test(rest))tick=true;
  return {t,tick,box,rest};
}
// Lay a table out on its grid, so merged header cells line up with the tick cells under them
function camGrid(tbl){
  const rows=[...tbl.children].filter(r=>r.localName==='tr');
  return rows.map(tr=>{let g=0;const pr=[...tr.children].find(x=>x.localName==='trPr');
    if(pr){const gb=[...pr.children].find(x=>x.localName==='gridBefore');if(gb)g=+gb.getAttributeNS(MAP_W,'val')||0;}
    const cells=[];
    // cells can sit inside content controls (sdt) in a row
    const tcs=[];const coll=n=>[...n.children].forEach(c=>{if(c.localName==='tc')tcs.push(c);else if(c.localName==='sdt'||c.localName==='sdtContent'||c.localName==='customXml')coll(c);});coll(tr);
    tcs.forEach(tc=>{const p=[...tc.children].find(x=>x.localName==='tcPr');let span=1,vm=null;
      if(p){const gs=[...p.children].find(x=>x.localName==='gridSpan');if(gs)span=+gs.getAttributeNS(MAP_W,'val')||1;const v=[...p.children].find(x=>x.localName==='vMerge');if(v)vm=v.getAttributeNS(MAP_W,'val')||'continue';}
      cells.push({g,span,vm,...camCellInfo(tc)});g+=span;});
    return cells;});
}
const CAM_CODE=/\bVC2[A-Z]{1,4}(?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}\b/g;
function camIsMapTable(G){
  const hasCodes=G.some(r=>r.some(c=>(c.t.match(CAM_CODE)||[]).length));
  const unitRow=G.findIndex(r=>r.length&&/teaching and learning unit/i.test(r[0].t)&&r.some(c=>/^(CD|content description)/i.test(c.t)));
  return hasCodes&&unitRow>=0?unitRow:-1;}
function camIsAsTable(G){return G.length>1&&G.some(r=>r.some(c=>/achievement standard/i.test(c.t))&&r.some(c=>/^Y\s*\/\s*N$/i.test(c.t)));}
// Read one map table: units and what each is ticked against
function camReadMap(G,unitRow,out){
  // code columns from the header rows above the unit label row (a code cell may also carry the description)
  const cols=[];for(let i=0;i<unitRow;i++)G[i].forEach(c=>{const m=c.t.match(CAM_CODE);if(m)m.forEach(code=>{if(!cols.some(x=>x.code===code&&x.g===c.g))cols.push({code,g:c.g,span:c.span});});});
  if(!cols.length)return;
  out.header+=cols.length;cols.forEach(c=>out.codes.push(c.code));
  for(let i=unitRow+1;i<G.length;i++){const r=G[i];if(!r.length)continue;
    const first=r[0];if(/^comments?/i.test(first.t)||/comments, notes/i.test(r.map(c=>c.t).join(' '))){const txt=r.slice(1).map(c=>c.t).join(' ').trim();if(txt)out.comments.push(txt);continue;}
    const unitCells=r.filter(c=>c.g<cols[0].g);let name=(unitCells[0]||{}).t||'';const sem=(unitCells[1]||{}).t||'';
    if(!name&&first.vm==='continue'&&out.units.length)name=out.units[out.units.length-1].name;
    const ticks=[];
    cols.forEach(col=>{const under=r.filter(c=>c.g>=col.g&&c.g<col.g+col.span);if(!under.length)return;
      const box=under[0],asCell=under[1];const nums=((asCell?asCell.rest:'')+' '+(under.length===1?box.rest:'')).match(/\b\d{1,2}\b/g)||[];
      if(box.tick||nums.length)ticks.push({code:col.code,as:nums.map(Number)});});
    if(!name&&!ticks.length)continue;
    out.units.push({name:name||'(unit not named)',sem,ticks});}
}
function camReadAs(G,out){
  G.forEach(r=>{for(let k=0;k<r.length;k++){const c=r[k];const m=c.t.match(/^(\d{1,2})\s*[.)]\s+(.{8,})$/);if(!m)continue;
    const yn=r[k+1];if(!yn)continue;const v=yn.tick||/^(y|yes)$/i.test(yn.rest)?'Y':/^(n|no)$/i.test(yn.rest)?'N':'';
    out.as.push({n:+m[1],t:m[2].trim(),v});}});
}
// Returns {segs, map} for a curriculum area map, or null for any other Word file
function camParse(body,ptext){
  const tbls=[...body.getElementsByTagNameNS(MAP_W,'tbl')].filter(t=>!t.parentNode.closest||!t.parentNode.closest('tbl'));
  const grids=tbls.map(camGrid);if(!grids.some(G=>camIsMapTable(G)>=0))return null;
  const out={units:[],as:[],comments:[],header:0,codes:[]};const skip=new Set();
  grids.forEach((G,i)=>{const u=camIsMapTable(G);if(u>=0){camReadMap(G,u,out);skip.add(tbls[i]);}else if(camIsAsTable(G)){camReadAs(G,out);skip.add(tbls[i]);}});
  // merge rows for the same unit across strand tables
  const units=[];out.units.forEach(u=>{const k=u.name.toLowerCase();let x=units.find(v=>v.name.toLowerCase()===k);if(!x)units.push(x={name:u.name,sem:u.sem,ticks:[]});u.ticks.forEach(t=>{const y=x.ticks.find(z=>z.code===t.code);if(y)t.as.forEach(n=>{if(!y.as.includes(n))y.as.push(n);});else x.ticks.push({code:t.code,as:t.as.slice()});});});
  const asBy={};out.as.forEach(a=>{if(!asBy[a.n]||a.v)asBy[a.n]=a;});
  // text outside the map and AS tables (title, assessment, analysis, next steps) is kept as ordinary evidence; template instructions are dropped
  const segs=[];const INSTR=/^(use this curriculum area map|instructions|enter (your|the) (details|title)|complete all the mapping|complete the assessment|hint: use your|created by:|date created:|click or tap here)/i;
  const walk=node=>{[...node.children].forEach(ch=>{if(ch.namespaceURI!==MAP_W){walk(ch);return;}
    if(ch.localName==='tbl'){if(skip.has(ch))return;[...ch.children].filter(r=>r.localName==='tr').forEach(tr=>{const cells=[...tr.getElementsByTagNameNS(MAP_W,'tc')].map(tc=>[...tc.getElementsByTagNameNS(MAP_W,'p')].map(ptext).join(' ').trim()).filter(Boolean);const row=cells.join(' | ');if(row&&!INSTR.test(row))chunk(row,600).forEach(c=>segs.push(c));});}
    else if(ch.localName==='p'){const t=ptext(ch).trim();if(t&&!INSTR.test(t)&&!/^\d\.\s+(enter|complete)/i.test(t))chunk(t).forEach(c=>segs.push(c));}
    else if(ch.localName==='sdt'||ch.localName==='sdtContent'||ch.localName==='customXml')walk(ch);});};
  walk(body);
  // unit names (no codes) so the audit can show and search them
  units.forEach(u=>segs.push('Teaching and learning unit: '+u.name+(u.sem?' ('+(/^\d$/.test(u.sem)?'Semester '+u.sem:u.sem)+')':'')));
  out.comments.forEach(c=>chunk(c).forEach(x=>segs.push(x)));
  // strip codes from kept text: a map's codes count only through its ticks
  const clean=segs.map(s=>s.replace(CAM_CODE,'').replace(/\s{2,}/g,' ').trim()).filter(Boolean);
  return {segs:clean,map:{units,as:Object.values(asBy).sort((a,b)=>a.n-b.n),header:out.header,codes:[...new Set(out.codes)],queries:[],ticked:new Set(units.flatMap(u=>u.ticks.map(t=>t.code))).size}};
}

// ---------- Curriculum area maps kept as spreadsheets (a tab per level) ----------
// Layout: a row of VC2 codes across the top (with strand, sub-strand and descriptor rows above it), units down the first
// column, semester/term in the next, and an AS number (or several) in a cell where a unit addresses that content description.
// A key of numbered achievement standard sentences sits below. Only cells with a number count; "?" etc. are listed for checking.
function camColIdx(ref){const m=/^([A-Z]+)/.exec(ref||'');if(!m)return -1;let n=0;for(const ch of m[1])n=n*26+ch.charCodeAt(0)-64;return n-1;}
function camSheetRows(doc,strings){const tx=el=>[...el.getElementsByTagName('t')].map(t=>t.textContent).join('');const rows=[];
  [...doc.getElementsByTagName('row')].forEach(r=>{const ri=(+r.getAttribute('r')||rows.length+1)-1;const row={};
    [...r.getElementsByTagName('c')].forEach((c,k)=>{const t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0];let s='';
      if(t==='s')s=v?strings[+v.textContent]||'':'';else if(t==='inlineStr'){const is=c.getElementsByTagName('is')[0];s=is?tx(is):'';}else if(t==='b')s='';else s=v?v.textContent:'';
      s=String(s).replace(/\s+/g,' ').trim();if(/^\d+\.0+$/.test(s))s=s.replace(/\.0+$/,'');
      const ci=c.getAttribute('r')?camColIdx(c.getAttribute('r')):k;if(s)row[ci]=s;});
    rows[ri]=row;});
  return rows;}
const CAM_FULL=/^VC2[A-Z]{1,4}(?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}$/;
// AS numbers in a cell: "5", "15,16", "19, 20", "7-8", "14b"; anything without a digit ("?", "No AS?") is not a tick
function camNums(s){if(!/\d/.test(s))return null;const out=[];String(s).replace(/(\d{1,2})\s*[-–]\s*(\d{1,2})|\d{1,2}/g,(m,a,b)=>{if(a){for(let i=+a;i<=+b&&i-a<20;i++)out.push(i);}else out.push(+m);return m;});return out.length?[...new Set(out)]:null;}
function camXlsx(sheets){
  const out={units:[],as:[],queries:[],header:0,sheets:[],codes:[]};
  // a code is either a whole cell (MEC style) or the end of a content description cell (VCAA template: "description\n VC2MFN01")
  const codeIn=v=>{const m=String(v).match(CAM_CODE);return m&&m.length===1?m[0]:null;};
  const HEAD=/^(unit( title)?|teaching and learning unit|semester( \/ term)?|term|year|strand|sub-?strand|content description|curriculum descriptor|code)\b/i;
  sheets.forEach(({name,rows})=>{
    const cr=rows.findIndex(r=>r&&Object.values(r).filter(codeIn).length>=3);if(cr<0)return;
    const cols=Object.entries(rows[cr]).filter(([,v])=>codeIn(v)).map(([c,v])=>({c:+c,code:codeIn(v)}));const first=Math.min(...cols.map(x=>x.c));
    out.header+=cols.length;out.sheets.push(name);cols.forEach(c=>out.codes.push(c.code));const used=new Set();let end=rows.length;
    // which left-hand columns hold the unit and the semester/term (from a header such as "Unit Title" | "Semester")
    let uCol=-1,sCol=-1;for(let i=0;i<Math.min(rows.length,cr+4);i++){const r=rows[i];if(!r)continue;Object.entries(r).forEach(([c,v])=>{if(+c>=first)return;
      if(uCol<0&&/^(unit|teaching and learning unit)/i.test(v))uCol=+c;if(sCol<0&&/^(semester|term)/i.test(v))sCol=+c;});}
    for(let i=cr+1;i<rows.length;i++){const r=rows[i];if(!r)continue;
      const left=Object.entries(r).filter(([c])=>+c<first).sort((x,y)=>x[0]-y[0]);
      // the achievement standard key ends the grid
      if(left.some(([,v])=>/^achievement (standard|strands)|^key\b/i.test(v))){end=i;break;}
      let unit,sem;if(uCol>=0){unit=r[uCol]||'';sem=sCol>=0?r[sCol]||'':'';}
      else{const lab=left.map(([,v])=>v).filter(v=>!/^\d+$/.test(v));unit=lab[0]||'';sem=lab[1]||'';}
      if(HEAD.test(unit))continue;                 // a header row such as "Unit Title | Semester"
      const sample=/^sample$/i.test(unit.trim());  // the template's example row is not a unit
      const ticks=[];cols.forEach(col=>{const v=r[col.c];if(v==null||v===''||sample)return;
        if(/^not covered$/i.test(v.trim()))return;   // an explicit "Not covered" from the template's list
        // "Yes" is a tick where the template's list is Yes / Not covered (e.g. Level 10A, which has no AS numbers)
        const n=camNums(v)||(/^(yes|y|✓|✔)$/i.test(v.trim())?[]:null);
        if(n){ticks.push({code:col.code,as:n});n.forEach(x=>used.add(x));}
        else out.queries.push({sheet:name,unit:unit||'(unit not named)',code:col.code,v});});
      if(sample||(!unit&&!ticks.length))continue;
      out.units.push({name:(sheets.length>1?name+': ':'')+(unit||'(unit not named)'),sem:/^\d$/.test(sem)?'Semester '+sem:sem,ticks});}
    // key: a cell holding just a number with the sentence to its right (MEC: A|B, VCAA template: strand D | number E | sentence F)
    for(let i=end;i<rows.length;i++){const r=rows[i];if(!r)continue;const e=Object.entries(r).map(([c,v])=>[+c,v]).sort((x,y)=>x[0]-y[0]);
      const k=e.findIndex(([,v])=>/^\d{1,2}$/.test(v));if(k<0)continue;const t=e.slice(k+1).map(([,v])=>v).sort((x,y)=>y.length-x.length)[0];
      const n=+e[k][1];if(t&&t.length>15)out.as.push({n,t,v:used.has(n)?'Y':'',sheet:name});}
  });
  if(!out.sheets.length)return null;
  const segs=out.units.map(u=>'Teaching and learning unit: '+u.name+(u.sem?' ('+u.sem+')':''));
  return {segs,map:{units:out.units,as:out.as,queries:out.queries,header:out.header,sheets:out.sheets,codes:[...new Set(out.codes)],ticked:new Set(out.units.flatMap(u=>u.ticks.map(t=>t.code))).size}};
}

// ---------- What kind of sheet is this? ----------
// 'cam'   a curriculum area map: one row of codes across the top, short marks (AS numbers, ticks, "?") in the grid below.
//         Only the marks count.
// 'check' a coverage checklist: each code listed once with a count or tick beside it (e.g. =COUNTIF of the plan).
//         A code counts only when its count is above zero or it is ticked.
// 'plan'  a yearly overview, scope and sequence, area plan or unit plan: codes are written where they are taught,
//         so listed codes and the words around them are the evidence.
function camCodeCells(rows){const out=[];rows.forEach((r,ri)=>{if(!r)return;Object.entries(r).forEach(([c,v])=>{const m=String(v).match(CAM_CODE);if(m)m.forEach(code=>out.push({r:ri,c:+c,code,v}));});});return out;}
function sheetKind(rows){
  const cells=camCodeCells(rows);if(!cells.length)return {kind:'text'};
  const byRow={};cells.forEach(x=>{(byRow[x.r]=byRow[x.r]||[]).push(x);});
  const cr=Object.keys(byRow).map(Number).sort((a,b)=>a-b).find(r=>byRow[r].length>=3);
  if(cr!=null){
    const head=byRow[cr],elsewhere=cells.filter(x=>x.r!==cr);
    const cols=new Set(head.map(x=>x.c));let short=0,long=0;
    for(let i=cr+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const left=Object.entries(r).filter(([c])=>+c<Math.min(...cols));
      if(left.some(([,v])=>/^achievement (standard|strands)|^key\b/i.test(v)))break;
      cols.forEach(c=>{const v=r[c];if(v==null||v==='')return;(String(v).length<=15&&!CAM_CODE.test(v)?short++:long++);CAM_CODE.lastIndex=0;});}
    // a map lists each code once, in its header, and its grid holds only short marks
    if(elsewhere.length<3&&long<=Math.max(1,short*.1))return {kind:'cam'};
  }
  // checklist: codes listed once each, mostly with a number or mark in the next cell along
  const uniq=new Set(cells.map(x=>x.code));
  if(uniq.size===cells.length&&cells.length>=5){
    const marked=cells.filter(x=>{const n=rows[x.r]&&rows[x.r][x.c+1];return n!=null&&/^(\d+(\.\d+)?|[✓✔☑☒xXyY]|yes|no|n|covered|not covered|0)$/i.test(String(n).trim());});
    if(marked.length>=cells.length*.6)return {kind:'check',cells};
  }
  return {kind:'plan'};
}
// A checklist sheet as text: only the codes marked as covered, so unmarked ones are never counted
function checkSegs(name,rows,cells){const segs=['Sheet: '+name+' (coverage checklist)'];
  cells.forEach(x=>{const n=String((rows[x.r]||{})[x.c+1]??'').trim();if(/^(0+(\.0+)?|n|no|not covered)?$/i.test(n))return;
    segs.push('Coverage checklist: '+x.code+' marked covered ('+n+')');});
  return segs;}
