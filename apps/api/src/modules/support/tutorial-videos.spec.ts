import { TUTORIAL_VIDEO_LINKS, TUTORIAL_VIDEO_LOCALE_CODES } from "./tutorial-videos";

describe("chatbot tutorial video links", () => {
  it("only advertises locales the Cloudflare demo worker can serve", () => {
    expect(TUTORIAL_VIDEO_LINKS).toHaveLength(12);
    expect(TUTORIAL_VIDEO_LOCALE_CODES).not.toContain("si");
    expect(TUTORIAL_VIDEO_LOCALE_CODES).not.toContain("he");
    expect(TUTORIAL_VIDEO_LINKS.map((link) => link.url)).not.toEqual(
      expect.arrayContaining([
        "https://orivraa.com/tutorial/si",
        "https://orivraa.com/tutorial/he",
      ]),
    );
  });
});
