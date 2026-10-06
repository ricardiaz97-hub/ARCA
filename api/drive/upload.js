import { Readable } from 'node:stream';
import { driveClient, ensureFolder, googleErrorHint } from '../../lib/google-drive.js';
import { getDriveToken, getDriveFolderId, saveDriveFolderId } from '../../lib/supabase-admin.js';
import { requireUser } from '../../lib/arca-auth.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error:'method_not_allowed' });
  try {
    const user=await requireUser(req,res); if(!user)return;
    const token = await getDriveToken();
    if (!token) return res.status(401).json({ error:'drive_not_connected' });
    const chunks=[]; for await (const c of req) chunks.push(c); const body=Buffer.concat(chunks);
    let name = String(req.headers['x-arca-name'] || 'arca-file');
    try { name = decodeURIComponent(name); } catch {}
    const mimeType = req.headers['x-arca-type'] || 'application/octet-stream';
    const drive = driveClient(token, req);
    let folderId = await getDriveFolderId();
    if (!folderId) { folderId = await ensureFolder(drive); await saveDriveFolderId(folderId); }
    const file = await drive.files.create({
      requestBody:{ name, parents:[folderId] },
      media:{ mimeType, body:Readable.from(body) },
      fields:'id,name,mimeType,size,webViewLink'
    });
    res.json({ id:file.data.id, name:file.data.name, contentType:file.data.mimeType, size:file.data.size, url:file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view` });
  } catch(e) { console.error(e); res.status(500).json({ error:'upload_failed', message:googleErrorHint(e) }); }
}
