import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiPhotoStudioDemo } from "./AiPhotoStudioSpotlight";

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("AiPhotoStudioDemo", () => {
  it("shows a static before and after split when motion is reduced", () => {
    render(<AiPhotoStudioDemo />);
    expect(screen.getByText("Product catalog")).toBeInTheDocument();
    expect(
      screen.getByText("Shop photo left · studio result right"),
    ).toBeInTheDocument();
    const imgs = document.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", "/marketing/ai-photo-before.png");
    expect(imgs[1]).toHaveAttribute("src", "/marketing/ai-photo-after.png");
  });
});
