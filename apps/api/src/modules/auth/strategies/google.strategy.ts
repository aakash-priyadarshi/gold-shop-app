import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { createHmac } from "crypto";

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
      scope: [
        "email",
        "profile",
        "https://www.googleapis.com/auth/user.birthday.read",
        "https://www.googleapis.com/auth/user.gender.read",
        "https://www.googleapis.com/auth/user.phonenumbers.read",
        "https://www.googleapis.com/auth/user.addresses.read",
      ],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;

    let role = "CUSTOMER";
    let mode = "login";
    let desktopPort: string | undefined;
    let source: string | undefined;
    let rememberMe = true;

    if (req.query?.state) {
      try {
        // State format: base64(json).hmac — verify HMAC signature before using
        const stateParam = req.query.state as string;
        const lastDot = stateParam.lastIndexOf(".");
        if (lastDot === -1) {
          this.logger.warn("OAuth state missing HMAC signature");
        } else {
          const encodedData = stateParam.substring(0, lastDot);
          const signature = stateParam.substring(lastDot + 1);
          const secret = process.env.JWT_SECRET!;
          const expectedHmac = createHmac("sha256", secret)
            .update(encodedData)
            .digest("hex");
          if (signature !== expectedHmac) {
            this.logger.warn("OAuth state HMAC verification failed");
          } else {
            const stateData = JSON.parse(
              Buffer.from(encodedData, "base64").toString(),
            );
            role = stateData.role || "CUSTOMER";
            mode = stateData.mode || "login";
            desktopPort = stateData.desktop_port;
            source = stateData.source;
            if (stateData.rememberMe !== undefined) {
              rememberMe =
                stateData.rememberMe === "1" ||
                stateData.rememberMe === "true";
            }
            this.logger.log(
              `Decoded OAuth state: role=${role}, mode=${mode}, rememberMe=${rememberMe}, desktop_port=${desktopPort || "none"}, source=${source || "main"}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to decode OAuth state: ${(error as Error).message}`,
        );
      }
    }

    // Fetch enriched data from Google People API (branding verified — full scopes allowed)
    let googleBirthday: string | undefined;
    let googleGender: string | undefined;
    let googlePhoneRaw: string | undefined;
    let googleAddressRaw: Record<string, unknown> | undefined;
    let googleLocale: string | undefined;

    try {
      const peopleRes = await fetch(
        "https://people.googleapis.com/v1/people/me?personFields=birthdays,genders,phoneNumbers,addresses,locales",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (peopleRes.ok) {
        const people = (await peopleRes.json()) as Record<string, any>;
        // Birthday
        const bday = people.birthdays?.[0]?.date;
        if (bday) {
          const y = bday.year ? String(bday.year).padStart(4, "0") : "0000";
          const m = bday.month ? String(bday.month).padStart(2, "0") : "00";
          const d = bday.day ? String(bday.day).padStart(2, "0") : "00";
          googleBirthday = `${y}-${m}-${d}`;
        }
        googleGender = people.genders?.[0]?.value as string | undefined;
        googlePhoneRaw = people.phoneNumbers?.[0]?.value as string | undefined;
        googleAddressRaw =
          (people.addresses?.[0] as Record<string, unknown>) || undefined;
        googleLocale = people.locales?.[0]?.value as string | undefined;
      }
    } catch (err) {
      this.logger.warn(
        `Google People API fetch failed: ${(err as Error).message}`,
      );
    }

    const user = {
      googleId: id as string,
      email: emails[0].value as string,
      firstName: (name.givenName as string) || "",
      lastName: (name.familyName as string) || "",
      picture: photos[0]?.value as string | undefined,
      accessToken,
      requestedRole: role,
      mode,
      rememberMe,
      desktopPort,
      source,
      // Enriched People API data stored on User model
      googleBirthday,
      googleGender,
      googlePhoneRaw,
      googleAddressRaw,
      googleLocale,
      googlePicture: photos[0]?.value as string | undefined,
    };

    this.logger.log(
      `Google OAuth: ${user.email}, role=${role}, mode=${mode}, rememberMe=${rememberMe}, source=${source || "main"}`,
    );
    done(null, user);
  }
}
