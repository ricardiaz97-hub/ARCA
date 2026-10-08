/* ===== Eventos estilo "evento de juego": banner en Inicio/Tú + página del evento =====
   Colección 'eventos' en arca_records (no necesita SQL):
   - kind:'event'  → el evento (título, fecha, culto vinculado, vestimenta, camiseta…)
   - kind:'me'     → progreso de cada persona (id = <evento>~<persona>): canciones ensayadas, vestimenta vista, invitación compartida */
const EV_COL='eventos';
const evAll=()=>S[EV_COL]||[];
const evEvents=()=>sortBy(evAll().filter(x=>x.kind==='event'),x=>x.date+(x.time||''));
function evActive(){return evEvents().find(x=>x.active!==false&&x.date>=addDays(TODAY,-1))||null}
const evCanEdit=()=>!!ME&&(ADMIN()||MANAGERS.includes(ME));
const evMeId=(ev,pid)=>ev.id+'~'+pid;
const evMine=(ev,pid=ME)=>pid?byId(EV_COL,evMeId(ev,pid))||null:null;
const evSvc=ev=>ev&&ev.svcId?svcLookup(ev.svcId):null;
const evImg=a=>!a?'':(isUrl(a)||String(a).startsWith('/'))?a:assetUrl(a);
const evMoney=n=>'$'+(Number(n)||0).toFixed(2);
function evAt(ev){const d=parse(ev.date);const [h,m]=String(ev.time||'00:00').split(':').map(Number);d.setHours(h||0,m||0,0,0);return d}
function evLeft(ev){let ms=Math.max(0,evAt(ev)-Date.now());const d=Math.floor(ms/864e5);ms-=d*864e5;const h=Math.floor(ms/36e5);ms-=h*36e5;const m=Math.floor(ms/6e4);ms-=m*6e4;return {d,h,m,s:Math.floor(ms/1e3),done:evAt(ev)<=Date.now()}}
function evLeftTxt(ev){const l=evLeft(ev);if(l.done)return ev.date===TODAY?'¡Es hoy!':'Ya fue';return l.d>1?`Faltan ${l.d} días`:l.d===1?'Falta 1 día':`Faltan ${l.h} h ${l.m} min`}
function evFace(pid,cls=''){const p=byId('people',pid);if(!p)return '';return p.photo?`<img class="${cls}" src="${assetUrl(p.photo)}" alt="" loading="lazy">`:`<span class="${cls} bg${colorOf(p.id)}">${esc(initials(p.name))}</span>`}

/* Canciones a ensayar: setlist del culto vinculado (o sus canciones del orden), con quién la dirige */
function evSongs(ev){const s=evSvc(ev);if(!s)return [];
  const items=(s.items||[]).filter(i=>i.kind==='song'&&i.title);
  const rows=(s.setlist||[]).filter(r=>r.song);
  const base=rows.length?rows.map(r=>({k:norm(r.song),song:r.song,artist:r.artist||'',key:r.key||'',row:r})):items.map(i=>({k:norm(i.title),song:i.title,artist:'',key:i.key||''}));
  const seen=new Set();
  return base.filter(x=>!seen.has(x.k)&&seen.add(x.k)).map(x=>{const it=items.find(i=>norm(i.title)===x.k);return {...x,lead:it?(it.notes||(it.who?pName(it.who):'')):''}})}
const evHasDress=ev=>!!(ev.dress||(ev.looks||[]).length||(ev.palettes||[]).length||(ev.pins||[]).length);
function evMissions(ev){const s=evSvc(ev),me=evMine(ev)||{},songs=evSongs(ev),prac=new Set(me.practiced||[]);
  const mine=s?(s.assignments||[]).filter(a=>a.personId===ME):[];const conf=mine.length&&mine.every(a=>a.status==='confirmado');
  const done=songs.filter(x=>prac.has(x.k)).length;const L=[];
  if(mine.length)L.push({id:'conf',t:'Confirma tu asistencia',sub:conf?'Confirmado':'Te toca '+(rolesOf(s,ME)||'servir'),ok:!!conf,act:conf?'':`<button class="btn primary sm" data-can="${esc(s.id)}">Sí, confirmo</button>`});
  L.push({id:'songs',t:songs.length?`Ensaya las ${songs.length} canciones`:'Ensaya el setlist',sub:songs.length?`${done} de ${songs.length} ensayadas`:'El setlist todavía no está listo',ok:songs.length>0&&done===songs.length,p:songs.length?done/songs.length:0,act:songs.length?'<button class="btn sm" data-evjump="evSongs">Ir al setlist</button>':''});
  L.push({id:'dress',t:'Revisa el código de vestimenta',sub:!evHasDress(ev)?'Muy pronto: paletas y referencias':me.dressOk?'Visto':'Paletas, colores y referencias',ok:!!me.dressOk,act:evHasDress(ev)&&!me.dressOk?'<button class="btn sm" data-evjump="evDress">Ver vestimenta</button>':''});
  L.push({id:'share',t:'Invita a alguien',sub:me.shared?'¡Gracias por invitar!':'Comparte la invitación por WhatsApp',ok:!!me.shared,act:me.shared?'':`<button class="btn sm" data-evx="share">Invitar</button>`});
  return L}
async function evSaveMe(ev,patch){const cur=evMine(ev)||{id:evMeId(ev,ME),kind:'me',ev:ev.id,pid:ME};
  const before=evMissions(ev).filter(m=>m.ok).length;const ok=await save(EV_COL,{...cur,...patch,at:new Date().toISOString()});
  if(ok){const ms=evMissions(ev);if(ms.every(m=>m.ok)&&before<ms.length){estBurst();toast('¡Misiones completas! Estás listo para grabar.')}}
  render();return ok}

/* ---------- Banner ---------- */
function evBanner(compact){const ev=evActive();if(!ev)return evCanEdit()&&!evEvents().length&&!compact?`<section class="panel evseed"><div><b>Nuevo: eventos</b><span class="muted">Crea el evento de la grabación y aparecerá como banner para todo el equipo.</span></div><button class="btn primary sm" data-evx="seed">Crear evento A TU LADO</button></section>`:'';
  const s=evSvc(ev),st=s?svcStats(s):null,songs=evSongs(ev),ms=ME?evMissions(ev):[],okN=ms.filter(m=>m.ok).length;
  const ids=s?[...new Set((s.assignments||[]).filter(a=>a.personId&&a.status!=='declinado').sort((a,b)=>isLead(b)-isLead(a)).map(a=>a.personId))]:[];
  const cast=ev.art?`<img class="evb-art" src="${esc(evImg(ev.art))}" alt="" loading="lazy">`:ids.length?`<span class="evb-cast" aria-hidden="true">${ids.slice(0,7).map((pid,i)=>`<span class="evb-p" style="--i:${i}">${evFace(pid)}</span>`).join('')}</span>`:`<img class="evb-logo" src="/img/philly-logo.webp" alt="" aria-hidden="true">`;
  return `<button type="button" class="evb${compact?' sm':''}" data-evento="${esc(ev.id)}" aria-label="Abrir el evento ${esc(ev.title)}">
    <span class="evb-bg" aria-hidden="true"><i class="evb-rays"></i><i class="evb-ring"></i></span>${cast}<span class="evb-shade" aria-hidden="true"></span>
    <span class="evb-tx"><span class="evb-tag">Evento limitado</span><span class="gr" aria-hidden="true">${esc(ev.greek||'ΜΕΤΑ ΣΟΥ')}</span>
      <span class="evb-t">${esc(ev.title)}</span>${ev.kicker?`<span class="evb-k">${esc(ev.kicker)}</span>`:''}
      <span class="evb-d">${esc(fDate(ev.date,{weekday:'short',day:'numeric',month:'short'}))} · ${esc(ampm(ev.time))}${ev.place?' · '+esc(ev.place):''}</span>
      <span class="evb-st"><b data-cdtxt="${esc(ev.id)}">${esc(evLeftTxt(ev))}</b>${st&&st.total?`<span>${st.ok}/${st.total} confirmados</span>`:''}${songs.length?`<span>${songs.length} canciones</span>`:''}${ms.length?`<span>Misiones ${okN}/${ms.length}</span>`:''}</span></span>
    <span class="evb-go">Ver evento <span aria-hidden="true">›</span></span></button>`}

/* ---------- Página del evento ---------- */
function vEvento(){const ev=byId(EV_COL,ui.eventoId)||evActive();
  const back=`<button class="linkb evback" data-go="inicio">‹ Volver a Inicio</button>`;
  if(!ev)return `${back}<section class="panel empty"><b>No hay eventos activos</b>${evCanEdit()?'<p><button class="btn primary" data-evx="seed">Crear evento A TU LADO</button></p>':'Cuando haya uno, aparecerá aquí.'}</section>`;
  const s=evSvc(ev),ed=evCanEdit(),me=evMine(ev)||{},l=evLeft(ev);
  const ids=s?[...new Set((s.assignments||[]).filter(a=>a.personId&&a.status!=='declinado').sort((a,b)=>isLead(b)-isLead(a)).map(a=>a.personId))]:[];
  const cd=`<ol class="evcd" role="timer" aria-label="Tiempo para el evento" data-cd="${esc(ev.id)}">${[['d','Días',l.d],['h','Horas',l.h],['m','Min',l.m],['s','Seg',l.s]].map(([k,u,n])=>`<li><b data-u="${k}">${String(n).padStart(2,'0')}</b><span>${u}</span></li>`).join('')}</ol>`;
  const hero=`<section class="evh">
    <span class="evb-bg" aria-hidden="true"><i class="evb-rays"></i><i class="evb-ring"></i></span>
    ${ev.art?`<img class="evb-art" src="${esc(evImg(ev.art))}" alt="Arte del evento ${esc(ev.title)}">`:ids.length?`<span class="evb-cast" aria-hidden="true">${ids.slice(0,9).map((pid,i)=>`<span class="evb-p" style="--i:${i}">${evFace(pid)}</span>`).join('')}</span>`:''}
    <span class="evb-shade" aria-hidden="true"></span>
    <div class="evh-tx"><span class="evb-tag">Evento limitado</span><span class="gr" aria-hidden="true">${esc(ev.greek||'ΜΕΤΑ ΣΟΥ')}</span>
      <h1 class="evb-t">${esc(ev.title)}</h1>${ev.kicker?`<p class="evb-k">${esc(ev.kicker)}</p>`:''}${ev.tagline?`<p class="evh-tag">${esc(ev.tagline)}</p>`:''}
      <p class="evb-d">${esc(fDate(ev.date,{weekday:'long',day:'numeric',month:'long'}).replace(/^./,c=>c.toUpperCase()))} · ${esc(ampm(ev.time))}${ev.place?' · '+esc(ev.place):''}</p>
      ${l.done?`<p class="evh-done">${ev.date===TODAY?'¡Es hoy! Dios con nosotros.':'Este evento ya pasó. ¡Gracias, equipo!'}</p>`:cd}
      <div class="row evh-act">${ev.link&&isUrl(ev.link)?`<a class="btn" href="${esc(ev.link)}" target="_blank" rel="noopener">Página del evento</a>`:''}<a class="btn ghost" href="${evGcal(ev)}" target="_blank" rel="noopener">Agregar a mi calendario</a>${ed?'<button class="btn ghost" data-evx="edit">Editar evento</button>':''}</div></div></section>`;

  const ms=ME?evMissions(ev):[];const okN=ms.filter(m=>m.ok).length;
  const missions=ms.length?`<section class="panel evm"><div class="panel-h"><h2>Misiones del evento</h2><span class="evm-n">${sparksFor(okN,ms.length)}<b>${okN}/${ms.length}</b></span></div>
    <ul class="evm-l">${ms.map(m=>`<li class="${m.ok?'ok':''}"><span class="evm-k" aria-hidden="true">${m.ok?'✓':''}</span><span class="grow"><b>${esc(m.t)}</b><span class="small">${esc(m.sub)}</span>${m.p!=null&&!m.ok?`<span class="evm-bar" style="--p:${Math.round(m.p*100)}"><i></i></span>`:''}</span>${m.ok?'<span class="pill st-confirmado">Hecho</span>':m.act||''}</li>`).join('')}</ul>
    ${okN===ms.length?'<p class="evm-win">¡Listo para grabar! Completaste todas las misiones.</p>':''}</section>`:'';

  const about=ev.about?`<section class="panel"><div class="panel-h"><h2>¿Qué es ${esc(ev.title)}?</h2></div><p class="evp">${esc(ev.about)}</p></section>`:'';

  /* Equipo */
  let team;
  if(!s)team=`<section class="panel"><div class="panel-h"><h2>Equipo</h2></div><div class="empty">${ed?`<b>Este evento aún no tiene culto vinculado</b>Crea el culto con el cronograma de la grabación o vincula uno que ya exista.<p class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" data-evx="mksvc">Crear el culto con el cronograma</button><button class="btn ghost" data-evx="edit">Vincular un culto</button></p>`:'El equipo y el setlist aparecerán cuando se programe el culto.'}</div></section>`;
  else{const A=(s.assignments||[]).filter(a=>a.personId).sort((a,b)=>isLead(b)-isLead(a)||String(a.position).localeCompare(String(b.position)));const st=svcStats(s);
    team=`<section class="panel evteam"><div class="panel-h"><div><h2>Equipo</h2><span class="muted small">${st.ok} de ${st.total} confirmados${st.pend?' · '+st.pend+' sin confirmar':''}</span></div>${ed?`<button class="btn ghost sm" data-svcedit="${esc(s.id)}">Asignar equipo</button>`:''}</div>
      ${st.total?`<span class="evm-bar big" style="--p:${Math.round(st.ok/st.total*100)}"><i></i></span>`:''}
      ${A.length?`<ul class="evteam-l">${A.map(a=>`<li class="st-${a.status||'pendiente'}"><span class="evteam-ph">${evFace(a.personId)}</span><span class="grow"><b class="trunc">${esc(pName(a.personId).split(/\s+/).slice(0,2).join(' '))}</b><span class="small">${esc(a.position||'')}${isLead(a)?' · dirige':''}</span></span><span class="pill st-${a.status||'pendiente'}">${a.status==='confirmado'?'✓':a.status==='declinado'?'No va':'Pendiente'}</span>${ed&&a.status!=='confirmado'&&a.status!=='declinado'?waAssign(s,a):''}</li>`).join('')}</ul>`:`<div class="empty">${ed?'Todavía no hay nadie asignado. Toca “Asignar equipo”.':'Todavía no hay nadie asignado.'}</div>`}</section>`}

  /* Setlist para ensayar */
  const songs=evSongs(ev),prac=new Set(me.practiced||[]);
  const setl=s?`<section class="panel evsongs" id="evSongs"><div class="panel-h"><div><h2>Qué ensayar</h2><span class="muted small">${songs.length?`${songs.filter(x=>prac.has(x.k)).length} de ${songs.length} ensayadas por ti`:'Sin canciones todavía'}</span></div><button class="btn ghost sm" data-svc="${esc(s.id)}">Abrir el culto</button></div>
    ${ev.rehearseNote?`<p class="evp small" style="margin-top:0">${esc(ev.rehearseNote)}</p>`:''}
    ${songs.length?`<ol class="evsongs-l">${songs.map((x,i)=>{const on=prac.has(x.k);const r=x.row||{};const lis=isUrl(r.version)?r.version:'';const demo=lis?`<a class="btn sm ghost" href="${esc(lis)}" target="_blank" rel="noopener">▶ Escuchar demo</a>`:ev.link&&isUrl(ev.link)?`<a class="btn sm ghost" href="${esc(ev.link)}" target="_blank" rel="noopener">▶ Demo en la página</a>`:'<span class="chip">Demo pendiente</span>';
      return `<li class="${on?'on':''}"><span class="evsongs-n">${i+1}</span><span class="grow"><b>${esc(x.song)}</b><span class="small">${esc([x.lead,x.artist].filter(Boolean).join(' · '))}</span>${sparks(songTimes(x.song))}</span><span class="evsongs-a">${x.key?`<span class="key">${esc(x.key)}</span>`:''}${demo}${ME?`<button class="evprac" data-evprac="${esc(x.k)}" aria-pressed="${on}">${on?'✓ Ensayada':'Marcar ensayada'}</button>`:''}</span></li>`}).join('')}</ol>`:'<div class="empty">Cuando el culto tenga su setlist, aparecerá aquí para ensayar.</div>'}
    ${(ev.rehearsals||[]).length?`<h3 class="evh3">Ensayos</h3><ul class="list">${ev.rehearsals.map(r=>`<li><span class="datebox"><small>${esc(fDate(r.date,{month:'short'}))}</small><b>${parse(r.date).getDate()}</b></span><span class="grow"><b>${esc(fDate(r.date,{weekday:'long'}).replace(/^./,c=>c.toUpperCase()))}${r.time?' · '+esc(ampm(r.time)):''}</b>${r.place||r.note?`<span class="small" style="display:block">${esc([r.place,r.note].filter(Boolean).join(' · '))}</span>`:''}</span></li>`).join('')}</ul>`:''}</section>`:'';

  /* Horario del día + cronograma */
  const items=s?(s.items||[]):[];let t=mins(s?s.time:ev.time);
  const day=`<section class="panel"><div class="panel-h"><h2>El día del evento</h2></div>
    ${(ev.calls||[]).length?`<ul class="evcalls">${ev.calls.map(c=>`<li><span class="mono">${esc(ampm(c.t))}</span><span>${esc(c.what)}</span></li>`).join('')}</ul>`:''}
    ${items.length?`<details class="evrun"><summary>Cronograma completo · ${items.filter(i=>i.kind!=='header').length} puntos</summary><ol>${items.map(i=>{if(i.kind==='header')return `<li class="hd">${esc(i.title)}</li>`;const r=`<li class="${i.kind==='song'?'':'min'}"><span class="mono">${hhmm(t)}</span><span class="grow"><b>${esc(i.title)}</b>${i.notes||i.who?`<span class="small">${esc([i.who?pName(i.who):'',i.notes].filter(Boolean).join(' · '))}</span>`:''}</span></li>`;t+=Number(i.minutes)||0;return r}).join('')}</ol></details>`:''}</section>`;

  /* Vestimenta */
  const pal=ev.palettes||[],pins=ev.pins||[],looks=ev.looks||[];
  const dress=`<section class="panel evdress" id="evDress"><div class="panel-h"><h2>Código de vestimenta</h2>${ME&&evHasDress(ev)?(me.dressOk?'<span class="pill st-confirmado">✓ Visto</span>':'<button class="btn primary sm" data-evx="dressok">Entendido</button>'):''}</div>
    ${!evHasDress(ev)?`<div class="empty"><b>Muy pronto</b>Aquí verás las paletas de colores y las referencias de Pinterest para vestirnos el día del evento.</div>`:`
    ${ev.dress?`<p class="evp">${esc(ev.dress)}</p>`:''}
    ${looks.length?`<div class="evlooks">${looks.map((u,i)=>`<a href="${esc(evImg(u))}" target="_blank" rel="noopener" class="evlook"><img src="${esc(evImg(u))}" alt="Referencia de vestimenta ${i+1}" loading="lazy"></a>`).join('')}</div>`:''}
    ${pal.length?`<div class="evpal">${pal.map(p=>`<div class="evpal-c"><span class="small">${esc(p.name||'Paleta')}</span><div class="evpal-s">${(p.colors||[]).map(c=>`<button class="evsw" style="--c:${esc(c)}" data-evcopy="${esc(c)}" title="Copiar ${esc(c)}" aria-label="Color ${esc(c)}, tocar para copiar"><span>${esc(c)}</span></button>`).join('')}</div></div>`).join('')}</div>`:''}
    ${pins.length?`<div class="row evpins">${pins.map(p=>`<a class="btn ghost sm" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.label||'Ver en Pinterest')} ↗</a>`).join('')}</div>`:''}`}</section>`;

  /* Camiseta (mercancía para los asistentes) */
  const sh=ev.shirt||null;
  const shirt=sh&&sh.name?`<section class="panel evshirt"><div class="panel-h"><div><h2>${esc(sh.name)}</h2><span class="muted small">${esc(sh.note||'A la venta para los asistentes')}</span></div><span class="evprice">${evMoney(sh.price)}</span></div>
    ${sh.img?`<img class="evshirt-img" src="${esc(evImg(sh.img))}" alt="${esc(sh.name)}: ${esc(sh.desc||'')}" loading="lazy">`:''}
    ${sh.desc?`<p class="evp small">${esc(sh.desc)}</p>`:''}${(sh.sizes||[]).length?`<p class="small">Tallas: ${sh.sizes.map(z=>`<span class="chip">${esc(z)}</span>`).join(' ')}</p>`:''}
    <div class="row"><a class="btn ghost sm" href="https://wa.me/?text=${encodeURIComponent(`🧡 ${sh.name} · ${evMoney(sh.price)}\n${sh.desc||''}\nPara la ${ev.kicker||'actividad'} ${ev.title} · ${fDate(ev.date,{day:'numeric',month:'long'})} · ${ampm(ev.time)}`)}" target="_blank" rel="noopener">Compartir por WhatsApp</a></div></section>`:'';

  return `${back}${hero}<div class="grid2 evgrid"><div class="stack">${missions}${about}${setl}</div><div class="stack">${team}${day}${dress}${shirt}</div></div>`}
function sparksFor(n,t){return `<span class="sparks" aria-hidden="true">${Array.from({length:t},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`}
function evGcal(ev){const a=evAt(ev),b=new Date(a.getTime()+2*36e5);const f=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(ev.title+(ev.kicker?' · '+ev.kicker:''))+'&dates='+f(a)+'/'+f(b)+'&location='+encodeURIComponent(ev.place||'')+'&details='+encodeURIComponent(ev.tagline||'')}

/* ---------- Datos iniciales (de la reunión de ministerios) ---------- */
const EV_PRESET={kind:'event',title:'A TU LADO',kicker:'Grabación en vivo',greek:'ΜΕΤΑ ΣΟΥ',tagline:'Segundo disco de Philly · re-versiones de himnos antiguos',
  date:'2026-11-07',time:'17:00',place:'Taber Olocuilta',active:true,
  about:'Vamos a grabar en vivo el segundo disco de Philly: re-versiones de himnos antiguos, junto con toda la iglesia. Para que salga bien necesitamos a todo el equipo asignado, confirmado y con las canciones ensayadas. Completa tus misiones y nos vemos en la tarima.',
  calls:[{t:'15:00',what:'Llegada de todos los ministerios'},{t:'16:30',what:'Oración grupal y apertura del templo'},{t:'17:00',what:'Inicio de la grabación'},{t:'18:50',what:'Cierre estimado'}],
  rehearsals:[],rehearseNote:'Son canciones nuestras: ensaya con el demo de cada una, llega con tu parte lista y márcala cuando ya la tengas.',
  dress:'',looks:[],palettes:[],pins:[],
  shirt:{name:'Camiseta A TU LADO',note:'A la venta para los asistentes',price:5.5,desc:'Negra. Frente: arte A TU LADO en naranja. Espalda: Philly | Taber Olocuilta.',img:'/img/evento-camiseta.webp',sizes:[]},
  link:''};
const EV_RUN=[['17:00','Te Exaltaré','Arreglo coral'],['17:04','Grandes y Maravillosas','Andrés · confeti al inicio'],['17:08','Ven Espíritu Ven','Ricardo + Andrés'],['17:13','Poderoso','Tefa + Rebe'],['17:18','Tu Nombre Levantaré','Milena + Yesy'],['17:23','Solo de Jesús, la Sangre','Ricardo + Armando · primera vez'],['17:29','Pero Queda Cristo','Andrés + Ricardo'],['17:34','Vine a Alabar a Dios','Andrés + Mario'],['17:39','Popurrí Philly #1','Andrés + Coro · Gaby · Oh Moradora, Pon Aceite, Le Llaman Guerrero, En los Montes'],['17:47','He Decidido','Yesy ft. Wendy Interiano'],['17:54','Ministración','Yesy','item'],['18:00','Jesús','Tefa, Rebe, Mile'],['18:05','A Tu Lado','Ricardo + Andrés'],['18:15','Ministración','Ps Ricardo Vega','item'],['18:35','Llamado a recibir al Señor','Ps Mario Baires','item'],['18:40','Solo de Jesús (acústica y piano)','Arreglo coral'],['18:45','Enfoque','Todos','item'],['18:50']];
async function evMakeSvc(ev){
  const items=EV_RUN.slice(0,-1).map((r,i)=>{const so=S.songs.find(x=>norm(x.title)===norm(r[1]));const kind=r[3]||'song';
    return {id:uid(),kind,title:r[1],minutes:Math.max(1,mins(EV_RUN[i+1][0])-mins(r[0])),who:'',notes:r[2]||'',key:kind==='song'&&so?normKey(so.key)||'':'',songId:kind==='song'&&so?so.id:''}});
  const setlist=items.filter(i=>i.kind==='song').map(i=>{const so=byId('songs',i.songId);return {id:uid(),song:i.title,artist:so&&so.artist||'',version:'',key:i.key||'',voice:'',drive:''}});
  const sid=await save('services',{title:(ev.kicker||'Evento')+' · '+ev.title,date:ev.date,time:ev.time,series:ev.title,items,setlist,assignments:[]});
  if(sid&&await save(EV_COL,{...ev,svcId:sid})){toast('Listo: culto creado con el cronograma. Ahora asigna al equipo.');render()}}

/* ---------- Editor ---------- */
const evLines=s=>String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const evCells=l=>l.split('|').map(x=>x.trim());
function evEdit(ev){ev=ev||{...EV_PRESET};
  const svcs=upcomingSvcs(150).filter(x=>!x.cancelled);if(ev.svcId&&!svcs.some(x=>x.id===ev.svcId)){const cur=svcLookup(ev.svcId);if(cur)svcs.unshift(cur)}
  const sh=ev.shirt||{};
  openForm({title:ev.id?'Editar evento':'Nuevo evento',intro:`<p class="small" style="margin-top:0">Las listas van <b>una por línea</b>; separa las partes con <b>|</b>.</p>`,
    fields:[{type:'pair',fields:[{id:'title',label:'Nombre del evento',required:true,value:ev.title||''},{id:'kicker',label:'Tipo (ej. Grabación en vivo)',value:ev.kicker||''}]},
      {id:'tagline',label:'Frase corta',value:ev.tagline||''},
      {type:'pair',fields:[{id:'date',label:'Fecha',type:'date',required:true,value:ev.date||''},{id:'time',label:'Hora',type:'time',value:ev.time||''}]},
      {type:'pair',fields:[{id:'place',label:'Lugar',value:ev.place||''},{id:'greek',label:'Texto griego decorativo',value:ev.greek||'ΜΕΤΑ ΣΟΥ'}]},
      {id:'svcId',label:'Culto del evento (equipo y setlist salen de aquí)',type:'select',value:ev.svcId||'',options:[['','— Ninguno todavía —'],...svcs.map(x=>[x.id,fDate(x.date,{day:'numeric',month:'short'})+' · '+ampm(x.time)+' · '+x.title])]},
      {id:'art',label:'Arte del banner (link de imagen, o súbela abajo)',value:ev.art||'',ph:'https://…'},
      {type:'html',html:`<div class="field"><span class="lbl">Subir arte del banner</span><input type="file" id="evArtFile" accept="image/*"><span class="small" id="evArtMsg">Horizontal, 1920×820 aprox. Se guarda en Google Drive.</span></div>`},
      {id:'about',label:'¿Qué es? (aparece en la página del evento)',type:'textarea',value:ev.about||''},
      {id:'calls',label:'El día del evento · hora | qué pasa',type:'textarea',value:(ev.calls||[]).map(c=>c.t+' | '+c.what).join('\n'),ph:'15:00 | Llegada de todos'},
      {id:'rehearsals',label:'Ensayos · fecha | hora | lugar | nota',type:'textarea',value:(ev.rehearsals||[]).map(r=>[r.date,r.time,r.place,r.note].join(' | ')).join('\n'),ph:'2026-10-31 | 15:00 | Templo | Corrida completa'},
      {id:'rehearseNote',label:'Nota para ensayar',type:'textarea',value:ev.rehearseNote||''},
      {id:'dress',label:'Código de vestimenta',type:'textarea',value:ev.dress||''},
      {id:'looks',label:'Referencias de vestimenta · un link de imagen por línea',type:'textarea',value:(ev.looks||[]).join('\n'),ph:'https://i.pinimg.com/…'},
      {type:'html',html:`<div class="field"><span class="lbl">Subir referencias de vestimenta</span><input type="file" id="evLookFiles" accept="image/*" multiple><span class="small" id="evLookMsg">Capturas o imágenes de Pinterest.</span></div>`},
      {id:'palettes',label:'Paletas · nombre: #color #color …',type:'textarea',value:(ev.palettes||[]).map(p=>(p.name||'Paleta')+': '+(p.colors||[]).join(' ')).join('\n'),ph:'Noche naranja: #181512 #E85D04 #F2E8D2'},
      {id:'pins',label:'Tableros de Pinterest · nombre | link',type:'textarea',value:(ev.pins||[]).map(p=>p.label+' | '+p.url).join('\n'),ph:'Outfits del evento | https://pin.it/…'},
      {type:'pair',fields:[{id:'shName',label:'Mercancía (camiseta)',value:sh.name||''},{id:'shPrice',label:'Precio ($)',type:'number',value:sh.price??''}]},
      {id:'shNote',label:'Para quién es',value:sh.note||'A la venta para los asistentes'},
      {id:'shDesc',label:'Descripción de la camiseta',value:sh.desc||''},
      {id:'shSizes',label:'Tallas (separadas por coma)',value:(sh.sizes||[]).join(', ')},
      {id:'link',label:'Página pública del evento (opcional)',value:ev.link||'',ph:'https://…'},
      {id:'active',label:'Mostrar el banner',type:'select',value:ev.active===false?'no':'si',options:[['si','Sí, mostrarlo'],['no','No, ocultarlo']]}],
    onSave:async v=>{
      const pal=evLines(v.palettes).map(l=>{const m=/^(.*?):\s*(.*)$/.exec(l);const colors=((m?m[2]:l).match(/#[0-9a-f]{3,8}\b/gi)||[]);return {name:m?m[1].trim():'Paleta',colors}}).filter(p=>p.colors.length);
      const pins=evLines(v.pins).map(l=>{const c=evCells(l);const url=c.find(isUrl)||'';return {label:c[0]&&!isUrl(c[0])?c[0]:'Ver en Pinterest',url}}).filter(p=>p.url);
      const doc={...ev,kind:'event',title:v.title,kicker:v.kicker,tagline:v.tagline,date:v.date,time:v.time,place:v.place,greek:v.greek,svcId:v.svcId,art:v.art,about:v.about,
        calls:evLines(v.calls).map(l=>{const c=evCells(l);return {t:c[0]||'',what:c.slice(1).join(' | ')}}).filter(c=>c.what),
        rehearsals:sortBy(evLines(v.rehearsals).map(l=>{const c=evCells(l);return {date:c[0]||'',time:c[1]||'',place:c[2]||'',note:c[3]||''}}).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)),r=>r.date+r.time),
        rehearseNote:v.rehearseNote,dress:v.dress,looks:evLines(v.looks).filter(x=>isUrl(x)||/^drive:|^[\w-]{10,}$/.test(x)),palettes:pal,pins,
        shirt:{...sh,name:v.shName,price:v.shPrice===''?'':Number(v.shPrice),note:v.shNote,desc:v.shDesc,sizes:v.shSizes.split(',').map(x=>x.trim()).filter(Boolean)},
        link:v.link,active:v.active!=='no',updatedAt:new Date().toISOString()};
      const id=await save(EV_COL,doc);if(id){ui.eventoId=id;toast('Listo: evento guardado.')}},
    onDelete:ev.id?async()=>{await remove(EV_COL,ev.id);ui.eventoId=null;toast('Evento borrado.');go('inicio')}:null,delLabel:'Borrar evento'});
  const up=async(files,onDone,msg)=>{if(!ASSETS){toast('Conecta Google Drive para subir imágenes, o pega el link.');return}
    msg.textContent='Subiendo…';const ids=[];for(const f of files){try{const r=await ASSETS.upload(f,{type:f.type||'image/jpeg'});ids.push(r.id)}catch(e){assetErr(e)}}
    msg.textContent=ids.length?`Listo: ${ids.length} ${ids.length===1?'imagen':'imágenes'}. Toca Guardar.`:'No se pudo subir.';onDone(ids)};
  const af=$('#evArtFile'),lf=$('#evLookFiles');
  if(af)af.onchange=()=>af.files[0]&&up([af.files[0]],ids=>{if(ids[0])$('#f_art').value=ids[0]},$('#evArtMsg'));
  if(lf)lf.onchange=()=>lf.files.length&&up([...lf.files],ids=>{const t=$('#f_looks');t.value=[t.value.trim(),...ids].filter(Boolean).join('\n')},$('#evLookMsg'));
}

/* ---------- Acciones ---------- */
document.addEventListener('click',async e=>{
  const t=e.target.closest&&e.target.closest('[data-evento],[data-evx],[data-evprac],[data-evjump],[data-evcopy]');if(!t||t.closest('#drawerRoot'))return;const d=t.dataset;
  if(d.evento){ui.eventoId=d.evento;ui.route='evento';ui.serviceId=null;try{history.replaceState(null,'','#evento')}catch(_){}render();window.scrollTo(0,0);return enterMain()}
  if(d.evjump){const el=document.getElementById(d.evjump);if(el)el.scrollIntoView({block:'start',behavior:RM.matches?'auto':'smooth'});return}
  if(d.evcopy){try{await navigator.clipboard.writeText(d.evcopy);toast('Copiado: '+d.evcopy)}catch(_){toast(d.evcopy)}return}
  const ev=byId(EV_COL,ui.eventoId)||evActive();
  if(d.evprac&&ev){const me=evMine(ev)||{};const set=new Set(me.practiced||[]);set.has(d.evprac)?set.delete(d.evprac):set.add(d.evprac);return evSaveMe(ev,{practiced:[...set]})}
  switch(d.evx){
    case 'seed':{if(!evCanEdit())return;const id=await save(EV_COL,{...EV_PRESET,createdAt:new Date().toISOString(),by:ME});if(id){ui.eventoId=id;toast('Evento creado. Ya aparece en Inicio.');ui.route='evento';render()}return}
    case 'edit':return evCanEdit()&&evEdit(ev);
    case 'mksvc':return evCanEdit()&&ev&&evMakeSvc(ev);
    case 'dressok':return ev&&evSaveMe(ev,{dressOk:true});
    case 'share':{if(!ev)return;const msg=`🧡 ${ev.title}${ev.kicker?' · '+ev.kicker:''}\n${fDate(ev.date,{weekday:'long',day:'numeric',month:'long'})} · ${ampm(ev.time)}${ev.place?'\n📍 '+ev.place:''}\n\n${ev.tagline||''}\n¡Te esperamos! Hay un asiento reservado para ti.${ev.link&&isUrl(ev.link)?'\n'+ev.link:''}`;
      window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');return evSaveMe(ev,{shared:true})}
  }
});
/* Cuenta regresiva viva (solo si hay una en pantalla) */
setInterval(()=>{const els=document.querySelectorAll('[data-cd],[data-cdtxt]');if(!els.length)return;
  els.forEach(el=>{const ev=byId(EV_COL,el.dataset.cd||el.dataset.cdtxt);if(!ev)return;
    if(el.dataset.cdtxt){const t=evLeftTxt(ev);if(el.textContent!==t)el.textContent=t;return}
    const l=evLeft(ev);for(const k of ['d','h','m','s']){const b=el.querySelector(`[data-u="${k}"]`);const v=String(l[k]).padStart(2,'0');if(b&&b.textContent!==v)b.textContent=v}})},1000);
