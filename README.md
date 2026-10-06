# Arca + Google Drive

Esta versión mantiene Supabase como base de datos y agrega Google Drive como almacenamiento de archivos.

## Variables de Vercel
Configura estas variables en el proyecto:

- `SUPABASE_URL` = URL del proyecto Arca
- `SUPABASE_PUBLISHABLE_KEY` = publishable key de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = service-role key de Supabase (**solo Vercel, nunca en el HTML**)
- `GOOGLE_CLIENT_ID` = `166131182387-ihr46hqkgiu85jl4rp66s3u6032lle4n.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` = client secret de Google (**solo Vercel, nunca en el HTML ni en el chat**)
- `GOOGLE_REDIRECT_URI` = `https://TU-DOMINIO/api/drive/callback`
- `ARCA_DRIVE_ADMIN_EMAIL` = correo de la cuenta de Arca que será dueña del Drive de Arca
- `GOOGLE_DRIVE_FOLDER_NAME` = `Arca`

## Supabase
Ejecuta `drive-setup.sql` una sola vez en SQL Editor.

## Google OAuth
En Google Auth Platform → Clientes → el cliente web de Arca, agrega como URI de redireccionamiento autorizado:

`https://TU-DOMINIO/api/drive/callback`

No pongas el client secret en el frontend.

## Flujo
1. Ricardo inicia sesión en Arca.
2. Ricardo pulsa “Conectar Google Drive”.
3. Google autoriza el acceso.
4. El backend guarda el refresh token en `arca_private` usando la service-role key.
5. Arca crea una carpeta `Arca` en Drive y guarda allí los archivos.
6. Los archivos se sirven mediante el backend, sin hacer público el Drive.
