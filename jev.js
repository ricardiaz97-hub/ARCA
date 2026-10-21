/* ===== JEV+ · Jóvenes En Victoria =====
   Espacio propio dentro de Arca (verde neón y azul). Se carga DESPUÉS de index.html y solo se usa cuando el
   espacio activo es 'jev'; en Philly este archivo no hace nada.
   Colecciones (en arca_records, con space='jev'):
   - 'jevacts'   → actividades y cultos: título, tipo, fecha, hora, lugar, notas, quiénes sirven, quiénes van
   - 'jevideas'  → ideas de videos: título, descripción, link de referencia, votos, estado, nota de los líderes
   - 'jevprops'  → propuestas de actividades (pestaña Propuestas en Actividades): votos, quiénes ayudan, estado y su actividad
   Las personas, tareas y ajustes usan las colecciones normales de Arca (people, tasks, settings…). */

const JEV_KINDS=[['culto','Culto'],['actividad','Actividad'],['ensayo','Ensayo'],['reunion','Reunión'],['especial','Evento especial']];
const JEV_KIND=Object.fromEntries(JEV_KINDS);
const JEV_STATES=[['nueva','Nueva'],['aprobada','Aprobada'],['produccion','En producción'],['publicada','Publicada'],['descartada','Descartada']];
const JEV_STATE=Object.fromEntries(JEV_STATES);

/* Iconos del menú */
try{
  ICON.actividades='<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9.5 15 1.8 1.8L15 13"/>';
  ICON.ideas='<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/><path d="M9.5 9.2v5.6M6.7 12h5.6"/>';
  ICON.cumples='<path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M12 12V9M12 9c-1 0-1.5-1-1.5-1.8S12 5.5 12 5.5s1.5.9 1.5 1.7S13 9 12 9z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 2.5 1 4 0"/>';
}catch(_){}

const jevAll=()=>S.jevacts||[];
const jevIdeasAll=()=>S.jevideas||[];
const jevMgr=()=>!!ME&&(ADMIN()||MANAGERS.includes(ME));
const jevAt=a=>{const d=parse(a.date);const [h,m]=String(a.time||'00:00').split(':').map(Number);d.setHours(h||0,m||0,0,0);return d};
const jevTime=t=>{if(!t)return '';const [h,m]=String(t).split(':').map(Number);if(isNaN(h))return '';const ap=h>=12?'p. m.':'a. m.';return ((h%12)||12)+':'+String(m||0).padStart(2,'0')+' '+ap};
const jevWhen=d=>{const n=Math.round((parse(d)-parse(TODAY))/864e5);return n===0?'Hoy':n===1?'Mañana':n>1&&n<8?'En '+n+' días':n===-1?'Ayer':fDate(d)};
const jevUpcoming=()=>jevAll().filter(a=>a.date&&a.date>=TODAY).sort((x,y)=>(x.date+(x.time||'')).localeCompare(y.date+(y.time||'')));
const jevPast=()=>jevAll().filter(a=>a.date&&a.date<TODAY).sort((x,y)=>(y.date+(y.time||'')).localeCompare(x.date+(x.time||'')));
const jevFace=(pid,cls='jv-face')=>{const p=byId('people',pid);if(!p)return '';return p.photo?`<img class="${cls}" src="${assetUrl(p.photo)}" alt="${esc(p.name)}" title="${esc(p.name)}" loading="lazy">`:`<span class="${cls} bg${colorOf(p.id)}" title="${esc(p.name)}">${esc(initials(p.name))}</span>`};
const jevFirst=pid=>String(pName(pid)).split(/\s+/)[0];

/* ---------- Marca: logo y créditos del menú ---------- */
function spaceChrome(space){
  try{jevInstallIdentity(space)}catch(_){}
  const brand=document.querySelector('.rail .brand'),mlg=document.querySelector('.mbar .lg'),credit=document.querySelector('.rail-foot .credit'),mfb=document.querySelector('.mbar .fbl');
  if(space==='jev'){
    if(brand&&!brand.dataset.philly)brand.dataset.philly=brand.innerHTML;
    if(brand)brand.innerHTML='<img class="jevlogo-img" src="/img/jev-logo.webp" alt="JEV+ Jóvenes En Victoria" width="756" height="362">';
    if(mlg&&!mlg.dataset.philly){mlg.dataset.philly='1';mlg.style.display='none'}
    if(mfb)mfb.style.display='none';
    let mj=document.getElementById('jevMobileLogo');
    if(!mj){mj=document.createElement('div');mj.id='jevMobileLogo';mj.className='jevlogo sm';mj.innerHTML='<img class="jevlogo-img" src="/img/jev-logo.webp" alt="JEV+" width="756" height="362">';const bar=document.querySelector('.mbar');if(bar)bar.insertBefore(mj,bar.firstChild)}
    if(credit){if(!credit.dataset.philly)credit.dataset.philly=credit.innerHTML;credit.innerHTML='<span>JEV+ · Jóvenes En Victoria</span>'}
  }else{
    if(brand&&brand.dataset.philly){brand.innerHTML=brand.dataset.philly;delete brand.dataset.philly}
    if(mlg){mlg.style.display='';delete mlg.dataset.philly}
    if(mfb)mfb.style.display='';
    const mj=document.getElementById('jevMobileLogo');if(mj)mj.remove();
    if(credit&&credit.dataset.philly){credit.innerHTML=credit.dataset.philly;delete credit.dataset.philly}
  }
}

/* Al instalar la app desde JEV+, queda con su propio nombre e icono (Chrome/Android; iOS usa el icono de abajo). */
function jevInstallIdentity(space){
  const set=(sel,attrs)=>{const el=document.querySelector(sel);if(el)Object.assign(el,attrs)};
  const jev=space==='jev';
  set('link[rel=manifest]',{href:jev?'/manifest-jev.webmanifest':'/manifest.webmanifest'});
  set('link[rel=apple-touch-icon]',{href:jev?'/img/jev-apple-touch-icon.png':'/img/apple-touch-icon.png'});
  set('link[rel=icon]',{href:jev?'/img/jev-icon-192.png':'/img/icon-192.png'});
  const t=document.querySelector('meta[name=apple-mobile-web-app-title]');if(t)t.content=jev?'JEV+':'Arca';
}

/* ---------- Qué pantalla toca en cada ruta ---------- */
function spaceView(space,route){
  if(space!=='jev')return null;
  return {turno:vJevTu,inicio:vJevInicio,actividades:vJevActs,ideas:vJevIdeas,cumples:vJevCumples,culto:vJevCulto,propuesta:vJevProp}[route]||null;
}

/* ---------- Tarjeta de actividad ---------- */
function jevActCard(a,{past=false}={}){
  const d=parse(a.date),going=(a.going||[]).filter(id=>byId('people',id)),crew=(a.crew||[]).filter(id=>byId('people',id));
  const iGo=ME&&going.includes(ME),iServe=ME&&(crew.includes(ME)||jevAsg(a).some(x=>x.personId===ME));
  return `<article class="jv-act ${past?'past':''} k-${esc(a.kind||'actividad')}">
    <div class="jv-date" aria-hidden="true"><small>${esc(d.toLocaleDateString('es',{month:'short'}).replace('.',''))}</small><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString('es',{weekday:'short'}).replace('.',''))}</small></div>
    <div class="jv-body">
      <div class="jv-meta"><span class="jv-kind">${esc(JEV_KIND[a.kind]||'Actividad')}</span>${!past?`<span class="jv-when">${esc(jevWhen(a.date))}</span>`:''}${iServe?'<span class="jv-me">Te toca servir</span>':''}</div>
      <h3>${esc(a.title)}</h3>
      <p class="jv-sub">${[a.time?jevTime(a.time):'',a.place].filter(Boolean).map(esc).join(' · ')}</p>
      ${a.notes?`<p class="jv-notes">${esc(a.notes)}</p>`:''}
      ${jevAsgHtml(a)}
      ${!jevAsg(a).length&&crew.length?`<div class="jv-crew"><span class="lbl">Sirven</span><span class="jv-faces">${crew.map(id=>jevFace(id)).join('')}</span><span class="jv-names">${crew.map(jevFirst).map(esc).join(', ')}</span></div>`:''}
      <div class="jv-foot">
        ${!past&&ME?`<button class="btn sm ${iGo?'primary':''}" data-jev="go" data-id="${esc(a.id)}" aria-pressed="${!!iGo}">${iGo?'✓ Voy':'Voy a ir'}</button>`:''}
        ${going.length?`<span class="small muted">${going.length} ${going.length===1?'confirmó':'confirmaron'}</span>`:''}
        ${(()=>{const pr=jevPropsAll().find(x=>x.actId===a.id);return pr?`<button class="btn sm" data-jev="popen" data-id="${esc(pr.id)}">Logística y precios</button>`:''})()}
        <button class="btn sm" data-jev="plan" data-id="${esc(a.id)}">Ver plan${jevItems(a).length||jevAsg(a).length?'':jevMgr()?' (armarlo)':''}</button>
        ${jevMgr()?`<button class="btn ghost sm" data-jev="editact" data-id="${esc(a.id)}">Editar</button>`:''}
      </div>
    </div>
  </article>`;
}

/* ---------- Actividades ---------- */
function vJevActs(){
  const up=jevUpcoming(),past=jevPast().slice(0,12);
  const f=ui.jevKind||'';
  const keep=a=>!f||a.kind===f;
  const chips=`<div class="jv-chips" role="group" aria-label="Filtrar por tipo"><button class="chip ${f?'':'on'}" data-jev="kind" data-k="">Todo</button>${JEV_KINDS.map(([k,l])=>`<button class="chip ${f===k?'on':''}" data-jev="kind" data-k="${k}">${l}</button>`).join('')}</div>`;
  const list=up.filter(keep);
  const tab=ui.jevActTab==='props'?'props':'cal',nOpen=jevPropsAll().filter(p=>(p.status||'abierta')==='abierta').length;
  const tabs=`<div class="seg jv-tabs" role="group" aria-label="Sección"><button data-jev="acttab" data-k="cal" aria-pressed="${tab==='cal'}">Calendario</button><button data-jev="acttab" data-k="props" aria-pressed="${tab==='props'}">Propuestas${nOpen?` · ${nOpen}`:''}</button></div>`;
  const head=`<div class="head"><div><span class="gr" aria-hidden="true">ΛΑΤΡΕΙΑ</span><h1>Actividades</h1><p>${tab==='props'?'Ideas y propuestas del equipo: vota las que quieres que hagamos.':'Los cultos y todo lo que viene para JEV+.'}</p></div>
    <div class="row">${tab==='cal'&&jevMgr()?'<button class="btn primary" data-jev="newact">Nueva actividad</button>':''}${tab==='props'&&ME?'<button class="btn primary" data-jev="newprop">Proponer algo</button>':''}</div></div>${tabs}`;
  if(tab==='props')return head+jevPropsView();
  return `${head}
    ${chips}
    ${list.length?`<div class="jv-stack">${list.map(a=>jevActCard(a)).join('')}</div>`:`<section class="panel empty"><b>${up.length?'No hay actividades de ese tipo.':'Todavía no hay actividades.'}</b><p class="muted">${jevMgr()?'Toca “Nueva actividad” para agregar el próximo culto.':'Cuando los líderes agreguen el próximo culto, aparecerá aquí.'}</p></section>`}
    ${past.filter(keep).length?`<details class="tcard tfold jv-past"><summary><h2 class="th2">Anteriores</h2><p class="small">${past.filter(keep).length} reciente${past.filter(keep).length===1?'':'s'}</p></summary><div class="jv-stack">${past.filter(keep).map(a=>jevActCard(a,{past:true})).join('')}</div></details>`:''}`;
}

function jevEditAct(a={},{afterCreate}={}){
  const people=sortBy(S.people.filter(p=>p.status!=='inactivo'),p=>p.name).map(p=>[p.id,p.name]);
  openForm({title:a.id?'Editar actividad':'Nueva actividad',saveLabel:'Guardar',fields:[
    {id:'title',label:'Nombre',value:a.title,required:true,ph:'Culto de jóvenes, Noche de alabanza…'},
    {type:'pair',fields:[{id:'kind',label:'Tipo',type:'select',value:a.kind||'culto',options:JEV_KINDS},{id:'date',label:'Fecha',type:'date',value:a.date||TODAY,required:true}]},
    {type:'pair',fields:[{id:'time',label:'Hora',type:'time',value:a.time||'18:00'},{id:'place',label:'Lugar',value:a.place,ph:'Templo, salón…'}]},
    {id:'notes',label:'Notas para el equipo',type:'textarea',value:a.notes,ph:'Qué hay que llevar, quién abre, tema del culto…'}],
    onSave:async v=>{
      if(!v.title.trim()||!v.date){toast('Falta el nombre o la fecha.');return}
      const id=await save('jevacts',{...a,title:v.title.trim(),kind:v.kind,date:v.date,time:v.time,place:v.place.trim(),notes:v.notes.trim(),going:a.going||[],items:a.items||[],assignments:a.assignments||[],crew:a.crew||[],createdBy:a.createdBy||ME});
      if(id&&!a.id){if(afterCreate)await afterCreate(id);else toast('Actividad creada. Toca “Ver plan” para armar el orden y el equipo.')}},
    onDelete:a.id?()=>remove('jevacts',a.id):null});
}

async function jevToggleGo(id){
  const a=byId('jevacts',id);if(!a||!ME)return;
  const going=new Set(a.going||[]);going.has(ME)?going.delete(ME):going.add(ME);
  await save('jevacts',{...a,going:[...going]});render();
}

/* ---------- Propuestas de actividades (dentro de Actividades) ---------- */
/* Colección 'jevprops': {title, desc, kind, when, place, budget, votes:[pid], helpers:[pid], status, note, actId, authorId, createdAt}
   status: 'abierta' (se vota) · 'aprobada' (los líderes la quieren hacer) · 'programada' (ya es una actividad: actId) · 'descartada' */
const JEV_PSTATES=[['abierta','En votación'],['aprobada','Aprobada'],['programada','Programada'],['descartada','Descartada']];
const JEV_PSTATE=Object.fromEntries(JEV_PSTATES);
const jevPropsAll=()=>S.jevprops||[];
const jevPropVotes=p=>(p.votes||[]).filter(id=>byId('people',id));
const jevPropHelpers=p=>(p.helpers||[]).filter(id=>byId('people',id));
const jevPropOpen=p=>(p.status||'abierta')==='abierta'||p.status==='aprobada';
const jevPropSorted=f=>jevPropsAll().filter(p=>f?(p.status||'abierta')===f:p.status!=='descartada').sort((x,y)=>{
  const rank=p=>({aprobada:0,abierta:1,programada:2,descartada:3}[p.status||'abierta']??1);
  return rank(x)-rank(y)||jevPropVotes(y).length-jevPropVotes(x).length||String(y.createdAt||'').localeCompare(String(x.createdAt||''))});
/* La más votada entre las que siguen abiertas (solo si tiene al menos 2 votos y no hay empate). */
function jevPropTop(){
  const L=jevPropsAll().filter(p=>(p.status||'abierta')==='abierta').sort((x,y)=>jevPropVotes(y).length-jevPropVotes(x).length);
  if(!L.length||jevPropVotes(L[0]).length<2)return null;
  if(L[1]&&jevPropVotes(L[1]).length===jevPropVotes(L[0]).length)return null;
  return L[0].id;
}

function jevPropCard(p,{top=null}={}){
  const votes=jevPropVotes(p),helpers=jevPropHelpers(p),st=p.status||'abierta';
  const iVote=ME&&votes.includes(ME),iHelp=ME&&helpers.includes(ME),mine=ME&&p.authorId===ME;
  const act=p.actId&&byId('jevacts',p.actId);
  const canVote=!!ME&&jevPropOpen(p);
  const facts=[p.kind?JEV_KIND[p.kind]:'',p.when?'Para '+fDate(p.when):'',p.place,p.budget?'Costo aprox. $'+p.budget:''].filter(Boolean);
  return `<article class="jv-idea jv-prop st-${esc(st)} ${top===p.id?'is-top':''}">
    <button class="jv-vote ${iVote?'on':''}" data-jev="pvote" data-id="${esc(p.id)}" aria-pressed="${!!iVote}" aria-label="${iVote?'Quitar mi voto':'Votar por esta propuesta'}" ${canVote?'':'disabled'}><span aria-hidden="true">▲</span><b>${votes.length}</b></button>
    <div class="jv-body">
      <div class="jv-meta"><span class="jv-state ps-${esc(st)}">${esc(JEV_PSTATE[st]||'En votación')}</span>${top===p.id?'<span class="jv-top">🔥 La más votada</span>':''}${p.authorId?`<span class="small muted">Propuesta de ${esc(jevFirst(p.authorId))}</span>`:''}</div>
      <h3>${esc(p.title)}</h3>
      ${facts.length?`<p class="jv-sub">${facts.map(esc).join(' · ')}</p>`:''}
      ${votes.length?`<span class="sparks" role="img" aria-label="${votes.length} ${votes.length===1?'voto':'votos'}: ${jevSparks(votes.length)} de 5 destellos">${[0,1,2,3,4].map(k=>`<i class="${k<jevSparks(votes.length)?'on':''}"></i>`).join('')}</span>`:''}
      ${p.desc?`<p class="jv-notes">${esc(p.desc)}</p>`:''}
      ${jevPItems(p).length?`<p class="small muted" style="margin:6px 0 0">🧾 ${jevPItems(p).length} cosa${jevPItems(p).length===1?'':'s'} en la lista · cuota ${esc(jevMoney(jevPFee(p)))} por persona${jevPItems(p).some(it=>!it.who)?' · faltan responsables':''}</p>`:''}
      ${helpers.length?`<div class="jv-crew"><span class="lbl">Ayudan a organizar</span><span class="jv-faces">${helpers.map(id=>jevFace(id)).join('')}</span><span class="jv-names">${helpers.map(jevFirst).map(esc).join(', ')}</span></div>`:''}
      ${act?`<p class="jv-lnote"><span class="lbl">Ya está en el calendario</span>${esc(act.title)} · ${esc(fDate(act.date))}${act.time?' · '+esc(jevTime(act.time)):''}</p>`:''}
      ${p.note?`<p class="jv-lnote"><span class="lbl">Líderes</span>${esc(p.note)}</p>`:''}
      <div class="jv-foot">
        ${ME&&jevPropOpen(p)?`<button class="btn sm ${iHelp?'primary':''}" data-jev="phelp" data-id="${esc(p.id)}" aria-pressed="${!!iHelp}">${iHelp?'✓ Ayudo':'Yo ayudo'}</button>`:''}
        <button class="btn sm" data-jev="popen" data-id="${esc(p.id)}">Logística y precios${jevPItems(p).length?` · ${esc(jevMoney(jevPTotal(p)))}`:''}</button>
        ${act?`<button class="btn sm" data-jev="plan" data-id="${esc(act.id)}">Ver plan</button>`:''}
        ${jevMgr()&&jevPropOpen(p)?`<button class="btn primary sm" data-jev="psched" data-id="${esc(p.id)}">Programar</button>`:''}
        ${jevMgr()?`<button class="btn ghost sm" data-jev="pstatus" data-id="${esc(p.id)}">Estado y nota</button>`:''}
        ${mine&&st==='abierta'?`<button class="btn ghost sm" data-jev="pedit" data-id="${esc(p.id)}">Editar</button>`:''}
      </div>
    </div>
  </article>`;
}

function jevPropsView(){
  const f=ui.jevPState||'';
  const counts=Object.fromEntries(JEV_PSTATES.map(([k])=>[k,jevPropsAll().filter(p=>(p.status||'abierta')===k).length]));
  const chips=`<div class="jv-chips" role="group" aria-label="Filtrar propuestas"><button class="chip ${f?'':'on'}" data-jev="pstate" data-k="">Todas</button>${JEV_PSTATES.filter(([k])=>k!=='descartada'||counts.descartada).map(([k,l])=>`<button class="chip ${f===k?'on':''}" data-jev="pstate" data-k="${k}">${l}${counts[k]?` · ${counts[k]}`:''}</button>`).join('')}</div>`;
  const list=jevPropSorted(f),top=jevPropTop();
  const myVotes=ME?jevPropsAll().filter(p=>jevPropOpen(p)&&jevPropVotes(p).includes(ME)).length:0;
  const intro=`<div class="jv-pintro"><p>¿Qué te gustaría que hiciéramos? Una salida, un retiro, una noche de juegos, un culto especial… Propón, vota y apúntate a ayudar. Las más votadas los líderes las programan.</p>
    ${jevMgr()&&jevPropsAll().some(jevPropOpen)?'<div class="row"><button class="btn ghost" data-jev="pcopy">Copiar resultados para WhatsApp</button></div>':''}
    ${ME&&myVotes?`<p class="small muted" style="margin:8px 0 0">Has votado por ${myVotes} propuesta${myVotes===1?'':'s'}.</p>`:''}</div>`;
  return intro+(ME?'':'<div class="info warn" role="alert"><b>Tu perfil aún no está vinculado.</b> Pídele a un líder que agregue tu correo en Equipo para poder proponer y votar.</div>')+chips+
    (list.length?`<div class="jv-stack">${list.map(p=>jevPropCard(p,{top})).join('')}</div>`:`<section class="panel empty"><b>${jevPropsAll().length?'No hay propuestas en este estado.':'Aún no hay propuestas. ¡Lanza la primera!'}</b><p class="muted">Cualquiera del equipo puede proponer. Entre más votos, más rápido se hace.</p></section>`);
}

function jevEditProp(p={}){
  openForm({title:p.id?'Editar propuesta':'Proponer una actividad',saveLabel:p.id?'Guardar':'Enviar propuesta',
    intro:p.id?'':'<div class="info gold"><b>Cuéntala bien y suma votos</b><span>Di qué haríamos, para quién y por qué vale la pena. Si ya sabes cuándo, dónde o cuánto costaría, ponlo: ayuda a los líderes a decidir.</span></div>',
    fields:[
    {id:'title',label:'¿Qué propones?',value:p.title,required:true,ph:'Ej.: Noche de juegos y pizza, Retiro en la playa…'},
    {id:'desc',label:'Cuéntanos más',type:'textarea',value:p.desc,ph:'Qué haríamos, a quién invitaríamos, qué se necesita…'},
    {type:'pair',fields:[{id:'kind',label:'Tipo',type:'select',value:p.kind||'actividad',options:JEV_KINDS},{id:'when',label:'Fecha sugerida (opcional)',type:'date',value:p.when||''}]},
    {type:'pair',fields:[{id:'place',label:'Lugar (opcional)',value:p.place,ph:'Templo, parque, playa…'},{id:'budget',label:'Costo aprox. por persona ($)',type:'number',value:p.budget??''}]}],
    onSave:async v=>{
      if(!v.title.trim()){toast('Escribe qué propones.');return}
      const id=await save('jevprops',{status:'abierta',votes:p.id?(p.votes||[]):[ME],helpers:p.helpers||[],...p,title:v.title.trim(),desc:v.desc.trim(),kind:v.kind,when:v.when||'',place:v.place.trim(),budget:v.budget===''?'':Math.max(0,Number(v.budget)||0),authorId:p.authorId||ME,createdAt:p.createdAt||new Date().toISOString()});
      if(id&&!p.id){ui.jevActTab='props';toast('¡Listo! Tu propuesta ya se puede votar. Compártela con el grupo.')}},
    onDelete:p.id&&(p.authorId===ME||jevMgr())?()=>remove('jevprops',p.id):null});
}

function jevEditPropStatus(p){
  openForm({title:'Estado de la propuesta',saveLabel:'Guardar',intro:`<div class="info"><b>${esc(p.title)}</b><span>${jevPropVotes(p).length} voto${jevPropVotes(p).length===1?'':'s'} · ${jevPropHelpers(p).length} ayudan</span></div>`,fields:[
    {id:'status',label:'Estado',type:'select',value:p.status||'abierta',options:JEV_PSTATES},
    {id:'note',label:'Nota para el equipo',type:'textarea',value:p.note,ph:'Por qué sí o por qué no, qué falta, cuándo se haría…'}],
    onSave:async v=>{await save('jevprops',{...p,status:v.status,note:v.note.trim()})},
    onDelete:()=>remove('jevprops',p.id),delLabel:'Eliminar propuesta'});
}

async function jevTogglePropList(id,field){
  const p=byId('jevprops',id);if(!p||!ME||!jevPropOpen(p))return;
  const set=new Set(p[field]||[]);const on=!set.has(ME);on?set.add(ME):set.delete(ME);
  const ok=await save('jevprops',{...p,[field]:[...set]});
  if(ok&&on&&field==='helpers')toast('¡Gracias! Los líderes sabrán que cuentas para organizarla.');
  render();
}

/* Programar: abre el formulario de actividad ya lleno; al guardar, la propuesta queda ligada y los que ayudan pasan al equipo. */
function jevScheduleProp(p){
  const helpers=jevPropHelpers(p);
  jevEditAct({title:p.title,kind:p.kind||'actividad',date:p.when&&p.when>=TODAY?p.when:'',place:p.place||'',
    notes:[p.desc,p.budget?'Costo aprox. por persona: $'+p.budget:'',helpers.length?'Ayudan a organizar: '+helpers.map(pName).join(', '):''].filter(Boolean).join('\n'),
    crew:helpers,going:[]},
    {afterCreate:async actId=>{const cur=byId('jevprops',p.id)||p;await save('jevprops',{...cur,status:'programada',actId});toast('Programada. Quienes votaron ya la verán en el calendario.')}});
}

function jevPropsText(){
  const L=jevPropsAll().filter(jevPropOpen).sort((x,y)=>jevPropVotes(y).length-jevPropVotes(x).length);
  return `*Propuestas de JEV+ · ${fLong(TODAY)}*\n\n`+L.map((p,i)=>`${i+1}. ${p.title} — ${jevPropVotes(p).length} voto${jevPropVotes(p).length===1?'':'s'}${p.status==='aprobada'?' ✅ aprobada':''}${jevPropHelpers(p).length?`\n   Ayudan: ${jevPropHelpers(p).map(jevFirst).join(', ')}`:''}`).join('\n')+
    `\n\n¿Aún no votas? Entra a Arca → Actividades → Propuestas.`;
}
async function jevPropsCopy(){
  const txt=jevPropsText();
  try{await navigator.clipboard.writeText(txt);toast('Resultados copiados: pégalos en WhatsApp.')}
  catch(_){window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener')}
}

/* ---------- Logística y precios de una propuesta (pantalla 'propuesta') ---------- */
/* En el mismo registro de 'jevprops':
   items:  [{id, name, qty, price, link, cat, who, done}]  → lista de compras/materiales con precio unitario y link del súper
   meet:   {place, time, back, bring}                       → punto de encuentro, salida, regreso y qué lleva cada quien
   rides:  [{id, driver, seats, from}]                      → carros disponibles; riders:{rideId:[pid]}
   people: número de asistentes esperados (si falta, se usan los votos) · fee: cuota fija (si falta, se calcula) · paid:[pid] */
const JEV_CATS=[['comida','Comida y bebida'],['materiales','Materiales'],['transporte','Transporte'],['entradas','Entradas'],['otro','Otro']];
const JEV_CAT=Object.fromEntries(JEV_CATS);
const jevMoney=n=>'$'+(Math.round((Number(n)||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const jevPItems=p=>Array.isArray(p.items)?p.items:[];
const jevItemSub=it=>(Number(it.qty)||1)*(Number(it.price)||0);
const jevPTotal=p=>jevPItems(p).reduce((t,it)=>t+jevItemSub(it),0);
const jevPPeople=p=>Math.max(1,Number(p.people)||jevPropVotes(p).length||1);
const jevPFee=p=>Number(p.fee)>0?Number(p.fee):Math.ceil(jevPTotal(p)/jevPPeople(p)*4)/4; /* redondeado hacia arriba a $0.25 */
const jevPMayEdit=p=>!!ME&&(jevMgr()||p.authorId===ME);
const jevPRides=p=>Array.isArray(p.rides)?p.rides:[];
const jevPRiders=(p,rid)=>((p.riders||{})[rid]||[]).filter(id=>byId('people',id));
/* Busca el producto en los súper de El Salvador si no hay link. */
const jevShopSearch=q=>'https://www.google.com/search?q='+encodeURIComponent(q+' precio supermercado El Salvador');

function vJevProp(){
  const p=byId('jevprops',ui.jevPropId);
  if(!p)return `<div class="head"><div><h1>Propuesta</h1></div></div><section class="panel empty"><b>No encontré esa propuesta</b><p class="muted">Pudo haberse borrado.</p><button class="btn primary" data-jev="gotoprops">Volver a Propuestas</button></section>`;
  const ed=jevPMayEdit(p),mgr=jevMgr(),items=jevPItems(p),total=jevPTotal(p),fee=jevPFee(p);
  const st=p.status||'abierta',votes=jevPropVotes(p),iVote=ME&&votes.includes(ME);
  const byCat=JEV_CATS.map(([k,l])=>[k,l,items.filter(it=>(it.cat||'otro')===k)]).filter(x=>x[2].length);
  const done=items.filter(it=>it.done).length,claimed=items.filter(it=>it.who&&byId('people',it.who)).length;
  const itemRow=it=>{const who=it.who&&byId('people',it.who);const mineIt=ME&&it.who===ME;
    return `<li class="lg-item ${it.done?'done':''}">
      <button class="lg-check" data-jev="litdone" data-id="${esc(p.id)}" data-item="${esc(it.id)}" aria-pressed="${!!it.done}" aria-label="${it.done?'Marcar como pendiente':'Marcar como comprado o listo'}" ${ME?'':'disabled'}>${it.done?'✓':''}</button>
      <div class="lg-main"><b>${esc(it.name)}</b>${Number(it.qty)>1?` <span class="muted">× ${esc(it.qty)}</span>`:''}
        <div class="lg-sub">${Number(it.price)?`${esc(jevMoney(it.price))} c/u${Number(it.qty)>1?' · '+esc(jevMoney(jevItemSub(it))):''}`:'<span class="muted">Sin precio</span>'}
        · ${isUrl(it.link)?`<a href="${esc(it.link)}" target="_blank" rel="noopener">Ver en la tienda ↗</a>`:`<a href="${esc(jevShopSearch(it.name))}" target="_blank" rel="noopener" class="muted">Buscar precio ↗</a>`}</div></div>
      <div class="lg-who">${who?`<span class="lg-tag ${mineIt?'me':''}">${mineIt?'Lo llevas tú':'Lo lleva '+esc(jevFirst(it.who))}</span>`:''}
        ${ME&&(!who||mineIt)?`<button class="btn sm ${mineIt?'':'primary'}" data-jev="litclaim" data-id="${esc(p.id)}" data-item="${esc(it.id)}">${mineIt?'Ya no':'Yo lo llevo'}</button>`:''}
        ${ed||(ME&&mineIt)?`<button class="icon-btn" data-jev="litedit" data-id="${esc(p.id)}" data-item="${esc(it.id)}" aria-label="Editar ${esc(it.name)}">✎</button>`:''}</div>
    </li>`};
  const list=items.length?byCat.map(([k,l,L])=>`<h3 class="lg-cat">${esc(l)} <span class="muted">${esc(jevMoney(L.reduce((t,it)=>t+jevItemSub(it),0)))}</span></h3><ul class="lg-list">${L.map(itemRow).join('')}</ul>`).join('')
    :`<div class="empty" style="padding:14px"><b>La lista está vacía</b><p class="muted" style="margin:6px 0 0">Agrega lo que hay que comprar o llevar, con su precio y el link del súper.</p></div>`;
  const people=jevPPeople(p),paid=(p.paid||[]).filter(id=>byId('people',id));
  const payers=[...new Set([...votes,...jevPropHelpers(p),...paid])];
  const budget=`<section class="panel"><div class="panel-h"><h2>Presupuesto</h2>${ed?`<button class="btn ghost sm" data-jev="pbudget" data-id="${esc(p.id)}">Ajustar</button>`:''}</div><div class="panel-b">
    <div class="lg-stats"><div><b>${esc(jevMoney(total))}</b><span>costo total</span></div><div><b>${people}</b><span>persona${people===1?'':'s'}${Number(p.people)?'':' (según votos)'}</span></div><div class="hi"><b>${esc(jevMoney(fee))}</b><span>cuota por persona${Number(p.fee)?'':' (calculada)'}</span></div></div>
    ${items.length?`<div class="lg-prog"><span>Listo ${done}/${items.length}</span><i style="--w:${Math.round(done/items.length*100)}%"></i><span>Con responsable ${claimed}/${items.length}</span></div>`:''}
    ${fee>0?`<h3 class="lg-cat">Cuotas <span class="muted">${esc(jevMoney(paid.length*fee))} de ${esc(jevMoney(people*fee))}</span></h3>
      ${payers.length?`<ul class="lg-pay">${payers.map(id=>{const ok=paid.includes(id);return `<li><span>${jevFace(id)}</span><span class="grow">${esc(pName(id))}</span>${mgr?`<button class="btn sm ${ok?'primary':''}" data-jev="ppaid" data-id="${esc(p.id)}" data-pid="${esc(id)}" aria-pressed="${ok}">${ok?'✓ Pagó':'Marcar pagado'}</button>`:`<span class="lg-tag ${ok?'me':''}">${ok?'Pagó':'Pendiente'}</span>`}</li>`}).join('')}</ul>`:'<p class="small muted">Cuando la gente vote o se apunte, aparecerá aquí para marcar quién ya pagó.</p>'}`:''}
  </div></section>`;
  const m=p.meet||{};
  const meet=`<section class="panel"><div class="panel-h"><h2>Logística</h2>${ed?`<button class="btn ghost sm" data-jev="pmeet" data-id="${esc(p.id)}">Editar</button>`:''}</div><div class="panel-b lg-meet">
    ${m.place||m.time||m.back||m.bring?`${m.place?`<p><span class="lbl">Punto de encuentro</span>${isUrl(m.place)?`<a href="${esc(m.place)}" target="_blank" rel="noopener">Abrir en el mapa ↗</a>`:`${esc(m.place)} · <a href="https://www.google.com/maps/search/${encodeURIComponent(m.place)}" target="_blank" rel="noopener">Mapa ↗</a>`}</p>`:''}
      ${m.time?`<p><span class="lbl">Salida</span>${esc(jevTime(m.time))}</p>`:''}${m.back?`<p><span class="lbl">Regreso</span>${esc(jevTime(m.back))}</p>`:''}
      ${m.bring?`<p><span class="lbl">Cada quien lleva</span>${esc(m.bring)}</p>`:''}`:`<p class="muted" style="margin:0">${ed?'Pon el punto de encuentro, la hora de salida y regreso, y qué lleva cada quien.':'Los organizadores todavía no ponen la logística.'}</p>`}
  </div>
  <div class="panel-h" style="border-top:1px solid var(--line)"><h2>Transporte</h2>${ME?`<button class="btn ghost sm" data-jev="rideadd" data-id="${esc(p.id)}">Tengo carro</button>`:''}</div><div class="panel-b">
    ${jevPRides(p).length?`<ul class="lg-pay">${jevPRides(p).map(r=>{const rs=jevPRiders(p,r.id),free=Math.max(0,(Number(r.seats)||0)-rs.length),inIt=ME&&rs.includes(ME),mineR=ME&&r.driver===ME;
      return `<li><span>${jevFace(r.driver)}</span><span class="grow"><b>${esc(pName(r.driver))}</b><br><span class="small muted">${free} lugar${free===1?'':'es'} libre${free===1?'':'s'}${r.from?' · sale de '+esc(r.from):''}${rs.length?' · Van: '+rs.map(jevFirst).map(esc).join(', '):''}</span></span>
        ${ME&&!mineR&&(inIt||free>0)?`<button class="btn sm ${inIt?'primary':''}" data-jev="rideseat" data-id="${esc(p.id)}" data-ride="${esc(r.id)}">${inIt?'✓ Voy aquí':'Pedir lugar'}</button>`:''}
        ${mineR||mgr?`<button class="icon-btn" data-jev="rideedit" data-id="${esc(p.id)}" data-ride="${esc(r.id)}" aria-label="Editar carro">✎</button>`:''}</li>`}).join('')}</ul>`:'<p class="small muted" style="margin:0">¿Tienes carro? Ofrece lugares y los demás se apuntan.</p>'}
  </div></section>`;
  return `<div class="head"><div><span class="gr" aria-hidden="true">ΟΔΟΣ</span><h1>${esc(p.title)}</h1><p>${[JEV_PSTATE[st],p.when?'Para '+fDate(p.when):'',p.place].filter(Boolean).map(esc).join(' · ')}</p></div>
    <div class="row"><button class="btn ghost" data-jev="gotoprops">← Propuestas</button>
      ${ME&&jevPropOpen(p)?`<button class="btn ${iVote?'primary':''}" data-jev="pvote" data-id="${esc(p.id)}">${iVote?'✓ Votaste':'▲ Votar'} · ${votes.length}</button>`:''}
      <button class="btn" data-jev="lcopy" data-id="${esc(p.id)}">Copiar lista para WhatsApp</button>${p.actId&&byId('jevacts',p.actId)?`<button class="btn" data-jev="plan" data-id="${esc(p.actId)}">Ver plan</button>`:''}</div></div>
    ${p.desc?`<p class="jv-notes" style="margin:0 0 16px">${esc(p.desc)}</p>`:''}
    <div class="grid2"><div class="stack"><section class="panel"><div class="panel-h"><h2>Lista de compras y materiales</h2>${ME?`<button class="btn primary sm" data-jev="litadd" data-id="${esc(p.id)}">Agregar</button>`:''}</div><div class="panel-b">${list}</div></section></div>
    <div class="stack">${budget}${meet}</div></div>`;
}

function jevEditLItem(p,it={}){
  const ed=jevPMayEdit(p);
  openForm({title:it.id?'Editar':'Agregar a la lista',saveLabel:'Guardar',
    intro:it.id?'':'<div class="info"><b>Tip</b><span>Abre el producto en la página del súper (Walmart, Super Selectos, PriceSmart…), copia el link y pégalo aquí con su precio.</span></div>',
    fields:[
    {id:'name',label:'¿Qué hay que comprar o llevar?',value:it.name,required:true,ph:'Pizza grande, platos desechables, bocina…'},
    {type:'pair',fields:[{id:'qty',label:'Cantidad',type:'number',value:it.qty??1},{id:'price',label:'Precio c/u ($)',type:'number',value:it.price??''}]},
    {type:'pair',fields:[{id:'cat',label:'Categoría',type:'select',value:it.cat||'comida',options:JEV_CATS},{id:'who',label:'Quién lo lleva',type:'select',value:it.who||'',options:[['','Nadie todavía'],...sortBy(S.people.filter(x=>x.status!=='inactivo'),x=>x.name).map(x=>[x.id,x.name])]}]},
    {id:'link',label:'Link de la tienda (opcional)',type:'url',value:it.link,ph:'https://…'}],
    onSave:async v=>{
      if(v.link&&!isUrl(v.link)){toast('El link no parece válido.');return}
      const cur=byId('jevprops',p.id)||p,L=[...jevPItems(cur)];
      const n={id:it.id||uid(),done:!!it.done,...it,name:v.name.trim(),qty:Math.max(1,Number(v.qty)||1),price:v.price===''?'':Math.max(0,Number(v.price)||0),cat:v.cat,who:v.who,link:v.link.trim()};
      const i=L.findIndex(x=>x.id===n.id);if(i>=0)L[i]=n;else L.push(n);
      await save('jevprops',{...cur,items:L})},
    onDelete:it.id&&(ed||it.who===ME)?async()=>{const cur=byId('jevprops',p.id)||p;await save('jevprops',{...cur,items:jevPItems(cur).filter(x=>x.id!==it.id)})}:null});
}
async function jevLItemPatch(pid,itemId,fn){
  const p=byId('jevprops',pid);if(!p||!ME)return;
  await save('jevprops',{...p,items:jevPItems(p).map(x=>x.id===itemId?fn(x):x)});render();
}

function jevEditBudget(p){
  openForm({title:'Ajustar presupuesto',saveLabel:'Guardar',intro:`<div class="info"><b>Costo total: ${esc(jevMoney(jevPTotal(p)))}</b><span>Si dejas vacíos los campos, la cuota se calcula con el total entre los votos.</span></div>`,fields:[
    {type:'pair',fields:[{id:'people',label:'Personas esperadas',type:'number',value:p.people??''},{id:'fee',label:'Cuota fija por persona ($)',type:'number',value:p.fee??''}]}],
    onSave:async v=>{const cur=byId('jevprops',p.id)||p;await save('jevprops',{...cur,people:v.people===''?'':Math.max(1,Math.round(Number(v.people)||1)),fee:v.fee===''?'':Math.max(0,Number(v.fee)||0)})}});
}
function jevEditMeet(p){
  const m=p.meet||{};
  openForm({title:'Logística',saveLabel:'Guardar',fields:[
    {id:'place',label:'Punto de encuentro (dirección o link de Maps)',value:m.place,ph:'Frente al templo · https://maps.app.goo.gl/…'},
    {type:'pair',fields:[{id:'time',label:'Hora de salida',type:'time',value:m.time},{id:'back',label:'Hora de regreso',type:'time',value:m.back}]},
    {id:'bring',label:'Qué lleva cada quien',type:'textarea',value:m.bring,ph:'Biblia, ropa cómoda, bloqueador, $5 para la entrada…'}],
    onSave:async v=>{const cur=byId('jevprops',p.id)||p;await save('jevprops',{...cur,meet:{place:v.place,time:v.time,back:v.back,bring:v.bring}})}});
}
function jevEditRide(p,r={}){
  openForm({title:r.id?'Mi carro':'Ofrecer mi carro',saveLabel:'Guardar',fields:[
    {type:'pair',fields:[{id:'seats',label:'Lugares libres',type:'number',value:r.seats??3},{id:'from',label:'Sale de (opcional)',value:r.from,ph:'Colonia, punto…'}]}],
    onSave:async v=>{const cur=byId('jevprops',p.id)||p,L=[...jevPRides(cur)];const n={id:r.id||uid(),driver:r.driver||ME,seats:Math.max(1,Math.round(Number(v.seats)||1)),from:v.from};
      const i=L.findIndex(x=>x.id===n.id);if(i>=0)L[i]=n;else L.push(n);await save('jevprops',{...cur,rides:L})},
    onDelete:r.id?async()=>{const cur=byId('jevprops',p.id)||p;const riders={...(cur.riders||{})};delete riders[r.id];await save('jevprops',{...cur,rides:jevPRides(cur).filter(x=>x.id!==r.id),riders})}:null,delLabel:'Quitar carro'});
}
async function jevToggleSeat(pid,rid){
  const p=byId('jevprops',pid);if(!p||!ME)return;const riders={...(p.riders||{})};
  const was=(riders[rid]||[]).includes(ME);for(const k of Object.keys(riders))riders[k]=(riders[k]||[]).filter(x=>x!==ME);
  const r=jevPRides(p).find(x=>x.id===rid);
  if(!was){if(r&&jevPRiders({...p,riders},rid).length>=(Number(r.seats)||0)){toast('Ese carro ya está lleno.');return}riders[rid]=[...(riders[rid]||[]),ME]}
  await save('jevprops',{...p,riders});render();
}
async function jevTogglePaid(pid,who){
  const p=byId('jevprops',pid);if(!p||!jevMgr())return;const s=new Set(p.paid||[]);s.has(who)?s.delete(who):s.add(who);
  await save('jevprops',{...p,paid:[...s]});render();
}
function jevListText(p){
  const m=p.meet||{};
  return `*${p.title}*${p.when?' · '+fLong(p.when):''}\n`+
    (m.place||m.time?`📍 ${[m.place,m.time?'salida '+jevTime(m.time):'',m.back?'regreso '+jevTime(m.back):''].filter(Boolean).join(' · ')}\n`:'')+
    (m.bring?`🎒 Cada quien lleva: ${m.bring}\n`:'')+
    (jevPItems(p).length?`\n*Lista*\n`+jevPItems(p).map(it=>`${it.done?'✅':'⬜'} ${it.name}${Number(it.qty)>1?' ×'+it.qty:''}${Number(it.price)?' — '+jevMoney(jevItemSub(it)):''}${it.who&&byId('people',it.who)?' ('+jevFirst(it.who)+')':' (¿quién lo lleva?)'}${isUrl(it.link)?'\n   '+it.link:''}`).join('\n')+
      `\n\nTotal: ${jevMoney(jevPTotal(p))} · Cuota: ${jevMoney(jevPFee(p))} por persona`:'')+
    (jevPRides(p).length?`\n\n🚗 Carros: `+jevPRides(p).map(r=>(f=>`${jevFirst(r.driver)} (${f} lugar${f===1?'':'es'} libre${f===1?'':'s'})`)(Math.max(0,(Number(r.seats)||0)-jevPRiders(p,r.id).length))).join(', '):'')+
    `\n\nArca · JEV+`;
}
async function jevListCopy(pid){
  const p=byId('jevprops',pid);if(!p)return;const txt=jevListText(p);
  try{await navigator.clipboard.writeText(txt);toast('Lista copiada: pégala en WhatsApp.')}
  catch(_){window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener')}
}

/* ---------- Ideas de videos ---------- */
const jevSparks=n=>[1,2,4,7,11].filter(t=>n>=t).length;
const jevIdeaSorted=f=>jevIdeasAll().filter(i=>!f||i.status===f).sort((x,y)=>{
  const open=s=>s==='publicada'||s==='descartada'?1:0;
  return open(x.status)-open(y.status)||(y.votes||[]).length-(x.votes||[]).length||String(y.createdAt||'').localeCompare(String(x.createdAt||''))});

function jevIdeaCard(i){
  const votes=(i.votes||[]).filter(id=>byId('people',id)),iVote=ME&&votes.includes(ME),mine=ME&&i.authorId===ME;
  const st=i.status||'nueva';
  return `<article class="jv-idea st-${esc(st)}">
    <button class="jv-vote ${iVote?'on':''}" data-jev="vote" data-id="${esc(i.id)}" aria-pressed="${!!iVote}" aria-label="${iVote?'Quitar mi voto':'Votar por esta idea'}" ${ME?'':'disabled'}><span aria-hidden="true">▲</span><b>${votes.length}</b></button>
    <div class="jv-body">
      <div class="jv-meta"><span class="jv-state s-${esc(st)}">${esc(JEV_STATE[st]||'Nueva')}</span>${i.authorId?`<span class="small muted">Idea de ${esc(jevFirst(i.authorId))}</span>`:''}</div>
      <h3>${esc(i.title)}</h3>
      ${votes.length?`<span class="sparks" role="img" aria-label="${votes.length} ${votes.length===1?'voto':'votos'}: ${jevSparks(votes.length)} de 5 destellos">${[0,1,2,3,4].map(k=>`<i class="${k<jevSparks(votes.length)?'on':''}"></i>`).join('')}</span>`:''}
      ${i.desc?`<p class="jv-notes">${esc(i.desc)}</p>`:''}
      ${isUrl(i.ref)?`<a class="jv-link" href="${esc(i.ref)}" target="_blank" rel="noopener">Ver referencia ↗</a>`:''}
      ${jevPinsHtml(i)}
      ${st==='publicada'&&isUrl(i.videoUrl)?`<a class="btn primary sm" href="${esc(i.videoUrl)}" target="_blank" rel="noopener">▶ Ver el video</a>`:''}
      ${i.note?`<p class="jv-lnote"><span class="lbl">Líderes</span>${esc(i.note)}</p>`:''}
      <div class="jv-foot">
        ${jevMgr()?`<button class="btn sm" data-jev="status" data-id="${esc(i.id)}">Estado y nota</button>`:''}
        ${mine&&st==='nueva'?`<button class="btn ghost sm" data-jev="editidea" data-id="${esc(i.id)}">Editar mi idea</button>`:''}
      </div>
    </div>
  </article>`;
}

function vJevIdeas(){
  const f=ui.jevState||'';
  const counts=Object.fromEntries(JEV_STATES.map(([k])=>[k,jevIdeasAll().filter(i=>(i.status||'nueva')===k).length]));
  const chips=`<div class="jv-chips" role="group" aria-label="Filtrar por estado"><button class="chip ${f?'':'on'}" data-jev="state" data-k="">Todas</button>${JEV_STATES.filter(([k])=>k!=='descartada'||counts.descartada).map(([k,l])=>`<button class="chip ${f===k?'on':''}" data-jev="state" data-k="${k}">${l}${counts[k]?` · ${counts[k]}`:''}</button>`).join('')}</div>`;
  const list=jevIdeaSorted(f).filter(i=>f||(i.status!=='descartada'));
  return `<div class="head"><div><span class="gr" aria-hidden="true">ΕΥΑΓΓΕΛΙΟΝ</span><h1>Ideas de videos</h1><p>Manda tu idea y vota las que más te gusten. Los líderes eligen cuáles se graban.</p></div>
    <div class="row">${ME?'<button class="btn primary" data-jev="newidea">Mandar una idea</button>':''}</div></div>
    ${ME?'':'<div class="info warn" role="alert"><b>Tu perfil aún no está vinculado.</b> Pídele a un líder que agregue tu correo en Equipo para poder mandar ideas.</div>'}
    ${chips}
    ${list.length?`<div class="jv-stack">${list.map(jevIdeaCard).join('')}</div>`:`<section class="panel empty"><b>${jevIdeasAll().length?'No hay ideas en este estado.':'Aún no hay ideas. ¡Sé el primero!'}</b><p class="muted">Un reto, un testimonio, un sketch, un tutorial… lo que Dios ponga en tu corazón.</p></section>`}${(setTimeout(jevLoadPins,60),'')}`;
}

function jevEditIdea(i={}){
  openForm({title:i.id?'Editar mi idea':'Mandar una idea de video',saveLabel:i.id?'Guardar':'Enviar idea',
    intro:i.id?'':'<div class="info gold"><b>Una idea clara se graba más rápido</b><span>Cuéntanos de qué trata, a quién le habla y, si tienes, un video parecido como referencia. ¿Te inspiró algo en Pinterest? Guarda el pin y pega aquí su link (si no la tienes, <a href="https://www.pinterest.com/download/" target="_blank" rel="noopener">descárgala</a>).</span></div>',
    fields:[
    {id:'title',label:'Título de la idea',value:i.title,required:true,ph:'Ej.: “3 cosas que aprendí en mi primer año sirviendo”'},
    {id:'desc',label:'¿De qué trata?',type:'textarea',value:i.desc,ph:'Qué se vería, quién saldría, qué queremos que sienta quien lo vea…'},
    {id:'ref',label:'Video de referencia (opcional)',type:'url',value:i.ref,ph:'https://www.youtube.com/…'},
    {id:'pins',label:'Pines de Pinterest (uno por línea)',type:'textarea',value:(i.pins||[]).join('\n'),ph:'https://pin.it/… o https://www.pinterest.com/pin/…'}],
    onSave:async v=>{
      if(!v.title.trim()){toast('Ponle un título a tu idea.');return}
      if(v.ref&&!isUrl(v.ref)){toast('El link de referencia no parece válido.');return}
      const pr=jevParsePins(v.pins);if(pr.bad.length){toast('Este link no parece de Pinterest: '+pr.bad[0]);return}
      const id=await save('jevideas',{status:'nueva',votes:i.id?(i.votes||[]):[ME],...i,title:v.title.trim(),desc:v.desc.trim(),ref:v.ref.trim(),pins:pr.ok,authorId:i.authorId||ME,createdAt:i.createdAt||new Date().toISOString()});
      if(id&&!i.id)toast('¡Gracias! Tu idea ya la pueden votar.')},
    onDelete:i.id&&(i.authorId===ME||jevMgr())?()=>remove('jevideas',i.id):null});
}

function jevEditStatus(i){
  openForm({title:'Estado de la idea',saveLabel:'Guardar',intro:`<div class="info"><b>${esc(i.title)}</b></div>`,fields:[
    {id:'status',label:'Estado',type:'select',value:i.status||'nueva',options:JEV_STATES},
    {id:'note',label:'Nota para el equipo',type:'textarea',value:i.note,ph:'Fecha de grabación, quién la lleva, ajustes…'},
    {id:'videoUrl',label:'Link del video publicado (cuando ya salió)',type:'url',value:i.videoUrl,ph:'https://www.youtube.com/…'}],
    onSave:async v=>{const ok=await save('jevideas',{...i,status:v.status,note:v.note.trim(),videoUrl:v.videoUrl.trim()});if(ok&&v.status==='publicada'&&i.status!=='publicada'){try{estBurst()}catch(_){}toast('¡Video publicado! 🎬')}},
    onDelete:()=>remove('jevideas',i.id),delLabel:'Eliminar idea'});
}

async function jevToggleVote(id){
  const i=byId('jevideas',id);if(!i||!ME)return;
  const votes=new Set(i.votes||[]);votes.has(ME)?votes.delete(ME):votes.add(ME);
  await save('jevideas',{...i,votes:[...votes]});render();
}

/* ---------- Inicio ---------- */
function vJevInicio(){
  const hour=now.getHours();const greet=hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches';
  const first=ME?jevFirst(ME):'';
  const up=jevUpcoming(),next=up[0];
  const ideas=jevIdeaSorted('').filter(i=>(i.status||'nueva')==='nueva'||i.status==='aprobada'||i.status==='produccion').slice(0,3);
  const inProd=jevIdeasAll().filter(i=>i.status==='produccion').length;
  const newIdeas=jevIdeasAll().filter(i=>(i.status||'nueva')==='nueva').length;
  const head=`<div class="head"><div><span class="gr" aria-hidden="true">ΝΙΚΗ</span><h1>${greet}${first?', '+esc(first):''}</h1><p>${esc(fLong(TODAY).replace(/^./,c=>c.toUpperCase()))} · JEV+, Jóvenes En Victoria.</p></div></div>`;
  const hero=next?`<section class="jv-hero"><div class="jv-hero-in">
      <span class="jv-tag">Lo que sigue</span>
      <h2>${esc(next.title)}</h2>
      <p class="jv-hero-when">${esc(jevWhen(next.date))}${next.time?' · '+esc(jevTime(next.time)):''}${next.place?' · '+esc(next.place):''}</p>
      <div class="row">${ME?`<button class="btn ${(next.going||[]).includes(ME)?'primary':''}" data-jev="go" data-id="${esc(next.id)}">${(next.going||[]).includes(ME)?'✓ Voy':'Voy a ir'}</button>`:''}<button class="btn ghost" data-go="actividades">Ver todas</button></div>
    </div></section>`
    :`<section class="panel empty"><b>Aún no hay actividades programadas</b><p class="muted">${jevMgr()?'Agrega el próximo culto en Actividades.':'Pronto verás aquí el próximo culto.'}</p>${jevMgr()?'<button class="btn primary" data-go="actividades">Ir a Actividades</button>':''}</section>`;
  const stats=`<div class="jv-stats"><div><b>${up.length}</b><span>próxima${up.length===1?'':'s'} actividad${up.length===1?'':'es'}</span></div><div><b>${newIdeas}</b><span>idea${newIdeas===1?'':'s'} por revisar</span></div><div><b>${inProd}</b><span>video${inProd===1?'':'s'} en producción</span></div><div><b>${S.people.filter(p=>p.status!=='inactivo').length}</b><span>en el equipo</span></div></div>`;
  const ideaPanel=`<section class="panel"><div class="panel-h"><h2>Ideas de videos</h2><button class="btn ghost sm" data-go="ideas">Ver todas</button></div>
    ${ideas.length?`<div class="jv-stack tight">${ideas.map(jevIdeaCard).join('')}</div>`:`<div class="empty" style="padding:18px"><p class="muted" style="margin:0 0 10px">Todavía no hay ideas.</p>${ME?'<button class="btn primary" data-jev="newidea">Mandar la primera</button>':''}</div>`}</section>`;
  const more=up.slice(1,4);
  const actPanel=more.length?`<section class="panel"><div class="panel-h"><h2>Más adelante</h2><button class="btn ghost sm" data-go="actividades">Ver todas</button></div><ul class="list">${more.map(a=>`<li class="click" data-go="actividades"><span class="jv-mini-d"><b>${parse(a.date).getDate()}</b><small>${esc(parse(a.date).toLocaleDateString('es',{month:'short'}).replace('.',''))}</small></span><span class="grow"><b>${esc(a.title)}</b><br><span class="small muted">${[JEV_KIND[a.kind],a.time?jevTime(a.time):''].filter(Boolean).map(esc).join(' · ')}</span></span></li>`).join('')}</ul></section>`:'';
  const birthdays=(()=>{const m=now.getMonth()+1;const L=jevBirthdays().filter(b=>Number(b.md.slice(0,2))===m).sort((a,b)=>a.md.localeCompare(b.md));
    return L.length?`<section class="panel"><div class="panel-h"><h2>Cumpleaños del mes 🎂</h2><button class="btn ghost sm" data-go="cumples">Calendario</button></div><ul class="list">${L.map(b=>`<li><span>${b.pid?jevFace(b.pid):'<span class="jv-face bg'+colorOf(b.key)+'">'+esc(initials(b.name))+'</span>'}</span><span class="grow"><b>${esc(b.name)}</b></span><span class="small muted">${Number(b.md.slice(3))} de ${esc(parse('2000-'+b.md).toLocaleDateString('es',{month:'long'}))}</span></li>`).join('')}</ul></section>`:''})();
  const props=jevPropsAll().filter(jevPropOpen).sort((x,y)=>jevPropVotes(y).length-jevPropVotes(x).length).slice(0,3);
  const propPanel=`<section class="panel"><div class="panel-h"><h2>Propuestas más votadas</h2><button class="btn ghost sm" data-jev="gotoprops">Ver todas</button></div>
    ${props.length?`<div class="jv-stack tight">${props.map(p=>jevPropCard(p,{top:jevPropTop()})).join('')}</div>`:`<div class="empty" style="padding:18px"><p class="muted" style="margin:0 0 10px">¿Qué te gustaría que hiciéramos?</p>${ME?'<button class="btn primary" data-jev="newprop">Proponer algo</button>':''}</div>`}</section>`;
  return head+jevBdayBanner()+hero+stats+`<div class="grid2"><div class="stack">${ideaPanel}</div><div class="stack">${propPanel}${actPanel}${birthdays}</div></div>`;
}

/* ---------- Tú ---------- */
function vJevTu(){
  const p=ME&&byId('people',ME);
  if(!p)return `<div class="head"><div><h1>Tú</h1><p>Tu espacio en JEV+.</p></div></div>
    <section class="panel empty"><b>Tu perfil aún no está vinculado</b><p class="muted">Pídele a un líder que agregue tu correo en Equipo. Arca te reconoce automáticamente al iniciar sesión.</p></section>`;
  const mine=jevUpcoming().filter(a=>(a.crew||[]).includes(ME)||(a.going||[]).includes(ME));
  const myIdeas=jevIdeasAll().filter(i=>i.authorId===ME).sort((x,y)=>String(y.createdAt||'').localeCompare(String(x.createdAt||'')));
  return `<div class="head"><div class="jv-me-top"><label class="jv-myph" title="Cambiar mi foto de JEV+">${p.photo?`<img src="${assetUrl(p.photo)}" alt="Tu foto">`:`<span class="bg${colorOf(p.id)}">${esc(initials(p.name))}</span>`}<i aria-hidden="true">Cambiar</i><input type="file" id="jvPhoto" accept="image/png,image/jpeg,image/webp" hidden></label><div><span class="gr" aria-hidden="true">ΝΕΑΝΙΣΚΟΙ</span><h1>Hola, ${esc(jevFirst(ME))}</h1><p>Lo tuyo en JEV+. Tu foto aquí puede ser distinta a la de Philly.</p></div></div><div class="row"><button class="btn primary" data-jev="newidea">Mandar una idea</button></div></div>
    <section class="panel"><div class="panel-h"><h2>Mis próximas actividades</h2></div>
      ${mine.length?`<div class="jv-stack tight">${mine.slice(0,5).map(a=>jevActCard(a)).join('')}</div>`:`<div class="empty" style="padding:18px"><p class="muted" style="margin:0">Nada por ahora. Mira las <a href="#actividades" data-go="actividades">actividades</a> y toca “Voy a ir”.</p></div>`}</section>
    <section class="panel"><div class="panel-h"><h2>Mis ideas de videos</h2></div>
      ${myIdeas.length?`<div class="jv-stack tight">${myIdeas.map(jevIdeaCard).join('')}</div>`:`<div class="empty" style="padding:18px"><p class="muted" style="margin:0">Todavía no has mandado ninguna.</p></div>`}</section>
    ${jevMyTurns()}
    ${reqPanel()}${pwPanel()}
    <p class="small center" style="margin-top:18px"><button class="linkb" data-person="${esc(ME)}">Ver mi perfil</button> · <button class="linkb" data-mypw>Cambiar mi contraseña</button> · <button class="linkb" data-logout>Cerrar sesión</button></p>`;
}

/* ---------- Traer personas de Philly (sin escribir sus datos otra vez) ---------- */
/* Copia nombre, correo, teléfono, cumpleaños y foto. Los títulos y equipos de cada espacio son independientes.
   Guarda `fromPhilly` para no traerlas dos veces y les deja acceso a Philly y a JEV+. */
async function jevImportPhilly(){
  if(!ADMIN())return;
  toast('Buscando a las personas de Philly…');
  const {data,error}=await SB.from('arca_records').select('id,data').eq('space','philly').eq('collection','people');
  if(error||!data){toast('No pude leer a las personas de Philly'+(error?.code?' ('+error.code+')':'')+'.');return}
  const have=new Set(S.people.flatMap(p=>[p.fromPhilly,p.email&&norm(p.email)].filter(Boolean)));
  const names=new Set(S.people.map(p=>norm(p.name)));
  const list=data.filter(r=>r.data&&r.data.name&&r.data.status!=='inactivo'&&!have.has(r.id)&&!(r.data.email&&have.has(norm(r.data.email)))&&!names.has(norm(r.data.name)))
    .sort((a,b)=>String(a.data.name).localeCompare(String(b.data.name),'es'));
  if(!list.length){toast('Ya están en JEV+ todas las personas de Philly.');return}
  openForm({title:'Traer de Philly',saveLabel:'Traer a JEV+',
    intro:'<div class="info gold"><b>No hace falta escribirlos otra vez</b><span>Se copian nombre, correo, teléfono, cumpleaños y foto. Los títulos y equipos de JEV+ los pones tú. Seguirán entrando a Philly y también a JEV+.</span></div>',
    fields:[{id:'ids',label:'¿A quiénes traes?',type:'multi',value:[],options:list.map(r=>[r.id,r.data.name+(r.data.email?'':' (sin correo)')]),none:'No hay personas.'}],
    onSave:async v=>{
      const pick=list.filter(r=>(v.ids||[]).includes(r.id));if(!pick.length)return;
      const rows=[];let n=0;
      for(const r of pick){const d=r.data;
        const id=await save('people',{name:d.name,email:d.email||'',phone:d.phone||'',birth:d.birth||'',photo:d.photo||'',status:'activo',titles:[],teamIds:[],notes:'',fromPhilly:r.id});
        if(!id)continue;n++;
        if(validEmail(d.email)){const em=norm(d.email).trim();rows.push({space:SPACE,email:em,role:'member'},{space:'philly',email:em,role:'member'})}}
      if(rows.length&&SPACES_OK){
        let e=(await SB.from('arca_members').upsert(rows,{onConflict:'space,email',ignoreDuplicates:true})).error;
        if(e)e=(await SB.from('arca_members').upsert(rows.filter(x=>x.space===SPACE),{onConflict:'space,email',ignoreDuplicates:true})).error;
        if(e)toast('Traje a '+n+', pero no pude darles acceso ('+(e.code||'error')+'). Avísale a Ricardo.');}
      if(n)toast('Listo: '+n+(n===1?' persona ya está':' personas ya están')+' en JEV+.')}});
}

/* ---------- Eventos de JEV+ ---------- */
/* Foto propia de JEV+: se guarda solo en el registro de este espacio (la de Philly no cambia). */
document.addEventListener('change',async e=>{
  if(e.target.id!=='jvPhoto'||SPACE!=='jev')return;
  const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  const p=ME&&byId('people',ME);if(!p)return;
  if(!ASSETS){toast('Para subir fotos, un administrador debe conectar Google Drive.');return}
  try{toast('Subiendo tu foto…');const blob=await squarePng(f,360);const res=await ASSETS.upload(blob,{type:'image/png'});
    await save('people',{...p,photo:res.id});toast('Listo, ya tienes foto nueva en JEV+.');render();renderNav()}
  catch(err){typeof assetErr==='function'?assetErr(err):toast('No pude subir la foto.')}
});
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-jev]');if(!b||SPACE!=='jev')return;
  e.preventDefault();e.stopPropagation();
  const id=b.dataset.id,k=b.dataset.jev;
  if(k==='import')return jevImportPhilly();
  if(k==='newact'){if(jevMgr())jevEditAct();return}
  if(k==='editact'){const a=byId('jevacts',id);if(a&&jevMgr())jevEditAct(a);return}
  if(k==='go')return jevToggleGo(id);
  if(k==='kind'){ui.jevKind=b.dataset.k||'';return render()}
  if(k==='state'){ui.jevState=b.dataset.k||'';return render()}
  if(k==='newidea'){if(!ME){toast('Tu perfil aún no está vinculado.');return}jevEditIdea();return}
  if(k==='editidea'){const i=byId('jevideas',id);if(i&&(i.authorId===ME||jevMgr()))jevEditIdea(i);return}
  if(k==='status'){const i=byId('jevideas',id);if(i&&jevMgr())jevEditStatus(i);return}
  if(k==='vote')return jevToggleVote(id);
  if(k==='acttab'){ui.jevActTab=b.dataset.k==='props'?'props':'cal';return render()}
  if(k==='pstate'){ui.jevPState=b.dataset.k||'';return render()}
  if(k==='newprop'){if(!ME){toast('Tu perfil aún no está vinculado.');return}jevEditProp();return}
  if(k==='pedit'){const p=byId('jevprops',id);if(p&&(p.authorId===ME||jevMgr()))jevEditProp(p);return}
  if(k==='pstatus'){const p=byId('jevprops',id);if(p&&jevMgr())jevEditPropStatus(p);return}
  if(k==='psched'){const p=byId('jevprops',id);if(p&&jevMgr())jevScheduleProp(p);return}
  if(k==='pvote')return jevTogglePropList(id,'votes');
  if(k==='phelp')return jevTogglePropList(id,'helpers');
  if(k==='pcopy')return jevPropsCopy();
  if(k==='gotoprops'){ui.jevActTab='props';go('actividades');return}
  if(k==='popen'){ui.jevPropId=id;go('propuesta');return}
  const P=()=>byId('jevprops',id),IT=()=>{const p=P();return p&&jevPItems(p).find(x=>x.id===b.dataset.item)};
  if(k==='litadd'){const p=P();if(p&&ME)jevEditLItem(p);return}
  if(k==='litedit'){const p=P(),it=IT();if(p&&it&&(jevPMayEdit(p)||it.who===ME))jevEditLItem(p,it);return}
  if(k==='litdone')return jevLItemPatch(id,b.dataset.item,x=>({...x,done:!x.done}));
  if(k==='litclaim')return jevLItemPatch(id,b.dataset.item,x=>({...x,who:x.who===ME?'':(x.who&&byId('people',x.who)?x.who:ME)}));
  if(k==='pbudget'){const p=P();if(p&&jevPMayEdit(p))jevEditBudget(p);return}
  if(k==='pmeet'){const p=P();if(p&&jevPMayEdit(p))jevEditMeet(p);return}
  if(k==='ppaid')return jevTogglePaid(id,b.dataset.pid);
  if(k==='rideadd'){const p=P();if(p&&ME){const mine=jevPRides(p).find(r=>r.driver===ME);jevEditRide(p,mine||{})}return}
  if(k==='rideedit'){const p=P(),r=p&&jevPRides(p).find(x=>x.id===b.dataset.ride);if(r&&(r.driver===ME||jevMgr()))jevEditRide(p,r);return}
  if(k==='rideseat')return jevToggleSeat(id,b.dataset.ride);
  if(k==='lcopy')return jevListCopy(id);
  if(k==='plan'){ui.jevActId=id;go('culto');return}
  if(k==='back'){go('actividades');return}
  if(k==='planedit'){const x=byId('jevacts',id);if(x&&jevMgr())jevEditAct(x);return}
  if(k==='itemadd'){const x=byId('jevacts',id);if(x&&jevMgr())jevEditItem(x,{},b.dataset.kind||'item');return}
  if(k==='itemedit'){const x=byId('jevacts',id);const it=x&&jevItems(x).find(y=>y.id===b.dataset.item);if(it&&jevMgr())jevEditItem(x,it);return}
  if(k==='itemmove')return jevItemMove(id,b.dataset.item,Number(b.dataset.d));
  if(k==='itemtpl')return jevItemTpl(id);
  if(k==='asgedit'){const x=byId('jevacts',id);if(x&&jevMgr())jevEditAsg(x,b.dataset.asg);return}
  if(k==='asgtpl')return jevAsgTpl(id);
  if(k==='asgset')return jevAsgSet(id,b.dataset.st);
  if(k==='dup')return jevDup(id);
  if(k==='plancopy')return jevPlanCopy(id);
  if(k==='planprint'){window.print();return}
  if(k==='newbday'){jevEditBday();return}
  if(k==='editbday'){const x=byId('jevbdays',id);if(x)jevEditBday(x);return}
  if(k==='cmmove'){ui.jevCm=(ui.jevCm||0)+Number(b.dataset.d);return render()}
  if(k==='cmnow'){ui.jevCm=0;return render()}
  if(k==='bdayics')return jevBdayIcs();
  if(k==='addpin'){const i=byId('jevideas',id);if(i)jevAddPin(i);return}
  if(k==='showpins'){ui.jevPins=ui.jevPins||{};ui.jevPins[id]=!ui.jevPins[id];return render()}
},true);


/* =====================================================================
   Asignaciones por servicio · Escaletas · Cumpleaños · Pines de Pinterest
   ===================================================================== */

/* ---------- Plan del culto: orden + quién sirve (como los Servicios de Philly, sin alabanzas) ---------- */
/* Cada actividad (sobre todo los cultos) guarda:
   items:       [{id, kind:'item'|'header', title, minutes, who, notes}]   → la escaleta, con horas calculadas
   assignments: [{id, position, personId, status:'pendiente'|'confirmado'|'declinado'}] → quién sirve y si confirmó */
const JEV_POSITIONS=['Bienvenida','Alabanza','Oración','Dinámica','Mensaje','Sonido','Proyección','Fotos y redes'];
const JEV_TPL_ITEMS=[['Bienvenida y apertura',5],['Alabanza',20],['Oración',5],['Dinámica',10],['Anuncios',5],['Mensaje',30],['Ministración',10],['Cierre y despedida',5]];
const jevAsg=a=>(Array.isArray(a.assignments)?a.assignments:[]);
const jevItems=a=>(Array.isArray(a.items)?a.items:[]);
const jevAsgIcon=st=>st==='confirmado'?'✓':st==='declinado'?'✕':'?';
const jevPlanMin=a=>jevItems(a).reduce((t,i)=>t+(i.kind==='header'?0:Number(i.minutes)||0),0);
function jevPlanTimes(a){
  let [h,m]=String(a.time||'18:00').split(':').map(Number);let t=(h||0)*60+(m||0);
  return jevItems(a).map(it=>{const st=t;if(it.kind!=='header')t+=Number(it.minutes)||0;return {it,start:st,end:t}})}
const jevMin=t=>jevTime(String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0'));
const jevCrewOf=a=>[...new Set([...jevAsg(a).map(x=>x.personId).filter(id=>id&&byId('people',id)),...(jevAsg(a).length?[]:(a.crew||[]))])];
function jevAsgHtml(a){
  const L=jevAsg(a).filter(x=>x.personId&&byId('people',x.personId));
  if(!L.length)return '';
  const mine=ME&&L.filter(x=>x.personId===ME),pend=mine&&mine.some(x=>x.status!=='confirmado'&&x.status!=='declinado'),out=mine&&mine.length&&mine.every(x=>x.status==='declinado');
  return `<div class="jv-roles" aria-label="Quién sirve">${L.map(x=>`<span class="jv-role st-${esc(x.status||'pendiente')} ${x.personId===ME?'me':''}">${esc(x.position||'Servir')} <b>${esc(jevFirst(x.personId))}</b> <i aria-hidden="true">${jevAsgIcon(x.status)}</i></span>`).join('')}</div>
    ${pend?`<div class="jv-foot" style="margin-top:6px"><button class="btn sm primary" data-jev="asgset" data-id="${esc(a.id)}" data-st="confirmado">Confirmo</button><button class="btn sm ghost" data-jev="asgset" data-id="${esc(a.id)}" data-st="declinado">No puedo</button></div>`:''}
    ${out?'<p class="small muted" style="margin:6px 0 0">Avisaste que no puedes ir.</p>':''}`}
async function jevAsgSet(id,st){
  const a=byId('jevacts',id);if(!a||!ME)return;
  const list=jevAsg(a).map(x=>x.personId===ME?{...x,status:st}:x);
  const ok=await save('jevacts',{...a,assignments:list});
  if(ok){toast(st==='declinado'?'Listo. Quedó marcado que no puedes ir.':'Listo. Quedaste confirmado.');try{if(st==='confirmado')estBurst()}catch(_){}}
  render()}
function jevMyTurns(){
  if(!ME)return '';
  const L=jevUpcoming().map(a=>({a,r:jevAsg(a).filter(x=>x.personId===ME)})).filter(x=>x.r.length).slice(0,6);
  if(!L.length)return '';
  return `<section class="panel"><div class="panel-h"><h2>Mis turnos</h2></div><ul class="list">${L.map(({a,r})=>{const pend=r.some(x=>x.status!=='confirmado'&&x.status!=='declinado'),out=r.every(x=>x.status==='declinado');
    return `<li><span class="grow"><b>${esc(r.map(x=>x.position||'Servir').join(' · '))}</b><br><span class="small muted">${esc(a.title)} · ${esc(jevWhen(a.date))}${a.time?' · '+esc(jevTime(a.time)):''}${out?' · no vas':pend?' · sin confirmar':' · confirmado'}</span></span>
      ${pend?`<button class="btn sm primary" data-jev="asgset" data-id="${esc(a.id)}" data-st="confirmado">Confirmo</button><button class="btn sm ghost" data-jev="asgset" data-id="${esc(a.id)}" data-st="declinado">No puedo</button>`:''}<button class="btn sm ghost" data-jev="plan" data-id="${esc(a.id)}">Ver plan</button></li>`}).join('')}</ul></section>`}

function vJevCulto(){
  const a=byId('jevacts',ui.jevActId);
  if(!a)return `<div class="head"><div><h1>Plan del culto</h1></div></div><section class="panel empty"><b>No encontré esa actividad</b><p class="muted">Pudo haberse borrado.</p><button class="btn primary" data-jev="back">Volver a Actividades</button></section>`;
  const mgr=jevMgr(),T=jevPlanTimes(a),total=jevPlanMin(a),A=jevAsg(a);
  const st={ok:A.filter(x=>x.status==='confirmado').length,all:A.length};
  const itemsHtml=T.length?`<ol class="sc-list">${T.map(({it,start},k)=>{
    const ctl=mgr?`<div class="sc-ctl no-print"><button class="btn ghost sm" data-jev="itemmove" data-id="${esc(a.id)}" data-item="${esc(it.id)}" data-d="-1" aria-label="Subir" ${k===0?'disabled':''}>↑</button><button class="btn ghost sm" data-jev="itemmove" data-id="${esc(a.id)}" data-item="${esc(it.id)}" data-d="1" aria-label="Bajar" ${k===T.length-1?'disabled':''}>↓</button><button class="btn sm" data-jev="itemedit" data-id="${esc(a.id)}" data-item="${esc(it.id)}">Editar</button></div>`:'';
    if(it.kind==='header')return `<li class="sc-head"><b>${esc(it.title)}</b>${ctl}</li>`;
    return `<li class="sc-item"><div class="sc-time">${esc(jevMin(start))}<small>${Number(it.minutes)||0} min</small></div>
      <div><h4>${esc(it.title)}</h4>${it.who&&byId('people',it.who)?`<span class="sc-who">${esc(pName(it.who))}</span>`:''}${it.notes?`<p class="small muted" style="margin:4px 0 0">${esc(it.notes)}</p>`:''}</div>${ctl}</li>`}).join('')}</ol>
    <p class="small muted">Termina aprox. a las ${esc(jevMin(T[T.length-1].end))} · Dura ${total} min.</p>`
    :`<div class="empty" style="padding:14px"><b>El orden está vacío</b><p class="muted" style="margin:6px 0 0">${mgr?'Agrega las partes del culto o usa las partes comunes.':'Los líderes todavía no arman el orden.'}</p></div>`;
  const asgHtml=A.length?`<ul class="list">${A.map(x=>{const p=x.personId&&byId('people',x.personId),wa=p?waNum(p):'';
    const msg=p?`Hola ${String(p.name).split(/\s+/)[0]} 👋 Te toca *${x.position||'servir'}* en *${a.title}* (${fLong(a.date)}${a.time?', '+jevTime(a.time):''}). ¿Me confirmas en Arca? ${ARCA_URL}`:'';
    return `<li><span>${p?jevFace(p.id):'<span class="jv-face" style="background:var(--line)">?</span>'}</span><span class="grow"><b>${esc(p?p.name:'Posición abierta')}</b><br><span class="small muted">${esc(x.position||'')}</span></span>
      <span class="pill st-${esc(x.status||'pendiente')}">${esc(x.status||'pendiente')}</span>
      ${x.personId===ME&&x.status!=='confirmado'?`<button class="btn sm primary no-print" data-jev="asgset" data-id="${esc(a.id)}" data-st="confirmado">Confirmo</button>`:''}${x.personId===ME&&x.status!=='declinado'?`<button class="btn sm ghost no-print" data-jev="asgset" data-id="${esc(a.id)}" data-st="declinado">No puedo</button>`:''}
      ${mgr&&wa?`<a class="btn ghost sm no-print" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Avisar</a>`:''}${mgr?`<button class="btn ghost sm no-print" data-jev="asgedit" data-id="${esc(a.id)}" data-asg="${esc(x.id)}">Editar</button>`:''}</li>`}).join('')}</ul>`
    :`<div class="empty" style="padding:14px"><b>Nadie programado todavía</b><p class="muted" style="margin:6px 0 0">${mgr?'Agrega a quien sirve en este culto.':'Los líderes todavía no asignan al equipo.'}</p></div>`;
  return `<div class="head no-print"><div><span class="gr" aria-hidden="true">ΤΑΞΙΣ</span><h1>${esc(a.title)}</h1><p>${[fLong(a.date),a.time?'Empieza '+jevTime(a.time):'',a.place].filter(Boolean).map(esc).join(' · ')}</p></div>
    <div class="row"><button class="btn ghost" data-jev="back">← Actividades</button>${mgr?`<button class="btn" data-jev="planedit" data-id="${esc(a.id)}">Editar datos</button><button class="btn" data-jev="dup" data-id="${esc(a.id)}">Copiar a la semana siguiente</button>`:''}<button class="btn" data-jev="plancopy" data-id="${esc(a.id)}">Copiar para WhatsApp</button><button class="btn" data-jev="planprint">Imprimir</button></div></div>
    ${a.notes?`<div class="panel panel-b" style="margin-bottom:16px;white-space:pre-wrap">${esc(a.notes)}</div>`:''}
    <div class="sc-print"><h2 class="sc-ptitle">${esc(a.title)} · ${esc(fLong(a.date))}</h2><div class="grid2">
      <section class="panel"><div class="panel-h"><h2>Orden del culto</h2>${mgr?`<div class="row no-print"><button class="btn sm" data-jev="itemadd" data-id="${esc(a.id)}" data-kind="item">+ Parte</button><button class="btn sm ghost" data-jev="itemadd" data-id="${esc(a.id)}" data-kind="header">+ Encabezado</button><button class="btn sm ghost" data-jev="itemtpl" data-id="${esc(a.id)}">Partes comunes</button></div>`:''}</div>${itemsHtml}</section>
      <section class="panel"><div class="panel-h"><div><h2>Equipo</h2>${st.all?`<div class="small muted">${st.ok} de ${st.all} confirmados</div>`:''}</div>${mgr?`<div class="row no-print"><button class="btn sm" data-jev="asgedit" data-id="${esc(a.id)}">+ Voluntario</button><button class="btn sm ghost" data-jev="asgtpl" data-id="${esc(a.id)}">Posiciones comunes</button></div>`:''}</div>${asgHtml}</section>
    </div></div>`}

function jevEditItem(a,it={},kind='item'){
  const k=it.kind||kind,row=it.id?it:{id:uid(),kind:k,title:'',minutes:k==='header'?0:5,who:'',notes:''};
  const fields=k==='header'
    ?[{id:'title',label:'Encabezado',value:row.title,required:true,ph:'Antes del culto, Adoración, Mensaje…'}]
    :[{id:'title',label:'Parte',value:row.title,required:true,ph:'Bienvenida, Dinámica, Mensaje…'},
      {type:'pair',fields:[{id:'minutes',label:'Minutos',type:'number',value:row.minutes,min:0},{id:'who',label:'Responsable',type:'select',value:row.who||'',options:peopleOpts('Sin asignar')}]},
      {id:'notes',label:'Notas',type:'textarea',value:row.notes,ph:'Materiales, indicaciones…'}];
  openForm({title:it.id?'Editar '+(k==='header'?'encabezado':'parte'):'Agregar '+(k==='header'?'encabezado':'parte'),saveLabel:'Guardar',fields,
    onSave:async v=>{const n={...row,title:v.title,...(k==='header'?{}:{minutes:Math.max(0,Number(v.minutes)||0),who:v.who,notes:v.notes})};
      const items=[...jevItems(a)],i=items.findIndex(x=>x.id===n.id);i>=0?items[i]=n:items.push(n);
      await save('jevacts',{...a,items})},
    onDelete:it.id?async()=>{await save('jevacts',{...a,items:jevItems(a).filter(x=>x.id!==it.id)})}:null,delLabel:'Quitar'})}
async function jevItemMove(id,itemId,d){
  const a=byId('jevacts',id);if(!a||!jevMgr())return;
  const items=[...jevItems(a)],i=items.findIndex(x=>x.id===itemId),j=i+d;
  if(i<0||j<0||j>=items.length)return;
  [items[i],items[j]]=[items[j],items[i]];
  await save('jevacts',{...a,items});render()}
async function jevItemTpl(id){
  const a=byId('jevacts',id);if(!a||!jevMgr())return;
  const have=new Set(jevItems(a).map(x=>norm(x.title)));
  const add=JEV_TPL_ITEMS.filter(([t])=>!have.has(norm(t))).map(([title,minutes])=>({id:uid(),kind:'item',title,minutes,who:'',notes:''}));
  if(!add.length){toast('Ya tienes todas las partes comunes.');return}
  await save('jevacts',{...a,items:[...jevItems(a),...add]});render()}
function jevEditAsg(a,asgId){
  const cur=asgId&&jevAsg(a).find(x=>x.id===asgId),it=cur||{id:uid(),position:'',personId:'',status:'pendiente'};
  openForm({title:cur?'Editar asignación':'Programar voluntario',saveLabel:'Guardar',fields:[
    {id:'position',label:'Posición',value:it.position,list:JEV_POSITIONS,required:true,ph:'Sonido, Bienvenida, Mensaje…'},
    {id:'personId',label:'Persona',type:'select',value:it.personId,options:peopleOpts('Posición abierta')},
    {id:'status',label:'Estado',type:'select',value:it.status||'pendiente',options:ASG_ST.map(x=>[x,x[0].toUpperCase()+x.slice(1)])}],
    onSave:async v=>{
      const other=v.personId&&jevAll().find(x=>x.id!==a.id&&x.date===a.date&&jevAsg(x).some(y=>y.personId===v.personId));
      if(other)toast(`Aviso: ${pName(v.personId)} también sirve ese día en “${other.title}”.`);
      const list=[...jevAsg(a)],i=list.findIndex(x=>x.id===it.id),n={...it,...v};i>=0?list[i]=n:list.push(n);
      await save('jevacts',{...a,assignments:list,crew:jevCrewOf({...a,assignments:list})})},
    onDelete:cur?async()=>{const list=jevAsg(a).filter(x=>x.id!==it.id);await save('jevacts',{...a,assignments:list,crew:jevCrewOf({...a,assignments:list})})}:null,delLabel:'Quitar'})}
async function jevAsgTpl(id){
  const a=byId('jevacts',id);if(!a||!jevMgr())return;
  const have=new Set(jevAsg(a).map(x=>norm(x.position)));
  const add=JEV_POSITIONS.filter(p=>!have.has(norm(p))).map(position=>({id:uid(),position,personId:'',status:'pendiente'}));
  if(!add.length){toast('Ya están todas las posiciones comunes.');return}
  await save('jevacts',{...a,assignments:[...jevAsg(a),...add]});render()}
/* Copia el plan (orden y posiciones) a la semana siguiente; las personas quedan "pendientes" por confirmar. */
async function jevDup(id){
  const a=byId('jevacts',id);if(!a||!jevMgr())return;
  const d=parse(a.date);d.setDate(d.getDate()+7);const date=iso(d);
  const asg=jevAsg(a).map(x=>({...x,id:uid(),status:'pendiente'}));
  const nid=await save('jevacts',{title:a.title,kind:a.kind,date,time:a.time,place:a.place,notes:'',going:[],items:jevItems(a).map(x=>({...x,id:uid()})),assignments:asg,crew:jevCrewOf({assignments:asg}),createdBy:ME});
  if(nid){toast('Listo: copiado al '+fDate(date,{weekday:'long',day:'numeric',month:'long'})+'.');ui.jevActId=nid;go('culto')}}
function jevPlanText(a){
  const T=jevPlanTimes(a),A=jevAsg(a).filter(x=>x.personId&&byId('people',x.personId));
  return `*${a.title}*\n${[fLong(a.date),a.time?'Empieza '+jevTime(a.time):'',a.place].filter(Boolean).join(' · ')}\n\n`+
    (T.length?'*Orden*\n'+T.map(({it,start})=>it.kind==='header'?`\n— ${it.title} —`:`${jevMin(start)} · ${it.title} (${Number(it.minutes)||0} min)${it.who&&byId('people',it.who)?' — '+pName(it.who):''}${it.notes?'\n   '+it.notes:''}`).join('\n'):'')+
    (A.length?'\n\n*Quién sirve*\n'+A.map(x=>`• ${x.position||'Servir'}: ${pName(x.personId)} ${jevAsgIcon(x.status)}`).join('\n'):'')+
    (a.notes?`\n\n📝 ${a.notes}`:'')+`\n\nArca · JEV+`}
async function jevPlanCopy(id){
  const a=byId('jevacts',id);if(!a)return;const txt=jevPlanText(a);
  try{await navigator.clipboard.writeText(txt);toast('Plan copiado: pégalo en WhatsApp.')}
  catch(_){window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener')}}

/* ---------- Cumpleaños (también de quienes no son usuarios de Arca) ---------- */
const jevMD=b=>{const m=/^(\d{4}-)?(\d{2})-(\d{2})$/.exec(String(b||''));return m?m[2]+'-'+m[3]:''};
function jevBirthdays(){
  const seen=new Set(),out=[];
  S.people.filter(p=>p.status!=='inactivo'&&jevMD(p.birth)).forEach(p=>{const md=jevMD(p.birth);seen.add(norm(p.name)+md);out.push({key:'p'+p.id,name:p.name,md,pid:p.id,phone:p.phone||'',src:'persona'})});
  (S.jevbdays||[]).filter(x=>jevMD(x.md||x.birth)).forEach(x=>{const md=jevMD(x.md||x.birth);if(seen.has(norm(x.name)+md))return;out.push({key:'b'+x.id,id:x.id,name:x.name,md,phone:x.phone||'',note:x.note||'',src:'extra',by:x.createdBy})});
  return out}
function jevBdayNext(b){const t=parse(TODAY);let d=new Date(t.getFullYear(),Number(b.md.slice(0,2))-1,Number(b.md.slice(3)));if(d<t)d=new Date(t.getFullYear()+1,d.getMonth(),d.getDate());return Math.round((d-t)/864e5)}
function jevBdayBanner(){
  const L=jevBirthdays().map(b=>({b,n:jevBdayNext(b)})).filter(x=>x.n<=3).sort((a,c)=>a.n-c.n);
  if(!L.length)return '';
  return L.map(({b,n})=>{const wa=waNum(b);const msg='¡Feliz cumpleaños, '+String(b.name).split(/\s+/)[0]+'! 🎂🎉 Dios te bendiga hoy y siempre. — JEV+';
    return `<div class="cm-banner"><span style="font-size:1.6rem" aria-hidden="true">🎂</span><div class="grow"><b>${n===0?'Hoy cumple '+esc(b.name)+'!':n===1?'Mañana cumple '+esc(b.name):'En '+n+' días cumple '+esc(b.name)}</b></div>${n===0&&wa?`<a class="btn sm primary" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Felicitar</a>`:''}</div>`}).join('')}
function vJevCumples(){
  const all=jevBirthdays(),off=ui.jevCm||0,base=parse(TODAY),first=new Date(base.getFullYear(),base.getMonth()+off,1);
  const Y=first.getFullYear(),M=first.getMonth(),dim=new Date(Y,M+1,0).getDate(),lead=(first.getDay()+6)%7;
  const mdStr=d=>String(M+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const cells=[];for(let k=0;k<lead;k++)cells.push('<div class="cm-day out"></div>');
  for(let d=1;d<=dim;d++){const L=all.filter(b=>b.md===mdStr(d));const isT=off===0&&d===base.getDate();
    cells.push(`<div class="cm-day ${L.length?'has':''} ${isT?'today':''}"><b>${d}</b>${L.map(b=>`<i>${esc(String(b.name).split(/\s+/)[0])}</i>`).join('')}</div>`)}
  const mon=first.toLocaleDateString('es',{month:'long',year:'numeric'});
  const monthList=all.filter(b=>Number(b.md.slice(0,2))===M+1).sort((a,b)=>a.md.localeCompare(b.md));
  const soon=all.map(b=>({b,n:jevBdayNext(b)})).sort((a,c)=>a.n-c.n).slice(0,6);
  const row=(b,tail='')=>{const wa=waNum(b),canEdit=b.src==='extra'&&(jevMgr()||b.by===ME);
    return `<li><span>${b.pid?jevFace(b.pid):`<span class="jv-face bg${colorOf(b.key)}">${esc(initials(b.name))}</span>`}</span><span class="grow"><b>${esc(b.name)}</b><br><span class="small muted">${Number(b.md.slice(3))} de ${esc(parse('2000-'+b.md).toLocaleDateString('es',{month:'long'}))}${b.src==='extra'?' · fuera de Arca':''}${tail}</span></span>${wa?`<a class="btn ghost sm" href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="Escribirle a ${esc(b.name)}">WhatsApp</a>`:''}${canEdit?`<button class="btn ghost sm" data-jev="editbday" data-id="${esc(b.id)}">Editar</button>`:''}</li>`};
  return `<div class="head"><div><span class="gr" aria-hidden="true">ΓΕΝΕΘΛΙΑ</span><h1>Cumpleaños</h1><p>Todos los del grupo, estén o no en Arca.</p></div>
    <div class="row">${ME?'<button class="btn primary" data-jev="newbday">Agregar cumpleañero</button>':''}<button class="btn" data-jev="bdayics">Recordatorios en mi celular</button></div></div>
    ${jevBdayBanner()}
    <section class="panel"><div class="cm-nav"><button class="btn ghost sm" data-jev="cmmove" data-d="-1" aria-label="Mes anterior">←</button><h2 style="margin:0;text-transform:capitalize">${esc(mon)}</h2><span><button class="btn ghost sm" data-jev="cmnow">Hoy</button> <button class="btn ghost sm" data-jev="cmmove" data-d="1" aria-label="Mes siguiente">→</button></span></div>
      <div class="cm-grid" role="grid">${['L','M','M','J','V','S','D'].map(x=>`<div class="cm-dow">${x}</div>`).join('')}${cells.join('')}</div></section>
    <div class="grid2"><section class="panel"><div class="panel-h"><h2>Este mes</h2></div>${monthList.length?`<ul class="list">${monthList.map(b=>row(b)).join('')}</ul>`:'<p class="muted" style="margin:0">Nadie cumple en este mes.</p>'}</section>
    <section class="panel"><div class="panel-h"><h2>Los que vienen</h2></div>${soon.length?`<ul class="list">${soon.map(({b,n})=>row(b,' · '+(n===0?'¡hoy!':n===1?'mañana':'en '+n+' días'))).join('')}</ul>`:'<p class="muted" style="margin:0">Agrega los cumpleaños del grupo para que Arca te avise.</p>'}</section></div>`}
function jevEditBday(x={}){
  const md=jevMD(x.md||x.birth),mo=md?Number(md.slice(0,2)):'',dy=md?Number(md.slice(3)):'';
  const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'].map((m,k)=>[String(k+1),m]);
  openForm({title:x.id?'Editar cumpleañero':'Agregar cumpleañero',saveLabel:'Guardar',
    intro:x.id?'':'<div class="info gold"><b>Aunque no tenga cuenta en Arca</b><span>Agrega a cualquiera del grupo y Arca avisará su cumpleaños a todos.</span></div>',
    fields:[{id:'name',label:'Nombre',value:x.name,required:true,ph:'La Michi'},
      {type:'pair',fields:[{id:'day',label:'Día',type:'number',value:dy,min:1,required:true},{id:'month',label:'Mes',type:'select',value:String(mo||1),options:months}]},
      {id:'phone',label:'WhatsApp (opcional)',type:'tel',value:x.phone,ph:'7000 0000'}],
    onSave:async v=>{const d=Number(v.day),m=Number(v.month);
      if(!(d>=1&&d<=31)){toast('El día debe ser entre 1 y 31.');return}
      const mdv=String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const ok=await save('jevbdays',{...x,name:v.name,md:mdv,phone:v.phone,createdBy:x.createdBy||ME});if(ok)toast('Cumpleaños guardado.')},
    onDelete:x.id?()=>remove('jevbdays',x.id):null})}
/* Archivo .ics: cada cumpleaños se repite cada año y avisa el día anterior y ese día a las 9 a. m. */
function jevBdayIcs(){
  const all=jevBirthdays();if(!all.length){toast('Todavía no hay cumpleaños para exportar.');return}
  const y=parse(TODAY).getFullYear(),esc2=t=>String(t).replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Arca JEV+//Cumpleanos//ES','CALSCALE:GREGORIAN','X-WR-CALNAME:Cumpleaños JEV+'];
  for(const b of all){const ds=y+b.md.replace('-','');
    L.push('BEGIN:VEVENT','UID:bday-'+b.key+'@arca-jev','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART;VALUE=DATE:'+ds,'RRULE:FREQ=YEARLY','SUMMARY:'+esc2('🎂 Cumpleaños de '+b.name),'TRANSP:TRANSPARENT',
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc2('Mañana cumple '+b.name),'TRIGGER:-PT15H','END:VALARM',
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc2('Hoy cumple '+b.name),'TRIGGER:PT9H','END:VALARM','END:VEVENT')}
  L.push('END:VCALENDAR');
  const blob=new Blob([L.join('\r\n')],{type:'text/calendar'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='cumpleanos-jev.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  toast('Abre el archivo para agregar los cumpleaños a tu calendario.')}

/* ---------- Pines de Pinterest en las ideas ---------- */
const PIN_RE=/^https:\/\/(?:[\w-]+\.)?(?:pinterest\.[a-z.]{2,7}\/[^\s]+|pin\.it\/[\w-]+)/i;
function jevParsePins(txt){
  const ok=[],bad=[];String(txt||'').split(/[\n\s]+/).map(x=>x.trim()).filter(Boolean).forEach(u=>{PIN_RE.test(u)?(ok.includes(u)||ok.push(u)):bad.push(u)});
  return {ok:ok.slice(0,12),bad}}
function jevPinsHtml(i){
  const pins=(i.pins||[]).filter(u=>PIN_RE.test(u)),open=!!(ui.jevPins||{})[i.id];
  const embeddable=pins.filter(u=>/pinterest\.[a-z.]+\/pin\/\d+/i.test(u));
  return `<div class="jv-pins">${pins.map((u,k)=>`<a class="jv-pin" href="${esc(u)}" target="_blank" rel="noopener">📌 Pin ${k+1} ↗</a>`).join('')}
    ${embeddable.length?`<button class="btn ghost sm" data-jev="showpins" data-id="${esc(i.id)}" aria-expanded="${open}">${open?'Ocultar pines':'Ver pines aquí'}</button>`:''}
    ${ME?`<button class="btn ghost sm" data-jev="addpin" data-id="${esc(i.id)}">+ Pin</button>`:''}</div>
    ${open&&embeddable.length?`<div class="jv-pinbox">${embeddable.map(u=>`<a data-pin-do="embedPin" data-pin-width="medium" href="${esc(u)}"></a>`).join('')}</div>`:''}`}
function jevLoadPins(){
  if(!document.querySelector('[data-pin-do]'))return;
  if(window.PinUtils&&PinUtils.build){try{PinUtils.build()}catch(_){}return}
  if(document.getElementById('pinitjs'))return;
  const s=document.createElement('script');s.id='pinitjs';s.async=true;s.defer=true;s.src='https://assets.pinterest.com/js/pinit.js';document.body.appendChild(s)}
function jevAddPin(i){
  openForm({title:'Agregar un pin',saveLabel:'Agregar',
    intro:'<div class="info gold"><b>Pinterest + Arca</b><span>Guarda el pin en tu cuenta de Pinterest, toca “Compartir” → “Copiar link” y pégalo aquí. ¿No la tienes? <a href="https://www.pinterest.com/download/" target="_blank" rel="noopener">Descárgala</a>.</span></div>',
    fields:[{id:'url',label:'Link del pin',type:'url',required:true,ph:'https://pin.it/… o https://www.pinterest.com/pin/…'}],
    onSave:async v=>{const r=jevParsePins(v.url);if(!r.ok.length){toast('Ese link no parece de Pinterest.');return}
      const pins=[...new Set([...(i.pins||[]),...r.ok])].slice(0,12);const ok=await save('jevideas',{...i,pins});if(ok)toast('Pin agregado a la idea.')}})}
