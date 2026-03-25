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
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
} from "./dto/blog-post.dto";
import { BlogService } from "./blog.service";
import { SkipSecurity } from "../security/security.guard";

@Controller("blog")
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /* ── Admin routes ─────────────────────────────────────── */

  /** Seed default blog posts — GET /api/blog/admin/seed */
  @Get("admin/seed")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async seed() {
    return this.blogService.seedDefaults();
  }

  /** List all posts (inc. drafts) — GET /api/blog/admin/list */
  @Get("admin/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listAll() {
    return this.blogService.listAll();
  }

  /** Get single post by ID — GET /api/blog/admin/:id */
  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getById(@Param("id") id: string) {
    return this.blogService.getById(id);
  }

  /** Create post — POST /api/blog/admin */
  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto);
  }

  /** Update post — PATCH /api/blog/admin/:id */
  @Patch("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param("id") id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  /** Delete post — DELETE /api/blog/admin/:id */
  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param("id") id: string) {
    return this.blogService.delete(id);
  }

  /* ── Public routes ────────────────────────────────────── */

  /** List published posts — GET /api/blog */
  @Get()
  @SkipSecurity()
  async listPublished() {
    return this.blogService.listPublished();
  }

  /** Get published post by slug — GET /api/blog/:slug */
  @Get(":slug")
  @SkipSecurity()
  async getBySlug(@Param("slug") slug: string) {
    return this.blogService.getBySlug(slug);
  }
}
