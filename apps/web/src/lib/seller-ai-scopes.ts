/** Seller AI MCP scopes — shared by dashboard and marketing copy. */
export const SELLER_AI_SCOPES = [
  {
    value: "inventory:read",
    label: "Read inventory",
    description: "Search stock, SKU, weight, price, and availability.",
  },
  {
    value: "inventory:write",
    label: "Propose inventory edits",
    description:
      "Draft price, description, label, or stock changes for your approval.",
  },
  {
    value: "orders:read",
    label: "Read orders",
    description: "List orders without exposing customer email or phone.",
  },
  {
    value: "orders:write",
    label: "Propose order status edits",
    description: "Draft a non-financial status update for your approval.",
  },
] as const;

export const SELLER_AI_MCP_CLIENTS = [
  { id: "claude", name: "Anthropic Claude" },
  { id: "chatgpt", name: "OpenAI ChatGPT" },
] as const;
