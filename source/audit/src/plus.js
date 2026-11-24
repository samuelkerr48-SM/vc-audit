// ===================== 1.4 additions (spliced into app.js by build.py) =====================
const WKEY='vc.audit.words', BKEY='vc.audit.brand', SPKEY='vc.audit.sp';
const jget=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
const jput=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
// A school copy of the file carries the school's branding and word list
const SCHOOL=(()=>{try{const el=document.getElementById('schoolSaved');return el?JSON.parse(el.textContent):null;}catch(e){return null;}})();

// ---------- how much a line counts ----------
const RE_INTENT=/\b(learning (intention|goal|objective|focus)s?|success criteria|lesson (objective|focus|title)|objectives?|we are learning|WALT|WILF|I can\b|students will|we will\b|key (understandings?|ideas|concepts)|essential questions?|curriculum (links?|focus)|content descriptions?|achievement standards?|assessment|summative|outcomes?)/i;
const RE_PASS_MAT=/^\s*(materials?|resources?|equipment|you will need|what you need|preparation|set[- ]?up)\b\s*[:|]/i;
const RE_PASS_VOC=/^\s*((key |tier \d )?vocabulary|key (words|terms)|word (list|bank)|glossary)\b\s*[:|]/i;
function isList(s){const parts=s.split(/[,;]/);if(parts.length<9)return false;const short=parts.filter(p=>p.trim().split(/\s+/).length<=3).length;return short/parts.length>.85;}
function segWeight(s){if(RE_PASS_MAT.test(s))return CFG.wMat;if(RE_PASS_VOC.test(s)||isList(s))return CFG.wVoc;if(RE_INTENT.test(s.slice(0,160)))return CFG.wIntent;return 1;}
// per-file line weights and the term each line belongs to (0 = not known)
function meta(f){
  if(f._m&&f._m.n===f.segs.length&&f._m.k===CFG.wMat+'|'+CFG.wVoc+'|'+CFG.wIntent)return f._m;
  const wt=[],term=[];let cur=0;const fn=(f.name.replace(/[_.]+/g,' ').match(/\b(?:Term|T)\s?([1-4])\b/i)||[])[1];if(fn)cur=+fn;
  // a term is 1–4; a semester is [1,2] or [3,4]. "[Term 2] …" and "[Semester 1] …" mark a line from a table with terms
  // or semesters across the top (see termRows): they set that line only.
  const sem=n=>n==1?[1,2]:[3,4];
  f.segs.forEach(s=>{wt.push(segWeight(s));
    const tag=s.match(/^\[(Term|Semester) ([1-4])\]/);if(tag){term.push(tag[1]==='Term'?+tag[2]:sem(+tag[2]));return;}
    const m=s.match(/\bTerm\s?([1-4])\b/i);
    if(m){const t=+m[1];if(s.length<90||/^\s*(Sheet: )?Term\s?[1-4]\b/i.test(s))cur=t;term.push(t);return;}
    const sm=s.match(/\bSem(?:ester)?\s?([12])\b/i);
    if(sm){const t=sem(+sm[1]);if(s.length<90||/^\s*(Sheet: )?Sem(ester)?\s?[12]\b/i.test(s))cur=t;term.push(t);return;}
    term.push(cur);});
  return f._m={n:f.segs.length,k:CFG.wMat+'|'+CFG.wVoc+'|'+CFG.wIntent,wt,term};
}
const stripFiles=fs=>fs.map(f=>({name:f.name,kind:f.kind,segs:f.segs,pages:f.pages,words:f.words,map:f.map,mapText:f.mapText}));

// ---------- the school's own words ----------
let WORDS=(()=>{const out=JSON.parse(JSON.stringify((SCHOOL&&SCHOOL.words)||{}));const mine=jget(WKEY)||{};
  Object.keys(mine).forEach(s=>{out[s]=out[s]||{};Object.keys(mine[s]).forEach(c=>{out[s][c]=[...new Set([...(out[s][c]||[]),...mine[s][c]])];});});return out;})();
function wordsFor(code){return ((WORDS[SUBJ.key]||{})[code])||[];}
function wordRe(terms){return new RegExp('(?<![A-Za-z])('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')).join('|')+')(?![A-Za-z])','i');}
function addWord(code,t){t=t.trim().replace(/\s+/g,' ');if(t.length<3)return false;WORDS[SUBJ.key]=WORDS[SUBJ.key]||{};const l=WORDS[SUBJ.key][code]=WORDS[SUBJ.key][code]||[];if(!l.some(x=>x.toLowerCase()===t.toLowerCase()))l.push(t);jput(WKEY,WORDS);return true;}
function delWord(subj,code,t){const l=(WORDS[subj]||{})[code];if(!l)return;WORDS[subj][code]=l.filter(x=>x!==t);if(!WORDS[subj][code].length)delete WORDS[subj][code];jput(WKEY,WORDS);}

// ---------- confidence in plain words ----------
function conf(r){
  if(r.overridden)return 'set by you';if(r.listed)return 'code listed';if(r.mapped&&r.mapFlag!=='notInPlans'&&r.score<CFG.partAt)return 'ticked on the map';if(r.mapped&&r.mapFlag==='notInPlans')return 'ticked on the map only';if(r.school&&r.school.n&&r.schoolLift)return 'your school’s words';
  const E=r.E||[];let intent,got,allPass;
  if(SUBJ.kwOnly||r.kwLed){const k=(r.kw||[]).filter(h=>h.n);intent=k.some(h=>h.nI>0);got=k;allPass=k.length>0&&k.every(h=>h.nP===h.n);}
  else{const ids=r.found.filter(id=>!SUBJ.byId[id].opt);const sum=(h,k)=>E.reduce((n,i)=>n+(h[k][i]||0),0);
  intent=ids.some(id=>sum(R.H[id],'perFileI')>0);got=ids.filter(id=>sum(R.H[id],'perFile')>0);
  allPass=got.length>0&&got.every(id=>sum(R.H[id],'perFileP')===sum(R.H[id],'perFile'));}
  if(r.auto==='cov')return intent?'strong evidence':'good evidence';
  if(r.auto==='part')return allPass?'passing mention only':intent?'some evidence, in a learning intention':'some evidence';
  return got.length?(allPass?'only in a list':'trace only'):'no evidence';
}
const CONFHELP={'ticked on the map':'Ticked for a unit on the curriculum area map.','ticked on the map only':'Ticked on the curriculum area map, but the plans show no evidence of it.','strong evidence':'Named in learning intentions, success criteria or assessment.','good evidence':'Taught content mentions it clearly, though not in a learning intention.','passing mention only':'Found only in vocabulary or materials lists. Check it.','some evidence':'Part of it appears. Check it.','some evidence, in a learning intention':'Part of it appears, including in a learning intention. Check it.','trace only':'One weak mention.','only in a list':'Mentioned only in a list.','no evidence':'Nothing found.','code listed':'The code is written in the file.','set by you':'You changed this status.','your school’s words':'Matched the words your school added for this.'};

// ---------- insights ----------
function insights(){
  if(R.ins)return R.ins;const ins={};const lv=LEVELS.filter(l=>S.levels.includes(l));
  const elig={};lv.forEach(l=>elig[l]=eligible(l));const segN=E=>E.reduce((n,i)=>n+S.files[i].segs.length,0);
  // progression across levels, from the audit's own statuses: one row per sub-strand (or strand), one cell per level
  const prog=[];const subOf=cd=>cd.substrand&&cd.substrand!==cd.strand?cd.substrand:cd.strand;
  if(lv.length>1){const subs=[];const seenS=new Set();
    SUBJ.cds.forEach(cd=>{const k=subOf(cd);if(!seenS.has(k)){seenS.add(k);subs.push({k,strand:cd.strand});}});
    subs.forEach(({k,strand})=>{const cells=lv.map(l=>{const rs=R.rows.filter(r=>String(r.cd.level)===l&&subOf(r.cd)===k);
        if(!rs.length)return {l,exp:false};if(!elig[l].length)return {l,exp:true,st:'nofile',rs,n:rs.length,cov:0,part:0};
        const cov=rs.filter(r=>r.status==='cov'||r.status==='na').length,part=rs.filter(r=>r.status==='part').length;
        return {l,exp:true,rs,n:rs.length,cov,part,st:cov===rs.length?'strong':(cov||part)?'some':'none'};});
      if(cells.filter(x=>x.exp).length<2)return;const any=cells.some(x=>x.exp&&(x.st==='strong'||x.st==='some'));
      const breaks=cells.filter(x=>x.exp&&x.st==='none'&&any).map(x=>x.l);
      prog.push({c:{label:k},cells,breaks,strand});});}
  ins.prog=prog;ins.breaks=prog.filter(p=>p.breaks.length);
  // emphasis and thin coverage
  const sets={};SUBJ.strands.forEach(s=>sets[s]=new Set());
  R.rows.forEach(r=>{const set=new Set();(r.evid||[]).forEach(u=>{for(const fi in u.idx)u.idx[fi].forEach(si=>set.add(fi+':'+si));});r.mentions=set.size;(sets[r.cd.strand]=sets[r.cd.strand]||new Set());set.forEach(k=>sets[r.cd.strand].add(k));});
  const totM=SUBJ.strands.reduce((n,s)=>n+sets[s].size,0)||1;
  ins.emph=SUBJ.strands.map(s=>{const n=R.rows.filter(r=>r.cd.strand===s).length;const plan=sets[s].size/totM,cur=n/R.rows.length;return {s,plan,cur,ratio:cur?plan/cur:0};});
  ins.check=R.rows.filter(r=>r.status==='cov'&&!r.overridden&&!r.listed&&!r.mapped&&!(r.school&&r.schoolLift)&&(r.mentions<=2||['passing mention only','only in a list','trace only','some evidence'].includes(conf(r)))).sort((a,b)=>a.mentions-b.mentions);
  // foundations (Maths): each gap with the content description it builds on at the level below
  ins.found=[];if(SUBJ.key==='maths'&&typeof MATHS_PREV!=='undefined'){const by=Object.fromEntries(R.rows.map(r=>[r.cd.code,r]));
    R.rows.filter(r=>r.status==='none'||r.status==='part').forEach(r=>{const pre=(MATHS_PREV[r.cd.code]||[]);if(!pre.length)return;
      const ps=pre.map(c=>({c,r:by[c],cd:SUBJ.cdBy[c]}));const inAudit=ps.filter(x=>x.r);
      const kind=!inAudit.length?'out':inAudit.some(x=>x.r.status==='none')?'shaky':inAudit.every(x=>x.r.status==='cov'||x.r.status==='na')?'ready':'partly';
      ins.found.push({r,ps,kind});});}
  ins.thin=R.rows.filter(r=>(r.status==='cov'||r.status==='part')&&!r.overridden&&r.mentions<=2).sort((a,b)=>a.mentions-b.mentions);
  // when in the year
  let known=0,tot=0;S.files.forEach(f=>{const t=meta(f).term;tot+=t.length;known+=t.filter(Boolean).length;});ins.termShare=tot?known/tot:0;
  if(ins.termShare>=.3){
    R.rows.forEach(r=>{const ids=r.evid||[];const tc=[0,0,0,0,0];
      ids.forEach(u=>{const seen=new Set();for(const fi in u.idx){const tm=meta(S.files[fi]).term;u.idx[fi].forEach(si=>[].concat(tm[si]||[]).forEach(t=>seen.add(t)));}seen.forEach(t=>tc[t]++);});
      const need=Math.max(1,Math.ceil(ids.length/2));r.terms=[1,2,3,4].filter(t=>r.status!=='none'&&r.status!=='na'&&ids.length&&tc[t]>=need);
      if(r.listed){[...R.listed[r.cd.code]].forEach(fi=>{const f=S.files[fi],tm=meta(f).term;f.segs.forEach((s,si)=>{if(tm[si]&&s.includes(r.cd.code))[].concat(tm[si]).forEach(t=>{if(!r.terms.includes(t))r.terms.push(t);});});});r.terms.sort();}});
    ins.termStrand=SUBJ.strands.map(s=>{const rs=R.rows.filter(r=>r.cd.strand===s);return {s,n:rs.length,t:[1,2,3,4].map(t=>rs.filter(r=>r.terms.includes(t)).length)};});
    ins.lateOnly=R.rows.filter(r=>r.terms.length===1&&r.terms[0]===4);ins.onceOnly=R.rows.filter(r=>r.terms.length===1);
    ins.noTerm=ins.termStrand.filter(x=>x.n).flatMap(x=>x.t.map((n,i)=>n?null:x.s+' in Term '+(i+1))).filter(Boolean);
  }
  // achievement standards (where loaded)
  ins.as=[];ins.asMissing=[];
  linkStandards(SUBJ);
  lv.forEach(l=>{const list=(SUBJ.standards||{})[l];if(!list||!list.length){ins.asMissing.push(l);return;}
    list.forEach(raw=>{const st={strand:raw.strand||raw.g||'',text:raw.t};const lvRows=R.rows.filter(r=>String(r.cd.level)===l);
      let hit=lvRows.filter(r=>raw.links.includes(r.cd.code));let loose=false;
      if(!hit.length){const bySt=raw.strand?lvRows.filter(r=>r.cd.strand===raw.strand):[];hit=bySt.length?bySt:lvRows;loose=bySt.length?'whole strand':'whole level';if(!bySt.length)st.strand='General';}
      if(!hit.length)return;
      const good=hit.filter(r=>r.status==='cov'||r.status==='na').length,some=hit.filter(r=>r.status==='part').length;
      const norm=x=>String(x).toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();const nt=norm(raw.t);let map=null;
      S.files.forEach(f=>{if(!f.map||!f.map.as.length)return;const fl=fileLevel(f).lv;if(S.levels.length>1&&fl!=='*'&&fl!==l)return;
        f.map.as.forEach(a=>{const na=norm(a.t).slice(0,60);if(na.length>15&&(nt.includes(na)||norm(a.t).includes(nt.slice(0,60))))map=map&&map.v==='Y'?map:a;});});
      ins.as.push({l,st,rows:hit,loose,map,status:hit.length&&good===hit.length?'cov':(good||some)?'part':'none'});});});
  // texts or unit titles repeated across levels
  ins.repeats=[];
  if(lv.length>1){const generic=t=>/^(sequence|unit|week|term|lesson|level|year|learning|vocabulary|assessment|text type|title|topic|strand|focus|sheet|foundation|prep|notes?|overview|english|mathematics|maths|number|algebra|measurement|space|statistics|probability|language|literature|literacy)\b/i.test(t)||/^\W*\d/.test(t)||SUBJ.concepts.some(c=>c.e.test(t))||Object.values(SUBJ.taxa).some(x=>x.groups.some(([,it])=>it.some(([,re])=>re.test(t))));
    const seen={};S.files.forEach(f=>{const l=fileLevel(f).lv;if(l==='*'||!lv.includes(l))return;const mine=new Set();
      const add=raw=>{const t=raw.replace(/\([^)]*\)/g,' ').replace(/[“”"‘’:;,.!?–—]+/g,' ').replace(/\s+/g,' ').trim();const w=t.split(' ');if(w.length>8||t.length<5||!/[A-Za-z]{3}/.test(t)||generic(t))return;mine.add(t.toLowerCase()+'\u0001'+t);};
      f.segs.forEach(s=>{const cells=s.split(' | ');if(cells.length>=3)add(cells[0]);for(const m of s.matchAll(/[“‘"]([^”’"]{4,60})[”’"]/g))add(m[1]);});
      mine.forEach(k=>{const [key,orig]=k.split('\u0001');const o=seen[key]=seen[key]||{title:orig,levels:new Set(),files:new Set()};o.levels.add(l);o.files.add(f.name);});});
    ins.repeats=Object.values(seen).filter(o=>o.levels.size>1).map(o=>({title:o.title,levels:LEVELS.filter(l=>o.levels.has(l)),files:[...o.files]}));}
  return R.ins=ins;
}
// short lines for the reports
function insightLines(){const I=insights();const out=[];
  if(I.breaks.length)out.push(['Breaks in progression',I.breaks.map(p=>p.c.label+': none evident at '+p.breaks.map(LVNAME).join(', '))]);
  const sh=(I.found||[]).filter(f=>f.kind==='shaky');if(sh.length)out.push(['Gaps whose lead-in is also missing',sh.slice(0,25).map(f=>f.r.cd.code+' builds on '+f.ps.filter(x=>x.r&&x.r.status==='none').map(x=>x.c).join(', ')+': '+f.r.cd.description)]);
  if((I.check||[]).length)out.push(['Check these first (covered on little evidence)',I.check.slice(0,25).map(r=>r.cd.code+' ('+r.mentions+' mention'+(r.mentions===1?'':'s')+'): '+r.cd.description)]);
  if(I.termStrand){const l=[];if(I.noTerm.length)l.push('No evidence of '+I.noTerm.join('; ')+'.');if(I.lateOnly.length)l.push(I.lateOnly.length+' content description'+(I.lateOnly.length>1?'s appear':' appears')+' only in Term 4: '+I.lateOnly.map(r=>r.cd.code).join(', ')+'.');if(l.length)out.push(['When in the year',l]);}
  if(I.repeats.length)out.push(['Repeated across levels',I.repeats.map(o=>o.title+': '+o.levels.map(LVNAME).join(', '))]);
  const as=I.as.filter(a=>a.status!=='cov');if(I.as.length)out.push(['Achievement standards',[I.as.filter(a=>a.status==='cov').length+' of '+I.as.length+' achievement standard statements have all their linked content covered.'].concat(as.filter(a=>a.status==='none').slice(0,15).map(a=>LVNAME(a.l)+' '+a.st.strand+' (not evident): '+a.st.text))]);
  return out;}

// ---------- compare with a saved audit ----------
let CMP=null;
function statusesOf(state){const keep={S,subj:SUBJ.key,R,RN:R_N};let out=null;
  try{S={...S,fileLv:{},overrides:{},notes:{},...state,files:state.files||[]};setSubject(state.subject||'english');analyse();if(R){out={};R.rows.forEach(r=>out[r.cd.code]=r.status);}}
  finally{S=keep.S;setSubject(keep.subj);R=keep.R;R_N=keep.RN;}return out;}
function cmpRows(){if(!CMP)return null;const rank={none:0,part:1,cov:2,na:2};const both=R.rows.filter(r=>CMP.map[r.cd.code]);
  return {both,up:both.filter(r=>rank[r.status]>rank[CMP.map[r.cd.code]]),down:both.filter(r=>rank[r.status]<rank[CMP.map[r.cd.code]]),
    was:both.filter(r=>CMP.map[r.cd.code]==='cov').length,now:both.filter(r=>r.status==='cov').length,only:R.rows.length-both.length};}

function vInsights(){
  if(!R)return '';const I=insights();const lv=LEVELS.filter(l=>S.levels.includes(l));const multi=lv.length>1;
  const sym={strong:['c','●','clear evidence'],some:['p','◐','some evidence'],none:['n','✕','no evidence'],nofile:['x','?','no files for this level']};
  // achievement standards
  const asCard=`<div class="card"><h2>Achievement standards</h2><p class="small muted">Teachers report against the achievement standards. Each statement is linked to the content descriptions that build it, and takes its status from them.</p>${I.as.length?`<div class="tiles"><div class="tile cov"><div class="big">${I.as.filter(a=>a.status==='cov').length}<span style="font-size:16px"> / ${I.as.length}</span></div><div class="lab">statements with all linked content covered</div></div><div class="tile part"><div class="big">${I.as.filter(a=>a.status==='part').length}</div><div class="lab">partly</div></div><div class="tile none"><div class="big">${I.as.filter(a=>a.status==='none').length}</div><div class="lab">not evident</div></div></div>
    <details ${I.as.length<=30?'open':''}><summary>Show every statement</summary><table><tr><th>Level</th><th>Strand</th><th>Achievement standard statement</th><th>Linked content</th><th>Status</th>${I.as.some(a=>a.map)?'<th>Map Y/N</th>':''}</tr>${I.as.map(a=>`<tr><td class="small">${LVNAME(a.l)}</td><td class="small">${a.st.strand}</td><td>${esc(a.st.text)}</td><td class="small">${a.loose?'<span class="muted">'+a.loose+'</span>':a.rows.map(r=>`<span class="code" title="${esc(STATUS[r.status])}" style="color:var(--${r.status==='cov'?'cov':r.status==='part'?'part':r.status==='na'?'na':'none'})">${r.cd.code}</span>`).join(' ')}</td><td>${tag(a.status)}</td>${I.as.some(x=>x.map)?`<td class="small">${a.map?`<b>${a.map.v||'not marked'}</b> <span class="muted">(sentence ${a.map.n})</span>${a.map.v==='Y'&&a.status==='none'?'<div class="mapflag">⚠ Y on the map, not evident</div>':a.map.v!=='Y'&&a.status==='cov'?'<div class="mapflag">⚠ covered, not marked Y</div>':''}`:'<span class="muted">–</span>'}</td>`:''}</tr>`).join('')}</table></details>`:''}
    <p class="small muted">Each statement is linked to the content descriptions VCAA connects it to in its achievement standard extracts. A statement is covered when all its linked content descriptions are.</p></div>`;
  // progression: each sub-strand across the levels, from the content description statuses
  let progCard='';const SUBW=SUBJ.cds.some(c=>c.substrand&&c.substrand!==c.strand)?'sub-strand':'strand';
  if(multi){const cls=x=>x.st==='strong'?'c':x.st==='some'?'p':x.st==='none'?'n':'x';
    let last='';const body=[...I.prog].sort((a,b)=>SUBJ.strands.indexOf(a.strand)-SUBJ.strands.indexOf(b.strand)).map(p=>{const head=p.strand!==last&&p.c.label!==p.strand?`<tr class="grp"><td colspan="${lv.length+1}">${p.strand}</td></tr>`:'';last=p.strand;
      return head+`<tr><td class="small"><b>${esc(p.c.label)}</b>${p.breaks.length?` <span class="tag s-none">break</span>`:''}</td>${p.cells.map(x=>x.exp?`<td class="pc ${cls(x)}"><button class="pcb" data-pg="${esc(p.c.label)}|${x.l}" title="${LVNAME(x.l)}: ${x.st==='nofile'?'no files for this level':x.cov+' of '+x.n+' covered'+(x.part?', '+x.part+' partly':'')}">${x.st==='nofile'?'?':x.cov+'/'+x.n}</button></td>`:`<td class="pc"></td>`).join('')}</tr>`;}).join('');
    progCard=`<div class="card"><h2>Progression across levels</h2><p class="small muted">Each row is a ${SUBW}; each cell shows how many of that level’s content descriptions in it are covered (the same results as the Content descriptions tab). Click a cell to see them. A <b>break</b> is a level where none of them are evident while other levels teach the ${SUBW}.</p>
     ${I.breaks.length?`<div class="warn"><b>Breaks:</b> ${I.breaks.map(p=>esc(p.c.label)+' at '+p.breaks.map(LVNAME).join(', ')).join('; ')}.</div>`:`<p class="ok">No breaks between levels.</p>`}${(()=>{const z=I.prog.filter(p=>p.cells.every(x=>!x.exp||x.st==='none'||x.st==='nofile')&&p.cells.some(x=>x.st==='none'));return z.length?`<div class="warn"><b>Not evident at any level:</b> ${z.map(p=>esc(p.c.label)).join(', ')}.</div>`:'';})()}
     <div style="overflow:auto"><table class="prog"><tr><th>${SUBW==='sub-strand'?'Sub-strand':'Strand'}</th>${lv.map(l=>`<th class="pc">${l==='F'?'F':l.replace('-','–')}</th>`).join('')}</tr>${body}</table></div>
     <div id="pgOut"></div>
     <div class="small muted" style="margin-top:6px"><span class="pc c">3/3</span> all covered &nbsp; <span class="pc p">1/3</span> some covered or partly &nbsp; <span class="pc n">0/3</span> none evident &nbsp; <span class="pc x">?</span> no files for this level &nbsp; blank = no content at this level</div></div>`;
  }
  // foundations for the gaps (Maths)
  let foundCard='';
  if(I.found.length){const grp=(k,t,help)=>{const l=I.found.filter(f=>f.kind===k);return l.length?`<h3>${t} <span class="small muted">(${l.length})</span></h3><p class="small muted">${help}</p>${l.map(f=>`<div class="gap"><div class="h"><span class="code">${f.r.cd.code}</span> ${esc(f.r.cd.description)} ${tag(f.r.status)}</div><div class="lookfor"><b>Builds on:</b> ${f.ps.map(x=>`<span class="code">${x.c}</span> ${esc(x.cd?x.cd.description:'')} ${x.r?tag(x.r.status):'<span class="muted">(not in this audit)</span>'}`).join('<br>')}</div></div>`).join('')}`:'';};
    foundCard=`<div class="card"><h2>Foundations for the gaps</h2><p class="small muted">Each gap beside the content description it builds on at the level below, from a fixed map of how the Mathematics content descriptions follow on from each other. Plan first for the gaps whose lead-in is also missing.</p>
     <div class="tiles"><div class="tile none"><div class="big">${I.found.filter(f=>f.kind==='shaky').length}</div><div class="lab">gaps whose lead-in is also not evident</div></div><div class="tile part"><div class="big">${I.found.filter(f=>f.kind==='partly').length}</div><div class="lab">gaps whose lead-in is partly covered</div></div><div class="tile cov"><div class="big">${I.found.filter(f=>f.kind==='ready').length}</div><div class="lab">gaps with the lead-in covered</div></div></div>
     ${grp('shaky','Lead-in also missing','Plan the earlier content first, or teach both together.')}
     <details><summary>The other gaps: lead-in partly covered, covered, or below this audit's levels</summary>${grp('partly','Lead-in partly covered','Check the lead-in is taught well enough to build on.')}${grp('ready','Lead-in covered','Students should have the foundation.')}${grp('out','Lead-in not in this audit','The level below isn’t in this audit. Add it to check.')}</details></div>`;}
  // check these first: covered on little evidence
  const checkCard=`<div class="card"><h2>Check these first</h2><p class="small muted">Content descriptions marked covered on the plan’s words alone, with one or two mentions or weak evidence: no code, no map tick and nothing set by you. Open their evidence before relying on them.</p>
    ${I.check.length?`<details ${I.check.length<=12?'open':''}><summary>Show them (${I.check.length})</summary><table><tr><th>Code</th><th>Content description</th><th>Evidence</th></tr>${I.check.map(r=>`<tr><td><span class="code">${r.cd.code}</span></td><td class="small">${esc(r.cd.description)}</td><td class="small">${r.mentions} mention${r.mentions===1?'':'s'}; ${esc(conf(r))}</td></tr>`).join('')}</table></details>`:'<p class="ok">None: every covered content description has a code, a map tick or several clear mentions.</p>'}</div>`;
  // when in the year
  const termCard=`<div class="card"><h2>When in the year</h2>${I.termStrand?`<p class="small muted">Which term each content description shows up in. The tool reads “Term 1” to “Term 4” or “Semester 1” and “Semester 2” from headings, rows, the top of a table (terms across the weeks), sheet names and file names; a semester counts for both its terms (${Math.round(I.termShare*100)}% of your plan has a term).</p>
    <table><tr><th>Strand</th><th class="right">Term 1</th><th class="right">Term 2</th><th class="right">Term 3</th><th class="right">Term 4</th></tr>${I.termStrand.filter(x=>x.n).map(x=>`<tr><td><b>${x.s}</b> <span class="small muted">${x.n} content descriptions</span></td>${x.t.map(n=>`<td class="right">${n?n:'<span class="tag s-none">0</span>'}</td>`).join('')}</tr>`).join('')}</table>
    ${I.noTerm.length?`<div class="warn"><b>Not revisited:</b> no evidence of ${I.noTerm.map(esc).join('; ')}.</div>`:''}
    ${I.lateOnly.length?`<div class="warn"><b>Left to Term 4:</b> ${I.lateOnly.length} content description${I.lateOnly.length>1?'s appear':' appears'} only in Term 4 (${I.lateOnly.slice(0,14).map(r=>r.cd.code).join(', ')}${I.lateOnly.length>14?'…':''}).</div>`:''}
    <p class="small muted">${I.onceOnly.length} content description${I.onceOnly.length===1?' is':'s are'} taught in one term only.</p>
    <details><summary>Show every content description by term</summary><table><tr><th>Code</th><th>Content description</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th></tr>${R.rows.filter(r=>r.status!=='none'&&r.status!=='na').map(r=>`<tr><td><span class="code">${r.cd.code}</span></td><td class="small">${esc(r.cd.description)}</td>${[1,2,3,4].map(t=>`<td>${r.terms.includes(t)?'<span class="dot c"></span>':''}</td>`).join('')}</tr>`).join('')}</table></details>`
    :`<p class="small muted">The tool couldn’t find terms in these files${I.termShare?` (only ${Math.round(I.termShare*100)}% of the plan has one)`:''}. To use this view, put “Term 1” to “Term 4” (or “Semester 1” and “Semester 2”) in headings, across the top or down a column of your overview, in sheet names or in file names.</p>`}</div>`;
  // repeats
  const repCard=multi?`<div class="card"><h2>Repeated across levels</h2><p class="small muted">Texts or unit titles that appear in the plans of more than one level. The tool reads titles from the first column of tables and from quotation marks, so check each one.</p>${I.repeats.length?`<table><tr><th>Title</th><th>Levels</th><th>Files</th></tr>${I.repeats.map(o=>`<tr><td><b>${esc(o.title)}</b></td><td>${o.levels.map(l=>`<span class="lvlh">${LVNAME(l)}</span>`).join('')}</td><td class="small muted">${o.files.map(esc).join('; ')}</td></tr>`).join('')}</table>`:'<p class="small">No repeated titles found.</p>'}</div>`:'';
  // compare
  const C=cmpRows();
  const cmpCard=`<div class="card"><h2>Compare with a saved audit</h2><p class="small muted">Load an audit you saved earlier (last year’s, or the plans before they were rewritten) to see what has changed. Use <b>Save this audit</b> on the Report tab to make one.</p>
    <button class="btn sm" id="cmpPick">Choose a saved audit</button><input type="file" id="cmpIn" accept=".json" class="hide"> ${CMP?`<button class="btn sm ghost" id="cmpClear">Remove the comparison</button>`:''}
    ${C?`<p style="margin-top:10px">Comparing with <b>${esc(CMP.name||'saved audit')}</b>${CMP.saved?' (saved '+new Date(CMP.saved).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})+')':''}, on the ${C.both.length} content descriptions in both${C.only?` (${C.only} are only in this audit)`:''}.</p>
    <div class="tiles"><div class="tile nav"><div class="big">${C.was} → ${C.now}</div><div class="lab">covered then and now</div></div><div class="tile cov"><div class="big">${C.up.length}</div><div class="lab">improved</div></div><div class="tile none"><div class="big">${C.down.length}</div><div class="lab">gone backwards</div></div></div>
    <table><tr><th>Strand</th><th class="right">Covered then</th><th class="right">Covered now</th></tr>${SUBJ.strands.map(s=>{const rs=C.both.filter(r=>r.cd.strand===s);return rs.length?`<tr><td>${s}</td><td class="right">${rs.filter(r=>CMP.map[r.cd.code]==='cov').length}</td><td class="right">${rs.filter(r=>r.status==='cov').length}</td></tr>`:'';}).join('')}</table>
    ${[['Improved',C.up],['Gone backwards',C.down]].map(([t,l])=>l.length?`<h3>${t}</h3>${l.map(r=>`<div class="small" style="margin-top:4px"><span class="code">${r.cd.code}</span> ${esc(r.cd.description)} <span class="tag s-${CMP.map[r.cd.code]}">${STATUS[CMP.map[r.cd.code]]}</span> → ${tag(r.status)}</div>`).join('')}`:'').join('')}`:''}</div>`;
  return `<div class="note">These views look across the whole audit. They rest on the same word matching as the rest of the tool, so use them to decide where to look, then check the plans.</div>${I.termStrand?termCard:''}${foundCard}${checkCard}${asCard}${progCard}${I.termStrand?'':termCard}${repCard}${cmpCard}`;
}
bind.insights=()=>{
  $$('[data-pg]').forEach(b=>b.onclick=()=>{const [k,l]=b.dataset.pg.split('|');const p=insights().prog.find(x=>x.c.label===k);const x=p&&p.cells.find(c=>c.l===l);if(!x||!x.rs)return;
    $('#pgOut').innerHTML=`<div class="gap" style="margin-top:10px"><div class="h">${esc(k)}, ${LVNAME(l)} <button class="link" id="pgClose">close</button></div>${x.rs.map(r=>`<div class="small" style="margin-top:4px"><span class="code">${r.cd.code}</span> ${esc(r.cd.description)} ${tag(r.status)}</div>`).join('')}</div>`;
    $('#pgClose').onclick=()=>{$('#pgOut').innerHTML='';};});
  $('#cmpPick').onclick=()=>$('#cmpIn').click();
  $('#cmpIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.vlpAudit)throw 0;
      if((j.state.subject||'english')!==SUBJ.key){toast('That audit is for '+(SUBJECTS[j.state.subject||'english'].name)+'. Switch subject to compare it.');return;}
      const map=statusesOf(j.state);if(!map)throw 0;CMP={name:j.state.name,saved:j.saved,map};render();}catch(err){console.error(err);toast('That isn’t a saved audit file.');}};
  const c=$('#cmpClear');if(c)c.onclick=()=>{CMP=null;render();};
};

// ---------- branding ----------
const STD={main:'#1F1646',accent:'#D40032'};
const BPRE=[['Standard','#1F1646','#D40032'],['Forest','#1F4E3D','#B3261E'],['Ocean','#0B3C6E','#C2410C'],['Maroon','#6B1F2E','#1F5F8B'],['Teal','#0F5257','#B42318'],['Purple','#4A1D6E','#B8336A'],['Charcoal','#2D3138','#0B6E99'],['Royal blue','#1D3A8A','#B91C1C']];
const okHex=h=>/^#[0-9a-f]{6}$/i.test(h||'');
const lum=hex=>{const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
function brand(){return jget(BKEY)||(SCHOOL&&SCHOOL.brand)||jget('vlp.brand')||null;}
function bcol(k){const b=brand();const h=b&&okHex(b[k])?b[k]:STD[k];return h.replace('#','').toUpperCase();}
function schoolName(){const b=brand();return S.school||(b&&b.name)||'';}
function applyBrand(){const b=brand()||{};
  $('#brandCss').textContent=okHex(b.main)&&okHex(b.accent)?`:root{--navy:${b.main};--crimson:${b.accent}}`:'';
  const nm=$('#brandName');nm.textContent=(b.name||'').trim();nm.hidden=!nm.textContent;
  const img=$('#brandLogo');if(b.logo&&/^data:image\//.test(b.logo)){img.src=b.logo;img.hidden=false;}else{img.removeAttribute('src');img.hidden=true;}}

// ---------- saving into the school's SharePoint folder (the same connected folder as the other tools) ----------
const spOK=()=>typeof window.showDirectoryPicker==='function';
const SP={root:null,loaded:false};
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('vlp-save',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function kv(op,key,val){try{const db=await idb();return await new Promise((res,rej)=>{const tx=db.transaction('kv',op==='get'?'readonly':'readwrite'),st=tx.objectStore('kv');const r=op==='get'?st.get(key):op==='del'?st.delete(key):st.put(val,key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}catch(e){return undefined;}}
async function spRoot(){if(!SP.loaded){SP.root=(await kv('get','root'))||null;SP.loaded=true;}return SP.root;}
async function spPermit(h,ask){if(!h)return false;if(!h.queryPermission)return true;const o={mode:'readwrite'};if((await h.queryPermission(o))==='granted')return true;return ask?(await h.requestPermission(o))==='granted':false;}
const spPath=()=>['Curriculum audits',SUBJ.name];
async function deliver(blob,name){
  if(jget(SPKEY)===1&&spOK()){try{const root=await spRoot();if(root&&await spPermit(root,true)){let d=root;for(const p of spPath())d=await d.getDirectoryHandle(p,{create:true});
      const fh=await d.getFileHandle(name,{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();toast('Saved to '+[root.name,...spPath(),name].join(' › '),6000);return 'saved';}}
    catch(e){console.error(e);toast('Couldn’t save to the folder, so the file was downloaded.',5000);}}
  download(blob,name);return 'downloaded';}

// ---------- settings ----------
let BD=null;
function openSettings(){const b=brand()||{};BD={main:okHex(b.main)?b.main.toUpperCase():STD.main,accent:okHex(b.accent)?b.accent.toUpperCase():STD.accent,logo:b.logo||null,lw:b.lw||0,lh:b.lh||0,name:b.name||''};
  let m=$('#modal');if(!m){m=document.createElement('div');m.id='modal';document.body.appendChild(m);}m.innerHTML='<div class="dlg" role="dialog" aria-modal="true" aria-label="Settings"></div>';
  m.onclick=e=>{if(e.target===m)closeSettings();};renderSettings();}
function closeSettings(){const m=$('#modal');if(m)m.remove();}
async function renderSettings(msg){const d=$('#modal .dlg');if(!d)return;const root=spOK()?await spRoot():null;
  const wl=Object.entries(WORDS).flatMap(([s,o])=>Object.entries(o).flatMap(([code,ts])=>ts.map(t=>[s,code,t])));
  d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;color:var(--navy)">Settings</h2><button class="btn sm ghost" data-close>Close</button></div>
   <h3>School branding</h3><p class="small muted">Your school’s name, logo and colours on the tool and at the top of its reports.</p>
   <label class="small muted">School name</label><input type="text" id="bName" maxlength="80" value="${esc(BD.name)}" placeholder="School name">
   <div class="chips" style="margin-top:10px">${BPRE.map(([n,a,c])=>`<button class="chip ${BD.main===a&&BD.accent===c?'on':''}" data-pre="${a},${c}"><i class="sw" style="background:${a}"></i><i class="sw" style="background:${c}"></i>${n}</button>`).join('')}</div>
   <div class="row" style="align-items:center;margin-top:4px"><label class="small">Main colour <input type="color" id="bMain" value="${BD.main}"></label><label class="small">Accent colour <input type="color" id="bAcc" value="${BD.accent}"></label>
    <div class="small">${BD.logo?`<img src="${BD.logo}" alt="Your logo" style="max-height:40px;vertical-align:middle"> <button class="btn sm ghost" id="bLogoDel">Remove logo</button>`:''} <button class="btn sm ghost" id="bLogoBtn">${BD.logo?'Change':'Add a'} logo</button><input type="file" id="bLogo" accept="image/*" class="hide"></div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" id="bSave">Use these in this browser</button><button class="btn sm ghost" id="bStd">Back to the standard colours</button></div>
   <h3>SharePoint folder</h3>${spOK()?`<p class="small muted">Connect your school’s <b>Teaching and Learning</b> folder (the synced copy of the hub site’s Documents library). Reports then save straight into <b>Curriculum audits › ${SUBJ.name}</b>. It is the same folder the other tools use.</p>
    <p class="small">${root?`Connected to <b>${esc(root.name)}</b>.`:'No folder connected.'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" id="spC">${root?'Change folder':'Connect folder'}</button>${root?'<button class="btn sm ghost" id="spF">Disconnect</button>':''}<label class="small"><input type="checkbox" id="spOn" ${jget(SPKEY)===1?'checked':''} ${root?'':'disabled'}> Save reports into this folder instead of downloading them</label></div>`
    :'<p class="small muted">Saving straight into SharePoint works in <b>Edge</b> or <b>Chrome</b>. In this browser, files download as usual.</p>'}
   <h3>Our school’s words <span class="small muted">(${wl.length})</span></h3><p class="small muted">Program, routine or unit names your school uses, each tied to a content description. When the tool finds one, it counts as evidence. Add them on the <b>Content descriptions</b> tab under <b>Show evidence</b>.</p>
   ${wl.length?`<div style="max-height:170px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px 10px">${wl.map(([s,code,t])=>`<div class="small" style="display:flex;gap:8px;align-items:center"><span class="code">${code}</span><span style="flex:1">${esc(t)}</span><button class="x" style="background:none;border:0;color:var(--crimson)" data-wdel="${esc(s+'\u0001'+code+'\u0001'+t)}" title="Remove">✕</button></div>`).join('')}</div>`:'<p class="small">None yet.</p>'}
   <h3>Share with your staff</h3><p class="small muted">Makes a copy of this file with your branding and your school’s words built in. Audits, files and notes are never in it.</p>
   <button class="btn sm red" id="copyBtn">Save a copy for your school</button>
   <p class="small" id="setMsg" style="min-height:1.2em;color:var(--navy)">${esc(msg||'')}</p>`;
  const q=x=>d.querySelector(x);const say=t=>{q('#setMsg').textContent=t;};
  const bad=()=>contrast(BD.main,'#FFFFFF')<4.5?'The main colour is too light for white writing on it. Choose a darker one.':contrast(BD.accent,'#FFFFFF')<3?'The accent colour is too light to read on white. Choose a darker one.':'';
  q('[data-close]').onclick=closeSettings;q('#bName').oninput=e=>{BD.name=e.target.value;};
  d.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>{[BD.main,BD.accent]=b.dataset.pre.split(',');renderSettings();});
  q('#bMain').onchange=e=>{BD.main=e.target.value.toUpperCase();renderSettings(bad());};q('#bAcc').onchange=e=>{BD.accent=e.target.value.toUpperCase();renderSettings(bad());};
  q('#bLogoBtn').onclick=()=>q('#bLogo').click();const ld=q('#bLogoDel');if(ld)ld.onclick=()=>{BD.logo=null;renderSettings();};
  q('#bLogo').onchange=()=>{const f=q('#bLogo').files[0];if(!f)return;if(!/^image\//.test(f.type)){say('Choose a picture file (PNG or JPG).');return;}const r=new FileReader();
    r.onload=()=>{const img=new Image();img.onload=()=>{const k=Math.min(1,96/(img.naturalHeight||96),320/(img.naturalWidth||320)),w=Math.max(1,Math.round((img.naturalWidth||96)*k)),h=Math.max(1,Math.round((img.naturalHeight||96)*k));
        const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);BD.logo=c.toDataURL('image/png');BD.lw=w;BD.lh=h;renderSettings('Logo ready. Choose Use these in this browser to keep it.');};
      img.onerror=()=>say('That picture couldn’t be read. Try a PNG or JPG.');img.src=r.result;};r.readAsDataURL(f);};
  const keep=()=>{jput(BKEY,{main:BD.main,accent:BD.accent,logo:BD.logo,lw:BD.lw,lh:BD.lh,name:(BD.name||'').trim(),at:Date.now()});applyBrand();};
  q('#bSave').onclick=()=>{const e=bad();if(e){say(e);return;}keep();renderSettings('Done: this name, colours and logo are used in this browser and on your reports.');};
  q('#bStd').onclick=()=>{BD={main:STD.main,accent:STD.accent,logo:null,lw:0,lh:0,name:''};keep();renderSettings('Back to the standard colours, with no logo or school name.');};
  if(q('#spC'))q('#spC').onclick=async()=>{try{const h=await window.showDirectoryPicker({id:'vlp-teaching-learning',mode:'readwrite'});SP.root=h;SP.loaded=true;await kv('put','root',h);jput(SPKEY,1);renderSettings('Folder connected. Reports now save there.');}catch(e){if(e.name!=='AbortError')say('Couldn’t connect that folder.');}};
  if(q('#spF'))q('#spF').onclick=async()=>{SP.root=null;SP.loaded=true;await kv('del','root');jput(SPKEY,0);renderSettings('Folder disconnected.');};
  if(q('#spOn'))q('#spOn').onchange=e=>jput(SPKEY,e.target.checked?1:0);
  d.querySelectorAll('[data-wdel]').forEach(b=>b.onclick=()=>{const [s,code,t]=b.dataset.wdel.split('\u0001');delWord(s,code,t);analyse();render();renderSettings();});
  q('#copyBtn').onclick=()=>{const e=bad();if(e){say(e);return;}keep();try{schoolCopy();renderSettings('Saved a copy to your downloads. Share that file with your staff.');}catch(err){console.error(err);say('The copy couldn’t be made.');}};
}
function schoolCopy(){const c=document.documentElement.cloneNode(true);const q=x=>c.querySelector(x);
  ['#view','#tabs','#subj','#printArea'].forEach(x=>{q(x).innerHTML='';});c.querySelectorAll('.toast,#modal').forEach(e=>e.remove());q('#brandCss').textContent='';
  const img=q('#brandLogo');img.removeAttribute('src');img.setAttribute('hidden','');q('#brandName').textContent='';const old=q('#schoolSaved');if(old)old.remove();
  const s=document.createElement('script');s.type='application/json';s.id='schoolSaved';s.textContent=JSON.stringify({brand:brand(),words:WORDS}).replace(/</g,'\\u003c');q('head').appendChild(s);
  const nm=((brand()||{}).name||'school copy').replace(/[^\w\- ]+/g,'').trim()||'school copy';
  download(new Blob(['<!DOCTYPE html>\n',c.outerHTML],{type:'text/html'}),'VC Curriculum Audit - '+nm+'.html');}

// ---------- folders ----------
const OKEXT=/\.(docx|docm|dotx|pdf|pptx|xlsx|xlsm|csv|txt|md)$/i;
async function droppedFiles(dt){const entries=[...(dt.items||[])].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);const plain=[...dt.files];
  if(!entries.some(e=>e.isDirectory))return plain;const out=[];
  const walk=async(e,path)=>{if(e.isFile){const f=await new Promise((res,rej)=>e.file(res,rej));f._path=path+e.name;out.push(f);}
    else{const rd=e.createReader();let batch;do{batch=await new Promise((res,rej)=>rd.readEntries(res,rej));for(const ch of batch)await walk(ch,path+e.name+'/');}while(batch.length);}};
  for(const e of entries)await walk(e,'');return out;}

// ---------- Excel gap action plan ----------
async function buildGapXlsx(){
  const sub=SUBJ.key!=='maths';const head=['Level','Strand'].concat(sub?['Sub-strand']:[],['Code','Content description','Status','Look for'].concat(vlpOn()?['VLP lessons']:[],['Teacher note','Owner','Term','How we will address it','Progress']));
  const widths=[11,13].concat(sub?[24]:[],[13,52,15,46].concat(vlpOn()?[50]:[],[24,16,9,36,13]));
  const gaps=R.rows.filter(r=>r.status==='none'||r.status==='part').sort((a,b)=>LEVELS.indexOf(String(a.cd.level))-LEVELS.indexOf(String(b.cd.level))||SUBJ.strands.indexOf(a.cd.strand)-SUBJ.strands.indexOf(b.cd.strand)||(a.status==='none'?0:1)-(b.status==='none'?0:1));
  const col=n=>{let s='';n++;while(n){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
  const c=(r,i,t,s)=>`<c r="${col(i)}${r}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xe(t)}</t></is></c>`;
  const rows=[`<row r="1" ht="24" customHeight="1">${head.map((h,i)=>c(1,i,h,1)).join('')}</row>`];
  gaps.forEach((g,k)=>{const r=k+2;const v=[LVNAME(String(g.cd.level)),g.cd.strand].concat(sub?[g.cd.substrand]:[],[g.cd.code,g.cd.description,STATUS[g.status],lookFor(g)].concat(vlpOn()?[vlpLine(g.cd).replace(/^VLP: /,'')]:[],[S.notes[g.cd.code]||'','','','','Not started']));
    const si=head.indexOf('Status');rows.push(`<row r="${r}">${v.map((t,i)=>c(r,i,t,i===si?(g.status==='none'?4:3):2)).join('')}</row>`);});
  const last=gaps.length+1,L=col(head.length-1),pc=col(head.length-1),tc=col(head.indexOf('Term'));
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A1:${L}${Math.max(last,2)}"/>${gaps.length?`<dataValidations count="2"><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${pc}2:${pc}${last}"><formula1>"Not started,In progress,Done"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${tc}2:${tc}${last}"><formula1>"Term 1,Term 2,Term 3,Term 4"</formula1></dataValidation></dataValidations>`:''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const fill=h=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${h}"/><bgColor indexed="64"/></patternFill></fill>`;
  const xf=(font,fillId,extra='')=>`<xf numFmtId="0" fontId="${font}" fillId="${fillId}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"${extra}/></xf>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill(bcol('main'))}${fill(COL.part)}${fill(COL.none)}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC9C7D6"/></left><right style="thin"><color rgb="FFC9C7D6"/></right><top style="thin"><color rgb="FFC9C7D6"/></top><bottom style="thin"><color rgb="FFC9C7D6"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${xf(1,2)}${xf(0,0)}${xf(2,3)}${xf(2,4)}</cellXfs></styleSheet>`;
  const zip=new JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Gap action plan" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Gap action plan'!$A$1:$${L}$${Math.max(last,2)}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'Gap action plan'!$1:$1</definedName></definedNames></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/styles.xml',styles);zip.file('xl/worksheets/sheet1.xml',sheet);
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

// ---------- team summaries: one page per level ----------
async function buildTeamDocx(){
  const date=new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});const NV=bcol('main'),CR=bcol('accent');let body='';const I=insights();
  const lv=LEVELS.filter(l=>S.levels.includes(l));
  lv.forEach((l,k)=>{const rs=R.rows.filter(r=>String(r.cd.level)===l);const c=counts(rs);
    if(k)body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    body+=para(run(SUBJ.name+' curriculum audit: team summary',{b:1,sz:20,c:CR}),{after:0});
    body+=para(run(LVNAME(l),{b:1,sz:40,c:NV}),{after:40});
    body+=para(run([schoolName(),auditTitle(),date].filter(Boolean).join('  ·  '),{sz:18,c:'5D5A70'}),{after:120});
    body+=para(run(`${c.cov} of ${rs.length} content descriptions covered, ${c.part} partly covered, ${c.none} not evident.`,{b:1,sz:24}),{after:100});
    const sw=[3200,1700,1500,1700];
    body+=table(sw,SUBJ.strands.map(st=>{const x=rs.filter(r=>r.cd.strand===st);if(!x.length)return '';const cc=counts(x);return tr([cell(para(run(st,{b:1,sz:18})),{w:sw[0]}),cell(para(run(cc.cov+' / '+x.length,{b:1,sz:18,c:TXT.cov})),{w:sw[1],fill:COL.cov}),cell(para(run(String(cc.part),{sz:18,c:TXT.part})),{w:sw[2],fill:COL.part}),cell(para(run(String(cc.none),{sz:18,c:TXT.none})),{w:sw[3],fill:COL.none})]);}).filter(Boolean),['Strand','Covered','Partly','Not evident']);
    const gaps=rs.filter(r=>r.status==='none').concat(rs.filter(r=>r.status==='part'));const lf=r=>{const t=lookFor(r);return t.length>170?t.slice(0,167).replace(/\s+\S*$/,'')+'…':t;};
    // fit one page: stop adding gaps once the text would run over
    const top=[];let budget=2600;for(const r of gaps){const n=r.cd.description.length+lf(r).length*.8+90;if(top.length>=9||(top.length>=3&&budget-n<0))break;budget-=n;top.push(r);}
    body+=para(run(gaps.length?'Gaps to talk about first':'No gaps found',{b:1,sz:24,c:NV}),{before:160,after:60});
    const gw=[1400,6200,1500];
    if(top.length)body+=table(gw,top.map(r=>tr([cell(para(run(r.cd.code,{b:1,sz:16})),{w:gw[0]}),cell(para(run(r.cd.description,{sz:16}))+para(run('Look for: '+lf(r),{i:1,sz:14,c:'5D5A70'})),{w:gw[1]}),cell(para(run(STATUS[r.status],{b:1,sz:16,c:TXT[r.status]})),{w:gw[2],fill:COL[r.status]})])),['Code','Content description','Status']);
    if(gaps.length>top.length)body+=para(run(`Plus ${gaps.length-top.length} more: ${gaps.slice(top.length).map(r=>r.cd.code).join(', ')}.`,{sz:16,c:'5D5A70'}),{before:60});
    const br=I.breaks.filter(p=>p.breaks.includes(l));if(br.length)body+=para(run('Breaks in progression at this level: ',{b:1,sz:18})+run(br.map(p=>p.c.label).join('; ')+'.',{sz:18}),{before:100});
    body+=para(run('For discussion: Which of these do we teach in ways our plans don’t show? Which are real gaps, and where in the year will they go?',{i:1,sz:18,c:NV}),{before:140});
  });
  return packDocx(body,false);
}
