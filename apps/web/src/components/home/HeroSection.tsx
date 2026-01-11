'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useMarket, MarketRegion } from '@/hooks/useMarket';
import { 
  Gem, 
  ShieldCheck, 
  HeartHandshake,
  ArrowRight,
  Star,
  Sparkles,
} from 'lucide-react';

export function HeroSection() {
  const { config, selectedCountry, isLoading } = useMarket();

  // Default content for server rendering / loading state
  const headline = config?.heroHeadline || 'Discover Exquisite Jewellery From Trusted Artisans';
  const subheadline = config?.heroSubheadline || 
    'Connect with verified local jewellers, browse ready-made pieces, or get custom jewellery crafted exactly to your specifications.';
  
  // Market-specific badge text
  const badgeTextMap: Record<MarketRegion, string> = {
    NP: "Nepal's Premier Jewellery Marketplace",
    IN: "India's Trusted Jewellery Marketplace",
    US: "America's Artisan Jewellery Marketplace",
    UK: "Britain's Finest Jewellery Marketplace",
    EU: "Europe's Premium Jewellery Marketplace",
    AE: "UAE's Luxury Jewellery Marketplace",
  };
  const badgeText = badgeTextMap[selectedCountry] || "Your Premium Jewellery Marketplace";

  return (
    <section className="relative bg-gradient-to-b from-gold-50 via-amber-50/50 to-white py-12 lg:py-24 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gold-200 rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-amber-200 rounded-full blur-3xl opacity-30" />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-100 rounded-full text-gold-700 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              {badgeText}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
              {headline.includes('Jewellery') ? (
                <>
                  {headline.split('Jewellery')[0]}
                  <span className="gold-text-gradient"> Jewellery</span>
                  {headline.split('Jewellery')[1]}
                </>
              ) : (
                headline
              )}
            </h1>
            <p className="text-base lg:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
              {subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/shop">
                <Button size="lg" className="w-full sm:w-auto gold-gradient text-white h-12 px-8 rounded-xl text-base">
                  Browse Collection
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/rfq/create">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base">
                  Custom Order
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Stats Card */}
          <div className="relative mt-8 lg:mt-0">
            <div className="aspect-square bg-gradient-to-br from-gold-200 to-gold-400 rounded-full opacity-20 absolute -top-10 -right-10 w-72 h-72 blur-3xl" />
            <div className="relative bg-white rounded-2xl lg:rounded-3xl shadow-2xl shadow-gold-500/10 p-6 lg:p-8">
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                  <Gem className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">500+</p>
                  <p className="text-xs lg:text-sm text-gray-600">Unique Designs</p>
                </div>
                <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                  <ShieldCheck className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">100%</p>
                  <p className="text-xs lg:text-sm text-gray-600">Certified Pure</p>
                </div>
                <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                  <HeartHandshake className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">50+</p>
                  <p className="text-xs lg:text-sm text-gray-600">Trusted Sellers</p>
                </div>
                <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                  <Star className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">4.9</p>
                  <p className="text-xs lg:text-sm text-gray-600">Avg. Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
