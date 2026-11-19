# Tienda virtual SOTEC

Catálogo → ficha → carrito → datos del cliente → pedido guardado y enviado por **WhatsApp** con el
detalle completo (productos, cantidades, precios, total en COP). Panel en `/tienda/admin` para
productos (con fotos), categorías, pedidos y configuración.

Se publica en **sotecse.com/tienda**: la app usa `basePath: "/tienda"` y la landing reescribe
`/tienda/*` a este proyecto de Vercel.

Stack: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · zod · Supabase (opcional).

## Correr

```bash
npm install
npm run dev          # http://localhost:3300/tienda
npm run build && npm start
```

## Modos de datos

| Modo | Cuándo | Dónde quedan los datos |
|---|---|---|
| **Demostración** (`local`) | Sin variables de Supabase | `localStorage` de cada navegador. Lo que se carga en el panel **no lo ven otros visitantes**. El panel se abre sin usuario. |
| **Supabase** | Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Base de datos real; panel con usuario y rol `admin`. |

Las páginas solo usan la interfaz `Repositorio` (`src/lib/datos/repositorio.ts`); los adaptadores
son `local.ts` y `supabase.ts`, y `index.ts` elige uno según las variables.

## Activar Supabase

1. Crear el proyecto en Supabase y ejecutar `supabase/migrations/0001_tienda.sql` (SQL Editor o CLI).
2. En *Authentication* crear el usuario administrador y darle el rol:
   `update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = '<correo>');`
3. En Vercel, definir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`) y redesplegar.
4. Cargar categorías y productos desde el panel (el catálogo de ejemplo es solo del modo demostración).

Seguridad (en la base, por RLS): el visitante anónimo solo lee el catálogo activo y la
configuración, y crea pedidos con la función `crear_pedido`, que toma nombre y precio de la base
(no del navegador), descarta productos ocultos y limita a 3 pedidos por celular cada 10 minutos.
Nunca puede leer pedidos. Escribir exige un usuario con rol `admin`. La clave `service_role` no se
usa en esta app.

## Pruebas

```bash
npm run test:unit    # carrito, mensaje de WhatsApp, antispam, validación, adaptador local
npm run test:db      # migración + RLS en PostgreSQL 16 desechable (Podman/Docker)
npm run test:e2e     # navegador contra un servidor ya levantado (BASE=http://localhost:3300)
```
