#!/usr/bin/env bash
# Levanta un Supabase LOCAL real (Supabase CLI + Docker/Podman), aplica las migraciones y crea dos
# usuarios de prueba: uno con rol admin y otro sin rol. Escribe .env.supabase.local (ignorado por git)
# con las variables para compilar la app y correr tests/e2e/tienda-supabase.cjs.
#
#   bash scripts/probar-supabase.sh          # preparar (o reiniciar la base: borra los datos locales)
#   set -a; . ./.env.supabase.local; set +a
#   npm run build && npm start               # la app queda en modo Supabase contra el local
#   npm run test:e2e:supabase                # BASE=http://localhost:3300 por defecto
#   bash scripts/probar-supabase.sh parar    # apagar los contenedores
#
# Con Podman: exportar DOCKER_HOST=unix:///ruta/al/podman.sock (podman system service).
# SUPABASE_BIN permite usar un binario del CLI fuera del PATH.
set -euo pipefail
cd "$(dirname "$0")/.."
SB="${SUPABASE_BIN:-supabase}"
command -v "$SB" >/dev/null || { echo "Falta el Supabase CLI (https://supabase.com/docs/guides/cli) o SUPABASE_BIN"; exit 1; }
# Servicios que la tienda no usa (ahorra memoria): base, Auth, REST, Storage, Kong y Mailpit (correos
# de prueba en http://127.0.0.1:54324, para «¿Olvidaste tu contraseña?»)
EXCLUIR="vector,logflare,imgproxy,supavisor,postgres-meta,studio,realtime,edge-runtime"

# (con Podman el primer stop a veces falla al quitar la red: se reintenta)
if [ "${1:-}" = "parar" ]; then "$SB" stop --no-backup || "$SB" stop --no-backup; exit 0; fi

"$SB" status >/dev/null 2>&1 || "$SB" start -x "$EXCLUIR"
"$SB" db reset --no-seed   # aplica supabase/migrations/* desde cero
until "$SB" status >/dev/null 2>&1; do sleep 1; done

eval "$("$SB" status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
API="$API_URL"
until curl -sf "$API/auth/v1/health" -H "apikey: $ANON_KEY" >/dev/null; do sleep 1; done
until curl -sf "$API/rest/v1/configuracion?select=id" -H "apikey: $ANON_KEY" >/dev/null; do sleep 1; done

clave() { head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20; }
ADMIN_CORREO="admin@tienda.local"; ADMIN_CLAVE="$(clave)Aa1"
OTRO_CORREO="vendedor@tienda.local"; OTRO_CLAVE="$(clave)Aa1"
crear() {
  curl -sf -X POST "$API/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$2\",\"email_confirm\":true}" >/dev/null
}
crear "$ADMIN_CORREO" "$ADMIN_CLAVE"
crear "$OTRO_CORREO" "$OTRO_CLAVE"
# El rol admin se da en SQL, igual que en producción (ver SUPABASE.md)
CONT="$(${DOCKER:-$(command -v podman || command -v docker)} ps --format '{{.Names}}' | grep -E '^supabase_db_' | head -1)"
${DOCKER:-$(command -v podman || command -v docker)} exec -i "$CONT" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = '$ADMIN_CORREO');"

umask 077
cat > .env.supabase.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=$API
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_URL=$API
SUPABASE_ANON_KEY=$ANON_KEY
MAILPIT_URL=http://127.0.0.1:54324
ADMIN_CORREO=$ADMIN_CORREO
ADMIN_CLAVE=$ADMIN_CLAVE
OTRO_CORREO=$OTRO_CORREO
OTRO_CLAVE=$OTRO_CLAVE
ENV
echo "Supabase local listo en $API (admin: $ADMIN_CORREO; claves en .env.supabase.local)"
