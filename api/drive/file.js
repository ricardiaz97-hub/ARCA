import { driveClient } from '../../lib/google-drive.js';
import { getDriveToken } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  try {
    const id = String(req.query?.id || ''); if (!id) return res.status(400).end('missing id');
    const token = await getDriveToken(); if (!token) return res.status(401).end('Drive no conectado');
    const drive = driveClient(token);
    const meta = await drive.files.get({ fileId:id, fields:'name,mimeType,size' });
    const r = await drive.files.get({ fileId:id, alt:'media' }, { responseType:'stream' });
    res.setHeader('Content-Type', meta.data.mimeType || 'application/octet-stream');
    if (meta.data.size) res.setHeader('Content-Length', meta.data.size);
    res.setHeader('Cache-Control','private, max-age=300');
    r.data.on('error',()=>{try{res.end()}catch{}}); r.data.pipe(res);
  } catch(e) { console.error(e); res.status(404).end('Archivo no encontrado'); }
}
