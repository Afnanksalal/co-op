import { createHmac, randomBytes } from 'node:crypto';

const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LICENSE_BODY_LENGTH = 24;
const LICENSE_GROUP_SIZE = 4;

export function normalizeLicenseKey(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatLicenseKey(body = randomLicenseBody()) {
  const normalized = normalizeLicenseKey(body).replace(/^COOP/, '');
  if (normalized.length !== LICENSE_BODY_LENGTH) {
    throw new Error(`License body must be ${LICENSE_BODY_LENGTH} characters`);
  }

  const groups = normalized.match(new RegExp(`.{1,${LICENSE_GROUP_SIZE}}`, 'g')) ?? [];
  return `COOP-${groups.join('-')}`;
}

export function canonicalLicenseKey(value) {
  const normalized = normalizeLicenseKey(value);
  if (!/^COOP[A-Z0-9]{24}$/.test(normalized)) {
    throw new Error('License key is malformed');
  }

  return formatLicenseKey(normalized.replace(/^COOP/, ''));
}

export function generateLicenseKey() {
  return formatLicenseKey(randomLicenseBody());
}

export function licensePrefix(value) {
  const [brand, first, second] = canonicalLicenseKey(value).split('-');
  return `${brand}-${first}-${second}-****`;
}

export function hashSecret(value, pepper) {
  return createHmac('sha256', pepper).update(value.trim()).digest('hex');
}

function randomLicenseBody() {
  const bytes = randomBytes(LICENSE_BODY_LENGTH);
  let body = '';

  for (const byte of bytes) {
    body += LICENSE_ALPHABET[byte % LICENSE_ALPHABET.length];
  }

  return body;
}
