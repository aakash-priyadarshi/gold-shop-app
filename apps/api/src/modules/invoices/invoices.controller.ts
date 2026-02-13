import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateInvoiceDto, UpdatePaymentDto } from "./dto/invoice.dto";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.create(shopId, dto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findAll(shopId, {
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get("stats")
  async getStats(@Req() req: any) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.getStats(shopId);
  }

  @Get(":id")
  async findById(@Req() req: any, @Param("id") id: string) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findById(id, shopId);
  }

  @Get("order/:orderId")
  async findByOrder(@Req() req: any, @Param("orderId") orderId: string) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findByOrder(orderId, shopId);
  }

  @Patch(":id/payment")
  async recordPayment(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.recordPayment(id, shopId, dto);
  }

  @Post(":id/void")
  async voidInvoice(@Req() req: any, @Param("id") id: string) {
    const shopId = req.user?.shop?.id;
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.voidInvoice(id, shopId);
  }
}
