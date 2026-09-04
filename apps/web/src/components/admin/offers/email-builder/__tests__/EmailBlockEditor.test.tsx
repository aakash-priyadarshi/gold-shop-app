import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailBlockEditor } from "../EmailBlockEditor";
import type { OfferCampaign } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  uploadEmailMedia: vi.fn(),
  saveDesign: vi.fn(),
  previewDesign: vi.fn(),
  clearDesign: vi.fn(),
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/lib/image-upload", () => ({
  uploadEmailMedia: mocks.uploadEmailMedia,
}));

vi.mock("@/lib/api", () => ({
  recoveryOffersApi: {
    updateCampaignEmailDesign: mocks.saveDesign,
    previewCampaignEmailDesign: mocks.previewDesign,
    clearCampaignEmailDesign: mocks.clearDesign,
  },
}));

const campaign = {
  key: "whats-new-ai-photo-2026-09",
  name: "AI product photo studio",
  kind: "PRODUCT_UPDATE",
  complimentaryDays: 0,
  discountPercent: 0,
  startsAt: null,
  endsAt: null,
  emailSubject: "New: studio photos from your catalog",
  emailHeading: "Turn shop photos into listing-ready images",
  emailBody: "Open Product Catalog and tap Enhance.",
  emailDesign: null,
  isActive: true,
} as OfferCampaign;

function renderEditor() {
  return render(
    <EmailBlockEditor
      campaign={campaign}
      open
      locked={false}
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
}

describe("EmailBlockEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks reordering and saving while a media upload is pending, then lands the URL on the right block", async () => {
    let resolveUpload!: (value: {
      success: boolean;
      url: string;
    }) => void;
    mocks.uploadEmailMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    renderEditor();

    // The default layout's first block is an image; trigger its upload.
    const fileInput = screen.getByLabelText("Upload");
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["gif-bytes"], "demo.gif", { type: "image/gif" }),
        ],
      },
    });
    await waitFor(() => {
      expect(mocks.uploadEmailMedia).toHaveBeenCalled();
    });

    // While the upload is pending, every list mutation and save control is
    // disabled so the captured block index cannot drift.
    expect(
      screen.getAllByRole("button", { name: "Move block down" })[0],
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "Duplicate block" })[0],
    ).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Remove block" })[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save design" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preview email" })).toBeDisabled();

    resolveUpload({
      success: true,
      url: "https://images.orivraa.com/email/123-abc.gif",
    });

    // The uploaded URL lands in the image block, and controls re-enable.
    expect(
      await screen.findByDisplayValue(
        "https://images.orivraa.com/email/123-abc.gif",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Move block down" })[0],
      ).toBeEnabled();
    });

    // A post-upload reorder keeps the URL attached to its own block.
    fireEvent.click(
      screen.getAllByRole("button", { name: "Move block down" })[0],
    );
    expect(
      screen.getAllByDisplayValue(
        "https://images.orivraa.com/email/123-abc.gif",
      ),
    ).toHaveLength(1);
    expect(mocks.saveDesign).not.toHaveBeenCalled();
  });
});
