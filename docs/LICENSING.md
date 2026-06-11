# Licensing

Co-Op uses a cloud license plane with local desktop activation state. This matches the Autodesk-style model: customers sign in and pay in the cloud, then run installed software locally while the app periodically checks entitlement.

## License Records

The backend stores:

- `customer_email`
- keyed `license_hash`
- display-safe `license_prefix`
- `plan`
- `status`
- `seats`
- `max_devices`
- optional `expires_at`
- metadata

The raw license key is returned only at creation time. It is never persisted by the backend.

## Activation Records

Each activation stores:

- license ID
- install ID
- machine fingerprint hash
- activation token hash
- device name
- app version
- status
- activation and heartbeat timestamps

A unique partial index allows one active activation per license and machine fingerprint. Device limits are enforced by counting active activations for the license.

## License Lifecycle

1. Admin creates a license with email, plan, seat count, device limit, expiry, and metadata.
2. Backend generates a license key and stores a keyed hash.
3. Desktop sends email, license key, install ID, device name, app version, and machine fingerprint hash.
4. Backend validates license status, expiry, and device capacity.
5. Backend returns an activation token and entitlement.
6. Desktop stores the activation token and entitlement locally.
7. Desktop sends heartbeats with activation token and machine fingerprint hash.
8. Backend updates `last_seen_at` and returns a refreshed entitlement.
9. Desktop can clear local activation, and the backend deactivation endpoint can mark the activation inactive.

## Offline Grace

`LICENSE_OFFLINE_GRACE_DAYS` controls how long an active desktop entitlement remains usable after the latest successful heartbeat. The desktop runtime refuses workflow execution when status is not active, the license is expired, or offline grace has elapsed.

## Admin Access

Admin license endpoints require a valid Supabase session whose user metadata includes `app_metadata.role = "admin"`.

Admin endpoints:

- `GET /api/v1/licenses`
- `POST /api/v1/licenses`

Desktop endpoints:

- `POST /api/v1/licenses/activate`
- `POST /api/v1/licenses/heartbeat`
- `POST /api/v1/licenses/deactivate`

## Payment Integration Boundary

Payment providers should update license status, expiry, plan, seats, max devices, and metadata through a trusted server-side path. Payment webhooks must not expose raw license keys or activation tokens.

## Rotation And Recovery

`LICENSE_KEY_PEPPER` is part of the keyed license hash. Rotating it invalidates existing hashes unless a migration supports dual verification. Treat rotation as a planned security event with customer support coverage.

Lost license keys should be handled by issuing a replacement license and revoking the old one. Do not build a raw-key recovery path.
