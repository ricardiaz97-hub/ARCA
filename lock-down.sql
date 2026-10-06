-- Arca: que nadie sin sesión pueda leer ni escribir los datos.
-- Ejecútalo una vez en Supabase → SQL Editor. Es seguro repetirlo.
alter table public.arca_records enable row level security;
-- El rol "anon" (cualquiera con la publishable key, sin iniciar sesión) pierde todo acceso.
revoke all on table public.arca_records from anon;
-- Los usuarios con sesión siguen pudiendo leer y escribir como hasta ahora.
grant select, insert, update, delete on table public.arca_records to authenticated;
drop policy if exists arca_records_authenticated on public.arca_records;
create policy arca_records_authenticated on public.arca_records
  for all to authenticated using (true) with check (true);
