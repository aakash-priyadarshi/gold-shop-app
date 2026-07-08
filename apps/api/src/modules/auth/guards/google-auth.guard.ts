import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import * as crypto from "crypto";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // On the initial /auth/google request, encode role, mode, and desktop_port in state
    // This preserves them through Google's redirect flow
    if (
      request.query?.role ||
      request.query?.mode ||
      request.query?.desktop_port ||
      request.query?.desktop_exchange ||
      request.query?.rememberMe
    ) {
      const stateData: Record<string, string> = {
        role: request.query.role || "CUSTOMER",
        mode: request.query.mode || "login",
        ts: String(Date.now()),
      };
      if (request.query.desktop_port) {
        stateData.desktop_port = request.query.desktop_port;
      }
      if (request.query.desktop_exchange) {
        stateData.desktop_exchange = request.query.desktop_exchange;
      }
      if (request.query.rememberMe !== undefined) {
        stateData.rememberMe = String(request.query.rememberMe);
      }
      // Sign the state with HMAC to prevent tampering
      const secret = process.env.JWT_SECRET!;
      const encodedData = Buffer.from(JSON.stringify(stateData)).toString(
        "base64",
      );
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(encodedData)
        .digest("hex");
      // Encode as base64 + HMAC signature to pass through OAuth state parameter
      request.query.state = encodedData + "." + hmac;
    }

    const result = (await super.canActivate(context)) as boolean;
    return result;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Pass state to Google OAuth if present
    if (request.query?.state) {
      return {
        state: request.query.state,
      };
    }
    return {};
  }
}
