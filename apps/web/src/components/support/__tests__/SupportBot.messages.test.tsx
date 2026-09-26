import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportBot } from "../SupportBot";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  t: vi.fn((value: string) => `translated:${value}`),
  register: vi.fn(),
  user: null as { role: string; firstName: string } | null,
  hasFeature: () => false,
  dismissChat: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: { post: mocks.post } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: () => ({ planName: "Pro", hasFeature: mocks.hasFeature }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/pricing",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/translation-provider", () => ({
  useT: () => mocks.t,
  useTranslation: () => ({
    locale: "ne",
    t: mocks.t,
    register: mocks.register,
  }),
}));
vi.mock("@/store/help-ui", () => ({
  OPEN_SUPPORT_CHAT_EVENT: "open-support-chat",
  useHelpUIStore: () => ({
    isChatDismissed: false,
    isChatShaking: false,
    dismissChat: mocks.dismissChat,
  }),
}));
vi.mock("@/store/preferences", () => ({
  usePreferencesStore: (
    selector: (state: { dashboardMode: string }) => unknown,
  ) => selector({ dashboardMode: "advanced" }),
}));

const messageKey = "orivraa_chat_messages";
const interruption =
  "Response was interrupted before completion. Please retry.";

function submit(text: string) {
  fireEvent.change(
    screen.getByPlaceholderText("translated:Ask anything about Orivraa..."),
    {
      target: { value: text },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "translated:Send" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.post.mockReset();
  mocks.user = null;
  // Node 26 exposes optional native storage globals even inside jsdom.
  for (const key of ["sessionStorage", "localStorage"]) {
    const data = new Map<string, string>();
    vi.stubGlobal(key, {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: (name: string, value: string) => data.set(name, String(value)),
      removeItem: (name: string) => data.delete(name),
      clear: () => data.clear(),
    });
  }
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("orivraa_chat_open", "true");
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SupportBot message boundaries", () => {
  it("uses only a first name from saved guest personalization", () => {
    localStorage.setItem("orivraa_user_name", "Jane Doe");
    render(<SupportBot />);
    expect(screen.getByText(/Hi, Jane/)).toBeInTheDocument();
    expect(screen.queryByText(/Hi, Jane Doe/)).toBeNull();
  });

  it("does not turn a guest introduction into a full-name greeting or persona", async () => {
    mocks.post.mockResolvedValue({ data: { reply: "Hello!" } });
    render(<SupportBot />);
    submit("My name is Jane Doe");
    expect(await screen.findByText("Hello!")).toBeInTheDocument();
    expect(screen.getByText(/Hi, Jane/)).toBeInTheDocument();
    expect(screen.queryByText(/Hi, Jane Doe/)).toBeNull();
    expect(localStorage.getItem("orivraa_user_name")).toBe("Jane");
    expect(mocks.post.mock.calls[0][1].userName).toBe("Jane");
    expect(screen.getByText("My name is Jane Doe")).toBeInTheDocument();
  });

  it("translates the local welcome and chrome without trusting a saved welcome body", () => {
    sessionStorage.setItem(
      messageKey,
      JSON.stringify([
        { id: "welcome", from: "bot", text: "<T>Untrusted saved welcome</T>" },
        {
          id: "old-reply",
          from: "bot",
          text: "<T>Untrusted model translation</T>",
        },
      ]),
    );
    render(<SupportBot />);
    expect(
      screen.getByText(/translated:I'm the Orivraa AI assistant/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "translated:Close chat" }),
    ).toBeInTheDocument();
    expect(mocks.register).toHaveBeenCalledWith(
      expect.stringContaining("I'm the Orivraa AI assistant"),
    );
    for (const privateText of [
      "Untrusted saved welcome",
      "Untrusted model translation",
    ]) {
      expect(mocks.register).not.toHaveBeenCalledWith(privateText);
      expect(mocks.t).not.toHaveBeenCalledWith(privateText);
    }
  });

  it("keeps user messages as escaped plain text, including Markdown and translation markers", () => {
    const text =
      '**Private** <T>Never translate</T> [click](https://example.com) <img src="x">';
    sessionStorage.setItem(
      messageKey,
      JSON.stringify([{ id: "user", from: "user", text }]),
    );
    render(<SupportBot />);
    const message = screen.getByText(text);
    expect(message.tagName).toBe("P");
    expect(message.querySelector("strong, a, img, t")).toBeNull();
    expect(message).toHaveClass("whitespace-pre-wrap");
    expect(mocks.register).not.toHaveBeenCalledWith("Never translate");
    expect(mocks.t).not.toHaveBeenCalledWith("Never translate");
  });

  it.each([
    [null, "/tickets/ai-chat"],
    ["SHOPKEEPER", "/tickets/seller-chat"],
    ["ADMIN", "/tickets/admin-chat"],
    ["CUSTOMER", "/tickets/assistant-chat"],
  ])(
    "uses the chatbot timeout and interruption notice for %s",
    async (role, endpoint) => {
      mocks.user = role ? { role, firstName: "Asha" } : null;
      mocks.post.mockResolvedValue({
        data: { reply: "```text\nUnfinished response", interrupted: true },
      });
      const view = render(<SupportBot />);
      submit("Explain Workshop features.");

      const status = await screen.findByRole("status");
      await waitFor(() =>
        expect(status).toHaveTextContent(`translated:${interruption}`),
      );
      expect(status.closest("pre, code")).toBeNull();
      expect(mocks.register).toHaveBeenCalledWith(interruption);
      expect(mocks.post).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({ message: "Explain Workshop features." }),
        { timeout: 90_000 },
      );
      await waitFor(() => {
        const messages = JSON.parse(sessionStorage.getItem(messageKey)!);
        expect(messages.at(-1)).toMatchObject({
          from: "bot",
          text: "```text\nUnfinished response",
          interrupted: true,
        });
      });
      view.unmount();
      render(<SupportBot />);
      expect(screen.getByRole("status")).toHaveTextContent(
        `translated:${interruption}`,
      );
      expect(mocks.post).toHaveBeenCalledTimes(1);
    },
  );

  it("persists the full reply and passes it unchanged to the next request's history", async () => {
    const reply = `**Completed answer**\n\n${"A full response with all the details. ".repeat(200)}`;
    mocks.post.mockResolvedValue({ data: { reply, shouldEscalate: false } });
    render(<SupportBot />);
    submit("Explain the workflow.");
    expect((await screen.findByText("Completed answer")).tagName).toBe(
      "STRONG",
    );
    expect(screen.queryByRole("status")).toBeNull();
    await waitFor(() => {
      const messages = JSON.parse(sessionStorage.getItem(messageKey)!);
      expect(
        messages.filter(
          (m: { from: string; id: string }) =>
            m.from === "bot" && m.id !== "welcome",
        ),
      ).toHaveLength(1);
      expect(messages.at(-1).text).toBe(reply);
    });
    submit("What next?");
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
    expect(mocks.post.mock.calls[1][1].history).toContainEqual({
      role: "assistant",
      content: reply,
    });
  });

  it("does not show an interruption notice for explicitly complete responses", async () => {
    mocks.post.mockResolvedValue({
      data: { reply: "**Ready**", interrupted: false, shouldEscalate: true },
    });
    render(<SupportBot />);
    submit("Help me.");
    expect((await screen.findByText("Ready")).tagName).toBe("STRONG");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("link", { name: /WhatsApp \+/ })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/"),
    );
  });

  it("never translates fetched model markup", async () => {
    mocks.post.mockResolvedValue({
      data: {
        reply: "**Model answer**\n\n<T>Fetched private model text</T>",
      },
    });
    render(<SupportBot />);
    submit("Explain this.");
    expect((await screen.findByText("Model answer")).tagName).toBe("STRONG");
    expect(mocks.register).not.toHaveBeenCalledWith(
      "Fetched private model text",
    );
    expect(mocks.t).not.toHaveBeenCalledWith("Fetched private model text");
  });
});
