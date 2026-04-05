import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import * as dns from 'dns';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CreatorsModule } from './creators/creators.module';
import { BrandsModule } from './brands/brands.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SocialModule } from './social/social.module';
import { MatchingModule } from './matching/matching.module';
import { PaymentsModule } from './payments/payments.module';
import { CommonModule } from './common/common.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';

// Custom DNS resolver for environments where system DNS fails (corporate/school networks)
const customResolver = new dns.Resolver();
customResolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

function resolveHostWithFallback(hostname: string): Promise<string> {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (!err && address) return resolve(address);
      console.log(`[DNS-Fix] System DNS failed for ${hostname}, trying Google/Cloudflare DNS...`);
      customResolver.resolve4(hostname, (resolveErr, addresses) => {
        if (!resolveErr && addresses?.length) {
          console.log(`[DNS-Fix] ✅ Resolved ${hostname} -> ${addresses[0]}`);
          return resolve(addresses[0]);
        }
        console.error(`[DNS-Fix] ❌ Could not resolve ${hostname}: ${resolveErr?.message}`);
        resolve(hostname);
      });
    });
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const dbHost = configService.get<string>('DATABASE_HOST') || 'localhost';
        
        // Pre-resolve the database hostname using fallback DNS if needed
        const resolvedHost = await resolveHostWithFallback(dbHost);
        
        return {
          type: 'postgres' as const,
          host: resolvedHost,
          port: parseInt(configService.get<string>('DATABASE_PORT', '5432')),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false, // Disabled - schema managed by SQL migrations in /migrations
          logging: !isProduction,
          ssl: {
            rejectUnauthorized: false,
            servername: dbHost, // Use original hostname for SNI (SSL needs this)
          },
          extra: {
            ssl: {
              rejectUnauthorized: false,
              servername: dbHost, // SNI for SSL handshake
            },
            // Connection pool settings for production
            max: isProduction ? 20 : 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },
          retryAttempts: isProduction ? 5 : 3,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST', 'localhost');
        const resolvedRedisHost = await resolveHostWithFallback(redisHost);
        return {
          redis: {
            host: resolvedRedisHost,
            port: Number(configService.get('REDIS_PORT', 6379)),
            password: configService.get('REDIS_PASSWORD'),
            username: configService.get('REDIS_USERNAME', 'default'),
          },
        };
      },
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    CreatorsModule,
    BrandsModule,
    CampaignsModule,
    SocialModule,
    MatchingModule,
    PaymentsModule,
    AiModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
