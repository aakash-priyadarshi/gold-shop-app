import { buildSeoAuditPathList } from "./seo-audit-routes";

describe("buildSeoAuditPathList", () => {
  const generated = [
    "/",
    "/ai-integration",
    "/ask-ai",
    "/shop",
    "/shops",
    "/designs",
    "/sentry-example-page",
    "/dashboard/admin",
  ];

  it("includes MCP marketing pages and supplemental about/blog routes", () => {
    const paths = buildSeoAuditPathList(generated, {
      customerFlowEnabled: false,
      useFallback: false,
    });

    expect(paths).toContain("/ai-integration");
    expect(paths).toContain("/ask-ai");
    expect(paths).toContain("/blog");
    expect(paths).toContain("/about/ne");
    expect(paths).not.toContain("/sentry-example-page");
    expect(paths).not.toContain("/dashboard/admin");
  });

  it("drops B2C marketplace routes when customer flow is disabled", () => {
    const paths = buildSeoAuditPathList(generated, {
      customerFlowEnabled: false,
      useFallback: false,
    });

    expect(paths).not.toContain("/shop");
    expect(paths).not.toContain("/shops");
    expect(paths).not.toContain("/designs");
  });

  it("keeps B2C marketplace routes when customer flow is enabled", () => {
    const paths = buildSeoAuditPathList(generated, {
      customerFlowEnabled: true,
      useFallback: false,
    });

    expect(paths).toContain("/shop");
    expect(paths).toContain("/shops");
    expect(paths).toContain("/designs");
  });

  it("uses fallback routes when generated list is empty", () => {
    const paths = buildSeoAuditPathList([], {
      customerFlowEnabled: false,
      useFallback: true,
    });

    expect(paths.length).toBeGreaterThan(40);
    expect(paths).toContain("/compare/orivraa-vs-tally");
    expect(paths).toContain("/tutorial/hi");
  });
});
