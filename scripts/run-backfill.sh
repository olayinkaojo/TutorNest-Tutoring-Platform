#!/usr/bin/env bash
# One-time backfill for the conversation/message/booking secondary indices
# added in commit 1d5f171. Safe to run more than once. Run this once, from
# your own machine, after the "Deploy Edge function" GitHub Action has
# finished — it asks for your own admin login locally and never sends your
# password anywhere but Supabase's own auth endpoint.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env.local; set +a
SUPA_URL="https://${VITE_SUPABASE_PROJECT_ID}.supabase.co"
ANON="$VITE_SUPABASE_ANON_KEY"

read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password: " ADMIN_PASSWORD
echo

TOKEN=$(curl -s -X POST "$SUPA_URL/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" -H "apikey: $ANON" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))")

if [ -z "$TOKEN" ]; then
  echo "Login failed — check the email/password and try again."
  exit 1
fi

echo
echo "=== Backfilling conversation/message indices ==="
curl -s -X POST "$SUPA_URL/functions/v1/make-server-cbd74580/admin/backfill-conversation-indices" \
  -H "Authorization: Bearer $TOKEN" -H "apikey: $ANON" | python3 -m json.tool

echo
echo "=== Backfilling booking index ==="
curl -s -X POST "$SUPA_URL/functions/v1/make-server-cbd74580/admin/backfill-booking-index" \
  -H "Authorization: Bearer $TOKEN" -H "apikey: $ANON" | python3 -m json.tool

echo
echo "Done. Both are safe to re-run if anything above shows an error you want to retry."
