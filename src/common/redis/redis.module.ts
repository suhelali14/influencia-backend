import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { SessionService } from './session.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const { createClient } = await import('redis');
        
        const host = configService.get('REDIS_HOST', 'localhost');
        const port = configService.get('REDIS_PORT', 6379);
        const password = configService.get('REDIS_PASSWORD');
        const username = configService.get('REDIS_USERNAME', 'default');
        const useTls = configService.get('REDIS_TLS', 'false') === 'true';
        
        logger.log(`Connecting to Redis at ${host}:${port} (TLS: ${useTls})...`);
        
        const clientConfig: any = {
          socket: {
            host,
            port: Number(port),
            reconnectStrategy: (retries: number) => {
              if (retries > 10) {
                logger.error('Max Redis reconnection attempts reached');
                return new Error('Max reconnection attempts reached');
              }
              const delay = Math.min(retries * 100, 3000);
              logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
              return delay;
            },
          },
          username,
          password,
        };
        
        if (useTls) {
          clientConfig.socket.tls = true;
        }
        
        const client = createClient(clientConfig);

        client.on('error', (err) => logger.error('Redis Client Error:', err.message));
        client.on('connect', () => logger.log('✅ Redis Client Connected'));
        client.on('ready', () => logger.log('✅ Redis Client Ready'));
        client.on('reconnecting', () => logger.warn('🔄 Redis Client Reconnecting...'));

        try {
          await client.connect();
        } catch (err) {
          logger.error('Failed to connect to Redis:', err);
          throw err;
        }
        
        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
    SessionService,
  ],
  exports: ['REDIS_CLIENT', RedisService, SessionService],
})
export class RedisModule {}
