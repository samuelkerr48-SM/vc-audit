/* Curriculum Area Map Creator: interface */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const b64buf=id=>{const s=document.getElementById(id).textContent.trim();const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;};
// a built-in template for every learning area (tpl-<subject> in the page)
const BUILTIN={};Object.values(CM_SUBJECTS).forEach(s=>{if(document.getElementById('tpl-'+s.key))BUILTIN[s.key]={id:'tpl-'+s.key,name:'Curriculum coverage CAM spreadsheet - '+s.name+' '+(s.levels[0].split('-')[0])+'-'+s.levels[s.levels.length-1].split('-').pop()};});
const ST={subject:'maths',docs:[],units:[],T:null,tplBuf:null,tplName:'',custom:{},level:null,busy:0,
  state:{over:{},names:{},sems:{},removed:{},lvs:{},order:{},manual:[]},opts:{possible:false,notCovered:false},title:''};
function fresh(){ST.state={over:{},names:{},sems:{},removed:{},lvs:{},order:{},manual:[]};}
function toast(t,ms=4200){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>el.hidden=true,ms);}

// ---------- template ----------
async function setTemplate(){
  const c=ST.custom[ST.subject];ST.tplBuf=c?c.buf:b64buf(BUILTIN[ST.subject].id);ST.tplName=c?c.name:BUILTIN[ST.subject].name;
  useSubject(ST.subject);ST.T=await loadTemplate(ST.tplBuf);
  if(!ST.level||!ST.T.some(t=>t.name===ST.level))ST.level=null;
}
// ---------- the model ----------
function rebuild(){
  useSubject(ST.subject);
  const docs=ST.docs.filter(d=>d.subject===ST.subject);
  const units=buildUnits(docs,null);
  ST.state.manual.filter(m=>m.subject===ST.subject).forEach(m=>units.push({name:m.name,text:[],segs:[],lv:m.lv,level:m.lv,sem:null,term:null,key:m.key,src:['added by you'],event:false,manual:true}));
  units.forEach(u=>{const o=ST.state.lvs[u.key];if(o)u.lv=o;});
  scoreUnits(units);ST.units=units;
  if(!ST.levelChosen||!ST.level){const withUnits=ST.T.find(sh=>units.some(u=>u.lv===sh.level&&!u.event));ST.level=(withUnits||ST.T[0]).name;}
}
function sheetOf(name){return ST.T.find(s=>s.name===name);}
function plan(){return planFor(ST.units,ST.T,ST.state,ST.opts);}

// ---------- files ----------
async function addFiles(list){
  const files=[...list].filter(f=>!/^~\$|^\./.test(f.name));if(!files.length)return;
  ST.busy++;render();
  for(const f of files){
    try{const buf=await f.arrayBuffer();const r=await readAny(f.name,buf.slice(0));
      // replace a file of the same name
      ST.docs=ST.docs.filter(d=>!(d.name===f.name&&d.subject===ST.subject));
      const d={name:f.name,kind:r.kind,blocks:r.blocks,subject:ST.subject,buf};useSubject(ST.subject);d.U=findUnits(d);d.mode=d.U.mode;d.attach='auto';
      if(!d.U.words&&!d.U.split.length)throw new Error('No readable text found'+(r.kind==='PDF'?': this PDF may be a scan. Export it from the original file instead.':'.'));
      ST.docs.push(d);
    }catch(e){toast(f.name+': '+(e.message||e));console.error(e);}}
  ST.busy--;rebuild();render();
}
// ---------- rendering ----------
const SEMS=['','1','2'];
const STRAND_COL={Number:'#FFD966',Algebra:'#6D9EEB',Measurement:'#C27BA0',Space:'#76A5AF',Statistics:'#E06666',Probability:'#F6B26B',Language:'#FFD966',Literature:'#6D9EEB',Literacy:'#C27BA0'};
const STRAND_CYC=['#FFD966','#6D9EEB','#C27BA0','#76A5AF','#E06666','#F6B26B'];
function strandColour(st){return STRAND_COL[st]||(SUBJ&&SUBJ.strands.includes(st)?STRAND_CYC[SUBJ.strands.indexOf(st)%6]:'#ccc');}
function render(){
  const others=Object.values(CM_SUBJECTS).filter(s=>s.key!=='maths'&&s.key!=='english'&&BUILTIN[s.key]);
  $('#subj').innerHTML=Object.entries({maths:'Mathematics',english:'English'}).map(([k,v])=>`<button data-subj="${k}" class="${k===ST.subject?'on':''}">${v}</button>`).join('')+
    (others.length?`<select id="subjOther" class="${others.some(s=>s.key===ST.subject)?'on':''}"><option value="">Other learning areas…</option>${others.map(s=>`<option value="${s.key}" ${s.key===ST.subject?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`:'');
  const docs=ST.docs.filter(d=>d.subject===ST.subject);
  const view=$('#view');
  view.innerHTML=`
  <section class="card">
    <h2><span class="step">1</span> Add your plans</h2>
    <p class="muted">Yearly overviews, scopes and sequences, curriculum area plans (units across the weeks) and unit plans, as Word, Excel, PDF or PowerPoint. Add a unit plan with an overview and its detail counts towards that unit.</p>
    <label class="drop" id="drop"><input type="file" id="fileIn" multiple accept=".docx,.docm,.xlsx,.xlsm,.pdf,.pptx,.csv,.txt"><b>Drop files here</b> or <u>choose files</u>${ST.busy?'<span class="spin">Reading…</span>':''}</label>
    ${docs.length?`<table class="files"><thead><tr><th>File</th><th>What it holds</th><th>Read it as</th><th></th></tr></thead><tbody>${docs.map((d,i)=>fileRow(d)).join('')}</tbody></table>`:''}
    <p class="small muted tpl">Template: <b>${esc(ST.tplName)}</b>${ST.custom[ST.subject]?' (yours)':''} · ${ST.T?ST.T.length:0} tabs ·
      <button class="link" id="tplDl" title="The blank template, to fill in by hand or share">download it blank</button> · <label class="link">use a different template<input type="file" id="tplIn" accept=".xlsx" hidden></label>${ST.custom[ST.subject]?' · <button class="link" id="tplReset">use the built-in one</button>':''}</p>
  </section>
  ${ST.units.length||ST.state.manual.some(m=>m.subject===ST.subject)?mapCard():''}
  ${noLevelCard()}
  ${ST.units.length?downloadCard():''}`;
}
function fileRow(d){
  const real=d.U.split.filter(u=>!u.event);
  const out=d.U.split.filter(u=>u.event).map(u=>u.name).filter((n,i,a)=>a.indexOf(n)===i);
  const lvs=[...new Set(ST.units.filter(u=>u.src[0]===d.name).map(u=>u.lv).filter(Boolean))].sort((a,b)=>LV_ORDER.indexOf(a)-LV_ORDER.indexOf(b)).map(l=>l==='F'?'F':l);
  let what;
  if(d.mode==='split')what=`${real.length} unit${real.length===1?'':'s'}${lvs.length?' · '+(lvs.some(l=>/-/.test(l))?lvs.map(LVNAME).join(', '):(lvs.length>1?'Levels ':'Level ')+lvs.join(', ')):''}`;
  else if(d.attachedTo){const t=ST.units.find(u=>u.key===d.attachedTo);what=`Adds its detail to <b>${esc(t?((ST.state.names[t.key])||t.name):'a unit')}</b>`;}
  else what=`One unit: ${esc(d.U.whole.name)}${lvs.length?' · '+LVNAME(lvs[0]):''}`;
  const others=ST.units.filter(u=>u.src[0]!==d.name&&!u.event&&!u.manual);
  if(d.U.notes&&d.U.notes.length)what+=d.U.notes.filter(n=>d.mode==='split'||/lesson planner/.test(n)).map(n=>'<div class="small amber">'+esc(n)+'</div>').join('');
  if(out.length&&d.mode!=='whole')what+=`<div class="small muted" title="${esc(out.join('; '))}">Left out, not units of work: ${esc(out.slice(0,6).join('; '))}${out.length>6?' and '+(out.length-6)+' more':''}</div>`;
  if(d.kind==='PDF'&&d.mode==='whole'&&d.U.words>150)what+='<div class="small amber">A PDF’s tables can’t be read cell by cell, so an overview in a PDF reads as one unit. Use the Word or Excel file it came from.</div>';
  return `<tr data-doc="${esc(d.name)}"><td><b>${esc(d.name)}</b><div class="small muted">${d.kind} · ${d.U.words.toLocaleString()} words</div></td><td>${what}</td>
   <td><select class="mode">${real.length?`<option value="split" ${d.mode==='split'?'selected':''}>Each unit in it (${real.length})</option>`:''}<option value="whole" ${d.mode==='whole'?'selected':''}>The whole file is one unit</option></select>
   ${d.mode==='whole'?`<select class="attach"><option value="auto" ${d.attach==='auto'?'selected':''}>Match it to an overview unit</option><option value="own" ${d.attach==='own'?'selected':''}>Its own unit</option>${others.map(u=>`<option value="${esc(u.key)}" ${d.attach===u.key?'selected':''}>Add to: ${esc(u.lv?LVNAME(u.lv)+' · ':'')}${esc(u.name.slice(0,50))}</option>`).join('')}</select>`:''}</td>
   <td><button class="x" title="Remove this file">×</button></td></tr>`;
}
function noLevelCard(){
  const nl=ST.units.filter(u=>!u.lv&&!u.event);if(!nl.length)return '';
  return `<section class="card warncard"><h2>Units without a level (${nl.length})</h2><p class="muted">No level was found for these (no codes, and no level in the file name, tab or row). Choose one and each goes onto that level’s tab.</p>
   ${nl.map(u=>`<div class="nlrow" data-key="${esc(u.key)}"><span>${esc(u.name)} <span class="small muted">${esc(u.src.join(', '))}</span></span><select class="setlv"><option value="">Choose a level</option>${ST.T.map(s=>`<option value="${s.level}">${esc(s.name)}</option>`).join('')}</select></div>`).join('')}
   <p class="small"><button class="btn sm" id="allLv">Put them all on the tab I’m viewing</button></p></section>`;
}
function mapCard(){
  const P=plan();const sh=sheetOf(ST.level)||ST.T[0];const us=P[sh.name]||[];
  const all=ST.units.filter(u=>u.lv===sh.level&&!u.event);const removed=all.filter(u=>ST.state.removed[u.key]);
  const byKey=Object.fromEntries(ST.units.map(u=>[u.key,u]));
  const tabs=ST.T.map(s=>{const n=(P[s.name]||[]).length;return `<button class="tab ${s.name===sh.name?'on':''} ${n?'':'empty'}" data-tab="${esc(s.name)}">${esc(s.name.replace(/ \(optional\)/,''))}${n?` <span class="badge">${n}</span>`:''}</button>`;}).join('');
  const ticked=new Set(us.flatMap(u=>Object.keys(u.ticks)));
  let possible=0;us.forEach(pu=>{const u=byKey[pu.key];sh.codes.forEach(c=>{const h=u.hits&&u.hits[c.code];if(h&&h.st==='part'&&!pu.ticks[c.code]&&!((ST.state.over[u.key]||{})[c.code]!==undefined))possible++;});});
  const strandOf=c=>(SUBJ.cdBy[c]||{}).strand;
  const head=sh.codes.map(c=>{const cd=SUBJ.cdBy[c.code];return `<th class="code ${ticked.has(c.code)?'':'gap'}" title="${esc(cd?cd.description:'')}" style="--sc:${strandColour(strandOf(c.code))}"><span>${c.code.replace(/^VC2[A-Z]/,'')}</span></th>`;}).join('');
  const rows=us.map((pu,k)=>{const u=byKey[pu.key];const o=ST.state.over[u.key]||{};
    const cells=sh.codes.map(c=>{const v=pu.ticks[c.code];const h=u.hits&&u.hits[c.code];const ov=o[c.code];
      let cls='',txt='';if(v){txt=v;cls=ov!==undefined?'user':h&&h.st==='code'?'code':h&&h.st==='part'?'poss on':'ev';}
      else if(h&&h.st==='part'&&ov===undefined){txt='?';cls='poss';}else if(ov==='')cls='cleared';
      return `<td class="c ${cls}" data-code="${c.code}">${esc(txt)}</td>`;}).join('');
    return `<tr data-key="${esc(u.key)}"><td class="num">${k+1}</td><td class="uname"><input value="${esc(pu.name)}" class="nm" title="${esc((u.segs||[]).join(' ').slice(0,400))}">
      <div class="meta small"><label>Sem. <select class="sem">${SEMS.map(s=>`<option ${String(pu.sem||'')===s?'selected':''}>${s}</option>`).join('')}</select></label>
      <span class="ops"><button class="up" title="Move up">↑</button><button class="dn" title="Move down">↓</button><button class="rm" title="Take this unit off the map">×</button></span>
      <span class="muted src" title="${esc(u.src.join(' + '))}">${esc(u.src.join(' + '))}</span></div></td>${cells}</tr>`;}).join('');
  const gaps=sh.codes.filter(c=>!ticked.has(c.code));
  return `<section class="card" id="mapcard">
    <h2><span class="step">2</span> Check the map</h2>
    <div class="tabs">${tabs}</div>
    <p class="sum"><b>${us.length}</b> unit${us.length===1?'':'s'} on ${esc(sh.name)} · <b>${ticked.size}</b> of ${sh.codes.length} content descriptions ticked${possible?` · <b class="amber">${possible}</b> possible match${possible===1?'':'es'} to check <button class="btn sm" id="tickPoss">Tick all possible matches</button>`:''}
    ${us.length>sh.unitRows.length?` · <span class="muted">the tab gets ${us.length-sh.unitRows.length} more unit row${us.length-sh.unitRows.length===1?'':'s'}</span>`:''}</p>
    <div class="key small"><span class="c code">N1</span> code written in the plan <span class="c ev">N1</span> clear evidence <span class="c poss">?</span> possible: some evidence, not ticked <span class="c user">N1</span> set by you · click a cell to change it</div>
    <div class="gridwrap"><table class="grid"><thead><tr><th class="num">#</th><th class="uname">Unit title and semester</th>${head}</tr></thead><tbody>${rows||`<tr><td colspan="${2+sh.codes.length}" class="muted">No units on this tab yet.</td></tr>`}</tbody></table></div>
    <p class="small"><button class="btn sm" id="addUnit">+ Add a unit</button>${removed.length?` · Taken off: ${removed.map(u=>`<button class="link restore" data-key="${esc(u.key)}">${esc(u.name)} ↺</button>`).join(', ')}`:''}</p>
    ${us.length?(gaps.length?`<div class="gaps"><h3>Not ticked for any unit (${gaps.length})</h3>${gaps.map(c=>{const cd=SUBJ.cdBy[c.code];return `<div class="small"><span class="codechip">${c.code}</span> ${esc(cd?cd.description:'')}</div>`;}).join('')}</div>`:`<p class="ok">Every content description at this level is ticked for at least one unit.</p>`):''}
    ${thinNote(us,byKey)}
  </section>`;
}
function thinNote(us,byKey){if(!us.length)return '';const thin=us.filter(pu=>{const u=byKey[pu.key];return !u.manual&&!Object.keys(pu.ticks).length;});
  if(thin.length<Math.max(2,us.length*.4))return '';
  return `<p class="note">${thin.length} of these units have no ticks yet. A plan that only names units (such as a curriculum area plan) says little about what each teaches: add the unit plans and their detail counts towards each unit, or tick the possible matches you agree with.</p>`;}
function downloadCard(){
  return `<section class="card"><h2><span class="step">3</span> Download the map</h2>
   <p class="muted">Your template, filled in: unit titles and semesters down the side, an achievement standard number in each ticked cell (from the template’s own list), and more unit rows where a level has more than the template holds.</p>
   <div class="dl"><label>File name <input id="fname" value="${esc(defaultName())}"></label>
   <label class="chk"><input type="checkbox" id="optNC" ${ST.opts.notCovered?'checked':''}> Fill the other cells of each unit with “Not covered”</label>
   <button class="btn primary" id="dlBtn">Download the curriculum area map (.xlsx)</button>${CAN_AUDIT?' <button class="btn" id="auditBtn" title="Open VC Curriculum Audit with this map and the plans it was built from">Audit this map →</button>':''}</div>
   <p class="small muted">${CAN_AUDIT?'<b>Audit this map</b> opens VC Curriculum Audit with the map and your plans already added, so its curriculum area map check lists anything ticked but not evident in the plans, or evident but not ticked.':'Check it with VC Curriculum Audit: upload the map with the same plans, and its curriculum area map check lists anything ticked but not evident, or evident but not ticked.'}</p></section>`;
}
// ---------- hand the map to VC Curriculum Audit (same app, same site) ----------
const CAN_AUDIT=/^https?:/.test(location.protocol)&&/\/map-creator\/(index\.html)?$/.test(location.pathname);
function handoffDB(){return new Promise((res,rej)=>{const r=indexedDB.open('vc-handoff',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function auditThisMap(){
  const blob=await fillTemplate(ST.tplBuf,ST.T,plan(),{notCovered:ST.opts.notCovered});
  const name=(($('#fname')&&$('#fname').value)||defaultName()).trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\.xlsx$/i,'')+'.xlsx';
  const files=[{name,buf:await blob.arrayBuffer()}].concat(ST.docs.filter(d=>d.subject===ST.subject&&d.buf).map(d=>({name:d.name,buf:d.buf})));
  const P=plan();const levels=ST.T.filter(sh=>(P[sh.name]||[]).length).map(sh=>sh.level);
  const db=await handoffDB();await new Promise((res,rej)=>{const tx=db.transaction('h','readwrite');tx.objectStore('h').put({subject:ST.subject,files,levels,at:Date.now()},'pending');tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
  location.href='../#from-map-creator';
}
function defaultName(){const d=new Date();return `CAM ${SUBJ?SUBJ.name:''} ${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

// ---------- cell editor ----------
function openCell(td){
  closePop();const key=td.closest('tr').dataset.key,code=td.dataset.code;const u=ST.units.find(x=>x.key===key);const sh=sheetOf(ST.level);
  const cd=SUBJ.cdBy[code];const h=u.hits&&u.hits[code];const P=plan();const pu=(P[sh.name]||[]).find(x=>x.key===key);const cur=pu?pu.ticks[code]||'':'';
  const best=asFor(sh,code,(u.segs||[]).join(' '));
  const opts=sh.yesOnly?[sh.yesOnly]:sh.as.map(a=>a.label);
  const linked=sh.as.filter(a=>a.links.includes(code)).map(a=>a.label);
  const pop=document.createElement('div');pop.className='pop';pop.innerHTML=`
    <div class="small"><span class="codechip">${code}</span> ${esc(cd?cd.description:'')}</div>
    <div class="small why">${h?(h.st==='code'?esc(h.why):(h.st==='part'?'<b>Possible.</b> ':'<b>Clear evidence.</b> ')+esc(h.why)):'No evidence found in this unit’s plans.'}</div>
    <label class="small">Achievement standard <select id="popAs"><option value="">Not ticked</option>${opts.map(l=>{const a=sh.as.find(x=>x.label===l);return `<option value="${esc(l)}" ${l===cur?'selected':''}>${esc(l)}${linked.includes(l)?' ★':''}${a?' – '+esc(a.t.slice(0,70))+(a.t.length>70?'…':''):''}</option>`;}).join('')}</select></label>
    ${!sh.yesOnly&&linked.length?`<div class="small muted">★ VCAA links this content description to ${linked.join(', ')}.</div>`:''}
    <div class="row2"><button class="btn sm primary" id="popTick">${cur?'Save':'Tick ('+esc(best)+')'}</button><button class="btn sm" id="popClear">Clear</button>${(ST.state.over[key]||{})[code]!==undefined?'<button class="btn sm" id="popAuto">Back to automatic</button>':''}<button class="btn sm" id="popClose">Close</button></div>`;
  document.body.appendChild(pop);const r=td.getBoundingClientRect();
  pop.style.left=Math.min(window.innerWidth-pop.offsetWidth-12,Math.max(8,r.left+window.scrollX-120))+'px';pop.style.top=(r.bottom+window.scrollY+6)+'px';
  const set=v=>{(ST.state.over[key]=ST.state.over[key]||{})[code]=v;closePop();render();};
  $('#popTick').onclick=()=>set($('#popAs').value||best);
  $('#popClear').onclick=()=>set('');
  $('#popClose').onclick=closePop;
  if($('#popAuto'))$('#popAuto').onclick=()=>{delete ST.state.over[key][code];closePop();render();};
  $('#popAs').onchange=e=>{if(e.target.value)set(e.target.value);};
}
function closePop(){$$('.pop').forEach(p=>p.remove());}

// ---------- events ----------
document.addEventListener('click',async e=>{const t=e.target;
  if(t.matches('[data-subj]')){if(t.dataset.subj===ST.subject)return;ST.subject=t.dataset.subj;ST.level=null;ST.levelChosen=false;await setTemplate();rebuild();render();return;}
  if(t.matches('.tab')){ST.level=t.dataset.tab;ST.levelChosen=true;render();return;}
  if(t.matches('.files .x')){const n=t.closest('tr').dataset.doc;ST.docs=ST.docs.filter(d=>!(d.name===n&&d.subject===ST.subject));rebuild();render();return;}
  if(t.matches('td.c')){openCell(t);return;}
  if(!t.closest('.pop'))closePop();
  if(t.id==='tickPoss'){const sh=sheetOf(ST.level);ST.units.filter(u=>u.lv===sh.level).forEach(u=>{Object.entries(u.hits||{}).forEach(([c,h])=>{const o=ST.state.over[u.key]=ST.state.over[u.key]||{};if(h.st==='part'&&o[c]===undefined)o[c]=true;});});render();return;}
  const tr=t.closest('tr[data-key]');
  if(tr&&t.matches('.rm')){ST.state.removed[tr.dataset.key]=1;render();return;}
  if(t.matches('.restore')){delete ST.state.removed[t.dataset.key];render();return;}
  if(tr&&(t.matches('.up')||t.matches('.dn'))){const sh=sheetOf(ST.level);const keys=(plan()[sh.name]||[]).map(x=>x.key);const i=keys.indexOf(tr.dataset.key),j=i+(t.matches('.up')?-1:1);
    if(j<0||j>=keys.length)return;[keys[i],keys[j]]=[keys[j],keys[i]];ST.state.order[sh.name]=keys;render();return;}
  if(t.id==='addUnit'){const sh=sheetOf(ST.level);const name=prompt('Unit title');if(!name)return;ST.state.manual.push({key:'manual#'+Date.now(),name:name.trim(),lv:sh.level,subject:ST.subject});rebuild();render();return;}
  if(t.id==='allLv'){const sh=sheetOf(ST.level);ST.units.filter(u=>!u.lv&&!u.event).forEach(u=>{ST.state.lvs[u.key]=sh.level;});rebuild();render();return;}
  if(t.id==='tplReset'){delete ST.custom[ST.subject];await setTemplate();rebuild();render();return;}
  if(t.id==='tplDl'){const name=ST.tplName.replace(/[\\/:*?"<>|]+/g,'-')+'.xlsx';const blob=new Blob([ST.tplBuf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);toast('Downloaded '+name);return;}
  if(t.id==='auditBtn'){t.disabled=true;try{await auditThisMap();}catch(err){toast('Couldn’t open the audit: '+(err.message||err));console.error(err);t.disabled=false;}return;}
  if(t.id==='dlBtn'){t.disabled=true;try{const blob=await fillTemplate(ST.tplBuf,ST.T,plan(),{notCovered:ST.opts.notCovered});
    const name=(($('#fname').value||defaultName()).trim().replace(/[\\/:*?"<>|]+/g,'-').replace(/\.xlsx$/i,''))+'.xlsx';
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);toast('Downloaded '+name);}
    catch(err){toast('Couldn’t build the map: '+(err.message||err));console.error(err);}t.disabled=false;return;}
});
document.addEventListener('change',async e=>{const t=e.target;
  if(t.id==='fileIn'){await addFiles(t.files);t.value='';return;}
  if(t.id==='subjOther'){if(!t.value||t.value===ST.subject)return;ST.subject=t.value;ST.level=null;ST.levelChosen=false;await setTemplate();rebuild();render();return;}
  if(t.id==='tplIn'){const f=t.files[0];if(!f)return;try{const buf=await f.arrayBuffer();useSubject(ST.subject);await loadTemplate(buf);ST.custom[ST.subject]={buf,name:f.name.replace(/\.xlsx$/i,'')};await setTemplate();rebuild();render();toast('Using your template: '+f.name);}catch(err){toast(f.name+': '+(err.message||err));}return;}
  const dr=t.closest('tr[data-doc]');
  if(dr){const d=ST.docs.find(x=>x.name===dr.dataset.doc&&x.subject===ST.subject);if(t.matches('.mode'))d.mode=t.value;if(t.matches('.attach'))d.attach=t.value;rebuild();render();return;}
  const tr=t.closest('tr[data-key]');
  if(tr&&t.matches('.nm')){ST.state.names[tr.dataset.key]=t.value.trim();render();return;}
  if(tr&&t.matches('.sem')){ST.state.sems[tr.dataset.key]=t.value?+t.value:'';render();return;}
  const nl=t.closest('.nlrow');if(nl&&t.matches('.setlv')&&t.value){ST.state.lvs[nl.dataset.key]=t.value;rebuild();render();return;}
  if(t.id==='optNC'){ST.opts.notCovered=t.checked;return;}
});
document.addEventListener('dragover',e=>{e.preventDefault();const d=$('#drop');if(d)d.classList.add('over');});
document.addEventListener('dragleave',e=>{if(e.target.id==='drop')e.target.classList.remove('over');});
document.addEventListener('drop',async e=>{e.preventDefault();const d=$('#drop');if(d)d.classList.remove('over');
  const items=e.dataTransfer.items;const out=[];
  const walk=async en=>{if(en.isFile)await new Promise(r=>en.file(f=>{out.push(f);r();},r));else if(en.isDirectory){const rd=en.createReader();let batch;do{batch=await new Promise(r=>rd.readEntries(r,()=>r([])));for(const x of batch)await walk(x);}while(batch.length);}};
  if(items&&items.length&&items[0].webkitGetAsEntry){for(const it of [...items]){const en=it.webkitGetAsEntry();if(en)await walk(en);}}else out.push(...e.dataTransfer.files);
  await addFiles(out);});
window.addEventListener('beforeunload',e=>{if(ST.docs.length){e.preventDefault();e.returnValue='';}});
$('#helpBtn').onclick=()=>{$('#help').hidden=!$('#help').hidden;};
(async()=>{await setTemplate();rebuild();render();})();

window.CMC={get ST(){return ST;},get SUBJ(){return SUBJ;},kwScore,termsOf,plan};
