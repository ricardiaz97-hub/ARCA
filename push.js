/* ===== Avisos en el teléfono (Web Push) =====
   - Cada teléfono activa sus avisos en Tú → “Avisos en este teléfono”. La suscripción se guarda en el servidor
     (tabla privada arca_private, por correo), nunca en arca_records.
   - Arca avisa cuando: te programan en un servicio o te asignan una tarea (como el correo), un día antes de servir
     (lo manda Vercel cada tarde) y con cada movimiento de la votación de comida.
   - El servidor arma los textos con lo guardado en Supabase; el teléfono solo dice qué cambió. */
const PU_PREFS=[['asignaciones','Cuando te programan en un servicio o te asignan una tarea'],['recordatorios','Un día antes de servir y cuando una tarea vence mañana'],['comida','Votación de comida: quién votó, qué escogió cada quien y quién ganó']];
const PU_DEF={asignaciones:true,recordatorios:true,comida:true};
const puOk=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const puIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const puStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let PU={state:'',busy:false,synced:false,prefs:(()=>{try{return {...PU_DEF,...JSON.parse(localStorage.getItem('arca.pushprefs')||'{}')}}catch(_){return {...PU_DEF}}})()};
function puKey(b64){const p='='.repeat((4-b64.length%4)%4);const raw=atob((b64+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function puSub(){if(!puOk())return null;try{const r=await navigator.serviceWorker.getRegistration('/');return r?await r.pushManager.getSubscription():null}catch(_){return null}}
async function puRefresh(){let st;
  if(!puOk())st=puIOS()&&!puStandalone()?'ios-install':'unsupported';
  else if(Notification.permission==='denied')st='denied';
  else st=(await puSub())&&Notification.permission==='granted'?'on':'off';
  /* La suscripción puede cambiar sola: la reenviamos una vez por sesión */
  if(st==='on'&&!PU.synced&&typeof ME_USER!=='undefined'&&ME_USER){PU.synced=true;const s=await puSub();if(s)puSave(s).catch(()=>{})}
  if(st!==PU.state){PU.state=st;if(ui.route==='turno')try{render()}catch(_){}}}
async function puSave(sub){const r=await arcaApi('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({subscription:sub.toJSON(),prefs:PU.prefs,personId:ME||'',ua:navigator.userAgent.slice(0,160)})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'No se pudo guardar la suscripción.');return j}
async function puEnable(){if(PU.busy)return;PU.busy=true;render();
  try{const perm=await Notification.requestPermission();
    if(perm!=='granted'){toast(perm==='denied'?'Bloqueaste los avisos. Puedes activarlos en la configuración del navegador.':'No se activaron los avisos.');return}
    const r=await arcaApi('/api/push/subscribe');const j=await r.json().catch(()=>({}));if(!j.publicKey)throw new Error(j.message||'Los avisos aún no están configurados en el servidor.');
    const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(sub&&sub.options&&sub.options.applicationServerKey){const cur=btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');if(cur!==j.publicKey){await sub.unsubscribe();sub=null}}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:puKey(j.publicKey)});
    await puSave(sub);PU.synced=true;toast('Listo: este teléfono recibirá los avisos de Arca.');try{estBurst()}catch(_){}
  }catch(e){console.warn('push',e);toast(e.message||'No se pudieron activar los avisos.')}
  finally{PU.busy=false;await puRefresh();render()}}
async function puDisable(){if(PU.busy)return;PU.busy=true;render();
  try{const s=await puSub();if(s){await arcaApi('/api/push/subscribe',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:s.endpoint})}).catch(()=>{});await s.unsubscribe()}toast('Avisos apagados en este teléfono.')}
  catch(e){toast('No se pudieron apagar. Intenta otra vez.')}finally{PU.busy=false;await puRefresh();render()}}
async function puSetPref(k,v){PU.prefs={...PU.prefs,[k]:v};try{localStorage.setItem('arca.pushprefs',JSON.stringify(PU.prefs))}catch(_){}
  const s=await puSub();if(s)puSave(s).then(()=>toast('Guardado.')).catch(e=>toast(e.message))}

/* Panel en Tú */
function pushPanel(){if(SPACE!=='philly'||!ME)return '';if(!PU.state){puRefresh();return ''}
  const st=PU.state,b=PU.busy?' disabled':'';
  if(st==='on')return `<details class="tcard tfold pu-card" data-fold="avisos" ${foldAttr('avisos')}><summary><h2 class="th2">Avisos en este teléfono</h2><p class="small">✓ Activados</p></summary>
    <div class="checks">${PU_PREFS.map(([k,l])=>`<label><input type="checkbox" data-pupref="${k}" ${PU.prefs[k]!==false?'checked':''}> ${esc(l)}</label>`).join('')}</div>
    <div class="pu-row" style="margin-top:12px"><button class="btn sm" data-pu="test"${b}>Mandar un aviso de prueba</button><button class="btn ghost sm" data-pu="off"${b}>Apagar en este teléfono</button></div></details>`;
  const body=st==='ios-install'?`<p class="small" style="margin:0">En iPhone los avisos solo llegan si Arca está en tu pantalla de inicio:</p>
      <ol class="pu-steps small"><li>Abre Arca en <b>Safari</b>.</li><li>Toca <b>Compartir</b> (el cuadro con la flecha).</li><li>Elige <b>Agregar a pantalla de inicio</b>.</li><li>Abre Arca desde ese ícono y vuelve aquí para activar los avisos.</li></ol>`
    :st==='denied'?`<p class="small" style="margin:0">Bloqueaste los avisos de Arca en este navegador. Para activarlos, abre la configuración del sitio (el candado junto a la dirección o Ajustes → Notificaciones) y permite las notificaciones de Arca.</p>`
    :st==='unsupported'?`<p class="small" style="margin:0">Este navegador no puede recibir avisos. Usa Chrome en Android o Safari en iPhone (con Arca en la pantalla de inicio).</p>`
    :`<p class="small" style="margin:0 0 10px">Te llega un aviso cuando te programan, un día antes de servir y con la votación de comida.</p><button class="btn primary" data-pu="on"${b}>${PU.busy?'Activando…':'Activar avisos'}</button>`;
  return `<section class="tcard pu-card"><h2 class="th2">🔔 Avisos en este teléfono</h2>${body}</section>`}

/* Enviar (el servidor revisa permisos y arma el texto) */
function arcaPush(payload){if(typeof mode!=='undefined'&&mode!=='live')return;
  arcaApi('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({space:SPACE,...payload,from:ME||''})}).catch(()=>{})}
window.arcaPush=arcaPush;

/* Después de guardar: ¿a quién le acaban de asignar algo? */
window.arcaAfterSave=(col,before,rec)=>{if(SPACE!=='philly'||!rec)return;
  if(col==='services'){const a=fillLineup(rec),b=before?fillLineup(before):null;if(a.cancelled||(a.date||'')<TODAY)return;
    const had=new Set(((b&&b.assignments)||[]).filter(x=>x.personId).map(x=>x.personId+'|'+norm(x.position)));
    const ids=[...new Set((a.assignments||[]).filter(x=>x.personId&&!x.always&&x.personId!==ME&&x.status!=='declinado'&&!had.has(x.personId+'|'+norm(x.position))).map(x=>x.personId))];
    if(ids.length)arcaPush({kind:'assigned',collection:'services',id:rec.id,personIds:ids});return}
  if(col==='tasks'){if(rec.status==='done')return;const was=new Set(before?tAss(before):[]);
    const ids=tAss(rec).filter(x=>!was.has(x)&&x!==ME);if(ids.length)arcaPush({kind:'assigned',collection:'tasks',id:rec.id,personIds:ids})}
};

document.addEventListener('click',async e=>{const t=e.target.closest&&e.target.closest('[data-pu]');if(!t)return;
  if(t.dataset.pu==='on')return puEnable();
  if(t.dataset.pu==='off')return puDisable();
  if(t.dataset.pu==='test')return puTest()});
/* Prueba con diagnóstico: dice exactamente dónde falla para poder arreglarlo */
async function puTest(){const s=await puSub();if(s)await puSave(s).catch(()=>{});
  const r=await arcaApi('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'test',space:SPACE,from:ME||'',endpoint:s?s.endpoint:''})}).catch(()=>null);
  const j=r?await r.json().catch(()=>({})):{};
  const info=[`Teléfono suscrito: ${s?'sí':'no'}`,`Permiso: ${typeof Notification!=='undefined'?Notification.permission:'—'}`,`App instalada: ${puStandalone()?'sí':'no'}`,
    `Servidor: ${r?r.status:'sin conexión'}`,`Teléfonos tuyos guardados: ${j.devices??'—'}`,`Este teléfono guardado: ${j.here==null?'—':j.here?'sí':'no'}`,`Avisos enviados: ${j.sent??0}`,
    ...(j.errors||[]).map(e=>`Rechazo de ${e.host}: ${e.status} ${e.body}`),...(j.message?['Mensaje: '+j.message]:[])].join('\n');
  const ok=r&&r.ok&&j.sent>0;
  openForm({title:ok?'Aviso enviado':'El aviso no salió',saveLabel:'Copiar',intro:`<p class="small" style="margin-top:0">${ok?'Debería llegarte en unos segundos. Si no llega, copia esto y mándaselo a Ricardo.':'Copia esto y mándaselo a Ricardo para arreglarlo.'}</p>`,
    fields:[{id:'d',label:'Diagnóstico',type:'textarea',value:info}],onSave:async()=>{try{await navigator.clipboard.writeText(info);toast('Copiado.')}catch(_){toast('Selecciona el texto y cópialo.')}}})}
document.addEventListener('change',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.pupref)puSetPref(t.dataset.pupref,t.checked)});
/* Al tocar un aviso con Arca abierta: ir a la pantalla del aviso */
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{const r=e.data&&e.data.arcaRoute;if(!r)return;
  if(e.data.comidaId)ui.comidaId=e.data.comidaId;try{go(r)}catch(_){}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&PU.state)puRefresh()});
