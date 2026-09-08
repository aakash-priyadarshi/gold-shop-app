export interface RawMapsPlace {
  shopName: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  googlePlaceUrl?: string;
  category?: string;
}

export interface EnrichedShopLead extends RawMapsPlace {
  email?: string;
  allEmails?: string[];
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  source: "GOOGLE_MAPS" | "AI_CHATBOT" | "MANUAL_IMPORT";
  scrapedAt: string;
}

export interface ScraperOptions {
  query: string;
  limit?: number;
  headless?: boolean;
  crawlEmails?: boolean;
  countryHint?: string;
  outputDir?: string;
}

export interface IngestLeadPayload {
  shopName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  rating?: number;
  reviewCount?: number;
  source: "GOOGLE_MAPS" | "AI_CHATBOT" | "MANUAL_IMPORT";
  metadata?: Record<string, any>;
}

export interface SyncOptions {
  apiUrl?: string;
  adminToken?: string;
  leads: IngestLeadPayload[];
}
