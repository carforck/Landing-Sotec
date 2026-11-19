-- Pruebas de RLS y de crear_pedido. Falla (ON_ERROR_STOP) si algo no se cumple.
\set QUIET on
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALLÓ: %', msg; end if;
  raise notice '✓ %', msg;
end $$;
create or replace function pg_temp.falla(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice '✓ % (%)', msg, sqlerrm;
    return;
  end;
  raise exception 'FALLÓ (no dio error): %', msg;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Datos (como postgres)
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'admin@prueba.test'), ('00000000-0000-0000-0000-00000000000b', 'otro@prueba.test');
update public.perfiles set rol = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.categorias (id, nombre, orden, activa) values ('cat-solar', 'Energía solar', 1, true), ('cat-oculta', 'Oculta', 2, false);
insert into public.productos (id, nombre, categoria_id, precio, activo) values
  ('prd-panel', 'Panel solar 550 W', 'cat-solar', 690000, true),
  ('prd-kit', 'Kit solar a cotizar', 'cat-solar', null, true),
  ('prd-inactivo', 'Producto inactivo', 'cat-solar', 1000, false),
  ('prd-cat-oculta', 'Producto de categoría oculta', 'cat-oculta', 2000, true);

insert into public.banners (id, titulo, imagen, enlace, activo) values ('ban-1', 'Visible', '/img/a.webp', '/?categoria=cat-solar', true), ('ban-2', 'Oculto', '/img/b.webp', '', false);
select pg_temp.ok((select count(*) = 2 from public.perfiles), 'trigger crea perfil por usuario');
select pg_temp.falla($$insert into public.banners (id, imagen, enlace) values ('ban-x', '/img/x.webp', 'https://sitio-externo.test')$$, 'banner no acepta enlaces externos');

-- ── Anónimo
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok((select count(*) = 2 from public.productos), 'anon solo ve productos activos de categorías activas');
select pg_temp.ok((select count(*) = 1 from public.categorias), 'anon solo ve categorías activas');
select pg_temp.ok((select count(*) = 1 from public.configuracion), 'anon lee la configuración');
select pg_temp.ok((select count(*) = 1 from public.banners), 'anon solo ve banners activos');
select pg_temp.falla($$insert into public.banners (id, imagen) values ('ban-z', '/img/z.webp')$$, 'anon no crea banners');
select pg_temp.falla($$insert into public.pedidos (codigo, cliente, celular, items) values ('T-XXXXXX', '{}', '3001234567', '[]')$$, 'anon no inserta pedidos directo');
select pg_temp.falla($$insert into public.productos (id, nombre, categoria_id) values ('prd-x', 'Hackeado', 'cat-solar')$$, 'anon no crea productos');
update public.productos set precio = 1 where id = 'prd-panel';
select pg_temp.falla($$insert into storage.objects (bucket_id, name) values ('productos', 'x.webp')$$, 'anon no sube imágenes');

-- crear_pedido: recalcula precios, ignora inactivos, valida
select pg_temp.ok(
  (select (r ->> 'total')::numeric = 1380000 and (r ->> 'con_items_a_cotizar')::boolean and jsonb_array_length(r -> 'items') = 2 and r ->> 'codigo' ~ '^T-[A-Z0-9]{6}$'
   from (select public.crear_pedido(
     '{"nombre":"Cliente Ficticio","celular":"300 123 4567","ciudad":"Cartagena"}',
     '[{"producto_id":"prd-panel","cantidad":2,"precio":1},{"producto_id":"prd-kit","cantidad":1},{"producto_id":"prd-inactivo","cantidad":5},{"producto_id":"prd-cat-oculta","cantidad":1}]'
   ) r) x),
  'crear_pedido: total con precios de la base, descarta inactivos y ocultos, código T-XXXXXX');
select pg_temp.ok((select count(*) = 0 from public.pedidos), 'anon no puede leer pedidos (ni el suyo)');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Ab","celular":"3001234567","ciudad":"Cartagena"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'crear_pedido rechaza nombre corto');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"12","ciudad":"Cartagena"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'crear_pedido rechaza celular inválido');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena"}', '[]')$$, 'crear_pedido rechaza carrito vacío');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena"}', '[{"producto_id":"prd-inactivo","cantidad":1}]')$$, 'crear_pedido rechaza solo productos no disponibles');
select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena"}', '[{"producto_id":"prd-panel","cantidad":1000}]');
select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena"}', '[{"producto_id":"prd-panel","cantidad":1}]');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'límite: 4.º pedido del mismo celular en 10 min');
reset role;
select pg_temp.ok((select precio = 690000 from public.productos where id = 'prd-panel'), 'el update anónimo no cambió el precio');
select pg_temp.ok((select (items -> 0 ->> 'cantidad')::int = 999 from public.pedidos where total = 690000 * 999), 'cantidad acotada a 999');

-- ── Autenticado sin rol
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.ok((select count(*) = 0 from public.pedidos), 'usuario sin rol no ve pedidos');
update public.perfiles set rol = 'admin' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select pg_temp.ok((select rol = 'ninguno' from public.perfiles where id = '00000000-0000-0000-0000-00000000000b'), 'nadie se asciende a admin solo');

-- ── Admin
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.ok((select count(*) = 3 from public.pedidos), 'admin ve los pedidos');
select pg_temp.ok((select count(*) = 4 from public.productos), 'admin ve también inactivos y ocultos');
update public.pedidos set estado = 'vendido' where total = 1380000;
select pg_temp.ok((select estado = 'vendido' from public.pedidos where total = 1380000), 'admin cambia el estado');
insert into public.productos (id, nombre, categoria_id, precio) values ('prd-nuevo', 'Producto nuevo', 'cat-solar', 5000);
select pg_temp.ok((select count(*) = 5 from public.productos), 'admin crea productos');
select pg_temp.ok((select count(*) = 2 from public.banners), 'admin ve banners inactivos');
update public.banners set activo = true where id = 'ban-2';
update public.categorias set icono = 'sol' where id = 'cat-solar';
select pg_temp.falla($$update public.categorias set icono = '<script>' where id = 'cat-solar'$$, 'ícono de categoría validado');
insert into storage.objects (bucket_id, name) values ('productos', 'foto.webp');
update public.configuracion set whatsapp = '573000000000' where id = 1;
select pg_temp.falla($$update public.configuracion set whatsapp = 'abc' where id = 1$$, 'configuración valida el número');
reset role;
-- (sin política SELECT en storage.objects: el bucket es público y se lee por URL; se cuenta como postgres)
select pg_temp.ok((select count(*) = 1 from storage.objects), 'admin sube imágenes');
select pg_temp.ok((select whatsapp = '573000000000' from public.configuracion), 'admin cambia la configuración');
\echo 'Todas las pruebas de base de datos pasaron'
