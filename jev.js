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
    if(brand)brand.innerHTML='<img class="jevlogo-img" src="/img/jev-logo.webp" alt="JEV+ Jóvenes En Victoria" width="520" height="190">';
    if(mlg&&!mlg.dataset.philly){mlg.dataset.philly='1';mlg.style.display='none'}
    if(mfb)mfb.style.display='none';
    let mj=document.getElementById('jevMobileLogo');
    if(!mj){mj=document.createElement('div');mj.id='jevMobileLogo';mj.className='jevlogo sm';mj.innerHTML='<img class="jevlogo-img" src="/img/jev-logo.webp" alt="JEV+" width="520" height="190">';const bar=document.querySelector('.mbar');if(bar)bar.insertBefore(mj,bar.firstChild)}
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
  return {turno:vJevTu,inicio:vJevInicio,actividades:vJevActs,ideas:vJevIdeas,cumples:vJevCumples,escaleta:vJevEscaleta}[route]||null;
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
      ${jevRolesHtml(a)}
      ${crew.length?`<div class="jv-crew"><span class="lbl">Sirven</span><span class="jv-faces">${crew.map(id=>jevFace(id)).join('')}</span><span class="jv-names">${crew.map(jevFirst).map(esc).join(', ')}</span></div>`:''}
      <div class="jv-foot">
        ${!past&&ME?`<button class="btn sm ${iGo?'primary':''}" data-jev="go" data-id="${esc(a.id)}" aria-pressed="${!!iGo}">${iGo?'✓ Voy':'Voy a ir'}</button>`:''}
        ${going.length?`<span class="small muted">${going.length} ${going.length===1?'confirmó':'confirmaron'}</span>`:''}
        ${jevMgr()&&!past?`<button class="btn sm" data-jev="assign" data-id="${esc(a.id)}">Asignaciones</button>`:''}
        ${jevScFor(a.id)?`<button class="btn sm" data-jev="opensc" data-id="${esc(jevScFor(a.id).id)}">Ver escaleta</button>`:(jevMgr()?`<button class="btn sm" data-jev="newsc" data-id="${esc(a.id)}">Armar escaleta</button>`:'')}
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
    ${jevScList()}
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
  return head+jevBdayBanner()+hero+stats+`<div class="grid2"><div class="stack">${ideaPanel}</div><div class="stack">${actPanel}${birthdays}</div></div>`;
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
    ${jevMyRoles()}
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
  if(k==='assign'){const a=byId('jevacts',id);if(a&&jevMgr())jevAssign(a);return}
  if(k==='newsc')return jevNewSc(id);
  if(k==='opensc'){ui.jevScId=id;go('escaleta');return}
  if(k==='scback'){go('actividades');return}
  if(k==='scmeta'){const sc=byId('jevscaletas',id);if(sc&&jevMgr())jevEditScMeta(sc);return}
  if(k==='scadd'){const sc=byId('jevscaletas',id);if(sc&&jevMgr())jevEditScItem(sc);return}
  if(k==='scedit'){const sc=byId('jevscaletas',id);const it=sc&&(sc.items||[]).find(x=>x.id===b.dataset.item);if(it&&jevMgr())jevEditScItem(sc,it);return}
  if(k==='scmove')return jevScMove(id,b.dataset.item,Number(b.dataset.d));
  if(k==='sctpl'){const sc=byId('jevscaletas',id);if(sc&&jevMgr())jevScTemplate(sc);return}
  if(k==='sccopy')return jevScCopy(id);
  if(k==='scprint'){window.print();return}
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

/* ---------- Asignaciones por servicio ---------- */
const JEV_ROLES=['Bienvenida','Alabanza','Oración','Dinámica','Mensaje','Sonido','Proyección','Fotos y redes'];
const jevRolesOf=a=>(Array.isArray(a.roles)?a.roles:[]).filter(r=>r&&r.role&&byId('people',r.personId));
function jevRolesHtml(a){
  const L=jevRolesOf(a);if(!L.length)return '';
  return `<div class="jv-roles" aria-label="Asignaciones">${L.map(r=>`<span class="jv-role ${r.personId===ME?'me':''}">${esc(r.role)} <b>${esc(jevFirst(r.personId))}</b></span>`).join('')}</div>`}
function jevAssign(a){
  const opts=peopleOpts('— Nadie —'),cur=jevRolesOf(a);
  const who=role=>(cur.find(r=>r.role===role)||{}).personId||'';
  const extras=cur.filter(r=>!JEV_ROLES.includes(r.role)).slice(0,3);
  while(extras.length<2)extras.push({role:'',personId:''});
  openForm({title:'Asignaciones · '+a.title,saveLabel:'Guardar',
    intro:`<div class="info"><b>¿Quién hace qué en este servicio?</b><span>${esc(fLong(a.date))}. Cada persona verá su turno en “Tú”.</span></div>`,
    fields:[...JEV_ROLES.map((r,k)=>({id:'r'+k,label:r,type:'select',value:who(r),options:opts})),
      ...extras.map((x,k)=>({type:'pair',fields:[{id:'xr'+k,label:'Otro rol',value:x.role,ph:'Ej.: Cafetería'},{id:'xp'+k,label:'Persona',type:'select',value:x.personId,options:opts}]}))],
    onSave:async v=>{
      const roles=[];JEV_ROLES.forEach((r,k)=>{if(v['r'+k])roles.push({role:r,personId:v['r'+k]})});
      extras.forEach((_,k)=>{const r=String(v['xr'+k]||'').trim();if(r&&v['xp'+k])roles.push({role:r.slice(0,40),personId:v['xp'+k]})});
      const before=new Set(jevRolesOf(a).map(r=>r.personId)),after=new Set(roles.map(r=>r.personId));
      const crew=[...new Set([...(a.crew||[]).filter(id=>!before.has(id)),...after])];
      const ok=await save('jevacts',{...a,roles,crew});if(ok)toast('Asignaciones guardadas.')}});
}
function jevMyRoles(){
  if(!ME)return '';
  const L=jevUpcoming().flatMap(a=>jevRolesOf(a).filter(r=>r.personId===ME).map(r=>({a,r}))).slice(0,6);
  if(!L.length)return '';
  return `<section class="panel"><div class="panel-h"><h2>Mis turnos asignados</h2></div><ul class="list">${L.map(({a,r})=>`<li class="click" data-go="actividades"><span class="grow"><b>${esc(r.role)}</b><br><span class="small muted">${esc(a.title)} · ${esc(jevWhen(a.date))}${a.time?' · '+esc(jevTime(a.time)):''}</span></span></li>`).join('')}</ul></section>`}

/* ---------- Escaletas (el programa del culto) ---------- */
const jevScAll=()=>(S.jevscaletas||[]);
const jevScFor=actId=>jevScAll().find(x=>x.actId===actId);
const SC_TEMPLATE=[['Bienvenida y apertura',5,'Bienvenida'],['Alabanza',20,'Alabanza'],['Oración',5,'Oración'],['Dinámica',10,'Dinámica'],['Anuncios',5,''],['Mensaje',30,'Mensaje'],['Ministración',10,'Alabanza'],['Cierre y despedida',5,'']];
function jevScTimes(sc){
  let [h,m]=String(sc.time||'18:00').split(':').map(Number);let t=(h||0)*60+(m||0);
  return (sc.items||[]).map(it=>{const st=t;t+=Number(it.min)||0;return {it,start:st,end:t}})}
const jevMin=t=>jevTime(String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0'));
function jevScList(){
  const L=jevScAll().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,8);
  return `<section class="panel"><div class="panel-h"><h2>Escaletas</h2>${jevMgr()?'<button class="btn sm" data-jev="newsc" data-id="">Nueva escaleta</button>':''}</div>
    ${L.length?L.map(sc=>`<div class="sc-card"><div><h3>${esc(sc.title)}</h3><span class="small muted">${[sc.date?fDate(sc.date):'',sc.time?jevTime(sc.time):'',(sc.items||[]).length+' parte'+((sc.items||[]).length===1?'':'s')].filter(Boolean).map(esc).join(' · ')}</span></div><button class="btn sm primary" data-jev="opensc" data-id="${esc(sc.id)}">Abrir</button></div>`).join('')
      :`<p class="muted" style="margin:0">${jevMgr()?'Arma el programa del culto: partes, tiempos y responsables. Toca “Nueva escaleta” o “Armar escaleta” en una actividad.':'Cuando los líderes armen la escaleta del culto, la verás aquí.'}</p>`}</section>`}
async function jevNewSc(actId){
  if(!jevMgr())return;
  const a=actId&&byId('jevacts',actId);
  const id=await save('jevscaletas',{title:a?'Escaleta · '+a.title:'Escaleta del culto',date:a?a.date:TODAY,time:a?(a.time||'18:00'):'18:00',actId:a?a.id:'',items:[],notes:'',createdBy:ME});
  if(id){ui.jevScId=id;go('escaleta');const sc=byId('jevscaletas',id);if(sc)jevScTemplate(sc,true)}}
function jevScTemplate(sc,ask){
  const run=async()=>{
    const a=sc.actId&&byId('jevacts',sc.actId);
    const items=SC_TEMPLATE.map(([title,min,role])=>({id:uid(),title,min,who:(a&&jevRolesOf(a).find(r=>r.role===role)||{}).personId||'',notes:''}));
    await save('jevscaletas',{...sc,items:[...(sc.items||[]),...items]});render()};
  if(ask){openForm({title:'¿Empezar con partes comunes?',saveLabel:'Sí, agregarlas',intro:'<div class="info gold"><b>Plantilla de culto</b><span>Bienvenida, alabanza, oración, dinámica, anuncios, mensaje, ministración y cierre. Luego cambias tiempos y responsables como quieras.</span></div>',fields:[],onSave:run});return}
  run()}
function vJevEscaleta(){
  const sc=byId('jevscaletas',ui.jevScId);
  if(!sc)return `<div class="head"><div><h1>Escaleta</h1></div></div><section class="panel empty"><b>No encontré esa escaleta</b><p class="muted">Pudo haberse borrado.</p><button class="btn primary" data-jev="scback">Volver a Actividades</button></section>`;
  const T=jevScTimes(sc),mgr=jevMgr(),total=T.length?T[T.length-1].end-(T[0].start):0;
  return `<div class="head no-print"><div><span class="gr" aria-hidden="true">ΤΑΞΙΣ</span><h1>${esc(sc.title)}</h1><p>${[sc.date?fLong(sc.date):'',sc.time?'Empieza '+jevTime(sc.time):'',total?'Dura '+total+' min':''].filter(Boolean).map(esc).join(' · ')}</p></div>
    <div class="row"><button class="btn ghost" data-jev="scback">← Actividades</button>${mgr?`<button class="btn" data-jev="scmeta" data-id="${esc(sc.id)}">Datos</button>`:''}<button class="btn" data-jev="sccopy" data-id="${esc(sc.id)}">Copiar para WhatsApp</button><button class="btn" data-jev="scprint">Imprimir</button></div></div>
    <div class="sc-print"><h2 class="sc-ptitle">${esc(sc.title)} · ${esc(sc.date?fLong(sc.date):'')}</h2>
    ${T.length?`<ol class="sc-list">${T.map(({it,start,end},k)=>`<li class="sc-item"><div class="sc-time">${esc(jevMin(start))}<small>${Number(it.min)||0} min</small></div>
      <div><h4>${esc(it.title)}</h4>${it.who&&byId('people',it.who)?`<span class="sc-who">${esc(pName(it.who))}</span>`:''}${it.notes?`<p class="small muted" style="margin:4px 0 0">${esc(it.notes)}</p>`:''}</div>
      ${mgr?`<div class="sc-ctl no-print"><button class="btn ghost sm" data-jev="scmove" data-id="${esc(sc.id)}" data-item="${esc(it.id)}" data-d="-1" aria-label="Subir" ${k===0?'disabled':''}>↑</button><button class="btn ghost sm" data-jev="scmove" data-id="${esc(sc.id)}" data-item="${esc(it.id)}" data-d="1" aria-label="Bajar" ${k===T.length-1?'disabled':''}>↓</button><button class="btn sm" data-jev="scedit" data-id="${esc(sc.id)}" data-item="${esc(it.id)}">Editar</button></div>`:''}</li>`).join('')}</ol>
      <p class="small muted">Termina a las ${esc(jevMin(T[T.length-1].end))}.</p>`
      :`<section class="panel empty"><b>Todavía no hay partes</b><p class="muted">Agrega la primera o usa la plantilla de culto.</p></section>`}
    ${sc.notes?`<p class="jv-lnote"><span class="lbl">Notas</span>${esc(sc.notes)}</p>`:''}</div>
    ${mgr?`<div class="row no-print" style="margin-top:12px"><button class="btn primary" data-jev="scadd" data-id="${esc(sc.id)}">Agregar parte</button><button class="btn" data-jev="sctpl" data-id="${esc(sc.id)}">Agregar partes comunes</button></div>`:''}`}
function jevEditScMeta(sc){
  const acts=[['','Ninguna'],...jevAll().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,30).map(a=>[a.id,fDate(a.date)+' · '+a.title])];
  openForm({title:'Datos de la escaleta',saveLabel:'Guardar',fields:[
    {id:'title',label:'Nombre',value:sc.title,required:true},
    {type:'pair',fields:[{id:'date',label:'Fecha',type:'date',value:sc.date||TODAY},{id:'time',label:'Hora de inicio',type:'time',value:sc.time||'18:00'}]},
    {id:'actId',label:'Actividad',type:'select',value:sc.actId||'',options:acts},
    {id:'notes',label:'Notas generales',type:'textarea',value:sc.notes,ph:'Tema del culto, colores, recordatorios…'}],
    onSave:async v=>{await save('jevscaletas',{...sc,title:v.title,date:v.date,time:v.time,actId:v.actId,notes:v.notes})},
    onDelete:async()=>{await remove('jevscaletas',sc.id);go('actividades')},delLabel:'Eliminar escaleta'})}
function jevEditScItem(sc,it={}){
  openForm({title:it.id?'Editar parte':'Agregar parte',saveLabel:'Guardar',fields:[
    {id:'title',label:'Parte',value:it.title,required:true,ph:'Alabanza, Mensaje, Dinámica…'},
    {type:'pair',fields:[{id:'min',label:'Minutos',type:'number',value:it.min??10,min:0},{id:'who',label:'Responsable',type:'select',value:it.who||'',options:peopleOpts('Sin asignar')}]},
    {id:'notes',label:'Notas',type:'textarea',value:it.notes,ph:'Canciones, materiales, indicaciones…'}],
    onSave:async v=>{
      const row={id:it.id||uid(),title:v.title,min:Math.max(0,Number(v.min)||0),who:v.who,notes:v.notes};
      const items=it.id?(sc.items||[]).map(x=>x.id===it.id?row:x):[...(sc.items||[]),row];
      await save('jevscaletas',{...sc,items})},
    onDelete:it.id?async()=>{await save('jevscaletas',{...sc,items:(sc.items||[]).filter(x=>x.id!==it.id)})}:null,delLabel:'Quitar parte'})}
async function jevScMove(id,itemId,d){
  const sc=byId('jevscaletas',id);if(!sc||!jevMgr())return;
  const items=[...(sc.items||[])],i=items.findIndex(x=>x.id===itemId),j=i+d;
  if(i<0||j<0||j>=items.length)return;
  [items[i],items[j]]=[items[j],items[i]];
  await save('jevscaletas',{...sc,items});render()}
function jevScText(sc){
  const T=jevScTimes(sc);
  return `*${sc.title}*\n${[sc.date?fLong(sc.date):'',sc.time?'Empieza '+jevTime(sc.time):''].filter(Boolean).join(' · ')}\n\n`+
    T.map(({it,start})=>`${jevMin(start)} · *${it.title}* (${Number(it.min)||0} min)${it.who&&byId('people',it.who)?' — '+pName(it.who):''}${it.notes?'\n   '+it.notes:''}`).join('\n')+
    (sc.notes?`\n\n📝 ${sc.notes}`:'')+`\n\nArca · JEV+`}
async function jevScCopy(id){
  const sc=byId('jevscaletas',id);if(!sc)return;
  const txt=jevScText(sc);
  try{await navigator.clipboard.writeText(txt);toast('Escaleta copiada: pégala en WhatsApp.')}
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
