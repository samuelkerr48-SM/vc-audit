// ---------- VLP lessons for gaps (Mathematics) ----------
// Reference: VLP_REF (src/vlpref.js, built by build_vlpref.py from "VLP Maths – Units, lessons and content descriptions",
// the VLP Maths Tools 19.7 data, F–10A). seqs: [level, seq, title, strand]; les: [seq index, lesson, title, supplementary, codes, learning intention].
let VLP_BY=null;
function vlpIndex(){if(VLP_BY)return VLP_BY;VLP_BY={};
  (typeof VLP_REF!=='undefined'?VLP_REF.les:[]).forEach(l=>{l[4].split(' ').filter(Boolean).forEach(c=>{(VLP_BY[c]=VLP_BY[c]||[]).push(l);});});return VLP_BY;}
const vlpOn=()=>SUBJ&&SUBJ.key==='maths'&&typeof VLP_REF!=='undefined';
const vlpLv=l=>l==='F'?'Foundation':'Level '+l;
const vlpLes=l=>l[3]?'supplementary lesson '+l[1].replace(/^S/,'S'):'Lesson '+l[1];
// The VLP sequences that teach a content description: its own level's first, then the others; each with its lessons
function vlpFor(cd){
  const ls=vlpIndex()[cd.code]||[];const by=new Map();
  ls.forEach(l=>{if(!by.has(l[0]))by.set(l[0],[]);by.get(l[0]).push(l);});
  const own=String(cd.level);
  const out=[...by.entries()].map(([si,lessons])=>{const s=VLP_REF.seqs[si];return {lv:s[0],seq:s[1],t:s[2],strand:s[3],lessons,vlp:lessons.filter(l=>!l[3]).length};});
  out.sort((a,b)=>(b.lv===own)-(a.lv===own)||b.vlp-a.vlp||LEVELS.indexOf(a.lv)-LEVELS.indexOf(b.lv));
  return {seqs:out,suppOnly:ls.length>0&&ls.every(l=>l[3]),none:!ls.length};
}
function vlpSeqName(s){return vlpLv(s.lv)+(s.seq?' S'+s.seq:'')+' '+s.t;}
// One line for a gap: up to 3 sequences with their lesson numbers
function vlpLine(cd){
  if(!vlpOn())return '';const v=vlpFor(cd);
  if(v.none)return 'VLP: not taught in the VLP maths lessons.';
  const part=s=>{const n=s.lessons.filter(l=>!l[3]).map(l=>l[1]),sp=s.lessons.filter(l=>l[3]).map(l=>l[1]);
    return vlpSeqName(s)+' ('+[n.length?(n.length>1?'Lessons ':'Lesson ')+n.join(', '):'',sp.length?'supplementary '+sp.join(', '):''].filter(Boolean).join('; ')+')';};
  return 'VLP: '+v.seqs.slice(0,3).map(part).join(' · ')+(v.seqs.length>3?' · and '+(v.seqs.length-3)+' more':'')+(v.suppOnly?'. Supplementary lessons only: minimal content in the VLPs.':'');
}
function vlpCard(){
  if(!vlpOn())return '';
  return `<div class="small vlpbar"><b>VLP lessons</b> for each gap, from <i>${esc(VLP_REF.src)}</i>. <button class="btn sm ghost" id="vlpPrint">Print VLP lessons for the gaps</button></div>`;
}
function vlpGaps(){return R?R.rows.filter(r=>r.status==='none'||r.status==='part'):[];}
// A printable page: each gap with every VLP lesson that teaches it (title and learning intention)
function vlpHtml(){
  const gaps=vlpGaps();const date=new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  const lvs=LEVELS.filter(l=>gaps.some(r=>String(r.cd.level)===l));
  const body=lvs.map(l=>`<h2>${esc(LVNAME(l))}</h2>`+gaps.filter(r=>String(r.cd.level)===l).map(r=>{const v=vlpFor(r.cd);
    return `<div class="vg"><p><b>${r.cd.code}</b> ${esc(r.cd.description)} ${tag(r.status)}</p>${v.none?'<p class="mu">Not taught in the VLP maths lessons. Plan a lesson or unit for it.</p>':
      `<table><tr><th style="width:24%">VLP sequence</th><th style="width:16%">Lesson</th><th>Title and learning intention</th></tr>${v.seqs.map(s=>s.lessons.map((x,k)=>`<tr>${k?'':`<td rowspan="${s.lessons.length}"><b>${esc(vlpSeqName(s))}</b><div class="mu">${esc(s.strand)}</div></td>`}<td>${x[3]?'Supplementary '+esc(x[1]):'Lesson '+esc(x[1])}</td><td><b>${esc(x[2])}</b>${x[5]?`<div class="mu">${esc(x[5])}</div>`:''}</td></tr>`).join('')).join('')}</table>${v.suppOnly?'<p class="mu">Supplementary lessons only: the Department marks this as minimal content in the VLPs.</p>':''}`}</div>`;}).join('')).join('');
  return `<div class="pr"><h1>VLP lessons for the gaps: ${esc(auditTitle())}</h1><div>${esc(schoolName())}${schoolName()?' · ':''}${esc(levelLabel())} · ${date}</div>
    <p class="mu">Every content description not evident or only partly covered in the audit, with the VLP maths lessons that teach it. Source: ${esc(VLP_REF.src)}. Supplementary lessons are from the VLP Maths Repository, not VLP lessons.</p>
    <style>.pr .vg{break-inside:avoid;margin:8px 0 12px}.pr .mu{color:#5d5a70;font-size:10.5px}.pr table{width:100%;border-collapse:collapse}.pr td,.pr th{border:1px solid #c9c5d9;padding:3px 6px;vertical-align:top;font-size:11px;text-align:left}.pr th{background:#1F1646;color:#fff}</style>
    ${gaps.length?body:'<p>No gaps.</p>'}</div>`;
}
function vlpPrint(){$('#printArea').innerHTML=vlpHtml();window.print();}
// The same as a Word document (A4 portrait)
async function buildVlpDocx(){
  const NV=bcol('main');const gaps=vlpGaps();let body='';const date=new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  body+=para(run('VLP lessons for the gaps',{b:1,sz:36,c:NV}),{after:40});
  body+=para(run([schoolName(),auditTitle(),levelLabel(),date].filter(Boolean).join('  ·  '),{sz:18,c:'5D5A70'}),{after:80});
  body+=para(run('Every content description not evident or only partly covered in the audit, with the VLP maths lessons that teach it. Source: '+VLP_REF.src+'. Supplementary lessons are from the VLP Maths Repository, not VLP lessons.',{sz:17,c:'5D5A70'}),{after:120});
  const w=[2300,1300,5500];
  LEVELS.filter(l=>gaps.some(r=>String(r.cd.level)===l)).forEach(l=>{
    body+=para(run(LVNAME(l),{b:1,sz:28,c:NV}),{before:200,after:60});
    gaps.filter(r=>String(r.cd.level)===l).forEach(r=>{const v=vlpFor(r.cd);
      body+=para(run(r.cd.code+'  ',{b:1,sz:18})+run(r.cd.description,{sz:18})+run('  ('+STATUS[r.status]+')',{i:1,sz:16,c:TXT[r.status]}),{before:120,after:40});
      if(v.none){body+=para(run('Not taught in the VLP maths lessons. Plan a lesson or unit for it.',{i:1,sz:16,c:'5D5A70'}));return;}
      body+=table(w,v.seqs.flatMap(s=>s.lessons.map((x,k)=>tr([cell(para(run(k?'':vlpSeqName(s),{b:1,sz:16})),{w:w[0]}),cell(para(run(x[3]?'Supplementary '+x[1]:'Lesson '+x[1],{sz:16})),{w:w[1]}),cell(para(run(x[2],{b:1,sz:16}))+(x[5]?para(run(x[5],{sz:15,c:'5D5A70'})):''),{w:w[2]})]))),['VLP sequence','Lesson','Title and learning intention']);
      if(v.suppOnly)body+=para(run('Supplementary lessons only: the Department marks this as minimal content in the VLPs.',{i:1,sz:15,c:'5D5A70'}));});});
  if(!gaps.length)body+=para(run('No gaps.'));
  return packDocx(body,false);
}
function bindVlp(){const b=$('#vlpPrint');if(b)b.onclick=vlpPrint;}
