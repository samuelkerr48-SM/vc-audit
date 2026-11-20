function chunk(text,max=420){
  text=text.replace(/\s+/g,' ').trim(); if(!text) return [];
  if(text.length<=max) return [text];
  const out=[];let cur='';
  text.split(/(?<=[.!?;])\s+|\s+\|\s+/).forEach(s=>{ if((cur+' '+s).length>max&&cur){out.push(cur.trim());cur=s;} else cur+=' '+s; });
  if(cur.trim()) out.push(cur.trim());
  return out.flatMap(c=>c.length>max*1.6?c.match(new RegExp('.{1,'+max+'}(\\s|$)','g')).map(x=>x.trim()):[c]);
}
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
function thresholds(nSegs){return [Math.max(CFG.full,Math.round(nSegs*CFG.fullRel)),Math.max(CFG.half,Math.round(nSegs*CFG.halfRel))];}
function scoreCd(cd,H,fileIdx){
  const N=fileIdx==null?R_N:(S.files[fileIdx]?S.files[fileIdx].segs.length:0);const [tf,th]=thresholds(N);
  let sum=0,got=0;
  cd.concepts.forEach(id=>{const c=SUBJ.byId[id];const h=H[id];const n=fileIdx==null?h.w:(h.perFileW[fileIdx]||0);
    const v=n>=tf?1:n>=th?.5:0;if(c.opt){if(v){sum+=c.w*.5;got+=c.w*.5*v;}}else{sum+=c.w;got+=c.w*v;}});
  return sum?got/sum:0;
}
const STOP=new Set(('a an the and or but nor of to in on at by for with from into onto over under about as than then that this these those their there they them it its is are be been being was were has have had do does did can could may might will would should shall must not no yes so such also other others another each every all any some many much more most less least few several both either neither own same very just only even well how what when where which while who whom whose why if because through across between among within without during before after up down out off again further once here we our us you your he she his her i me my mine '+
  // curriculum and planning words that say little on their own
  'students student learn learning learnt teach teacher teaching lesson lessons unit units week weeks term terms level levels year years activity activities task tasks example examples including include includes included such using use used uses understand understanding understandings explore exploring explored identify identifying identified describe describing described explain explaining explained discuss discussing discussed recognise recognising recognised investigate investigating investigated develop developing developed create creating created apply applying applied demonstrate demonstrating consider considering considered make making made represent representing range ranges different various variety ways way type types form forms simple familiar key relevant appropriate specific related given new own others through e.g eg etc s t '+
  'keep keeps cause causes affect affects lead leads result results read reading show showing choose choosing chose build name order follow following check possible list involve involving involves express perform conduct obtain cover change period relate relating interpret interpreting compare comparing plan planning solve solving practical problem problems complete connect connecting communicate accord according remain observe observing number numbers one two first second part parts set sets need needs based context contexts situation situations idea ideas information purpose purposes').split(/\s+/));
function stem(w){
  if(w.length<4)return w;
  if(/ies$/.test(w)&&w.length>5)return w.slice(0,-3)+'y';
  if(/(ss|us|is)$/.test(w))return w;
  if(/sses$/.test(w))return w.slice(0,-2);
  if(/ing$/.test(w)&&w.length>6)return w.slice(0,-3).replace(/(.)\1$/,'$1');
  if(/ed$/.test(w)&&w.length>5&&!/eed$/.test(w))return w.slice(0,-2).replace(/(.)\1$/,'$1');
  if(/es$/.test(w)&&/(ch|sh|x|z)es$/.test(w))return w.slice(0,-2);
  if(/s$/.test(w)&&w.length>4)return w.slice(0,-1);
  return w;
}
function toks(text){return String(text).toLowerCase().replace(/[’']/g,'').split(/[^a-z0-9]+/).filter(Boolean);}
// stems in order, with stop words marked as gaps so phrases don't span them
const SURF=new Map(); // stem -> how it is usually written, for display
function stems(text){return toks(text).map(w=>{if(STOP.has(w)||/^\d+$/.test(w)&&w.length<3)return null;const s=stem(w);if(STOP.has(s))return null;let m=SURF.get(s);if(!m)SURF.set(s,m=new Map());m.set(w,(m.get(w)||0)+1);return s;});}
function surf(t){return t.split(' ').map(x=>{const m=SURF.get(x);if(!m)return x;let b=x,n=-1;m.forEach((c,w)=>{if(c>n||(c===n&&w.length<b.length)){b=w;n=c;}});return b;}).join(' ');}
function termsOf(text){const out=new Set();String(text).split(/[,;:.()|!?–—\/]+/).forEach(part=>{const s=stems(part);for(let i=0;i<s.length;i++){if(!s[i])continue;if(s[i].length>2)out.add(s[i]);if(s[i+1])out.add(s[i]+' '+s[i+1]);}});return out;}

// Build, once per subject, each content description's key terms and the subject's term weights
function prepSubject(s){
  if(s._kw)return;const N=s.cds.length||1;const df=new Map();
  const per=s.cds.map(cd=>{const d=termsOf(cd.description);const ec=new Map();(cd.el||[]).forEach(e=>termsOf(e).forEach(t=>ec.set(t,(ec.get(t)||0)+1)));
    const all=new Set([...d,...ec.keys()]);all.forEach(t=>df.set(t,(df.get(t)||0)+1));return {d,ec,all};});
  const idf=t=>Math.log((N+1)/((df.get(t)||0)+0.5));
  s._idf=idf;s._df=df;s._N=N;
  s.cds.forEach((cd,k)=>{const {d,ec,all}=per[k];const cand=[];
    all.forEach(t=>{const f=(df.get(t)||0)/N;if(f>0.12)return;const bi=t.includes(' ');const inD=d.has(t),nE=ec.get(t)||0;
      // phrases only from the content description itself; single words from it, or used in two or more elaborations
      if(bi&&!inD)return;if(!bi&&t.length<4)return;if(!inD&&nE<2)return;
      cand.push({t,w:idf(t)*(inD?2:1)*(bi?1.2:1),bi});});
    cand.sort((a,b)=>b.w-a.w);const keep=cand.slice(0,12);
    cd.kw=keep;cd._all=all;});
}
// Per file: which segments contain each term (built once per file and cached)
function kwIndex(f){
  if(f._k&&f._k.n===f.segs.length)return f._k.ix;const ix=new Map();
  f.segs.forEach((sg,si)=>{termsOf(sg).forEach(t=>{let a=ix.get(t);if(!a)ix.set(t,a=[]);a.push(si);});});
  f._k={n:f.segs.length,ix};return ix;
}
// Score a content description on a set of files from its key terms
function kwScore(cd,E){
  if(!cd.kw||!cd.kw.length||!E.length)return {score:0,hits:[]};
  const N=E.reduce((n,i)=>n+S.files[i].segs.length,0);const [tf,th]=thresholds(N);
  let sum=0,got=0;const hits=[];
  cd.kw.forEach(k=>{let n=0,nI=0,nP=0,c=0;const where=[];
    E.forEach(i=>{const f=S.files[i],ix=kwIndex(f),wt=meta(f).wt;(ix.get(k.t)||[]).forEach(si=>{const w=wt[si];n+=w;c++;if(w>1)nI++;if(w<1)nP++;where.push([i,si]);});});
    const v=n>=tf?1:n>=th?.5:0;sum+=k.w;got+=k.w*v;if(c)hits.push({t:k.t,n:c,nI,nP,v,where});});
  // Half the weighted terms found clearly is full evidence: plans never use all of a description's words
  // and breadth: one shared word is a coincidence, not evidence. Full needs three distinct terms, partly needs two
  const d=hits.filter(h=>h.v>0).length,K=cd.kw.length;const cap=d>=Math.min(3,K)?1:d>=Math.min(2,K)?CFG.covAt-.01:CFG.partAt-.01;
  return {score:sum?Math.min(cap,got/(sum*CFG.kwShare)):0,hits};
}
const kwLabel=surf;
function kwReAny(ts){return new RegExp(ts.map(t=>kwRe(t).source).join('|'),'i');}
function kwRe(t){const parts=t.split(' ').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[a-z]*');return new RegExp('\\b'+parts.join('\\s+(?:(?:the|a|an|of|and|to|in)\\s+)?')+'\\b','i');}

const RE_INTENT=/\b(learning (intention|goal|objective|focus)s?|success criteria|lesson (objective|focus|title)|objectives?|we are learning|WALT|WILF|I can\b|students will|we will\b|key (understandings?|ideas|concepts)|essential questions?|curriculum (links?|focus)|content descriptions?|achievement standards?|assessment|summative|outcomes?)/i;
const RE_PASS_MAT=/^\s*(materials?|resources?|equipment|you will need|what you need|preparation|set[- ]?up)\b\s*[:|]/i;
const RE_PASS_VOC=/^\s*((key |tier \d )?vocabulary|key (words|terms)|word (list|bank)|glossary)\b\s*[:|]/i;
function isList(s){const parts=s.split(/[,;]/);if(parts.length<9)return false;const short=parts.filter(p=>p.trim().split(/\s+/).length<=3).length;return short/parts.length>.85;}
function segWeight(s){if(RE_PASS_MAT.test(s))return CFG.wMat;if(RE_PASS_VOC.test(s)||isList(s))return CFG.wVoc;if(RE_INTENT.test(s.slice(0,160)))return CFG.wIntent;return 1;}
// per-file line weights and the term each line belongs to (0 = not known)
function meta(f){
  if(f._m&&f._m.n===f.segs.length&&f._m.k===CFG.wMat+'|'+CFG.wVoc+'|'+CFG.wIntent)return f._m;
  const wt=[],term=[];let cur=0;const fn=(f.name.replace(/[_.]+/g,' ').match(/\b(?:Term|T)\s?([1-4])\b/i)||[])[1];if(fn)cur=+fn;
  f.segs.forEach(s=>{wt.push(segWeight(s));const m=s.match(/\bTerm\s?([1-4])\b/i);
    if(m){const t=+m[1];if(s.length<90||/^\s*(Sheet: )?Term\s?[1-4]\b/i.test(s))cur=t;term.push(t);}else term.push(cur);});
  return f._m={n:f.segs.length,k:CFG.wMat+'|'+CFG.wVoc+'|'+CFG.wIntent,wt,term};
}
