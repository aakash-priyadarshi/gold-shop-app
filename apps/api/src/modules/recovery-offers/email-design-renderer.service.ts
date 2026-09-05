import { Injectable } from "@nestjs/common";
import { OfferEmailRenderer } from "@gold-shop/shared";

export type { EmailDesignRenderOptions, RenderedEmailDesign } from "@gold-shop/shared";

/** The browser canvas and outgoing mail share exactly the same HTML renderer. */
@Injectable()
export class EmailDesignRendererService extends OfferEmailRenderer {}
