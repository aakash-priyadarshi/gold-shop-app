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
import { ChitService } from "./chit.service";
import {
  AddChitMemberDto,
  CreateChitGroupDto,
  DeclareChitWinnerDto,
  OpenChitCycleDto,
  RecordChitPaymentDto,
} from "./dto/chit.dto";

@ApiTags("chit-groups")
@Controller("chit-groups")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChitController {
  constructor(private readonly chitService: ChitService) {}

  @Post()
  @ApiOperation({ summary: "Create a committee chit group" })
  create(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateChitGroupDto,
  ) {
    return this.chitService.createGroup(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List chit groups for the current shop" })
  list(
    @CurrentUser("shopId") shopId: string,
    @Query("status") status?: string,
  ) {
    return this.chitService.listGroups(shopId, status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get chit group detail with arrears" })
  get(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.chitService.getGroup(shopId, id);
  }

  @Post(":id/members")
  @ApiOperation({ summary: "Add a member / ticket to the group" })
  addMember(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: AddChitMemberDto,
  ) {
    return this.chitService.addMember(shopId, id, dto);
  }

  @Post(":id/cycles")
  @ApiOperation({ summary: "Open the next monthly cycle" })
  openCycle(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: OpenChitCycleDto,
  ) {
    return this.chitService.openCycle(shopId, id, dto ?? {});
  }

  @Get(":id/cycles")
  @ApiOperation({ summary: "List cycles for a group" })
  listCycles(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.chitService.listCycles(shopId, id);
  }

  @Get(":id/arrears")
  @ApiOperation({ summary: "Members who have not paid the open cycle" })
  arrears(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.chitService.getArrears(shopId, id);
  }

  @Post(":id/cycles/:cycleId/payments")
  @ApiOperation({ summary: "Record a cycle installment payment" })
  recordPayment(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: RecordChitPaymentDto,
  ) {
    return this.chitService.recordPayment(shopId, id, cycleId, dto);
  }

  @Post(":id/cycles/:cycleId/winner")
  @ApiOperation({ summary: "Declare cycle winner (manual pick) and close cycle" })
  declareWinner(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: DeclareChitWinnerDto,
  ) {
    return this.chitService.declareWinner(shopId, id, cycleId, dto);
  }
}
