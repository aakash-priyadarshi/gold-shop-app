import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";

interface DesignSpecs {
  jewelryType: string;
  buildMethod: string;
  metalType?: string;
  metalColor?: string;
  metalDescription?: string; // Enhanced description from frontend
  weightCategory?: string;
  estimatedWeight?: number;
  surfaceFinish?: string;
  hasGemstones?: boolean;
  primaryStone?: string;
  stoneCut?: string;
  stoneCarat?: number;
  stoneColor?: string;
  stoneClarity?: string;
  stoneCutGrade?: string;
  stoneCount?: number;
  settingStyle?: string;
  additionalSpecs?: Record<string, unknown>;
  // Method-specific details
  alloyDetails?: {
    baseMetal?: string;
    karat?: string;
    alloyFamily?: string;
    recipePresetId?: string;
  };
  platingDetails?: {
    baseMetal?: string;
    platingType?: string;
    platingTier?: string;
  };
  italianMachineDetails?: {
    purity?: string;
    chainStyle?: string;
  };
  // Full gemstones array
  gemstones?: Array<{
    stoneType?: string;
    shape?: string;
    color?: string;
    clarity?: string;
    cut?: string;
    settingStyle?: string;
    count?: number;
    sizeValue?: number;
    sizeUnit?: string;
  }>;
}

interface GenerationResult {
  imageUrl: string;
  prompt: string;
  cached: boolean;
}

// Metal color descriptions for prompt
const METAL_COLOR_DESCRIPTIONS: Record<string, string> = {
  YELLOW: "warm rich yellow gold",
  WHITE: "bright silvery white gold",
  ROSE: "soft pinkish rose gold",
};

// Metal type descriptions for prompt
const METAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  GOLD_24K: "24 karat pure gold",
  GOLD_22K: "22 karat gold",
  GOLD_18K: "18 karat gold",
  GOLD_14K: "14 karat gold",
  GOLD_10K: "10 karat gold",
  SILVER_999: "fine silver (99.9%)",
  SILVER_925: "sterling silver (92.5%)",
  PLATINUM_950: "platinum (95%)",
  PLATINUM_900: "platinum (90%)",
  PALLADIUM_950: "palladium (95%)",
};

// Gemstone descriptions for prompt
const GEMSTONE_DESCRIPTIONS: Record<string, string> = {
  DIAMOND_NATURAL: "natural diamond",
  DIAMOND_LAB: "lab-grown diamond",
  MOISSANITE: "moissanite",
  CUBIC_ZIRCONIA: "cubic zirconia",
  RUBY: "ruby with deep red color",
  SAPPHIRE: "sapphire with rich blue color",
  EMERALD: "emerald with deep green color",
  PEARL: "lustrous pearl",
  AMETHYST: "purple amethyst",
  TOPAZ: "topaz",
  GARNET: "deep red garnet",
  OPAL: "opal with play of colors",
  TURQUOISE: "turquoise",
  AQUAMARINE: "light blue aquamarine",
  PERIDOT: "olive green peridot",
  CITRINE: "golden yellow citrine",
};

// Stone cut descriptions for prompt
const STONE_CUT_DESCRIPTIONS: Record<string, string> = {
  ROUND: "round brilliant cut",
  OVAL: "oval cut",
  PRINCESS: "princess cut (square)",
  CUSHION: "cushion cut",
  EMERALD_CUT: "emerald cut (rectangular step-cut)",
  MARQUISE: "marquise cut (boat-shaped)",
  PEAR: "pear/teardrop cut",
  HEART: "heart-shaped cut",
  RADIANT: "radiant cut",
  ASSCHER: "asscher cut",
  BAGUETTE: "baguette cut (rectangular)",
  TRILLION: "trillion cut (triangular)",
  CABOCHON: "cabochon (smooth dome)",
};

// Setting style descriptions for prompt
const SETTING_DESCRIPTIONS: Record<string, string> = {
  PRONG: "prong setting",
  BEZEL: "bezel setting",
  CHANNEL: "channel setting",
  PAVE: "pave setting with small diamonds",
  FLUSH: "flush/gypsy setting",
  TENSION: "tension setting",
  HALO: "halo setting with surrounding stones",
  CLUSTER: "cluster setting",
  BAR: "bar setting",
  INVISIBLE: "invisible setting",
};

// Jewelry type descriptions for prompt
const JEWELRY_TYPE_DESCRIPTIONS: Record<string, string> = {
  RING: "ring",
  NECKLACE: "necklace",
  BRACELET: "bracelet",
  BANGLE: "bangle",
  EARRING: "pair of earrings",
  PENDANT: "pendant",
  CHAIN: "chain",
  ANKLET: "anklet",
  BROOCH: "brooch",
  TIE_PIN: "tie pin",
  CUFFLINKS: "pair of cufflinks",
  NOSE_PIN: "nose pin",
  MANGALSUTRA: "mangalsutra",
  MAANG_TIKKA: "maang tikka",
  OTHER: "jewelry piece",
};

// Surface finish descriptions
const SURFACE_FINISH_DESCRIPTIONS: Record<string, string> = {
  HIGH_POLISH: "high polish mirror finish",
  MATTE: "matte finish",
  BRUSHED: "brushed satin finish",
  SATIN: "satin finish",
  HAMMERED: "hammered texture",
  SANDBLASTED: "sandblasted finish",
  FLORENTINE: "florentine finish",
  BARK_TEXTURE: "bark texture",
  DIAMOND_CUT: "diamond cut faceted finish",
  ENGRAVED: "engraved details",
};

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /**
   * Generate a unique hash from design specifications
   * Used for caching and deduplication
   * NOTE: Includes description and regeneration feedback to generate new images when user provides feedback
   */
  generateSpecHash(
    specs: DesignSpecs & {
      additionalSpecs?: { description?: string; regenerationFeedback?: string };
    },
  ): string {
    const normalized = {
      jewelryType: specs.jewelryType?.toUpperCase(),
      buildMethod: specs.buildMethod?.toUpperCase(),
      metalType: specs.metalType?.toUpperCase() || null,
      metalColor: specs.metalColor?.toUpperCase() || null,
      weightCategory: specs.weightCategory?.toUpperCase() || null,
      surfaceFinish: specs.surfaceFinish?.toUpperCase() || null,
      hasGemstones: specs.hasGemstones || false,
      primaryStone: specs.primaryStone?.toUpperCase() || null,
      stoneCut: specs.stoneCut?.toUpperCase() || null,
      stoneCarat: specs.stoneCarat
        ? Math.round(specs.stoneCarat * 10) / 10
        : null,
      stoneColor: specs.stoneColor?.toUpperCase() || null,
      settingStyle: specs.settingStyle?.toUpperCase() || null,
      // Include description and regeneration feedback in hash to generate new images
      description:
        specs.additionalSpecs?.description?.trim().toLowerCase() || null,
      regenerationFeedback:
        specs.additionalSpecs?.regenerationFeedback?.trim().toLowerCase() ||
        null,
    };

    return createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");
  }

  /**
   * Build the prompt string from design specifications
   */
  buildPrompt(specs: DesignSpecs): string {
    const jewelryType =
      JEWELRY_TYPE_DESCRIPTIONS[specs.jewelryType] || "jewelry piece";

    // Use enhanced metal description if available, otherwise fall back to basic
    let metalDescription = "";
    if (specs.metalDescription) {
      metalDescription = specs.metalDescription;
    } else {
      const metalType = specs.metalType
        ? METAL_TYPE_DESCRIPTIONS[specs.metalType] || specs.metalType
        : "";
      const metalColor = specs.metalColor
        ? METAL_COLOR_DESCRIPTIONS[specs.metalColor] ||
          specs.metalColor.toLowerCase()
        : "";
      metalDescription = [metalType, metalColor].filter(Boolean).join(" with ");
    }

    const surfaceFinish = specs.surfaceFinish
      ? SURFACE_FINISH_DESCRIPTIONS[specs.surfaceFinish] ||
        specs.surfaceFinish.toLowerCase()
      : "";

    // Build base description - emphasize "plain" or "simple" when no gemstones
    const plainDescriptor = !specs.hasGemstones ? "plain solid metal " : "";
    let description = `Professional product photograph of a ${plainDescriptor}${jewelryType}`;

    // Add explicit no-gemstone instruction in description for rings/pendants
    if (
      !specs.hasGemstones &&
      ["RING", "PENDANT", "EARRING"].includes(specs.jewelryType)
    ) {
      description += ` without any gemstones or stones - a simple, elegant ${jewelryType} made entirely of metal`;
    }

    // Add specifications section
    const specLines: string[] = [];

    // Metal specifications - enhanced based on build method
    if (specs.buildMethod === "METHOD_B" && specs.alloyDetails) {
      // Precious metal alloy with color
      const alloyColorMap: Record<string, string> = {
        YELLOW_GOLD: "warm yellow gold color",
        WHITE_GOLD: "bright white gold color",
        ROSE_GOLD: "romantic rose gold color",
        GREEN_GOLD: "subtle green gold tint",
      };
      const colorDesc = specs.alloyDetails.alloyFamily
        ? alloyColorMap[specs.alloyDetails.alloyFamily] || ""
        : "";
      const karatDesc = specs.alloyDetails.karat || "";
      specLines.push(`- Metal: ${karatDesc} gold alloy with ${colorDesc}`);
    } else if (specs.buildMethod === "METHOD_C" && specs.platingDetails) {
      // Base metal with plating
      const baseMetalMap: Record<string, string> = {
        BRASS: "polished brass base",
        COPPER: "copper base",
        BRONZE: "bronze base",
        STAINLESS_STEEL: "stainless steel base",
      };
      const platingMap: Record<string, string> = {
        GOLD_PLATED: "lustrous gold plating",
        ROSE_GOLD_PLATED: "elegant rose gold plating",
        RHODIUM_PLATED: "bright rhodium plating",
        SILVER_PLATED: "shiny silver plating",
      };
      const baseDesc = specs.platingDetails.baseMetal
        ? baseMetalMap[specs.platingDetails.baseMetal] ||
          specs.platingDetails.baseMetal
        : "";
      const platingDesc = specs.platingDetails.platingType
        ? platingMap[specs.platingDetails.platingType] ||
          specs.platingDetails.platingType
        : "";
      specLines.push(`- Metal: ${baseDesc} with ${platingDesc}`);
    } else if (
      specs.buildMethod === "METHOD_D" &&
      specs.italianMachineDetails
    ) {
      // Italian machine made chains
      const purity = specs.italianMachineDetails.purity || "18K";
      const chainStyle = specs.italianMachineDetails.chainStyle || "rope chain";
      const chainStyleDescriptions: Record<string, string> = {
        ROPE: "classic twisted rope pattern",
        FIGARO: "Italian figaro link pattern",
        CURB: "elegant curb link pattern",
        BOX: "modern box chain design",
        SNAKE: "smooth snake chain",
        SINGAPORE: "sparkling Singapore twist",
        FRANCO: "strong Franco box chain",
        WHEAT: "intricate wheat chain weave",
        MARINER: "nautical mariner links",
        HERRINGBONE: "flat herringbone pattern",
        BYZANTINE: "ornate Byzantine weave",
      };
      const styleDesc =
        chainStyleDescriptions[chainStyle] ||
        chainStyle.toLowerCase().replace(/_/g, " ");
      specLines.push(`- Metal: ${purity} Italian gold, ${styleDesc}`);
      specLines.push(
        `- Construction: Precision machine-made hollow/semi-hollow design`,
      );
    } else if (metalDescription) {
      specLines.push(`- Metal: ${metalDescription}`);
    }

    // Surface finish
    if (surfaceFinish) {
      specLines.push(`- Finish: ${surfaceFinish}`);
    }

    // Gemstone specifications - enhanced with quality grades
    if (specs.hasGemstones && specs.primaryStone) {
      // hasGemstones=true AND a specific stone type is selected
      const stoneDesc =
        GEMSTONE_DESCRIPTIONS[specs.primaryStone] ||
        specs.primaryStone.toLowerCase();
      const cutDesc = specs.stoneCut
        ? STONE_CUT_DESCRIPTIONS[specs.stoneCut] || specs.stoneCut.toLowerCase()
        : "";
      const caratDesc = specs.stoneCarat ? `${specs.stoneCarat} carat` : "";

      // Add color grade for diamonds
      let colorGradeDesc = "";
      if (specs.stoneColor && specs.primaryStone?.includes("DIAMOND")) {
        const colorGradeDescriptions: Record<string, string> = {
          D: "D color (colorless, exceptional white)",
          E: "E color (exceptional white)",
          F: "F color (rare white)",
          G: "G color (fine white)",
          H: "H color (white)",
          I: "I color (slightly tinted white)",
          J: "J color (tinted white)",
          K: "K color (faint color)",
          L: "L color (faint color)",
          M: "M color (faint color)",
        };
        colorGradeDesc =
          colorGradeDescriptions[specs.stoneColor] || specs.stoneColor;
      } else if (specs.stoneColor) {
        colorGradeDesc = specs.stoneColor;
      }

      // Add clarity grade for diamonds
      let clarityDesc = "";
      if (specs.stoneClarity && specs.primaryStone?.includes("DIAMOND")) {
        const clarityDescriptions: Record<string, string> = {
          IF: "IF (internally flawless)",
          VVS1: "VVS1 (very very slightly included)",
          VVS2: "VVS2 (very very slightly included)",
          VS1: "VS1 (very slightly included)",
          VS2: "VS2 (very slightly included)",
          SI1: "SI1 (slightly included)",
          SI2: "SI2 (slightly included)",
          I1: "I1 (included)",
          I2: "I2 (included)",
          I3: "I3 (included)",
        };
        clarityDesc =
          clarityDescriptions[specs.stoneClarity] || specs.stoneClarity;
      }

      // Add cut quality grade
      let cutGradeDesc = "";
      if (specs.stoneCutGrade) {
        const cutGradeDescriptions: Record<string, string> = {
          EXCELLENT: "excellent cut (maximum brilliance)",
          VERY_GOOD: "very good cut",
          GOOD: "good cut",
          FAIR: "fair cut",
        };
        cutGradeDesc =
          cutGradeDescriptions[specs.stoneCutGrade] || specs.stoneCutGrade;
      }

      const stoneFullDesc = [
        stoneDesc,
        cutDesc,
        caratDesc,
        colorGradeDesc,
        clarityDesc,
        cutGradeDesc,
      ]
        .filter(Boolean)
        .join(", ");

      const countDesc =
        specs.stoneCount && specs.stoneCount > 1
          ? ` (${specs.stoneCount} stones)`
          : "";
      specLines.push(`- Main Stone: ${stoneFullDesc}${countDesc}`);

      // Setting style
      if (specs.settingStyle) {
        const settingDesc =
          SETTING_DESCRIPTIONS[specs.settingStyle] ||
          specs.settingStyle.toLowerCase();
        specLines.push(`- Setting: ${settingDesc}`);
      }
    } else if (specs.hasGemstones && !specs.primaryStone) {
      // hasGemstones=true but no specific stone type chosen yet — acknowledge gemstones without details
      specLines.push(`- Design: Features gemstones (type to be determined)`);
    } else {
      // hasGemstones is false — explicitly a plain metal design
      specLines.push(
        `- Design: Plain metal only, NO gemstones, NO stones, NO diamonds`,
      );
    }

    // Additional gemstones if multiple exist
    if (specs.gemstones && specs.gemstones.length > 1) {
      specLines.push(
        `- Additional Stones: ${specs.gemstones.length - 1} more gemstone type(s)`,
      );
    }

    // Build full prompt
    // Build forbidden items list based on specs
    const forbiddenItems = [
      "No hands, fingers, skin, or body parts",
      "No mannequins or display stands",
      "ABSOLUTELY NO TEXT of any kind - no letters, numbers, words, labels, stamps, engravings, or markings on the jewelry or background",
      "No logos, watermarks, or brand names",
      "No additional jewelry pieces",
      "No reflections of environment",
    ];

    // Add gemstone restriction if no gemstones selected
    if (!specs.hasGemstones) {
      forbiddenItems.push(
        "No gemstones, diamonds, crystals, or stones of any kind - this is a plain metal piece only",
      );
    }

    // Add user's custom description if provided
    const userDescription = specs.additionalSpecs?.description as string;
    const customDesignNotes = userDescription
      ? `\n\nCustom Design Requirements:\n${userDescription}`
      : "";

    // Add regeneration feedback if provided (for refinement requests)
    const regenerationFeedback = specs.additionalSpecs
      ?.regenerationFeedback as string;
    const feedbackNotes = regenerationFeedback
      ? `\n\nDesign Refinement Notes (important - user wants these changes):\n${regenerationFeedback}`
      : "";

    const prompt = `${description}.

Specifications:
${specLines.join("\n")}${customDesignNotes}${feedbackNotes}

Style requirements:
- Pure white background (#FFFFFF)
- Professional jewelry studio lighting
- Soft shadows beneath the piece
- 45-degree three-quarter view angle
- Sharp focus, high detail on facets and metal
- Photorealistic product photography
- Clean, centered composition
- The jewelry must have NO text, engravings, stamps, or markings visible

Forbidden:
${forbiddenItems.map((item) => `- ${item}`).join("\n")}`;

    return prompt;
  }

  /**
   * Build a prompt for refining an uploaded customer image
   */
  buildRefinementPrompt(specs: DesignSpecs): string {
    const jewelryType =
      JEWELRY_TYPE_DESCRIPTIONS[specs.jewelryType] || "jewelry piece";
    const metalType = specs.metalType
      ? METAL_TYPE_DESCRIPTIONS[specs.metalType] || specs.metalType
      : "";
    const metalColor = specs.metalColor
      ? METAL_COLOR_DESCRIPTIONS[specs.metalColor] ||
        specs.metalColor.toLowerCase()
      : "";

    const specLines: string[] = [];

    if (metalType || metalColor) {
      specLines.push(
        `- Metal: ${[metalType, metalColor].filter(Boolean).join(" with ")}`,
      );
    }

    if (specs.hasGemstones && specs.primaryStone) {
      const stoneDesc =
        GEMSTONE_DESCRIPTIONS[specs.primaryStone] ||
        specs.primaryStone.toLowerCase();
      const cutDesc = specs.stoneCut
        ? STONE_CUT_DESCRIPTIONS[specs.stoneCut]
        : "";
      specLines.push(
        `- Stone: ${[stoneDesc, cutDesc].filter(Boolean).join(", ")}`,
      );
    }

    if (specs.surfaceFinish) {
      const finishDesc =
        SURFACE_FINISH_DESCRIPTIONS[specs.surfaceFinish] ||
        specs.surfaceFinish.toLowerCase();
      specLines.push(`- Finish: ${finishDesc}`);
    }

    return `Transform this ${jewelryType} design image with the following specifications.
Keep the EXACT shape, style, and silhouette from the reference image.

New Specifications:
${specLines.join("\n")}

Style requirements:
- Professional product photography style
- Pure white background
- Studio lighting with soft shadows
- High resolution, photorealistic
- Clean, centered composition

Forbidden:
- Do NOT change the basic shape or silhouette
- Do NOT add hands, fingers, or body parts
- Do NOT add extra decorations not in specifications`;
  }

  /**
   * Generate an image using Google Imagen 4
   */
  async generateImage(specs: DesignSpecs): Promise<GenerationResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = this.buildPrompt(specs);
    this.logger.log(
      `Generating image with prompt: ${prompt.substring(0, 100)}...`,
    );

    try {
      // Use Google Imagen 4 via the predict endpoint
      // Note: API key should be passed as header, not query parameter
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`;
      this.logger.debug(`Calling Imagen API at: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            personGeneration: "DONT_ALLOW",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Imagen API error (${response.status}): ${errorText}`,
        );
        throw new Error(
          `Image generation failed: ${response.status} - ${errorText.substring(0, 200)}`,
        );
      }

      const result = await response.json();
      this.logger.debug(
        `Imagen API response keys: ${Object.keys(result).join(", ")}`,
      );

      if (!result.predictions || result.predictions.length === 0) {
        this.logger.error(
          `No images in response: ${JSON.stringify(result).substring(0, 500)}`,
        );
        throw new Error("No images generated - API returned empty result");
      }

      // The response contains base64-encoded image data in predictions[].bytesBase64Encoded
      const imageData = result.predictions[0];

      // Validate the prediction response — log full structure for diagnosis
      this.logger.debug(
        `Imagen prediction keys: ${Object.keys(imageData || {}).join(", ")}`,
      );

      // Check for content safety filter block
      if (imageData?.raiFilteredReason) {
        this.logger.error(
          `Imagen content safety filter triggered: ${imageData.raiFilteredReason}`,
        );
        throw new Error(
          `Image generation blocked by content safety filter: ${imageData.raiFilteredReason}`,
        );
      }

      // Validate that base64 image data is present and non-trivial
      const b64 = imageData?.bytesBase64Encoded;
      if (!b64 || b64.length < 1000) {
        this.logger.error(
          `Imagen returned empty or suspiciously small base64 data (length: ${b64?.length ?? 0}). Full prediction: ${JSON.stringify(imageData).substring(0, 500)}`,
        );
        throw new Error(
          "Image generation returned invalid or empty image data. Please try again.",
        );
      }

      // Determine mime type from prediction if available
      const mimeType = imageData?.mimeType || "image/png";
      const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpeg" : "png";

      return {
        imageUrl: `data:image/${ext};base64,${b64}`,
        prompt,
        cached: false,
      };
    } catch (error) {
      this.logger.error(`Image generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Generate an image by refining an uploaded reference image
   * Uses image-to-image transformation
   */
  async refineImage(
    referenceImageUrl: string,
    specs: DesignSpecs,
  ): Promise<GenerationResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = this.buildRefinementPrompt(specs);
    this.logger.log(
      `Refining image with prompt: ${prompt.substring(0, 100)}...`,
    );

    try {
      // Fetch the reference image
      const imageResponse = await fetch(referenceImageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      const mimeType =
        imageResponse.headers.get("content-type") || "image/jpeg";

      // Use Gemini's image editing capability
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["image", "text"],
              responseMimeType: "image/jpeg",
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Gemini API error: ${error}`);
        throw new Error(`Image refinement failed: ${response.status}`);
      }

      const result = await response.json();

      // Extract image from response
      const parts = result.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(
        (p: { inlineData?: unknown }) => p.inlineData,
      );

      if (!imagePart?.inlineData?.data) {
        // If no image generated, fall back to generating from scratch
        this.logger.warn(
          "Image refinement did not produce an image, falling back to generation",
        );
        return this.generateImage(specs);
      }

      return {
        imageUrl: `data:image/jpeg;base64,${imagePart.inlineData.data}`,
        prompt,
        cached: false,
      };
    } catch (error) {
      this.logger.error(`Image refinement failed: ${error}`);
      // Fall back to generating from scratch
      return this.generateImage(specs);
    }
  }
}
