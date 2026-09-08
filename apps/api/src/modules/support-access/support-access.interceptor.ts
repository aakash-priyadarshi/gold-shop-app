import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { supportAccessContext } from "../../common/support-access-context";

const PRIVATE_FIELDS = new Set([
  "passwordHash",
  "managerPinHash",
  "pinHash",
  "twoFactorSecret",
  "tokenHash",
  "refreshToken",
  "bankAccountDetails",
]);
export function redactSupportResponse(value: any): any {
  if (
    value === null ||
    typeof value !== "object" ||
    value instanceof Date ||
    Buffer.isBuffer(value)
  )
    return value;
  if (Array.isArray(value)) return value.map(redactSupportResponse);
  // Leave streams and framework response objects untouched.
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_FIELDS.has(key))
      .map(([key, child]) => [key, redactSupportResponse(child)]),
  );
}

@Injectable()
export class SupportAccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== "http") return next.handle();
    const req = context.switchToHttp().getRequest();
    if (!req.supportAccess) return next.handle();
    return new Observable((subscriber) =>
      supportAccessContext.run(
        {
          readOnly: ["GET", "HEAD"].includes(req.method),
          actorId: req.supportAccess.grant.adminId,
        },
        () =>
          next.handle().pipe(map(redactSupportResponse)).subscribe(subscriber),
      ),
    );
  }
}
