import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>("GOOGLE_CLIENT_ID"),
      clientSecret: configService.get<string>("GOOGLE_CLIENT_SECRET"),
      callbackURL:
        configService.get<string>("GOOGLE_CALLBACK_URL") ||
        "http://localhost:4000/api/auth/google/callback",
      scope: ["email", "profile"],
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

    // Decode role, mode, desktop_port, and source from state parameter (preserved through OAuth flow)
    let role = "CUSTOMER";
    let mode = "login";
    let desktopPort: string | undefined;
    let source: string | undefined;

    if (req.query?.state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(req.query.state, "base64").toString(),
        );
        role = stateData.role || "CUSTOMER";
        mode = stateData.mode || "login";
        desktopPort = stateData.desktop_port;
        source = stateData.source;
        this.logger.log(
          `Decoded OAuth state: role=${role}, mode=${mode}, desktop_port=${desktopPort || "none"}, source=${source || "main"}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to decode OAuth state: ${error.message}`);
      }
    }

    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName || "",
      lastName: name.familyName || "",
      picture: photos[0]?.value,
      accessToken,
      requestedRole: role, // Pass the requested role
      mode, // Pass the mode (login/register)
      desktopPort, // Pass the desktop port for OAuth callback
      source, // Pass the source ("team" for team portal)
    };

    this.logger.log(
      `Google OAuth user: ${user.email}, requested role: ${role}, mode: ${mode}, source: ${source || "main"}`,
    );
    done(null, user);
  }
}
