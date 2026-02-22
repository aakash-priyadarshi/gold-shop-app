import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { AuditService } from "../../audit/audit.service";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { FeatureGateGuard } from "../../subscriptions/feature-gate.guard";
import { RequireFeature } from "../../subscriptions/require-feature.decorator";
import { RepricingService } from "../services/repricing.service";

@ApiTags("enterprise/repricing")
@Controller("enterprise/repricing")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
@RequireFeature("aiPriceOptimization")
@ApiBearerAuth()
export class RepricingController {
  constructor(
    private readonly repricingService: RepricingService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a repricing rule" })
  async create(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      ruleName: string;
      ruleType: string;
      conditions: Record<string, unknown>;
      action: Record<string, unknown>;
      priority?: number;
    },
  ) {
    const rule = await this.repricingService.createRule(shopId, userId, body);

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "CREATE_REPRICING_RULE",
      resourceType: "RepricingRule",
      resourceId: rule.id,
      newValue: { ruleName: body.ruleName, ruleType: body.ruleType },
    });

    return rule;
  }

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List repricing rules" })
  async list(@CurrentUser("activeShopId") shopId: string) {
    return this.repricingService.listRules(shopId);
  }

  @Get(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get repricing rule details" })
  async get(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.repricingService.getRule(shopId, id);
  }

  @Patch(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Update repricing rule" })
  async update(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
    @Body()
    body: Partial<{
      ruleName: string;
      conditions: Record<string, unknown>;
      action: Record<string, unknown>;
      isActive: boolean;
      priority: number;
    }>,
  ) {
    return this.repricingService.updateRule(shopId, id, body);
  }

  @Delete(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Delete repricing rule" })
  async remove(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.repricingService.deleteRule(shopId, id);
  }

  @Post("evaluate")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Manually evaluate all active repricing rules" })
  async evaluate(@CurrentUser("activeShopId") shopId: string) {
    return this.repricingService.evaluateRules(shopId);
  }
}
