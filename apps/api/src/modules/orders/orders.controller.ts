import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateInventoryOrderDto,
  CreateCustomOrderDto,
  UpdateOrderStatusDto,
  CreateMilestoneDto,
  OrderFilterDto,
} from './dto/order.dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('inventory')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Create order for inventory item' })
  async createInventoryOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInventoryOrderDto,
  ) {
    return this.ordersService.createInventoryOrder(userId, dto);
  }

  @Post('custom')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Create custom order from RFQ' })
  async createCustomOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomOrderDto,
  ) {
    return this.ordersService.createCustomOrder(userId, dto);
  }

  @Get('my-orders')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get orders for current customer' })
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query() filters: OrderFilterDto,
  ) {
    return this.ordersService.findCustomerOrders(userId, filters);
  }

  @Get('shop/:shopId')
  @Roles('SHOPKEEPER', 'ADMIN')
  @ApiOperation({ summary: 'Get orders for a shop' })
  async getShopOrders(
    @Param('shopId') shopId: string,
    @Query() filters: OrderFilterDto,
  ) {
    return this.ordersService.findShopOrders(shopId, filters);
  }

  @Get('shop/:shopId/stats')
  @Roles('SHOPKEEPER', 'ADMIN')
  @ApiOperation({ summary: 'Get order statistics for a shop' })
  async getShopOrderStats(@Param('shopId') shopId: string) {
    return this.ordersService.getOrderStats(shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  async getOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.ordersService.findOne(id, userId, userRole);
  }

  @Patch(':id/status')
  @Roles('SHOPKEEPER', 'ADMIN')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, userId, dto);
  }

  @Post(':id/milestones')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Add milestone to custom order' })
  async addMilestone(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.ordersService.addMilestone(id, userId, dto);
  }

  @Patch(':id/milestones/:milestoneId/complete')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Mark milestone as complete' })
  async completeMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.completeMilestone(id, milestoneId, userId);
  }

  @Post(':id/cancel')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.cancelOrder(id, userId, reason);
  }
}
