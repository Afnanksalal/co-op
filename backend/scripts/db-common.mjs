import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function productionSslConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return false;

  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

export function createPool() {
  return new Pool({
    connectionString: requiredEnv('DATABASE_URL'),
    ssl: productionSslConfig(),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function requireLicensePepper() {
  const pepper = process.env.LICENSE_KEY_PEPPER?.trim();
  if (process.env.NODE_ENV === 'production' && (!pepper || pepper.length < 32)) {
    throw new Error('LICENSE_KEY_PEPPER must be at least 32 characters in production');
  }
  return pepper || 'co-op-development-license-pepper';
}
