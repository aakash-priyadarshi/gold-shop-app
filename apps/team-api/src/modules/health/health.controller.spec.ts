import { Controller, Get } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it("should return status ok", () => {
    const result = controller.check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("team-api");
    expect(typeof result.timestamp).toBe("string");
  });

  it("timestamp should be a valid ISO date", () => {
    const result = controller.check();
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
