"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";

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
  const t = useT();
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
              <T>Your trusted marketplace for authentic gold and silver jewelry. Connecting skilled artisans with jewelry lovers worldwide.</T>
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
                <Link href="/rfq/create"><T>Create Custom Order</T></Link>
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
                  {t(stat.label)}
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
                <T>Orivraa was born from a simple idea: make it easy for people to find and purchase authentic, high-quality gold and silver jewelry from trusted artisans around the world.</T>
              </p>
              <p className="text-lg leading-relaxed mb-6">
                <T>In many countries, buying gold jewelry involves visiting multiple shops, comparing prices manually, and often dealing with unclear pricing. We wanted to change that by creating a transparent marketplace where buyers can see real-time gold prices, compare sellers, and order custom jewelry with confidence.</T>
              </p>
              <p className="text-lg leading-relaxed">
                <T>Today, Orivraa connects thousands of customers with verified jewelers across Nepal, India, UAE, and beyond. Whether you're looking for a traditional wedding set or a modern custom design, we help you find the perfect piece at a fair price.</T>
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
                          {t(value.title)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {t(value.description)}
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
                  {t(feature.title)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {t(feature.description)}
                </p>
              </motion.div>
            ))}
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
                  <T>Join our marketplace and reach thousands of customers looking for quality gold and silver jewelry. We handle the platform, you focus on your craft.</T>
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
                      <span className="text-gray-200">{t(item)}</span>
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
                          500+ Sellers
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
              <T>Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</T>
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
