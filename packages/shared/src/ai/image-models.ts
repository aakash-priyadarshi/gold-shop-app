/**
 * Google image model catalog with per-model AI credit pricing.
 *
 * Pricing rule: 1 credit ≈ $0.02 of model cost, rounded up
 * (e.g. Imagen 4 Fast $0.02 → 1 credit, Imagen 4 Standard $0.04 → 2 credits).
 * Shopkeepers' per-credit price is configured per plan (admin pricing page).
 */

export type AiImageCapability = "generation" | "enhancement";

export interface AiImageModel {
  /** Stable catalog id used in API DTOs and stored references. */
  id: string;
  /** Display label shown in model pickers. */
  label: string;
  /** Short marketing description for pickers. */
  description: string;
  /** Model id sent to the Generative Language API. */
  apiModelId: string;
  /** AI credits charged per successful output image. */
  creditsPerImage: number;
  /** What the model can be used for. */
  capabilities: AiImageCapability[];
  /** Rough USD cost per output image — informational only. */
  approxUsdPerImage: number;
  /** Max reference (input) images accepted besides the target image. */
  maxReferenceImages: number;
}

const imagenCapabilities: AiImageCapability[] = ["generation"];

export const AI_IMAGE_MODELS = {
  "imagen-fast": {
    id: "imagen-fast",
    label: "Imagen 4 Fast",
    description: "Near real-time generation, great everyday quality",
    apiModelId: "imagen-4.0-fast-generate-001",
    creditsPerImage: 1,
    capabilities: imagenCapabilities,
    approxUsdPerImage: 0.02,
    maxReferenceImages: 0,
  },
  "imagen-standard": {
    id: "imagen-standard",
    label: "Imagen 4",
    description: "Flagship photorealistic generation",
    apiModelId: "imagen-4.0-generate-001",
    creditsPerImage: 2,
    capabilities: imagenCapabilities,
    approxUsdPerImage: 0.039,
    maxReferenceImages: 0,
  },
  "imagen-ultra": {
    id: "imagen-ultra",
    label: "Imagen 4 Ultra",
    description: "Highest detail and fidelity, slowest",
    apiModelId: "imagen-4.0-ultra-generate-001",
    creditsPerImage: 3,
    capabilities: imagenCapabilities,
    approxUsdPerImage: 0.06,
    maxReferenceImages: 0,
  },
  "nano-banana": {
    id: "nano-banana",
    label: "Nano Banana",
    description: "Studio-grade photo enhancement, fast",
    apiModelId: "gemini-2.5-flash-image",
    creditsPerImage: 2,
    capabilities: ["enhancement"],
    approxUsdPerImage: 0.04,
    maxReferenceImages: 2,
  },
  "nano-banana-pro": {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    description: "Premium 2K enhancement with the finest detail",
    apiModelId: "gemini-3-pro-image-preview",
    creditsPerImage: 7,
    capabilities: ["enhancement"],
    approxUsdPerImage: 0.134,
    maxReferenceImages: 13,
  },
} satisfies Record<string, AiImageModel>;

export type AiImageModelId = keyof typeof AI_IMAGE_MODELS;

export type AiGenerationModelId = Extract<
  AiImageModelId,
  "imagen-fast" | "imagen-standard" | "imagen-ultra"
>;

export type AiEnhancementModelId = Extract<
  AiImageModelId,
  "nano-banana" | "nano-banana-pro"
>;

export const DEFAULT_GENERATION_MODEL: AiGenerationModelId =
  "imagen-standard";
export const DEFAULT_ENHANCEMENT_MODEL: AiEnhancementModelId = "nano-banana";

export const AI_GENERATION_MODEL_IDS: AiGenerationModelId[] = [
  "imagen-fast",
  "imagen-standard",
  "imagen-ultra",
];

export const AI_ENHANCEMENT_MODEL_IDS: AiEnhancementModelId[] = [
  "nano-banana",
  "nano-banana-pro",
];

export function isAiImageModelId(value: unknown): value is AiImageModelId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(AI_IMAGE_MODELS, value)
  );
}

export function isAiEnhancementModelId(
  value: unknown,
): value is AiEnhancementModelId {
  return (
    isAiImageModelId(value) &&
    (AI_IMAGE_MODELS[value] as AiImageModel).capabilities.includes(
      "enhancement",
    )
  );
}

export function isAiGenerationModelId(
  value: unknown,
): value is AiGenerationModelId {
  return (
    isAiImageModelId(value) &&
    (AI_IMAGE_MODELS[value] as AiImageModel).capabilities.includes(
      "generation",
    )
  );
}

/** Resolve a user-supplied model id, falling back to the default for its purpose. */
export function resolveEnhancementModel(
  value: unknown,
): AiImageModel {
  return AI_IMAGE_MODELS[
    isAiEnhancementModelId(value) ? value : DEFAULT_ENHANCEMENT_MODEL
  ];
}

export function resolveGenerationModel(value: unknown): AiImageModel {
  return AI_IMAGE_MODELS[
    isAiGenerationModelId(value) ? value : DEFAULT_GENERATION_MODEL
  ];
}

/** Total credits for an n-image request. */
export function enhancementCreditCost(
  model: AiImageModel,
  imageCount: number,
): number {
  return model.creditsPerImage * Math.max(0, imageCount);
}
