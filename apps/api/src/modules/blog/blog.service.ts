import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBlogPostDto, UpdateBlogPostDto } from "./dto/blog-post.dto";

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Public ───────────────────────────────────────────── */

  /** List published posts (public blog page) */
  async listPublished() {
    return this.prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        category: true,
        tags: true,
        author: true,
        authorRole: true,
        readTime: true,
        featured: true,
        publishedAt: true,
        createdAt: true,
      },
    });
  }

  /** Get a published post by slug (public) */
  async getBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post || !post.isPublished) {
      throw new NotFoundException(`Blog post "${slug}" not found`);
    }

    return post;
  }

  /* ── Admin ────────────────────────────────────────────── */

  /** List all posts including drafts (admin) */
  async listAll() {
    return this.prisma.blogPost.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  /** Get a single post by ID (admin) */
  async getById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Blog post not found");
    return post;
  }

  /** Create a new blog post */
  async create(dto: CreateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `A blog post with slug "${dto.slug}" already exists`,
      );
    }

    return this.prisma.blogPost.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        excerpt: dto.excerpt || null,
        content: dto.content,
        coverImage: dto.coverImage || null,
        metaTitle: dto.metaTitle || null,
        metaDescription: dto.metaDescription || null,
        metaKeywords: dto.metaKeywords || [],
        canonicalUrl: dto.canonicalUrl || null,
        category: dto.category || "General",
        tags: dto.tags || [],
        author: dto.author || "Orivraa Team",
        authorRole: dto.authorRole || null,
        readTime: dto.readTime || null,
        isPublished: dto.isPublished ?? false,
        featured: dto.featured ?? false,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /** Update a blog post */
  async update(id: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Blog post not found");

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== post.slug) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
      }
    }

    const data: Record<string, any> = { ...dto };
    if (dto.publishedAt) data.publishedAt = new Date(dto.publishedAt);

    return this.prisma.blogPost.update({ where: { id }, data });
  }

  /** Delete a blog post */
  async delete(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Blog post not found");

    await this.prisma.blogPost.delete({ where: { id } });
    return { deleted: true };
  }

  /** Seed the 5 default blog posts */
  async seedDefaults() {
    const defaults = [
      {
        slug: "best-jewellery-shop-software-2025",
        title: "Best Jewellery Shop Software in 2025: Complete Comparison & Buyer's Guide",
        excerpt: "Compare the top jewellery shop software solutions for 2025 — Orivraa, Zoho, Marg ERP, Vyapar, Jwelly ERP & more.",
        category: "Software Guide",
        tags: ["jewellery shop software", "gold shop software", "jewellery ERP", "software comparison"],
        metaKeywords: ["best jewellery shop software", "jewellery software comparison", "gold shop software 2025"],
        author: "Orivraa Team",
        authorRole: "Product & Market Research",
        readTime: "12 min read",
        featured: true,
      },
      {
        slug: "jewellery-inventory-management-guide",
        title: "Complete Guide to Jewellery Inventory Management",
        excerpt: "Learn how to manage jewellery inventory by weight, purity, and making charges efficiently.",
        category: "Business Guide",
        tags: ["jewellery inventory", "gold inventory management", "inventory software"],
        metaKeywords: ["jewellery inventory management", "gold inventory software"],
        author: "Orivraa Team",
        authorRole: "Product & Operations",
        readTime: "10 min read",
      },
      {
        slug: "zoho-vs-orivraa-jewellery-business",
        title: "Zoho vs Orivraa for Jewellery Shops: Which Is Better in 2025?",
        excerpt: "Detailed comparison of Zoho CRM and Orivraa for jewellery businesses.",
        category: "Software Comparison",
        tags: ["Zoho alternative", "Zoho vs Orivraa", "jewellery software comparison"],
        metaKeywords: ["Zoho alternative jewellery", "Zoho vs Orivraa"],
        author: "Orivraa Team",
        authorRole: "Product & Market Research",
        readTime: "8 min read",
      },
      {
        slug: "how-to-sell-jewellery-online-2025",
        title: "How to Start Selling Jewellery Online in 2025: Step-by-Step Guide",
        excerpt: "Complete guide to selling jewellery online — set up your shop, reach international buyers, and grow.",
        category: "Business Guide",
        tags: ["sell jewellery online", "online jewellery business", "jewellery e-commerce"],
        metaKeywords: ["how to sell jewellery online", "start jewellery business online"],
        author: "Orivraa Team",
        authorRole: "Growth & Strategy",
        readTime: "11 min read",
      },
      {
        slug: "jewellery-gst-billing-guide-india",
        title: "GST Billing for Jewellery Shops in India: Complete Guide (2025)",
        excerpt: "Learn about GST rates on gold, making charges, HSN codes, invoice formats, and old gold exchange rules.",
        category: "Tax & Compliance",
        tags: ["GST jewellery", "jewellery billing India", "gold GST rate"],
        metaKeywords: ["GST jewellery India", "jewellery billing", "gold GST rate"],
        author: "Orivraa Team",
        authorRole: "Compliance & Operations",
        readTime: "9 min read",
      },
    ];

    let created = 0;
    for (const d of defaults) {
      const exists = await this.prisma.blogPost.findUnique({
        where: { slug: d.slug },
      });
      if (!exists) {
        await this.prisma.blogPost.create({
          data: {
            ...d,
            content: `<p>Content for "${d.title}" — edit this post in the admin blog manager to add the full article.</p>`,
            metaDescription: d.excerpt,
            isPublished: false,
            publishedAt: new Date(),
          },
        });
        created++;
      }
    }

    return { seeded: created, total: defaults.length };
  }
}
