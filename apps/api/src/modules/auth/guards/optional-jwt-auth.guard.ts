import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * Allows requests without authentication but still extracts user if token is provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent canActivate to extract user if token exists
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(err: any, user: any): TUser {
    // Don't throw error if no user - just return null
    // This allows anonymous access while still populating req.user if authenticated
    return user || null;
  }
}
