import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dedupeKey,
  formatUserFacingErrorCopy,
  reportApiFailure,
  resetUserFacingErrorReporterForTests,
  shouldSkipUserFacingError,
  submitUserFacingError,
} from "../reportUserFacingError";

describe("formatUserFacingErrorCopy", () => {
  it("matches the user toast copy block (title, description, page)", () => {
    expect(
      formatUserFacingErrorCopy({
        title: "Download failed",
        description: "Network Error",
        page: "/dashboard/shop/invoices/abc",
      }),
    ).toBe(
      "Download failed\nNetwork Error\n\nPage: /dashboard/shop/invoices/abc",
    );
  });

  it("does not repeat the title when description is the same", () => {
    expect(
      formatUserFacingErrorCopy({
        title: "Failed",
        description: "Failed",
        page: "/m/pos",
      }),
    ).toBe("Failed\n\nPage: /m/pos");
  });
});

describe("shouldSkipUserFacingError", () => {
  it("skips session, upgrade, and form-validation noise", () => {
    expect(shouldSkipUserFacingError("Session Expired", "Please log in")).toBe(
      true,
    );
    expect(shouldSkipUserFacingError("Upgrade required", "Pro plan")).toBe(
      true,
    );
    expect(
      shouldSkipUserFacingError("Please fill in required fields"),
    ).toBe(true);
    expect(shouldSkipUserFacingError("Copied")).toBe(true);
  });

  it("keeps real product failures including Network Error", () => {
    expect(
      shouldSkipUserFacingError("Download failed", "Network Error"),
    ).toBe(false);
    expect(
      shouldSkipUserFacingError("Server error 500", "GET /invoices/1"),
    ).toBe(false);
  });
});

describe("submitUserFacingError", () => {
  afterEach(() => {
    resetUserFacingErrorReporterForTests();
    vi.unstubAllGlobals();
  });

  it("posts the copy-formatted payload and dedupes the same toast", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      title: "Download failed",
      description: "Network Error",
      page: "/dashboard/shop/invoices/abc",
      frustrationType: "toast",
    };

    expect(await submitUserFacingError(payload)).toBe(true);
    expect(await submitUserFacingError(payload)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.errorMessage).toContain("Download failed");
    expect(body.errorMessage).toContain("Network Error");
    expect(body.errorMessage).toContain("Page: /dashboard/shop/invoices/abc");
    expect(body.userTriggered).toBe(false);
    expect(body.frustrationType).toBe("toast");
    expect(body.page).toBe("/dashboard/shop/invoices/abc");
  });

  it("does not POST skipped or crash-reports-page errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await submitUserFacingError({
      title: "Session Expired",
      description: "Your session timed out. Please log in to continue.",
    });
    await submitUserFacingError({
      title: "Failed",
      description: "x",
      page: "/dashboard/admin/crash-reports",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("reportApiFailure", () => {
  afterEach(() => {
    resetUserFacingErrorReporterForTests();
    vi.unstubAllGlobals();
  });

  it("ignores 4xx and the crash-reports endpoint itself", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    reportApiFailure({
      config: { url: "/invoices/1", method: "get" },
      response: { status: 400, data: { message: "bad" } },
    });
    reportApiFailure({
      config: { url: "/crash-reports", method: "post" },
      response: { status: 500 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures 5xx with method and path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    reportApiFailure({
      message: "Request failed with status code 500",
      config: { url: "/invoices/abc/pdf", method: "get" },
      response: { status: 500, statusText: "Internal Server Error" },
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.frustrationType).toBe("api_error");
    expect(body.errorMessage).toContain("Server error 500");
    expect(body.errorMessage).toContain("GET /invoices/abc/pdf");
  });
});

describe("dedupeKey", () => {
  it("is case-insensitive on the message", () => {
    expect(dedupeKey("Network Error", "/a")).toBe(
      dedupeKey("network error", "/a"),
    );
  });
});
