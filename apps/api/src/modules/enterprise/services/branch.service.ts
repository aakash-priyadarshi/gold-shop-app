import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async createBranch(
    shopId: string,
    data: {
      branchName: string;
      branchCode: string;
      country: string;
      state?: string;
      city: string;
      address: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
      contactPhone: string;
      contactEmail?: string;
      isHeadquarter?: boolean;
    },
  ) {
    // Check for duplicate branch code
    const existing = await this.prisma.shopBranch.findUnique({
      where: { shopId_branchCode: { shopId, branchCode: data.branchCode } },
    });
    if (existing) {
      throw new BadRequestException(
        `Branch code "${data.branchCode}" already exists for this shop`,
      );
    }

    // If marking as HQ, unset any existing HQ
    if (data.isHeadquarter) {
      await this.prisma.shopBranch.updateMany({
        where: { shopId, isHeadquarter: true },
        data: { isHeadquarter: false },
      });
    }

    return this.prisma.shopBranch.create({
      data: { shopId, ...data },
    });
  }

  async listBranches(shopId: string, includeInactive = false) {
    return this.prisma.shopBranch.findMany({
      where: { shopId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isHeadquarter: "desc" }, { branchName: "asc" }],
    });
  }

  async getBranch(shopId: string, branchId: string) {
    const branch = await this.prisma.shopBranch.findFirst({
      where: { id: branchId, shopId },
    });
    if (!branch) throw new NotFoundException("Branch not found");
    return branch;
  }

  async updateBranch(
    shopId: string,
    branchId: string,
    data: Partial<{
      branchName: string;
      country: string;
      state: string;
      city: string;
      address: string;
      pincode: string;
      latitude: number;
      longitude: number;
      contactPhone: string;
      contactEmail: string;
      isActive: boolean;
      isHeadquarter: boolean;
    }>,
  ) {
    const branch = await this.getBranch(shopId, branchId);

    if (data.isHeadquarter) {
      await this.prisma.shopBranch.updateMany({
        where: { shopId, isHeadquarter: true },
        data: { isHeadquarter: false },
      });
    }

    return this.prisma.shopBranch.update({
      where: { id: branch.id },
      data,
    });
  }

  async deleteBranch(shopId: string, branchId: string) {
    const branch = await this.getBranch(shopId, branchId);
    if (branch.isHeadquarter) {
      throw new BadRequestException("Cannot delete the headquarters branch");
    }
    return this.prisma.shopBranch.delete({ where: { id: branch.id } });
  }
}
