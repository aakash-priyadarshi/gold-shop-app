import { HeroSection } from "@/components/home/HeroSection";
import { HomeSections } from "@/components/home/HomeSections";
import { Header } from "@/components/layout/header";
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
          {/* Dynamic Hero Section with geo-based video */}
          <HeroSection videoSrc={videoSrc} />

          <HomeSections />

          {/* Server-rendered section for SEO & OAuth verification crawlers */}
          <section className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 py-10">
            <div className="container mx-auto px-4 max-w-3xl text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                About Orivraa
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                Orivraa is a SaaS marketplace platform that connects customers with verified local
                jewellers across Nepal, India, Dubai, USA &amp; UK. Browse ready-made gold, silver
                &amp; diamond pieces, request custom jewellery designs, receive competitive quotes,
                and track your orders — all in one secure platform.
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <Link href="/privacy" className="text-gold-600 hover:text-gold-700 underline">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gold-600 hover:text-gold-700 underline">
                  Terms of Service
                </Link>
              </div>
            </div>
          </section>
        </main>

        <DynamicFooter />
      </div>
    </>
  );
}
