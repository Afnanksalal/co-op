# Architecture

Co-Op is split into a cloud license plane and a local desktop data plane.

## Planes

Cloud license plane:

- Authenticates cloud users through Supabase sessions.
- Protects admin license generation and listing.
- Stores license, activation, and license event records.
- Accepts desktop activation, heartbeat, and deactivation calls.
- Enforces license status, expiry, device limits, and offline grace windows.

Local desktop data plane:

- Stores activation state in the Tauri app data directory.
- Stores model routing settings locally.
- Runs business workflows through Ollama or a customer-configured OpenAI-compatible provider.
- Stores recent workflow run history locally.
- Sends the cloud backend only license and heartbeat data.

## Request Flow

1. An admin creates a license from `/admin/licenses`.
2. The backend stores only a keyed hash of the generated license key and returns the raw key once.
3. The customer installs Co-Op Desktop and activates with email, license key, and device name.
4. The desktop runtime sends a hashed machine fingerprint and install ID to `POST /api/v1/licenses/activate`.
5. The backend returns an activation token and entitlement payload.
6. The desktop runtime stores activation state locally.
7. Heartbeats call `POST /api/v1/licenses/heartbeat` to refresh entitlement and offline grace.
8. Business workflows run locally after entitlement is checked.

## Backend Components

- `main.ts` configures HTTP security, CORS, validation, and the `/api/v1` prefix.
- `HealthModule` exposes health checks.
- `LicensesModule` exposes admin and desktop license endpoints.
- `AdminGuard` requires a Supabase user with `app_metadata.role = "admin"`.
- `license-crypto.ts` generates license keys and hashes license keys and activation tokens.
- Drizzle schema files define `licenses`, `license_activations`, and `license_events`.

## Frontend Components

- `/` presents the local-first desktop product.
- `/login` handles cloud account sign-in.
- `/download` gives customers the software download entry point.
- `/activate` is the desktop activation screen.
- `/local` is the desktop operations console.
- `/admin/licenses` lets admins generate and inspect licenses.
- `src/lib/api/client.ts` talks to the cloud license API.
- `src/lib/desktop/runtime.ts` wraps Tauri command calls.

## Desktop Runtime Components

Tauri commands:

- `get_activation_state`
- `activate_license`
- `heartbeat_license`
- `clear_activation`
- `save_model_settings`
- `run_business_workflow`
- `get_machine_fingerprint`

The runtime validates URLs, providers, model names, token budgets, workflow types, and objective length before making network calls.

## Storage Boundaries

Cloud database:

- License metadata
- License hashes
- Activation token hashes
- Device activation rows
- License event audit rows

Desktop app data:

- Activation token
- Entitlement snapshot
- Machine fingerprint hash
- Provider settings
- Bring-your-own-key provider API key
- Recent workflow run history

## Scaling Model

The cloud API scales horizontally because it is stateless outside PostgreSQL/Supabase and request validation. License activation depends on database uniqueness constraints for active device binding. Workflow load scales with the customer's desktop machine or selected provider, not with the Co-Op cloud backend.

## Security Boundaries

- License keys are shown once and stored only as keyed hashes.
- Activation tokens are stored only as hashes in the backend.
- Machine fingerprints are hashed before leaving the desktop runtime.
- Public HTTP provider URLs are rejected outside localhost and private networks.
- Production backend startup fails without a strong `LICENSE_KEY_PEPPER`.
- Customer business prompts and outputs do not enter the cloud license plane.
