import { RedisService } from "./redis.service";

describe("RedisService.setKeepTtl", () => {
  const createService = (result: "OK" | null) => {
    const client = { call: jest.fn().mockResolvedValue(result) };
    const service = Object.create(RedisService.prototype) as RedisService;
    (service as any).client = client;
    (service as any).logger = { error: jest.fn() };
    return { service, client };
  };

  it("updates an existing key with XX KEEPTTL so its original expiry remains", async () => {
    const { service, client } = createService("OK");

    await expect(service.setKeepTtl("pending-referral:user-1", "updated")).resolves.toBe(true);

    expect(client.call).toHaveBeenCalledWith(
      "SET",
      "pending-referral:user-1",
      "updated",
      "XX",
      "KEEPTTL",
    );
  });

  it("returns false when the key expires before the conditional write", async () => {
    const { service } = createService(null);

    await expect(service.setKeepTtl("pending-referral:user-1", "updated")).resolves.toBe(false);
  });
});
