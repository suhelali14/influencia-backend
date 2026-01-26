import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: parseInt(configService.get('DATABASE_PORT', '5432')),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: !isProduction, // NEVER synchronize in production
          logging: !isProduction,
          ssl: {
            rejectUnauthorized: false,
          },
          extra: {
            ssl: {
              rejectUnauthorized: false,
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
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: Number(configService.get('REDIS_PORT', 6379)),
          password: configService.get('REDIS_PASSWORD'),
          username: configService.get('REDIS_USERNAME', 'default'),
        },
      }),
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
