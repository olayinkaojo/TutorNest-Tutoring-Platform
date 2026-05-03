# TutorNest architecture (concise)

## Frontend

- **Vite + React** SPA under `src/`, routed with React Router.
- **Supabase Auth** in the browser; API calls to the bundled **Edge Function** use `edgeFetch` / `edgeFunctionUrl` in `src/utils/supabase-edge-fetch.ts` (JWT + optional `apikey`, with retries on transient failures).

## Backend (Supabase Edge)

- Single Hono app in `supabase/functions/make-server-cbd74580/index.ts`, mounted at `/functions/v1/make-server-cbd74580`.
- Short paths (e.g. `/profile`) are rewritten to `/make-server-cbd74580/profile`.
- **Persistence**: Postgres-backed string KV (`kv_store.tsx`) and Supabase JS client (service role / user JWT) per route modules under the same folder.
- **CORS**: `ALLOWED_ORIGINS` (comma-separated) refines `Access-Control-Allow-Origin`; when unset, `*` is used. Align preflight (OPTIONS) and real responses.
- **Observability**: JSON request logs (`method`, `path`, `status`, `durationMs`, `requestId`), `X-Request-Id` on responses, `GET .../health` for load checks (`version` from `DEPLOY_SHA` / `GIT_SHA` when set).

## Environment

- **Vite**: `VITE_SUPABASE_*` in `.env.local` (see `.env.example`). Optional monitoring vars in `.env.monitoring.example` (e.g. `VITE_SENTRY_DSN`; client init in `src/utils/sentry-init.ts`).
- **Edge secrets**: set in Supabase dashboard / CLI — e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, `ALLOWED_ORIGINS`, optional `DEPLOY_SHA` for health/version.

## Deploy & production hardening (GitHub Actions)

Workflow: [`.github/workflows/deploy-edge.yml`](.github/workflows/deploy-edge.yml) deploys `make-server-cbd74580` and keeps **`DEPLOY_SHA`** aligned with the commit GitHub built (so **`GET .../health`** returns a real `version`).

1. **Supabase CLI token** — Account → Access Tokens; add repo secret **`SUPABASE_ACCESS_TOKEN`**.
2. **Project ref** — Dashboard → Project Settings → General → **Reference ID**; add repo secret **`SUPABASE_PROJECT_REF`**.
3. **Turn on the workflow** — Add repo variable **`SUPABASE_EDGE_DEPLOY`** = `true` (avoids failed runs until secrets exist). **`workflow_dispatch`** still runs from the Actions tab even if this var is unset.
4. **`ALLOWED_ORIGINS` (CORS)** — Add repo variable **`ALLOWED_ORIGINS`** with comma-separated front-end origins, e.g. `https://app.example.com,https://www.example.com,http://localhost:5173`. Omit to leave whatever is already set in Supabase. **Include `http://localhost:5173`** (or your Vite port) if developers call production Edge from local dev; otherwise the browser will block CORS when `ALLOWED_ORIGINS` is set.

On each run, the workflow sets **`DEPLOY_SHA=${{ github.sha }}`** and, when **`ALLOWED_ORIGINS`** is non-empty, overwrites that secret on the project, then deploys the function.
