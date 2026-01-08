import Link from 'next/link';
import { Gem, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
                <Gem className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Gold<span className="text-gold-500">Shop</span>
              </span>
            </Link>
            <p className="text-sm">
              Nepal's premier multi-vendor jewellery marketplace. Connecting 
              customers with trusted local artisans.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="hover:text-gold-500 transition-colors">
                  Browse Shop
                </Link>
              </li>
              <li>
                <Link href="/rfq/create" className="hover:text-gold-500 transition-colors">
                  Custom Order
                </Link>
              </li>
              <li>
                <Link href="/shops" className="hover:text-gold-500 transition-colors">
                  Find Shops
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gold-500 transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Jewellers</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/partner" className="hover:text-gold-500 transition-colors">
                  Become a Partner
                </Link>
              </li>
              <li>
                <Link href="/seller-guide" className="hover:text-gold-500 transition-colors">
                  Seller Guide
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-gold-500 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-gold-500 transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gold-500" />
                <span>Kathmandu, Nepal</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gold-500" />
                <span>+977 1-1234567</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gold-500" />
                <span>support@goldshop.com.np</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm">
            © {new Date().getFullYear()} GoldShop. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm">
            <Link href="/privacy" className="hover:text-gold-500 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gold-500 transition-colors">
              Terms of Service
            </Link>
            <Link href="/refund" className="hover:text-gold-500 transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
