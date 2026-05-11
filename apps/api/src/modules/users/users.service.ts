import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";

// Currency codes matching the Prisma enum (CurrencyCode will be available after Prisma regeneration)
type CurrencyCode = "NPR" | "INR" | "AED" | "USD" | "GBP" | "EUR";
const DEFAULT_CURRENCY: CurrencyCode = "NPR";

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  name?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  preferredLanguage?: string;
  preferredCurrency?: CurrencyCode;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        preferredLanguage: true,
        preferredCurrency: true,
        preferredCountry: true,
        preferredState: true,
        preferredCity: true,
        createdAt: true,
        passwordHash: true,
        googleId: true,
        shops: {
          select: {
            id: true,
            shopName: true,
            isVerified: true,
            verificationRequests: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          take: 1,
        },
        deliveryAddresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
      } as any,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const { passwordHash, googleId, ...rest } = user as any;

    // Transform to maintain backward compatibility
    return {
      ...rest,
      shop: rest.shops?.[0] || null,
      hasPassword: !!passwordHash && passwordHash !== "",
      hasGoogleAuth: !!googleId,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    // Handle combined 'name' field by splitting into firstName/lastName
    let firstName = data.firstName;
    let lastName = data.lastName;

    if (data.name && !firstName && !lastName) {
      const nameParts = data.name.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }

    // Build update data with all supported fields
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    // If phone is being changed, check if it's different from current and reset verification
    if (data.phone !== undefined) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });

      updateData.phone = data.phone;

      // If phone number is different from current, reset phoneVerifiedAt
      // This makes the old number available for others to use
      if (currentUser && currentUser.phone !== data.phone) {
        updateData.phoneVerifiedAt = null;
      }
    }

    if (data.preferredLanguage !== undefined)
      updateData.preferredLanguage = data.preferredLanguage;
    if (data.preferredCurrency !== undefined)
      updateData.preferredCurrency = data.preferredCurrency;
    if (data.country !== undefined) updateData.preferredCountry = data.country;
    if (data.state !== undefined) updateData.preferredState = data.state;
    if (data.city !== undefined) updateData.preferredCity = data.city;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.gender !== undefined) updateData.gender = data.gender;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        preferredCurrency: true,
        preferredCountry: true,
        preferredState: true,
        preferredCity: true,
      } as any,
    });
  }

  async findAll(role?: UserRole, search?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { shops: { some: { shopName: { contains: search, mode: "insensitive" } } } }
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          shops: {
            select: {
              id: true,
              shopName: true,
              isVerified: true,
            },
            take: 1,
          },
          webSessions: {
            select: { lastActive: true },
            orderBy: { lastActive: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    const transformedUsers = users.map((user) => {
      const latestSession = (user.webSessions as any[])?.[0] ?? null;
      const isOnlineNow = latestSession
        ? (latestSession.lastActive as Date) >= fiveMinutesAgo
        : false;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { webSessions: _ws, ...rest } = user as any;
      return {
        ...rest,
        shop: rest.shops?.[0] || null,
        sessionSummary: {
          isOnlineNow,
          lastSeen: latestSession?.lastActive ?? null,
        },
      };
    });

    return {
      data: transformedUsers,
      meta: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async suspendUser(userId: string, _adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException("Cannot suspend admin users");
    }

    // Suspend user account
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });

    // Also put their shops on hold (unified suspension)
    if (user.role === UserRole.SHOPKEEPER) {
      await this.prisma.shop.updateMany({
        where: { userId },
        data: { isOnHold: true, holdReason: "Account suspended by admin" },
      });
    }

    return updated;
  }

  async activateUser(userId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    // Also remove hold from their shops (unified unsuspend)
    await this.prisma.shop.updateMany({
      where: { userId, isOnHold: true },
      data: { isOnHold: false, holdReason: null },
    });

    // Unlock any locked conversations
    await this.prisma.conversation.updateMany({
      where: {
        OR: [{ buyerId: userId }, { shop: { userId } }],
        status: "LOCKED",
      },
      data: { status: "ACTIVE" },
    });

    return updated;
  }

  /**
   * Get user preferences (language, currency, country, theme)
   */
  async getPreferences(userId: string) {
    // Use raw query approach to handle new fields that TypeScript may not recognize yet
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      language: user.preferredLanguage || "en",
      currency: (user as any).preferredCurrency || DEFAULT_CURRENCY,
      country: (user as any).preferredCountry || "US",
      state: (user as any).preferredState || null,
      city: (user as any).preferredCity || null,
      theme: (user as any).themeMode || "system",
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    data: {
      preferredLanguage?: string;
      preferredCurrency?: CurrencyCode;
      preferredCountry?: string;
      preferredState?: string;
      preferredCity?: string;
      themeMode?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Use any cast for new fields until Prisma client is regenerated
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.preferredLanguage && {
          preferredLanguage: data.preferredLanguage,
        }),
        ...(data.preferredCurrency &&
          ({ preferredCurrency: data.preferredCurrency } as any)),
        ...(data.preferredCountry &&
          ({ preferredCountry: data.preferredCountry } as any)),
        ...(data.preferredState !== undefined &&
          ({ preferredState: data.preferredState || null } as any)),
        ...(data.preferredCity !== undefined &&
          ({ preferredCity: data.preferredCity || null } as any)),
        ...(data.themeMode && ({ themeMode: data.themeMode } as any)),
      },
    });

    return {
      language: updated.preferredLanguage || "en",
      currency: (updated as any).preferredCurrency || DEFAULT_CURRENCY,
      country: (updated as any).preferredCountry || "US",
      state: (updated as any).preferredState || null,
      city: (updated as any).preferredCity || null,
      theme: (updated as any).themeMode || "system",
    };
  }

  /**
   * Set active shop for multi-shop users
   */
  async setActiveShop(userId: string, shopId: string) {
    // Verify the shop belongs to the user
    const shop = await this.prisma.shop.findFirst({
      where: {
        id: shopId,
        userId: userId,
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found or not owned by user");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeShopId: shopId },
    });

    return {
      message: "Active shop updated",
      activeShopId: shopId,
      shopName: shop.shopName,
    };
  }

  /**
   * Update user password (requires current password unless account has no password yet)
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const hasPassword = !!user.passwordHash && user.passwordHash !== "";

    if (hasPassword) {
      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new BadRequestException("Current password is incorrect");
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: "Password updated successfully" };
  }

  /**
   * Create a password for a Google-only account (no current password required)
   */
  async createPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.passwordHash && user.passwordHash !== "") {
      throw new BadRequestException(
        "Account already has a password. Use change password instead.",
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: "Password created successfully" };
  }

  // ================================
  // DELIVERY ADDRESS METHODS
  // ================================

  /**
   * Get all delivery addresses for a user
   */
  async getAddresses(userId: string) {
    return this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Get a single address by ID
   */
  async getAddress(userId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    return address;
  }

  /**
   * Create a new delivery address
   */
  async createAddress(
    userId: string,
    data: {
      label?: string;
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    },
  ) {
    // If this is the first address or marked as default, set other addresses as non-default
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first address - make it default automatically
    const existingCount = await this.prisma.customerAddress.count({
      where: { userId },
    });

    return this.prisma.customerAddress.create({
      data: {
        userId,
        label: data.label || "Home",
        fullName: data.fullName,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        isDefault: data.isDefault || existingCount === 0, // First address is default
      },
    });
  }

  /**
   * Update a delivery address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    data: {
      label?: string;
      fullName?: string;
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    // Verify ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    // If marking as default, unset others
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data,
    });
  }

  /**
   * Delete a delivery address
   */
  async deleteAddress(userId: string, addressId: string) {
    // Verify ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    // If this was the default address, make another one default
    if (address.isDefault) {
      const firstAddress = await this.prisma.customerAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      if (firstAddress) {
        await this.prisma.customerAddress.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: "Address deleted successfully" };
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string) {
    // Verify ownership
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    // Unset current default
    await this.prisma.customerAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
