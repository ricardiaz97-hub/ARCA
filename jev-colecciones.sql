-- Arca · JEV+: permitir las colecciones nuevas (jevacts, jevideas)
-- Error que arregla: "La base de datos no aceptó jevacts (código 23514)".
-- La tabla original solo aceptaba los tipos de registro de Philly. Esto quita esa lista
-- (la app ya controla qué colecciones existen). Se puede correr más de una vez.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.arca_records'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%collection%'
  loop
    execute format('alter table public.arca_records drop constraint %I', c.conname);
    raise notice 'Quitada la regla %', c.conname;
  end loop;
end $$;
