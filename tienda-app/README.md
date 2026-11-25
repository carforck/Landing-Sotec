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
NEXT_PUBLIC_TIENDA_PANEL_DEMO=1 npm run dev   # con el panel de demostración abierto
npm run build && npm start
```

## Modos de datos

| Modo | Cuándo | Dónde quedan los datos |
|---|---|---|
| **Demostración** (`local`) | Sin variables de Supabase | `localStorage` de cada navegador. Lo que se carga en el panel **no lo ven otros visitantes**. El panel está **cerrado** («Panel no disponible») y el enlace «Administrar tienda» oculto, salvo con `NEXT_PUBLIC_TIENDA_PANEL_DEMO=1` (desarrollo local o preview), que lo abre sin usuario. |
| **Supabase** | Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Base de datos real; panel con usuario y rol `admin`, imágenes en Storage, recuperación de contraseña por correo. |

Las páginas solo usan la interfaz `Repositorio` (`src/lib/datos/repositorio.ts`); los adaptadores
son `local.ts` y `supabase.ts`, y `index.ts` elige uno según las variables.

## Activar Supabase

Paso a paso para el día de conectar (proyecto, migraciones, usuario de Magno, Auth, variables en
Vercel, carga del catálogo y checklist de verificación): **[SUPABASE.md](SUPABASE.md)**.

Seguridad (en la base, por RLS): el visitante anónimo solo lee el catálogo activo y la
configuración, y crea pedidos con la función `crear_pedido`, que toma nombre y precio de la base
(no del navegador), descarta productos ocultos y limita a 3 pedidos por celular cada 10 minutos.
Nunca puede leer pedidos. Escribir exige un usuario con rol `admin`. La clave `service_role` no se
usa en esta app.

## Pruebas

```bash
npm run test:unit    # carrito, mensaje de WhatsApp, antispam, validación, adaptador local
npm run test:db      # migración + RLS en PostgreSQL 16 desechable (Podman/Docker)
npm run test:e2e     # navegador contra un servidor ya levantado (BASE=http://localhost:3300),
                     # build con NEXT_PUBLIC_TIENDA_PANEL_DEMO=1
npm run test:e2e:panel-cerrado   # build sin Supabase ni panel demo (como producción hoy)
npm run supabase:local           # Supabase local real (CLI + Docker/Podman) y usuarios de prueba
npm run test:e2e:supabase        # e2e en modo Supabase contra ese local (ver SUPABASE.md §8)
```
