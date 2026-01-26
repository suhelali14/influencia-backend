import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenEncryptionService } from '../security/token-encryption.service';

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  avatar_url: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

/**
 * TikTok OAuth Service
 * Handles OAuth 2.0 flow for TikTok API
 */
@Injectable()
export class TikTokOAuthService {
  private readonly logger = new Logger(TikTokOAuthService.name);
  private readonly authUrl = 'https://www.tiktok.com/v2/auth/authorize';
  private readonly tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
  private readonly apiUrl = 'https://open.tiktokapis.com/v2';

  constructor(
    private configService: ConfigService,
    private tokenEncryption: TokenEncryptionService,
  ) {}

  /**
   * Get the OAuth authorization URL for TikTok
   */
  getAuthorizationUrl(state: string): string {
    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY');
    const redirectUri = this.configService.get<string>('TIKTOK_REDIRECT_URI');

    if (!clientKey || !redirectUri) {
      throw new BadRequestException('TikTok OAuth not configured');
    }

    // TikTok API scopes
    const scopes = [
      'user.info.basic',
      'user.info.profile',
      'user.info.stats',
      'video.list',
    ].join(',');

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state: state,
    });

    return `${this.authUrl}/?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY') || '';
    const clientSecret = this.configService.get<string>('TIKTOK_CLIENT_SECRET') || '';
    const redirectUri = this.configService.get<string>('TIKTOK_REDIRECT_URI') || '';

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.error) {
        throw new BadRequestException(response.data.error_description || 'TikTok OAuth failed');
      }

      this.logger.debug('TikTok token exchange successful');
      return response.data;
    } catch (error) {
      this.logger.error('TikTok token exchange failed', error.response?.data);
      throw new BadRequestException(
        error.response?.data?.error_description || 'Failed to exchange TikTok code for token'
      );
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY') || '';
    const clientSecret = this.configService.get<string>('TIKTOK_CLIENT_SECRET') || '';

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.error) {
        throw new BadRequestException(response.data.error_description || 'TikTok token refresh failed');
      }

      this.logger.debug('TikTok token refreshed');
      return response.data;
    } catch (error) {
      this.logger.error('TikTok token refresh failed', error.response?.data);
      throw new BadRequestException('Failed to refresh TikTok token');
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string, openId: string): Promise<void> {
    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY') || '';
    const clientSecret = this.configService.get<string>('TIKTOK_CLIENT_SECRET') || '';

    try {
      await axios.post(
        `${this.apiUrl}/oauth/revoke/`,
        new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          token: accessToken,
        }),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      this.logger.debug('TikTok token revoked');
    } catch (error) {
      this.logger.error('TikTok token revocation failed', error.response?.data);
      throw new BadRequestException('Failed to revoke TikTok token');
    }
  }

  /**
   * Get user info from TikTok
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    try {
      const fields = [
        'open_id',
        'union_id',
        'avatar_url',
        'avatar_url_100',
        'avatar_large_url',
        'display_name',
        'bio_description',
        'profile_deep_link',
        'is_verified',
        'follower_count',
        'following_count',
        'likes_count',
        'video_count',
      ].join(',');

      const response = await axios.get(`${this.apiUrl}/user/info/`, {
        params: {
          fields: fields,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.error?.code !== 'ok' && response.data.error?.code) {
        throw new BadRequestException(response.data.error.message || 'Failed to get TikTok user info');
      }

      const userData = response.data.data?.user;
      if (!userData) {
        throw new BadRequestException('No TikTok user data returned');
      }

      return userData;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to get TikTok user info', error.response?.data);
      throw new BadRequestException('Failed to get TikTok user info');
    }
  }

  /**
   * Calculate token expiry date
   */
  calculateTokenExpiry(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
  }
}
