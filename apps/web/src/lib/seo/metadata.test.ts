import {
  absolutePageTitle,
  brandPageTitle,
  buildMarketingMetadata,
  openGraphLocaleForLang,
} from "./metadata";

describe("brandPageTitle", () => {
  it("adds the brand once for unbranded titles", () => {
    expect(brandPageTitle("Jewellery Shop Software with Mobile POS")).toBe(
      "Jewellery Shop Software with Mobile POS | Orivraa",
    );
  });

  it("does not double-append when the title already names Orivraa", () => {
    expect(
      brandPageTitle("Orivraa - Jewellery ERP, POS Software & Bullion Tracker"),
    ).toBe("Orivraa - Jewellery ERP, POS Software & Bullion Tracker");
    expect(brandPageTitle("About Orivraa | Orivraa")).toBe("About Orivraa");
  });

  it("strips a trailing 2026 brand suffix before branding once", () => {
    expect(brandPageTitle("Mobile POS | Orivraa 2026")).toBe(
      "Mobile POS | Orivraa",
    );
  });

  it("returns an absolute Next.js title object", () => {
    expect(absolutePageTitle("Privacy Policy")).toEqual({
      absolute: "Privacy Policy | Orivraa",
    });
  });
});

describe("openGraphLocaleForLang", () => {
  it("maps language codes to territory-qualified Open Graph locales", () => {
    expect(openGraphLocaleForLang("fr")).toBe("fr_FR");
    expect(openGraphLocaleForLang("hi")).toBe("hi_IN");
    expect(openGraphLocaleForLang("yi")).toBe("yi_IL");
    expect(openGraphLocaleForLang("en")).toBe("en_US");
  });

  it("falls back to en_US for unknown languages and prototype properties", () => {
    expect(openGraphLocaleForLang("xx")).toBe("en_US");
    expect(openGraphLocaleForLang("toString")).toBe("en_US");
    expect(openGraphLocaleForLang("constructor")).toBe("en_US");
    expect(openGraphLocaleForLang("__proto__")).toBe("en_US");
  });
});

describe("buildMarketingMetadata", () => {
  it("defaults to website Open Graph metadata without videos", () => {
    const metadata = buildMarketingMetadata({
      title: "Pricing",
      description: "Plans for jewellery shops",
      path: "/pricing",
    });

    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "en_US",
    });
    expect(metadata.openGraph).not.toHaveProperty("videos");
  });

  it("omits videos and defaults to website type when videos array is empty", () => {
    const metadata = buildMarketingMetadata({
      title: "Pricing",
      description: "Plans for jewellery shops",
      path: "/pricing",
      videos: [],
    });

    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "en_US",
    });
    expect(metadata.openGraph).not.toHaveProperty("videos");
  });

  it("emits video-specific Open Graph metadata when videos are provided", () => {
    const videos = [
      {
        url: "https://images.orivraa.com/demo/en",
        secureUrl: "https://images.orivraa.com/demo/en",
        type: "video/mp4",
      },
    ];
    const metadata = buildMarketingMetadata({
      title: "Demo",
      description: "Watch the demo",
      path: "/demo",
      videos,
    });

    expect(metadata.openGraph).toMatchObject({
      type: "video.other",
      videos,
    });
  });

  it("preserves an explicit locale such as en_GB", () => {
    const metadata = buildMarketingMetadata({
      title: "UK jewellery software",
      description: "VAT-ready POS",
      path: "/uk/jewellery-shop-software",
      locale: "en_GB",
    });

    expect(metadata.openGraph).toMatchObject({
      locale: "en_GB",
      type: "website",
    });
  });
});
