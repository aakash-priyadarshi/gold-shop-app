import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  EnrollSavingsMemberDto,
  RecordSavingsPaymentDto,
} from "./dto/savings.dto";
import { SavingsService } from "./savings.service";

@ApiTags("savings-schemes")
@Controller("savings-schemes")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Post()
  @ApiOperation({ summary: "Enroll a member (idempotent on clientId)" })
  async enroll(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: EnrollSavingsMemberDto,
  ) {
    return this.savingsService.enroll(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List savings members for the current shop" })
  async list(
    @CurrentUser("shopId") shopId: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) return { members: [] };
    return this.savingsService.list(
      shopId,
      status,
      parseInt(limit || "50", 10),
    );
  }

  @Post(":id/payment")
  @ApiOperation({ summary: "Record an installment payment (idempotent on clientId)" })
  async recordPayment(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: RecordSavingsPaymentDto,
  ) {
    return this.savingsService.recordPayment(shopId, id, dto ?? {});
  }
}
