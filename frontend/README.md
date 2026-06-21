# Co-Op Frontend

This package contains the hosted Next.js web app and the React UI rendered inside the Tauri desktop app.

## Responsibilities

Hosted web:

- Public landing page.
- Login and signup.
- Account center.
- Software download page.
- Admin license console.
- Legal and trust pages.
- SEO metadata, sitemap, robots, and `llms.txt`.

Installed desktop UI:

- Local onboarding.
- Today dashboard.
- Ask.
- Plans.
- Company profile.
- Files.
- Source-backed research.
- Advisor chat progress feedback.
- Customers.
- Money & Tools.
- Settings.
- License.

Hosted production builds must not expose the desktop shell. `/desktop` and `/local` are blocked in hosted production mode and are available only for local development or the Tauri static export.

## Routes

| Route             | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `/`               | Public product page.                              |
| `/login`          | Cloud account login.                              |
| `/signup`         | Cloud account signup.                             |
| `/account`        | Signed-in account center and activation key flow. |
| `/download`       | Software download entry point.                    |
| `/admin/licenses` | Admin license console.                            |
| `/privacy`        | Privacy policy.                                   |
| `/terms`          | Terms.                                            |
| `/security`       | Security page.                                    |
| `/cookies`        | Cookie policy.                                    |
| `/desktop`        | Desktop shell for Tauri/local development only.   |

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run build:tauri
npm audit --audit-level=low
npm run audit:rust
npm run tauri:build
```

Command notes:

- `npm run build` builds the hosted Next.js app.
- `npm run build:tauri` creates the static export used by Tauri.
- `npm run tauri:build` builds desktop installers.
- `npm run audit:rust` runs the Rust dependency audit wrapper.

## Environment

| Variable                        | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase browser auth URL.                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser anon key.                     |
| `NEXT_PUBLIC_API_URL`           | Backend API URL, normally ending in `/api/v1`. |
| `NEXT_PUBLIC_APP_URL`           | Hosted web app URL.                            |
| `COOP_CLOUD_URL`                | Optional explicit desktop cloud origin.        |

`frontend/src-tauri/build.rs` embeds `COOP_CLOUD_URL` when set. If it is not set, the desktop build reads `NEXT_PUBLIC_API_URL` and strips `/api/v1`. The activation screen should ask business users only for the activation key.

The installed desktop app requires a saved web search key before source-backed market, competitor, legal, customer, pricing, investor, risk, or prospect-discovery work can run. The key is stored on the user's computer by the Tauri runtime and is not sent to the Co-Op cloud license backend.

Advisor chat shows safe progress feedback while work is running: context loading, file checks, memory lookup, source search, review, and local save. It does not expose hidden chain-of-thought, raw prompts, provider keys, or full retrieved documents.

Competitor work does not rely on one broad web query. The runtime builds a small set of business-specific searches from the saved company profile, owner question, offering, target buyers, and operating region, then filters unrelated sources before generating the answer.

## Code Map

- `src/app/` - web routes, desktop route, metadata, sitemap.
- `src/components/marketing/` - landing page sections.
- `src/components/legal/` - legal page layout helpers.
- `src/components/desktop/` - installed desktop UI.
- `src/lib/api/` - cloud API client.
- `src/lib/desktop/runtime/` - typed React-to-Tauri command boundary.
- `src-tauri/` - Rust desktop runtime.

## Cleanup

Before committing, remove transient output unless a maintainer explicitly wants a release artifact committed:

```powershell
Remove-Item -Recurse -Force .next,out,out-tauri -ErrorAction SilentlyContinue
Remove-Item -Force *.log,*.err.log,*.tsbuildinfo -ErrorAction SilentlyContinue
```
