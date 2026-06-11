# Co-Op Frontend

Next.js web shell and Tauri desktop UI for Co-Op.

## Screens

- `/` local-first product landing page
- `/login` cloud account login
- `/download` software download flow
- `/activate` desktop license activation
- `/desktop` installed desktop shell
- `/admin/licenses` admin license generator

## Commands

```bash
npm install
npm run typecheck
npm run build
npm run build:tauri
npm audit --audit-level=low
npm run audit:rust
```

## Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

The Tauri export temporarily removes server-only Next files and builds a static `out/` directory.

Desktop activation uses the cloud URL embedded at build time. Set `COOP_CLOUD_URL` for desktop releases, or keep `NEXT_PUBLIC_API_URL` pointed at the deployed backend; `/api/v1` is stripped before the URL is baked into the Tauri binary.
