"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND } from "@/config/brand";
import { useMarket } from "@/hooks/useMarket";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";
import Link from "next/link";

export function DynamicFooter() {
  const { config } = useMarket();

  // Use market-specific contact info if available, otherwise fall back to BRAND config
  const contactEmail = config?.contactEmail || BRAND.contact.supportEmail;
  const contactPhone = config?.contactPhone || BRAND.contact.phone;
  const contactAddress = config?.contactAddress || BRAND.contact.address;

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo variant="icon" size="md" theme="dark" />
              <span className="text-xl font-bold text-white">{BRAND.name}</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              {BRAND.tagline}. Connecting buyers with verified jewellers across
              Nepal, India, Dubai, USA & UK.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-gray-800 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-3 lg:mb-4 text-sm uppercase tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/shop"
                  className="hover:text-gold-400 transition-colors"
                >
                  Browse Shop
                </Link>
              </li>
              <li>
                <Link
                  href="/rfq/create"
                  className="hover:text-gold-400 transition-colors"
                >
                  Custom Order
                </Link>
              </li>
              <li>
                <Link
                  href="/shops"
                  className="hover:text-gold-400 transition-colors"
                >
                  Find Sellers
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-gold-400 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-gold-400 transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h3 className="text-white font-semibold mb-3 lg:mb-4 text-sm uppercase tracking-wide">
              For Jewellers
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/partner"
                  className="hover:text-gold-400 transition-colors"
                >
                  Become a Partner
                </Link>
              </li>
              <li>
                <Link
                  href="/seller-guide"
                  className="hover:text-gold-400 transition-colors"
                >
                  Seller Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-gold-400 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="hover:text-gold-400 transition-colors"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact - Now using dynamic market config */}
          <div>
            <h3 className="text-white font-semibold mb-3 lg:mb-4 text-sm uppercase tracking-wide">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gold-400 mt-0.5 shrink-0" />
                <span className="text-gray-400">{contactAddress}</span>
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

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/refund"
              className="text-gray-400 hover:text-gold-400 transition-colors"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
