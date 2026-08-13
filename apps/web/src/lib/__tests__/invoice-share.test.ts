import { describe, expect, it, vi, afterEach } from "vitest";
import {
  isNativeFileShareReliable,
  isUserShareCancel,
  sharePdfWithFallbacks,
} from "../invoiceShare";
import {
  resolveCreatedInvoice,
  unwrapInvoiceRecord,
} from "../mobileInvoice";

describe("unwrapInvoiceRecord", () => {
  it("returns the invoice when id is at the top level", () => {
    const payload = { id: "inv-1", invoiceNumber: "INV-1", totalAmount: 100 };
    expect(unwrapInvoiceRecord(payload)?.id).toBe("inv-1");
    expect(unwrapInvoiceRecord(payload)?.totalAmount).toBe(100);
  });

  it("unwraps nested { data }", () => {
    const payload = { data: { id: "inv-2", invoiceNumber: "INV-2" } };
    expect(resolveCreatedInvoice(payload)).toEqual({
      id: "inv-2",
      invoiceNumber: "INV-2",
    });
  });
});

describe("sharePdfWithFallbacks", () => {
  const file = new File(["%PDF"], "Invoice.pdf", { type: "application/pdf" });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats AbortError as cancelled", () => {
    expect(isUserShareCancel({ name: "AbortError" })).toBe(true);
    expect(isUserShareCancel({ name: "NetworkError" })).toBe(false);
  });

  it("treats iPadOS Macintosh user agents as native share", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      maxTouchPoints: 5,
      share: vi.fn(),
    });
    expect(isNativeFileShareReliable()).toBe(true);
  });

  it("skips native share on Windows so it does not throw Network Error", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0",
      share: vi.fn(),
      canShare: () => true,
    });
    expect(isNativeFileShareReliable()).toBe(false);
    const result = await sharePdfWithFallbacks({
      file,
      text: "Bill",
      title: "Invoice",
    });
    expect(result).toBe("fallback");
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it("falls back when files+text throws NetworkError then files-only succeeds", async () => {
    const share = vi
      .fn()
      .mockRejectedValueOnce({ name: "NetworkError", message: "Network Error" })
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/131.0.0.0 Mobile",
      share,
      canShare: () => true,
    });

    const result = await sharePdfWithFallbacks({
      file,
      text: "Bill",
      title: "Invoice",
    });
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledTimes(2);
    expect(share.mock.calls[1][0].files).toEqual([file]);
    expect(share.mock.calls[1][0].text).toBeUndefined();
  });

  it("returns fallback when share is unavailable", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
    const result = await sharePdfWithFallbacks({
      file,
      text: "Bill",
      title: "Invoice",
    });
    expect(result).toBe("fallback");
  });
});
