import { HeroSection } from "@/components/home/HeroSection";
import { HomeSections } from "@/components/home/HomeSections";
import { Header } from "@/components/layout/header";
import { resolveHeroVideo } from "@/lib/geo";
import dynamic from "next/dynamic";
import { headers } from "next/headers";

// Lazy-load below-the-fold footer
const DynamicFooter = dynamic(
  () =>
    import("@/components/layout/DynamicFooter").then((m) => ({
      default: m.DynamicFooter,
    })),
  { ssr: false },
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
        </main>

        <DynamicFooter />
      </div>
    </>
  );
}
