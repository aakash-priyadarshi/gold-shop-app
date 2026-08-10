import { HeroSection } from "@/components/home/HeroSection";
import {
    BlogSection,
    BuyerSections,
    MobilePosSpotlight,
    SellerCtaSection,
    SellerFeaturesSection,
  SellerResourceHubSection,
} from "@/components/home/HomeSections";
import { Header } from "@/components/layout/header";
import { AISalesteamPromo } from "@/components/marketing/AISalesteamPromo";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { T } from "@/components/ui/T";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { BRAND } from "@/config/brand";
import { SITE_URL } from "@/config/site";
import { resolveHeroVideo, mapCountryToMarket } from "@/lib/geo";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Lazy-load below-the-fold footer
const DynamicFooter = dynamic(
  () =>
    import("@/components/layout/DynamicFooter").then((m) => ({
      default: m.DynamicFooter,
    })),
  {
    loading: () => (
      <div className="bg-gray-900 border-t border-gray-800 text-gray-500 py-8 text-center text-sm">
        <div className="flex justify-center flex-col md:flex-row gap-6">
          <p>Orivraa is a SaaS platform connecting verified local jewellers with customers for ready-made & custom jewelry orders.</p>
          <div className="flex justify-center gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-gold-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gold-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    ),
  },
);

export default function HomePage() {
  // Server-side country detection via Cloudflare CF-IPCountry header
  const headersList = headers();
  const country = headersList.get("cf-ipcountry");
  const { videoSrc } = resolveHeroVideo(country);
  const serverCountry = mapCountryToMarket(country);

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description:
      "Cloud POS, billing, inventory, and ERP software for jewellery shops — with live gold & silver rate cards, GST/VAT-ready invoices, artisan (karigar) metal tracking, and mobile counter billing.",
    url: SITE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available; paid plans for growing shops.",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      {/* Preconnect to video/image CDN for faster hero load */}
      <link rel="preconnect" href="https://images.orivraa.com" />
      <link rel="dns-prefetch" href="https://images.orivraa.com" />
      {videoSrc && (
        <link rel="preload" href={videoSrc} as="video" type="video/mp4" />
      )}
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1">
          {/* 1 & 2: Dynamic Hero Section with geo-based video & Trust badges row */}
          <HeroSection videoSrc={videoSrc} serverCountry={serverCountry} />

          {/* 3: For Jewellery Shop Owners features section */}
          <SellerFeaturesSection />

          {/* 3b: Mobile POS spotlight - newly launched */}
          <MobilePosSpotlight />

          {/* 4: Resource hub linking demo, tutorial, support, and comparison pages */}
          <SellerResourceHubSection />

          {/* 5: Security and trust block */}
          <section className="py-12 lg:py-16 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
            <div className="container mx-auto px-4">
              <TrustSignals variant="grid" />
              
              {/* Premium World-Class Security Summary Box */}
              <ScrollReveal direction="scale" delay={0.1} spring>
                <div className="mt-12 max-w-3xl mx-auto rounded-3xl border border-gold-400/30 dark:border-gold-500/15 bg-gradient-to-r from-gold-500/[0.04] via-gold-500/[0.01] to-transparent p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center gap-6 text-left hover:shadow-[0_0_24px_rgba(212,175,55,0.15)] transition-all duration-350">
                  <div className="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-500 border border-gold-500/20 flex items-center justify-center shrink-0 shadow-inner animate-pulse">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                      <T>Uncompromising Bank-Grade Security</T>
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      <T>We shield your precious commodities with AES-256 databases, staff PIN clearance gates, Cloudflare WAF Shielding, and daily automated backups. Fully audit-ready.</T>
                    </p>
                  </div>
                  <Link href="/security">
                    <button className="px-5 py-2.5 bg-gray-900 text-white hover:bg-gray-800 dark:bg-gold-500 dark:text-[#0b1420] dark:hover:bg-gold-600 font-bold text-xs md:text-sm rounded-xl shadow-md active:scale-95 transition-all whitespace-nowrap">
                      <T>Know More</T>
                    </button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* 6: Founder-led support block */}
          <AISalesteamPromo />

          {/* 7: Blog articles section (ONE instance only) */}
          <BlogSection />

          {/* 8: Seller CTA section */}
          <SellerCtaSection />

          {/* 9: Buyer sections (Gated by customerFlowEnabled toggle) */}
          <BuyerSections />
        </main>

        <DynamicFooter />
      </div>
    </>
  );
}
