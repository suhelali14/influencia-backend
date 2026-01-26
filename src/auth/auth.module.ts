import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CreatorsModule } from '../creators/creators.module';
import { BrandsModule } from '../brands/brands.module';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => CreatorsModule),
    forwardRef(() => BrandsModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, HybridAuthGuard, SessionAuthGuard],
  exports: [AuthService, JwtModule, HybridAuthGuard, SessionAuthGuard],
})
export class AuthModule {}
