import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SessionService, SessionData } from '../../common/redis/session.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionAuthGuard.name);

  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get session ID from header
    const sessionId = this.extractSessionId(request);
    
    if (!sessionId) {
      throw new UnauthorizedException('No session ID provided');
    }

    try {
      // Validate session
      const session = await this.sessionService.validateSession(sessionId);
      
      // Attach session data to request
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
      this.logger.warn(`Session validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private extractSessionId(request: any): string | null {
    // Check X-Session-ID header first
    const sessionHeader = request.headers['x-session-id'];
    if (sessionHeader) {
      return sessionHeader;
    }

    // Fallback to cookie
    const cookies = request.cookies;
    if (cookies?.sessionId) {
      return cookies.sessionId;
    }

    return null;
  }
}
