-- Arca · Cerrar el acceso heredado a Philly
-- Ejecútalo en Supabase → SQL Editor DESPUÉS de spaces.sql y DESPUÉS de publicar esta versión de la app.
-- Hoy, una cuenta nueva que no tiene ninguna fila en arca_members entra a Philly (acceso heredado).
-- Este script le da su fila a cada persona que ya está en Philly/JEV+ y apaga ese acceso:
-- desde entonces una cuenta nueva sin membresía no ve nada hasta que un líder la agregue.
-- Si algo sale mal, ver el bloque "Para deshacer" al final.
begin;

-- 1) Cada persona de Philly con correo recibe su membresía en Philly.
insert into public.arca_members (space, email, role)
select 'philly', lower(trim(r.data ->> 'email')), 'member'
from public.arca_records r
where r.space = 'philly' and r.collection = 'people'
  and coalesce(r.data ->> 'status', 'activo') <> 'inactivo'
  and lower(trim(coalesce(r.data ->> 'email', ''))) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
on conflict (space, email) do nothing;

-- 2) Cada persona de JEV+ con correo recibe su membresía en JEV+.
insert into public.arca_members (space, email, role)
select 'jev', lower(trim(r.data ->> 'email')), 'member'
from public.arca_records r
where r.space = 'jev' and r.collection = 'people'
  and coalesce(r.data ->> 'status', 'activo') <> 'inactivo'
  and lower(trim(coalesce(r.data ->> 'email', ''))) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
on conflict (space, email) do nothing;

-- 3) Ricardo y Andrés (ids fijos de la app) son administradores de Philly.
update public.arca_members m set role = 'admin'
from public.arca_records r
where m.space = 'philly' and r.space = 'philly' and r.collection = 'people'
  and r.id in ('mult2ujll39ya', 'mult3wdds4r3d')
  and lower(trim(coalesce(r.data ->> 'email', ''))) = m.email;

-- 4) Seguro anti-sustos: si alguna cuenta existente se quedaría sin ningún espacio, NO se cierra nada.
--    El mensaje lista los correos. Agrégalos (select/insert en arca_members) o bórralos y vuelve a correr el script.
do $$
declare sin text;
begin
  select string_agg(u.email, ', ' order by u.email) into sin
  from auth.users u
  where u.email is not null
    and not exists (select 1 from public.arca_members m where m.email = lower(u.email));
  if sin is not null then
    raise exception 'Estas cuentas se quedarían sin acceso: %. Agrégalas a arca_members o bórralas y vuelve a correr este script.', sin;
  end if;
end $$;

-- 5) La app pregunta esto para saber si mostrar "Tu cuenta aún no tiene acceso".
create or replace function public.arca_access_closed() returns boolean
language sql stable as $$ select true $$;
grant execute on function public.arca_access_closed() to authenticated, anon;

-- 6) Apagar el acceso heredado: solo entra quien tiene fila en arca_members.
create or replace function public.arca_can_access(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.arca_members m where m.space = s and m.email = public.arca_my_email());
$$;

commit;

-- Revisar: select space, role, count(*) from public.arca_members group by 1, 2 order by 1, 2;
--
-- Para deshacer (vuelve al acceso heredado):
--   create or replace function public.arca_access_closed() returns boolean language sql stable as $$ select false $$;
--   create or replace function public.arca_can_access(s text) returns boolean language sql stable security definer set search_path = public as $$
--     select exists (select 1 from public.arca_members m where m.space = s and m.email = public.arca_my_email())
--         or (s = 'philly' and not exists (select 1 from public.arca_members m where m.email = public.arca_my_email()));
--   $$;
