---
name: Production domain
description: tutornest.org is the live production domain — use this everywhere, not tutornest.com or the Vercel URL
type: project
---

tutornest.org is the active production domain.

**Why:** User confirmed the domain is live. All email links, redirect URLs, and fallback hardcoded URLs should point to https://tutornest.org.

**How to apply:** When writing any URL fallback (e.g. `Deno.env.get('VITE_APP_URL') || 'https://tutornest.org'`), always use `tutornest.org`. The `VITE_APP_URL` Supabase secret should be set to `https://tutornest.org`. The old `tutornest.com` references are stale and should be updated on sight.
