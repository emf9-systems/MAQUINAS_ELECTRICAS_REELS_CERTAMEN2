#!/usr/bin/env bash
# Prueba schema.sql + seed.sql + test.sql en un Postgres 16 temporal.
set -euo pipefail
BIN=/usr/lib/postgresql/16/bin
DIR=$(mktemp -d); trap 'su postgres -c "$BIN/pg_ctl -D $DIR/data stop -m fast" >/dev/null 2>&1 || true; rm -rf $DIR' EXIT
chown postgres "$DIR"
su postgres -c "$BIN/initdb -D $DIR/data -A trust" >/dev/null
su postgres -c "$BIN/pg_ctl -D $DIR/data -o '-k $DIR -p 5499 -c listen_addresses=' -l $DIR/log start -w" >/dev/null
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
P="psql -h $DIR -p 5499 -U postgres -v ON_ERROR_STOP=1 -q -o /dev/null"
$P -f "$ROOT/tests/sql/supabase-stubs.sql"
$P -f "$ROOT/supabase/schema.sql"
$P -f "$ROOT/supabase/schema.sql"   # debe poder re-ejecutarse
$P -f "$ROOT/supabase/seed.sql"
$P -f "$ROOT/tests/sql/test.sql"
echo "SQL OK"
