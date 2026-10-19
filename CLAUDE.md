# Arca · Ficha de contexto

**1. Qué es y para quién.** Arca es la app de Taber Olocuilta. Hoy tiene dos espacios: **Philly** (ministerio de alabanza: servicios, alabanzas, equipos, calendario, tareas, devocionales) y **JEV+** (Jóvenes En Victoria: actividades de los cultos e ideas de videos). Quienes la usan son los servidores de cada grupo. Ricardo Vega y Andrés Santos administran Philly.

**2. Dónde vive.**
- Repositorio: `ricardiaz97-hub/ARCA`, rama `main`. Vercel publica solo cada vez que se une algo a `main`.
- Datos: Supabase (proyecto `iflkvvxnugfowplrjtbe`), una sola tabla `arca_records` (`space`, `collection`, `id`, `data` jsonb) y la tabla `arca_members`.
- Archivos (PDF y fotos): carpeta `Arca` de Google Drive de richigbkd@gmail.com, por la API de `api/drive/`.
- Variables de Vercel y pasos de Google: ver `README.md`.
- Referencia de diseño para otras apps de Ricardo: `estelar.css` y la skill `vidrio-estelar`.

**3. Cómo está hecho.**
- Sin framework ni compilación. `index.html` (un solo archivo grande con casi toda la app), `estelar.css` (tema Vidrio estelar), `evento.js` (banner y página de evento de Philly), `jev.js` y `jev.css` (todo lo de JEV+).
- Funciones de Vercel en `api/` (`api/auth/` contraseñas, `api/drive/` archivos) y utilidades en `lib/`.
- Los planes de culto viven dentro de `jevacts` (`items` y `assignments`). Cada colección de datos vive en `S[coleccion]`; `save(col, obj)` y `remove(col, id)` escriben a Supabase con el espacio activo. Hay conexión en vivo (realtime) filtrada por espacio.
- Colecciones: `people, teams, songs, services, events, projects, tasks, recurring, settings, requests, devos, devoviews, devocomments, setlists, pwresets, eventos, jevacts, jevideas, jevbdays`.
- Archivos SQL: `spaces.sql` (espacios y permisos), `spaces-rollback.sql` (deshacer), `drive-setup.sql`, `cerrar-acceso.sql` (apaga el acceso heredado a Philly), `lock-down.sql` (solo para antes de los espacios).

**4. Decisiones ya tomadas.**
- Diseño Vidrio estelar: Philly naranja y negro; **JEV+ verde neón (#39FF88) y azul (#2F7BFF)**. El tema se cambia con `<html data-space="jev">` y las variables `--acc…`; no se copian estilos.
- **Un solo Arca con espacios por grupo**, no dos aplicaciones. Cada registro tiene `space` (`philly` por defecto) y la llave primaria es `(space, collection, id)`.
- **Acceso por correo** en `arca_members(space, email, role)`. Quien tiene filas entra solo a esos espacios. Quien no tiene ninguna fila sigue entrando a `philly` solo mientras no se haya corrido `cerrar-acceso.sql`; después no ve nada. Solo los admin de un espacio cambian sus membresías.
- Quien se agrega a JEV+ desde Equipo recibe su membresía solo en JEV+. Para que además siga en Philly hay que elegir “JEV+ y Philly” en su perfil; si no, pierde Philly (así se aísla a los jóvenes).
- **Personas que están en Philly y en JEV+:** cada espacio guarda su propio registro (así los líderes de JEV+ no ven notas ni datos de Philly). Para no escribirlos otra vez, en JEV+ → Equipo hay un botón **Traer de Philly** (solo admin): copia nombre, correo, teléfono, cumpleaños y foto, guarda `fromPhilly` con el id original y les deja acceso a los dos espacios. Los títulos y equipos son de cada espacio. Los datos copiados no se sincronizan solos: si alguien cambia de teléfono, se edita en cada espacio.
- En Philly, son administradores los ids fijos `APPROVERS` y `MANAGERS_PHILLY` de `index.html` **y** quien tenga rol `admin` en `arca_members` para `philly` (mismos permisos que Ricardo: aprobar, encargado, supervisión, llaves). Para dar o quitar ese permiso: **Personas → Permisos** (solo admins; elige Servidor o Administrador por persona, en el espacio activo; los fijos no se pueden bajar desde ahí y al guardar se les crea su fila de admin). `philly-admin.sql` queda como alternativa por SQL. Mario Ortiz se agregó así. En otros espacios, admin = rol `admin` en `arca_members`, y líder = título con “Líder”, “Pastor” o “admin”.
- Si la base aún no tiene `spaces.sql`, la app funciona como antes (modo anterior). Cualquier otro error al leer membresías se muestra, no se oculta.
- Todo en español y sin tecnicismos para los usuarios.

**5. Qué ya funciona.**
- Philly completo (servicios, alabanzas con cifras y PDF, equipos, calendario, tareas, devocionales, evento, invitaciones por formulario, contraseñas olvidadas, Google Drive).
- Espacios: selector Philly / JEV+ (solo si perteneces a más de uno), datos y permisos separados, logo y tema por espacio.
- JEV+: Inicio (próxima actividad, cifras, ideas, cumpleaños, aviso si alguien cumple hoy), Actividades (cultos y eventos, “Voy a ir”) y, dentro de cada una, su **plan** como los Servicios de Philly pero sin alabanzas: **orden del culto** (escaleta con horas calculadas, responsables, partes comunes, subir/bajar) y **equipo** (posición, persona y estado pendiente/confirmado/declinado; cada quien confirma o dice que no puede; el admin avisa por WhatsApp), con copiar a WhatsApp, imprimir y “Copiar a la semana siguiente”; Ideas de videos (mandar idea, votar, estados, nota de los líderes, link del video, **pines de Pinterest** que cualquiera puede agregar), **Cumpleaños** (calendario mensual con las personas de Equipo y con cumpleañeros que no son usuarios, aviso de hoy/mañana y archivo .ics con recordatorios para el celular), Tú (mis turnos con confirmar, solicitudes de ingreso y contraseñas olvidadas para admins), Equipo y Tareas.
- Ingreso a JEV+: formulario propio `unirse.html` → `api/join/request` guarda una solicitud en el espacio `jev`; un líder la aprueba en Tú → “Solicitudes para unirse” (crea el perfil y da la membresía). Si se pega un link de Google Forms en Equipo, ese tiene prioridad.
- Contraseñas olvidadas: `api/auth/forgot` guarda la solicitud en cada espacio donde está el correo; `api/auth/reset` la atiende un admin de ese espacio (`requireSpaceAdmin` en `lib/arca-admins.js`).
- Marca de JEV+: `img/jev-logo.webp`, iconos `img/jev-*.png` y `manifest-jev.webmanifest` (se cambia solo al entrar a JEV+).

**6. Pendiente, en orden.**
1. Publicar esta versión y **después** correr `cerrar-acceso.sql` en Supabase (si alguna cuenta quedaría sin acceso, el script se detiene y lista sus correos). Desde entonces una cuenta nueva sin membresía ve “Tu cuenta aún no tiene acceso”.
2. Probar con jóvenes reales: formulario `unirse.html`, aprobación, cuenta propia y que solo vean JEV+.
3. Probar en el celular las pantallas nuevas (plan del culto, cumpleaños, pines) y ajustar lo que los líderes pidan.
4. Sincronizar datos de contacto entre Philly y JEV+ para quien está en ambos (hoy se copian una vez con “Traer de Philly”).
5. Avisos automáticos (hoy el aviso de cumpleaños aparece al abrir Arca y por el .ics; no hay mensajes automáticos por WhatsApp).

**7. Problemas conocidos y cómo se resolvieron.**
- **No volver a correr `lock-down.sql` después de `spaces.sql`:** crea una política que da acceso a todos los espacios. Ya se protegió para que no haga nada si existe `arca_members`.
- **Los atributos `data-space` están también en `<html>` y `<body>`:** el selector de espacio usa `data-sp` para no atrapar todos los clics.
- **En el celular el menú va abajo:** el selector de espacio sube a la barra superior y el menú de JEV+ tiene 7 columnas (`jev.css`).
- **Un mismo `id` en dos espacios** (por ejemplo `settings/invite`) es válido gracias a la llave primaria con `space`.
- **Las solicitudes de contraseña** (`api/auth/*`) usan `upsertRecord()` de `lib/supabase-admin.js`, que funciona antes y después del SQL. Cada solicitud vive en el espacio de la persona (JEV+ o Philly).
- **El acceso heredado se apaga con `cerrar-acceso.sql`**, que además crea `arca_access_closed()`; la app la consulta para saber si mostrar la pantalla de sin acceso. Sin correr el SQL, todo sigue como antes.
