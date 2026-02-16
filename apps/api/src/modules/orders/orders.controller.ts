import {
  Controller,
  ForbiddenException,
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
  AdminOrderFilterDto,
  AdminCancelOrderDto,
  AdminUpdateTimelineDto,
  AdminVerifyPaymentDto,
  CreateCounterOfferDto,
  RespondToCounterOfferDto,
  AdminUpdateOrderStatusDto,
  AdminUpdatePaymentStatusDto,
  ShopkeeperPaidAtShopDto,
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

  @Get('my-stats')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get purchase statistics for current customer by currency' })
  async getMyPurchaseStats(@CurrentUser('id') userId: string) {
    return this.ordersService.getCustomerPurchaseStats(userId);
  }

  @Get('shop/:shopId')
  @Roles('SHOPKEEPER', 'ADMIN')
  @ApiOperation({ summary: 'Get orders for a shop' })
  async getShopOrders(
    @Param('shopId') shopId: string,
    @CurrentUser('shopId') userShopId: string,
    @CurrentUser('role') userRole: string,
    @Query() filters: OrderFilterDto,
  ) {
    // Shopkeepers can only access their own shop's orders
    if (userRole === 'SHOPKEEPER' && shopId !== userShopId) {
      throw new ForbiddenException('You can only access your own shop orders');
    }
    return this.ordersService.findShopOrders(shopId, filters);
  }

  @Get('shop/:shopId/stats')
  @Roles('SHOPKEEPER', 'ADMIN')
  @ApiOperation({ summary: 'Get order statistics for a shop' })
  async getShopOrderStats(
    @Param('shopId') shopId: string,
    @CurrentUser('shopId') userShopId: string,
    @CurrentUser('role') userRole: string,
  ) {
    // Shopkeepers can only access their own shop's stats
    if (userRole === 'SHOPKEEPER' && shopId !== userShopId) {
      throw new ForbiddenException('You can only access your own shop stats');
    }
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

  // ══════════════════════════════════════
  // ADMIN ENDPOINTS
  // ══════════════════════════════════════

  @Get('admin/all')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all orders (Admin)' })
  async getAllOrders(@Query() filters: AdminOrderFilterDto) {
    return this.ordersService.findAllOrders(filters);
  }

  @Get('admin/stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get platform-wide order statistics (Admin)' })
  async getPlatformOrderStats() {
    return this.ordersService.getPlatformStats();
  }

  @Post('admin/:id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel order as admin' })
  async adminCancelOrder(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminCancelOrderDto,
  ) {
    return this.ordersService.adminCancelOrder(id, adminId, dto);
  }

  @Patch('admin/:id/timeline')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order timeline (Admin)' })
  async adminUpdateTimeline(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminUpdateTimelineDto,
  ) {
    return this.ordersService.adminUpdateTimeline(id, adminId, dto);
  }

  @Post('admin/:id/verify-payment')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually verify payment (Admin)' })
  async adminVerifyPayment(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminVerifyPaymentDto,
  ) {
    return this.ordersService.adminVerifyPayment(id, adminId, dto);
  }

  // ══════════════════════════════════════
  // COUNTER-OFFER ENDPOINTS (Shopkeeper)
  // ══════════════════════════════════════

  @Post(':id/counter-offer')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Create counter-offer for custom order' })
  async createCounterOffer(
    @Param('id') orderId: string,
    @CurrentUser('id') shopkeeperId: string,
    @Body() dto: CreateCounterOfferDto,
  ) {
    return this.ordersService.createCounterOffer(orderId, shopkeeperId, dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions/counter-offers for an order' })
  async getOrderVersions(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.ordersService.getOrderVersions(orderId, userId, userRole);
  }

  @Post(':id/versions/:versionId/respond')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Respond to counter-offer' })
  async respondToCounterOffer(
    @Param('id') orderId: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') customerId: string,
    @Body() dto: RespondToCounterOfferDto,
  ) {
    return this.ordersService.respondToCounterOffer(orderId, versionId, customerId, dto);
  }

  // ══════════════════════════════════════
  // ADMIN ORDER/PAYMENT STATUS CONTROLS
  // ══════════════════════════════════════

  @Patch('admin/:id/order-status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order status (Admin)' })
  async adminUpdateOrderStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminUpdateOrderStatusDto,
  ) {
    return this.ordersService.adminUpdateOrderStatus(id, adminId, dto);
  }

  @Patch('admin/:id/payment-status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update payment status and method (Admin)' })
  async adminUpdatePaymentStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminUpdatePaymentStatusDto,
  ) {
    return this.ordersService.adminUpdatePaymentStatus(id, adminId, dto);
  }

  // ══════════════════════════════════════
  // SHOPKEEPER ENDPOINTS
  // ══════════════════════════════════════

  @Patch('shop/:id/order-status')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Update order status (Shopkeeper)' })
  async shopkeeperUpdateOrderStatus(
    @Param('id') id: string,
    @CurrentUser('id') shopkeeperId: string,
    @Body() dto: AdminUpdateOrderStatusDto,
  ) {
    return this.ordersService.shopkeeperUpdateOrderStatus(id, shopkeeperId, dto);
  }

  @Post('shop/:id/paid-at-shop')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Mark order as paid at shop (triggers commission)' })
  async markPaidAtShop(
    @Param('id') id: string,
    @CurrentUser('id') shopkeeperId: string,
    @Body() dto: ShopkeeperPaidAtShopDto,
  ) {
    return this.ordersService.markPaidAtShop(id, shopkeeperId, dto);
  }
}
