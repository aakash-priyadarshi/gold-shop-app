import { ConfigService } from "@nestjs/config";
import { AgentMemoryService } from "./agent-memory.service";
import { ConversationBrainService } from "./conversation-brain.service";
import { PreCallBrainService } from "./pre-call-brain.service";

const memory = {
  get: jest.fn((category: string, key: string) => {
    const values: Record<string, string> = {
      "persona:agent_name": "Aria",
      "company:name": "Orivraa",
      "company:description": "Orivraa is an AI-powered jewellery business CRM and commerce platform.",
      "company:proof_points": "Trusted by 2,000+ jewellers across 6+ regions.",
      "company:target_customers": "Retail jewellers, wholesalers, designers, and online sellers.",
      "product:name": "Orivraa Jewellery CRM",
      "product:elevator_pitch": "Manage CRM, inventory, billing, catalogues, RFQ, analytics, and marketplace sales in one dashboard.",
      "product:core_features": "CRM suite, inventory, billing, catalogues, RFQ, analytics, marketplace, AI tools.",
      "product:differentiators": "Purpose-built for jewellers with marketplace and weight/purity tracking.",
      "product:onboarding": "Sign up, configure shop, add products, and start selling in under 5 minutes.",
      "product:pricing_summary": "Free ₹0/month, Pro ₹299/month, Pro+ ₹599/month, Enterprise custom.",
      "product:qualification_questions": "What do you use today? How do you handle billing and catalogues?",
    };

    return values[`${category}:${key}`] || "";
  }),
} as unknown as AgentMemoryService;

describe("Prompt memory integration", () => {
  it("pre-call prompt includes Orivraa CRM pricing and differentiators from memory", () => {
    const service = new PreCallBrainService({ get: jest.fn() } as unknown as ConfigService, memory);

    const prompt = service.buildGeminiSystemPrompt(
      {
        openingStrategy: "Warm intro",
        predictedObjections: [],
        recommendedResponses: {},
        toneGuidance: "Warm",
        culturalNotes: "",
        keySellingPoints: ["Marketplace reach"],
        questionsToAsk: ["How do you manage stock today?"],
        closingStrategy: "Suggest signup",
        riskFactors: [],
        competitorIntel: "",
        personalizedGreeting: "Hi there",
        estimatedCallDuration: 300,
        priorityLevel: "medium",
        dealPotential: 0.5,
        conversationAnchors: ["CRM workflow"],
        avoidTopics: [],
      },
      {},
      undefined,
      "en",
    );

    expect(prompt).toContain("Orivraa Jewellery CRM");
    expect(prompt).toContain("Free ₹0/month, Pro ₹299/month");
    expect(prompt).toContain("Purpose-built for jewellers");
  });

  it("conversation prompt includes CRM knowledge from memory", () => {
    const service = new ConversationBrainService(
      { get: jest.fn() } as unknown as ConfigService,
      memory,
    );

    const prompt = service.buildSystemPrompt({
      agentName: "Aria",
      conversationHistory: [],
      language: "en",
    });

    expect(prompt).toContain("AI-powered jewellery business CRM");
    expect(prompt).toContain("Trusted by 2,000+ jewellers");
    expect(prompt).toContain("Free ₹0/month, Pro ₹299/month");
  });
});