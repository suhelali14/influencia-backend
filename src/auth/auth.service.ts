import { Injectable, UnauthorizedException, ConflictException, Inject, forwardRef, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreatorsService } from '../creators/creators.service';
import { BrandsService } from '../brands/brands.service';
import { SessionService, SessionData } from '../common/redis/session.service';

export interface AuthResponse {
  user: User;
  access_token: string;
  session_id: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => CreatorsService))
    private readonly creatorsService: CreatorsService,
    @Inject(forwardRef(() => BrandsService))
    private readonly brandsService: BrandsService,
    private readonly sessionService: SessionService,
  ) {}

  async register(
    registerDto: RegisterDto,
    requestInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const password_hash = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password_hash,
      status: 'active',
    });

    await this.userRepository.save(user);

    // Automatically create creator or brand profile based on role
    try {
      if (registerDto.role === 'creator') {
        await this.creatorsService.create(user.id, {
          bio: `Hi, I'm ${registerDto.first_name || 'a creator'}!`,
          phone: registerDto.phone || '',
          location: '',
          categories: [],
          languages: ['en'],
        });
      } else if (registerDto.role === 'brand_admin') {
        await this.brandsService.create(user.id, {
          company_name: registerDto.first_name || 'My Brand',
          industry: '',
          description: '',
          website: '',
        });
      }
    } catch (error) {
      // Log error but don't fail registration if profile creation fails
      this.logger.error('Failed to create profile:', error);
    }

    const access_token = this.generateToken(user);
    
    // Create session in Redis
    const session = await this.sessionService.createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      userAgent: requestInfo?.userAgent,
      ipAddress: requestInfo?.ipAddress,
    });

    const { password_hash: _, ...userWithoutPassword } = user;

    return { 
      user: userWithoutPassword as User, 
      access_token,
      session_id: session.sessionId,
    };
  }

  async login(
    loginDto: LoginDto,
    requestInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('No account found with this email. Please register first.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password. Please try again.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    const access_token = this.generateToken(user);

    // Create session in Redis
    const session = await this.sessionService.createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      userAgent: requestInfo?.userAgent,
      ipAddress: requestInfo?.ipAddress,
    });

    const { password_hash: _, ...userWithoutPassword } = user;

    this.logger.log(`User ${user.email} logged in with session ${session.sessionId.substring(0, 16)}...`);

    return { 
      user: userWithoutPassword as User, 
      access_token,
      session_id: session.sessionId,
    };
  }

  async logout(sessionId: string): Promise<{ success: boolean }> {
    await this.sessionService.destroySession(sessionId);
    return { success: true };
  }

  async logoutAllDevices(userId: string): Promise<{ success: boolean; count: number }> {
    const count = await this.sessionService.destroyAllUserSessions(userId);
    return { success: true, count };
  }

  async getActiveSessions(userId: string) {
    return this.sessionService.getUserSessionsWithDetails(userId);
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    };

    return this.jwtService.sign(payload);
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;

    return userWithoutPassword as User;
  }
}
