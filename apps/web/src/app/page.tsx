import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BRAND } from '@/config/brand';
import { 
  Gem, 
  ShieldCheck, 
  Truck, 
  HeartHandshake,
  ArrowRight,
  Star,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-gold-50 via-amber-50/50 to-white py-12 lg:py-24 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gold-200 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-amber-200 rounded-full blur-3xl opacity-30" />
          
          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-100 rounded-full text-gold-700 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Nepal's Premier Jewellery Marketplace
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                  Discover Exquisite
                  <span className="gold-text-gradient block sm:inline"> Jewellery</span> From
                  Trusted Artisans
                </h1>
                <p className="text-base lg:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
                  Connect with verified local jewellers, browse ready-made pieces, 
                  or get custom jewellery crafted exactly to your specifications.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link href="/shop">
                    <Button size="lg" className="w-full sm:w-auto gold-gradient text-white h-12 px-8 rounded-xl text-base">
                      Browse Collection
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/rfq/create">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base">
                      Custom Order
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Stats Card */}
              <div className="relative mt-8 lg:mt-0">
                <div className="aspect-square bg-gradient-to-br from-gold-200 to-gold-400 rounded-full opacity-20 absolute -top-10 -right-10 w-72 h-72 blur-3xl" />
                <div className="relative bg-white rounded-2xl lg:rounded-3xl shadow-2xl shadow-gold-500/10 p-6 lg:p-8">
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                      <Gem className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">500+</p>
                      <p className="text-xs lg:text-sm text-gray-600">Unique Designs</p>
                    </div>
                    <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                      <ShieldCheck className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">100%</p>
                      <p className="text-xs lg:text-sm text-gray-600">Certified Pure</p>
                    </div>
                    <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                      <HeartHandshake className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">50+</p>
                      <p className="text-xs lg:text-sm text-gray-600">Trusted Sellers</p>
                    </div>
                    <div className="bg-gradient-to-br from-gold-50 to-amber-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                      <Star className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">4.9</p>
                      <p className="text-xs lg:text-sm text-gray-600">Avg. Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 lg:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
              <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">
                Why Choose {BRAND.name}?
              </h2>
              <p className="text-gray-600 text-sm lg:text-base">
                We connect you with verified jewellers who craft authentic, 
                high-quality pieces with complete transparency.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
              <div className="premium-card p-6 lg:p-8">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                  <Gem className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
                  Custom Manufacturing
                </h3>
                <p className="text-gray-600 text-sm lg:text-base">
                  Get jewellery made to your exact specifications. Choose materials, 
                  design, and receive quotes from multiple sellers.
                </p>
              </div>
              <div className="premium-card p-6 lg:p-8">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                  <ShieldCheck className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
                  Verified Purity
                </h3>
                <p className="text-gray-600 text-sm lg:text-base">
                  All precious metals are certified. Choose from 24K, 22K, 18K gold, 
                  sterling silver, platinum, and more.
                </p>
              </div>
              <div className="premium-card p-6 lg:p-8 sm:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-gold-100 to-amber-100 rounded-xl flex items-center justify-center mb-4 lg:mb-6">
                  <Truck className="h-6 w-6 lg:h-7 lg:w-7 text-gold-600" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
                  Secure Delivery
                </h3>
                <p className="text-gray-600 text-sm lg:text-base">
                  Insured shipping with real-time tracking. Pay on delivery option 
                  available for your peace of mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 lg:py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-16">
              <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">
                How Custom Orders Work
              </h2>
              <p className="text-gray-600 text-sm lg:text-base">
                From design to delivery, we make custom jewellery simple.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
              {[
                { step: '1', title: 'Submit Request', desc: 'Describe your jewellery and upload reference images' },
                { step: '2', title: 'Receive Quotes', desc: 'Get competitive offers from verified sellers' },
                { step: '3', title: 'Book & Track', desc: 'Pay booking fee and track progress' },
                { step: '4', title: 'Receive & Pay', desc: 'Inspect and pay remaining balance' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-full flex items-center justify-center text-lg lg:text-2xl font-bold mx-auto mb-3 lg:mb-4 shadow-lg shadow-gold-500/30">
                    {item.step}
                  </div>
                  <h3 className="text-sm lg:text-lg font-semibold text-gray-900 mb-1 lg:mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-xs lg:text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 lg:py-20 gold-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/luxury-pattern.svg')] opacity-10" />
          <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3 lg:mb-4">
              Ready to Find Your Perfect Piece?
            </h2>
            <p className="text-gold-100 mb-6 lg:mb-8 max-w-xl mx-auto text-sm lg:text-base">
              Join thousands of happy customers who found their dream jewellery 
              through {BRAND.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/shops">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl text-base bg-transparent text-white border-white hover:bg-white hover:text-gold-600">
                  Browse Sellers
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
