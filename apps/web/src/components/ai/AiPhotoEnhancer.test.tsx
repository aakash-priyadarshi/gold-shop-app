import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiPhotoEnhancer } from "./AiPhotoEnhancer";
import { aiCreditsApi, inventoryApi } from "@/lib/api";

vi.mock("next/image", () => ({
  default: ({ fill: _fill, unoptimized: _unoptimized, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt ?? ""} {...props} />
    ),
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: () => ({ hasFeature: () => true, loading: false }),
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/lib/api", () => ({
  aiCreditsApi: { getBalance: vi.fn() },
  inventoryApi: { enhanceImages: vi.fn() },
}));

const images = [
  "https://images.orivraa.com/product/one.jpg",
  "https://images.orivraa.com/product/two.jpg",
];

describe("AiPhotoEnhancer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiCreditsApi.getBalance).mockResolvedValue({
      data: { balance: 20 },
    } as never);
  });

  it("blocks the request and shows the purchase notice when balance is low", async () => {
    vi.mocked(aiCreditsApi.getBalance).mockResolvedValue({
      data: { balance: 1 },
    } as never);
    render(
      <AiPhotoEnhancer
        shopId="shop-1"
        images={[images[0]]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enhance" }));
    await waitFor(() => expect(aiCreditsApi.getBalance).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Enhance and review" }));

    expect(await screen.findByText("Buy more credits here")).toBeInTheDocument();
    expect(inventoryApi.enhanceImages).not.toHaveBeenCalled();
  });

  it("replaces only the accepted source image", async () => {
    vi.mocked(inventoryApi.enhanceImages).mockResolvedValue({
      data: {
        creditsCharged: 2,
        creditsRefunded: 0,
        balanceAfter: 18,
        results: [
          {
            sourceUrl: images[0],
            status: "success",
            enhancedUrl: "https://images.orivraa.com/product/enhanced.jpg",
          },
        ],
      },
    } as never);
    const onChange = vi.fn();
    render(
      <AiPhotoEnhancer
        shopId="shop-1"
        images={images}
        targetIndex={0}
        trigger="icon"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enhance" }));
    fireEvent.click(screen.getByRole("button", { name: "Enhance and review" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use enhanced" }));

    expect(onChange).toHaveBeenCalledWith([
      "https://images.orivraa.com/product/enhanced.jpg",
      images[1],
    ]);
    expect(inventoryApi.enhanceImages).toHaveBeenCalledWith(
      "shop-1",
      expect.objectContaining({
        imageUrls: [images[0]],
        referenceImageUrls: [images[1]],
      }),
    );
  });

  it("keeps successful results usable when a bulk target fails", async () => {
    vi.mocked(inventoryApi.enhanceImages).mockResolvedValue({
      data: {
        creditsCharged: 4,
        creditsRefunded: 2,
        balanceAfter: 18,
        results: [
          {
            sourceUrl: images[0],
            status: "success",
            enhancedUrl: "https://images.orivraa.com/product/enhanced.jpg",
          },
          {
            sourceUrl: images[1],
            status: "failed",
            error: "Could not enhance this photo. Try again.",
          },
        ],
      },
    } as never);
    render(
      <AiPhotoEnhancer shopId="shop-1" images={images} onChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enhance all" }));
    fireEvent.click(screen.getByRole("button", { name: "Enhance and review" }));

    expect(await screen.findByRole("button", { name: "Use enhanced" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Could not enhance this photo. Try again.")).toBeInTheDocument();
  });
});
