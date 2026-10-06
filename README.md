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

## Límite
Vercel no acepta subidas de más de 4.5 MB por petición; Arca avisa si un archivo pasa de 4 MB.
