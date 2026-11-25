# Conectar la tienda a Supabase

Guía para el día de pasar la tienda (sotecse.com/tienda) del **modo demostración** (datos en el
navegador, panel cerrado) a **Supabase** (base de datos real, panel con usuario). No hay que tocar
código: se crea el proyecto, se aplican las migraciones, se crea el usuario y se ponen dos variables
en Vercel.

Todo esto se validó contra un Supabase local real (Supabase CLI 2.54, Postgres 17, GoTrue, PostgREST
y Storage) con `scripts/probar-supabase.sh` y `tests/e2e/tienda-supabase.cjs` (ver al final).

> No se usa la clave `service_role` en ningún lado. Nunca la pongas en Vercel ni en el código.

---

## 1. Crear el proyecto de Supabase

1. En <https://supabase.com/dashboard> → **New project**.
   - Nombre: `tienda-sotec`.
   - Región: **South America (São Paulo)** (la más cercana a Colombia).
   - *Database password*: genera una fuerte y guárdala en el gestor de contraseñas (en la base de
     conocimiento solo se anota **dónde** quedó guardada).
   - Plan *Free* sirve para empezar. Ojo: los proyectos *Free* se pausan tras ~7 días sin actividad;
     las visitas a la tienda cuentan como actividad, pero conviene revisarlo la primera semana.
2. Cuando termine de crearse, anota el **Project ref** (Project Settings → General) y, en
   Project Settings → **API Keys**, la clave pública **`anon`** (pestaña *Legacy API keys*, empieza
   por `eyJ…`). También funciona la *publishable* (`sb_publishable_…`).

## 2. Aplicar la base de datos (migraciones)

Las migraciones están en `supabase/migrations/`:

| Archivo | Qué hace |
|---|---|
| `0001_tienda.sql` | Tablas (perfiles, categorías, marcas, productos, banners, configuración, pedidos), RLS, función `crear_pedido`, bucket de imágenes `productos` y sus políticas |
| `0002_categorias_base.sql` | Las 8 categorías base (Cómputo, Servidores, Redes, Seguridad, Energía solar, Automatización, Impresión, Servicios técnicos) |

**Opción A — CLI (recomendada).** Desde `tienda-app/`:

```bash
npx supabase@2 login                       # abre el navegador
npx supabase@2 link --project-ref <ref>    # pide la database password
npx supabase@2 db push                     # aplica 0001 y 0002
npx supabase@2 migration list              # ambas deben salir en «Remote»
```

**Opción B — SQL Editor.** En el panel de Supabase → SQL Editor → pega el contenido completo de
`0001_tienda.sql` → *Run*; luego lo mismo con `0002_categorias_base.sql`. (Si después se usa la CLI,
marcar las dos como aplicadas: `npx supabase@2 migration repair --status applied 0001 0002`.)

**Bucket de imágenes.** Lo crea la migración 0001: `productos`, público, límite 1 MB, tipos
`image/webp`, `image/jpeg`, `image/png`. Compruébalo en Storage. Solo si no aparece, créalo a mano
con esos mismos valores y vuelve a ejecutar del bloque «Imágenes (Storage)» de 0001 las cuatro
líneas `create policy imagenes_admin_…`.

## 3. Configurar Authentication

En el panel de Supabase → **Authentication**:

1. **Sign In / Providers**
   - *Allow new users to sign up*: **desactivado** (nadie puede registrarse solo).
   - Proveedor **Email**: **activado** (si se apaga, nadie puede entrar con contraseña).
   - *Minimum password length*: 10 (el panel ya pide 10 al cambiarla).
2. **URL Configuration**
   - *Site URL*: `https://sotecse.com/tienda`
   - *Redirect URLs* (agregar):
     - `https://sotecse.com/tienda/**`
     - `http://localhost:3300/tienda/**` (solo si se va a probar en local contra este proyecto)
3. **Emails → Templates → Reset Password** (el único correo que usa la tienda, para
   «¿Olvidaste tu contraseña?» en el panel):
   - *Subject*: `Tienda SOTEC: crea una contraseña nueva`
   - *Message body*: el contenido de `supabase/plantillas/recuperar.html`.
4. **Envío de correos (SMTP).** El servicio de correo incluido en Supabase solo entrega a correos
   de miembros del equipo de la organización de Supabase y con un límite muy bajo por hora. Para
   que el correo de recuperación le llegue a Magno: o se agrega su correo como miembro de la
   organización, o se configura un SMTP propio en Project Settings → Authentication → SMTP
   (por ejemplo la cuenta de correo de sotecse.com). Sin esto todo funciona salvo la recuperación
   de contraseña por correo (la contraseña se puede cambiar desde el panel con sesión iniciada, o
   un administrador del proyecto Supabase puede fijarla en Authentication → Users).

## 4. Crear el usuario administrador de Magno

1. Authentication → **Users** → *Add user* → **Create new user**:
   - Email: el correo de Magno.
   - Password: una temporal fuerte (Magno la cambia luego en el panel → «Contraseña»).
   - Marcar **Auto Confirm User**.
   - No uses *Send invitation* ni *Send password recovery* desde el panel de Supabase: esos enlaces
     no traen el código que espera la tienda. Para recuperar, usar «¿Olvidaste tu contraseña?» en
     `/tienda/admin`.
2. SQL Editor → darle el rol (el usuario nace sin permisos):

   ```sql
   update public.perfiles set rol = 'admin'
   where id = (select id from auth.users where email = '<correo-de-magno>');

   -- Verificar: debe salir su correo con rol «admin»
   select u.email, p.rol from public.perfiles p join auth.users u using (id);
   ```

   Si la consulta de verificación no muestra al usuario (se creó antes de aplicar la migración):

   ```sql
   insert into public.perfiles (id, rol)
   select id, 'admin' from auth.users where email = '<correo-de-magno>'
   on conflict (id) do update set rol = 'admin';
   ```

Otros usuarios del panel se crean igual. Para quitarle el acceso a alguien:
`update public.perfiles set rol = 'ninguno' where id = (select id from auth.users where email = '…');`

## 5. Variables en Vercel y redespliegue

Proyecto de Vercel **`tienda-sotec`** (equipo asistenteti) → Settings → **Environment Variables**,
entorno **Production**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clave `anon` (o *publishable*) del paso 1 |

- **No** definas `NEXT_PUBLIC_TIENDA_PANEL_DEMO` en Production (solo sirve para abrir el panel de
  demostración en local o en previews sin base de datos; con Supabase no se usa).
- *Preview*: no pongas estas variables en Preview salvo que quieras que los previews escriban en la
  misma base de producción. Si hace falta, crea un segundo proyecto Supabase de pruebas.
- Las variables `NEXT_PUBLIC_…` se incrustan al compilar: después de guardarlas, **Deployments →
  último de Production → Redeploy** (sin caché de build).

Para volver al modo demostración: borrar las dos variables y redesplegar (el panel vuelve a quedar
cerrado; los datos siguen en Supabase).

## 6. Cargar el catálogo

Entrar a <https://sotecse.com/tienda/admin> con el usuario de Magno:

1. **Categorías**: ya están las 8 base (con su foto). Ajustar nombres, ícono, orden o foto; desactivar
   las que no se usen. No se puede borrar una categoría que tenga productos.
2. **Marcas**: crear las marcas reales; el logo es opcional.
3. **Productos y servicios**: «Nuevo producto» / «Nuevo servicio». Las fotos se comprimen en el
   navegador (WebP, máx. 1200 px y 350 KB, hasta 6 por producto) y se guardan en Storage. En servicios
   el precio es «Desde» y no suma al total.
4. **Banners y promos**: imágenes horizontales sin texto (el texto se escribe en el formulario).
5. **Configuración**: números de WhatsApp de hogar y de empresas y el mensaje inicial. Hoy ambos
   quedan en `573104696060` (el mismo de la landing) hasta tener los números definitivos.

El catálogo de ejemplo del modo demostración **no** se carga en Supabase. Al cambiar o quitar una
foto (o borrar un producto, banner, marca o categoría) la imagen anterior se borra de Storage.

## 7. Checklist de verificación post-conexión

En una ventana de incógnito, salvo donde se indica:

- [ ] `https://sotecse.com/tienda` carga sin errores y muestra las categorías base.
- [ ] El enlace «Administrar tienda» aparece en el encabezado y el pie.
- [ ] `/tienda/admin` pide correo y contraseña (sin aviso de «modo demostración»).
- [ ] Una contraseña incorrecta muestra «Correo o contraseña incorrectos.».
- [ ] Magno entra y ve el Resumen con su correo; al recargar sigue dentro.
- [ ] Crear una marca con logo, un producto con 2 fotos y oferta, un servicio y un banner: todo
      aparece en la tienda (otra ventana de incógnito) y las fotos cargan desde
      `https://<ref>.supabase.co/storage/v1/object/public/productos/…`.
- [ ] Hacer un pedido de prueba desde incógnito: abre WhatsApp con el código `T-XXXXXX` y el total.
- [ ] El pedido aparece en Panel → Pedidos y se le puede cambiar el estado.
- [ ] «¿Olvidaste tu contraseña?» envía el correo en español y el enlace abre «Contraseña»
      (requiere el paso 3.4).
- [ ] Seguridad, desde una terminal (reemplazar `<ref>` y `<anon>`):

  ```bash
  # Debe responder [] (el visitante nunca lee pedidos)
  curl -s "https://<ref>.supabase.co/rest/v1/pedidos?select=*" -H "apikey: <anon>" -H "Authorization: Bearer <anon>"
  # Debe responder 401 (el visitante no escribe el catálogo)
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "https://<ref>.supabase.co/rest/v1/productos" \
    -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -H "Content-Type: application/json" \
    -d '{"id":"prd-x","nombre":"Prueba","categoria_id":"cat-redes"}'
  # Debe responder 4xx (registro público cerrado)
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "https://<ref>.supabase.co/auth/v1/signup" \
    -H "apikey: <anon>" -H "Content-Type: application/json" -d '{"email":"x@ejemplo.com","password":"ClaveLarga123!"}'
  ```

- [ ] Borrar los datos de prueba desde el panel (producto, servicio, banner, marca) y, en SQL Editor,
      el pedido de prueba: `delete from public.pedidos where cliente->>'nombre' = '<nombre usado>';`
- [ ] Actualizar la ficha del proyecto en la base de conocimiento (proyecto Supabase, ref, región,
      dónde quedó la database password, variables puestas en Vercel, fecha).

## 8. Probar en local contra un Supabase real (opcional)

Requiere el [Supabase CLI](https://supabase.com/docs/guides/cli) y Docker o Podman.

```bash
# Con Podman: podman system service --time=0 unix:///tmp/podman.sock &  y  export DOCKER_HOST=unix:///tmp/podman.sock
bash scripts/probar-supabase.sh          # levanta Supabase local, aplica migraciones, crea admin@tienda.local y vendedor@tienda.local
set -a; . ./.env.supabase.local; set +a  # variables (las claves de prueba quedan solo en ese archivo, ignorado por git)
npm run build && npm start               # http://localhost:3300/tienda en modo Supabase
npm run test:e2e:supabase                # e2e completo en modo Supabase (correos de prueba en http://127.0.0.1:54324)
bash scripts/probar-supabase.sh parar
```

`supabase/config.toml` replica la configuración de producción (registro cerrado, correo activo,
plantilla de recuperación en español) para que la prueba local se comporte igual.
