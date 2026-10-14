-- Deshacer la separación por espacios (vuelve al comportamiento anterior: cualquiera con sesión ve todo).
-- Antes de correrlo, publica la versión anterior de la app.
-- OJO: si ya hay datos de JEV+, primero bórralos o muévelos, porque la llave primaria vuelve a ser (collection, id).
begin;
delete from public.arca_records where space <> 'philly';
do $$ declare pk text; begin
  select conname into pk from pg_constraint where conrelid = 'public.arca_records'::regclass and contype = 'p';
  if pk is not null then execute format('alter table public.arca_records drop constraint %I', pk); end if;
  alter table public.arca_records add primary key (collection, id);
end $$;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'arca_records' loop
    execute format('drop policy %I on public.arca_records', p.policyname);
  end loop;
end $$;
create policy arca_records_authenticated on public.arca_records for all to authenticated using (true) with check (true);
alter table public.arca_records drop column if exists space;
drop table if exists public.arca_members;
drop function if exists public.arca_can_access(text);
drop function if exists public.arca_is_admin(text);
drop function if exists public.arca_my_email();
commit;
