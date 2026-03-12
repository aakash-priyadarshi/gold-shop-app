import { ThinkingBudgetManager } from "./thinking-budget-manager.service";

describe("ThinkingBudgetManager", () => {
  let service: ThinkingBudgetManager;

  beforeEach(() => {
    service = new ThinkingBudgetManager();
  });

  it("returns zero budget for simple acknowledgements", () => {
    expect(service.calculate("okay", "neutral", "WARM_OPEN", [])).toBe(0);
    expect(service.getFillerContext(0)).toBe("none");
  });

  it("returns objection budget for standard objections", () => {
    expect(service.calculate("This sounds too expensive for us", "skeptical", "DISCOVERY", [])).toBe(2000);
    expect(service.getFillerContext(2000)).toBe("short");
  });

  it("returns technical-question budget for deep product questions", () => {
    expect(service.calculate("How does the API integration work with our architecture?", "curious", "DISCOVERY", [])).toBe(5000);
    expect(service.getFillerContext(5000)).toBe("medium");
  });

  it("returns the maximum budget for negotiation and escalation scenarios", () => {
    expect(service.calculate("Can you match this price or I will escalate for a refund", "angry", "OBJECTION_HANDLING", [])).toBe(8000);
    expect(service.getFillerContext(8000)).toBe("long");
  });
});