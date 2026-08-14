export type ChatAudience = "public" | "dashboard" | "admin";

export const CHAT_LIMITS: Record<
  ChatAudience,
  {
    maxInput: number;
    maxReply: number;
    maxHistory: number;
    historyItemChars: number;
    maxOutputTokens: number;
    hourlyMessages: number;
  }
> = {
  public: {
    maxInput: 500,
    maxReply: 400,
    maxHistory: 8,
    historyItemChars: 400,
    maxOutputTokens: 180,
    hourlyMessages: 20,
  },
  dashboard: {
    maxInput: 1500,
    maxReply: 1200,
    maxHistory: 12,
    historyItemChars: 800,
    maxOutputTokens: 500,
    hourlyMessages: 60,
  },
  admin: {
    maxInput: 2000,
    maxReply: 1800,
    maxHistory: 16,
    historyItemChars: 1000,
    maxOutputTokens: 700,
    hourlyMessages: 120,
  },
};

const JAILBREAK =
  /ignore (all |the |any )?(previous|prior|above) instructions|forget (your|all) (rules|instructions)|you are now |developer mode|dan mode|unlock (hidden|developer)|reveal (your )?(system|hidden) (prompt|instructions)|print your prompt/i;

const PRIVACY_PROBE =
  /\b(list|show|give|tell|dump|export|leak)\b.{0,60}\b(all )?(users?|customers?|sellers?|shopkeepers?|emails?|phone numbers?|passwords?|invoices?)\b|\bwho is\b.{0,40}@|\b(other|another) (user|shop|seller|customer|account)\b.{0,40}\b(name|email|phone|details|data)\b/i;

export function audienceForRole(viewerRole?: string): ChatAudience {
  const role = (viewerRole || "").toUpperCase();
  if (role === "ADMIN") return "admin";
  if (role === "SHOPKEEPER" || role === "CUSTOMER" || role === "SUPPORT" || role === "SALES") {
    return "dashboard";
  }
  return "public";
}

export function looksLikeJailbreak(text: string): boolean {
  return JAILBREAK.test(text);
}

export function looksLikeDataDump(text: string): boolean {
  const emails = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [];
  if (emails.length >= 3) return true;
  const lines = text.split("\n").length;
  if (lines > 40) return true;
  const jsonish =
    (text.includes("{") && text.includes("}") && text.length > 800) ||
    (text.includes("[") && text.includes("]") && text.length > 800);
  return jsonish;
}

/** Public / customer probes for other people's PII. */
export function isCrossUserPrivacyProbe(text: string): boolean {
  return PRIVACY_PROBE.test(text);
}

export function clampReply(text: string, maxChars: number): string {
  const trimmed = (text || "").trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, Math.max(0, maxChars - 1));
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

export function sanitizeHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  maxItems: number,
  itemChars: number,
): Array<{ role: "user" | "assistant"; content: string }> {
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-maxItems)
    .map((m) => ({
      role: m.role,
      content: m.content.length > itemChars ? `${m.content.slice(0, itemChars)}…` : m.content,
    }));
}

export const PUBLIC_PRIVACY_REFUSAL =
  "I don't have access to other people's accounts or personal data. I only answer Orivraa product questions for you in this chat.";

export const DASHBOARD_PRIVACY_REFUSAL =
  "I can only talk about your own signed-in account and shop. I can't look up or share another user's name, email, or records.";
