import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ABOUT_CONTENT,
    COMING_SOON_PLATFORMS,
    LANG_META,
    LIVE_PLATFORMS,
    SUPPORTED_ABOUT_LANGS,
    TESTIMONIALS,
    type AboutContentLanguage,
} from "@/data/about-i18n";
import {
    ArrowRightIcon,
    BuildingStorefrontIcon,
    ChartBarIcon,
    CheckBadgeIcon,
    GlobeAltIcon,
    HeartIcon,
    ShieldCheckIcon,
    SparklesIcon,
    StarIcon,
    TruckIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return SUPPORTED_ABOUT_LANGS.map((lang) => ({ lang }));
}

const iconMap = {
  trust: ShieldCheckIcon,
  quality: SparklesIcon,
  customer: HeartIcon,
  global: GlobeAltIcon,
};

const featureIconMap = {
  liveGold: ChartBarIcon,
  verified: CheckBadgeIcon,
  custom: SparklesIcon,
  shipping: TruckIcon,
};

export default async function LocalizedAboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  if (!SUPPORTED_ABOUT_LANGS.includes(rawLang as AboutContentLanguage)) {
    notFound();
  }
  const lang = rawLang as AboutContentLanguage;
  const c = ABOUT_CONTENT[lang];
  const meta = LANG_META[lang];
  const isRTL = meta.dir === "rtl";

  const allLangs = Object.entries(LANG_META).filter(([l]) => l !== lang);
  const staticAboutLangs = new Set<string>(["en", ...SUPPORTED_ABOUT_LANGS]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" dir={isRTL ? "rtl" : "ltr"}>
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-600 to-amber-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/gold-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{c.heroTitle}</h1>
            <p className="text-xl md:text-2xl text-amber-100 mb-8">
              {c.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-50" asChild>
                <Link href="/shops">
                  {c.browseSellers}
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white bg-transparent hover:bg-white hover:text-amber-700"
                asChild
              >
                <Link href="/rfq/create">{c.createCustomOrder}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-amber-50 dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: "500+", label: c.verifiedSellers, Icon: BuildingStorefrontIcon },
              { value: "10K+", label: c.happyCustomers, Icon: UserGroupIcon },
              { value: "15+", label: c.countries, Icon: GlobeAltIcon },
              { value: "5K+", label: c.customOrders, Icon: SparklesIcon },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.Icon className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {c.ourStoryTitle}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
          </div>
          <div className="max-w-4xl mx-auto prose prose-lg text-gray-600 dark:text-gray-300">
            <p className="text-lg leading-relaxed mb-6">{c.storyP1}</p>
            <p className="text-lg leading-relaxed mb-6">{c.storyP2}</p>
            <p className="text-lg leading-relaxed">{c.storyP3}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {c.ourValuesTitle}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">{c.valuesSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {(
              [
                { key: "trust", title: c.trustTitle, desc: c.trustDesc },
                { key: "quality", title: c.qualityTitle, desc: c.qualityDesc },
                { key: "customer", title: c.customerFirstTitle, desc: c.customerFirstDesc },
                { key: "global", title: c.globalReachTitle, desc: c.globalReachDesc },
              ] as const
            ).map((v) => {
              const Icon = iconMap[v.key];
              return (
                <Card key={v.key} className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Icon className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {v.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">{v.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {c.whyChooseTitle}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">{c.whyChooseSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {(
              [
                { key: "liveGold", title: c.liveGoldPrices, desc: c.liveGoldPricesDesc },
                { key: "verified", title: c.verifiedSellersFeature, desc: c.verifiedSellersFeatureDesc },
                { key: "custom", title: c.customOrdersFeature, desc: c.customOrdersFeatureDesc },
                { key: "shipping", title: c.secureShipping, desc: c.secureShippingDesc },
              ] as const
            ).map((feature) => {
              const Icon = featureIconMap[feature.key];
              return (
                <div key={feature.key} className="text-center">
                  <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Find Us On Section */}
      <section className="py-16 md:py-24 bg-amber-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {c.findUsTitle}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">{c.findUsSubtitle}</p>
          </div>
          {/* Live profiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto mb-10">
            {LIVE_PLATFORMS.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:shadow-lg hover:border-amber-400 transition-all">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{platform.logo}</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {platform.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{platform.category}</p>
                    <span className="text-xs text-amber-600 group-hover:underline mt-2 inline-block">
                      {c.visitProfile} →
                    </span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
          {/* Coming soon */}
          {COMING_SOON_PLATFORMS.length > 0 && (
            <>
              <div className="text-center mb-4">
                <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
                  {c.comingSoonOn}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
                {COMING_SOON_PLATFORMS.map((platform) => (
                  <div key={platform.name}>
                    <Card className="h-full border-dashed border-gray-300 dark:border-gray-600 opacity-70">
                      <CardContent className="p-3 text-center">
                        <div className="text-xl mb-1">{platform.logo}</div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-400 text-xs mb-1">
                          {platform.name}
                        </h3>
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                          {c.comingSoonBadge}
                        </span>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {c.testimonialsTitle}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">{c.testimonialsSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.name} className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) =>
                      i < testimonial.rating ? (
                        <StarSolid key={i} className="h-4 w-4 text-amber-500" />
                      ) : (
                        <StarIcon key={i} className="h-4 w-4 text-gray-300" />
                      )
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 italic">
                    &quot;{testimonial.text}&quot;
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                    <p className="text-xs text-gray-400">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Seller */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.becomeSeller}</h2>
                <div className="h-1 w-20 bg-amber-500 mb-6" />
                <p className="text-lg text-gray-300 mb-6">{c.becomeSellerDesc}</p>
                <ul className="space-y-3 mb-8">
                  {c.sellerBenefits.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-amber-500" />
                      <span className="text-gray-200">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="gold-gradient text-white" asChild>
                  <Link href="/register?role=seller">
                    {c.registerAsSeller}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-3xl" />
                  <Card className="relative bg-gray-800/50 border-gray-700">
                    <CardContent className="p-8 text-center">
                      <BuildingStorefrontIcon className="h-16 w-16 mx-auto text-amber-500 mb-4" />
                      <h3 className="text-2xl font-bold text-white mb-2">500+ Sellers</h3>
                      <p className="text-gray-400">{c.becomeSellerDesc.split(".")[0]}.</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Language Guide + Cross-links */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <GlobeAltIcon className="h-10 w-10 mx-auto text-amber-600 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {c.languageGuideTitle}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-gray-600 dark:text-gray-300">{c.languageGuideDesc}</p>
          </div>

          <div className="max-w-xl mx-auto mb-12 space-y-3">
            {c.languageGuideSteps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start text-sm text-gray-600 dark:text-gray-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-semibold text-xs flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              {c.availableIn}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {allLangs.map(([code, lm]) => (
                <Link
                  key={code}
                  href={
                    code === "en"
                      ? "/about"
                      : staticAboutLangs.has(code)
                        ? `/about/${code}`
                        : "/about"
                  }
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:shadow transition-all"
                >
                  {lm.flag} {lm.nativeName}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {c.getInTouch}
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">{c.getInTouchDesc}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Card className="flex-1">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{c.emailUs}</h3>
                  <a href="mailto:support@orivraa.com" className="text-amber-600 hover:underline">
                    support@orivraa.com
                  </a>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{c.forSellers}</h3>
                  <a href="mailto:sellers@orivraa.com" className="text-amber-600 hover:underline">
                    sellers@orivraa.com
                  </a>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Orivraa. {c.allRightsReserved}
            </p>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
