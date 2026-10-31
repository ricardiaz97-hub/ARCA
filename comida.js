/* ===== Pedido de comida (Philly) =====
   Colección 'comidas' en arca_records (no necesita SQL):
   - kind:'order' → la votación: título, fecha, hora de cierre, opciones de restaurante, ganador, estado, quién pagó al restaurante, envío y pagos.
                    Solo la cambian quien la creó, los administradores y los encargados.
   - kind:'me'    → lo de cada persona (id = <pedido>~<persona>): si come, su voto y lo que escogió.
                    Un registro por persona para que dos votos al mismo tiempo no se pisen.
   Estados: 'votando' → 'pidiendo' (ya hay restaurante, cada quien escoge) → 'pedido' (ya se pidió, se cobra) → 'cerrado'. */
const FD_COL='comidas';
const FD_ANS=[['como','Sí como','🍽️'],['aparte','Como aparte','🥡'],['no','No voy','🚫']];
const FD_ST={votando:'Votación abierta',pidiendo:'Escogiendo comida',pedido:'Pedido hecho',cerrado:'Terminado'};
const fdAll=()=>S[FD_COL]||[];
const fdOrders=()=>sortBy(fdAll().filter(x=>x.kind==='order'),x=>(x.date||'')+(x.createdAt||'')).reverse();
const fdActive=()=>SPACE==='philly'?fdOrders().find(o=>o.status!=='cerrado'&&(o.date||TODAY)>=addDays(TODAY,-1))||null:null;
const fdMeId=(o,pid)=>o.id+'~'+pid;
const fdMe=(o,pid=ME)=>pid?byId(FD_COL,fdMeId(o,pid))||null:null;
const fdRows=o=>fdAll().filter(x=>x.kind==='me'&&x.order===o.id&&byId('people',x.pid));
const fdMoney=n=>'$'+(Math.round((Number(n)||0)*100)/100).toFixed(2);
const fdFirst=pid=>firstN(pid);
const fdCanEdit=o=>!!ME&&(!o||o.by===ME||ADMIN()||MANAGERS.includes(ME));
const fdOpt=(o,id)=>(o.options||[]).find(x=>x.id===id)||null;
const fdWinner=o=>o&&o.winner?fdOpt(o,o.winner):null;
const fdEaters=o=>fdRows(o).filter(r=>r.ans==='como');
const fdItemsSum=r=>(r&&r.items||[]).reduce((t,it)=>t+(Number(it.price)||0)*(Math.max(1,Number(it.qty)||1)),0);
const fdItemTxt=it=>`${Math.max(1,Number(it.qty)||1)>1?Math.max(1,Number(it.qty)||1)+' × ':''}${it.name}${Number(it.price)?' - '+fdMoney(it.price):''}${it.note?' ('+it.note+')':''}`;
/* Cierre de la votación: fecha + hora local */
function fdCloseAt(o){if(!o.closeTime)return null;const d=parse(o.closeDate||o.date||TODAY);const [h,m]=String(o.closeTime).split(':').map(Number);d.setHours(h||0,m||0,0,0);return d}
const fdVoteOpen=o=>o.status==='votando'&&!(fdCloseAt(o)&&fdCloseAt(o)<=new Date());
/* Votos: solo cuentan los de quien va a comer */
function fdTally(o){const t=new Map((o.options||[]).map(x=>[x.id,[]]));
  for(const r of fdRows(o))if(r.ans==='como'&&r.vote&&t.has(r.vote))t.get(r.vote).push(r.pid);
  return (o.options||[]).map(x=>({opt:x,who:t.get(x.id)})).sort((a,b)=>b.who.length-a.who.length)}
/* Cuentas: comida de cada quien + su parte del envío/propina (entre los que pidieron algo) */
function fdBill(o){const rows=fdRows(o).filter(r=>r.ans==='como'&&(r.items||[]).length);
  const food=rows.reduce((t,r)=>t+fdItemsSum(r),0),extra=Math.max(0,Number(o.delivery)||0),share=rows.length?extra/rows.length:0;
  return {rows,food,extra,share,total:food+extra,owe:pid=>{const r=rows.find(x=>x.pid===pid);return r?fdItemsSum(r)+share:0}}}
const fdPush=(event,extra={})=>o=>{try{if(typeof window.arcaPush==='function')window.arcaPush({kind:'comida',space:'philly',id:o.id,event,...extra})}catch(_){}};
async function fdSaveMe(o,patch,pid=ME){const cur=fdMe(o,pid)||{id:fdMeId(o,pid),kind:'me',order:o.id,pid};
  const ok=await save(FD_COL,{...cur,...patch,at:new Date().toISOString()});render();return ok}
async function fdSaveOrder(o,patch){const ok=await save(FD_COL,{...o,...patch});render();return ok}
function fdFace(pid){const p=byId('people',pid);if(!p)return '<span class="fd-face fd-none">?</span>';return p.photo?`<img class="fd-face" src="${assetUrl(p.photo)}" alt="" loading="lazy">`:`<span class="fd-face bg${colorOf(p.id)}">${esc(initials(p.name))}</span>`}
const fdFaces=(ids,n=6)=>`<span class="fd-faces">${ids.slice(0,n).map(fdFace).join('')}${ids.length>n?`<span class="fd-face fd-more">+${ids.length-n}</span>`:''}</span>`;
function fdWhen(o){const c=fdCloseAt(o);if(!c)return '';const today=iso(c)===TODAY;
  return (c<=new Date()?'Cerró ':'Cierra ')+(today?'hoy':fDate(iso(c),{weekday:'long'}))+' a las '+ampm(o.closeTime)}

/* ---------- Banner (Inicio y Tú) ---------- */
function foodBanner(compact){if(SPACE!=='philly'||!ME)return '';const o=fdActive();
  if(!o){if(compact)return '';const wd=parse(TODAY).getDay();if(![4,5,6,0].includes(wd))return '';
    return `<section class="panel fd-seed"><div><b>🍽️ ¿Encargan comida el domingo?</b><span class="muted">Abre una votación: pones los restaurantes y cada quien vota.</span></div><button class="btn sm" data-fdx="new">Abrir votación</button></section>`}
  const me=fdMe(o)||{},w=fdWinner(o),t=fdTally(o),lead=t[0]&&t[0].who.length?t[0]:null,eat=fdEaters(o).length;
  let st='',cta='';
  if(o.status==='votando'){st=lead?`Va ganando <b>${esc(lead.opt.name)}</b> (${lead.who.length})`:'Nadie ha votado todavía';
    cta=!me.ans?'Falta que respondas':me.ans==='como'&&!me.vote?'Falta tu voto':me.ans==='como'?'✓ Ya votaste':me.ans==='aparte'?'Comes aparte':'No vas'}
  else if(o.status==='pidiendo'){st=`Ganó <b>${esc(w?w.name:'')}</b> · ${fdBill(o).rows.length}/${eat} ya escogieron`;
    cta=me.ans==='como'?((me.items||[]).length?'✓ Ya escogiste':'Escoge tu comida'):me.ans?'':'Falta que respondas'}
  else if(o.status==='pedido'){const b=fdBill(o),mine=b.owe(ME),paid=(o.paid||[]).includes(ME);st=`Pedido hecho en <b>${esc(w?w.name:'')}</b> · total ${esc(fdMoney(b.total))}`;
    cta=mine>0?(paid?'✓ Ya pagaste':`Te toca ${fdMoney(mine)}`):''}
  return `<button type="button" class="fd-b${compact?' sm':''}" data-fdgo="${esc(o.id)}" aria-label="Abrir ${esc(o.title||'pedido de comida')}">
    <span class="fd-b-ic" aria-hidden="true">🍽️</span>
    <span class="fd-b-tx"><span class="fd-b-tag">${esc(FD_ST[o.status]||'')}${o.status==='votando'&&fdWhen(o)?' · '+esc(fdWhen(o)):''}</span>
      <b class="fd-b-t">${esc(o.title||'Comida del domingo')}</b><span class="fd-b-s">${st}</span></span>
    ${cta?`<span class="fd-b-cta${/^✓/.test(cta)?' ok':''}">${esc(cta)}</span>`:''}<span class="fd-b-go" aria-hidden="true">›</span></button>`}

/* ---------- Página ---------- */
function vComida(){
  const back=`<button class="linkb evback" data-go="inicio">‹ Volver a Inicio</button>`;
  const o=byId(FD_COL,ui.comidaId)||fdActive();
  const hist=fdOrders().filter(x=>!o||x.id!==o.id).slice(0,6);
  const histHtml=hist.length?`<details class="panel fd-hist"><summary class="panel-h"><h2>Pedidos anteriores</h2></summary><ul class="list">${hist.map(x=>{const w=fdWinner(x);return `<li class="click" data-fdgo="${esc(x.id)}"><span class="mono">${esc(fDate(x.date,{day:'numeric',month:'short'}))}</span><span class="grow trunc">${esc(x.title||'Comida')}${w?' · '+esc(w.name):''}</span><span class="muted small">${esc(FD_ST[x.status]||'')}</span></li>`}).join('')}</ul></details>`:'';
  if(!o)return `${back}<div class="head"><div><h1>Comida</h1></div></div><section class="panel empty"><b>No hay ninguna votación abierta</b><p class="muted">Abre una, pon los restaurantes y que el equipo vote.</p><p><button class="btn primary" data-fdx="new">Abrir votación</button></p></section>${histHtml}`;
  const ed=fdCanEdit(o),me=fdMe(o)||{},w=fdWinner(o),open=fdVoteOpen(o),t=fdTally(o),rows=fdRows(o);
  const top=t[0]&&t[0].who.length?t[0].who.length:0;
  const people=S.people.filter(p=>p.status!=='inactivo');
  const answered=new Set(rows.filter(r=>r.ans).map(r=>r.pid));
  const missing=people.filter(p=>!answered.has(p.id));
  const byAns=k=>rows.filter(r=>r.ans===k).map(r=>r.pid);

  const head=`${back}<header class="fd-h"><span class="fd-h-tag">${esc(FD_ST[o.status]||'')}</span><h1>${esc(o.title||'Comida del domingo')}</h1>
    <p class="muted">${esc(fDate(o.date,{weekday:'long',day:'numeric',month:'long'}))}${o.by?' · la abrió '+esc(fdFirst(o.by)):''}${o.status==='votando'&&fdWhen(o)?' · <b>'+esc(fdWhen(o))+'</b>':''}</p>
    ${o.note?`<p class="fd-note">${esc(o.note)}</p>`:''}
    ${ed?`<div class="row fd-tools"><button class="btn sm" data-fdx="edit">Editar</button>${o.status==='votando'?`<button class="btn primary sm" data-fdx="close">Cerrar votación y anunciar ganador</button>`:''}${o.status==='pidiendo'?`<button class="btn primary sm" data-fdx="ordered">Ya hicimos el pedido</button><button class="btn ghost sm" data-fdx="reopen">Volver a votar</button>`:''}${o.status==='pedido'?`<button class="btn sm" data-fdx="unorder">Reabrir pedido</button><button class="btn primary sm" data-fdx="finish">Terminar</button>`:''}${o.status==='cerrado'?`<button class="btn sm" data-fdx="unfinish">Reabrir</button>`:''}</div>`:''}</header>`;

  /* ¿Comes? */
  const ansDisabled=o.status==='pedido'||o.status==='cerrado';
  const ansCard=`<section class="panel"><div class="panel-h"><h2>¿Vas a comer con nosotros?</h2></div><div class="panel-b">
    <div class="fd-ans" role="group" aria-label="Tu respuesta">${FD_ANS.map(([k,l,ic])=>`<button class="fd-a${me.ans===k?' on':''}" data-fdans="${k}" aria-pressed="${me.ans===k}" ${ansDisabled?'disabled':''}><span aria-hidden="true">${ic}</span>${esc(l)}</button>`).join('')}</div>
    <div class="fd-who">${FD_ANS.map(([k,l])=>{const ids=byAns(k);return ids.length?`<div><span class="lbl">${esc(l)} · ${ids.length}</span><span class="small">${ids.map(fdFirst).map(esc).join(', ')}</span></div>`:''}).join('')}
      ${missing.length&&o.status!=='cerrado'?`<div><span class="lbl">Sin responder · ${missing.length}</span><span class="small muted">${missing.slice(0,12).map(p=>esc(p.name.split(/\s+/)[0])).join(', ')}${missing.length>12?' y '+(missing.length-12)+' más':''}</span>${ed?` <button class="linkb small" data-fdx="nudge">Recordar por WhatsApp</button>`:''}</div>`:''}</div>
  </div></section>`;

  /* Votación */
  const canVote=open&&me.ans==='como';
  const voteCard=`<section class="panel"><div class="panel-h"><h2>${o.status==='votando'?'¿Dónde pedimos?':'Votación'}</h2><span class="muted small">${t.reduce((n,x)=>n+x.who.length,0)} votos</span></div><div class="panel-b">
    ${o.status==='votando'&&!open?`<p class="info warn" style="margin:0 0 10px">La votación ya cerró. ${ed?'Toca “Cerrar votación y anunciar ganador”.':esc(fdFirst(o.by)||'Quien la abrió')+' va a anunciar el ganador.'}</p>`:''}
    ${o.status==='votando'&&open&&me.ans!=='como'?`<p class="small muted" style="margin:0 0 10px">${me.ans?'Solo votan los que van a comer.':'Primero dinos si vas a comer.'}</p>`:''}
    <ul class="fd-opts">${t.map(({opt,who})=>{const mine=me.vote===opt.id&&me.ans==='como',win=o.winner===opt.id,pct=top?Math.round(who.length/Math.max(1,fdEaters(o).length||top)*100):0;
      return `<li class="fd-o${mine?' mine':''}${win?' win':''}">
        <button class="fd-o-b" data-fdvote="${esc(opt.id)}" ${canVote?'':'disabled'} aria-pressed="${mine}"><span class="fd-o-bar" style="--w:${Math.min(100,pct)}%"></span>
          <span class="fd-o-n">${win?'🏆 ':''}${esc(opt.name)}${opt.price?` <span class="muted small">${esc(opt.price)}</span>`:''}</span><span class="fd-o-c">${who.length}</span></button>
        <div class="fd-o-meta">${who.length?fdFaces(who):'<span class="small muted">Sin votos</span>'}${isUrl(opt.link)?` <a class="small" href="${esc(opt.link)}" target="_blank" rel="noopener">Ver menú ↗</a>`:''}${opt.note?` <span class="small muted">${esc(opt.note)}</span>`:''}</div></li>`}).join('')}</ul>
    ${!(o.options||[]).length?`<p class="muted">${ed?'Todavía no hay restaurantes: toca Editar y agrégalos.':'Todavía no hay restaurantes.'}</p>`:''}
  </div></section>`;

  /* Escoger comida + cuentas */
  let orderCard='';
  if(o.status!=='votando'){
    const b=fdBill(o),eaters=fdEaters(o),mine=me.items||[],locked=o.status!=='pidiendo';
    const dishes=[...new Map(rows.flatMap(r=>r.items||[]).map(it=>[norm(it.name),it])).values()].filter(it=>!mine.some(m=>norm(m.name)===norm(it.name)));
    const last=w&&!mine.length?fdLastPick(o,w):null;
    const myBox=me.ans==='como'?`<div class="fd-mine"><h3 class="lg-cat">Tu comida <span class="muted">${esc(fdMoney(fdItemsSum(me)))}</span></h3>
      ${mine.length?`<ul class="fd-items">${mine.map(it=>`<li><span class="grow">${esc(fdItemTxt(it))}</span>${locked?'':`<button class="icon-btn" data-fditem="${esc(it.id)}" aria-label="Cambiar ${esc(it.name)}">✎</button>`}</li>`).join('')}</ul>`:`<p class="small muted" style="margin:0 0 8px">${locked?'No escogiste nada.':'Escribe qué quieres y cuánto cuesta, así nadie se confunde con el dinero.'}</p>`}
      ${locked?'':`<div class="row fd-quick"><button class="btn primary sm" data-fdx="additem">+ Agregar comida</button>${last?`<button class="btn sm" data-fdx="samelast">Lo mismo que la vez pasada</button>`:''}${dishes.slice(0,6).map(it=>`<button class="btn ghost sm" data-fdsame="${esc(it.id)}">+ ${esc(it.name)}${Number(it.price)?' '+esc(fdMoney(it.price)):''}</button>`).join('')}</div>`}</div>`
      :me.ans?'':`<p class="small muted">Dinos arriba si vas a comer para escoger tu comida.</p>`;
    const payer=o.payer&&byId('people',o.payer);
    const allRows=sortBy(eaters,r=>pName(r.pid)).map(r=>{const owe=b.owe(r.pid),paid=(o.paid||[]).includes(r.pid),isPayer=o.payer===r.pid;
      return `<li><span>${fdFace(r.pid)}</span><span class="grow"><b>${esc(pName(r.pid))}</b><br><span class="small ${(r.items||[]).length?'':'fd-warn'}">${(r.items||[]).length?(r.items||[]).map(fdItemTxt).map(esc).join(' · '):'Aún no escoge'}</span></span>
        <span class="lg-amt">${owe?esc(fdMoney(owe)):''}${owe&&o.status!=='pidiendo'&&!isPayer?(ed||ME===o.payer?`<button class="btn sm ${paid?'primary':''}" data-fdpaid="${esc(r.pid)}" aria-pressed="${paid}">${paid?'✓ Pagó':'Marcar pagado'}</button>`:`<small class="${paid?'':'lg-owe'}">${paid?'✓ Pagó':'Pendiente'}</small>`):isPayer&&owe?'<small>Pagó el pedido</small>':''}</span></li>`}).join('');
    const collected=b.rows.filter(r=>r.pid!==o.payer&&(o.paid||[]).includes(r.pid)).reduce((t,r)=>t+b.owe(r.pid),0),toCollect=b.rows.filter(r=>r.pid!==o.payer).reduce((t,r)=>t+b.owe(r.pid),0);
    orderCard=`<section class="panel"><div class="panel-h"><h2>${w?'Pedido en '+esc(w.name):'Pedido'}</h2>${isUrl(w&&w.link)?`<a class="btn ghost sm" href="${esc(w.link)}" target="_blank" rel="noopener">Ver menú ↗</a>`:''}</div><div class="panel-b">
      ${myBox}
      <div class="lg-stats fd-stats"><div><b>${esc(fdMoney(b.food))}</b><span>comida</span></div><div><b>${esc(fdMoney(b.extra))}</b><span>envío y propina${b.rows.length&&b.extra?' · '+esc(fdMoney(b.share))+' c/u':''}</span></div><div class="hi"><b>${esc(fdMoney(b.total))}</b><span>total</span></div></div>
      ${o.status!=='pidiendo'?`<p class="info" style="margin:0 0 10px">${payer?`<b>${esc(payer.name)} pagó el pedido.</b> Cada quien le da lo suyo. Ya juntó ${esc(fdMoney(collected))} de ${esc(fdMoney(toCollect))}.`:`<b>¿Quién pagó el pedido?</b> ${ed?'Ponlo en “Envío y pago” para que cada quien sepa a quién darle su parte.':'Lo van a poner pronto.'}`}</p>`:''}
      <h3 class="lg-cat">Todos <span class="muted">${b.rows.length}/${eaters.length} escogieron</span></h3>
      ${eaters.length?`<ul class="lg-pay">${allRows}</ul>`:'<p class="small muted">Nadie ha dicho que va a comer.</p>'}
      <div class="row fd-tools" style="margin-top:12px">${b.rows.length?`<button class="btn sm" data-fdx="copy">Copiar pedido para WhatsApp</button>`:''}${ed?`<button class="btn ghost sm" data-fdx="pay">Envío y pago</button>`:''}${ed&&!locked?`<button class="btn ghost sm" data-fdx="addfor">Agregar por alguien</button>`:''}</div>
    </div></section>`}

  return head+(o.status==='votando'?ansCard+voteCard:orderCard+ansCard+voteCard)+histHtml}

/* La última vez que comí en este restaurante (por nombre) */
function fdLastPick(o,w){const k=norm(w.name);
  for(const x of fdOrders()){if(x.id===o.id)continue;const xw=fdWinner(x);if(!xw||norm(xw.name)!==k)continue;const r=fdMe(x);if(r&&(r.items||[]).length)return r.items}
  return null}

/* ---------- Formularios ---------- */
function fdNextSunday(){const d=parse(TODAY);const add=(7-d.getDay())%7;d.setDate(d.getDate()+add);return iso(d)}
const fdOptsText=o=>(o.options||[]).map(x=>[x.name,x.price,x.link].filter(Boolean).join(' | ')).join('\n');
function fdParseOpts(txt,old=[]){return String(txt||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
  const parts=l.split(/\s*\|\s*|\s+[-–—]\s+/).map(x=>x.trim()).filter(Boolean);
  const link=parts.find(isUrl)||'',rest=parts.filter(x=>x!==link);const name=rest[0]||'';const price=rest.slice(1).join(' ');
  const prev=old.find(x=>norm(x.name)===norm(name));return name?{id:prev?prev.id:uid(),name,price,link}:null}).filter(Boolean)}
function fdEdit(o){const last=fdOrders()[0];const d=o||{title:'Comida del domingo',date:fdNextSunday(),closeTime:'10:00',options:last?(last.options||[]).map(x=>({...x,id:uid()})):[]};
  openForm({title:o?'Editar votación':'Nueva votación de comida',saveLabel:o?'Guardar':'Abrir votación',
    intro:o?'':`<div class="info"><b>Así funciona</b><span>Pones los restaurantes. Cada quien dice si come con el grupo, come aparte o no va, y vota. Al cerrar, gana el más votado y cada quien escoge su comida con precio.${last?' Copié los restaurantes de la vez pasada; cámbialos si quieres.':''}</span></div>`,
    fields:[{id:'title',label:'Nombre',value:d.title,required:true,ph:'Comida del domingo'},
      {type:'pair',fields:[{id:'date',label:'Día de la comida',type:'date',value:d.date,required:true},{id:'closeTime',label:'La votación cierra a las',type:'time',value:d.closeTime||''}]},
      {id:'options',label:'Restaurantes (uno por línea · puedes agregar | precio | link del menú)',type:'textarea',value:fdOptsText(d),ph:'Pizza Hut | $6 aprox. | https://…\nPupusería La Ceiba\nPollo Campero'},
      {id:'note',label:'Nota (opcional)',type:'textarea',value:d.note,ph:'Pedimos a las 11:30 para que llegue al terminar el culto.'}],
    onSave:async v=>{const options=fdParseOpts(v.options,d.options||[]);if(options.length<1){toast('Agrega al menos un restaurante.');return}
      if(o){const keep=o.winner&&options.some(x=>x.id===o.winner)?o.winner:'';return fdSaveOrder(o,{title:v.title,date:v.date,closeDate:v.date,closeTime:v.closeTime,options,note:v.note,winner:keep})}
      const n={kind:'order',title:v.title,date:v.date,closeDate:v.date,closeTime:v.closeTime,options,note:v.note,status:'votando',by:ME,createdAt:new Date().toISOString(),paid:[],delivery:''};
      const id=await save(FD_COL,n);if(!id)return;ui.comidaId=id;ui.route='comida';try{history.replaceState(null,'','#comida')}catch(_){}
      fdPush('open')({id});toast('Votación abierta. Avísale al equipo.');setTimeout(()=>fdShare(byId(FD_COL,id)),300)}});
}
function fdClose(o){const t=fdTally(o);if(!t.length)return toast('No hay restaurantes para elegir.');
  const best=t[0].who.length,tied=t.filter(x=>x.who.length===best);
  openForm({title:'Anunciar ganador',saveLabel:'Anunciar',
    intro:`<div class="info"><b>${best?(tied.length>1?'Hay empate':'Ganó '+esc(t[0].opt.name)):'Nadie votó'}</b><span>${t.map(x=>esc(x.opt.name)+': '+x.who.length).join(' · ')}. Al anunciar, cada quien podrá escoger su comida.</span></div>`,
    fields:[{id:'winner',label:'Restaurante',type:'select',value:t[0].opt.id,options:t.map(x=>[x.opt.id,`${x.opt.name} (${x.who.length} voto${x.who.length===1?'':'s'})`])}],
    onSave:async v=>{const ok=await fdSaveOrder(o,{winner:v.winner,status:'pidiendo',closedAt:new Date().toISOString()});if(ok){try{estBurst()}catch(_){}fdPush('winner')(o)}}})}
function fdItemForm(o,it,pid=ME,pickWho=false){const cur=it||{id:uid(),name:'',qty:1,price:'',note:''};const r=fdMe(o,pid)||{};
  const eaters=sortBy(S.people.filter(p=>p.status!=='inactivo'),p=>p.name).map(p=>[p.id,p.name]);
  openForm({title:it?'Cambiar comida':'Agregar comida',saveLabel:'Guardar',
    fields:[...(pickWho?[{id:'pid',label:'¿Para quién?',type:'select',value:pid,options:eaters}]:[]),
      {id:'name',label:'¿Qué quieres?',value:cur.name,required:true,ph:'Pizza de jamón personal',list:[...new Set(fdRows(o).flatMap(x=>(x.items||[]).map(i=>i.name)))]},
      {type:'pair',fields:[{id:'qty',label:'Cantidad',type:'number',value:cur.qty||1,min:1},{id:'price',label:'Precio c/u ($)',type:'number',value:cur.price,min:0,ph:'5.50'}]},
      {id:'note',label:'Nota (opcional)',value:cur.note,ph:'Sin cebolla, con Coca-Cola…'}],
    onDelete:it?async()=>{await fdSaveMe(o,{items:(r.items||[]).filter(x=>x.id!==cur.id)},pid)}:null,delLabel:'Quitar',
    onSave:async v=>{const who=pickWho?v.pid||pid:pid;const rr=fdMe(o,who)||{};
      const n={...cur,name:v.name,qty:Math.max(1,Number(v.qty)||1),price:v.price===''?'':Math.max(0,Number(v.price)||0),note:v.note};
      const list=[...(rr.items||[])];const i=list.findIndex(x=>x.id===n.id);if(i>=0)list[i]=n;else list.push(n);
      const ok=await fdSaveMe(o,{items:list,ans:'como'},who);if(ok)fdPush('pick',{pid:who})(o)}})}
function fdPay(o){const eaters=fdEaters(o).map(r=>[r.pid,pName(r.pid)]);
  openForm({title:'Envío y pago',saveLabel:'Guardar',
    intro:`<div class="info"><span>El envío y la propina se dividen entre los que pidieron comida. Quien pagó el pedido no tiene que marcarse como pagado.</span></div>`,
    fields:[{id:'payer',label:'¿Quién pagó el pedido al restaurante?',type:'select',value:o.payer||'',options:[['','Todavía nadie'],...eaters]},
      {id:'delivery',label:'Envío y propina en total ($)',type:'number',value:o.delivery,min:0,ph:'0.00'}],
    onSave:v=>fdSaveOrder(o,{payer:v.payer,delivery:v.delivery===''?'':Math.max(0,Number(v.delivery)||0)})})}
function fdOrderText(o){const w=fdWinner(o),b=fdBill(o);const groups=new Map();
  for(const r of b.rows)for(const it of r.items||[]){const k=norm(it.name)+'|'+norm(it.note||'');const g=groups.get(k)||{name:it.name,note:it.note,qty:0,price:Number(it.price)||0,who:[]};g.qty+=Math.max(1,Number(it.qty)||1);g.who.push(fdFirst(r.pid));groups.set(k,g)}
  const lines=[...groups.values()].map(g=>`• ${g.qty} × ${g.name}${g.note?' ('+g.note+')':''}${g.price?' — '+fdMoney(g.price*g.qty):''}  [${g.who.join(', ')}]`);
  const each=b.rows.map(r=>`${pName(r.pid)}: ${fdMoney(b.owe(r.pid))}`);
  return `🍽️ ${o.title||'Comida'} · ${w?w.name:''}\n\n${lines.join('\n')}\n\nComida: ${fdMoney(b.food)}${b.extra?`\nEnvío y propina: ${fdMoney(b.extra)}`:''}\nTotal: ${fdMoney(b.total)}\n\nA cada quien le toca:\n${each.join('\n')}`}
function fdShare(o){if(!o)return;const msg=`🍽️ ${o.title||'Comida del domingo'}\n¿Dónde pedimos? Vota en Arca${o.closeTime?' antes de las '+ampm(o.closeTime):''}:\n${(o.options||[]).map(x=>'• '+x.name).join('\n')}\n\n${(typeof ARCA_URL!=='undefined'?ARCA_URL:location.origin)+'/#comida'}`;
  openForm({title:'Avisar por WhatsApp',saveLabel:'Abrir WhatsApp',fields:[{id:'msg',label:'Mensaje',type:'textarea',value:msg}],
    onSave:v=>{window.open('https://wa.me/?text='+encodeURIComponent(v.msg),'_blank','noopener')}})}

/* ---------- Acciones ---------- */
document.addEventListener('click',async e=>{
  const t=e.target.closest&&e.target.closest('[data-fdgo],[data-fdx],[data-fdans],[data-fdvote],[data-fditem],[data-fdsame],[data-fdpaid]');if(!t||t.closest('#drawerRoot'))return;const d=t.dataset;
  if(d.fdgo){ui.comidaId=d.fdgo;ui.route='comida';ui.serviceId=null;try{history.replaceState(null,'','#comida')}catch(_){}render();window.scrollTo(0,0);return enterMain()}
  if(!ME){toast('Elige tu nombre en Tú para participar.');return}
  if(d.fdx==='new')return fdEdit(null);
  const o=byId(FD_COL,ui.comidaId)||fdActive();if(!o)return;
  if(d.fdans){if(o.status==='pedido'||o.status==='cerrado')return;const was=(fdMe(o)||{}).ans;if(was===d.fdans)return;
    const ok=await fdSaveMe(o,{ans:d.fdans,...(d.fdans==='como'?{}:{vote:'',items:[]})});if(ok)fdPush('answer')(o);
    if(ok&&d.fdans==='como'&&o.status==='votando'&&fdVoteOpen(o))toast('¡Bien! Ahora vota por un restaurante.');return}
  if(d.fdvote){if(!fdVoteOpen(o))return toast('La votación ya cerró.');const me=fdMe(o)||{};if(me.ans!=='como')return toast('Primero toca “Sí como”.');
    if(me.vote===d.fdvote)return;const ok=await fdSaveMe(o,{vote:d.fdvote});if(ok)fdPush('vote')(o);return}
  if(d.fditem){const it=((fdMe(o)||{}).items||[]).find(x=>x.id===d.fditem);if(it&&o.status==='pidiendo')fdItemForm(o,it);return}
  if(d.fdsame){if(o.status!=='pidiendo')return;const src=fdRows(o).flatMap(r=>r.items||[]).find(x=>x.id===d.fdsame);if(!src)return;
    const me=fdMe(o)||{};const ok=await fdSaveMe(o,{ans:'como',items:[...(me.items||[]),{id:uid(),name:src.name,qty:1,price:src.price,note:''}]});if(ok){fdPush('pick')(o);toast('Agregado: '+src.name)}return}
  if(d.fdpaid){if(!(fdCanEdit(o)||ME===o.payer))return;const s=new Set(o.paid||[]);s.has(d.fdpaid)?s.delete(d.fdpaid):s.add(d.fdpaid);
    const ok=await fdSaveOrder(o,{paid:[...s]});if(ok&&s.has(d.fdpaid))fdPush('paid',{pid:d.fdpaid})(o);return}
  const ed=fdCanEdit(o);
  switch(d.fdx){
    case 'additem':return o.status==='pidiendo'&&fdItemForm(o,null);
    case 'addfor':return ed&&o.status==='pidiendo'&&fdItemForm(o,null,ME,true);
    case 'samelast':{const w=fdWinner(o);const last=w&&fdLastPick(o,w);if(!last)return;const ok=await fdSaveMe(o,{ans:'como',items:last.map(x=>({...x,id:uid()}))});if(ok){fdPush('pick')(o);toast('Listo: lo mismo que la vez pasada.')}return}
    case 'copy':{const txt=fdOrderText(o);try{await navigator.clipboard.writeText(txt);toast('Pedido copiado. Pégalo en WhatsApp.')}catch(_){openForm({title:'Pedido',saveLabel:'Listo',fields:[{id:'t',label:'Copia este texto',type:'textarea',value:txt}],onSave:()=>{}})}return}
    case 'nudge':{if(!ed)return;return fdShare(o)}
    case 'edit':return ed&&fdEdit(o);
    case 'close':return ed&&fdClose(o);
    case 'pay':return ed&&fdPay(o);
    case 'reopen':if(!ed)return;return fdSaveOrder(o,{status:'votando',winner:'',closeTime:''});
    case 'ordered':{if(!ed)return;const ok=await fdSaveOrder(o,{status:'pedido',orderedAt:new Date().toISOString()});if(ok){fdPush('ordered')(o);if(!o.payer)setTimeout(()=>fdPay(byId(FD_COL,o.id)),250)}return}
    case 'unorder':if(!ed)return;return fdSaveOrder(o,{status:'pidiendo'});
    case 'finish':{if(!ed)return;await fdSaveOrder(o,{status:'cerrado'});toast('Pedido terminado. ¡Buen provecho!');return}
    case 'unfinish':if(!ed)return;return fdSaveOrder(o,{status:'pedido'});
  }
});
