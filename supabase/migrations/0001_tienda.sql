-- Tienda virtual SOTEC · esquema inicial
-- Seguridad: el visitante anónimo SOLO lee el catálogo activo y la configuración pública, y crea
-- pedidos con la función crear_pedido (recalcula precios desde la base y limita envíos).
-- Nunca lee pedidos. Todo lo demás exige un usuario autenticado con rol 'admin' en perfiles.

-- En Supabase pgcrypto vive en el esquema «extensions» (por eso crear_pedido lo incluye en su search_path)
create extension if not exists pgcrypto with schema extensions;

-- ─── Perfiles y rol ────────────────────────────────────────────────────────
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'ninguno' check (rol in ('admin', 'ninguno')),
  creado timestamptz not null default now()
);
alter table public.perfiles enable row level security;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- Cada usuario ve su propio perfil; solo un admin ve y cambia todos. Nadie se asciende solo.
create policy perfiles_propio on public.perfiles for select to authenticated using (id = auth.uid() or public.es_admin());
create policy perfiles_admin_escribe on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Perfil automático (sin permisos) al crear un usuario en Auth
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.crear_perfil();

-- ─── Catálogo ──────────────────────────────────────────────────────────────
create table if not exists public.categorias (
  id text primary key check (char_length(id) between 3 and 60),
  nombre text not null check (char_length(nombre) between 2 and 80),
  imagen text not null default '',
  orden int not null default 0,
  activa boolean not null default true,
  creado timestamptz not null default now()
);

create table if not exists public.productos (
  id text primary key check (char_length(id) between 3 and 60),
  nombre text not null check (char_length(nombre) between 3 and 120),
  categoria_id text not null references public.categorias (id) on update cascade on delete restrict,
  descripcion text not null default '' check (char_length(descripcion) <= 400),
  ficha_tecnica text not null default '' check (char_length(ficha_tecnica) <= 4000),
  precio numeric(14, 0) check (precio is null or precio >= 0),
  imagenes text[] not null default '{}' check (cardinality(imagenes) <= 6),
  destacado boolean not null default false,
  activo boolean not null default true,
  orden int not null default 0,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists productos_categoria on public.productos (categoria_id);

alter table public.categorias enable row level security;
alter table public.productos enable row level security;

create policy categorias_publico on public.categorias for select to anon, authenticated using (activa or public.es_admin());
create policy categorias_admin on public.categorias for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy productos_publico on public.productos for select to anon, authenticated
  using ((activo and exists (select 1 from public.categorias c where c.id = categoria_id and c.activa)) or public.es_admin());
create policy productos_admin on public.productos for all to authenticated using (public.es_admin()) with check (public.es_admin());

create or replace function public.tocar_actualizado()
returns trigger language plpgsql as $$ begin new.actualizado = now(); return new; end $$;
drop trigger if exists productos_actualizado on public.productos;
create trigger productos_actualizado before update on public.productos for each row execute function public.tocar_actualizado();

-- ─── Configuración pública (una fila) ──────────────────────────────────────
create table if not exists public.configuracion (
  id int primary key default 1 check (id = 1),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),
  mensaje_inicial text not null check (char_length(mensaje_inicial) between 1 and 300)
);
alter table public.configuracion enable row level security;
create policy configuracion_publico on public.configuracion for select to anon, authenticated using (true);
create policy configuracion_admin on public.configuracion for all to authenticated using (public.es_admin()) with check (public.es_admin());
insert into public.configuracion (id, whatsapp, mensaje_inicial)
values (1, '573104696060', 'Hola SOTEC, quiero cotizar este pedido de la tienda virtual:')
on conflict (id) do nothing;

-- ─── Pedidos ───────────────────────────────────────────────────────────────
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  cliente jsonb not null,
  celular text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(14, 0) not null default 0,
  con_items_a_cotizar boolean not null default false,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'contactado', 'cotizado', 'vendido', 'cancelado')),
  creado timestamptz not null default now()
);
create index if not exists pedidos_celular_creado on public.pedidos (celular, creado desc);
create index if not exists pedidos_creado on public.pedidos (creado desc);
alter table public.pedidos enable row level security;

-- Sin políticas para anon: no puede leer, insertar ni cambiar pedidos directamente.
create policy pedidos_admin_lee on public.pedidos for select to authenticated using (public.es_admin());
create policy pedidos_admin_cambia on public.pedidos for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy pedidos_admin_borra on public.pedidos for delete to authenticated using (public.es_admin());

-- Crear pedido (público). Valida datos, toma nombre y precio del catálogo vigente (nunca los del
-- navegador), descarta productos inactivos y limita a 3 pedidos por celular cada 10 minutos y
-- 60 por hora en total.
create or replace function public.crear_pedido(p_cliente jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_nombre text := btrim(coalesce(p_cliente ->> 'nombre', ''));
  v_celular text := regexp_replace(coalesce(p_cliente ->> 'celular', ''), '[^0-9+]', '', 'g');
  v_ciudad text := btrim(coalesce(p_cliente ->> 'ciudad', ''));
  v_correo text := btrim(coalesce(p_cliente ->> 'correo', ''));
  v_nota text := btrim(coalesce(p_cliente ->> 'nota', ''));
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_cotizar boolean := false;
  v_codigo text;
  v_fila public.pedidos;
  r record;
begin
  if char_length(v_nombre) not between 3 and 80 then raise exception 'Nombre no válido'; end if;
  if v_celular !~ '^\+?[0-9]{7,15}$' then raise exception 'Celular no válido'; end if;
  if char_length(v_ciudad) not between 2 and 60 then raise exception 'Ciudad no válida'; end if;
  if char_length(v_correo) > 120 or (v_correo <> '' and v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Correo no válido'; end if;
  if char_length(v_nota) > 500 then raise exception 'Nota muy larga'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Carrito no válido'; end if;

  if (select count(*) from public.pedidos where celular = v_celular and creado > now() - interval '10 minutes') >= 3 then
    raise exception 'Demasiados pedidos seguidos. Espera unos minutos.';
  end if;
  if (select count(*) from public.pedidos where creado > now() - interval '1 hour') >= 60 then
    raise exception 'La tienda recibe muchos pedidos en este momento. Escríbenos por WhatsApp.';
  end if;

  for r in
    select p.id, p.nombre, p.precio, coalesce(p.imagenes[1], '') as imagen,
           least(greatest(coalesce((i ->> 'cantidad')::int, 1), 1), 999) as cantidad
    from jsonb_array_elements(p_items) i
    join public.productos p on p.id = i ->> 'producto_id'
    join public.categorias c on c.id = p.categoria_id
    where p.activo and c.activa
  loop
    v_items := v_items || jsonb_build_object('productoId', r.id, 'nombre', r.nombre, 'precio', r.precio, 'imagen', r.imagen, 'cantidad', r.cantidad);
    if r.precio is null then v_cotizar := true; else v_total := v_total + r.precio * r.cantidad; end if;
  end loop;
  if jsonb_array_length(v_items) = 0 then raise exception 'Los productos del carrito ya no están disponibles'; end if;

  loop
    v_codigo := 'T-' || upper(substr(translate(encode(gen_random_bytes(8), 'base64'), '+/=0O1Il', ''), 1, 6));
    exit when char_length(v_codigo) = 8 and not exists (select 1 from public.pedidos where codigo = v_codigo);
  end loop;

  insert into public.pedidos (codigo, cliente, celular, items, total, con_items_a_cotizar)
  values (
    v_codigo,
    jsonb_build_object('nombre', v_nombre, 'celular', v_celular, 'ciudad', v_ciudad, 'correo', nullif(v_correo, ''), 'nota', nullif(v_nota, '')),
    v_celular, v_items, v_total, v_cotizar
  )
  returning * into v_fila;

  return to_jsonb(v_fila);
end $$;
revoke all on function public.crear_pedido(jsonb, jsonb) from public;
grant execute on function public.crear_pedido(jsonb, jsonb) to anon, authenticated;

-- ─── Imágenes (Storage) ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Lectura pública por URL (bucket público); solo admin sube, cambia o borra.
create policy imagenes_admin_sube on storage.objects for insert to authenticated with check (bucket_id = 'productos' and public.es_admin());
create policy imagenes_admin_cambia on storage.objects for update to authenticated using (bucket_id = 'productos' and public.es_admin());
create policy imagenes_admin_borra on storage.objects for delete to authenticated using (bucket_id = 'productos' and public.es_admin());

-- Primer administrador (después de crear el usuario en Authentication):
--   update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = '<correo>');
