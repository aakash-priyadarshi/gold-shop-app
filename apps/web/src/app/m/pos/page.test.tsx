import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobilePOSPage from "./page";
import { aiCreditsApi, inventoryApi } from "@/lib/api";

const uploadHarness = vi.hoisted(() => ({
  onSuccess: undefined as
    | ((result: { url?: string }) => void)
    | undefined,
  uploadMultiple: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));

vi.mock("@/components/mobile/MobileFeatureGate", () => ({
  MobileFeatureGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/mobile/BarcodeScannerSheet", () => ({
  BarcodeScannerSheet: () => null,
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

vi.mock("@/components/ai/AiImageModelPicker", () => ({
  AiImageModelPicker: () => null,
}));

vi.mock("@/components/ai/AiCreditsDepletedNotice", () => ({
  AiCreditCostHint: () => null,
  AiCreditsDepletedNotice: () => null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      shop: { id: "shop-1", country: "NP", currency: "NPR" },
    },
  }),
}));

vi.mock("@/hooks/useBarcodeScanner", () => ({
  useBarcodeScanner: vi.fn(),
}));

vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: () => ({ hasFeature: () => true, loading: false }),
}));

vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => vi.fn(),
}));

vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: (options: { onSuccess: (result: { url?: string }) => void }) => {
    uploadHarness.onSuccess = options.onSuccess;
    return {
      uploading: false,
      progress: 0,
      uploadMultiple: uploadHarness.uploadMultiple,
    };
  },
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

vi.mock("@/lib/api", () => ({
  aiCreditsApi: { getBalance: vi.fn() },
  inventoryApi: {
    create: vi.fn(),
    enhanceImages: vi.fn(),
    getShopInventory: vi.fn(),
  },
  shopQuotesApi: {},
}));

const sourceImages = [
  "https://images.orivraa.com/product/one.jpg",
  "https://images.orivraa.com/product/two.jpg",
  "https://images.orivraa.com/product/three.jpg",
];

async function renderAddProductWithThreePhotos() {
  render(<MobilePOSPage />);
  fireEvent.click(screen.getByRole("button", { name: "Add product" }));

  await waitFor(() => expect(uploadHarness.onSuccess).toBeTypeOf("function"));
  act(() => {
    sourceImages.forEach((url) => uploadHarness.onSuccess?.({ url }));
  });

  await waitFor(() =>
    expect(
      screen.getAllByRole("img", { name: /^Product photo \d$/ }),
    ).toHaveLength(3),
  );
}

function productPhotoUrls() {
  return screen
    .getAllByRole("img", { name: /^Product photo \d$/ })
    .map((image) => image.getAttribute("src"));
}

describe("mobile POS product photo enhancement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadHarness.onSuccess = undefined;
    vi.mocked(aiCreditsApi.getBalance).mockResolvedValue({
      data: { balance: 20 },
    } as never);
    vi.mocked(inventoryApi.getShopInventory).mockResolvedValue({
      data: { items: [] },
    } as never);
  });

  it("blocks a fourth image in the photo header flow while allowing replacements", async () => {
    const enhancedImages = sourceImages.map(
      (_, index) => `https://images.orivraa.com/product/header-${index + 1}.jpg`,
    );
    vi.mocked(inventoryApi.enhanceImages).mockResolvedValue({
      data: {
        creditsCharged: 6,
        creditsRefunded: 0,
        balanceAfter: 14,
        results: sourceImages.map((sourceUrl, index) => ({
          sourceUrl,
          status: "success",
          enhancedUrl: enhancedImages[index],
        })),
      },
    } as never);
    await renderAddProductWithThreePhotos();

    fireEvent.click(screen.getByRole("button", { name: "Enhance all" }));
    await waitFor(() => expect(aiCreditsApi.getBalance).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Enhance and review" }));

    const keepBothButtons = await screen.findAllByRole("button", {
      name: "Keep both",
    });
    keepBothButtons.forEach((button) => expect(button).toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "Use all enhanced" }));
    await waitFor(() => expect(productPhotoUrls()).toEqual(enhancedImages));
  });

  it("blocks a fourth image in the per-photo icon flow while allowing replacement", async () => {
    const enhancedUrl = "https://images.orivraa.com/product/icon-enhanced.jpg";
    vi.mocked(inventoryApi.enhanceImages).mockResolvedValue({
      data: {
        creditsCharged: 2,
        creditsRefunded: 0,
        balanceAfter: 18,
        results: [
          {
            sourceUrl: sourceImages[1],
            status: "success",
            enhancedUrl,
          },
        ],
      },
    } as never);
    await renderAddProductWithThreePhotos();

    const iconTriggers = screen.getAllByRole("button", { name: "Enhance" });
    expect(iconTriggers).toHaveLength(3);
    fireEvent.click(iconTriggers[1]);
    await waitFor(() => expect(aiCreditsApi.getBalance).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Enhance and review" }));

    expect(await screen.findByRole("button", { name: "Keep both" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Use enhanced" }));

    await waitFor(() =>
      expect(productPhotoUrls()).toEqual([
        sourceImages[0],
        enhancedUrl,
        sourceImages[2],
      ]),
    );
  });
});
