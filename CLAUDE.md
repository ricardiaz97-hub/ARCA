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
- Cada colección de datos vive en `S[coleccion]`; `save(col, obj)` y `remove(col, id)` escriben a Supabase con el espacio activo. Hay conexión en vivo (realtime) filtrada por espacio.
- Colecciones: `people, teams, songs, services, events, projects, tasks, recurring, settings, requests, devos, devoviews, devocomments, setlists, pwresets, eventos, jevacts, jevideas`.
- Archivos SQL: `spaces.sql` (espacios y permisos), `spaces-rollback.sql` (deshacer), `drive-setup.sql`, `lock-down.sql` (solo para antes de los espacios).

**4. Decisiones ya tomadas.**
- Diseño Vidrio estelar: Philly naranja y negro; **JEV+ verde neón (#39FF88) y azul (#2F7BFF)**. El tema se cambia con `<html data-space="jev">` y las variables `--acc…`; no se copian estilos.
- **Un solo Arca con espacios por grupo**, no dos aplicaciones. Cada registro tiene `space` (`philly` por defecto) y la llave primaria es `(space, collection, id)`.
- **Acceso por correo** en `arca_members(space, email, role)`. Quien tiene filas entra solo a esos espacios. Quien no tiene ninguna fila (todo Philly hoy) sigue entrando a `philly`. Solo los admin de un espacio cambian sus membresías.
- Quien se agrega a JEV+ desde Equipo recibe su membresía solo en JEV+. Para que además siga en Philly hay que elegir “JEV+ y Philly” en su perfil; si no, pierde Philly (así se aísla a los jóvenes).
- **Personas que están en Philly y en JEV+:** cada espacio guarda su propio registro (así los líderes de JEV+ no ven notas ni datos de Philly). Para no escribirlos otra vez, en JEV+ → Equipo hay un botón **Traer de Philly** (solo admin): copia nombre, correo, teléfono, cumpleaños y foto, guarda `fromPhilly` con el id original y les deja acceso a los dos espacios. Los títulos y equipos son de cada espacio. Los datos copiados no se sincronizan solos: si alguien cambia de teléfono, se edita en cada espacio.
- En Philly, los administradores siguen siendo los ids fijos `APPROVERS` y `MANAGERS_PHILLY` de `index.html`. En otros espacios, admin = rol `admin` en `arca_members`, y líder = título con “Líder”, “Pastor” o “admin”.
- Si la base aún no tiene `spaces.sql`, la app funciona como antes (modo anterior). Cualquier otro error al leer membresías se muestra, no se oculta.
- Todo en español y sin tecnicismos para los usuarios.

**5. Qué ya funciona.**
- Philly completo (servicios, alabanzas con cifras y PDF, equipos, calendario, tareas, devocionales, evento, invitaciones por formulario, contraseñas olvidadas, Google Drive).
- Espacios: selector Philly / JEV+ (solo si perteneces a más de uno), datos y permisos separados, logo y tema por espacio.
- JEV+: Inicio (próxima actividad, cifras, ideas, cumpleaños), Actividades (cultos y eventos, quiénes sirven, “Voy a ir”), Ideas de videos (mandar idea, votar, estados nueva / aprobada / en producción / publicada, nota de los líderes, link del video), Tú, Equipo (personas) y Tareas.

**6. Pendiente, en orden.**
1. Correr `spaces.sql` en Supabase y después publicar la rama `jev-espacios`. **El orden importa: primero el SQL.**
2. Probar con jóvenes reales: crear su cuenta con su correo y confirmar que solo ven JEV+.
3. Logo de JEV+ (hoy es un texto provisional hecho con la tipografía de la app) e icono de instalación propio.
4. Formulario de Google para que se unan solos a JEV+ (hoy los agrega un líder en Equipo).
5. Quitar el acceso heredado a Philly: dar una fila de `arca_members` a cada persona de Philly y cambiar la regla de `arca_can_access`, para que una cuenta nueva sin membresía no vea nada.
6. Sincronizar datos de contacto entre Philly y JEV+ para quien está en ambos (hoy se copian una vez con “Traer de Philly”).
7. Contraseñas olvidadas de JEV+: hoy las solicitudes llegan a Ricardo y Andrés (espacio Philly).

**7. Problemas conocidos y cómo se resolvieron.**
- **No volver a correr `lock-down.sql` después de `spaces.sql`:** crea una política que da acceso a todos los espacios. Ya se protegió para que no haga nada si existe `arca_members`.
- **Los atributos `data-space` están también en `<html>` y `<body>`:** el selector de espacio usa `data-sp` para no atrapar todos los clics.
- **En el celular el menú va abajo:** el selector de espacio sube a la barra superior y el menú de JEV+ tiene 6 columnas (`jev.css`).
- **Un mismo `id` en dos espacios** (por ejemplo `settings/invite`) es válido gracias a la llave primaria con `space`.
- **Las solicitudes de contraseña** (`api/auth/*`) usan `upsertRecord()` de `lib/supabase-admin.js`, que funciona antes y después del SQL.
