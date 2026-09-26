import { AiChatbotService } from "./ai-chatbot.service";

describe("AiChatbotService - Workshop route context and contextual retrieval", () => {
  let service: AiChatbotService;

  beforeEach(() => {
    service = new AiChatbotService(
      { get: jest.fn().mockReturnValue("fake-api-key") } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe("formatWorkshopRouteContext", () => {
    it("returns null for non-supply-chain routes", () => {
      expect(service.formatWorkshopRouteContext("/dashboard/shop/invoices")).toBeNull();
      expect(service.formatWorkshopRouteContext(undefined)).toBeNull();
    });

    it("identifies Recovery subview correctly", () => {
      expect(
        service.formatWorkshopRouteContext(
          "/dashboard/shop/supply-chain?view=recovery",
        ),
      ).toContain("Recovery");
    });

    it("identifies Jobs subview correctly", () => {
      expect(
        service.formatWorkshopRouteContext(
          "/dashboard/shop/supply-chain?view=jobs",
        ),
      ).toContain("Jobs");
    });

    it("identifies Production subview correctly", () => {
      expect(
        service.formatWorkshopRouteContext(
          "/dashboard/shop/supply-chain?view=production",
        ),
      ).toContain("Production Floor");
    });

    it("identifies Transfers subview correctly", () => {
      expect(
        service.formatWorkshopRouteContext(
          "/dashboard/shop/supply-chain?view=transfers",
        ),
      ).toContain("Transfers");
    });

    it("identifies Karigar Book subview correctly", () => {
      expect(
        service.formatWorkshopRouteContext(
          "/dashboard/shop/supply-chain?view=book",
        ),
      ).toContain("Karigar Book");
    });

    it("defaults to Overview when no view param is present on supply-chain", () => {
      expect(
        service.formatWorkshopRouteContext("/dashboard/shop/supply-chain"),
      ).toContain("Overview");
    });
  });

  describe("buildContextualRetrievalQuery", () => {
    it("enriches generic questions like 'What do I do here?' with the current Workshop view", () => {
      const query = service.buildContextualRetrievalQuery(
        "What do I do here?",
        "/dashboard/shop/supply-chain?view=recovery",
      );
      expect(query).toContain("User question:\nWhat do I do here?");
      expect(query).toContain("Current page:\nSupply Chain / Workshop / Recovery");
    });

    it("enriches generic questions on Jobs page", () => {
      const query = service.buildContextualRetrievalQuery(
        "How do I start?",
        "/dashboard/shop/supply-chain?view=jobs",
      );
      expect(query).toContain("User question:\nHow do I start?");
      expect(query).toContain("Current page:\nSupply Chain / Workshop / Jobs");
    });

    it("falls back to raw message when no currentPath is provided", () => {
      const query = service.buildContextualRetrievalQuery("What is Orivraa?");
      expect(query).toBe("What is Orivraa?");
    });
  });
});
