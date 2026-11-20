// ---------- VLP sequence suggestions for gaps ----------
// The Department's curriculum coverage guidance marks these content descriptions "Minimal content in VLPs"; the VLP Maths
// Repository has a supplementary lesson for each. (F–6 and 7–10A suggested learning programs, Version 1; VC2M10AA07 is
// left out: the VLPs teach it in L10-S03.)
const VLP_MINIMAL=new Set(('VC2M2SP01 VC2M3N07 VC2M3A01 VC2M3N09 VC2M3M05 VC2M4A01 VC2M4M03 VC2M4SP01 VC2M4SP02 VC2M5N04 VC2M5N09 VC2M5SP01 VC2M5ST01 '+
  'VC2M6N02 VC2M6N04 VC2M6N08 VC2M6SP01 VC2M6SP03 VC2M7A04 VC2M7A06 VC2M8A04 VC2M8M04 VC2M9A06 VC2M9M05 VC2M9SP03 VC2M10N01 VC2M10A03 VC2M10A15 '+
  'VC2M10A16 VC2M10M04 VC2M10ST04 VC2M10ASP01 VC2M10ASP02 VC2M10ASP03 VC2M10ASP04 VC2M10AST02 VC2M10AP02').split(' '));
const VLP_STORE='vlp.audit.catalogue';
let VLPCAT=null;try{VLPCAT=JSON.parse(localStorage.getItem(VLP_STORE)||'null');}catch(e){}
// Read a VLP tools file (VLP Maths Tools Primary or Secondary, or a VLP English tool): each sequence's id, title and the
// content description codes in its lessons. The tools keep their pages base64-encoded inside <script> tags, so every
// such block is decoded and searched too.
function vlpExtract(html){
  const texts=[html];
  for(const m of html.matchAll(/<script[^>]*>([A-Za-z0-9+\/=\s]{2000,})<\/script>/g)){try{texts.push(decodeURIComponent(escape(atob(m[1].replace(/\s+/g,'')))));}catch(e){}}
  // nested once more (a tool page that itself embeds base64 data)
  texts.slice(1).forEach(t=>{for(const m of t.matchAll(/<script[^>]*>([A-Za-z0-9+\/=\s]{2000,})<\/script>/g)){try{texts.push(decodeURIComponent(escape(atob(m[1].replace(/\s+/g,'')))));}catch(e){}}});
  const units={};const ID=/\\?"(?:unitId|id)\\?"\s*:\s*\\?"(L(?:F|\d{1,2}A?)-S(?:\d{1,2}[A-Z]?|UPP))\\?"/g;
  texts.forEach(t=>{const hits=[...t.matchAll(ID)];
    hits.forEach((h,k)=>{const end=k+1<hits.length?hits[k+1].index:Math.min(t.length,h.index+200000);const chunk=t.slice(Math.max(0,h.index-1500),end);
      const id=h[1];const u=units[id]=units[id]||{codes:[]};
      const own=t.slice(h.index,end);
      const tm=own.match(/\\?"seqTitle\\?"\s*:\s*\\?"([^"\\]{2,120})/)||chunk.match(/\\?"seqTitle\\?"\s*:\s*\\?"([^"\\]{2,120})/);if(tm&&!u.t)u.t=tm[1];
      for(const c of own.matchAll(/\bVC2[EM](?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}\b/g))if(!u.codes.includes(c[0]))u.codes.push(c[0]);});});
  Object.keys(units).forEach(id=>{if(!units[id].codes.length)delete units[id];});
  return units;
}
function vlpSaveCat(units,source){
  const old=(VLPCAT&&VLPCAT.units)||{};VLPCAT={units:{...old,...units},sources:[...new Set([...((VLPCAT&&VLPCAT.sources)||[]),source])],at:new Date().toISOString()};
  try{localStorage.setItem(VLP_STORE,JSON.stringify(VLPCAT));}catch(e){}
}
// The VLP sequences (from the loaded catalogue) whose lessons carry this code, with the level's own sequences first
function vlpFor(cd){
  const out=[];if(VLPCAT&&VLPCAT.units)Object.entries(VLPCAT.units).forEach(([id,u])=>{if(u.codes.includes(cd.code))out.push({id,t:u.t||''});});
  const lvTag='L'+(cd.level==='F'?'F':String(cd.level).replace('10A','10'))+'-';
  out.sort((a,b)=>(b.id.startsWith(lvTag)?1:0)-(a.id.startsWith(lvTag)?1:0)||a.id.localeCompare(b.id,undefined,{numeric:true}));
  return {seqs:out.slice(0,3),minimal:VLP_MINIMAL.has(cd.code)};
}
function vlpLine(cd){
  if(SUBJ.key!=='maths'&&SUBJ.key!=='english')return '';
  const v=vlpFor(cd);const bits=[];
  if(v.seqs.length)bits.push('VLP: '+v.seqs.map(s=>s.id+(s.t?' '+s.t:'')).join('; '));
  if(v.minimal)bits.push((bits.length?'the':'The')+' Department marks this as minimal content in the VLPs (the VLP Maths Repository has a supplementary lesson for it)');
  return bits.join('. ');
}
function vlpCard(){
  if(SUBJ.key!=='maths'&&SUBJ.key!=='english')return '';
  const n=VLPCAT&&VLPCAT.units?Object.keys(VLPCAT.units).length:0;
  return `<div class="small muted vlpbar">${n?`<b>VLP suggestions</b> from ${n} VLP sequences (${esc(VLPCAT.sources.join(', '))}). <button class="link" id="vlpAdd">Add another VLP tools file</button> · <button class="link" id="vlpClear">Clear</button>`
    :`<b>Suggest VLP sequences for gaps:</b> <button class="btn sm ghost" id="vlpAdd">Choose your VLP tools file</button> (VLP Maths Tools – Primary or Secondary). The tool reads which VLP sequences teach each content description and lists them under each gap. It stays in this browser.`}<input type="file" id="vlpIn" accept=".html,.htm" multiple class="hide"></div>`;
}
function bindVlp(){
  const a=$('#vlpAdd'),i=$('#vlpIn'),c=$('#vlpClear');if(!a)return;
  a.onclick=()=>i.click();
  if(c)c.onclick=()=>{VLPCAT=null;try{localStorage.removeItem(VLP_STORE);}catch(e){}render();};
  i.onchange=async()=>{let tot=0;for(const f of i.files){try{const u=vlpExtract(await f.text());const n=Object.keys(u).length;if(!n){toast(f.name+': no VLP sequences with content description codes found in this file.');continue;}vlpSaveCat(u,f.name.replace(/\.html?$/i,''));tot+=n;}catch(e){toast(f.name+': '+(e.message||e));}}
    if(tot)toast(tot+' VLP sequences read. Suggestions now show under each gap.');i.value='';render();};
}
