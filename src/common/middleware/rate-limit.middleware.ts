import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly config: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests, please try again later.',
  };

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const key = `ratelimit:${ip}`;

    try {
      const current = await this.redisService.incr(key);
      
      if (current === 1) {
        // First request, set expiration
        await this.redisService.expire(key, Math.ceil(this.config.windowMs / 1000));
      }

      const ttl = await this.redisService.ttl(key);
      
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + (ttl * 1000));

      if (current > this.config.maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: this.config.message,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // If Redis fails, allow the request
      next();
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

/**
 * Stricter rate limiter for auth endpoints
 */
@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly config: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.',
  };

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const key = `ratelimit:auth:${ip}`;

    try {
      const current = await this.redisService.incr(key);
      
      if (current === 1) {
        await this.redisService.expire(key, Math.ceil(this.config.windowMs / 1000));
      }

      const ttl = await this.redisService.ttl(key);
      
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - current));

      if (current > this.config.maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: this.config.message,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      next();
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
