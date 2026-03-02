import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // On the initial /auth/google request, encode role, mode, and desktop_port in state
    // This preserves them through Google's redirect flow
    if (
      request.query?.role ||
      request.query?.mode ||
      request.query?.desktop_port
    ) {
      const stateData: Record<string, string> = {
        role: request.query.role || "CUSTOMER",
        mode: request.query.mode || "login",
      };
      if (request.query.desktop_port) {
        stateData.desktop_port = request.query.desktop_port;
      }
      // Encode as base64 to pass through OAuth state parameter
      request.query.state = Buffer.from(JSON.stringify(stateData)).toString(
        "base64",
      );
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
