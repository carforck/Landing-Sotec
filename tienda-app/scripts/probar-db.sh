#!/usr/bin/env bash
# Prueba la migración en un PostgreSQL 16 desechable (Podman o Docker) con un stub de Supabase.
set -euo pipefail
cd "$(dirname "$0")/.."
RT=$(command -v podman || command -v docker)
NOMBRE=tienda-sotec-pg-prueba
$RT rm -f "$NOMBRE" >/dev/null 2>&1 || true
$RT run -d --name "$NOMBRE" -e POSTGRES_PASSWORD=dev docker.io/library/postgres:16-alpine >/dev/null
trap '$RT rm -f "$NOMBRE" >/dev/null 2>&1' EXIT
until $RT exec "$NOMBRE" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 1
correr() { $RT exec -i "$NOMBRE" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres < "$1"; }
correr supabase/tests/00_stub.sql
for m in supabase/migrations/*.sql; do echo "→ $m"; correr "$m"; done
echo "→ pruebas"
correr supabase/tests/10_rls.sql
