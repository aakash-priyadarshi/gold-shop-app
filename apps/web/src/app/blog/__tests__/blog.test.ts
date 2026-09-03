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
});
