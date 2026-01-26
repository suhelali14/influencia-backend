import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import * as crypto from 'crypto';

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  createdAt: number;
  lastAccessedAt: number;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface CreateSessionOptions {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly SESSION_TTL: number; // in seconds
  private readonly MAX_SESSIONS_PER_USER = 5;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Default 7 days in seconds
    this.SESSION_TTL = this.configService.get('SESSION_TTL', 7 * 24 * 60 * 60);
  }

  /**
   * Generate a cryptographically secure session ID
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${timestamp}-${randomBytes}`;
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: SessionData = {
      sessionId,
      userId: options.userId,
      email: options.email,
      role: options.role,
      tenantId: options.tenantId,
      createdAt: now,
      lastAccessedAt: now,
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
      metadata: options.metadata,
    };

    // Store session
    await this.redisService.setJson(
      this.getSessionKey(sessionId),
      session,
      this.SESSION_TTL,
    );

    // Track user's sessions
    await this.redisService.sAdd(
      this.getUserSessionsKey(options.userId),
      sessionId,
    );
    await this.redisService.expire(
      this.getUserSessionsKey(options.userId),
      this.SESSION_TTL,
    );

    // Cleanup old sessions if exceeds max
    await this.cleanupOldSessions(options.userId);

    this.logger.log(`Session created for user ${options.userId}: ${sessionId.substring(0, 16)}...`);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.redisService.getJson<SessionData>(
      this.getSessionKey(sessionId),
    );

    if (!session) {
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    await this.redisService.setJson(
      this.getSessionKey(sessionId),
      session,
      this.SESSION_TTL,
    );

    return session;
  }

  /**
   * Validate session and return session data
   */
  async validateSession(sessionId: string): Promise<SessionData> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }

  /**
   * Invalidate/destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const session = await this.redisService.getJson<SessionData>(
      this.getSessionKey(sessionId),
    );

    if (session) {
      // Remove from user's session set
      await this.redisService.sRem(
        this.getUserSessionsKey(session.userId),
        sessionId,
      );
    }

    // Delete session
    const result = await this.redisService.del(this.getSessionKey(sessionId));
    
    this.logger.log(`Session destroyed: ${sessionId.substring(0, 16)}...`);
    return result > 0;
  }

  /**
   * Invalidate all sessions for a user (force logout everywhere)
   */
  async destroyAllUserSessions(userId: string): Promise<number> {
    const sessionIds = await this.getUserSessions(userId);
    let count = 0;

    for (const sessionId of sessionIds) {
      await this.redisService.del(this.getSessionKey(sessionId));
      count++;
    }

    await this.redisService.del(this.getUserSessionsKey(userId));

    this.logger.log(`Destroyed ${count} sessions for user ${userId}`);
    return count;
  }

  /**
   * Get all session IDs for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    return this.redisService.sMembers(this.getUserSessionsKey(userId));
  }

  /**
   * Get all active sessions with details for a user
   */
  async getUserSessionsWithDetails(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.getUserSessions(userId);
    const sessions: SessionData[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.redisService.getJson<SessionData>(
        this.getSessionKey(sessionId),
      );
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, additionalSeconds?: number): Promise<boolean> {
    const ttl = additionalSeconds || this.SESSION_TTL;
    return this.redisService.expire(this.getSessionKey(sessionId), ttl);
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>,
  ): Promise<boolean> {
    const session = await this.redisService.getJson<SessionData>(
      this.getSessionKey(sessionId),
    );

    if (!session) {
      return false;
    }

    session.metadata = { ...session.metadata, ...metadata };
    session.lastAccessedAt = Date.now();

    await this.redisService.setJson(
      this.getSessionKey(sessionId),
      session,
      this.SESSION_TTL,
    );

    return true;
  }

  /**
   * Cleanup old sessions when user exceeds max
   */
  private async cleanupOldSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessionsWithDetails(userId);

    if (sessions.length <= this.MAX_SESSIONS_PER_USER) {
      return;
    }

    // Sort by last accessed and remove oldest
    const sessionsToRemove = sessions
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
      .slice(0, sessions.length - this.MAX_SESSIONS_PER_USER);

    for (const session of sessionsToRemove) {
      await this.destroySession(session.sessionId);
    }

    this.logger.log(`Cleaned up ${sessionsToRemove.length} old sessions for user ${userId}`);
  }

  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.USER_SESSIONS_PREFIX}${userId}`;
  }
}
