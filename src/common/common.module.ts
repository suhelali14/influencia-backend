import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Tenant } from './entities/tenant.entity';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { RateLimitMiddleware, AuthRateLimitMiddleware } from './middleware/rate-limit.middleware';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    RedisModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    RateLimitMiddleware,
    AuthRateLimitMiddleware,
  ],
  exports: [TypeOrmModule, RedisModule, RateLimitMiddleware, AuthRateLimitMiddleware],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request logger to all routes
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
    
    // Apply rate limiting to all routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
    
    // Apply stricter rate limiting to auth routes
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes('auth/login', 'auth/register');
  }
}
