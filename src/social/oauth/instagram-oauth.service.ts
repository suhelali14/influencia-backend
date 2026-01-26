import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenEncryptionService } from '../security/token-encryption.service';

export interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
  permissions?: string[];
}

export interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  name?: string;
  account_type: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
}

/**
 * Instagram OAuth Service
 * Handles OAuth 2.0 flow for Instagram Basic Display API / Instagram Graph API
 */
@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);
  private readonly baseUrl = 'https://api.instagram.com';
  private readonly graphUrl = 'https://graph.instagram.com';
  private readonly graphFacebookUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private configService: ConfigService,
    private tokenEncryption: TokenEncryptionService,
  ) {}

  /**
   * Get the OAuth authorization URL for Instagram
   * Using Instagram Basic Display API (works with personal accounts)
   */
  getAuthorizationUrl(state: string): string {
    const clientId = this.configService.get<string>('INSTAGRAM_CLIENT_ID');
    const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI');
    
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Instagram OAuth not configured');
    }

    // Instagram Basic Display API scopes (correct format)
    const scopes = 'user_profile,user_media';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state: state,
    });

    // Instagram Basic Display API OAuth URL
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Get authorization URL for Instagram Graph API (Business/Creator accounts)
   * Requires Facebook Login
   */
  getGraphApiAuthorizationUrl(state: string): string {
    const clientId = this.configService.get<string>('INSTAGRAM_CLIENT_ID');
    const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI');
    
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Instagram OAuth not configured');
    }

    // Instagram Graph API scopes (via Facebook)
    const scopes = [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state: state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Works with Instagram Basic Display API
   */
  async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    const clientId = this.configService.get<string>('INSTAGRAM_CLIENT_ID') || '';
    const clientSecret = this.configService.get<string>('INSTAGRAM_CLIENT_SECRET') || '';
    const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI') || '';

    try {
      // Instagram Basic Display API token exchange
      const response = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.logger.debug('Instagram token exchange successful');
      
      return {
        access_token: response.data.access_token,
        user_id: response.data.user_id.toString(),
        permissions: [],
      };
    } catch (error) {
      this.logger.error('Instagram token exchange failed', error.response?.data);
      throw new BadRequestException(
        error.response?.data?.error_message || 'Failed to exchange code for token'
      );
    }
  }

  /**
   * Get Instagram Business Account connected to Facebook Page
   */
  async getInstagramBusinessAccount(accessToken: string): Promise<{ id: string; username: string }> {
    try {
      // Get Facebook Pages
      const pagesResponse = await axios.get(
        `${this.graphFacebookUrl}/me/accounts`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,instagram_business_account',
          },
        }
      );

      const pages = pagesResponse.data.data || [];
      this.logger.debug(`Found ${pages.length} Facebook pages`);

      // Find a page with Instagram Business Account
      for (const page of pages) {
        if (page.instagram_business_account) {
          const igAccountId = page.instagram_business_account.id;
          
          // Get Instagram account details
          const igResponse = await axios.get(
            `${this.graphFacebookUrl}/${igAccountId}`,
            {
              params: {
                access_token: accessToken,
                fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
              },
            }
          );

          this.logger.debug(`Found Instagram Business Account: @${igResponse.data.username}`);
          return igResponse.data;
        }
      }

      throw new BadRequestException('No Instagram Business Account found. Please connect your Instagram account to a Facebook Page.');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to get Instagram Business Account', error.response?.data);
      throw new BadRequestException('Failed to get Instagram Business Account');
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
    const clientSecret = this.configService.get<string>('INSTAGRAM_CLIENT_SECRET');

    try {
      const response = await axios.get(`${this.graphUrl}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: clientSecret,
          access_token: shortLivedToken,
        },
      });

      this.logger.debug('Instagram long-lived token obtained');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get long-lived token', error.response?.data);
      throw new BadRequestException('Failed to get long-lived Instagram token');
    }
  }

  /**
   * Refresh a long-lived token (must be done before expiry)
   */
  async refreshLongLivedToken(token: string): Promise<InstagramLongLivedTokenResponse> {
    try {
      const response = await axios.get(`${this.graphUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token,
        },
      });

      this.logger.debug('Instagram token refreshed');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh token', error.response?.data);
      throw new BadRequestException('Failed to refresh Instagram token');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    try {
      // Basic Display API fields
      const fields = 'id,username,account_type,media_count';
      
      const response = await axios.get(`${this.graphUrl}/me`, {
        params: {
          fields: fields,
          access_token: accessToken,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get Instagram profile', error.response?.data);
      throw new BadRequestException('Failed to get Instagram profile');
    }
  }

  /**
   * Get user profile from Instagram Graph API (Business/Creator accounts)
   * Provides more detailed metrics
   */
  async getBusinessProfile(accessToken: string, igUserId: string): Promise<InstagramUserProfile> {
    try {
      const fields = [
        'id',
        'username',
        'name',
        'biography',
        'website',
        'profile_picture_url',
        'followers_count',
        'follows_count',
        'media_count',
      ].join(',');

      const response = await axios.get(`${this.graphFacebookUrl}/${igUserId}`, {
        params: {
          fields: fields,
          access_token: accessToken,
        },
      });

      return {
        ...response.data,
        account_type: 'business',
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram business profile', error.response?.data);
      throw new BadRequestException('Failed to get Instagram business profile');
    }
  }

  /**
   * Calculate token expiry date
   */
  calculateTokenExpiry(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
  }
}
