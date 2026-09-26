import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SupportPage from "../page";

const api = vi.hoisted(() => ({ aiChat: vi.fn(), getPublicContacts: vi.fn() }));
vi.mock("@/lib/api", () => ({ ticketsApi: api }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/layout/DynamicFooter", () => ({ DynamicFooter: () => null }));
vi.mock("@/components/layout/header", () => ({ Header: () => null }));
vi.mock("@/components/ui/T", () => ({ T: ({ children }: { children: string }) => children }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (text: string) => text }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getPublicContacts.mockResolvedValue({ data: [] });
});
afterEach(cleanup);

function submit(text: string) {
  fireEvent.change(screen.getByPlaceholderText("Type your message..."), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("Public Support page chatbot", () => {
  it("renders assistant Markdown, keeps users plain and supplies one stable API session", async () => {
    const reply = "**Jobs**\n\n| Area | Purpose |\n|---|---|\n| Metal | Tracking |";
    api.aiChat.mockResolvedValue({ data: { reply } });
    render(<SupportPage />);
    submit("**Private** <script>never execute</script>");
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Jobs").tagName).toBe("STRONG");
    const userMessage = screen.getByText("**Private** <script>never execute</script>");
    expect(userMessage.tagName).toBe("P");
    expect(userMessage.querySelector("script, strong")).toBeNull();
    const sessionId = api.aiChat.mock.calls[0][0].sessionId;
    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/i);
    submit("What next?");
    await waitFor(() => expect(api.aiChat).toHaveBeenCalledTimes(2));
    expect(api.aiChat.mock.calls[1][0]).toMatchObject({
      sessionId,
      history: [{ role: "user", content: "**Private** <script>never execute</script>" }, { role: "assistant", content: reply }],
    });
  });

  it("shows interruption outside an unfinished code fence", async () => {
    api.aiChat.mockResolvedValue({ data: { reply: "```text\nPartial reply", interrupted: true } });
    render(<SupportPage />);
    submit("Explain Workshop features");
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Response was interrupted before completion. Please retry.");
    expect(status.closest("pre, code")).toBeNull();
  });
});
