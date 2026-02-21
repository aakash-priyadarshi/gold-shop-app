import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";

const API_KEY_PREFIX = "ovrk_";
const AVAILABLE_SCOPES = [
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "products:read",
  "products:write",
  "customers:read",
  "analytics:read",
  "pricing:read",
  "catalogue:read",
  "catalogue:write",
] as const;

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new API key for a shop. Returns the raw key ONLY ONCE.
   */
  async createApiKey(
    shopId: string,
    createdByUserId: string,
    data: {
      keyName: string;
      scopes: string[];
      expiresAt?: Date;
    },
  ) {
    // Validate scopes
    const invalidScopes = data.scopes.filter(
      (s) => !(AVAILABLE_SCOPES as readonly string[]).includes(s),
    );
    if (invalidScopes.length) {
      throw new BadRequestException(
        `Invalid scopes: ${invalidScopes.join(", ")}`,
      );
    }

    // Generate key: ovrk_ + 48 random hex chars
    const rawKey = API_KEY_PREFIX + crypto.randomBytes(24).toString("hex");
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 12); // "ovrk_" + 7 chars

    const apiKey = await this.prisma.shopApiKey.create({
      data: {
        shopId,
        keyName: data.keyName,
        keyHash,
        keyPrefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
        createdByUserId,
      },
    });

    // Return the raw key only on creation
    return {
      id: apiKey.id,
      keyName: apiKey.keyName,
      keyPrefix: apiKey.keyPrefix,
      rawKey, // ⚠️ Only shown once — cannot be retrieved again
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async listApiKeys(shopId: string) {
    return this.prisma.shopApiKey.findMany({
      where: { shopId },
      select: {
        id: true,
        keyName: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeApiKey(shopId: string, keyId: string) {
    const key = await this.prisma.shopApiKey.findFirst({
      where: { id: keyId, shopId },
    });
    if (!key) throw new NotFoundException("API key not found");

    return this.prisma.shopApiKey.update({
      where: { id: key.id },
      data: { isActive: false },
    });
  }

  /**
   * Validate an API key from a request header.
   * Returns the shop + scopes if valid, null otherwise.
   */
  async validateApiKey(rawKey: string) {
    if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await this.prisma.shopApiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { shop: { select: { id: true, shopName: true, userId: true } } },
    });

    if (!apiKey) return null;

    // Update last used
    await this.prisma.shopApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      shopId: apiKey.shopId,
      shop: apiKey.shop,
      scopes: apiKey.scopes,
      keyName: apiKey.keyName,
    };
  }

  getAvailableScopes() {
    return [...AVAILABLE_SCOPES];
  }
}
