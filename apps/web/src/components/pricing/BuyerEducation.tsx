"use client";

import { Globe, Info } from "lucide-react";

const COUNTRY_CALLOUTS: Record<
  string,
  { title: string; message: string; highlight: string }
> = {
  IN: {
    title: "Why Orivraa saves you money in India",
    message:
      "Traditional jewellers in India charge 25-35% making charges with hidden costs. Orivraa connects you directly with verified karigars and hallmark-certified shops, cutting out middlemen. Our transparent pricing means you see exactly what you pay for — no wastage surprises.",
    highlight: "Save 15-25% vs. traditional showrooms",
  },
  AE: {
    title: "Smart gold buying in the UAE",
    message:
      "Dubai's gold souk and mall showrooms mark up heavily on making charges (often 20-40%) and design fees. With Orivraa, you access competitive craftsmen across the region with capped, transparent making charges and no hidden design fees.",
    highlight: "Transparent pricing, no hidden markup",
  },
  UK: {
    title: "Better value than UK high-street jewellers",
    message:
      "UK high-street jewellers add significant overheads — rent, staffing, and brand premiums — often inflating prices by 40-60%. Orivraa gives you access to skilled artisans at fraction of the cost, with full hallmark certification and quality guarantees.",
    highlight: "Up to 50% less than high-street prices",
  },
  US: {
    title: "Why Orivraa beats US retail jewellery prices",
    message:
      "Retail jewellers in the US have massive overheads with mall rents and marketing costs baked into prices. Orivraa's direct-from-maker model eliminates these middleman costs, giving you the same quality at significantly lower prices.",
    highlight: "Direct-from-maker savings",
  },
  EU: {
    title: "European quality at honest prices",
    message:
      "European jewellery brands carry luxury premiums of 50-100% over material value. Orivraa brings you artisan-crafted pieces at transparent prices — you pay for the gold, the craftsmanship, and nothing else.",
    highlight: "No brand premium, pure value",
  },
  NP: {
    title: "Quality gold at fair prices in Nepal",
    message:
      "Many local jewellers in Nepal lack price transparency and standardized making charges. Orivraa brings verified sellers with standardized pricing, so you always know the metal rate, making charge, and total — no haggling required.",
    highlight: "Standardized pricing, no hidden costs",
  },
};

// Fallback for unknown countries
const DEFAULT_CALLOUT = {
  title: "Why choose Orivraa?",
  message:
    "Traditional jewellery retail comes with hidden markups and middleman costs. Orivraa connects you directly with verified craftsmen, offering transparent pricing with no hidden fees. What you see is what you pay.",
  highlight: "Transparent pricing, direct from makers",
};

interface BuyerEducationProps {
  country: string;
}

/**
 * Country-specific buyer education callout.
 * Shows pricing advantage messaging based on Cloudflare-detected country.
 */
export function BuyerEducation({ country }: BuyerEducationProps) {
  const callout = COUNTRY_CALLOUTS[country] || DEFAULT_CALLOUT;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Globe className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-amber-900 text-sm">
            {callout.title}
          </h4>
          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
            {callout.message}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-medium">
            <Info className="h-3 w-3" />
            {callout.highlight}
          </div>
        </div>
      </div>
    </div>
  );
}
