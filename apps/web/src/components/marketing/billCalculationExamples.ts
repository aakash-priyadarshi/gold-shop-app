export type BillMarket = "IN" | "NP" | "AE" | "UK" | "US" | "LK" | "EU";

export interface BillLine {
  label: string;
  detail: string;
  amount: string;
  liveRate?: boolean;
}

export interface BillExample {
  id: BillMarket;
  flag: string;
  marketName: string;
  currency: string;
  lines: BillLine[];
  subtotal: string;
  taxes: Array<{ label: string; amount: string }>;
  total: string;
  regimeNote: string;
}

export const BILL_EXAMPLES: BillExample[] = [
  {
    id: "IN",
    flag: "🇮🇳",
    marketName: "India",
    currency: "INR",
    lines: [
      {
        label: "22K Gold Necklace",
        detail: "28.4g × live rate",
        amount: "₹1,42,000",
        liveRate: true,
      },
      { label: "Making charges", detail: "12% on metal", amount: "₹17,040" },
      { label: "Wastage (jarti)", detail: "8%", amount: "₹11,360" },
      { label: "Ruby (gemstone)", detail: "—", amount: "₹8,500" },
    ],
    subtotal: "₹1,78,900",
    taxes: [
      { label: "GST on metal (3%)", amount: "₹4,260" },
      { label: "GST on making (5%)", amount: "₹852" },
    ],
    total: "₹1,84,012",
    regimeNote: "India GST 2024 — split metal vs making on every line",
  },
  {
    id: "NP",
    flag: "🇳🇵",
    marketName: "Nepal",
    currency: "NPR",
    lines: [
      {
        label: "22K Gold Ring",
        detail: "8.5g × live rate (tola-ready)",
        amount: "NPR 1,54,700",
        liveRate: true,
      },
      { label: "Making charges", detail: "Per gram", amount: "NPR 18,500" },
      { label: "Wastage (jarti)", detail: "6%", amount: "NPR 9,282" },
      { label: "Diamond stud", detail: "Gemstone line", amount: "NPR 45,000" },
    ],
    subtotal: "NPR 2,27,482",
    taxes: [
      { label: "Skill Promotion Fee (0.5%)", amount: "NPR 1,137" },
      { label: "VAT on gemstone (13%)", amount: "NPR 5,850" },
    ],
    total: "NPR 2,34,469",
    regimeNote: "Nepal FY 2083/84+ — Skill Promotion Fee + gemstone VAT",
  },
  {
    id: "AE",
    flag: "🇦🇪",
    marketName: "UAE / Dubai",
    currency: "AED",
    lines: [
      {
        label: "22K Gold Bracelet",
        detail: "45g × live rate",
        amount: "AED 14,400",
        liveRate: true,
      },
      { label: "Making charges", detail: "10%", amount: "AED 1,440" },
      { label: "Wastage", detail: "5%", amount: "AED 720" },
      { label: "Diamond accents", detail: "—", amount: "AED 3,500" },
    ],
    subtotal: "AED 20,060",
    taxes: [{ label: "VAT (5%)", amount: "AED 1,003" }],
    total: "AED 21,063",
    regimeNote: "UAE FTA VAT on worked jewellery at the counter",
  },
  {
    id: "UK",
    flag: "🇬🇧",
    marketName: "United Kingdom",
    currency: "GBP",
    lines: [
      {
        label: "18K Gold Necklace",
        detail: "32g × live rate",
        amount: "£2,400",
        liveRate: true,
      },
      { label: "Making charges", detail: "20% labour", amount: "£480" },
      { label: "Wastage", detail: "4%", amount: "£96" },
      { label: "Sapphire", detail: "—", amount: "£650" },
    ],
    subtotal: "£3,626",
    taxes: [{ label: "VAT (20%)", amount: "£725" }],
    total: "£4,351",
    regimeNote: "UK VAT 2024 — MTD-ready invoice breakdown",
  },
  {
    id: "EU",
    flag: "🇪🇺",
    marketName: "Europe",
    currency: "EUR",
    lines: [
      {
        label: "18K Gold Pendant",
        detail: "14g × live rate",
        amount: "€1,120",
        liveRate: true,
      },
      { label: "Making charges", detail: "Per piece", amount: "€280" },
      { label: "Wastage", detail: "3%", amount: "€34" },
      { label: "Emerald", detail: "—", amount: "€420" },
    ],
    subtotal: "€1,854",
    taxes: [{ label: "VAT (20%)", amount: "€371" }],
    total: "€2,225",
    regimeNote: "EU OSS VAT — single receipt for cross-border sales",
  },
  {
    id: "US",
    flag: "🇺🇸",
    marketName: "United States",
    currency: "USD",
    lines: [
      {
        label: "14K Gold Ring",
        detail: "12g × live rate (dwt supported)",
        amount: "$1,140",
        liveRate: true,
      },
      { label: "Making charges", detail: "20%", amount: "$228" },
      { label: "Wastage", detail: "3%", amount: "$34" },
      { label: "Diamond", detail: "—", amount: "$890" },
    ],
    subtotal: "$2,292",
    taxes: [{ label: "Sales tax (state-based)", amount: "Varies" }],
    total: "$2,292+",
    regimeNote: "US sales tax by state — metal, making & stones itemised",
  },
  {
    id: "LK",
    flag: "🇱🇰",
    marketName: "Sri Lanka",
    currency: "LKR",
    lines: [
      {
        label: "22K Gold Ring",
        detail: "6.2g × live rate",
        amount: "LKR 260,400",
        liveRate: true,
      },
      { label: "Making charges", detail: "20%", amount: "LKR 52,080" },
      { label: "Wastage", detail: "5%", amount: "LKR 13,020" },
    ],
    subtotal: "LKR 325,500",
    taxes: [{ label: "VAT (18%)", amount: "LKR 58,590" }],
    total: "LKR 384,090",
    regimeNote: "Sri Lanka VAT — tax invoice & receipt formats supported",
  },
];
