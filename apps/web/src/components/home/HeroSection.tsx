"use client";

import { HeroVideo } from "@/components/HeroVideo";
import { DemoModal } from "@/components/home/DemoModal";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { MarketRegion, useMarket } from "@/hooks/useMarket";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { useT } from "@/providers/translation-provider";
import {
    ArrowRight,
    BarChart3,
    Gem,
    HeartHandshake,
    Package,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Star,
    Store,
    Zap
} from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface HeroSectionProps {
  /** CDN URL to the geo-resolved hero video (passed from server component). */
  videoSrc?: string;
}

export function HeroSection({ videoSrc }: HeroSectionProps) {
  const { config, selectedCountry, isLoading } = useMarket();
  const { features: platformFeatures } = usePlatformFeatures();
  const t = useT();
  const customerFlowEnabled = platformFeatures.customerFlowEnabled;

  // Seller-first hero (default — buyer marketplace is hidden by default)
  if (!customerFlowEnabled) {
    return <SellerHero videoSrc={videoSrc} />;
  }

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
        <div className="absolute inset-0 bg-gradient-to-b from-gold-50 via-gold-100/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
      )}

      {/* Decorative elements (softer when video is present) */}
      {!videoSrc && (
        <>
          <div className="absolute top-20 left-10 w-32 h-32 bg-gold-200 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-gold-300 rounded-full blur-3xl opacity-20 animate-pulse" />
        </>
      )}

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            <ScrollReveal direction="assemble" delay={0.05} spring>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  videoSrc
                    ? "bg-white/20 backdrop-blur-sm text-white border border-white/30"
                    : "bg-gold-50/80 text-gold-800 border border-gold-200/50 dark:bg-gold-950/40 dark:text-gold-300 dark:border-gold-800/40"
                }`}
              >
                <Sparkles className="h-4 w-4 text-gold-500 animate-spin" />
                {t(badgeText)}
              </div>
            </ScrollReveal>

            <ScrollReveal direction="assemble" delay={0.12} spring>
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight ${
                  videoSrc ? "text-white drop-shadow-lg" : "text-gray-900 dark:text-white"
                }`}
              >
                {t(headline)}
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2} spring>
              <p
                className={`text-base lg:text-lg max-w-lg mx-auto lg:mx-0 ${
                  videoSrc ? "text-gray-200" : "text-gray-650 dark:text-gray-300"
                }`}
              >
                {t(subheadline)}
                <span className="block mt-2 font-medium text-gold-700 dark:text-gold-400">
                  <T>Connect securely, request custom designs, and track your orders seamlessly.</T>
                </span>
              </p>
            </ScrollReveal>

            <ScrollReveal direction="assemble" delay={0.28} spring>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/shop">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gold-gradient text-white h-12 px-8 rounded-xl text-base font-bold shadow-md hover:shadow-gold-500/20 active:scale-95 transition-all"
                  >
                    <T>Browse Collection</T>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/rfq/create">
                  <Button
                    size="lg"
                    variant="outline"
                    className={`w-full sm:w-auto h-12 px-8 rounded-xl text-base font-semibold ${
                      videoSrc
                        ? "bg-transparent text-white border-white/50 hover:bg-white/10"
                        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm rounded-xl"
                    }`}
                  >
                    <T>Custom Order</T>
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Seller nudge */}
            <ScrollReveal direction="up" delay={0.38}>
              <p className={`text-sm mt-4 ${videoSrc ? "text-gray-300" : "text-gray-500"}`}>
                <T>Are you a jeweller?</T>{" "}
                <Link
                  href="/for-sellers"
                  className={`font-semibold underline underline-offset-2 hover:no-underline ${
                    videoSrc
                      ? "text-gold-300 hover:text-gold-250"
                      : "text-gold-650 hover:text-gold-750 dark:text-gold-400 dark:hover:text-gold-300"
                  }`}
                >
                  <T>Get your free shop profile →</T>
                </Link>
              </p>
            </ScrollReveal>
          </div>

          {/* Stats Card */}
          <div className="relative mt-8 lg:mt-0">
            <div className="aspect-square bg-gradient-to-br from-gold-200 to-gold-400 rounded-full opacity-20 absolute -top-10 -right-10 w-72 h-72 blur-3xl" />
            <ScrollReveal direction="scale" delay={0.15} spring>
              <div
                className={`relative rounded-2xl lg:rounded-3xl shadow-2xl p-6 lg:p-8 ${
                  videoSrc
                    ? "bg-white/10 backdrop-blur-md border border-white/20 shadow-black/20"
                    : "bg-white dark:bg-navy-900/60 border border-gray-150 dark:border-navy-850 shadow-gold-500/10"
                }`}
              >
                <ScrollReveal direction="up" staggerChildren={0.08} className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div
                    className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                      videoSrc
                        ? "bg-white/10 backdrop-blur-sm"
                        : "bg-gradient-to-br from-white/70 to-gold-50/50 dark:from-gray-900/80 dark:to-gold-950/30 border border-gray-100/50 dark:border-gray-850/50 backdrop-blur-sm shadow-sm gold-glow-hover"
                    }`}
                  >
                    <Gem
                      className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600 dark:text-gold-400"}`}
                    />
                    <p
                      className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900 dark:text-white"}`}
                    >
                      500+
                    </p>
                    <p
                      className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      <T>Unique Designs</T>
                    </p>
                  </div>
                  <div
                    className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                      videoSrc
                        ? "bg-white/10 backdrop-blur-sm"
                        : "bg-gradient-to-br from-white/70 to-gold-50/50 dark:from-gray-900/80 dark:to-gold-950/30 border border-gray-100/50 dark:border-gray-850/50 backdrop-blur-sm shadow-sm gold-glow-hover"
                    }`}
                  >
                    <ShieldCheck
                      className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600 dark:text-gold-400"}`}
                    />
                    <p
                      className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900 dark:text-white"}`}
                    >
                      100%
                    </p>
                    <p
                      className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      <T>Certified Pure</T>
                    </p>
                  </div>
                  <div
                    className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                      videoSrc
                        ? "bg-white/10 backdrop-blur-sm"
                        : "bg-gradient-to-br from-white/70 to-gold-50/50 dark:from-gray-900/80 dark:to-gold-950/30 border border-gray-100/50 dark:border-gray-850/50 backdrop-blur-sm shadow-sm gold-glow-hover"
                    }`}
                  >
                    <HeartHandshake
                      className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600 dark:text-gold-400"}`}
                    />
                    <p
                      className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900 dark:text-white"}`}
                    >
                      50+
                    </p>
                    <p
                      className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      <T>Trusted Sellers</T>
                    </p>
                  </div>
                  <div
                    className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                      videoSrc
                        ? "bg-white/10 backdrop-blur-sm"
                        : "bg-gradient-to-br from-white/70 to-gold-50/50 dark:from-gray-900/80 dark:to-gold-950/30 border border-gray-100/50 dark:border-gray-850/50 backdrop-blur-sm shadow-sm gold-glow-hover"
                    }`}
                  >
                    <Star
                      className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-600 dark:text-gold-400"}`}
                    />
                    <p
                      className={`text-xl lg:text-2xl font-bold ${videoSrc ? "text-white" : "text-gray-900 dark:text-white"}`}
                    >
                      4.9
                    </p>
                    <p
                      className={`text-xs lg:text-sm ${videoSrc ? "text-gray-300" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      <T>Avg. Rating</T>
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*  SellerHero — shown by default (customer flow disabled).      */
/*  Repositions homepage as a CRM/POS SaaS for jewellery shops.  */
/* ───────────────────────────────────────────────────────────── */

function SellerHero({ videoSrc }: { videoSrc?: string }) {
  const { selectedCountry } = useMarket();
  const t = useT();

  // Dynamic country-specific copywriting optimized for local jewellers
  const regionalConfig: Record<MarketRegion, { badge: string; headline: string; subheadline: string; trustFooter: string }> = {
    NP: {
      badge: "🇳🇵 Nepal's Premier IRD-Approved Jewellery ERP & Billing System",
      headline: "The premium IRD-approved ERP & POS software for Nepalese gold shops",
      subheadline: "Tola & Laal weight conversions, live gold rates, VAT-compliant invoicing, Karigar raw-metal ledgers, and offline billing synced instantly to the cloud.",
      trustFooter: "Trusted by gold & silver merchants across Kathmandu, Pokhara, Lalitpur & Biratnagar"
    },
    IN: {
      badge: "🇮🇳 India's #1 GST-Ready Jewellery ERP & Mobile POS",
      headline: "The premium GST/VAT-ready ERP & billing software for Indian jewellers",
      subheadline: "Automated live rate cards, GSTR-1 ready reports, BIS Hallmarking & HUID tracker, Karigar metal ledgers, and fast counter billing on any mobile or desktop.",
      trustFooter: "Trusted by retail jewellers across Mumbai, Delhi, Jaipur, Chennai & Kolkata"
    },
    AE: {
      badge: "🇦🇪 UAE's Luxury Gold Bullion & Retail Jewellery POS System",
      headline: "The premium cloud ERP & multi-currency billing software for UAE jewellers",
      subheadline: "Dubai FTA VAT compliance, live Kilo/Tola gold rate feeds, multi-currency invoicing, RFID stock count, and elite Karigar wastage ledgers.",
      trustFooter: "Trusted by major gold souk merchants in Dubai, Abu Dhabi & Sharjah"
    },
    UK: {
      badge: "🇬🇧 UK's Premier MTD-Compliant Jewellery ERP & Counter Billing",
      headline: "The premium cloud ERP & billing software for British jewellers",
      subheadline: "Making Tax Digital (MTD) VAT reporting, UK Assay Office hallmarking integrations, carat tracking, RFID stock audit, and tablet POS billing.",
      trustFooter: "Trusted by high-street brands and independent boutiques in London, Birmingham & Edinburgh"
    },
    US: {
      badge: "🇺🇸 America's Leading Cloud POS & Jewelry Store ERP Platform",
      headline: "The premium cloud POS & inventory software for US jewelry stores",
      subheadline: "Sales tax auto-computation, pennyweight (dwt) & troy ounce conversions, staff biometric fingerprint safety, integrated RFID stock count, and mobile billing.",
      trustFooter: "Trusted by retail jewelers and design studios across New York, California & Texas"
    },
    EU: {
      badge: "🇪🇺 Europe's Premium OSS-Compliant Jewellery Shop Software",
      headline: "The premium cloud ERP & POS software for European jewellers",
      subheadline: "EU One Stop Shop (OSS) VAT compliance, multi-lingual client invoicing, carat weight management, RFID counter scanning, and daily cloud backup.",
      trustFooter: "Trusted by fine jewellery manufacturers and boutiques across France, Italy & Germany"
    }
  };

  const defaultRegion = {
    badge: "Jewellery ERP · Mobile POS · Bullion & Karigar Wastage Tracker",
    headline: "The premium cloud ERP & POS software for jewellery shops",
    subheadline: "Live rate card feeds, Karigar metal ledgers, bullion inventory tracking, mobile counter POS billing, and GST/VAT-ready invoices — all on one modern dashboard.",
    trustFooter: "Trusted by professional jewellers across Nepal, India & global markets"
  };

  const currentCopy = regionalConfig[selectedCountry as MarketRegion] || defaultRegion;

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] py-12 lg:py-24 overflow-hidden border-b border-gray-150 dark:border-gray-900/60">
      {videoSrc ? (
        <HeroVideo videoSrc={videoSrc} />
      ) : (
        <div className="absolute inset-0 gold-river-light dark:gold-river-dark opacity-80" />
      )}
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            <ScrollReveal direction="assemble" delay={0.05} spring>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  videoSrc
                    ? "bg-white/20 backdrop-blur-sm text-white border border-white/30"
                    : "bg-gold-50/80 text-gold-800 border border-gold-200/50 dark:bg-gold-950/40 dark:text-gold-300 dark:border-gold-800/40"
                }`}
              >
                <Sparkles className="h-4 w-4 text-gold-500 animate-spin" />
                <span>{t(currentCopy.badge)}</span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="assemble" delay={0.12} spring>
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight ${
                  videoSrc ? "text-white drop-shadow-lg" : "text-gray-955 dark:text-white"
                }`}
              >
                <span>{t(currentCopy.headline)}</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.22} spring>
              <p
                className={`text-base lg:text-lg max-w-xl mx-auto lg:mx-0 ${
                  videoSrc ? "text-gray-200" : "text-gray-650 dark:text-gray-300"
                }`}
              >
                <span>{t(currentCopy.subheadline)}</span>
                <span className="block mt-2 font-semibold text-gold-500 dark:text-gold-400">
                  <T>Free 30-day trial. No credit card required. Setup in under 10 minutes.</T>
                </span>
              </p>
            </ScrollReveal>

            <ScrollReveal direction="assemble" delay={0.32} spring>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gold-gradient text-white h-12 px-8 rounded-xl text-base font-bold shadow-md hover:shadow-gold-500/20 active:scale-95 transition-all"
                  >
                    <T>Start free trial</T>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <DemoModal
                  label="Watch Demo"
                  buttonClassName={
                    videoSrc
                      ? "bg-transparent text-white border-white/50 hover:bg-white/10"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm rounded-xl"
                  }
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.45}>
              <TrustSignals
                variant="compact"
                className={`pt-2 ${videoSrc ? "text-white" : ""}`}
              />
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.48}>
              <p
                className={`text-sm mt-2 ${videoSrc ? "text-gray-300" : "text-gray-500"}`}
              >
                <T>Already have an account?</T>{" "}
                <Link
                  href="/auth/login"
                  className={`font-semibold underline underline-offset-2 hover:no-underline text-gold-500 dark:text-gold-400`}
                >
                  <T>Sign in to your shop</T>
                </Link>
              </p>
            </ScrollReveal>
          </div>

          {/* Stats / feature grid for sellers */}
          <div className="relative mt-8 lg:mt-0">
            <div className="aspect-square bg-gradient-to-br from-gold-400 to-gold-500/40 rounded-full opacity-20 absolute -top-10 -right-10 w-72 h-72 blur-3xl animate-pulse" />
            <ScrollReveal direction="left" delay={0.25} spring>
              <div
                className={`relative rounded-2xl lg:rounded-3xl shadow-2xl p-6 lg:p-8 overflow-hidden ${
                  videoSrc
                    ? "bg-white/10 backdrop-blur-md border border-white/20 shadow-black/20"
                    : "bg-white dark:bg-navy-900/60 border border-gray-150 dark:border-navy-850 shadow-gold-500/5 dark:shadow-gold-950/20"
                }`}
              >
                {/* Goldsmith Workshop Image Background Watermark */}
                {!videoSrc && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.06] dark:opacity-[0.08] -z-10 mix-blend-luminosity scale-105"
                    style={{ backgroundImage: `url('https://images.orivraa.com/images/public/hasan-mrad-9Foi-h8zmIU-unsplash.jpg')` }}
                  />
                )}
                <ScrollReveal direction="up" staggerChildren={0.08} className="grid grid-cols-2 gap-3 lg:gap-4 relative z-10">
                  {[
                    { icon: Store, label: "Live gold & silver rates", value: "Auto Rate Cards" },
                    { icon: Package, label: "Karigar & Bullion ledgers", value: "Unified ERP" },
                    { icon: Smartphone, label: "Mobile Counter POS", value: "Any Smartphone" },
                    { icon: Zap, label: "Fast setup time", value: "< 10 Minutes" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center ${
                          videoSrc
                            ? "bg-white/10 backdrop-blur-sm"
                            : "bg-gradient-to-br from-white/70 to-gold-50/20 dark:from-[#0b1420]/90 dark:to-navy-950/40 border border-gray-150/40 dark:border-navy-850/50 backdrop-blur-sm shadow-sm gold-glow-hover"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${videoSrc ? "text-gold-300" : "text-gold-500 dark:text-gold-400"}`}
                        />
                        <p
                          className={`text-sm lg:text-base font-extrabold ${videoSrc ? "text-white" : "text-gray-955 dark:text-white"}`}
                        >
                          <T>{item.value}</T>
                        </p>
                        <p
                          className={`text-[10px] lg:text-xs font-medium mt-0.5 ${videoSrc ? "text-gray-300" : "text-gray-500 dark:text-gray-400"}`}
                        >
                          <T>{item.label}</T>
                        </p>
                      </div>
                    );
                  })}
                </ScrollReveal>
                <ScrollReveal direction="up" delay={0.5}>
                  <p
                    className={`text-xs mt-4 text-center font-medium relative z-10 ${videoSrc ? "text-gray-300" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    <span>{t(currentCopy.trustFooter)}</span>
                  </p>
                </ScrollReveal>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
