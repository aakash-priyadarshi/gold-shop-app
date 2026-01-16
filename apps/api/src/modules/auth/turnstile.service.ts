import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpClientService } from "../../common";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string;
  private readonly verifyUrl =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService
  ) {
    this.secretKey =
      this.configService.get<string>("TURNSTILE_SECRET_KEY") || "";

    if (!this.secretKey) {
      this.logger.warn(
        "TURNSTILE_SECRET_KEY not configured - Turnstile verification disabled"
      );
    }
  }

  /**
   * Check if Turnstile is enabled (has secret key configured)
   */
  isEnabled(): boolean {
    return !!this.secretKey;
  }

  /**
   * Verify a Turnstile token
   * @param token - The token from the Turnstile widget
   * @param ip - Optional IP address of the user
   * @returns true if valid, throws BadRequestException if invalid
   */
  async verify(token: string | undefined, ip?: string): Promise<boolean> {
    // If Turnstile is not configured, skip verification (for development)
    if (!this.secretKey) {
      this.logger.debug("Turnstile verification skipped - not configured");
      return true;
    }

    // If no token provided but Turnstile is configured, fail
    if (!token) {
      this.logger.warn("Turnstile token missing");
      throw new BadRequestException("CAPTCHA verification required");
    }

    try {
      const formData = new URLSearchParams();
      formData.append("secret", this.secretKey);
      formData.append("response", token);
      if (ip) {
        formData.append("remoteip", ip);
      }

      const response = await this.httpClient.post<TurnstileVerifyResponse>(
        this.verifyUrl,
        formData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 5000,
          maxRetries: 2,
        }
      );

      if (!response.data.success) {
        const errorCodes = response.data["error-codes"] || [];
        this.logger.warn(
          `Turnstile verification failed: ${errorCodes.join(", ")}`
        );

        // Provide user-friendly error messages
        if (errorCodes.includes("timeout-or-duplicate")) {
          throw new BadRequestException("CAPTCHA expired. Please try again.");
        }
        if (errorCodes.includes("invalid-input-response")) {
          throw new BadRequestException("Invalid CAPTCHA. Please try again.");
        }

        throw new BadRequestException(
          "CAPTCHA verification failed. Please try again."
        );
      }

      this.logger.debug(
        `Turnstile verified successfully for hostname: ${response.data.hostname}`
      );
      return true;
    } catch (error) {
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log and throw generic error for other failures
      this.logger.error(`Turnstile verification error: ${error.message}`);
      throw new BadRequestException(
        "CAPTCHA verification failed. Please try again."
      );
    }
  }
}
