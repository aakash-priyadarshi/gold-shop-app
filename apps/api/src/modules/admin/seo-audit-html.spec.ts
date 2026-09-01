import { countH1Tags, decodeHtmlEntities, stripNoscriptBlocks } from "./seo-audit-html";

describe("seo-audit-html", () => {
  it("decodes entities before length scoring", () => {
    expect(decodeHtmlEntities("POS &amp; Marketplace | Orivraa")).toBe(
      "POS & Marketplace | Orivraa",
    );
    expect(decodeHtmlEntities("d&#x27;Orivraa")).toBe("d'Orivraa");
  });

  it("ignores the global noscript fallback h1", () => {
    const html = `
      <noscript><h1>Orivraa — Premium Jewellery Marketplace</h1></noscript>
      <h1>Privacy Policy</h1>
    `;
    expect(countH1Tags(html)).toBe(1);
    expect(stripNoscriptBlocks(html)).not.toContain("Premium Jewellery Marketplace");
  });
});
