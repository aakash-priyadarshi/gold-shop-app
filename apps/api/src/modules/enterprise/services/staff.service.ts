import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invite a user to be a staff member of a shop.
   * The user must exist in the system. Staff permissions are stored as JSON.
   */
  async inviteStaff(
    shopId: string,
    invitedByUserId: string,
    data: {
      userId: string;
      staffRole: "MANAGER" | "INVENTORY" | "CASHIER" | "VIEWER" | "AUDITOR";
      permissions: Record<string, boolean>;
      branchIds?: string[];
    },
  ) {
    // Check user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) throw new NotFoundException("User not found");

    // Check not already staff
    const existing = await this.prisma.staffAccount.findUnique({
      where: { shopId_userId: { shopId, userId: data.userId } },
    });
    if (existing) {
      throw new ConflictException("User is already a staff member of this shop");
    }

    // Verify branch IDs belong to this shop
    if (data.branchIds?.length) {
      const branches = await this.prisma.shopBranch.findMany({
        where: { shopId, id: { in: data.branchIds } },
      });
      if (branches.length !== data.branchIds.length) {
        throw new BadRequestException("One or more branch IDs are invalid");
      }
    }

    return this.prisma.staffAccount.create({
      data: {
        shopId,
        userId: data.userId,
        staffRole: data.staffRole as any,
        permissions: data.permissions as any,
        branchIds: data.branchIds || [],
        invitedByUserId,
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async listStaff(shopId: string, includeInactive = false) {
    return this.prisma.staffAccount.findMany({
      where: { shopId, ...(includeInactive ? {} : { isActive: true }) },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getStaffMember(shopId: string, staffId: string) {
    const staff = await this.prisma.staffAccount.findFirst({
      where: { id: staffId, shopId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });
    if (!staff) throw new NotFoundException("Staff member not found");
    return staff;
  }

  async updateStaff(
    shopId: string,
    staffId: string,
    data: Partial<{
      staffRole: string;
      permissions: Record<string, boolean>;
      branchIds: string[];
      isActive: boolean;
    }>,
  ) {
    const staff = await this.getStaffMember(shopId, staffId);
    return this.prisma.staffAccount.update({
      where: { id: staff.id },
      data: {
        ...(data.staffRole && { staffRole: data.staffRole as any }),
        ...(data.permissions && { permissions: data.permissions as any }),
        ...(data.branchIds !== undefined && { branchIds: data.branchIds }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async removeStaff(shopId: string, staffId: string) {
    const staff = await this.getStaffMember(shopId, staffId);
    return this.prisma.staffAccount.delete({ where: { id: staff.id } });
  }

  async acceptInvite(userId: string, staffId: string) {
    const staff = await this.prisma.staffAccount.findFirst({
      where: { id: staffId, userId, acceptedAt: null },
    });
    if (!staff) throw new NotFoundException("Pending invite not found");

    return this.prisma.staffAccount.update({
      where: { id: staff.id },
      data: { acceptedAt: new Date() },
    });
  }
}
