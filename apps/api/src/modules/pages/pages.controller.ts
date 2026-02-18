import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  /**
   * Seed default pages (Admin only)
   * GET /api/pages/admin/seed
   */
  @Get('admin/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async seed() {
    return this.pagesService.seedDefaults();
  }

  /**
   * List all pages (Admin only)
   * GET /api/pages/admin/list
   */
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listAll() {
    return this.pagesService.listAll();
  }

  /**
   * Create a new page (Admin only)
   * POST /api/pages/admin
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  /**
   * Update a page (Admin only)
   * PATCH /api/pages/admin/:id
   */
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  /**
   * Delete a page (Admin only)
   * DELETE /api/pages/admin/:id
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    return this.pagesService.delete(id);
  }

  /**
   * Get a published page by slug (public)
   * GET /api/pages/:slug
   */
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.pagesService.getBySlug(slug);
  }
}
