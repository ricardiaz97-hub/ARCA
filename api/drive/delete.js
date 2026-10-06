import { driveClient } from '../../lib/google-drive.js';
import { getDriveToken } from '../../lib/supabase-admin.js';
import { requireUser } from '../../lib/arca-auth.js';
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  try{const user=await requireUser(req,res);if(!user)return;const id=String(req.body?.id||'');const token=await getDriveToken();if(!token)return res.status(401).json({error:'drive_not_connected'});if(!id)return res.status(400).json({error:'missing_id'});await driveClient(token).files.delete({fileId:id});res.json({ok:true})}
  catch(e){console.error(e);res.status(500).json({error:'delete_failed',message:e.message})}
}
