import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailBlockEditor } from "../EmailBlockEditor";
import type { OfferCampaign } from "@/lib/api";
import { draftStorageKey } from "../emailStudioModel";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  uploadEmailMedia: vi.fn(),
  saveDesign: vi.fn(),
  previewDesign: vi.fn(),
  clearDesign: vi.fn(),
  userId: "admin-1",
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

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }));

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
  updatedAt: "2026-09-05T10:00:00.000Z",
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
    const storage = new Map<string, string>();
    // Node 25 exposes an unavailable global localStorage over jsdom's getter.
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    mocks.userId = "admin-1";
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
    expect(screen.getByTitle("Live email preview")).toBeInTheDocument();

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

  it("updates the live canvas, validates unfinished fields, and undoes/redoes without preview requests", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /2\. Heading/ }));
    const heading = screen.getByLabelText("Heading text");
    fireEvent.change(heading, { target: { value: "A beautiful new workflow" } });
    const frame = screen.getByTitle("Live email preview");
    await waitFor(() => {
      expect(frame.getAttribute("srcdoc")).toContain("A beautiful new workflow");
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(heading).toHaveValue("What's new in your shop");
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(heading).toHaveValue("A beautiful new workflow");
    fireEvent.change(heading, { target: { value: "" } });
    await waitFor(() => {
      expect(frame.getAttribute("srcdoc")).toContain("Complete this section in the editor");
    });
    expect(frame.getAttribute("srcdoc")).toContain("Try it now");
    expect(screen.getByRole("button", { name: "Save design" })).toBeDisabled();
    expect(mocks.previewDesign).not.toHaveBeenCalled();
    expect(mocks.saveDesign).not.toHaveBeenCalled();
    expect(frame).toHaveAttribute("sandbox", "allow-same-origin");
  });

  it("shows mobile and images-off previews without changing the saved design", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));
    expect(screen.getByTitle("Live email preview")).toHaveStyle({ width: "375px" });
    fireEvent.click(screen.getByLabelText("Images off"));
    await waitFor(() => {
      expect(screen.getByTitle("Live email preview").getAttribute("srcdoc")).not.toContain("<img");
    });
    expect(localStorage.getItem(draftStorageKey("admin-1", campaign.key))).toBeNull();
    expect(mocks.saveDesign).not.toHaveBeenCalled();
  });

  it("recovers an unfinished draft on reopening without silently replacing the saved design", () => {
    const view = renderEditor();
    fireEvent.change(screen.getByLabelText("Image or GIF URL"), { target: { value: "https://" } });
    const stored = JSON.parse(localStorage.getItem(draftStorageKey("admin-1", campaign.key))!);
    expect(stored.draft.blocks[0].url).toBe("https://");
    view.unmount();
    renderEditor();
    expect(screen.getByRole("button", { name: "Restore draft" })).toBeInTheDocument();
    expect(screen.getByLabelText("Image or GIF URL")).not.toHaveValue("https://");
    fireEvent.click(screen.getByRole("button", { name: "Restore draft" }));
    expect(screen.getByLabelText("Image or GIF URL")).toHaveValue("https://");
    expect(screen.getByRole("button", { name: "Save design" })).toBeDisabled();
  });

  it("scopes recovery to the signed-in account", () => {
    const view = renderEditor();
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Private work in progress" } });
    view.unmount();
    mocks.userId = "admin-2";
    renderEditor();
    expect(screen.queryByRole("button", { name: "Restore draft" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toHaveValue(campaign.emailSubject);
  });

  it("keeps a failed save recoverable and sends the originally loaded campaign revision", async () => {
    mocks.saveDesign.mockRejectedValueOnce({ response: { data: { message: "This campaign changed since you opened it." } } });
    const props = { campaign, open: true, locked: false, onClose: vi.fn(), onSaved: vi.fn() };
    const view = render(<EmailBlockEditor {...props} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "A draft worth keeping" } });
    view.rerender(<EmailBlockEditor {...props} campaign={{ ...campaign, updatedAt: "2026-09-05T11:00:00.000Z" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save design" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This campaign changed");
    expect(mocks.saveDesign).toHaveBeenCalledWith(campaign.key, expect.objectContaining({ expectedUpdatedAt: campaign.updatedAt, emailSubject: "A draft worth keeping" }));
    expect(localStorage.getItem(draftStorageKey("admin-1", campaign.key))).toContain("A draft worth keeping");
    expect(props.onSaved).not.toHaveBeenCalled();
  });

  it("requires review when restoring a draft based on an older saved campaign", () => {
    const view = renderEditor();
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Older local draft" } });
    view.unmount();
    render(<EmailBlockEditor campaign={{ ...campaign, updatedAt: "2026-09-05T11:00:00.000Z" }} open locked={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore draft" }));
    expect(screen.getByRole("button", { name: "Save design" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "I have reviewed this draft" }));
    expect(screen.getByRole("button", { name: "Save design" })).toBeEnabled();
  });

  it("saves design metadata explicitly and clears only this campaign's recovery copy", async () => {
    mocks.saveDesign.mockResolvedValueOnce({ data: campaign });
    const onSaved = vi.fn();
    render(<EmailBlockEditor campaign={campaign} open locked={false} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Preheader/), { target: { value: "A small preview of something big" } });
    fireEvent.change(screen.getByLabelText("Email theme"), { target: { value: "editorial" } });
    fireEvent.click(screen.getByRole("button", { name: "Save design" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(campaign));
    expect(mocks.saveDesign).toHaveBeenCalledWith(campaign.key, expect.objectContaining({ theme: "editorial", preheader: "A small preview of something big" }));
    expect(localStorage.getItem(draftStorageKey("admin-1", campaign.key))).toBeNull();
    fireEvent.change(screen.getByLabelText(/Preheader/), { target: { value: "Keep working after save" } });
    expect(localStorage.getItem(draftStorageKey("admin-1", campaign.key))).toContain("Keep working after save");
  });

  it("keeps preview controls available when scheduled-send locking disables editing", () => {
    render(<EmailBlockEditor campaign={campaign} open locked onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText("Subject")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save design" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mobile" })).toBeEnabled();
    expect(screen.getByTitle("Live email preview")).toBeInTheDocument();
  });

  it("keeps a finishing upload on its original section after the selection changes", async () => {
    let resolveUpload!: (value: { success: boolean; url: string }) => void;
    mocks.uploadEmailMedia.mockImplementation(
      () => new Promise((resolve) => { resolveUpload = resolve; }),
    );
    renderEditor();
    fireEvent.change(screen.getByLabelText("Upload"), {
      target: { files: [new File(["gif-bytes"], "demo.gif", { type: "image/gif" })] },
    });
    await waitFor(() => expect(mocks.uploadEmailMedia).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /2\. Heading/ }));
    resolveUpload({ success: true, url: "https://images.orivraa.com/email/late.gif" });
    fireEvent.click(screen.getByRole("button", { name: /1\. Image or GIF/ }));
    expect(await screen.findByDisplayValue("https://images.orivraa.com/email/late.gif")).toBeInTheDocument();
  });

  it("exposes entrance animation without calling the preview API", () => {
    renderEditor();
    expect(screen.getByLabelText("Entrance animation")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Entrance animation"), { target: { value: "slideUp" } });
    expect(mocks.previewDesign).not.toHaveBeenCalled();
  });
});
