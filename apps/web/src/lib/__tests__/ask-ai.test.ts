import { ASK_AI_QUESTION, getAskAiHref, getAskAiLinks, getAskAiPrompt } from "../ask-ai";
import { getLlmsTxt } from "../llms-txt";

const SITE = "https://www.orivraa.com";

describe("Ask AI marketing links", () => {
  it("keeps the public question and points assistants at crawlable pages", () => {
    const prompt = getAskAiPrompt(SITE);
    expect(prompt.startsWith(ASK_AI_QUESTION)).toBe(true);
    expect(prompt).toContain(`${SITE}/llms.txt`);
    expect(prompt).toContain(`${SITE}/jewellery-shop-software`);
    expect(prompt).toContain(`${SITE}/ai-integration`);
  });

  it("builds encoded https URLs for ChatGPT, Claude, Gemini, and Perplexity", () => {
    const links = getAskAiLinks(SITE);
    expect(links.map((item) => item.id)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
      "perplexity",
    ]);

    expect(getAskAiHref("chatgpt", SITE)).toMatch(
      /^https:\/\/chatgpt\.com\/\?hints=search&q=/,
    );
    expect(getAskAiHref("claude", SITE)).toMatch(
      /^https:\/\/claude\.ai\/new\?q=/,
    );
    expect(getAskAiHref("gemini", SITE)).toMatch(
      /^https:\/\/gemini\.google\.com\/app\?q=/,
    );
    expect(getAskAiHref("perplexity", SITE)).toMatch(
      /^https:\/\/www\.perplexity\.ai\/search\?q=/,
    );

    for (const link of links) {
      const url = new URL(link.href);
      expect(url.protocol).toBe("https:");
      expect(url.search).toContain(encodeURIComponent("Orivraa"));
    }
  });

  it("publishes an llms.txt brief Googlebot and AI fetchers can read", () => {
    const body = getLlmsTxt(SITE);
    expect(body).toContain("# Orivraa");
    expect(body).toContain(`${SITE}/ask-ai`);
    expect(body).toContain(`${SITE}/ai-integration`);
    expect(body).toContain("inventory:read");
    expect(body).toContain("MCP");
    expect(body).toContain("January 2026");
    expect(body).toContain("10 years");
  });
});
