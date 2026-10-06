-- Arca: almacenamiento privado de credenciales del backend.
create table if not exists public.arca_private (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.arca_private enable row level security;
-- Nadie desde el navegador puede leer/escribir esta tabla.
drop policy if exists arca_private_deny_all on public.arca_private;
create policy arca_private_deny_all on public.arca_private for all to anon, authenticated using (false) with check (false);
