import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * AES-256-GCM encryption service for sensitive data at rest.
 * Used for webhook secrets, API tokens, etc.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer | null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (encryptionKey) {
      // Derive a 32-byte key from the provided key using SHA-256
      this.key = createHash('sha256').update(encryptionKey).digest();
      this.isConfigured = true;
      this.logger.log('Encryption service initialized with AES-256-GCM');
    } else {
      this.key = null;
      this.isConfigured = false;
      this.logger.warn('ENCRYPTION_KEY not set - sensitive data will be stored in plaintext');
    }
  }

  /**
   * Check if encryption is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Encrypt a string value.
   * Returns format: iv:authTag:ciphertext (all hex encoded)
   */
  encrypt(plaintext: string): string {
    if (!this.key) {
      // Return plaintext if encryption not configured (dev mode)
      return plaintext;
    }

    try {
      const iv = randomBytes(12); // 96-bit IV for GCM
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:ciphertext
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a string value.
   * Expects format: iv:authTag:ciphertext (all hex encoded)
   */
  decrypt(ciphertext: string): string {
    if (!this.key) {
      // Return as-is if encryption not configured (assume plaintext)
      return ciphertext;
    }

    // Check if this looks like encrypted data (has the iv:authTag:ciphertext format)
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // Not encrypted format - return as-is (legacy plaintext data)
      return ciphertext;
    }

    try {
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed - data may be corrupted or key changed', error);
      // Return original value if decryption fails (might be legacy plaintext)
      return ciphertext;
    }
  }

  /**
   * Check if a value appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    if (parts.length !== 3) return false;

    // Check if parts look like hex strings of expected lengths
    const [iv, authTag] = parts;
    return iv.length === 24 && authTag.length === 32; // 12 bytes = 24 hex, 16 bytes = 32 hex
  }
}
