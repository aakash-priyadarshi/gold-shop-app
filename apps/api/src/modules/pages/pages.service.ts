import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePageDto, UpdatePageDto } from "./dto/page.dto";

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a published page by slug (public)
   */
  async getBySlug(slug: string) {
    const page = await this.prisma.staticPage.findUnique({
      where: { slug },
    });

    if (!page || !page.isPublished) {
      throw new NotFoundException(`Page "${slug}" not found`);
    }

    return page;
  }

  /**
   * List all pages (admin) — includes unpublished
   */
  async listAll() {
    return this.prisma.staticPage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Create a new page (admin)
   */
  async create(dto: CreatePageDto) {
    // Check if slug already exists
    const existing = await this.prisma.staticPage.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `A page with slug "${dto.slug}" already exists`,
      );
    }

    return this.prisma.staticPage.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        metaDescription: dto.metaDescription || null,
        isPublished: dto.isPublished ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  /**
   * Update a page (admin)
   */
  async update(id: string, dto: UpdatePageDto) {
    const page = await this.prisma.staticPage.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException("Page not found");
    }

    // If slug is being changed, check for conflicts
    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.staticPage.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
      }
    }

    return this.prisma.staticPage.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a page (admin)
   */
  async delete(id: string) {
    const page = await this.prisma.staticPage.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException("Page not found");
    }

    await this.prisma.staticPage.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Seed default pages with placeholder content
   */
  async seedDefaults() {
    const defaults = [
      {
        slug: "privacy",
        title: "Privacy Policy",
        content:
          "<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy outlines how we collect, use, and protect your personal information when you use Orivraa.</p><h2>Information We Collect</h2><p>We collect information you provide directly, such as your name, email address, phone number, and shipping address when you create an account or place an order.</p><h2>How We Use Your Information</h2><p>We use your information to process orders, communicate with you, improve our services, and comply with legal obligations.</p><h2>Data Security</h2><p>We implement industry-standard security measures to protect your personal data.</p><h2>Contact Us</h2><p>If you have questions about this policy, please contact our support team.</p>",
        metaDescription:
          "Orivraa Privacy Policy - How we collect, use, and protect your data",
      },
      {
        slug: "terms",
        title: "Terms & Conditions",
        content:
          "<h1>Terms & Conditions</h1><p>Welcome to Orivraa. By using our platform, you agree to these terms and conditions.</p><h2>Account Terms</h2><p>You must be at least 18 years old to create an account. You are responsible for maintaining the security of your account.</p><h2>Marketplace Rules</h2><p>All jewelry listed on Orivraa must be authentic. Sellers must provide accurate descriptions and images of their products.</p><h2>Orders & Payments</h2><p>All orders are subject to availability and confirmation. Prices are displayed in your local currency based on current market rates.</p><h2>Intellectual Property</h2><p>All content on Orivraa, including designs, logos, and text, is protected by intellectual property laws.</p>",
        metaDescription:
          "Orivraa Terms & Conditions - Rules and guidelines for using our marketplace",
      },
      {
        slug: "refund",
        title: "Refund Policy",
        content:
          "<h1>Refund Policy</h1><p>We want you to be completely satisfied with your purchase from Orivraa.</p><h2>Return Window</h2><p>You may request a return within 7 days of receiving your order. Items must be in their original condition with all packaging.</p><h2>Refund Process</h2><p>Once we receive and inspect your return, we will process your refund within 5-10 business days. Refunds are issued to the original payment method.</p><h2>Non-Returnable Items</h2><p>Custom-made jewelry, engraved items, and items that have been worn or altered cannot be returned.</p><h2>Damaged Items</h2><p>If you receive a damaged item, please contact us immediately with photos. We will arrange a replacement or full refund.</p>",
        metaDescription:
          "Orivraa Refund Policy - Returns, exchanges, and refund guidelines",
      },
      {
        slug: "partner",
        title: "Partner With Us",
        content:
          "<h1>Partner With Orivraa</h1><p>Join the leading jewellery marketplace and grow your business with us.</p><h2>Why Partner?</h2><ul><li>Access to thousands of verified buyers</li><li>AI-powered tools for pricing and inventory management</li><li>Secure payment processing</li><li>Dedicated seller support</li></ul><h2>Partnership Types</h2><h3>Retail Sellers</h3><p>List your jewelry products and reach customers across multiple countries.</p><h3>Wholesale Partners</h3><p>Supply materials and components to our network of jewelers.</p><h3>Technology Partners</h3><p>Integrate with our platform to provide services to our seller community.</p><h2>Get Started</h2><p>Contact us to learn more about partnership opportunities.</p>",
        metaDescription:
          "Partner with Orivraa - Grow your jewellery business on our marketplace",
      },
      {
        slug: "seller-guide",
        title: "Seller Guide",
        content:
          "<h1>Seller Guide</h1><p>Everything you need to know about selling on Orivraa.</p><h2>Getting Started</h2><ol><li>Create your seller account</li><li>Complete your shop profile</li><li>Add your products with photos and descriptions</li><li>Set your pricing based on metal rates</li></ol><h2>Listing Best Practices</h2><ul><li>Use high-quality photos from multiple angles</li><li>Write detailed, accurate descriptions</li><li>Keep your inventory up to date</li><li>Respond to inquiries within 24 hours</li></ul><h2>Pricing</h2><p>Our platform provides real-time metal rates to help you price your products accurately. You can set your own making charges and margins.</p><h2>Order Fulfillment</h2><p>Process orders promptly and provide tracking information. Maintain a high fulfillment rate to achieve better seller rankings.</p>",
        metaDescription:
          "Orivraa Seller Guide - How to sell jewelry on our marketplace",
      },
      {
        slug: "pricing",
        title: "Pricing",
        content:
          "<h1>Our Pricing</h1><p>Transparent pricing for buyers and sellers.</p><h2>For Buyers</h2><p>Browse and purchase jewelry at competitive prices. All prices include real-time metal rates and are displayed in your local currency.</p><h2>For Sellers</h2><h3>Free Plan</h3><ul><li>List up to 15 products</li><li>Basic analytics</li><li>Standard support</li></ul><h3>Pro Plan</h3><ul><li>Local country pricing starting from ₹299/month in India</li><li>Unlimited product listings</li><li>Advanced analytics and insights</li><li>GSTIN-ready billing and tax reports</li><li>Priority support</li><li>Featured placement</li></ul><h2>Commission</h2><p>A small commission is charged on each successful sale. This covers payment processing, platform maintenance, and buyer protection.</p>",
        metaDescription:
          "Orivraa Pricing - Plans and commission structure for sellers",
      },
      {
        slug: "support",
        title: "Support",
        content:
          '<h1>Support Center</h1><p>We are here to help you with any questions or issues.</p><h2>Contact Us</h2><p>Email: support@orivraa.com</p><p>Phone: Available during business hours</p><h2>FAQs</h2><h3>How do I track my order?</h3><p>Log in to your account and visit the Orders section to see real-time tracking information.</p><h3>How do I return an item?</h3><p>Visit our Refund Policy page for detailed return instructions.</p><h3>How do I become a seller?</h3><p>Click on "Register as Seller" and complete the verification process.</p><h2>Report an Issue</h2><p>If you encounter any technical issues, please visit our Help Center to submit a support ticket.</p>',
        metaDescription:
          "Orivraa Support Center - Get help with orders, accounts, and more",
      },
    ];

    const results = [];
    for (const page of defaults) {
      const existing = await this.prisma.staticPage.findUnique({
        where: { slug: page.slug },
      });

      if (existing) {
        // Update existing
        await this.prisma.staticPage.update({
          where: { slug: page.slug },
          data: { ...page, isPublished: true },
        });
        results.push({ slug: page.slug, action: "updated" });
      } else {
        await this.prisma.staticPage.create({
          data: { ...page, isPublished: true },
        });
        results.push({ slug: page.slug, action: "created" });
      }
    }

    return { seeded: results };
  }
}
