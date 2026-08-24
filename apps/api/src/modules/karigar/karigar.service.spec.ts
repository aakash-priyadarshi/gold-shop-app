import { BadRequestException } from "@nestjs/common";
import { KarigarService } from "./karigar.service";

describe("KarigarService workshop safeguards", () => {
  const karigarJob = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };

  let service: KarigarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new KarigarService(
      { karigarJob } as never,
      {} as never,
      {} as never,
    );
  });

  it("requires an approved QC stage before receiving finished goods", async () => {
    (service as any).requireWorkshopShop = jest.fn().mockResolvedValue({});
    karigarJob.findFirst.mockResolvedValue({
      stages: [{ stage: "QC", status: "IN_PROGRESS" }],
      trees: [],
    });

    await expect(
      service.receiveFg("shop-1", "job-1", {}),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message: "Approve this job in Workshop QC before receiving finished goods",
      }),
    );
  });

  it("cancels and retains a job instead of deleting its history", async () => {
    karigarJob.findFirst.mockResolvedValue({ id: "job-1" });
    karigarJob.update.mockResolvedValue({ id: "job-1", status: "CANCELLED" });

    await expect(service.deleteJob("shop-1", "job-1")).resolves.toEqual({
      ok: true,
      status: "CANCELLED",
    });
    expect(karigarJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "CANCELLED" },
    });
  });
});
