import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

interface DesignSpecs {
  jewelryType: string;
  buildMethod: string;
  metalType?: string;
  metalColor?: string;
  weightCategory?: string;
  estimatedWeight?: number;
  surfaceFinish?: string;
  hasGemstones?: boolean;
  primaryStone?: string;
  stoneCut?: string;
  stoneCarat?: number;
  stoneColor?: string;
  settingStyle?: string;
  additionalSpecs?: Record<string, unknown>;
}

interface GenerationResult {
  imageUrl: string;
  prompt: string;
  cached: boolean;
}

// Metal color descriptions for prompt
const METAL_COLOR_DESCRIPTIONS: Record<string, string> = {
  YELLOW: 'warm rich yellow gold',
  WHITE: 'bright silvery white gold',
  ROSE: 'soft pinkish rose gold',
};

// Metal type descriptions for prompt
const METAL_TYPE_DESCRIPTIONS: Record<string, string> = {
  GOLD_24K: '24 karat pure gold',
  GOLD_22K: '22 karat gold',
  GOLD_18K: '18 karat gold',
  GOLD_14K: '14 karat gold',
  GOLD_10K: '10 karat gold',
  SILVER_999: 'fine silver (99.9%)',
  SILVER_925: 'sterling silver (92.5%)',
  PLATINUM_950: 'platinum (95%)',
  PLATINUM_900: 'platinum (90%)',
  PALLADIUM_950: 'palladium (95%)',
};

// Gemstone descriptions for prompt
const GEMSTONE_DESCRIPTIONS: Record<string, string> = {
  DIAMOND_NATURAL: 'natural diamond',
  DIAMOND_LAB: 'lab-grown diamond',
  MOISSANITE: 'moissanite',
  CUBIC_ZIRCONIA: 'cubic zirconia',
  RUBY: 'ruby with deep red color',
  SAPPHIRE: 'sapphire with rich blue color',
  EMERALD: 'emerald with deep green color',
  PEARL: 'lustrous pearl',
  AMETHYST: 'purple amethyst',
  TOPAZ: 'topaz',
  GARNET: 'deep red garnet',
  OPAL: 'opal with play of colors',
  TURQUOISE: 'turquoise',
  AQUAMARINE: 'light blue aquamarine',
  PERIDOT: 'olive green peridot',
  CITRINE: 'golden yellow citrine',
};

// Stone cut descriptions for prompt
const STONE_CUT_DESCRIPTIONS: Record<string, string> = {
  ROUND: 'round brilliant cut',
  OVAL: 'oval cut',
  PRINCESS: 'princess cut (square)',
  CUSHION: 'cushion cut',
  EMERALD_CUT: 'emerald cut (rectangular step-cut)',
  MARQUISE: 'marquise cut (boat-shaped)',
  PEAR: 'pear/teardrop cut',
  HEART: 'heart-shaped cut',
  RADIANT: 'radiant cut',
  ASSCHER: 'asscher cut',
  BAGUETTE: 'baguette cut (rectangular)',
  TRILLION: 'trillion cut (triangular)',
  CABOCHON: 'cabochon (smooth dome)',
};

// Setting style descriptions for prompt
const SETTING_DESCRIPTIONS: Record<string, string> = {
  PRONG: 'prong setting',
  BEZEL: 'bezel setting',
  CHANNEL: 'channel setting',
  PAVE: 'pave setting with small diamonds',
  FLUSH: 'flush/gypsy setting',
  TENSION: 'tension setting',
  HALO: 'halo setting with surrounding stones',
  CLUSTER: 'cluster setting',
  BAR: 'bar setting',
  INVISIBLE: 'invisible setting',
};

// Jewelry type descriptions for prompt
const JEWELRY_TYPE_DESCRIPTIONS: Record<string, string> = {
  RING: 'ring',
  NECKLACE: 'necklace',
  BRACELET: 'bracelet',
  BANGLE: 'bangle',
  EARRING: 'pair of earrings',
  PENDANT: 'pendant',
  CHAIN: 'chain',
  ANKLET: 'anklet',
  NOSE_PIN: 'nose pin',
  MANGALSUTRA: 'mangalsutra',
  MAANG_TIKKA: 'maang tikka',
  OTHER: 'jewelry piece',
};

// Surface finish descriptions
const SURFACE_FINISH_DESCRIPTIONS: Record<string, string> = {
  HIGH_POLISH: 'high polish mirror finish',
  MATTE: 'matte finish',
  BRUSHED: 'brushed satin finish',
  SATIN: 'satin finish',
  HAMMERED: 'hammered texture',
  SANDBLASTED: 'sandblasted finish',
  FLORENTINE: 'florentine finish',
  BARK_TEXTURE: 'bark texture',
  DIAMOND_CUT: 'diamond cut faceted finish',
  ENGRAVED: 'engraved details',
};

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  /**
   * Generate a unique hash from design specifications
   * Used for caching and deduplication
   */
  generateSpecHash(specs: DesignSpecs): string {
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
      stoneCarat: specs.stoneCarat ? Math.round(specs.stoneCarat * 10) / 10 : null,
      stoneColor: specs.stoneColor?.toUpperCase() || null,
      settingStyle: specs.settingStyle?.toUpperCase() || null,
    };

    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  /**
   * Build the prompt string from design specifications
   */
  buildPrompt(specs: DesignSpecs): string {
    const jewelryType = JEWELRY_TYPE_DESCRIPTIONS[specs.jewelryType] || 'jewelry piece';
    const metalType = specs.metalType ? METAL_TYPE_DESCRIPTIONS[specs.metalType] || specs.metalType : '';
    const metalColor = specs.metalColor ? METAL_COLOR_DESCRIPTIONS[specs.metalColor] || specs.metalColor.toLowerCase() : '';
    const surfaceFinish = specs.surfaceFinish ? SURFACE_FINISH_DESCRIPTIONS[specs.surfaceFinish] || specs.surfaceFinish.toLowerCase() : '';
    
    // Build base description
    let description = `Professional product photograph of a ${jewelryType}`;
    
    // Add specifications section
    const specLines: string[] = [];
    
    // Metal specifications
    if (metalType || metalColor) {
      const metalDesc = [metalType, metalColor].filter(Boolean).join(' with ');
      specLines.push(`- Metal: ${metalDesc}`);
    }
    
    // Surface finish
    if (surfaceFinish) {
      specLines.push(`- Finish: ${surfaceFinish}`);
    }
    
    // Gemstone specifications
    if (specs.hasGemstones && specs.primaryStone) {
      const stoneDesc = GEMSTONE_DESCRIPTIONS[specs.primaryStone] || specs.primaryStone.toLowerCase();
      const cutDesc = specs.stoneCut ? STONE_CUT_DESCRIPTIONS[specs.stoneCut] || specs.stoneCut.toLowerCase() : '';
      const caratDesc = specs.stoneCarat ? `${specs.stoneCarat} carat` : '';
      const colorDesc = specs.stoneColor || '';
      
      const stoneFullDesc = [stoneDesc, cutDesc, caratDesc, colorDesc].filter(Boolean).join(', ');
      specLines.push(`- Main Stone: ${stoneFullDesc}`);
      
      // Setting style
      if (specs.settingStyle) {
        const settingDesc = SETTING_DESCRIPTIONS[specs.settingStyle] || specs.settingStyle.toLowerCase();
        specLines.push(`- Setting: ${settingDesc}`);
      }
    }
    
    // Build full prompt
    const prompt = `${description}.

Specifications:
${specLines.join('\n')}

Style requirements:
- Pure white background (#FFFFFF)
- Professional jewelry studio lighting
- Soft shadows beneath the piece
- 45-degree three-quarter view angle
- Sharp focus, high detail on facets and metal
- Photorealistic product photography
- Clean, centered composition

Forbidden:
- No hands, fingers, skin, or body parts
- No mannequins or display stands
- No text, logos, or watermarks
- No additional jewelry pieces
- No reflections of environment`;

    return prompt;
  }

  /**
   * Build a prompt for refining an uploaded customer image
   */
  buildRefinementPrompt(specs: DesignSpecs): string {
    const jewelryType = JEWELRY_TYPE_DESCRIPTIONS[specs.jewelryType] || 'jewelry piece';
    const metalType = specs.metalType ? METAL_TYPE_DESCRIPTIONS[specs.metalType] || specs.metalType : '';
    const metalColor = specs.metalColor ? METAL_COLOR_DESCRIPTIONS[specs.metalColor] || specs.metalColor.toLowerCase() : '';
    
    const specLines: string[] = [];
    
    if (metalType || metalColor) {
      specLines.push(`- Metal: ${[metalType, metalColor].filter(Boolean).join(' with ')}`);
    }
    
    if (specs.hasGemstones && specs.primaryStone) {
      const stoneDesc = GEMSTONE_DESCRIPTIONS[specs.primaryStone] || specs.primaryStone.toLowerCase();
      const cutDesc = specs.stoneCut ? STONE_CUT_DESCRIPTIONS[specs.stoneCut] : '';
      specLines.push(`- Stone: ${[stoneDesc, cutDesc].filter(Boolean).join(', ')}`);
    }
    
    if (specs.surfaceFinish) {
      const finishDesc = SURFACE_FINISH_DESCRIPTIONS[specs.surfaceFinish] || specs.surfaceFinish.toLowerCase();
      specLines.push(`- Finish: ${finishDesc}`);
    }

    return `Transform this ${jewelryType} design image with the following specifications.
Keep the EXACT shape, style, and silhouette from the reference image.

New Specifications:
${specLines.join('\n')}

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
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = this.buildPrompt(specs);
    this.logger.log(`Generating image with prompt: ${prompt.substring(0, 100)}...`);

    try {
      // Use Google GenAI for image generation
      // Note: This uses the REST API directly for better control
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            number_of_images: 1,
            output_mime_type: 'image/jpeg',
            person_generation: 'DONT_ALLOW',
            aspect_ratio: '1:1',
            image_size: '1K',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Imagen API error: ${error}`);
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.generatedImages || result.generatedImages.length === 0) {
        throw new Error('No images generated');
      }

      // The response contains base64-encoded image data
      const imageData = result.generatedImages[0];
      
      // For now, return the base64 data - the controller will handle uploading to R2
      return {
        imageUrl: `data:image/jpeg;base64,${imageData.image.imageBytes}`,
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
    specs: DesignSpecs
  ): Promise<GenerationResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = this.buildRefinementPrompt(specs);
    this.logger.log(`Refining image with prompt: ${prompt.substring(0, 100)}...`);

    try {
      // Fetch the reference image
      const imageResponse = await fetch(referenceImageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      // Use Gemini's image editing capability
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
              responseModalities: ['image', 'text'],
              responseMimeType: 'image/jpeg',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Gemini API error: ${error}`);
        throw new Error(`Image refinement failed: ${response.status}`);
      }

      const result = await response.json();

      // Extract image from response
      const parts = result.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData);

      if (!imagePart?.inlineData?.data) {
        // If no image generated, fall back to generating from scratch
        this.logger.warn('Image refinement did not produce an image, falling back to generation');
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
