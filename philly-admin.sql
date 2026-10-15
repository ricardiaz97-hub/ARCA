-- Arca · Dar permisos de administrador de Philly a una persona (por su nombre en Personas).
-- Cambia el nombre entre comillas si es otra persona. Se puede correr más de una vez.
-- Resultado esperado: una fila con su correo y role = admin. Si no sale ninguna fila,
-- esa persona no tiene correo guardado en su perfil de Philly (agrégalo y vuelve a correr).
insert into public.arca_members (space, email, role)
select 'philly', lower(trim(data->>'email')), 'admin'
from public.arca_records
where space = 'philly' and collection = 'people'
  and data->>'name' ilike '%mario%ortiz%'
  and coalesce(trim(data->>'email'), '') <> ''
on conflict (space, email) do update set role = 'admin'
returning space, email, role;
