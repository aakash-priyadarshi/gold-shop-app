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
  name: 'Orivraa',
  tagline: 'Premium Jewellery Marketplace',
  description: 'Discover and customize exquisite jewellery from trusted artisans',
  
  // Contact
  supportEmail: 'support@orivraa.com',
  salesEmail: 'sales@orivraa.com',
  contact: {
    address: 'Kathmandu, Nepal',
    phone: '+977 1-1234567',
    supportEmail: 'support@orivraa.com',
  },
  
  // Business
  feePct: 1, // Platform fee percentage
  
  // Social
  social: {
    twitter: 'https://twitter.com/orivraa',
    instagram: 'https://instagram.com/orivraa',
    facebook: 'https://facebook.com/orivraa',
    linkedin: 'https://linkedin.com/company/orivraa',
  },
  
  // Legal
  companyName: 'Orivraa Technologies Pvt. Ltd.',
  foundedYear: 2024,
  
  // SEO
  seo: {
    title: 'Orivraa - Premium Jewellery Marketplace',
    titleTemplate: '%s | Orivraa',
    defaultDescription: 'Discover and customize exquisite jewellery from trusted artisans. Shop gold, silver, and precious gemstone jewellery with verified quality.',
    keywords: ['jewellery', 'gold', 'silver', 'custom jewellery', 'marketplace', 'Nepal', 'India'],
  },
  
  // Colors (matching Tailwind config)
  colors: {
    primary: '#C9A227', // Gold
    primaryDark: '#A68A21',
    primaryLight: '#E5C76B',
    accent: '#1a1a2e',
  },
};

export type BrandConfig = typeof BRAND;
