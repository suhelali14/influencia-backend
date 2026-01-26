import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('privacy')
  getPrivacyPolicy(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Privacy Policy - Influencia</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
        <h1>Privacy Policy</h1>
        <p>Last updated: January 2026</p>
        <h2>Information We Collect</h2>
        <p>When you connect your Instagram account, we collect your public profile information including username, profile picture, follower count, and media count.</p>
        <h2>How We Use Your Information</h2>
        <p>We use this information to help brands find and connect with creators for marketing campaigns.</p>
        <h2>Data Retention</h2>
        <p>You can disconnect your account at any time, which will remove your data from our system.</p>
        <h2>Contact</h2>
        <p>For questions, contact us at support@influencia.com</p>
      </body>
      </html>
    `);
  }

  @Get('terms')
  getTermsOfService(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Terms of Service - Influencia</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
        <h1>Terms of Service</h1>
        <p>Last updated: January 2026</p>
        <p>By using Influencia, you agree to these terms.</p>
        <h2>Use of Service</h2>
        <p>Influencia is a platform connecting brands with creators for marketing campaigns.</p>
        <h2>User Responsibilities</h2>
        <p>Users must provide accurate information and comply with platform guidelines.</p>
      </body>
      </html>
    `);
  }
}
