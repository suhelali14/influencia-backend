import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OAuthState {
  state: string;
  creatorId: string;
  platform: string;
  createdAt: Date;
  redirectUrl: string;
}

/**
 * OAuth State Service
 * Manages OAuth state parameters for CSRF protection
 * Uses in-memory storage with TTL (for development)
 * TODO: Use Redis for production
 */
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private stateStore: Map<string, OAuthState> = new Map();
  private readonly STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private configService: ConfigService) {
    // Clean up expired states periodically
    setInterval(() => this.cleanupExpiredStates(), 60 * 1000); // Every minute
  }

  /**
   * Generate and store a new OAuth state
   */
  generateState(creatorId: string, platform: string, redirectUrl?: string): string {
    const state = this.generateRandomState();
    const appUrl = this.configService.get('FRONTEND_URL') || this.configService.get('APP_URL') || 'http://localhost:5173';
    
    this.stateStore.set(state, {
      state,
      creatorId,
      platform,
      createdAt: new Date(),
      redirectUrl: redirectUrl || `${appUrl}/creator/social-connect`,
    });

    this.logger.debug(`Generated OAuth state for ${platform} - Creator: ${creatorId}`);
    return state;
  }

  /**
   * Validate and consume a state (one-time use)
   */
  validateAndConsume(state: string): OAuthState | null {
    const storedState = this.stateStore.get(state);

    if (!storedState) {
      this.logger.warn('OAuth state not found or already consumed');
      return null;
    }

    // Check if expired
    const now = new Date();
    const elapsed = now.getTime() - storedState.createdAt.getTime();
    
    if (elapsed > this.STATE_TTL_MS) {
      this.logger.warn('OAuth state expired');
      this.stateStore.delete(state);
      return null;
    }

    // Consume (delete) the state
    this.stateStore.delete(state);
    this.logger.debug(`Consumed OAuth state for ${storedState.platform}`);
    
    return storedState;
  }

  /**
   * Check if state exists (without consuming)
   */
  exists(state: string): boolean {
    return this.stateStore.has(state);
  }

  /**
   * Generate a cryptographically secure random state
   */
  private generateRandomState(): string {
    const array = new Uint8Array(32);
    require('crypto').randomFillSync(array);
    return Buffer.from(array).toString('base64url');
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [state, data] of this.stateStore.entries()) {
      const elapsed = now.getTime() - data.createdAt.getTime();
      if (elapsed > this.STATE_TTL_MS) {
        this.stateStore.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired OAuth states`);
    }
  }
}
