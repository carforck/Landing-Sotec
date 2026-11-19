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
insert into public.marcas (id, nombre, activa) values ('mar-a', 'Ejemplo A', true), ('mar-b', 'Ejemplo B', false);
insert into public.productos (id, nombre, categoria_id, precio, activo, tipo, modalidad, marca_id) values
  ('srv-mant', 'Mantenimiento de equipos', 'cat-solar', 120000, true, 'servicio', 'Por equipo', 'mar-a');
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
select pg_temp.ok((select count(*) = 3 from public.productos), 'anon solo ve productos activos de categorías activas');
select pg_temp.ok((select count(*) = 1 from public.marcas), 'anon solo ve marcas activas');
select pg_temp.falla($$insert into public.marcas (id, nombre) values ('mar-x', 'X')$$, 'anon no crea marcas');
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
     '{"nombre":"Cliente Ficticio","celular":"300 123 4567","ciudad":"Cartagena","segmento":"hogar"}',
     '[{"producto_id":"prd-panel","cantidad":2,"precio":1},{"producto_id":"prd-kit","cantidad":1},{"producto_id":"prd-inactivo","cantidad":5},{"producto_id":"prd-cat-oculta","cantidad":1}]'
   ) r) x),
  'crear_pedido: total con precios de la base, descarta inactivos y ocultos, código T-XXXXXX');
select pg_temp.ok(
  (select r -> 'items' -> 0 ->> 'productoId' = 'prd-panel' and r -> 'items' -> 1 ->> 'productoId' = 'prd-kit' and (r -> 'items' -> 1) ? 'precio' and r -> 'items' -> 1 -> 'precio' = 'null'::jsonb
   from (select public.crear_pedido('{"nombre":"Cliente Orden","celular":"3007778888","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-panel","cantidad":1},{"producto_id":"prd-kit","cantidad":1}]') r) x),
  'crear_pedido conserva el orden del carrito y el precio nulo de lo que se cotiza');
select pg_temp.ok(
  (select (r ->> 'total')::numeric = 690000 and r ->> 'segmento' = 'empresa' and r -> 'cliente' ->> 'empresa' = 'Empresa Ficticia S.A.S.'
     and (r -> 'items' -> 1 ->> 'tipo') = 'servicio' and (r -> 'items' -> 1 ->> 'modalidad') = 'Por equipo' and (r ->> 'con_items_a_cotizar')::boolean
   from (select public.crear_pedido(
     '{"nombre":"Cliente Empresa","celular":"3105550000","ciudad":"Barranquilla","segmento":"empresa","empresa":"Empresa Ficticia S.A.S."}',
     '[{"producto_id":"prd-panel","cantidad":1},{"producto_id":"srv-mant","cantidad":3}]'
   ) r) x),
  'crear_pedido: el servicio va en el pedido con tipo y modalidad pero no suma al total; guarda el segmento');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001112222","ciudad":"Cartagena"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'crear_pedido exige hogar o empresa');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001112222","ciudad":"Cartagena","segmento":"oficina"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'crear_pedido rechaza segmento inválido');
select pg_temp.ok((select count(*) = 0 from public.pedidos), 'anon no puede leer pedidos (ni el suyo)');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Ab","celular":"3001234567","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'crear_pedido rechaza nombre corto');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"12","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'crear_pedido rechaza celular inválido');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena","segmento":"hogar"}', '[]')$$, 'crear_pedido rechaza carrito vacío');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-inactivo","cantidad":1}]')$$, 'crear_pedido rechaza solo productos no disponibles');
select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-panel","cantidad":1000}]');
select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-panel","cantidad":1}]');
select pg_temp.falla($$select public.crear_pedido('{"nombre":"Cliente Ficticio","celular":"3001234567","ciudad":"Cartagena","segmento":"hogar"}', '[{"producto_id":"prd-panel","cantidad":1}]')$$, 'límite: 4.º pedido del mismo celular en 10 min');
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
select pg_temp.ok((select count(*) = 5 from public.pedidos), 'admin ve los pedidos');
select pg_temp.ok((select count(*) = 5 from public.productos), 'admin ve también inactivos y ocultos');
update public.pedidos set estado = 'vendido' where total = 1380000;
select pg_temp.ok((select estado = 'vendido' from public.pedidos where total = 1380000), 'admin cambia el estado');
insert into public.productos (id, nombre, categoria_id, precio, precio_anterior, segmentos) values ('prd-nuevo', 'Producto nuevo', 'cat-solar', 5000, 6000, '{empresa}');
select pg_temp.ok((select count(*) = 6 from public.productos), 'admin crea productos con oferta y segmento');
select pg_temp.falla($$insert into public.productos (id, nombre, categoria_id, precio, precio_anterior) values ('prd-mal', 'Oferta mal', 'cat-solar', 5000, 4000)$$, 'precio anterior debe ser mayor que el precio');
select pg_temp.falla($$insert into public.productos (id, nombre, categoria_id, precio, precio_anterior) values ('prd-mal2', 'Oferta sin precio', 'cat-solar', null, 4000)$$, 'oferta exige precio actual');
select pg_temp.falla($$insert into public.productos (id, nombre, categoria_id, segmentos) values ('prd-mal3', 'Segmento mal', 'cat-solar', '{oficina}')$$, 'segmentos solo hogar/empresa');
select pg_temp.falla($$insert into public.productos (id, nombre, categoria_id, tipo) values ('prd-mal4', 'Tipo mal', 'cat-solar', 'kit')$$, 'tipo solo producto/servicio');
insert into public.banners (id, ubicacion, titulo, imagen, enlace) values ('ban-promo', 'promo', 'Promo', '/img/p.webp', '/producto/prd-panel');
select pg_temp.falla($$insert into public.banners (id, ubicacion, imagen) values ('ban-mal', 'lateral', '/img/x.webp')$$, 'ubicación del banner validada');
delete from public.marcas where id = 'mar-a';
select pg_temp.ok((select marca_id is null from public.productos where id = 'srv-mant'), 'borrar una marca deja el producto sin marca');
select pg_temp.ok((select count(*) = 2 from public.banners where ubicacion = 'carrusel'), 'admin ve banners inactivos');
update public.banners set activo = true where id = 'ban-2';
update public.categorias set icono = 'sol' where id = 'cat-solar';
select pg_temp.falla($$update public.categorias set icono = '<script>' where id = 'cat-solar'$$, 'ícono de categoría validado');
insert into storage.objects (bucket_id, name) values ('productos', 'foto.webp');
update public.configuracion set whatsapp_empresa = '573000000000' where id = 1;
select pg_temp.falla($$update public.configuracion set whatsapp_hogar = 'abc' where id = 1$$, 'configuración valida el número');
reset role;
-- (sin política SELECT en storage.objects: el bucket es público y se lee por URL; se cuenta como postgres)
select pg_temp.ok((select count(*) = 1 from storage.objects), 'admin sube imágenes');
select pg_temp.ok((select whatsapp_empresa = '573000000000' and whatsapp_hogar = '573104696060' from public.configuracion), 'admin cambia el WhatsApp de empresas');
\echo 'Todas las pruebas de base de datos pasaron'
