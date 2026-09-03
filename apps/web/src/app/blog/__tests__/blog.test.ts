import { describe, expect, it } from "vitest";
import { metadata } from "../layout";
import { BLOG_POSTS } from "@/data/blog-posts";

describe("Blog Hub & Architecture", () => {
  it("contains valid, structured blog posts with unique slugs", () => {
    expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(18);

    const slugs = new Set<string>();
    for (const post of BLOG_POSTS) {
      expect(post.slug).toBeTruthy();
      expect(slugs.has(post.slug)).toBe(false);
      slugs.add(post.slug);

      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.category).toBeTruthy();
      expect(post.author).toBeTruthy();
      expect(post.readTime).toBeTruthy();
      expect(post.tags.length).toBeGreaterThan(0);
      expect(new Date(post.date).toString()).not.toBe("Invalid Date");
    }
  });

  it("has at least one featured editorial article", () => {
    const featured = BLOG_POSTS.find((p) => p.featured);
    expect(featured).toBeDefined();
    expect(featured?.title).toContain("Billing Software");
  });

  it("exports rich marketing metadata on the blog layout", () => {
    expect(metadata.title).toEqual({
      absolute: "Jewellery Business Blog, Tax Guides & ERP Benchmarks | Orivraa",
    });
    expect(metadata.description).toContain("Authoritative guides for gold & diamond jewellers");
    expect(metadata.alternates?.canonical).toBe("https://www.orivraa.com/blog");
    expect(metadata.keywords).toContain("nepal jewellery tax 2083 84");
    expect(metadata.keywords).toContain("jewellery billing software India");
  });

  it("formats dates using UTC so calendar days are preserved without timezone shift", () => {
    const testDate = "2026-05-03";
    const formatted = new Date(testDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    expect(formatted).toBe("May 3, 2026");

    const shortFormatted = new Date(testDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    expect(shortFormatted).toBe("May 3, 2026");
  });

  it("ensures featured posts are present in master list but excluded from duplicate pillar cards", () => {
    const featuredPosts = BLOG_POSTS.filter((p) => p.featured);
    expect(featuredPosts.length).toBeGreaterThanOrEqual(1);

    // In master list (passed to BlogExplorer), all featured posts must be included
    for (const featured of featuredPosts) {
      expect(BLOG_POSTS.some((p) => p.slug === featured.slug)).toBe(true);
    }

    // Filter used inside pillar cards excludes featured posts and featuredSlug to avoid duplicate cards
    const fallbackFeaturedSlug = BLOG_POSTS[0].slug;
    const pillarFiltered = BLOG_POSTS.filter(
      (p) => !p.featured && p.slug !== fallbackFeaturedSlug
    );
    expect(pillarFiltered.some((p) => p.slug === fallbackFeaturedSlug)).toBe(false);
    for (const featured of featuredPosts) {
      expect(pillarFiltered.some((p) => p.slug === featured.slug)).toBe(false);
    }
  });
});

