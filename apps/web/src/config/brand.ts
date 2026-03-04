/**
 * Orivraa Brand Configuration
 * Central source of truth for all branding elements
 */

export const BRAND: {
  name: string;
  tagline: string;
  description: string;
  supportEmail: string;
  salesEmail: string;
  contact: {
    address: string;
    phone: string;
    supportEmail: string;
  };
  feePct: number;
  social: {
    twitter: string;
    instagram: string;
    facebook: string;
    linkedin: string;
  };
  companyName: string;
  foundedYear: number;
  seo: {
    title: string;
    titleTemplate: string;
    defaultDescription: string;
    keywords: string[];
  };
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
  };
} = {
  // Core identity
  name: "Orivraa",
  tagline: "Premium Jewellery Marketplace",
  description:
    "Discover and customize exquisite jewellery from trusted artisans",

  // Contact
  supportEmail: "support@orivraa.com",
  salesEmail: "sales@orivraa.com",
  contact: {
    address: "Kathmandu, Nepal",
    phone: "+977 1-1234567",
    supportEmail: "support@orivraa.com",
  },

  // Business
  feePct: 1, // Platform fee percentage

  // Social
  social: {
    twitter: "https://twitter.com/orivraa",
    instagram: "https://instagram.com/orivraa",
    facebook: "https://facebook.com/orivraa",
    linkedin: "https://linkedin.com/company/orivraa",
  },

  // Legal
  companyName: "Orivraa Technologies Pvt. Ltd.",
  foundedYear: 2024,

  // SEO
  seo: {
    title:
      "Orivraa - Premium Jewellery Marketplace | Gold & Diamond Jewellery Online",
    titleTemplate: "%s | Orivraa",
    defaultDescription:
      "Shop gold, silver & diamond jewellery from verified artisans worldwide. Buy 22K gold necklaces, rings, earrings & custom designs online. Trusted jewellers in Nepal, India, Dubai, USA & UK. Free quality verification on every purchase.",
    keywords: [
      // Core terms (both spellings for US/UK coverage)
      "jewellery",
      "jewelry",
      "gold",
      "silver",
      "diamond",
      "gemstone",
      "custom jewellery",
      "handmade jewellery",
      "jewellery marketplace",
      "buy gold online",
      "gold jewellery online",
      "buy jewellery online",
      "premium jewellery",
      "Orivraa",
      "trusted artisans",
      "verified jewellers",

      // Product types
      "22K gold necklace",
      "gold ring",
      "gold earrings",
      "gold bangles",
      "diamond ring",
      "diamond necklace",
      "silver jewellery",
      "platinum jewellery",
      "bridal jewellery",
      "wedding gold",
      "engagement ring",
      "mangalsutra",
      "gold chain",
      "gold pendant",
      "kundan jewellery",
      "temple jewellery",
      "antique jewellery",
      "polki jewellery",

      // Nepal
      "jewellery shop in Nepal",
      "gold shop in Nepal",
      "jewellers in Kathmandu",
      "best jewellery shop Kathmandu",
      "Nepal gold jewellery",
      "nepali jewellery",

      // India
      "jewellery shop in India",
      "gold jewellery India",
      "buy gold India",
      "jewellers in Delhi",
      "jewellers in Mumbai",
      "jewellers in Jaipur",
      "tanishq alternative",
      "Indian gold jewellery online",
      "hallmarked gold jewellery",
      "BIS hallmark gold",
      "22 carat gold jewellery India",
      "gold rate today India",

      // Dubai / UAE
      "gold jewellery Dubai",
      "Dubai gold souk online",
      "buy gold Dubai",
      "jewellery shop Dubai",
      "gold shop UAE",
      "Dubai jewellers",
      "22K gold Dubai",
      "gold rate Dubai",
      "diamond jewellery Dubai",

      // USA
      "jewelry store USA",
      "buy gold jewelry online USA",
      "gold jewelry near me",
      "custom jewelry USA",
      "Indian jewelry store USA",
      "gold chain USA",
      "22K gold jewelry USA",
      "handmade jewelry online",

      // UK
      "jewellery shop UK",
      "gold jewellery UK",
      "buy gold online UK",
      "Indian jewellery UK",
      "hallmarked jewellery UK",
      "gold shop London",
      "Asian jewellery UK",
      "bespoke jewellery UK",

      // Commercial intent
      "gold price today",
      "gold shop near me",
      "jewellery shop near me",
      "custom gold ring online",
      "order jewellery online",
      "jewellery delivery worldwide",

      // Jewellery shop software (B2B)
      "jewellery shop software",
      "jewellery software",
      "gold shop software",
      "jewellery management software",
      "jewellery ERP",
      "jewellery billing software",
      "jewellery inventory software",
      "jewellery POS software",
      "jewellery shop management",
      "jewellery CRM",
      "software for jewellery shops",
      "software for gold shops",
      "best jewellery software",
      "free jewellery software",
      "cloud jewellery software",
      "jewellery catalogue software",
      "jewellery shop app",
      "Zoho alternative jewellery",
      "Marg ERP alternative",
      "Vyapar alternative jewellery",

      // Blog & content marketing
      "jewellery business blog",
      "jewellery inventory management guide",
      "GST for jewellery shops",
      "jewellery GST billing",
      "sell jewellery online guide",
      "jewellery software comparison",
      "gold shop management tips",
    ],
  },

  // Colors (matching Tailwind config)
  colors: {
    primary: "#C9A227", // Gold
    primaryDark: "#A68A21",
    primaryLight: "#E5C76B",
    accent: "#1a1a2e",
  },
};

export type BrandConfig = typeof BRAND;
