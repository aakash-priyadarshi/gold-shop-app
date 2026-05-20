"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/T";
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
    TruckIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";

const stats = [
  { label: "Verified Sellers", value: "500+", icon: BuildingStorefrontIcon },
  { label: "Happy Customers", value: "10K+", icon: UserGroupIcon },
  { label: "Countries", value: "15+", icon: GlobeAltIcon },
  { label: "Custom Orders", value: "5K+", icon: SparklesIcon },
];

const values = [
  {
    icon: ShieldCheckIcon,
    title: "Trust & Transparency",
    description:
      "Every seller on our platform is verified. We ensure transparent pricing with real-time gold rates and no hidden fees.",
  },
  {
    icon: SparklesIcon,
    title: "Quality Craftsmanship",
    description:
      "Our sellers are skilled artisans who create beautiful, high-quality jewelry using traditional and modern techniques.",
  },
  {
    icon: HeartIcon,
    title: "Customer First",
    description:
      "Your satisfaction is our priority. From custom designs to secure delivery, we ensure a seamless experience.",
  },
  {
    icon: GlobeAltIcon,
    title: "Global Reach",
    description:
      "Connect with trusted jewelers from Nepal, India, UAE, and beyond. Find the perfect piece from anywhere in the world.",
  },
];

const features = [
  {
    icon: ChartBarIcon,
    title: "Live Gold Prices",
    description:
      "Real-time gold and silver rates from international markets, converted to local currencies.",
  },
  {
    icon: CheckBadgeIcon,
    title: "Verified Sellers",
    description:
      "All sellers undergo strict verification. Look for the blue badge for verified shops.",
  },
  {
    icon: SparklesIcon,
    title: "Custom Orders",
    description:
      "Request custom jewelry designs and get quotes from multiple sellers.",
  },
  {
    icon: TruckIcon,
    title: "Secure Shipping",
    description:
      "Insured shipping with tracking for all orders, whether local or international.",
  },
];

const team = [
  {
    name: "Orivraa Team",
    role: "Founders & Developers",
    description:
      "A passionate team dedicated to connecting jewelry lovers with trusted artisans worldwide.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-600 to-amber-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/gold-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <T>About Orivraa</T>
            </h1>
            <p className="text-xl md:text-2xl text-amber-100 mb-8">
              <T>
                Your trusted marketplace for authentic gold and silver jewelry.
                Connecting skilled artisans with jewelry lovers worldwide.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-amber-700 hover:bg-amber-50"
                asChild
              >
                <Link href="/shops">
                  <T>Browse Sellers</T>
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white bg-transparent hover:bg-white hover:text-amber-700"
                asChild
              >
                <Link href="/rfq/create">
                  <T>Create Custom Order</T>
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-amber-50 dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center"
              >
                <stat.icon className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <T>{stat.label}</T>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <T>Our Story</T>
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg mx-auto text-gray-600 dark:text-gray-300">
              <p className="text-lg leading-relaxed mb-6">
                <T>
                  Orivraa was born from a simple idea: make it easy for people
                  to find and purchase authentic, high-quality gold and silver
                  jewelry from trusted artisans around the world.
                </T>
              </p>
              <p className="text-lg leading-relaxed mb-6">
                <T>
                  In many countries, buying gold jewelry involves visiting
                  multiple shops, comparing prices manually, and often dealing
                  with unclear pricing. We wanted to change that by creating a
                  transparent marketplace where buyers can see real-time gold
                  prices, compare sellers, and order custom jewelry with
                  confidence.
                </T>
              </p>
              <p className="text-lg leading-relaxed">
                <T>
                  Today, Orivraa connects thousands of customers with verified
                  jewelers across Nepal, India, UAE, and beyond. Whether you're
                  looking for a traditional wedding set or a modern custom
                  design, we help you find the perfect piece at a fair price.
                </T>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <T>Our Values</T>
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">
              <T>The principles that guide everything we do</T>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <value.icon className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          <T>{value.title}</T>
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
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
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <T>Why Choose Orivraa?</T>
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">
              <T>Features that make us the trusted choice for gold jewelry</T>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <feature.icon className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <T>{feature.title}</T>
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  <T>{feature.description}</T>
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Find Us On Section */}
      <section className="py-16 md:py-24 bg-amber-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              <T>Featured & Listed On</T>
            </motion.h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300">
              <T>
                Orivraa is verified and listed on leading software directories and review platforms. Visit our profiles to learn more and leave a review.
              </T>
            </p>
          </div>
          {/* Live profiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-10">
            {LIVE_PLATFORMS.map((platform, index) => (
              <motion.a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="h-full hover:shadow-lg hover:border-amber-400 transition-all">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{platform.logo}</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {platform.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <T>{platform.category}</T>
                    </p>
                    <span className="text-xs text-amber-600 group-hover:underline mt-2 inline-block">
                      <T>Visit Profile</T> →
                    </span>
                  </CardContent>
                </Card>
              </motion.a>
            ))}
          </div>
          {/* Coming soon */}
          {COMING_SOON_PLATFORMS.length > 0 && (
            <>
              <div className="text-center mb-4">
                <span className="text-sm font-medium uppercase tracking-wider text-gray-400">
                  <T>Coming soon on</T>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
                {COMING_SOON_PLATFORMS.map((platform, index) => (
                  <motion.div
                    key={platform.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full border-dashed border-gray-300 dark:border-gray-600 opacity-70">
                      <CardContent className="p-3 text-center">
                        <div className="text-xl mb-1">{platform.logo}</div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-400 text-xs mb-1">
                          {platform.name}
                        </h3>
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                          <T>Coming Soon</T>
                        </span>
                      </CardContent>
                    </Card>
                  </motion.div>
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
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
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
                initial={{ opacity: 0, y: 20 }}
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
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <T>Become a Seller</T>
                </h2>
                <div className="h-1 w-20 bg-amber-500 mb-6" />
                <p className="text-lg text-gray-300 mb-6">
                  <T>
                    Join our marketplace and reach thousands of customers
                    looking for quality gold and silver jewelry. We handle the
                    platform, you focus on your craft.
                  </T>
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Reach customers worldwide",
                    "Easy shop management tools",
                    "Secure payment processing",
                    "Real-time order notifications",
                    "Analytics and insights",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckBadgeIcon className="h-5 w-5 text-amber-500" />
                      <span className="text-gray-200"><T>{item}</T></span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="gold-gradient text-white" asChild>
                  <Link href="/register?role=seller">
                    <T>Register as Seller</T>
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-3xl" />
                  <Card className="relative bg-gray-800/50 border-gray-700">
                    <CardContent className="p-8">
                      <div className="text-center">
                        <BuildingStorefrontIcon className="h-16 w-16 mx-auto text-amber-500 mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">
                          500+ <T>Sellers</T>
                        </h3>
                        <p className="text-gray-400">
                          <T>Already trust Orivraa to grow their business</T>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <T>Get in Touch</T>
            </h2>
            <div className="h-1 w-20 bg-amber-500 mx-auto mb-6" />
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              <T>
                Have questions? We'd love to hear from you. Send us a message
                and we'll respond as soon as possible.
              </T>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Card className="flex-1">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    <T>Email Us</T>
                  </h3>
                  <a
                    href="mailto:support@orivraa.com"
                    className="text-amber-600 hover:underline"
                  >
                    support@orivraa.com
                  </a>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    <T>For Sellers</T>
                  </h3>
                  <a
                    href="mailto:sellers@orivraa.com"
                    className="text-amber-600 hover:underline"
                  >
                    sellers@orivraa.com
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
