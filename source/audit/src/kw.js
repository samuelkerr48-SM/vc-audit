// ===================== Key terms from VCAA wording and elaborations =====================
// Each content description gets up to 10 distinctive terms (words and two-word phrases) drawn from its own wording and its
// VCAA elaborations, weighted so words common across the whole subject ("texts", "students") count for little.
// A plan that uses several of a content description's terms gives evidence for it. Also used to link
// achievement standard statements to content descriptions.
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

// Link each achievement standard statement to the content descriptions at its level that build it
function linkStandards(s){
  if(s._asLinked)return;prepSubject(s);
  Object.entries(s.standards||{}).forEach(([lv,list])=>{const cds=s.cds.filter(c=>String(c.level)===lv);
    list.forEach(st=>{
      // VCAA's own links from its achievement standard extracts
      if(st.cds&&st.cds.length){st.links=st.cds.filter(c=>s.cdBy[c]);const n={};st.links.forEach(c=>{const x=s.cdBy[c].strand;n[x]=(n[x]||0)+1;});
        st.strand=st.g||Object.keys(n).sort((a,b)=>n[b]-n[a])[0]||'';st.vcaa=true;return;}
      const T=termsOf(st.t);const trig=s.concepts.filter(c=>!c.opt&&c.t.test(st.t)).map(c=>c.id);
      const sc=cds.map(cd=>{let v=0;T.forEach(t=>{if(cd._all.has(t)){const f=(s._df.get(t)||0)/s._N;if(f<0.25)v+=s._idf(t)*(t.includes(' ')?1.6:1);}});
        if(trig.length&&cd.concepts&&cd.concepts.some(i=>trig.includes(i)))v+=3;return {cd,v};}).sort((a,b)=>b.v-a.v);
      const best=sc.length?sc[0].v:0;
      st.links=best>=2.5?sc.filter(x=>x.v>=Math.max(2.5,best*0.7)).slice(0,5).map(x=>x.cd.code):[];
      st.strand=st.links.length?s.cdBy[st.links[0]].strand:(st.g||'');});});
  s._asLinked=true;
}
