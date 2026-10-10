# FICHA DE CONTEXTO — Arca

Responde siempre en español. Ricardo cuida los créditos: cambios en una sola pasada, pocas capturas.

## 1. Qué es y para quién
Arca es la app del ministerio de alabanza **Philly** de **Taber Olocuilta** (El Salvador): servicios, equipos, canciones/setlists, devocionales, tareas y eventos.
La usa el equipo de Philly; la administra Ricardo Vega (ricardovegaprod@gmail.com).

## 2. Dónde vive
- **Repositorio:** github.com/ricardiaz97-hub/ARCA (rama `main`).
- **Publicación:** Vercel, despliega solo al hacer merge a `main`. (URL de producción: confirmar con Ricardo.)
- **Datos:** Supabase, tabla `arca_records` (`collection`, `id`, `data`), con realtime. Login con Supabase Auth.
- **Archivos:** Google Drive, carpeta "Arca" (PDFs, fotos, arte); se sirven vía `/api/drive/file?id=`.
- **Origen:** empezó como artifact de claude.ai (Nua9H73D47jHEw4umWHtcZ) y pasó a app propia.
- **Cuentas:** GitHub, Vercel, Supabase, Google Cloud (cliente OAuth para Drive), Google de Ricardo (admin de Drive). Claves solo en Vercel → Environment Variables; nunca en el repo.

## 3. Cómo está hecho
- Sin framework: `index.html` (~3500 líneas, CSS/JS dentro), `estelar.css` (diseño), `evento.js` (función de eventos), `sw.js`, `manifest.webmanifest`.
- `api/` (rutas serverless: `auth`, `drive`) y `lib/` (arca-admins, arca-auth, google-drive, supabase-admin). `img/` con logos e imágenes.
- SQL: `lock-down.sql` (RLS: solo autenticados) y `drive-setup.sql`. Detalle de Drive en `README.md`.
- Supabase JS desde CDN. Funciones clave: `save(col,obj)`, `render()`, `go()`, `openForm`, `evHook()`.
- **Flujo:** Claude trabaja en una rama → abre PR → Ricardo hace merge en GitHub → Vercel despliega. Si hace falta SQL o variables de entorno, se dan instrucciones exactas.

## 4. Decisiones ya tomadas (no rediscutir)
- Diseño **"Vidrio estelar"**: naranja #FF7A1A / #E85D04 / #FFB27A sobre negro #080606, crema #F5EEE6; Alabanzas en amarillo #FFD21F, Devocionales en morado #A35BFF; tipografía Chakra Petch; griego decorativo (ΕΙΡΗΝΗ ΥΜΙΝ, ΜΕΤΑ ΣΟΥ) con aria-hidden; paneles de vidrio, esquinas cortadas, rombos, destellos de 4 puntas ligados a datos reales.
- Modo ligero (`html.lite`) y respeto a reduced-motion/transparency.
- Permisos: editar eventos = admin o `MANAGERS`.
- Evento **A TU LADO**: grabación en vivo, 7-nov-2026, 5:00 PM, Taber Olocuilta; es el segundo disco de Philly (re-versiones de himnos). La camiseta ($5.50) es para los asistentes, no para el equipo.
- Las canciones del setlist son propias: nada de botones que busquen en YouTube; se usa enlace de demo o "Demo pendiente".
- El videojuego es un proyecto aparte; no va en Arca ni en esta ficha.

## 5. Qué ya funciona
Login, servicios y equipos, canciones/setlists, devocionales, tareas, Drive (subida de archivos), tema Vidrio estelar. Evento A TU LADO: banner en Inicio y Turno, página del evento con cuenta regresiva, misiones, equipo y confirmaciones con recordatorio por WhatsApp, "Qué ensayar", cronograma 17:00–18:50, vestimenta, camiseta, y creación del culto con cronograma. Errores de guardado muestran el código.

## 6. Pendiente (por prioridad)
1. Confirmar en Arca: "Crear evento A TU LADO", crear el culto con cronograma y asignar al equipo.
2. Enlaces de demo por canción (campo `version`) o `link` del evento.
3. Código de vestimenta: imágenes de Pinterest y paletas de Ricardo (Editar evento).
4. Arte del banner estilo miHoYo (generado en Gemini; subir en Editar evento → "Subir arte del banner").
5. Puntos abiertos de la reunión: tarimas, decoración, luces, ventas, cafetería, protocolo.
6. Opcional: dominio propio y correo; solicitud a Claude for Startups (solo si aplica honestamente).
7. Teaser vertical de A TU LADO (MP4 hecho aparte): falta música y revisar que no revele el setlist.

## 7. Problemas conocidos y soluciones
- **No guardaba el evento** ("No se pudo guardar…"): el CHECK `arca_collection_check` de `arca_records` no incluía `eventos`. Se recreó con todas las colecciones. **Regla: toda colección nueva debe añadirse a ese CHECK en Supabase.**
- Código de error en pantalla: 42501 = permiso; 23514/22P02/23502 = la base rechazó el dato.
- Drive: si falla, abrir `/api/drive/diagnose`. En modo "Prueba" de Google el permiso caduca a los 7 días → pasar a Producción. Límite de subida 4 MB (Vercel 4.5 MB).
- Variables nuevas de Vercel requieren Redeploy.
- `sw.js` es mínimo y sin caché, para evitar versiones viejas.
