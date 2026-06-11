import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LICENSE_BODY_LENGTH = 24;
const LICENSE_GROUP_SIZE = 4;
const ACTIVATION_TOKEN_BYTES = 32;

export function normalizeLicenseKey(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatLicenseKey(body = randomLicenseBody()): string {
  const normalized = normalizeLicenseKey(body).replace(/^COOP/, '');
  if (normalized.length !== LICENSE_BODY_LENGTH) {
    throw new Error(`License body must be ${String(LICENSE_BODY_LENGTH)} characters`);
  }

  const groups = normalized.match(new RegExp(`.{1,${String(LICENSE_GROUP_SIZE)}}`, 'g')) ?? [];
  return `COOP-${groups.join('-')}`;
}

export function generateLicenseKey(): string {
  return formatLicenseKey(randomLicenseBody());
}

export function isValidLicenseKey(value: string): boolean {
  const normalized = normalizeLicenseKey(value);
  return /^COOP[A-Z0-9]{24}$/.test(normalized);
}

export function licensePrefix(value: string): string {
  const formatted = isValidLicenseKey(value) ? formatLicenseKey(normalizeLicenseKey(value).replace(/^COOP/, '')) : value;
  const [brand, first, second] = formatted.split('-');
  return `${brand}-${first}-${second}-****`;
}

export function generateActivationToken(): string {
  return `coop_act_${randomBytes(ACTIVATION_TOKEN_BYTES).toString('base64url')}`;
}

export function hashSecret(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value.trim()).digest('hex');
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function randomLicenseBody(): string {
  const bytes = randomBytes(LICENSE_BODY_LENGTH);
  let body = '';

  for (const byte of bytes) {
    body += LICENSE_ALPHABET[byte % LICENSE_ALPHABET.length];
  }

  return body;
}
