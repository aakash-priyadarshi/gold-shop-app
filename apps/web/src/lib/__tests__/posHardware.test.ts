import { runCashDrawerOpenFlow } from "../posHardware";

describe("cash drawer audit isolation", () => {
  it("keeps a successful hardware kick successful when audit logging fails", async () => {
    const auditFailure = new Error("audit unavailable");
    const onAuditFailure = vi.fn();
    const audit = vi.fn().mockRejectedValue(auditFailure);

    await expect(
      runCashDrawerOpenFlow({
        authorize: vi.fn().mockResolvedValue(undefined),
        kick: vi.fn().mockResolvedValue(undefined),
        audit,
        onAuditFailure,
      }),
    ).resolves.toEqual({ outcome: "opened" });

    expect(audit).toHaveBeenCalledWith(true);
    await Promise.resolve();
    expect(onAuditFailure).toHaveBeenCalledWith(auditFailure);
  });

  it("records a hardware failure once without retrying the drawer kick", async () => {
    const kick = vi.fn().mockRejectedValue(new Error("printer offline"));
    const audit = vi.fn().mockResolvedValue(undefined);

    await expect(
      runCashDrawerOpenFlow({
        authorize: vi.fn().mockResolvedValue(undefined),
        kick,
        audit,
      }),
    ).resolves.toMatchObject({ outcome: "hardware_failed" });

    expect(kick).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(false, "printer offline");
  });
});
