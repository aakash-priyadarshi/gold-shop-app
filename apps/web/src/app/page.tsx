import { HeroSection } from "@/components/home/HeroSection";
import {
  BuyerSections,
  SellerFeaturesSection,
  BlogSection,
  SellerCtaSection,
} from "@/components/home/HomeSections";
import { Header } from "@/components/layout/header";
import { AISalesteamPromo } from "@/components/marketing/AISalesteamPromo";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { T } from "@/components/ui/T";
import { resolveHeroVideo } from "@/lib/geo";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import Link from "next/link";

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

  return (
    <>
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
          <HeroSection videoSrc={videoSrc} />

          {/* 3: For Jewellery Shop Owners features section */}
          <SellerFeaturesSection />

          {/* 4: Demo video section */}
          <section className="py-12 lg:py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl lg:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                <T>See Orivraa in 90 seconds</T>
              </h2>
              <div className="max-w-4xl mx-auto aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  <T>Demo video coming soon</T>
                </p>
              </div>
            </div>
          </section>

          {/* 5: Security and trust block */}
          <section className="py-10 lg:py-14 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
            <div className="container mx-auto px-4">
              <TrustSignals variant="grid" />
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
