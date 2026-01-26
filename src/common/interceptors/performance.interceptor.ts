import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        // Log slow requests (> 1 second)
        if (duration > 1000) {
          this.logger.warn(`🐌 Slow request: ${method} ${url} - ${duration}ms`);
        }
        
        // Log very slow requests (> 5 seconds)
        if (duration > 5000) {
          this.logger.error(`🔴 Very slow request: ${method} ${url} - ${duration}ms`);
        }
      }),
    );
  }
}
