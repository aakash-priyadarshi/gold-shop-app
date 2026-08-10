"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import {
    COMING_SOON_PLATFORMS,
    LIVE_PLATFORMS,
    TESTIMONIALS,
} from "@/data/about-i18n";
import { LANGUAGES } from "@/store/preferences";
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
    UserGroupIcon,
    DevicePhoneMobileIcon,
    ReceiptPercentIcon,
    ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const stats = [
  { label: "Jewellery shops on Orivraa", value: "Growing", icon: BuildingStorefrontIcon },
  { label: "Markets supported", value: "15+", icon: GlobeAltIcon },
  { label: "Languages & tutorials", value: "12+", icon: UserGroupIcon },
  { label: "POS & billing workflows", value: "Unified", icon: SparklesIcon },
];

const values = [
  {
    icon: ShieldCheckIcon,
    title: "Trust & Transparency",
    description:
      "Every seller experience is built around verification, clear pricing, audit trails, and local tax-ready workflows.",
  },
  {
    icon: SparklesIcon,
    title: "Craft Meets Software",
    description:
      "We respect traditional jewellery craft while giving shops modern tools for POS, inventory, catalogues, and AI-assisted selling.",
  },
  {
    icon: HeartIcon,
    title: "Human First",
    description:
      "Customers need confidence and jewellers need control. Orivraa is designed to make both sides feel informed, supported, and safe.",
  },
  {
    icon: GlobeAltIcon,
    title: "Local Shops, Global Reach",
    description:
      "We help local jewellery shops serve walk-in buyers, online shoppers, and diaspora customers across markets from one platform.",
  },
];

const features = [
  {
    icon: ChartBarIcon,
    title: "Live Gold Rate Trends",
    description:
      "Live market rates and 7-day trend context help jewellers quote with confidence before billing or updating catalogues.",
  },
  {
    icon: DevicePhoneMobileIcon,
    title: "Mobile POS",
    description:
      "Counter billing, GST/VAT receipts, barcode scanning, and inventory sync can run from any smartphone.",
  },
  {
    icon: CheckBadgeIcon,
    title: "Verified Shop Profiles",
    description:
      "Seller verification, digital profiles, customer chat, and RFQs make online jewellery buying more accountable.",
  },
  {
    icon: ReceiptPercentIcon,
    title: "Tax-Ready Operations",
    description:
      "Billing workflows support GST, VAT, invoices, old gold exchange, making charges, and reporting across supported markets.",
  },
];

const operatingPrinciples = [
  "Built for jewellers, not generic retail",
  "Transparent metal-rate context before every quote",
  "Free to start, useful before a shop upgrades",
  "Local currency and tax workflows by country",
];

const sellerTools = [
  "Mobile POS",
  "Inventory by weight and purity",
  "Digital catalogues",
  "RFQ and customer chat",
  "Live gold rate trends",
  "AI sales assistance",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <div className="absolute inset-0 bg-[url('/patterns/gold-pattern.svg')] opacity-[0.035] dark:opacity-[0.05]" />
        <div className="container mx-auto px-4 py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <SparklesIcon className="h-4 w-4" />
                <T>Jewellery software, marketplace, and AI sales platform</T>
              </div>
              <h1 className="mt-7 text-4xl md:text-6xl font-extrabold tracking-tight text-gray-950 dark:text-white leading-tight">
                <T>Building the operating system for modern jewellery businesses</T>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-gray-600 dark:text-gray-300">
                <T>
                  Orivraa helps jewellers move from scattered spreadsheets,
                  manual rate checks, and disconnected customer chats to one
                  trusted platform for Mobile POS, live gold trends, inventory,
                  AI sales support, and verified marketplace discovery.
                </T>
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="gold-gradient text-white h-12 px-7 rounded-xl" asChild>
                  <Link href="/auth/register">
                    <T>Start free as a seller</T>
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 rounded-xl border-gray-300 dark:border-gray-700"
                  asChild
                >
                  <Link href="/jewellery-shop-software">
                    <T>Explore the software</T>
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {operatingPrinciples.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <T>{item}</T>
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative"
            >
              <div className="rounded-[2rem] border border-gray-200 bg-gray-950 p-5 shadow-2xl shadow-amber-900/10 dark:border-gray-800">
                <div className="rounded-[1.5rem] bg-white p-5 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                        <Image
                          src="/brand/orivraa-icon.svg"
                          alt="Orivraa"
                          width={30}
                          height={30}
                          priority
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-950 dark:text-white">Orivraa</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400"><T>Shop command center</T></p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <T>Live</T>
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 py-5">
                    {sellerTools.map((tool) => (
                      <div key={tool} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                        <CheckBadgeIcon className="h-5 w-5 text-amber-500" />
                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white"><T>{tool}</T></p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/catalog/necklace.svg"
                        alt="Jewellery catalogue preview"
                        width={48}
                        height={48}
                        className="rounded-xl bg-white p-2"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-950 dark:text-white"><T>From counter sale to online discovery</T></p>
                        <p className="text-xs text-gray-600 dark:text-gray-400"><T>One platform for jewellers, buyers, and teams.</T></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="bg-gray-950 px-5 py-6 text-center"
              >
                <stat.icon className="h-7 w-7 mx-auto text-amber-400 mb-3" />
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs sm:text-sm text-gray-400">
                  <T>{stat.label}</T>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 max-w-6xl mx-auto items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                <T>Our story</T>
              </p>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white">
                <T>Jewellery commerce should feel trustworthy on both sides of the counter.</T>
              </h2>
            </div>

            <div className="space-y-6 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
              <p>
                <T>
                  Orivraa started with a practical observation: jewellery shops
                  were already serving serious buyers, but the tools around the
                  business were fragmented. Gold rates lived in one place,
                  inventory in another, customer conversations in WhatsApp, and
                  billing in yet another system.
                </T>
              </p>
              <p>
                <T>
                  We are building one connected platform where verified sellers
                  can run day-to-day operations and buyers can discover trusted
                  jewellers with more confidence. That means marketplace
                  discovery, custom orders, Mobile POS, live market trends,
                  tax-ready invoices, digital catalogues, and AI-assisted sales
                  support working together.
                </T>
              </p>
              <p>
                <T>
                  The mission is simple: help local jewellery businesses look
                  as professional online as they are in person, while giving
                  customers clearer pricing, better communication, and safer
                  buying journeys.
                </T>
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-3">
                {[
                  "Founded in Patna, Bihar, India (Problem discovered in Butwal, Nepal)",
                  "Serving jewellery teams across key global markets",
                  "Built around verified sellers and transparent pricing",
                  "Designed for both walk-in and online jewellery sales",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    <CheckBadgeIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <T>{item}</T>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
              <T>How we build</T>
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              <T>Principles that make Orivraa dependable</T>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              <T>World-class software matters only when it respects how jewellers actually work.</T>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-amber-200 transition-all dark:border-gray-800 dark:bg-gray-950 dark:hover:border-amber-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                        <value.icon className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          <T>{value.title}</T>
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          <T>{value.description}</T>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
              <T>What Orivraa combines</T>
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              <T>Marketplace trust with serious jewellery shop software</T>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              <T>One connected system for discovery, counter sales, pricing, inventory, and follow-up.</T>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/70"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm dark:bg-gray-950 dark:text-amber-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <T>{feature.title}</T>
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  <T>{feature.description}</T>
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Find Us On Section */}
      <section className="py-16 md:py-24 bg-gray-950 text-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-14 max-w-6xl mx-auto items-start">
            <div>
              <motion.p
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                viewport={{ once: true }}
                className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300"
              >
                <T>Proof and presence</T>
              </motion.p>
              <motion.h2
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                className="mt-3 text-3xl md:text-5xl font-bold tracking-tight"
              >
                <T>Featured & Listed On</T>
              </motion.h2>
              <p className="mt-5 text-lg leading-relaxed text-gray-300">
                <T>
                  Orivraa is building public trust across software directories,
                  startup platforms, professional networks, and review sites.
                  The live profiles below help buyers, sellers, and partners
                  verify our presence beyond our own website.
                </T>
              </p>
              <div className="mt-7 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-amber-300">{LIVE_PLATFORMS.length}</p>
                  <p className="mt-1 text-gray-400"><T>Live public profiles</T></p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-amber-300">{COMING_SOON_PLATFORMS.length}</p>
                  <p className="mt-1 text-gray-400"><T>Launch listings in progress</T></p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {LIVE_PLATFORMS.map((platform, index) => {
                  const isPriority = index < 2;
                  return (
                    <motion.a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={false}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      viewport={{ once: true }}
                      className={`group rounded-3xl border border-white/10 bg-white/[0.06] p-5 transition-all hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-white/[0.09] ${isPriority ? "sm:col-span-1" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                            {platform.logo}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {platform.name}
                            </h3>
                            <p className="mt-1 text-xs text-gray-400">
                              <T>{platform.category}</T>
                            </p>
                          </div>
                        </div>
                        <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-500 transition-colors group-hover:text-amber-300" />
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-300/20">
                          <T>Live profile</T>
                        </span>
                        <span className="text-xs font-semibold text-amber-300 group-hover:underline">
                          <T>Open listing</T>
                        </span>
                      </div>
                    </motion.a>
                  );
                })}
              </div>

              {COMING_SOON_PLATFORMS.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-white"><T>Next directories</T></p>
                      <p className="text-xs text-gray-400"><T>Profiles being prepared for launch and review collection.</T></p>
                    </div>
                    <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-300/20">
                      <T>In preparation</T>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COMING_SOON_PLATFORMS.map((platform, index) => (
                      <motion.div
                        key={platform.name}
                        initial={false}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                        viewport={{ once: true }}
                        className="rounded-2xl border border-white/10 bg-gray-950/70 p-4 text-center"
                      >
                        <div className="text-2xl">{platform.logo}</div>
                        <h3 className="mt-2 text-sm font-semibold text-gray-100">
                          {platform.name}
                        </h3>
                        <p className="mt-1 text-[11px] leading-snug text-gray-500">
                          <T>{platform.category}</T>
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <motion.h2
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              <T>What Our Users Say</T>
            </motion.h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">
              <T>Real stories from jewellers and customers who use Orivraa</T>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < testimonial.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 italic">
                      &quot;<T>{testimonial.text}</T>&quot;
                    </p>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        <T>{testimonial.role}</T>
                      </p>
                      <p className="text-xs text-gray-400">
                        <T>{testimonial.location}</T>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Language Cross-links */}
      <section className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <T>Available in Multiple Languages</T>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <T>Orivraa currently supports these app languages:</T>
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(LANGUAGES).map(([code, language]) => {
                return (
                  <span
                    key={code}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:shadow transition-all"
                  >
                    {language.nativeName} <span className="text-gray-400">({language.name})</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* For Sellers Section */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto rounded-[2rem] border border-gray-200 bg-gray-950 p-6 md:p-10 text-white dark:border-gray-800">
            <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
                  <T>For jewellery businesses</T>
                </p>
                <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
                  <T>Bring your shop online without losing the shop-floor workflow.</T>
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-gray-300">
                  <T>
                    Join Orivraa to get a free digital profile, Mobile POS,
                    inventory tools, live rate context, catalogues, customer
                    chat, and AI sales support. The platform handles the
                    software layer so your team can focus on customers and
                    craftsmanship.
                  </T>
                </p>
                <ul className="mt-7 grid sm:grid-cols-2 gap-3 mb-8">
                  {[
                    "Free shop profile and QR link",
                    "Mobile POS and GST/VAT receipts",
                    "Inventory by weight and purity",
                    "Live gold rate trends",
                    "RFQ leads and customer chat",
                    "AI sales assistant knowledge",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                      <CheckBadgeIcon className="h-5 w-5 text-amber-500" />
                      <span className="text-gray-200"><T>{item}</T></span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="gold-gradient text-white" asChild>
                  <Link href="/auth/register">
                    <T>Start free as a seller</T>
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                    <BuildingStorefrontIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold"><T>Seller workspace</T></p>
                    <p className="text-sm text-gray-400"><T>Everything a jewellery team needs to start.</T></p>
                  </div>
                </div>
                <div className="space-y-3 pt-4">
                  {[
                    { label: "Mobile checkout", value: "Any phone" },
                    { label: "Live rate context", value: "7-day trend" },
                    { label: "Customer follow-up", value: "AI + CRM" },
                    { label: "Marketplace profile", value: "Included" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl bg-gray-950/80 px-4 py-3">
                      <span className="text-sm text-gray-400"><T>{item.label}</T></span>
                      <span className="text-sm font-semibold text-white"><T>{item.value}</T></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <T>Get in Touch</T>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              <T>
                Have questions about buying, selling, partnership, or the
                software? Reach the team and we will point you to the right path.
              </T>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Card className="flex-1">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    <T>Email Us</T>
                  </h3>
                  <a
                    href={`mailto:${BRAND.supportEmail}`}
                    className="text-amber-600 hover:underline"
                  >
                    {BRAND.supportEmail}
                  </a>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    <T>For Sellers</T>
                  </h3>
                  <a
                    href={`mailto:${BRAND.supportEmail}`}
                    className="text-amber-600 hover:underline"
                  >
                    {BRAND.supportEmail}
                  </a>
                </CardContent>
              </Card>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Orivraa. <T>All rights reserved.</T>
            </p>
          </div>
        </div>
      </section>
      <DynamicFooter />
    </div>
  );
}
