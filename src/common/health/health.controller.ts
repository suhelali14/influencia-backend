import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RedisService } from '../redis/redis.service';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: string;
    redis: string;
    ai: string;
  };
  version: string;
  environment: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with service status' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async detailedCheck(): Promise<HealthCheckResponse> {
    const services: { database: string; redis: string; ai: string } = {
      database: 'up',
      redis: 'up',
      ai: 'unknown',
    };

    // Check Redis
    try {
      await this.redisService.set('health:check', 'ok', 10);
      const result = await this.redisService.get('health:check');
      services.redis = result === 'ok' ? 'up' : 'down';
    } catch {
      services.redis = 'down';
    }

    const allUp = Object.values(services).every(s => s === 'up' || s === 'unknown');

    return {
      status: allUp ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service not ready' })
  async readiness(): Promise<{ ready: boolean }> {
    // Check if critical services are available
    try {
      await this.redisService.get('health:ready');
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness(): Promise<{ alive: boolean }> {
    return { alive: true };
  }
}
