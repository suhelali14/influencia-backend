// DNS Fix: Pre-resolve database hostname using Google/Cloudflare DNS
// when the system DNS resolver fails (e.g., corporate/school networks blocking Neon queries)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dnsModule = require('node:dns');
const dnsResolver = new dnsModule.Resolver();
dnsResolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Store resolved IPs for later use
const resolvedHosts: Record<string, string> = {};

async function preResolveHost(hostname: string): Promise<string> {
  return new Promise((resolve) => {
    // First try system DNS
    dnsModule.lookup(hostname, (err: any, address: string) => {
      if (!err && address) {
        resolvedHosts[hostname] = address;
        return resolve(address);
      }
      // Fallback to Google/Cloudflare DNS
      console.log(`[DNS-Fix] System DNS failed for ${hostname}, trying Google/Cloudflare DNS...`);
      dnsResolver.resolve4(hostname, (resolveErr: any, addresses: string[]) => {
        if (!resolveErr && addresses?.length) {
          console.log(`[DNS-Fix] ✅ Resolved ${hostname} -> ${addresses[0]}`);
          resolvedHosts[hostname] = addresses[0];
          resolve(addresses[0]);
        } else {
          console.error(`[DNS-Fix] ❌ Could not resolve ${hostname}`);
          resolve(hostname); // Return original hostname as fallback
        }
      });
    });
  });
}

// Export for use in app.module.ts
(global as any).__dnsResolvedHosts = resolvedHosts;
(global as any).__preResolveHost = preResolveHost;

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // Enable CORS
  const corsOrigins = configService.get('CORS_ORIGIN')?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  app.enableCors({
    origin: isProduction ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Requested-With'],
    exposedHeaders: ['X-Session-ID'],
  });

  // Global validation pipe with production settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction,
    }),
  );

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Swagger documentation (disabled in production by default)
  if (!isProduction || configService.get('ENABLE_SWAGGER') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Influencia API')
      .setDescription('Influencer-Brand Marketplace API - Production Ready')
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      })
      .addApiKey({
        type: 'apiKey',
        in: 'header',
        name: 'X-Session-ID',
        description: 'Session ID for session-based auth',
      }, 'session-auth')
      .addTag('Authentication', 'User authentication and session management')
      .addTag('Creators', 'Creator profile and management')
      .addTag('Brands', 'Brand profile and management')
      .addTag('Campaigns', 'Campaign creation and management')
      .addTag('Social', 'Social media integration')
      .addTag('Matching', 'AI-powered creator-brand matching')
      .addTag('Analytics', 'Performance analytics')
      .addTag('Payments', 'Payment processing')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
    logger.log('📚 Swagger docs enabled at /api/docs');
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  if (!isProduction) {
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`🔗 API endpoint: http://localhost:${port}/v1`);
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
