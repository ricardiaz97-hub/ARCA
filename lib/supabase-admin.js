import { createClient } from '@supabase/supabase-js';

const env = k => String(process.env[k] || '').trim();

export function missingSupabaseEnv() {
  return ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !env(k));
}

export function supabaseAdmin() {
  const miss = missingSupabaseEnv();
  if (miss.length) throw new Error('Faltan variables en Vercel: ' + miss.join(', '));
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

function tableHint(error) {
  if (/arca_private/.test(error?.message || '') || error?.code === '42P01' || error?.code === 'PGRST205')
    return new Error('La tabla arca_private no existe en Supabase: ejecuta drive-setup.sql en el SQL Editor.');
  if (/permission denied|row-level security/i.test(error?.message || ''))
    return new Error('Supabase rechazó la escritura: SUPABASE_SERVICE_ROLE_KEY en Vercel no es la service-role key (parece la publishable/anon).');
  return error;
}

async function getValue(key) {
  const { data, error } = await supabaseAdmin().from('arca_private').select('value').eq('key', key).maybeSingle();
  if (error) throw tableHint(error);
  return data?.value || null;
}

async function setValue(key, value) {
  const { error } = await supabaseAdmin().from('arca_private').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw tableHint(error);
}

async function delValue(key) {
  const { error } = await supabaseAdmin().from('arca_private').delete().eq('key', key);
  if (error) throw tableHint(error);
}

export const getDriveToken = () => getValue('google_drive_refresh_token');
export const saveDriveToken = t => setValue('google_drive_refresh_token', t);
export const getDriveFolderId = () => getValue('google_drive_folder_id');
export const saveDriveFolderId = id => setValue('google_drive_folder_id', id);
// Al reconectar con otra cuenta de Google la carpeta vieja ya no es accesible.
export const clearDriveFolderId = () => delValue('google_drive_folder_id');
