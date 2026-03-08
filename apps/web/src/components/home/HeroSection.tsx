"use client";

import { HeroVideo } from "@/components/HeroVideo";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { MarketRegion, useMarket } from "@/hooks/useMarket";
import {
  ArrowRight,
  Gem,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  /** CDN URL to the geo-resolved hero video (passed from server component). */
  videoSrc?: string;
}

export function HeroSection({ videoSrc }: HeroSectionProps) {
  const { config, selectedCountry, isLoading } = useMarket();
  const t = useT();

  // Default content for server rendering / loading state
  const headline =
    config?.heroHeadline ||
    "Discover Exquisite Jewellery From Trusted Artisans";
  const subheadline =
    config?.heroSubheadline ||
    "Connect with verified jewellers across Nepal, India, Dubai, USA & UK. Browse ready-made gold, silver & diamond pieces, or get custom jewellery crafted to your specifications.";

  // Market-specific badge text
  const badgeTextMap: Record<MarketRegion, string> = {
    NP: "Nepal's Premier Jewellery Marketplace",
    IN: "India's Trusted Jewellery Marketplace",
    US: "America's Artisan Jewellery Marketplace",
    UK: "Britain's Finest Jewellery Marketplace",
    EU: "Europe's Premium Jewellery Marketplace",
    AE: "UAE's Luxury Jewellery Marketplace",
  };
  const badgeText =
    badgeTextMap[selectedCountry] || "Your Premium Jewellery Marketplace";

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] py-12 lg:py-24 overflow-hidden">
      {/* Geo-based background video or gradient fallback */}
      {videoSrc ? (
        <HeroVideo videoSrc={videoSrc} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gold-50 via-amber-50/50 to-white" />
      )}

      {/* Decorative elements (softer when video is present) */}
      {!videoSrc && (
        <>
          <div className="absolute top-20 left-10 w-32 h-32 bg-gold-200 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-amber-200 rounded-full blur-3xl opacity-30" />
        </>
      )}

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                videoSrc
                  ? "bg-white/20 backdrop-blur-sm text-white border border-white/30"
                  : "bg-gold-100 text-gold-700"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {t(badgeText)}
            </div>
            <h1
              className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight ${
                videoSrc ? "text-white drop-shadow-lg" : "text-gray-900"
              }`}
            >
              {t(headline)}
            </h1>
            <p
              className={`text-base lg:text-lg max-w-lg mx-auto lg:mx-0 ${
                videoSrc ? "text-gray-200" : "text-gray-600"
              }`}
            >
              {t(subheadline)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/shop">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gold-gradient text-white h-12 px-8 rounded-xl text-base"
                >
                  <T>Browse Collection</T>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/rfq/create">
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full sm:w-auto h-12 px-8 rounded-xl text-base ${
                    videoSrc
                      ? "bg-transparent text-white border-white/50 hover:bg-white/10"
                      : ""
                  }`}
                >
                  <T>Custom Order</T>
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="relative mt-8 lg:mt-0">
            <div className="aspect-square bg-gradient-to-br from-gold-200 to-gold-400 rounded-full opacity-20 absolute -top-10 -right-10 w-72 h-72 blur-3xl" />
            <div
              className={`relative rounded-2xl lg:rounded-3xl shadow-2xl p-6 lg:p-8 ${
                videoSrc
                  ? "bg-white/10 backdrop-blur-md border border-white/20 shadow-black/20"
                  : "bg-white shadow-gold-500/10"
              }`}
            >
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div
                  className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                    videoSrc
                      ? "bg-white/10 backdrop-blur-sm"
                      : "bg-gradient-to-br from-gold-50 to-amber-50"
                  }`}
                >
                  <Gem
                    className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600"}`}
                  />
                  <p
                    className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900"}`}
                  >
                    500+
                  </p>
                  <p
                    className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600"}`}
                  >
                    <T>Unique Designs</T>
                  </p>
                </div>
                <div
                  className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                    videoSrc
                      ? "bg-white/10 backdrop-blur-sm"
                      : "bg-gradient-to-br from-gold-50 to-amber-50"
                  }`}
                >
                  <ShieldCheck
                    className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600"}`}
                  />
                  <p
                    className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900"}`}
                  >
                    100%
                  </p>
                  <p
                    className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600"}`}
                  >
                    <T>Certified Pure</T>
                  </p>
                </div>
                <div
                  className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                    videoSrc
                      ? "bg-white/10 backdrop-blur-sm"
                      : "bg-gradient-to-br from-gold-50 to-amber-50"
                  }`}
                >
                  <HeartHandshake
                    className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600"}`}
                  />
                  <p
                    className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900"}`}
                  >
                    50+
                  </p>
                  <p
                    className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600"}`}
                  >
                    <T>Trusted Sellers</T>
                  </p>
                </div>
                <div
                  className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                    videoSrc
                      ? "bg-white/10 backdrop-blur-sm"
                      : "bg-gradient-to-br from-gold-50 to-amber-50"
                  }`}
                >
                  <Star
                    className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600"}`}
                  />
                  <p
                    className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900"}`}
                  >
                    4.9
                  </p>
                  <p
                    className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600"}`}
                  >
                    <T>Avg. Rating</T>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
