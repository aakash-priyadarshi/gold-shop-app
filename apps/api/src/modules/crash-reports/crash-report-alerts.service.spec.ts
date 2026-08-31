import { ConfigService } from "@nestjs/config";
import { CrashReport } from "@prisma/client";
import { CrashReportAlertsService } from "./crash-report-alerts.service";

const report: CrashReport = {
  id: "report-1",
  errorMessage: "Payment failed <!channel>",
  errorStack: "stack",
  page: "/dashboard/shop/pos",
  userAction: "Clicked Pay",
  platform: "web",
  userRole: "SHOPKEEPER",
  userId: "user-1",
  userAgent: "test browser",
  appVersion: null,
  ip: "127.0.0.1",
  status: "new",
  adminNotes: null,
  userTriggered: false,
  userDescription: null,
  sessionToken: "private-session",
  screenshotUrl: null,
  frustrationType: "toast",
  createdAt: new Date("2026-08-31T00:00:00.000Z"),
  updatedAt: new Date("2026-08-31T00:00:00.000Z"),
};

describe("CrashReportAlertsService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(values: Record<string, string> = {}) {
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    return new CrashReportAlertsService(config);
  }

  it("does not attempt delivery when Slack is not configured", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const service = createService();

    await expect(service.sendCrashReportAlert(report)).resolves.toEqual({
      delivered: false,
      reason: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getSlackStatus()).toEqual({
      configured: false,
      requested: false,
      mentionEnabled: false,
    });
  });

  it("posts escaped incident details without private session data", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;
    const service = createService({
      CRASH_REPORT_SLACK_WEBHOOK_URL:
        "https://hooks.slack.com/services/T000/B000/secret",
      CRASH_REPORT_SLACK_MENTION: "U0123456789",
      FRONTEND_URL: "https://www.orivraa.com/",
    });

    await expect(service.sendCrashReportAlert(report)).resolves.toEqual({
      delivered: true,
    });

    const [url, request] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(url).toBe("https://hooks.slack.com/services/T000/B000/secret");
    expect(request.body).toContain("Payment failed &lt;!channel&gt;");
    expect(request.body).toContain("<@U0123456789>");
    expect(request.body).toContain(
      "https://www.orivraa.com/dashboard/admin/crash-reports",
    );
    expect(request.body).not.toContain(report.sessionToken);
    expect(request.body).not.toContain(report.ip);
  });

  it("rejects non-Slack webhook hosts", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const service = createService({
      CRASH_REPORT_SLACK_WEBHOOK_URL:
        "https://example.com/services/T000/B000/secret",
    });

    await expect(service.sendTestAlert()).resolves.toEqual({
      delivered: false,
      reason: "invalid_url",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getSlackStatus().configured).toBe(false);
  });
});
