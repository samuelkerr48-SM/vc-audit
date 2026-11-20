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
  // The VLP Maths Tools keep each tool's page base64-encoded in <script id="tool-…">; the Repository page holds the
  // data as JSON in <script id="vlpData"> ({"units/L03-S02": {unitId, seqTitle, lessons, lessonCodes:{n:[codes]}}, …}).
  const pages=[html];
  const b64=(src,id)=>{const i=src.indexOf('id="'+id+'"');if(i<0)return null;const s=src.indexOf('>',i)+1,e=src.indexOf('<\/script>',s);
    try{const bin=atob(src.slice(s,e).replace(/\s+/g,''));const u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);return new TextDecoder().decode(u);}catch(err){return null;}};
  for(const m of html.matchAll(/<script[^>]{0,80}id="(tool-[\w-]+)"/g)){const t=b64(html,m[1]);if(t)pages.push(t);}
  const units={};
  const add=(id,t,codes,added)=>{const u=units[id]=units[id]||{codes:[]};if(t&&!u.t)u.t=t;codes.forEach(c=>{if(c&&/^VC2[EM]/.test(c)&&!u.codes.includes(c))u.codes.push(c);});
    // codes taught only by lessons added to the sequence (supplementary lessons, not VLP lessons)
    if(added){u.added=(u.added||[]);added.forEach(c=>{if(c&&/^VC2[EM]/.test(c)&&!u.added.includes(c))u.added.push(c);});}};
  pages.forEach(t=>{const i=t.indexOf('id="vlpData"');if(i<0)return;const s=t.indexOf('>',i)+1,e=t.indexOf('<\/script>',s);let d;try{d=JSON.parse(t.slice(s,e));}catch(err){return;}
    Object.entries(d).forEach(([k,u])=>{if(!/^units\//.test(k)||!u)return;const id=u.unitId||k.slice(6);
      const vlp=Object.entries(u.lessonCodes||{}).filter(([n])=>!(u.lessons||[]).some(l=>String(l.num)===n&&l.code)).flatMap(([,c])=>c);
      const added=(u.lessons||[]).flatMap(l=>String(l.code||'').split(/[ ,;]+/)).filter(c=>c&&!vlp.includes(c));
      add(id,u.supplementary||/SUPP$/.test(id)?'Supplementary lessons':u.seqTitle,vlp.concat(added),added);});});
  if(!Object.keys(units).length){
    // another layout: every "unitId"/"id" value like L03-S04, with the codes up to the next one
    const ID=/\\?"(?:unitId|id)\\?"\s*:\s*\\?"(L(?:F|\d{1,2}A?)-S(?:\d{1,2}[A-Z]?|UPP))\\?"/g;
    pages.forEach(t=>{const hits=[...t.matchAll(ID)];
      hits.forEach((h,k)=>{const end=k+1<hits.length?hits[k+1].index:Math.min(t.length,h.index+200000);const own=t.slice(h.index,end);
        const tm=own.match(/\\?"seqTitle\\?"\s*:\s*\\?"([^"\\]{2,120})/);add(h[1],tm&&tm[1],[...own.matchAll(/\bVC2[EM](?:F|10A|\d{1,2})[A-Z]{1,3}\d{2}\b/g)].map(x=>x[0]));});});}
  Object.keys(units).forEach(id=>{if(!units[id].codes.length)delete units[id];});
  return units;
}
function vlpSaveCat(units,source){
  const old=(VLPCAT&&VLPCAT.units)||{};VLPCAT={units:{...old,...units},sources:[...new Set([...((VLPCAT&&VLPCAT.sources)||[]),source])],at:new Date().toISOString()};
  try{localStorage.setItem(VLP_STORE,JSON.stringify(VLPCAT));}catch(e){}
}
// The VLP sequences (from the loaded catalogue) whose lessons carry this code, with the level's own sequences first
function vlpFor(cd){
  const out=[];if(VLPCAT&&VLPCAT.units)Object.entries(VLPCAT.units).forEach(([id,u])=>{if(u.codes.includes(cd.code))out.push({id,t:u.t||'',added:/SUPP$/.test(id)||(u.added||[]).includes(cd.code)});});
  const lvTag='L'+(cd.level==='F'?'F':String(cd.level).replace('10A','10'))+'-';
  out.sort((a,b)=>(b.id.startsWith(lvTag)?1:0)-(a.id.startsWith(lvTag)?1:0)||a.id.localeCompare(b.id,undefined,{numeric:true}));
  return {seqs:out.slice(0,3),minimal:VLP_MINIMAL.has(cd.code)};
}
function vlpLine(cd){
  if(SUBJ.key!=='maths'&&SUBJ.key!=='english')return '';
  const v=vlpFor(cd);const bits=[];
  if(v.seqs.length)bits.push('VLP: '+v.seqs.map(s=>s.id+(s.t?' '+s.t:'')+(s.added&&!/SUPP$/.test(s.id)?' (supplementary lesson added to the sequence)':'')).join('; '));
  if(v.minimal)bits.push((bits.length?'Minimal':'The Department marks this as minimal')+' content in the VLPs'+(v.seqs.some(s=>s.added)?'':' (the VLP Maths Repository has a supplementary lesson for it)'));
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
