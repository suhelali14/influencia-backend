import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { SessionService } from './session.service';
import * as dns from 'dns';

// Custom DNS resolver for environments where system DNS fails
const customDnsResolver = new dns.Resolver();
customDnsResolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

function resolveHostFallback(hostname: string): Promise<string> {
  return new Promise((resolve) => {
    if (hostname === 'localhost' || hostname === '127.0.0.1') return resolve(hostname);
    dns.lookup(hostname, (err, address) => {
      if (!err && address) return resolve(hostname); // System DNS works, use original hostname
      const logger = new Logger('RedisModule');
      logger.log(`System DNS failed for ${hostname}, trying Google/Cloudflare DNS...`);
      customDnsResolver.resolve4(hostname, (resolveErr, addresses) => {
        if (!resolveErr && addresses?.length) {
          logger.log(`✅ DNS resolved ${hostname} -> ${addresses[0]}`);
          return resolve(addresses[0]);
        }
        logger.error(`❌ Could not resolve ${hostname}: ${resolveErr?.message}`);
        resolve(hostname);
      });
    });
  });
}

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
        
        // Pre-resolve Redis hostname using fallback DNS if system DNS fails
        const resolvedHost = await resolveHostFallback(host);
        
        logger.log(`Connecting to Redis at ${host}:${port} (TLS: ${useTls})...`);
        
        const clientConfig: any = {
          socket: {
            host: resolvedHost,
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
          logger.warn('⚠️ Continuing without Redis - some features (sessions, caching) may not work');
          // Return a mock client that logs warnings instead of crashing
          return client;
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
