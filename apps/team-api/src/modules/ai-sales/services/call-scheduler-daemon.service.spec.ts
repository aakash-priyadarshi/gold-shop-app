import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { CallOrchestratorService } from "../services/call-orchestrator.service";
import { CallSchedulerDaemonService } from "../services/call-scheduler-daemon.service";

describe("CallSchedulerDaemonService", () => {
  let service: CallSchedulerDaemonService;
  let mockPrisma: Partial<PrismaService>;
  let mockCallOrchestrator: Partial<CallOrchestratorService>;
  let mockConfig: Partial<ConfigService>;

  beforeEach(() => {
    mockPrisma = {
      callSchedule: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      } as any,
    };
    mockCallOrchestrator = {
      initiateCall: jest.fn().mockResolvedValue({ id: "test-session" }),
    };
    mockConfig = {
      get: jest.fn().mockReturnValue("https://team-api.orivraa.com"),
    };

    service = new CallSchedulerDaemonService(
      mockPrisma as PrismaService,
      mockCallOrchestrator as CallOrchestratorService,
      mockConfig as ConfigService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("processPendingSchedules: should do nothing when no pending schedules", async () => {
    await service.processPendingSchedules();
    expect(mockCallOrchestrator.initiateCall).not.toHaveBeenCalled();
  });

  it("processPendingSchedules: should call initiateCall for pending schedules", async () => {
    (mockPrisma.callSchedule!.findMany as jest.Mock).mockResolvedValue([
      {
        id: "sched-1",
        leadId: "lead-1",
        agentId: "agent-1",
        campaignId: null,
        attempts: 0,
        maxAttempts: 3,
        notes: null,
        lead: { phone: "+1234567890", doNotCall: false },
      },
    ]);
    (mockPrisma.callSchedule!.update as jest.Mock).mockResolvedValue({});

    await service.processPendingSchedules();

    expect(mockCallOrchestrator.initiateCall).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-1" }),
    );
  });

  it("processPendingSchedules: should cancel DNC leads", async () => {
    (mockPrisma.callSchedule!.findMany as jest.Mock).mockResolvedValue([
      {
        id: "sched-2",
        leadId: "lead-2",
        agentId: null,
        campaignId: null,
        attempts: 0,
        maxAttempts: 3,
        notes: null,
        lead: { phone: "+9876543210", doNotCall: true },
      },
    ]);

    await service.processPendingSchedules();

    expect(mockCallOrchestrator.initiateCall).not.toHaveBeenCalled();
    const updateCall = (mockPrisma.callSchedule!.update as jest.Mock).mock.calls.find(
      (c: any) => c[0].data.status === "cancelled",
    );
    expect(updateCall).toBeDefined();
  });

  it("processPendingSchedules: should mark failed after max attempts", async () => {
    (mockCallOrchestrator.initiateCall as jest.Mock).mockRejectedValue(
      new Error("Twilio error"),
    );
    (mockPrisma.callSchedule!.findMany as jest.Mock).mockResolvedValue([
      {
        id: "sched-3",
        leadId: "lead-3",
        agentId: null,
        campaignId: null,
        attempts: 2, // already at maxAttempts - 1, so next failure = failed
        maxAttempts: 3,
        notes: null,
        lead: { phone: "+1112223333", doNotCall: false },
      },
    ]);

    await service.processPendingSchedules();

    const updateCalls = (mockPrisma.callSchedule!.update as jest.Mock).mock.calls;
    const failedUpdate = updateCalls.find((c: any) => c[0].data.status === "failed");
    expect(failedUpdate).toBeDefined();
  });

  it("processPendingSchedules: should not run concurrently", async () => {
    let resolveFirst!: () => void;
    const firstCall = new Promise<void>((r) => (resolveFirst = r));

    (mockPrisma.callSchedule!.findMany as jest.Mock).mockReturnValue(firstCall.then(() => []));

    // Start two concurrent runs
    const first = service.processPendingSchedules();
    const second = service.processPendingSchedules();

    resolveFirst();
    await Promise.all([first, second]);

    // findMany should only be called once due to mutex
    expect(mockPrisma.callSchedule!.findMany).toHaveBeenCalledTimes(1);
  });
});
