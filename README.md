# Arca + Google Drive

Supabase guarda los datos; Google Drive guarda los archivos (PDFs, fotos).

## Si Drive no conecta: abre `https://TU-DOMINIO/api/drive/diagnose`
Esa página revisa cada paso (variables, tabla de Supabase, redirect URI, acceso a Drive)
y dice exactamente qué falta. No muestra ningún secreto.

## Checklist
1. **Vercel → Settings → Environment Variables** (Production), y después **Redeploy**
   (las variables nuevas no se aplican a despliegues ya hechos):
   - `SUPABASE_URL` = `https://iflkvvxnugfowplrjtbe.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = la publishable key (`sb_publishable_…`)
   - `SUPABASE_SERVICE_ROLE_KEY` = la **secret / service_role** key (no la publishable)
   - `GOOGLE_CLIENT_ID` = `166131182387-ihr46hqkgiu85jl4rp66s3u6032lle4n.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET` = el client secret del mismo cliente OAuth
   - `GOOGLE_REDIRECT_URI` = `https://TU-DOMINIO/api/drive/callback` (opcional: si no está, se usa el dominio actual)
   - `ARCA_DRIVE_ADMIN_EMAIL` = correo con el que inicias sesión en Arca (solo esa cuenta puede conectar Drive)
   - `GOOGLE_DRIVE_FOLDER_NAME` = `Arca` (opcional)
2. **Supabase → SQL Editor**: ejecuta `drive-setup.sql` una vez.
3. **Google Cloud** (proyecto 166131182387):
   - APIs y servicios → Biblioteca → **Google Drive API → Habilitar**.
   - Google Auth Platform → Clientes → cliente web → *URIs de redireccionamiento autorizados*:
     `https://TU-DOMINIO/api/drive/callback` (exacto: https, sin `/` final, mismo dominio que usas).
   - Google Auth Platform → Público: si está en **Prueba**, agrega tu correo de Google como
     usuario de prueba. En modo Prueba el permiso caduca cada 7 días; pásalo a **Producción**
     (el scope `drive.file` no requiere verificación).
4. En Arca: inicia sesión → **Conectar Google Drive** → acepta.

## Espacios (Philly y JEV+)
1. **Supabase → SQL Editor**: ejecuta `spaces.sql` **antes** de publicar esta versión de la app. Es seguro repetirlo.
   (Para deshacerlo: `spaces-rollback.sql`.) No vuelvas a correr `lock-down.sql` después de este paso.
2. Ricardo queda como admin de `philly` y `jev`. Para agregar admins o jóvenes: en Arca → JEV+ → Equipo → Agregar persona (con su correo). Eso les da acceso solo a JEV+; para que sigan en Philly, elige “JEV+ y Philly”.
3. Más detalles en `CLAUDE.md`.

## Cerrar el acceso heredado a Philly
1. Publica la versión nueva de la app (funciona igual antes y después del SQL).
2. **Supabase → SQL Editor**: ejecuta `cerrar-acceso.sql` una vez. Da su membresía a cada persona de Philly/JEV+ con correo y apaga el acceso automático a Philly.
3. Si el script se detiene con “Estas cuentas se quedarían sin acceso: …”, agrega esos correos a `arca_members` (o borra esas cuentas) y vuelve a correrlo.

## Unirse a JEV+
Comparte `https://TU-DOMINIO/unirse.html`. Las solicitudes llegan a JEV+ → Tú → “Solicitudes para unirse”.

## Avisos en el teléfono
1. **Vercel → Settings → Environment Variables** (Production) y después **Redeploy**:
   - `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`: llaves para los avisos (se generan una vez con `npx web-push generate-vapid-keys`; si se cambian, cada teléfono debe volver a activar sus avisos).
   - `CRON_SECRET`: cualquier texto largo y secreto; Vercel lo usa para llamar al recordatorio diario.
2. Cada persona entra a Arca → **Tú → Avisos en este teléfono → Activar avisos**. En iPhone primero: Safari → Compartir → Agregar a pantalla de inicio, y abrir Arca desde ese ícono.
3. El recordatorio diario (“Mañana sirves”) sale a las 6 p. m. de El Salvador (`vercel.json`).

## Límite
Vercel no acepta subidas de más de 4.5 MB por petición; Arca avisa si un archivo pasa de 4 MB.
