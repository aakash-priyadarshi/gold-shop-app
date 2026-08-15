"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import {
  getPublicAboutHref,
  LANG_META,
  type Language,
} from "@/data/about-i18n";
import { useMarket } from "@/hooks/useMarket";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";
import Link from "next/link";

const FOOTER_LANGUAGES: Language[] = [
  "en",
  "hi",
  "ne",
  "gu",
  "mr",
  "ta",
  "te",
  "kn",
  "si",
  "fr",
  "de",
  "es",
  "he",
  "ar",
];

export function DynamicFooter() {
  const { config } = useMarket();
  const { features } = usePlatformFeatures();
  const customerFlowEnabled = features.customerFlowEnabled;

  // Use market-specific contact info if available, otherwise fall back to BRAND config
  const contactEmail = config?.contactEmail || BRAND.contact.supportEmail;
  const contactPhone = config?.contactPhone || BRAND.contact.phone;
  const contactAddress = config?.contactAddress || BRAND.contact.address;

  const quickLinks = customerFlowEnabled
    ? [
        { href: "/shop", label: "Browse Shop" },
        { href: "/rfq/create", label: "Custom Order" },
        { href: "/shops", label: "Find Sellers" },
        { href: "/about", label: "About Us" },
        { href: "/blog", label: "Blog" },
      ]
    : [
        { href: "/jewellery-shop-software", label: "Jewellery Software" },
        { href: "/pricing", label: "Pricing" },
        { href: "/support", label: "Support" },
        { href: "/demo", label: "Quick Demo" },
        { href: "/tutorial", label: "Full Tutorial" },
        { href: "/about", label: "About Us" },
        { href: "/contact", label: "Contact" },
      ];

  const sellerLinks = [
    { href: "/for-sellers", label: "Start Selling Free" },
    { href: "/jewellery-shop-software", label: "Shop Software" },
    {
      href: "/jewellery-store-management-software",
      label: "Store Management",
    },
    { href: "/jewellery-pos-software", label: "Mobile POS" },
    {
      href: "/jewellery-inventory-software",
      label: "Inventory Software",
    },
    { href: "/seller-guide", label: "Seller Guide" },
    { href: "/download", label: "Download App" },
    { href: "/support", label: "Support" },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo
                variant="icon"
                size="md"
                theme="dark"
                linkToHome={false}
              />
              <span className="text-xl font-bold text-white">{BRAND.name}</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              <T>
                Orivraa is a SaaS platform and marketplace connecting buyers
                with verified jewellers across Nepal, India, Dubai, USA & UK for
                ready-made and custom jewelry orders.
              </T>
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={BRAND.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={BRAND.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={BRAND.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href={BRAND.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-3 lg:mb-4 text-sm uppercase tracking-wide">
              <T>Quick Links</T>
            </h3>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-gold-400 transition-colors"
                  >
                    <T>{item.label}</T>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h3 className="text-white font-semibold mb-3 lg:mb-4 text-sm uppercase tracking-wide">
              <T>For Jewellers</T>
            </h3>
            <ul className="space-y-2 text-sm">
              {sellerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-gold-400 transition-colors"
                  >
                    <T>{item.label}</T>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact - Now using dynamic market config */}
          <div>
            <h3 className="text-white font-semibold mb-3 lg:mb-4 text-sm uppercase tracking-wide">
              <T>Contact Us</T>
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gold-400 mt-0.5 shrink-0" />
                <span className="text-gray-400">
                  <T>{contactAddress}</T>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold-400 shrink-0" />
                <a
                  href={`tel:${contactPhone.replace(/\s/g, "")}`}
                  className="text-gray-400 hover:text-gold-400 transition-colors"
                >
                  {contactPhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold-400 shrink-0" />
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-gray-400 hover:text-gold-400 transition-colors"
                >
                  {contactEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Language Availability */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-medium text-gray-300">
              <T>About Orivraa</T> · <bdi>{FOOTER_LANGUAGES.length}</bdi>{" "}
              <T>languages</T>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FOOTER_LANGUAGES.map((code) => {
              const meta = LANG_META[code];
              return (
                <Link
                  key={code}
                  href={getPublicAboutHref(code)}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gold-500/20 hover:text-gold-400 text-gray-400 transition-colors"
                >
                  {meta.flag} {meta.nativeName}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Also reviewed on */}
        <div className="border-t border-gray-800 mt-6 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              <T>Also reviewed on</T>
            </span>
            {[
              {
                label: "G2",
                href: "https://www.g2.com/products/orivraa/reviews",
              },
              {
                label: "Capterra",
                href: "https://www.capterra.in/software/1097833/Orivraa",
              },
              {
                label: "Trustpilot",
                href: "https://www.trustpilot.com/review/orivraa.com",
              },
              {
                label: "Google Business",
                href: "https://share.google/9XsJWUQnuoWNLtrDb",
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gold-500/20 hover:text-gold-400 text-gray-400 transition-colors"
              >
                ⭐ {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} {BRAND.name}.{" "}
            <T>All rights reserved.</T>
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
            <Link
              href="/security"
              className="text-gray-400 hover:text-gold-400 transition-colors font-medium text-amber-500"
            >
              <T>Security &amp; Trust</T>
            </Link>
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              <T>Privacy Policy</T>
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              <T>Terms of Service</T>
            </Link>
            <Link
              href="/refund"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              <T>Refund Policy</T>
            </Link>
            <Link
              href="/platform-guidelines"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              <T>Platform Guidelines</T>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
