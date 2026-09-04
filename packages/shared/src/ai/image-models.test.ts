import { describe, expect, it } from "vitest";
import {
  AI_IMAGE_MODELS,
  DEFAULT_ENHANCEMENT_MODEL,
  DEFAULT_GENERATION_MODEL,
  enhancementCreditCost,
  isAiEnhancementModelId,
  isAiGenerationModelId,
  resolveEnhancementModel,
  resolveGenerationModel,
} from "./image-models";

describe("AI image model catalog", () => {
  it("prices models by the ~$0.02-per-credit rule", () => {
    expect(AI_IMAGE_MODELS["imagen-fast"].creditsPerImage).toBe(1);
    expect(AI_IMAGE_MODELS["imagen-fast"].approxUsdPerImage).toBe(0.02);
    expect(AI_IMAGE_MODELS["imagen-standard"].creditsPerImage).toBe(2);
    expect(AI_IMAGE_MODELS["imagen-ultra"].creditsPerImage).toBe(3);
    expect(AI_IMAGE_MODELS["nano-banana"].creditsPerImage).toBe(2);
    expect(AI_IMAGE_MODELS["nano-banana-pro"].creditsPerImage).toBe(7);
  });

  it("splits capabilities between generation and enhancement", () => {
    expect(isAiGenerationModelId("imagen-fast")).toBe(true);
    expect(isAiGenerationModelId("nano-banana")).toBe(false);
    expect(isAiEnhancementModelId("nano-banana")).toBe(true);
    expect(isAiEnhancementModelId("imagen-ultra")).toBe(false);
    expect(isAiEnhancementModelId("unknown-model")).toBe(false);
  });

  it("resolves generation models with a safe default", () => {
    expect(DEFAULT_GENERATION_MODEL).toBe("imagen-standard");
    expect(resolveGenerationModel("imagen-ultra").apiModelId).toBe(
      "imagen-4.0-ultra-generate-001",
    );
    expect(resolveGenerationModel(undefined).id).toBe(DEFAULT_GENERATION_MODEL);
    expect(resolveGenerationModel("nano-banana").id).toBe(
      DEFAULT_GENERATION_MODEL,
    );
  });

  it("resolves enhancement models with a safe default", () => {
    expect(resolveEnhancementModel("nano-banana-pro").creditsPerImage).toBe(7);
    expect(resolveEnhancementModel("bogus").id).toBe(
      DEFAULT_ENHANCEMENT_MODEL,
    );
    expect(resolveEnhancementModel("imagen-fast").id).toBe(
      DEFAULT_ENHANCEMENT_MODEL,
    );
  });

  it("computes bulk totals multiplicatively", () => {
    expect(enhancementCreditCost(AI_IMAGE_MODELS["nano-banana"], 3)).toBe(6);
    expect(enhancementCreditCost(AI_IMAGE_MODELS["nano-banana-pro"], 2)).toBe(
      14,
    );
    expect(enhancementCreditCost(AI_IMAGE_MODELS["nano-banana"], 0)).toBe(0);
  });

  it("lets pro models take more reference photos than flash", () => {
    expect(AI_IMAGE_MODELS["nano-banana"].maxReferenceImages).toBe(2);
    expect(AI_IMAGE_MODELS["nano-banana-pro"].maxReferenceImages).toBe(13);
    expect(AI_IMAGE_MODELS["imagen-fast"].maxReferenceImages).toBe(0);
  });

  it("ignores inherited object keys when validating model ids", () => {
    expect(isAiGenerationModelId("constructor")).toBe(false);
    expect(isAiGenerationModelId("toString")).toBe(false);
    expect(isAiEnhancementModelId("__proto__")).toBe(false);
    expect(resolveGenerationModel("constructor").id).toBe(
      DEFAULT_GENERATION_MODEL,
    );
    expect(resolveEnhancementModel("toString").id).toBe(
      DEFAULT_ENHANCEMENT_MODEL,
    );
  });
});
