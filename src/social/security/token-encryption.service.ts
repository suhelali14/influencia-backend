import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Token Encryption Service
 * Handles secure encryption and decryption of OAuth tokens using AES-256-GCM
 */
@Injectable()
export class TokenEncryptionService {
  private readonly logger = new Logger(TokenEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly tagLength = 16; // 128 bits
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('TOKEN_ENCRYPTION_KEY');
    
    if (!key) {
      // Generate a random key for development
      this.logger.warn('TOKEN_ENCRYPTION_KEY not set, generating random key (NOT FOR PRODUCTION)');
      this.encryptionKey = crypto.randomBytes(this.keyLength);
    } else {
      // Use provided key, hash it to ensure correct length
      this.encryptionKey = crypto.scryptSync(key, 'influencia_salt', this.keyLength);
    }
  }

  /**
   * Encrypt a token string
   * @param plaintext - The token to encrypt
   * @returns Encrypted string in format: iv:authTag:encryptedData (all base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();

      // Combine iv:authTag:encryptedData
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt an encrypted token string
   * @param encryptedData - The encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted token string
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, authTagBase64, encrypted] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Check if a string is encrypted (has the expected format)
   */
  isEncrypted(data: string): boolean {
    if (!data) return false;
    const parts = data.split(':');
    return parts.length === 3;
  }

  /**
   * Generate a secure random state for OAuth CSRF protection
   */
  generateOAuthState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Hash a state for storage/comparison
   */
  hashState(state: string): string {
    return crypto.createHash('sha256').update(state).digest('base64url');
  }
}
