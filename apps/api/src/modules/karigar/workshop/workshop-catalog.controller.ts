import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { WorkshopCatalogService } from "./workshop-catalog.service";
import { RequireWorkshopAbility, WorkshopPermissionGuard } from "./workshop-permission.guard";
import {
  CreateWorkshopDeviceDto, CreateWorkshopMaterialDto, CreateWorkshopProcessDto,
  CreateWorkshopRecipeDto, CreateWorkshopRouteDto, CreateWorkshopToleranceDto,
  CreateWorkshopWorkstationDto, RecommendWorkshopRecipeDto,
} from "./dto/workshop-catalog.dto";

@ApiTags("karigar-workshop-catalog")
@ApiBearerAuth()
@Controller("karigar/workshop")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopCatalogController {
  constructor(private readonly catalog: WorkshopCatalogService) {}

  private shop(id?: string) {
    if (!id) throw new BadRequestException("No active shop selected");
    return id;
  }

  @Get("catalog")
  list(@CurrentUser("shopId") shopId: string) {
    return this.catalog.list(this.shop(shopId));
  }

  @Post("materials")
  @RequireWorkshopAbility("workshopConfigure")
  material(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopMaterialDto) {
    return this.catalog.createMaterial(this.shop(shopId), userId, dto);
  }

  @Post("recipes")
  @RequireWorkshopAbility("workshopConfigure")
  recipe(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopRecipeDto) {
    return this.catalog.createRecipe(this.shop(shopId), userId, dto);
  }

  @Post("recipes/:id/recommend")
  recommend(@CurrentUser("shopId") shopId: string, @Param("id") recipeId: string, @Body() dto: RecommendWorkshopRecipeDto) {
    return this.catalog.recommend(this.shop(shopId), recipeId, dto.targetWeightGrams);
  }

  @Post("devices")
  @RequireWorkshopAbility("workshopConfigure")
  device(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopDeviceDto) {
    return this.catalog.registerDevice(this.shop(shopId), userId, dto);
  }

  @Post("processes")
  @RequireWorkshopAbility("workshopConfigure")
  process(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopProcessDto) {
    return this.catalog.createProcess(this.shop(shopId), userId, dto);
  }

  @Post("routes")
  @RequireWorkshopAbility("workshopConfigure")
  route(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopRouteDto) {
    return this.catalog.createRoute(this.shop(shopId), userId, dto);
  }

  @Post("workstations")
  @RequireWorkshopAbility("workshopConfigure")
  workstation(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopWorkstationDto) {
    return this.catalog.createWorkstation(this.shop(shopId), userId, dto);
  }

  @Post("tolerances")
  @RequireWorkshopAbility("workshopConfigure")
  tolerance(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopToleranceDto) {
    return this.catalog.configureTolerance(this.shop(shopId), userId, dto);
  }
}
