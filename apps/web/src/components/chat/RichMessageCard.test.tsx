import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichMessageCard } from "./RichMessageCard";

vi.mock("@/components/support-access/SupportAccessPanel", () => ({
  SupportGrantCard: ({ grantId }: { grantId: string }) => (
    <div>Grant {grantId}</div>
  ),
}));

describe("support access chat cards", () => {
  it("renders the support card for a valid grant", () => {
    render(
      <RichMessageCard
        messageType="SUPPORT_ACCESS"
        payload={{ grantId: "grant-1" }}
        content="Support access requested"
      />,
    );
    expect(screen.getByText("Grant grant-1")).toBeInTheDocument();
  });

  it("falls back to message text when the grant payload is invalid", () => {
    render(
      <RichMessageCard
        messageType="SUPPORT_ACCESS"
        payload={{}}
        content="Support access requested"
      />,
    );
    expect(screen.getByText("Support access requested")).toBeInTheDocument();
  });

  it("falls back to message text when the grant id is empty", () => {
    render(
      <RichMessageCard
        messageType="SUPPORT_ACCESS"
        payload={{ grantId: "   " }}
        content="Support access requested"
      />,
    );
    expect(screen.getByText("Support access requested")).toBeInTheDocument();
    expect(screen.queryByText(/^Grant /)).not.toBeInTheDocument();
  });
});
