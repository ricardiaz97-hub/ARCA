/* ===== JEV+ · Jóvenes En Victoria =====
   Espacio propio dentro de Arca (verde neón y azul). Se carga DESPUÉS de index.html y solo se usa cuando el
   espacio activo es 'jev'; en Philly este archivo no hace nada.
   Colecciones (en arca_records, con space='jev'):
   - 'jevacts'   → actividades y cultos: título, tipo, fecha, hora, lugar, notas, quiénes sirven, quiénes van
   - 'jevideas'  → ideas de videos: título, descripción, link de referencia, votos, estado, nota de los líderes
   Las personas, tareas y ajustes usan las colecciones normales de Arca (people, tasks, settings…). */

const JEV_KINDS=[['culto','Culto'],['actividad','Actividad'],['ensayo','Ensayo'],['reunion','Reunión'],['especial','Evento especial']];
const JEV_KIND=Object.fromEntries(JEV_KINDS);
const JEV_STATES=[['nueva','Nueva'],['aprobada','Aprobada'],['produccion','En producción'],['publicada','Publicada'],['descartada','Descartada']];
const JEV_STATE=Object.fromEntries(JEV_STATES);

/* Iconos del menú */
try{
  ICON.actividades='<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9.5 15 1.8 1.8L15 13"/>';
  ICON.ideas='<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/><path d="M9.5 9.2v5.6M6.7 12h5.6"/>';
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
  const brand=document.querySelector('.rail .brand'),mlg=document.querySelector('.mbar .lg'),credit=document.querySelector('.rail-foot .credit'),mfb=document.querySelector('.mbar .fbl');
  if(space==='jev'){
    if(brand&&!brand.dataset.philly)brand.dataset.philly=brand.innerHTML;
    if(brand)brand.innerHTML='<div class="jevlogo" role="img" aria-label="JEV+ Jóvenes En Victoria"><b>JEV<i>+</i></b><span>Jóvenes En Victoria</span></div>';
    if(mlg&&!mlg.dataset.philly){mlg.dataset.philly='1';mlg.style.display='none'}
    if(mfb)mfb.style.display='none';
    let mj=document.getElementById('jevMobileLogo');
    if(!mj){mj=document.createElement('div');mj.id='jevMobileLogo';mj.className='jevlogo sm';mj.innerHTML='<b>JEV<i>+</i></b>';const bar=document.querySelector('.mbar');if(bar)bar.insertBefore(mj,bar.firstChild)}
    if(credit){if(!credit.dataset.philly)credit.dataset.philly=credit.innerHTML;credit.innerHTML='<span>JEV+ · Jóvenes En Victoria</span>'}
  }else{
    if(brand&&brand.dataset.philly){brand.innerHTML=brand.dataset.philly;delete brand.dataset.philly}
    if(mlg){mlg.style.display='';delete mlg.dataset.philly}
    if(mfb)mfb.style.display='';
    const mj=document.getElementById('jevMobileLogo');if(mj)mj.remove();
    if(credit&&credit.dataset.philly){credit.innerHTML=credit.dataset.philly;delete credit.dataset.philly}
  }
}

/* ---------- Qué pantalla toca en cada ruta ---------- */
function spaceView(space,route){
  if(space!=='jev')return null;
  return {turno:vJevTu,inicio:vJevInicio,actividades:vJevActs,ideas:vJevIdeas}[route]||null;
}

/* ---------- Tarjeta de actividad ---------- */
function jevActCard(a,{past=false}={}){
  const d=parse(a.date),going=(a.going||[]).filter(id=>byId('people',id)),crew=(a.crew||[]).filter(id=>byId('people',id));
  const iGo=ME&&going.includes(ME),iServe=ME&&crew.includes(ME);
  return `<article class="jv-act ${past?'past':''} k-${esc(a.kind||'actividad')}">
    <div class="jv-date" aria-hidden="true"><small>${esc(d.toLocaleDateString('es',{month:'short'}).replace('.',''))}</small><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString('es',{weekday:'short'}).replace('.',''))}</small></div>
    <div class="jv-body">
      <div class="jv-meta"><span class="jv-kind">${esc(JEV_KIND[a.kind]||'Actividad')}</span>${!past?`<span class="jv-when">${esc(jevWhen(a.date))}</span>`:''}${iServe?'<span class="jv-me">Te toca servir</span>':''}</div>
      <h3>${esc(a.title)}</h3>
      <p class="jv-sub">${[a.time?jevTime(a.time):'',a.place].filter(Boolean).map(esc).join(' · ')}</p>
      ${a.notes?`<p class="jv-notes">${esc(a.notes)}</p>`:''}
      ${crew.length?`<div class="jv-crew"><span class="lbl">Sirven</span><span class="jv-faces">${crew.map(id=>jevFace(id)).join('')}</span><span class="jv-names">${crew.map(jevFirst).map(esc).join(', ')}</span></div>`:''}
      <div class="jv-foot">
        ${!past&&ME?`<button class="btn sm ${iGo?'primary':''}" data-jev="go" data-id="${esc(a.id)}" aria-pressed="${!!iGo}">${iGo?'✓ Voy':'Voy a ir'}</button>`:''}
        ${going.length?`<span class="small muted">${going.length} ${going.length===1?'confirmó':'confirmaron'}</span>`:''}
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
  return `<div class="head"><div><span class="gr" aria-hidden="true">ΛΑΤΡΕΙΑ</span><h1>Actividades</h1><p>Los cultos y todo lo que viene para JEV+.</p></div>
    <div class="row">${jevMgr()?'<button class="btn primary" data-jev="newact">Nueva actividad</button>':''}</div></div>
    ${chips}
    ${list.length?`<div class="jv-stack">${list.map(a=>jevActCard(a)).join('')}</div>`:`<section class="panel empty"><b>${up.length?'No hay actividades de ese tipo.':'Todavía no hay actividades.'}</b><p class="muted">${jevMgr()?'Toca “Nueva actividad” para agregar el próximo culto.':'Cuando los líderes agreguen el próximo culto, aparecerá aquí.'}</p></section>`}
    ${past.filter(keep).length?`<details class="tcard tfold jv-past"><summary><h2 class="th2">Anteriores</h2><p class="small">${past.filter(keep).length} reciente${past.filter(keep).length===1?'':'s'}</p></summary><div class="jv-stack">${past.filter(keep).map(a=>jevActCard(a,{past:true})).join('')}</div></details>`:''}`;
}

function jevEditAct(a={}){
  const people=sortBy(S.people.filter(p=>p.status!=='inactivo'),p=>p.name).map(p=>[p.id,p.name]);
  openForm({title:a.id?'Editar actividad':'Nueva actividad',saveLabel:'Guardar',fields:[
    {id:'title',label:'Nombre',value:a.title,required:true,ph:'Culto de jóvenes, Noche de alabanza…'},
    {type:'pair',fields:[{id:'kind',label:'Tipo',type:'select',value:a.kind||'culto',options:JEV_KINDS},{id:'date',label:'Fecha',type:'date',value:a.date||TODAY,required:true}]},
    {type:'pair',fields:[{id:'time',label:'Hora',type:'time',value:a.time||'18:00'},{id:'place',label:'Lugar',value:a.place,ph:'Templo, salón…'}]},
    {id:'crew',label:'Quiénes sirven',type:'multi',value:a.crew||[],options:people,none:'Agrega personas primero en Equipo.'},
    {id:'notes',label:'Notas para el equipo',type:'textarea',value:a.notes,ph:'Qué hay que llevar, quién abre, tema del culto…'}],
    onSave:async v=>{
      if(!v.title.trim()||!v.date){toast('Falta el nombre o la fecha.');return}
      const id=await save('jevacts',{...a,title:v.title.trim(),kind:v.kind,date:v.date,time:v.time,place:v.place.trim(),crew:v.crew,notes:v.notes.trim(),going:a.going||[],createdBy:a.createdBy||ME});
      if(id&&!a.id)toast('Actividad creada.')},
    onDelete:a.id?()=>remove('jevacts',a.id):null});
}

async function jevToggleGo(id){
  const a=byId('jevacts',id);if(!a||!ME)return;
  const going=new Set(a.going||[]);going.has(ME)?going.delete(ME):going.add(ME);
  await save('jevacts',{...a,going:[...going]});render();
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
    ${list.length?`<div class="jv-stack">${list.map(jevIdeaCard).join('')}</div>`:`<section class="panel empty"><b>${jevIdeasAll().length?'No hay ideas en este estado.':'Aún no hay ideas. ¡Sé el primero!'}</b><p class="muted">Un reto, un testimonio, un sketch, un tutorial… lo que Dios ponga en tu corazón.</p></section>`}`;
}

function jevEditIdea(i={}){
  openForm({title:i.id?'Editar mi idea':'Mandar una idea de video',saveLabel:i.id?'Guardar':'Enviar idea',
    intro:i.id?'':'<div class="info gold"><b>Una idea clara se graba más rápido</b><span>Cuéntanos de qué trata, a quién le habla y, si tienes, un video parecido como referencia.</span></div>',
    fields:[
    {id:'title',label:'Título de la idea',value:i.title,required:true,ph:'Ej.: “3 cosas que aprendí en mi primer año sirviendo”'},
    {id:'desc',label:'¿De qué trata?',type:'textarea',value:i.desc,ph:'Qué se vería, quién saldría, qué queremos que sienta quien lo vea…'},
    {id:'ref',label:'Video de referencia (opcional)',type:'url',value:i.ref,ph:'https://www.youtube.com/…'}],
    onSave:async v=>{
      if(!v.title.trim()){toast('Ponle un título a tu idea.');return}
      if(v.ref&&!isUrl(v.ref)){toast('El link de referencia no parece válido.');return}
      const id=await save('jevideas',{status:'nueva',votes:i.id?(i.votes||[]):[ME],...i,title:v.title.trim(),desc:v.desc.trim(),ref:v.ref.trim(),authorId:i.authorId||ME,createdAt:i.createdAt||new Date().toISOString()});
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
  const birthdays=(()=>{const m=now.getMonth()+1;const L=S.people.filter(p=>p.birth&&Number(String(p.birth).slice(5,7))===m&&p.status!=='inactivo').sort((a,b)=>String(a.birth).slice(8).localeCompare(String(b.birth).slice(8)));
    return L.length?`<section class="panel"><div class="panel-h"><h2>Cumpleaños del mes 🎂</h2></div><ul class="list">${L.map(p=>`<li><span>${jevFace(p.id)}</span><span class="grow"><b>${esc(p.name)}</b></span><span class="small muted">${Number(String(p.birth).slice(8))} de ${esc(parse('2000-'+String(p.birth).slice(5)).toLocaleDateString('es',{month:'long'}))}</span></li>`).join('')}</ul></section>`:''})();
  return head+hero+stats+`<div class="grid2"><div class="stack">${ideaPanel}</div><div class="stack">${actPanel}${birthdays}</div></div>`;
}

/* ---------- Tú ---------- */
function vJevTu(){
  const p=ME&&byId('people',ME);
  if(!p)return `<div class="head"><div><h1>Tú</h1><p>Tu espacio en JEV+.</p></div></div>
    <section class="panel empty"><b>Tu perfil aún no está vinculado</b><p class="muted">Pídele a un líder que agregue tu correo en Equipo. Arca te reconoce automáticamente al iniciar sesión.</p></section>`;
  const mine=jevUpcoming().filter(a=>(a.crew||[]).includes(ME)||(a.going||[]).includes(ME));
  const myIdeas=jevIdeasAll().filter(i=>i.authorId===ME).sort((x,y)=>String(y.createdAt||'').localeCompare(String(x.createdAt||'')));
  return `<div class="head"><div><span class="gr" aria-hidden="true">ΝΕΑΝΙΣΚΟΙ</span><h1>Hola, ${esc(jevFirst(ME))}</h1><p>Lo tuyo en JEV+.</p></div><div class="row"><button class="btn primary" data-jev="newidea">Mandar una idea</button></div></div>
    <section class="panel"><div class="panel-h"><h2>Mis próximas actividades</h2></div>
      ${mine.length?`<div class="jv-stack tight">${mine.slice(0,5).map(a=>jevActCard(a)).join('')}</div>`:`<div class="empty" style="padding:18px"><p class="muted" style="margin:0">Nada por ahora. Mira las <a href="#actividades" data-go="actividades">actividades</a> y toca “Voy a ir”.</p></div>`}</section>
    <section class="panel"><div class="panel-h"><h2>Mis ideas de videos</h2></div>
      ${myIdeas.length?`<div class="jv-stack tight">${myIdeas.map(jevIdeaCard).join('')}</div>`:`<div class="empty" style="padding:18px"><p class="muted" style="margin:0">Todavía no has mandado ninguna.</p></div>`}</section>
    <p class="small center" style="margin-top:18px"><button class="linkb" data-person="${esc(ME)}">Ver mi perfil</button></p>`;
}

/* ---------- Eventos de JEV+ ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-jev]');if(!b||SPACE!=='jev')return;
  e.preventDefault();e.stopPropagation();
  const id=b.dataset.id,k=b.dataset.jev;
  if(k==='newact'){if(jevMgr())jevEditAct();return}
  if(k==='editact'){const a=byId('jevacts',id);if(a&&jevMgr())jevEditAct(a);return}
  if(k==='go')return jevToggleGo(id);
  if(k==='kind'){ui.jevKind=b.dataset.k||'';return render()}
  if(k==='state'){ui.jevState=b.dataset.k||'';return render()}
  if(k==='newidea'){if(!ME){toast('Tu perfil aún no está vinculado.');return}jevEditIdea();return}
  if(k==='editidea'){const i=byId('jevideas',id);if(i&&(i.authorId===ME||jevMgr()))jevEditIdea(i);return}
  if(k==='status'){const i=byId('jevideas',id);if(i&&jevMgr())jevEditStatus(i);return}
  if(k==='vote')return jevToggleVote(id);
},true);
