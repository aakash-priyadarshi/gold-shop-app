/**
 * Price Resolver Types
 * Unified pricing resolution for catalog, invoice, RFQ, and quote flows.
 * Every component resolves to: reference (Orivraa engine) vs shop rate vs effective.
 */

export type PriceComponentType =
  | "METAL"
  | "MAKING"
  | "GEMSTONE"
  | "PLATING"
  | "FINISH"
  | "WASTAGE"
  | "TAX";

export type PriceComponentSource =
  | "REFERENCE"   // Orivraa engine default (live market, platform catalog)
  | "SHOP"        // Shop-configured override from Pricing Setup
  | "STORED"      // Frozen catalog value from InventoryItem
  | "MANUAL";     // User-entered override

export interface ResolvedComponent {
  component: PriceComponentType;
  /** Orivraa reference amount (engine-calculated) */
  referenceAmount: number;
  /** Shop-configured rate amount, null if not set */
  shopAmount: number | null;
  /** Effective amount = shopAmount ?? referenceAmount */
  effectiveAmount: number;
  /** What source won */
  source: PriceComponentSource;
  /** Additional metadata */
  meta?: {
    ratePerGram?: number;
    rateSource?: string;
    stoneType?: string;
    stoneCount?: number;
    metalCode?: string;
    weightG?: number;
    purity?: number;
    asOf?: string;
  };
}

export interface ResolvedPrice {
  /** Sum of all reference components */
  referenceTotal: number;
  /** Sum of shop amounts where set, null if no shop rates at all */
  shopTotal: number | null;
  /** Sum of effective amounts (what gets billed) */
  effectiveTotal: number;
  /** Stored catalog price if applicable */
  storedTotal?: number;
  /** Per-component breakdown */
  components: ResolvedComponent[];
  currency: string;
  country: string;
  resolvedAt: string;
}

/** Request to resolve a single item's price */
export interface ResolvePriceRequest {
  shopId: string;
  /** Optional inventory item ID — pulls composition from DB */
  inventoryItemId?: string;
  /** Composition override (for new items not yet in DB) */
  composition?: {
    method?: string;
    metalType?: string;
    metalWeightG?: number;
    purity?: number;
    gemstones?: Array<{
      type: string;
      caratWeight?: number;
      sizeMm?: number;
      quality?: string;
      origin?: string;
      count?: number;
    }>;
    platingType?: string;
    finishType?: string;
    baseMetalType?: string;
  };
  /** Override making charge calculation */
  makingOverride?: number;
  /** Override wastage percent */
  wastagePercent?: number;
}

/** Bulk resolve for catalog list live pricing */
export interface BulkResolveRequest {
  shopId: string;
  itemIds: string[];
}

export interface BulkResolveResponse {
  items: Record<string, ResolvedPrice>;
  resolvedAt: string;
  cached: boolean;
}
