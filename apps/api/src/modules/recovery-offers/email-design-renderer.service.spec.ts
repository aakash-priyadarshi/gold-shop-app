import { ValidationPipe } from "@nestjs/common";
import { SaveOfferCampaignEmailDesignDto } from "./dto/recovery-offer.dto";
import { EmailDesignRendererService } from "./email-design-renderer.service";
import {
  OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES,
  parseOfferEmailDesign,
} from "./email-design";

const baseOptions = {
  unsubscribeUrl:
    "https://api.orivraa.com/api/recovery-offers/unsubscribe?token=abc",
  campaignName: "AI product photo studio",
  firstName: "Owner",
  brandIconUrl: "https://www.orivraa.com/favicon/android-chrome-192x192.png",
};

describe("parseOfferEmailDesign", () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  function validateRequest(blocks: unknown) {
    return validationPipe.transform(
      { emailSubject: "See the product update", blocks },
      { type: "body", metatype: SaveOfferCampaignEmailDesignDto },
    );
  }

  it("preserves every block type through the production validation pipe", async () => {
    const blocks = [
      { type: "heading", text: "See it in action", animation: "fadeIn" },
      { type: "text", text: "A **new** workflow.", align: "center" },
      {
        type: "image",
        url: "https://images.orivraa.com/email/demo.gif",
        alt: "Demo",
      },
      {
        type: "video",
        posterUrl: "https://images.orivraa.com/email/poster.png",
        videoUrl:
          "https://www.orivraa.com/jewellery-shop-software#ai-photo-studio",
        label: "Watch the demo",
      },
      { type: "button", label: "Try it", url: "https://www.orivraa.com/demo" },
      { type: "divider" },
      { type: "spacer", size: 32 },
    ];
    const dto = await validateRequest(blocks);
    expect(dto.blocks).toEqual(blocks);
    expect(parseOfferEmailDesign(dto)).toEqual(
      parseOfferEmailDesign({ blocks }),
    );
  });

  it.each([null, "heading", 1, [], ["heading"]].map((block) => ({ block })))(
    "still rejects malformed blocks after DTO transformation: $block",
    async ({ block }) => {
      const dto = await validateRequest([block]);
      expect(() => parseOfferEmailDesign(dto)).toThrow(
        "Block 1 must be an object",
      );
    },
  );

  it.each([
    { type: "heading", text: 123 },
    { type: "spacer", size: "32" },
    {
      type: "video",
      posterUrl: "https://example.com/a.png",
      videoUrl: "javascript:alert(1)",
    },
  ])("does not coerce or accept invalid block fields: %j", async (block) => {
    const dto = await validateRequest([block]);
    expect(() => parseOfferEmailDesign(dto)).toThrow();
  });

  it("normalizes and rebuilds a valid block list", () => {
    const design = parseOfferEmailDesign({
      blocks: [
        { type: "heading", text: "  Studio photos  ", animation: "slideUp" },
        { type: "text", text: "Tap **Enhance**.", align: "center" },
        {
          type: "image",
          url: "https://images.orivraa.com/email/demo.gif",
          alt: "Demo",
          linkUrl: "https://www.orivraa.com/jewellery-shop-software",
        },
        {
          type: "video",
          posterUrl: "https://images.orivraa.com/email/poster.png",
          videoUrl: "https://images.orivraa.com/email/demo.mp4",
          label: "Watch the demo",
        },
        { type: "button", label: "Try it", url: "https://www.orivraa.com/x" },
        { type: "divider" },
        { type: "spacer", size: 32 },
      ],
    });
    expect(design.blocks).toHaveLength(7);
    expect(design.blocks[0]).toEqual({
      type: "heading",
      text: "Studio photos",
      animation: "slideUp",
    });
  });

  it("rejects non-https and malformed URLs", () => {
    expect(() =>
      parseOfferEmailDesign({
        blocks: [
          { type: "image", url: "http://images.orivraa.com/a.gif", alt: "x" },
        ],
      }),
    ).toThrow(/https URL/i);
    expect(() =>
      parseOfferEmailDesign({
        blocks: [{ type: "button", label: "x", url: "javascript:alert(1)" }],
      }),
    ).toThrow(/https URL/i);
    expect(() =>
      parseOfferEmailDesign({
        blocks: [{ type: "image", url: "not a url", alt: "x" }],
      }),
    ).toThrow(/valid URL/i);
  });

  it("rejects unknown block types, empty blocks, and oversize arrays", () => {
    expect(() =>
      parseOfferEmailDesign({ blocks: [{ type: "nonsense" }] }),
    ).toThrow(/unknown block type/i);
    expect(() => parseOfferEmailDesign({ blocks: [] })).toThrow(
      /at least one block/i,
    );
    expect(() =>
      parseOfferEmailDesign({
        blocks: Array.from({ length: 41 }, () => ({ type: "divider" })),
      }),
    ).toThrow(/up to 40 blocks/i);
  });

  it("enforces per-type length limits", () => {
    expect(() =>
      parseOfferEmailDesign({
        blocks: [{ type: "heading", text: "x".repeat(121) }],
      }),
    ).toThrow(/120 characters or fewer/i);
    expect(() =>
      parseOfferEmailDesign({ blocks: [{ type: "text", text: "" }] }),
    ).toThrow(/required/i);
    expect(() =>
      parseOfferEmailDesign({ blocks: [{ type: "spacer", size: 4 }] }),
    ).toThrow(/between 8 and 120/i);
  });
});

describe("EmailDesignRendererService", () => {
  const renderer = new EmailDesignRendererService();

  it("renders every block type with inline styles and no scripts", () => {
    const { html, bytes } = renderer.render(
      parseOfferEmailDesign({
        blocks: [
          { type: "heading", text: "Studio photos in one tap" },
          {
            type: "text",
            text: "Watch the demo, then try **Enhance**.\n\nMade for *gold shops*.",
          },
          {
            type: "image",
            url: "https://images.orivraa.com/email/demo.gif",
            alt: "Photo studio demo",
            linkUrl: "https://www.orivraa.com/jewellery-shop-software",
          },
          {
            type: "video",
            posterUrl: "https://images.orivraa.com/email/poster.png",
            videoUrl: "https://images.orivraa.com/email/demo.mp4",
          },
          {
            type: "button",
            label: "Open the catalog",
            url: "https://www.orivraa.com/dashboard/shop/products",
            variant: "secondary",
          },
          { type: "divider" },
          { type: "spacer", size: 24 },
        ],
      }).blocks,
      baseOptions,
    );

    expect(html).toContain("Studio photos in one tap");
    expect(html).toContain("<strong>Enhance</strong>");
    expect(html).toContain("<em>gold shops</em>");
    expect(html).toContain('src="https://images.orivraa.com/email/demo.gif"');
    expect(html).toContain(
      'href="https://www.orivraa.com/jewellery-shop-software"',
    );
    expect(html).toContain("https://images.orivraa.com/email/demo.mp4");
    expect(html).toContain("&#9654;"); // play glyph on the video CTA
    expect(html).toContain("Unsubscribe from future offers");
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES);
    expect(html).not.toContain("<script");
  });

  it("escapes HTML in text so injected markup cannot survive", () => {
    const { html } = renderer.render(
      parseOfferEmailDesign({
        blocks: [
          {
            type: "text",
            text: "Hello <script>alert(1)</script> & friends",
          },
        ],
      }).blocks,
      baseOptions,
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does not linkify non-https markdown links", () => {
    const { html } = renderer.render(
      parseOfferEmailDesign({
        blocks: [
          {
            type: "text",
            text: "See [the demo](http://www.orivraa.com/demo).",
          },
        ],
      }).blocks,
      baseOptions,
    );
    expect(html).not.toContain('href="http://www.orivraa.com/demo"');
  });

  it("emits @keyframes only for animated blocks", () => {
    const animated = renderer.render(
      parseOfferEmailDesign({
        blocks: [
          { type: "heading", text: "New", animation: "fadeIn" },
          { type: "text", text: "Body", animation: "slideUp" },
        ],
      }).blocks,
      baseOptions,
    );
    expect(animated.html).toContain("@keyframes orvFadeIn");
    expect(animated.html).toContain("@keyframes orvSlideUp");
    expect(animated.html).toContain('class="orv-anim-fadeIn"');

    const staticRender = renderer.render(
      parseOfferEmailDesign({
        blocks: [{ type: "heading", text: "New" }],
      }).blocks,
      baseOptions,
    );
    expect(staticRender.html).not.toContain("@keyframes");
  });

  it("renders the greeting and campaign label from options", () => {
    const { html } = renderer.render(
      parseOfferEmailDesign({ blocks: [{ type: "divider" }] }).blocks,
      baseOptions,
    );
    expect(html).toContain("Hi Owner,");
    expect(html).toContain("AI product photo studio");
    expect(html).toContain(baseOptions.unsubscribeUrl);
  });
});
