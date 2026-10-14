-- Arca · Espacios por grupo (Philly y JEV+)
-- Ejecútalo UNA vez en Supabase → SQL Editor ANTES de publicar la versión nueva de la app.
-- Es seguro repetirlo. Todo lo que existe hoy queda en el espacio 'philly' y nadie de Philly pierde acceso.
--
-- Cómo funciona el acceso:
--  · Quien tiene filas en arca_members entra SOLO a los espacios donde está (por correo).
--  · Quien NO tiene ninguna fila (todo Philly hoy) sigue entrando a 'philly' como siempre.
--  · Las filas de arca_members solo las pueden cambiar los admin de ese espacio.
begin;

-- 1) Cada registro pertenece a un espacio ('philly' por defecto = todo lo actual).
alter table public.arca_records add column if not exists space text not null default 'philly';

-- 2) La llave primaria incluye el espacio (así 'settings/invite' puede existir en cada espacio).
do $$
declare pk text;
begin
  select conname into pk from pg_constraint where conrelid = 'public.arca_records'::regclass and contype = 'p';
  if pk is not null then execute format('alter table public.arca_records drop constraint %I', pk); end if;
  alter table public.arca_records add primary key (space, collection, id);
end $$;

-- 3) Quién pertenece a qué espacio (por correo, en minúsculas).
create table if not exists public.arca_members (
  space      text not null,
  email      text not null check (email = lower(email)),
  role       text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  primary key (space, email)
);

create or replace function public.arca_my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- ¿Puedo entrar a este espacio? (Sin ninguna membresía = acceso heredado a Philly.)
create or replace function public.arca_can_access(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.arca_members m where m.space = s and m.email = public.arca_my_email())
      or (s = 'philly' and not exists (select 1 from public.arca_members m where m.email = public.arca_my_email()));
$$;

create or replace function public.arca_is_admin(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.arca_members m where m.space = s and m.role = 'admin' and m.email = public.arca_my_email());
$$;

-- 4) Seguridad de arca_members.
alter table public.arca_members enable row level security;
revoke all on table public.arca_members from anon;
grant select, insert, update, delete on table public.arca_members to authenticated;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'arca_members' loop
    execute format('drop policy %I on public.arca_members', p.policyname);
  end loop;
end $$;
create policy arca_members_select on public.arca_members for select to authenticated
  using (email = public.arca_my_email() or public.arca_is_admin(space));
create policy arca_members_insert on public.arca_members for insert to authenticated with check (public.arca_is_admin(space));
create policy arca_members_update on public.arca_members for update to authenticated
  using (public.arca_is_admin(space)) with check (public.arca_is_admin(space));
create policy arca_members_delete on public.arca_members for delete to authenticated using (public.arca_is_admin(space));

-- 5) Seguridad de arca_records: solo los espacios a los que perteneces.
alter table public.arca_records enable row level security;
revoke all on table public.arca_records from anon;
grant select, insert, update, delete on table public.arca_records to authenticated;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'arca_records' loop
    execute format('drop policy %I on public.arca_records', p.policyname);
  end loop;
end $$;
create policy arca_records_select on public.arca_records for select to authenticated using (public.arca_can_access(space));
create policy arca_records_insert on public.arca_records for insert to authenticated with check (public.arca_can_access(space));
create policy arca_records_update on public.arca_records for update to authenticated
  using (public.arca_can_access(space)) with check (public.arca_can_access(space));
create policy arca_records_delete on public.arca_records for delete to authenticated using (public.arca_can_access(space));

-- 6) Primeros miembros. Ricardo es admin de los dos espacios.
insert into public.arca_members (space, email, role) values
  ('philly', 'ricardovegaprod@gmail.com', 'admin'),
  ('jev',    'ricardovegaprod@gmail.com', 'admin')
on conflict (space, email) do update set role = excluded.role;
-- Para que Andrés también administre JEV+, quita los dos guiones de la línea siguiente:
-- insert into public.arca_members (space, email, role) values ('jev', 'andresoswaldo1@hotmail.com', 'admin') on conflict (space, email) do nothing;

-- 7) Perfil de Ricardo dentro de JEV+ (Arca te reconoce por el correo).
insert into public.arca_records (space, collection, id, data) values
  ('jev', 'people', 'jev-ricardo',
   '{"name":"Ricardo Vega","email":"ricardovegaprod@gmail.com","status":"activo","titles":["Líder"],"teamIds":[],"notes":"","phone":""}'::jsonb)
on conflict (space, collection, id) do nothing;

commit;

-- Para revisar que quedó bien:
--   select space, count(*) from public.arca_records group by space;           -- philly = todo lo de antes
--   select * from public.arca_members;
-- Para deshacer (solo si algo sale mal): ver spaces-rollback.sql
