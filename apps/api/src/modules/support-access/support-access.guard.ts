import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SupportAccessService } from "./support-access.service";
import { supportOperation } from "./support-access.policy";
import { supportAccessContext } from "../../common/support-access-context";

@Injectable()
export class SupportAccessGuard implements CanActivate {
  constructor(
    private readonly service: SupportAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== "http") return true;
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer osa_")
    )
      return true;
    const response = context.switchToHttp().getResponse();
    response.setHeader("Cache-Control", "no-store");
    const path =
      request.path.replace(/^\/api(?=\/)/, "").replace(/\/$/, "") || "/";
    // UI status polling must not keep an unattended session alive.
    const session = await this.service.authenticate(
      authorization.slice(7),
      path === "/support-access/session/activity",
    );
    const grant = session.grant;
    const event = await this.prisma.supportAccessAuditEvent.create({
      data: {
        grantId: grant.id,
        sessionId: session.id,
        actorId: grant.adminId,
        action: request.method,
        resource: path,
        outcome: "ATTEMPTED",
      },
    });
    response.once("finish", () => {
      supportAccessContext.exit(() => {
        void this.prisma.supportAccessAuditEvent
          .update({
            where: { id: event.id },
            data: {
              outcome:
                response.statusCode < 400
                  ? "SUCCESS"
                  : `DENIED_OR_FAILED_${response.statusCode}`,
            },
          })
          .catch(() => undefined);
      });
    });
    const operation = supportOperation(request.method, path);
    if (
      operation.permission &&
      !grant.permissions.includes(operation.permission)
    )
      throw new ForbiddenException("The seller has not allowed this action");
    const routeShop = /^\/(?:inventory|orders)\/shop\/([^/]+)/.exec(path)?.[1];
    if (routeShop && routeShop !== grant.shopId)
      throw new ForbiddenException(
        "Support access is limited to the approved shop",
      );
    for (const source of [request.query, request.body]) {
      if (source?.shopId !== undefined && source.shopId !== grant.shopId)
        throw new ForbiddenException(
          "Shop cannot be changed during support access",
        );
    }
    if (operation.resource === "inventoryItem") {
      const item = await this.prisma.inventoryItem.findUnique({
        where: { id: operation.id },
        select: { shopId: true },
      });
      if (item?.shopId !== grant.shopId)
        throw new ForbiddenException("Item is outside the approved shop");
      if (request.body?.locationId) {
        const location = await this.prisma.storageLocation.findUnique({
          where: { id: request.body.locationId },
          select: { shopId: true },
        });
        if (location?.shopId !== grant.shopId)
          throw new ForbiddenException("Location is outside the approved shop");
      }
    }
    if (operation.resource === "customer") {
      const customerId = operation.id!;
      const [registeredCustomer, invoiceCustomer, walkInCustomer] =
        await Promise.all([
          this.prisma.user.findFirst({
            where: {
              id: customerId,
              role: "CUSTOMER",
              OR: [
                { customerOrders: { some: { shopId: grant.shopId } } },
                {
                  rfqRequests: {
                    some: {
                      targetedShops: { some: { shopId: grant.shopId } },
                    },
                  },
                },
              ],
            },
            select: { id: true },
          }),
          this.prisma.invoice.findFirst({
            where: {
              shopId: grant.shopId,
              registeredCustomerId: customerId,
              status: { notIn: ["VOID", "CANCELLED"] },
            },
            select: { id: true },
          }),
          this.prisma.walkInCustomer.findFirst({
            where: { id: customerId, createdByShopId: grant.shopId },
            select: { id: true },
          }),
        ]);
      if (!registeredCustomer && !invoiceCustomer && !walkInCustomer)
        throw new ForbiddenException(
          "Customer is outside the approved shop",
        );
    }
    if (path === "/invoices" && request.method === "POST") {
      if (request.body?.orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: request.body.orderId },
          select: { shopId: true },
        });
        if (order?.shopId !== grant.shopId)
          throw new ForbiddenException("Order is outside the approved shop");
      }
      if (request.body?.walkInCustomerId) {
        const customer = await this.prisma.walkInCustomer.findUnique({
          where: { id: request.body.walkInCustomerId },
          select: { createdByShopId: true },
        });
        if (customer?.createdByShopId !== grant.shopId)
          throw new ForbiddenException("Customer is outside the approved shop");
      }
    }
    request.supportAccess = session;
    request.user = {
      id: grant.sellerId,
      email: grant.seller.email,
      role: "SHOPKEEPER",
      firstName: grant.seller.firstName,
      lastName: grant.seller.lastName,
      preferredLanguage: grant.seller.preferredLanguage,
      shopId: grant.shopId,
      activeShopId: grant.shopId,
      actorUserId: grant.adminId,
      supportAccess: true,
    };
    return true;
  }
}
