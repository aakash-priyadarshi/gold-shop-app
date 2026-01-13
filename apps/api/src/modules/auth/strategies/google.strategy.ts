import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true, // Pass request to callback to access query params
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;
    
    // Get role from query params (passed from frontend)
    const role = req.query?.role || req.query?.state || 'CUSTOMER';
    // Get mode from query params: 'login' or 'register' (default: 'login')
    const mode = req.query?.mode || 'login';
    
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName || '',
      lastName: name.familyName || '',
      picture: photos[0]?.value,
      accessToken,
      requestedRole: role, // Pass the requested role
      mode, // Pass the mode (login/register)
    };

    this.logger.log(`Google OAuth user: ${user.email}, requested role: ${role}, mode: ${mode}`);
    done(null, user);
  }
}
