import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConversationStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ContactMaskingService } from "./contact-masking.service";

/** After this many global violations the user's account is blocked. */
const MAX_WARNINGS = 3;

/** Human-readable violation descriptions for each type — English & Hindi */
const VIOLATION_DESCRIPTIONS: Record<string, { en: string; hi: string }> = {
  PHONE: {
    en: "sharing phone numbers",
    hi: "फोन नंबर शेयर करना",
  },
  EMAIL: {
    en: "sharing email addresses",
    hi: "ईमेल एड्रेस शेयर करना",
  },
  WHATSAPP: {
    en: "sharing WhatsApp contact",
    hi: "WhatsApp कॉन्टैक्ट शेयर करना",
  },
  TELEGRAM: {
    en: "sharing Telegram contact",
    hi: "Telegram कॉन्टैक्ट शेयर करना",
  },
  INSTAGRAM: {
    en: "sharing Instagram handle",
    hi: "Instagram हैंडल शेयर करना",
  },
  FACEBOOK: {
    en: "sharing Facebook/Messenger contact",
    hi: "Facebook/Messenger कॉन्टैक्ट शेयर करना",
  },
  VIBER: {
    en: "sharing Viber contact",
    hi: "Viber कॉन्टैक्ट शेयर करना",
  },
  SIGNAL: {
    en: "sharing Signal contact",
    hi: "Signal कॉन्टैक्ट शेयर करना",
  },
  CONTACT_PHRASE: {
    en: "attempting to share contact details",
    hi: "कॉन्टैक्ट डिटेल्स शेयर करने का प्रयास",
  },
  OBFUSCATED_NUMBER: {
    en: "sharing hidden/coded phone numbers",
    hi: "छुपे/कोडेड फोन नंबर शेयर करना",
  },
  SPACED_DIGITS: {
    en: "sharing hidden/coded phone numbers",
    hi: "छुपे/कोडेड फोन नंबर शेयर करना",
  },
  IMAGE_CONTACT_INFO: {
    en: "sharing contact information in images",
    hi: "इमेज में कॉन्टैक्ट जानकारी शेयर करना",
  },
  AI_DETECTED: {
    en: "attempting to share contact information",
    hi: "कॉन्टैक्ट जानकारी शेयर करने का प्रयास",
  },
};

const GUIDELINES_URL = "/platform-guidelines";

function getViolationLabel(violationType: string | null): {
  en: string;
  hi: string;
} {
  if (violationType && VIOLATION_DESCRIPTIONS[violationType]) {
    return VIOLATION_DESCRIPTIONS[violationType];
  }
  return {
    en: "sharing contact information",
    hi: "कॉन्टैक्ट जानकारी शेयर करना",
  };
}

export interface SendMessageResult {
  /** The message object — null when blocked */
  message: any | null;
  /** Whether the message was blocked by moderation */
  blocked: boolean;
  /** Warning text shown only to the sender */
  warning: string | null;
  /** Current global strike count for the sender */
  strikeCount: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private masking: ContactMaskingService,
  ) {}

  // ─── Create or get existing conversation ───
  async getOrCreateConversation(
    buyerId: string,
    shopId: string,
    orderId?: string,
    rfqId?: string,
  ) {
    const where: any = { buyerId, shopId };
    if (orderId) where.orderId = orderId;
    else if (rfqId) where.rfqId = rfqId;

    let conversation = await this.prisma.conversation.findFirst({
      where,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { buyerId, shopId, orderId, rfqId },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
    }

    return conversation;
  }

  // ─── Helper: find shop by owner userId ───
  async findShopByOwner(userId: string) {
    return this.prisma.shop.findFirst({
      where: { userId },
      select: { id: true, shopName: true, isOnHold: true },
    });
  }

  // ─── Helper: check if buyer has at least one order with a shop ───
  async buyerHasOrderWithShop(
    buyerId: string,
    shopId: string,
  ): Promise<boolean> {
    const count = await this.prisma.order.count({
      where: { customerId: buyerId, shopId },
    });
    return count > 0;
  }

  // ═══════════════════════════════════════════════════════════
  //  SEND MESSAGE — with multi-layer moderation
  // ═══════════════════════════════════════════════════════════
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: string,
    content: string,
    attachmentUrl?: string,
    attachmentType?: string,
  ): Promise<SendMessageResult> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.status === ConversationStatus.LOCKED) {
      throw new BadRequestException(
        "This conversation has been locked due to policy violations.",
      );
    }

    // Authorize
    this.authorizeConversationAccess(conversation, senderId, senderRole);

    // ── Layer 1: Regex scan ──
    const regexResult = this.masking.mask(content);

    // ── Layer 2: Gemini AI deep scan (async, catches obfuscated attempts) ──
    const scanResult = await this.masking.deepScan(content, regexResult);

    // ── Layer 3: Image attachment scan ──
    if (attachmentUrl && attachmentType === "image") {
      const imageResult = await this.masking.analyzeImage(attachmentUrl);
      if (imageResult.hasContactInfo && imageResult.confidence >= 0.7) {
        // Treat image violation same as text violation
        scanResult.hasViolation = true;
        scanResult.violationType = "IMAGE_CONTACT_INFO";
        scanResult.originalMatches.push(`[Image: ${imageResult.description}]`);
        scanResult.aiDetected = true;
        scanResult.confidence = imageResult.confidence;
      }
    }

    // ─────── VIOLATION DETECTED: BLOCK the message ───────
    if (scanResult.hasViolation) {
      return this.handleViolation(
        conversationId,
        senderId,
        senderRole,
        content,
        scanResult,
        attachmentUrl,
        attachmentType,
      );
    }

    // ─────── CLEAN MESSAGE: deliver normally ───────
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        senderRole,
        content,
        attachmentUrl,
        attachmentType,
      },
    });

    // Mark conversation as updated
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { message, blocked: false, warning: null, strikeCount: 0 };
  }

  // ═══════════════════════════════════════════════════════════
  //  VIOLATION HANDLER — block, warn, strike, enforce
  // ═══════════════════════════════════════════════════════════
  private async handleViolation(
    conversationId: string,
    senderId: string,
    senderRole: string,
    originalContent: string,
    scanResult: any,
    attachmentUrl?: string,
    attachmentType?: string,
  ): Promise<SendMessageResult> {
    // 1. Store the blocked message for admin review (NOT delivered)
    await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        senderRole,
        content: originalContent,
        maskedContent: scanResult.maskedContent,
        hasViolation: true,
        violationType: scanResult.violationType,
        isBlocked: true, // <-- NOT delivered to recipient
        attachmentUrl,
        attachmentType,
      },
    });

    // 2. Count GLOBAL violations for this user (across ALL conversations)
    const globalViolationCount = await this.prisma.message.count({
      where: {
        senderId,
        hasViolation: true,
      },
    });

    // 3. Audit log
    await this.audit.log({
      userId: senderId,
      actorType: senderRole,
      action: "CONTACT_INFO_BLOCKED",
      resourceType: "Conversation",
      resourceId: conversationId,
      metadata: {
        violationType: scanResult.violationType,
        aiDetected: scanResult.aiDetected,
        confidence: scanResult.confidence,
        matchCount: scanResult.originalMatches.length,
        globalStrike: globalViolationCount,
      },
    });

    this.logger.warn(
      `VIOLATION BLOCKED: user=${senderId} strike=${globalViolationCount}/${MAX_WARNINGS} ` +
        `type=${scanResult.violationType} ai=${scanResult.aiDetected}`,
    );

    // 4. Build warning message based on strike count — SPECIFIC to violation type
    let warning: string;
    const remaining = MAX_WARNINGS - globalViolationCount;
    const label = getViolationLabel(scanResult.violationType);

    if (globalViolationCount >= MAX_WARNINGS) {
      // ── 3RD STRIKE: BLOCK ACCOUNT ──
      warning =
        `🚫 Your message was blocked — ${label.en} (${label.hi}) is strictly prohibited on this platform. ` +
        `Your account has been suspended due to repeated violations. ` +
        `Please contact support to appeal. ` +
        `Read our rules: ${GUIDELINES_URL}`;

      await this.blockUserAccount(senderId, senderRole, conversationId);
    } else if (globalViolationCount === MAX_WARNINGS - 1) {
      // ── 2ND STRIKE: Final warning + admin alert ──
      warning =
        `⚠️ FINAL WARNING: Your message was blocked — ${label.en} (${label.hi}) is not allowed on this platform. ` +
        `This is your last warning. One more violation and your account will be permanently suspended. ` +
        `Read our platform rules: ${GUIDELINES_URL}`;

      await this.notifyAdminSecondStrike(
        senderId,
        senderRole,
        globalViolationCount,
      );
    } else {
      // ── 1ST STRIKE: Warning ──
      warning =
        `Your message was not sent — it was detected for ${label.en} (${label.hi}), which is not allowed on this platform. ` +
        `Warning ${globalViolationCount}/${MAX_WARNINGS}. ` +
        `${remaining} warning(s) remaining before your account is suspended. ` +
        `Please read our platform guidelines: ${GUIDELINES_URL}`;
    }

    // 5. Send in-app notification to the violating user
    await this.notifications.create({
      userId: senderId,
      type: "CHAT_VIOLATION_WARNING",
      titleKey: "chat.violation.warning.title",
      titleParams: { strike: globalViolationCount, max: MAX_WARNINGS },
      bodyKey: "chat.violation.warning.body",
      bodyParams: {
        strike: globalViolationCount,
        max: MAX_WARNINGS,
        violationType: scanResult.violationType,
      },
      referenceType: "Conversation",
      referenceId: conversationId,
      channels: ["IN_APP"],
    });

    return {
      message: null,
      blocked: true,
      warning,
      strikeCount: globalViolationCount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  BLOCK USER ACCOUNT (3rd strike)
  // ═══════════════════════════════════════════════════════════
  private async blockUserAccount(
    userId: string,
    userRole: string,
    conversationId: string,
  ): Promise<void> {
    if (userRole === "SHOPKEEPER") {
      // Put the shopkeeper's shop on hold
      const shop = await this.prisma.shop.findFirst({
        where: { userId },
      });

      if (shop) {
        await this.prisma.shop.update({
          where: { id: shop.id },
          data: {
            isOnHold: true,
            holdReason:
              "CHAT_POLICY_VIOLATIONS: Account suspended after 3 contact-sharing violations.",
          },
        });

        await this.notifications.create({
          userId,
          type: "SHOP_ON_HOLD",
          titleKey: "shop.onHold.title",
          titleParams: {},
          bodyKey: "shop.onHold.violations",
          bodyParams: { reason: "Repeated contact sharing violations" },
          referenceType: "Shop",
          referenceId: shop.id,
          channels: ["IN_APP", "EMAIL"],
        });

        this.logger.error(
          `SHOP BLOCKED: shop=${shop.id} owner=${userId} reason=CHAT_VIOLATIONS`,
        );
      }
    }

    // Suspend the user account regardless of role
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });

    await this.notifications.create({
      userId,
      type: "ACCOUNT_SUSPENDED",
      titleKey: "account.suspended.title",
      titleParams: {},
      bodyKey: "account.suspended.chatViolations",
      bodyParams: { reason: "Repeated contact sharing violations in chat" },
      referenceType: "User",
      referenceId: userId,
      channels: ["IN_APP", "EMAIL"],
    });

    await this.audit.log({
      userId,
      actorType: "SYSTEM",
      action: "ACCOUNT_SUSPENDED",
      resourceType: "User",
      resourceId: userId,
      metadata: {
        reason: "MAX_CHAT_VIOLATIONS_EXCEEDED",
        triggerConversation: conversationId,
      },
    });

    // Lock ALL active conversations for this user
    await this.prisma.conversation.updateMany({
      where: {
        OR: [{ buyerId: userId }, { shop: { userId } }],
        status: ConversationStatus.ACTIVE,
      },
      data: { status: ConversationStatus.LOCKED },
    });

    this.logger.error(
      `ACCOUNT SUSPENDED: user=${userId} role=${userRole} reason=CHAT_VIOLATIONS`,
    );
  }

  // ─── Admin alert when user reaches 2nd strike ───
  private async notifyAdminSecondStrike(
    userId: string,
    userRole: string,
    strikeCount: number,
  ): Promise<void> {
    // Find all admins
    const admins = await this.prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.notifications.create({
        userId: admin.id,
        type: "SYSTEM_ALERT",
        titleKey: "admin.chatViolation.secondStrike.title",
        titleParams: { userId },
        bodyKey: "admin.chatViolation.secondStrike.body",
        bodyParams: {
          userId,
          userRole,
          strikeCount,
          maxWarnings: MAX_WARNINGS,
        },
        referenceType: "User",
        referenceId: userId,
        channels: ["IN_APP"],
      });
    }
  }

  // ─── Get conversation messages (paginated) — excludes blocked for non-admins ───
  async getMessages(
    conversationId: string,
    userId: string,
    userRole: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException("Conversation not found");
    this.authorizeConversationAccess(conversation, userId, userRole);

    // Admin and Support can see blocked messages, normal users cannot
    const isAdmin = userRole === "ADMIN" || userRole === "SUPPORT";
    const whereClause: any = { conversationId };
    if (!isAdmin) {
      whereClause.isBlocked = false;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      this.prisma.message.count({ where: whereClause }),
    ]);

    return {
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── List conversations for a user ───
  async listConversations(userId: string, userRole: string, shopId?: string) {
    let where: any;

    if (userRole === "CUSTOMER") {
      where = { buyerId: userId };
    } else if (userRole === "SHOPKEEPER" && shopId) {
      where = { shopId };
    } else if (userRole === "ADMIN" || userRole === "SUPPORT") {
      where = {};
    } else {
      throw new ForbiddenException("No access to conversations");
    }

    return this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true } },
        shop: { select: { id: true, shopName: true, userId: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          where: { isBlocked: false }, // Don't show blocked messages in preview
          select: {
            content: true,
            createdAt: true,
            senderRole: true,
            isRead: true,
          },
        },
      },
    });
  }

  // ─── Mark messages as read ───
  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
        isBlocked: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  ADMIN: Violation stats & management
  // ═══════════════════════════════════════════════════════════

  async getViolationStats() {
    const [
      totalViolations,
      blockedMessages,
      violationsByType,
      lockedConversations,
      suspendedUsers,
      shopsOnHold,
      recentViolations,
    ] = await Promise.all([
      this.prisma.message.count({ where: { hasViolation: true } }),
      this.prisma.message.count({ where: { isBlocked: true } }),
      this.prisma.message.groupBy({
        by: ["violationType"],
        where: { hasViolation: true },
        _count: true,
      }),
      this.prisma.conversation.count({
        where: { status: ConversationStatus.LOCKED },
      }),
      this.prisma.user.count({ where: { status: "SUSPENDED" } }),
      this.prisma.shop.count({ where: { isOnHold: true } }),
      this.prisma.message.findMany({
        where: { hasViolation: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
          conversation: {
            select: {
              id: true,
              shop: { select: { id: true, shopName: true, userId: true } },
              buyer: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    return {
      totalViolations,
      blockedMessages,
      violationsByType,
      lockedConversations,
      suspendedUsers,
      shopsOnHold,
      recentViolations,
    };
  }

  // ─── Per-user violation history ───
  async getUserViolationHistory(userId: string) {
    const [violations, user, shop] = await Promise.all([
      this.prisma.message.findMany({
        where: { senderId: userId, hasViolation: true },
        orderBy: { createdAt: "desc" },
        include: {
          conversation: {
            select: {
              id: true,
              shop: { select: { shopName: true } },
              buyer: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      }),
      this.prisma.shop.findFirst({
        where: { userId },
        select: { id: true, shopName: true, isOnHold: true, holdReason: true },
      }),
    ]);

    return {
      user,
      shop,
      totalViolations: violations.length,
      isBlocked: user?.status === "SUSPENDED" || (shop?.isOnHold ?? false),
      violations,
    };
  }

  // ─── Admin: unblock user (reset violations enforcement) ───
  async unblockUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shops: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException("User not found");

    // ── Critical DB updates (always succeed together) ──
    // 1. Re-activate user account
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    // 2. Remove shop hold for ALL shops owned by this user
    await this.prisma.shop.updateMany({
      where: { userId },
      data: { isOnHold: false, holdReason: null },
    });

    // 3. Reactivate locked conversations
    await this.prisma.conversation.updateMany({
      where: {
        OR: [{ buyerId: userId }, { shop: { userId } }],
        status: ConversationStatus.LOCKED,
      },
      data: { status: ConversationStatus.ACTIVE },
    });

    this.logger.log(
      `USER UNBLOCKED: user=${userId} by admin=${adminId} (previous status: ${user.status})`,
    );

    // ── Non-critical: audit & notification (don't block or fail the response) ──
    try {
      await this.audit.log({
        userId: adminId,
        actorType: "ADMIN",
        action: "USER_UNBLOCKED",
        resourceType: "User",
        resourceId: userId,
        metadata: { previousStatus: user.status, role: user.role },
      });
    } catch (e) {
      this.logger.warn(`Failed to log audit for unblock user=${userId}: ${e}`);
    }

    try {
      await this.notifications.create({
        userId,
        type: "SYSTEM_ALERT",
        titleKey: "account.reactivated.title",
        titleParams: {},
        bodyKey: "account.reactivated.body",
        bodyParams: {},
        referenceType: "User",
        referenceId: userId,
        channels: ["IN_APP", "EMAIL"],
      });
    } catch (e) {
      this.logger.warn(
        `Failed to send notification for unblock user=${userId}: ${e}`,
      );
    }

    return { success: true, userId };
  }

  // ─── Admin: unlock a conversation ───
  async unlockConversation(conversationId: string, adminId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ACTIVE },
    });

    await this.audit.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "CONVERSATION_UNLOCKED",
      resourceType: "Conversation",
      resourceId: conversationId,
    });
  }

  // ─── Admin: get original (unmasked) blocked message ───
  async getBlockedMessageOriginal(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        conversation: {
          select: {
            id: true,
            shop: { select: { shopName: true } },
            buyer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!message) throw new NotFoundException("Message not found");
    return message;
  }

  // ─── Authorization helper ───
  private authorizeConversationAccess(
    conversation: any,
    userId: string,
    userRole: string,
  ) {
    if (userRole === "ADMIN" || userRole === "SUPPORT") return;

    if (userRole === "CUSTOMER" && conversation.buyerId !== userId) {
      throw new ForbiddenException("Access denied to this conversation");
    }
  }
}
