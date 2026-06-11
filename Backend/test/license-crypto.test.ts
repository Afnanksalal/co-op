import { test } from 'node:test';
import assert = require('node:assert/strict');
import {
  formatLicenseKey,
  generateActivationToken,
  generateLicenseKey,
  hashSecret,
  isValidLicenseKey,
  licensePrefix,
  normalizeLicenseKey,
  timingSafeEqualString,
} from '../src/modules/licenses/license-crypto';

test('generateLicenseKey returns a formatted Co-Op license key', () => {
  const key = generateLicenseKey();

  assert.match(key, /^COOP-[A-Z0-9]{4}(-[A-Z0-9]{4}){5}$/);
  assert.equal(isValidLicenseKey(key), true);
});

test('normalizeLicenseKey accepts pasted keys with spaces and hyphens', () => {
  const normalized = normalizeLicenseKey(' coop-abcd efgh-jklm npqr-stuv-wxyz ');

  assert.equal(normalized, 'COOPABCDEFGHJKLMNPQRSTUVWXYZ');
});

test('formatLicenseKey rejects malformed license bodies', () => {
  assert.throws(() => formatLicenseKey('too-short'), /License body/);
});

test('license hashes depend on the configured pepper', () => {
  const key = generateLicenseKey();
  const first = hashSecret(key, 'pepper-one');
  const second = hashSecret(key, 'pepper-two');

  assert.notEqual(first, second);
  assert.equal(first.length, 64);
});

test('timingSafeEqualString only returns true for exact hashes', () => {
  const first = hashSecret('secret', 'pepper');
  const second = hashSecret('secret', 'pepper');
  const third = hashSecret('other', 'pepper');

  assert.equal(timingSafeEqualString(first, second), true);
  assert.equal(timingSafeEqualString(first, third), false);
  assert.equal(timingSafeEqualString(first, 'short'), false);
});

test('activation tokens are opaque and do not contain license material', () => {
  const token = generateActivationToken();

  assert.match(token, /^coop_act_[A-Za-z0-9_-]+$/);
  assert.ok(token.length >= 40);
});

test('licensePrefix masks generated keys for operator views', () => {
  const key = 'COOP-ABCD-EFGH-JKLM-NPQR-STUV-WXYZ';

  assert.equal(licensePrefix(key), 'COOP-ABCD-EFGH-****');
});
