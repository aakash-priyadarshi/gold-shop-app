import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { AgentMemoryService } from "../services/agent-memory.service";
import { InCallMessagingService } from "./in-call-messaging-service";

describe("InCallMessagingService", () => {
  let service: InCallMessagingService;
  let channelPrefManager: {
    getStoredPreference: jest.Mock;
    savePreference: jest.Mock;
    detectFromResponse: jest.Mock;
  };

  beforeEach(() => {
    channelPrefManager = {
      getStoredPreference: jest.fn().mockResolvedValue(null),
      savePreference: jest.fn().mockResolvedValue(undefined),
      detectFromResponse: jest.fn().mockReturnValue("whatsapp"),
    };

    service = new InCallMessagingService(
      { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService,
      { callMessage: { create: jest.fn() } } as unknown as PrismaService,
      channelPrefManager as any,
      {
        buildContext: jest.fn().mockReturnValue({}),
        build: jest.fn().mockReturnValue({ text: "message", mediaUrl: null }),
      } as any,
      { get: jest.fn().mockReturnValue(undefined) } as unknown as AgentMemoryService,
    );
  });

  it("asks for a channel when no stored preference exists", async () => {
    service.initSession("session-1", {
      callId: "call-1",
      leadId: "lead-1",
      leadPhone: "+911234567890",
      firstName: "Asha",
    });

    const question = await service.handleTrigger("session-1", "pricing");

    expect(question).toContain("WhatsApp");
    expect(service.isWaitingForChannelConfirmation("session-1")).toBe(true);
  });

  it("sends immediately when a stored preference already exists", async () => {
    channelPrefManager.getStoredPreference.mockResolvedValue("sms");
    const sendSpy = jest.spyOn(service, "sendInBackground").mockImplementation(() => {});

    service.initSession("session-2", {
      callId: "call-2",
      leadId: "lead-2",
      leadPhone: "+911234567891",
      firstName: "Rohan",
    });

    const result = await service.handleTrigger("session-2", "demo_booking");

    expect(result).toBeNull();
    expect(sendSpy).toHaveBeenCalledWith("session-2", "demo_booking", "sms");
  });

  it("clarifies once and then defaults to SMS on repeated unclear answers", async () => {
    const sendSpy = jest.spyOn(service, "sendInBackground").mockImplementation(() => {});
    channelPrefManager.detectFromResponse.mockReturnValue("unclear");

    service.initSession("session-3", {
      callId: "call-3",
      leadId: "lead-3",
      leadPhone: "+911234567892",
      firstName: "Neha",
    });
    await service.handleTrigger("session-3", "pricing");

    const firstResponse = await service.processChannelResponse("session-3", "maybe");
    const secondResponse = await service.processChannelResponse("session-3", "whatever works");

    expect(firstResponse).toEqual({
      aiLine: "Sorry — WhatsApp or regular text message?",
      resolved: false,
    });
    expect(secondResponse).toEqual({
      aiLine: "Got it — sending you a text now.",
      resolved: true,
    });
    expect(channelPrefManager.savePreference).toHaveBeenCalledWith("lead-3", "sms");
    expect(sendSpy).toHaveBeenCalledWith("session-3", "pricing", "sms");
  });

  it("saves detected WhatsApp preference and sends the pending message", async () => {
    const sendSpy = jest.spyOn(service, "sendInBackground").mockImplementation(() => {});
    channelPrefManager.detectFromResponse.mockReturnValue("whatsapp");

    service.initSession("session-4", {
      callId: "call-4",
      leadId: "lead-4",
      leadPhone: "+911234567893",
      firstName: "Kabir",
    });
    await service.handleTrigger("session-4", "case_study");

    const response = await service.processChannelResponse("session-4", "send it on whatsapp");

    expect(response).toEqual({
      aiLine: "Perfect — sending it to WhatsApp now.",
      resolved: true,
    });
    expect(channelPrefManager.savePreference).toHaveBeenCalledWith("lead-4", "whatsapp");
    expect(sendSpy).toHaveBeenCalledWith("session-4", "case_study", "whatsapp");
  });

  it("defaults call summary to SMS when no preference is known", async () => {
    const sendSpy = jest.spyOn(service, "sendInBackground").mockImplementation(() => {});

    service.initSession("session-5", {
      callId: "call-5",
      leadId: "lead-5",
      leadPhone: "+911234567894",
      firstName: "Ira",
    });

    await service.sendCallSummary("session-5");

    expect(sendSpy).toHaveBeenCalledWith("session-5", "call_summary", "sms");
  });
});