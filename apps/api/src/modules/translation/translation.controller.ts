import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { TranslateBatchDto, TranslateHtmlDto } from "./dto/translate.dto";
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

  /**
   * POST /translation/html
   *
   * Translate a full HTML document/fragment (blog post, CMS page, etc.).
   * Segments are cached individually so only changed content costs AI calls.
   * The full assembled result is also cached by content hash.
   *
   * If the client sends the same contentHash it already has, and the server
   * has a cached translation for that hash, it's effectively free.
   */
  @Post("html")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests/min
  async translateHtml(
    @Body() dto: TranslateHtmlDto,
  ): Promise<{ html: string; contentHash: string; fromCache: boolean }> {
    return this.translationService.translateHtml(dto.html, dto.locale);
  }
}
