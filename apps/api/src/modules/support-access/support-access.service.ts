import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { Prisma, SupportAccessGrant } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ApproveSupportAccessDto,
  RequestSupportAccessDto,
} from "./support-access.dto";
import { SUPPORT_PERMISSION_IDS } from "./support-access.policy";
import { ChatGateway } from "../chat/chat.gateway";

const include = {
  admin: { select: { id: true, firstName: true, lastName: true } },
  shop: { select: { id: true, shopName: true } },
};
const MAX_GRANT_DURATION_MS = 90 * 86400_000;
export const supportTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

@Injectable()
export class SupportAccessService {
  private readonly logger = new Logger(SupportAccessService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly chat: ChatGateway,
  ) {}

  private async notify(grant: SupportAccessGrant) {
    try {
      const message = await this.prisma.message.findFirst({
        where: {
          conversationId: grant.conversationId,
          messageType: "SUPPORT_ACCESS",
          payload: { path: ["grantId"], equals: grant.id },
        },
        orderBy: { createdAt: "desc" },
      });
      if (message) {
        this.chat.emitToUser(grant.adminId, "newMessage", message);
        this.chat.emitToUser(grant.sellerId, "newMessage", message);
      }
    } catch {
      // Consent and the chat event are already committed. Polling recovers delivery.
      this.logger.warn("Support-access chat notification deferred to polling");
    }
  }

  assertEnabled() {
    if (this.config.get("SUPPORT_ACCESS_ENABLED") !== "true")
      throw new ForbiddenException("Support access is not enabled");
  }

  realUser(user: any) {
    this.assertEnabled();
    if (
      user.supportAccess ||
      user.tokenType ||
      !["ADMIN", "SHOPKEEPER"].includes(user.role)
    )
      throw new ForbiddenException(
        "Use your own account to manage support access",
      );
  }

  async context(user: any, conversationId: string) {
    this.realUser(user);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { shop: { include: { user: true } }, buyer: true },
    });
    if (!conversation || conversation.status !== "ACTIVE")
      throw new ForbiddenException(
        "An active support conversation is required",
      );
    // Both existing chat arrangements are supported: admin as buyer, or admin-owned support shop.
    const admin =
      conversation.buyer.role === "ADMIN"
        ? conversation.buyer
        : conversation.shop.user;
    const seller =
      conversation.buyer.role === "SHOPKEEPER"
        ? conversation.buyer
        : conversation.shop.user;
    if (
      admin.role !== "ADMIN" ||
      seller.role !== "SHOPKEEPER" ||
      admin.status !== "ACTIVE" ||
      seller.status !== "ACTIVE" ||
      ![admin.id, seller.id].includes(user.id)
    )
      throw new ForbiddenException(
        "This is not your admin–seller conversation",
      );
    const shops = await this.prisma.shop.findMany({
      where: { userId: seller.id, isActive: true },
      select: { id: true, shopName: true },
    });
    return {
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      sellerId: seller.id,
      shops,
    };
  }

  private approval(dto: ApproveSupportAccessDto) {
    const expiresAt = new Date(dto.expiresAt);
    const duration = expiresAt.getTime() - Date.now();
    if (
      !Number.isFinite(duration) ||
      duration < 60_000 ||
      duration > MAX_GRANT_DURATION_MS
    )
      throw new BadRequestException(
        "Choose an expiry between one minute and 90 days from now",
      );
    if (
      !Array.isArray(dto.permissions) ||
      dto.permissions.some(
        (p) => !(SUPPORT_PERMISSION_IDS as readonly string[]).includes(p),
      )
    )
      throw new BadRequestException("Unknown permission");
    return {
      expiresAt,
      permissions: [...new Set(dto.permissions)],
      approvedAt: new Date(),
      status: "APPROVED",
    };
  }

  private async event(
    tx: Prisma.TransactionClient,
    grant: SupportAccessGrant,
    actorId: string,
    action: string,
    sessionId?: string,
  ) {
    await tx.supportAccessAuditEvent.create({
      data: {
        grantId: grant.id,
        actorId,
        action,
        outcome: "SUCCESS",
        sessionId,
      },
    });
    await tx.message.create({
      data: {
        conversationId: grant.conversationId,
        senderId: actorId,
        senderRole: actorId === grant.adminId ? "ADMIN" : "SHOPKEEPER",
        content: `Support access: ${action}`,
        messageType: "SUPPORT_ACCESS",
        payload: { grantId: grant.id },
        isSystemGenerated: true,
      },
    });
    await tx.conversation.update({
      where: { id: grant.conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async create(
    user: any,
    dto: RequestSupportAccessDto,
    consent?: ApproveSupportAccessDto,
  ) {
    const context = await this.context(user, dto.conversationId);
    if (consent ? user.id !== context.sellerId : user.id !== context.admin.id)
      throw new ForbiddenException();
    if (!context.shops.some((s) => s.id === dto.shopId))
      throw new ForbiddenException("Shop does not belong to the seller");
    const approval = consent ? this.approval(consent) : {};
    const result = await this.prisma.$transaction(async (tx) => {
      const grant = await tx.supportAccessGrant.create({
        data: {
          conversationId: dto.conversationId,
          shopId: dto.shopId,
          reason: dto.reason,
          adminId: context.admin.id,
          sellerId: context.sellerId,
          ...approval,
        },
        include,
      });
      await this.event(tx, grant, user.id, consent ? "GRANTED" : "REQUESTED");
      return grant;
    });
    await this.notify(result);
    return result;
  }

  async get(user: any, id: string) {
    this.realUser(user);
    const grant = await this.prisma.supportAccessGrant.findUnique({
      where: { id },
      include,
    });
    if (!grant || ![grant.adminId, grant.sellerId].includes(user.id))
      throw new ForbiddenException();
    return grant;
  }

  async list(user: any, conversationId?: string) {
    this.realUser(user);
    return this.prisma.supportAccessGrant.findMany({
      where: {
        OR: [{ adminId: user.id }, { sellerId: user.id }],
        ...(conversationId ? { conversationId } : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async decide(
    user: any,
    id: string,
    action: "APPROVED" | "DECLINED" | "REVOKED",
    dto?: ApproveSupportAccessDto,
  ) {
    const grant = await this.get(user, id);
    if (user.id !== grant.sellerId)
      throw new ForbiddenException("Only the seller can decide");
    await this.context(user, grant.conversationId)
      .then(() => undefined)
      .catch((error) => {
        if (action !== "REVOKED") throw error;
      });
    const shop = await this.prisma.shop.findUnique({
      where: { id: grant.shopId },
    });
    if (action !== "REVOKED" && shop?.userId !== user.id)
      throw new ForbiddenException();
    const data =
      action === "APPROVED"
        ? this.approval(dto!)
        : {
            status: action,
            ...(action === "REVOKED" ? { revokedAt: new Date() } : {}),
          };
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportAccessGrant.updateMany({
        where: { id, status: action === "REVOKED" ? "APPROVED" : "PENDING" },
        data,
      });
      if (updated.count !== 1)
        throw new ConflictException(
          "Permission has already changed. Refresh and try again.",
        );
      if (action === "REVOKED")
        await tx.supportAccessSession.updateMany({
          where: { grantId: id, endedAt: null },
          data: { endedAt: new Date(), endReason: "REVOKED" },
        });
      await this.event(tx, grant, user.id, action);
      return tx.supportAccessGrant.findUnique({ where: { id }, include });
    });
    await this.notify(grant);
    return result;
  }

  async start(user: any, id: string) {
    const grant = await this.get(user, id);
    if (user.role !== "ADMIN" || grant.adminId !== user.id)
      throw new ForbiddenException();
    const token = `osa_${randomBytes(32).toString("hex")}`;
    const session = await this.prisma.$transaction(async (tx) => {
      // Lock grant against concurrent revocation/approval while issuing a session.
      await tx.$queryRaw`SELECT id FROM "SupportAccessGrant" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.supportAccessGrant.findUniqueOrThrow({
        where: { id },
        include: { admin: true, seller: true, shop: true },
      });
      this.validateGrant(current);
      const created = await tx.supportAccessSession.create({
        data: {
          grantId: id,
          tokenHash: supportTokenHash(token),
          expiresAt: new Date(
            Math.min(current.expiresAt!.getTime(), Date.now() + 3600_000),
          ),
        },
      });
      await this.event(tx, current, user.id, "SESSION_STARTED", created.id);
      return created;
    });
    await this.notify(grant);
    return { token, expiresAt: session.expiresAt };
  }

  private validateGrant(grant: any) {
    if (
      grant.status !== "APPROVED" ||
      grant.revokedAt ||
      !grant.expiresAt ||
      grant.expiresAt <= new Date() ||
      grant.admin.status !== "ACTIVE" ||
      grant.admin.role !== "ADMIN" ||
      grant.seller.status !== "ACTIVE" ||
      grant.seller.role !== "SHOPKEEPER" ||
      grant.shop.userId !== grant.sellerId ||
      !grant.shop.isActive
    )
      throw new UnauthorizedException("Support access has ended");
  }

  async authenticate(token: string, touch = true) {
    this.assertEnabled();
    const session = await this.prisma.supportAccessSession.findUnique({
      where: { tokenHash: supportTokenHash(token) },
      include: {
        grant: { include: { admin: true, seller: true, shop: true } },
      },
    });
    if (
      !session ||
      session.endedAt ||
      session.expiresAt <= new Date() ||
      Date.now() - session.lastUsedAt.getTime() >= 15 * 60_000
    )
      throw new UnauthorizedException("Support session has ended");
    this.validateGrant(session.grant);
    if (touch)
      await this.prisma.supportAccessSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
    return session;
  }

  async end(
    session: Awaited<ReturnType<SupportAccessService["authenticate"]>>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const ended = await tx.supportAccessSession.updateMany({
        where: { id: session.id, endedAt: null },
        data: { endedAt: new Date(), endReason: "EXITED" },
      });
      if (ended.count)
        await this.event(
          tx,
          session.grant,
          session.grant.adminId,
          "SESSION_ENDED",
          session.id,
        );
    });
    await this.notify(session.grant);
    return { success: true };
  }

  async activity(user: any, id: string) {
    await this.get(user, id);
    const [events, sessions] = await Promise.all([
      this.prisma.supportAccessAuditEvent.findMany({
        where: { grantId: id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.supportAccessSession.findMany({
        where: { grantId: id },
        select: {
          id: true,
          startedAt: true,
          lastUsedAt: true,
          expiresAt: true,
          endedAt: true,
          endReason: true,
        },
        orderBy: { startedAt: "desc" },
        take: 100,
      }),
    ]);
    return { events, sessions };
  }
}
