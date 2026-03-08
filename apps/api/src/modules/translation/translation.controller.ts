import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { TranslateBatchDto } from "./dto/translate.dto";
import { TranslationService } from "./translation.service";

@Controller("translation")
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  /**
   * POST /translation/batch
   *
   * Translate a batch of English UI texts to a target locale.
   * Uses Gemini Flash with permanent Redis caching.
   */
  @Post("batch")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests/min
  async translateBatch(
    @Body() dto: TranslateBatchDto,
  ): Promise<{ translations: string[] }> {
    const translations = await this.translationService.translateBatch(
      dto.texts,
      dto.locale,
    );
    return { translations };
  }
}
