import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../../common/redis/session.service';

/**
 * Hybrid auth guard that supports both JWT tokens and Session IDs
 * Prefers Session ID if provided, falls back to JWT
 */
@Injectable()
export class HybridAuthGuard implements CanActivate {
  private readonly logger = new Logger(HybridAuthGuard.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Try session-based auth first
    const sessionId = this.extractSessionId(request);
    if (sessionId) {
      try {
        const session = await this.sessionService.validateSession(sessionId);
        request.session = session;
        request.user = {
          userId: session.userId,
          email: session.email,
          role: session.role,
          tenantId: session.tenantId,
          sessionId: session.sessionId,
        };
        return true;
      } catch (error) {
        this.logger.debug(`Session auth failed, trying JWT: ${error.message}`);
      }
    }

    // Fall back to JWT auth
    const token = this.extractJwt(request);
    if (!token) {
      throw new UnauthorizedException('No authentication credentials provided');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenant_id,
      };
      return true;
    } catch (error) {
      this.logger.warn(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractSessionId(request: any): string | null {
    const sessionHeader = request.headers['x-session-id'];
    if (sessionHeader) {
      return sessionHeader;
    }

    const cookies = request.cookies;
    if (cookies?.sessionId) {
      return cookies.sessionId;
    }

    return null;
  }

  private extractJwt(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
