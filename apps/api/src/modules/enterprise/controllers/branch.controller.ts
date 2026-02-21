import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { EnterpriseGuard } from "../guards/enterprise.guard";
import { BranchService } from "../services/branch.service";

@ApiTags("enterprise/branches")
@Controller("enterprise/branches")
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseGuard)
@ApiBearerAuth()
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a new branch" })
  async create(
    @CurrentUser("activeShopId") shopId: string,
    @Body()
    body: {
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
    return this.branchService.createBranch(shopId, body);
  }

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List all branches" })
  async list(
    @CurrentUser("activeShopId") shopId: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.branchService.listBranches(shopId, includeInactive === "true");
  }

  @Get(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get branch details" })
  async get(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.branchService.getBranch(shopId, id);
  }

  @Patch(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Update branch" })
  async update(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.branchService.updateBranch(shopId, id, body);
  }

  @Delete(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Delete a branch" })
  async delete(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.branchService.deleteBranch(shopId, id);
  }
}
