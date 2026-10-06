import { createClient } from '@supabase/supabase-js';

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getDriveToken() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('arca_private').select('value').eq('key', 'google_drive_refresh_token').maybeSingle();
  if (error) throw error;
  return data?.value || null;
}

export async function saveDriveToken(token) {
  const sb = supabaseAdmin();
  const { error } = await sb.from('arca_private').upsert({ key: 'google_drive_refresh_token', value: token, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getDriveFolderId() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('arca_private').select('value').eq('key', 'google_drive_folder_id').maybeSingle();
  if (error) throw error;
  return data?.value || null;
}

export async function saveDriveFolderId(id) {
  const sb = supabaseAdmin();
  const { error } = await sb.from('arca_private').upsert({ key: 'google_drive_folder_id', value: id, updated_at: new Date().toISOString() });
  if (error) throw error;
}
