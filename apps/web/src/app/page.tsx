import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { 
  Gem, 
  ShieldCheck, 
  Truck, 
  HeartHandshake,
  ArrowRight,
  Star 
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-gold-50 to-white py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-block px-4 py-2 bg-gold-100 rounded-full text-gold-700 text-sm font-medium">
                  ✨ Nepal's Premier Jewellery Marketplace
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Discover Exquisite
                  <span className="gold-text-gradient"> Jewellery</span> From
                  Trusted Artisans
                </h1>
                <p className="text-lg text-gray-600 max-w-lg">
                  Connect with verified local jewellers, browse ready-made pieces, 
                  or get custom jewellery crafted exactly to your specifications.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/shop">
                    <Button size="lg" className="gold-gradient text-white">
                      Browse Collection
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/rfq/create">
                    <Button size="lg" variant="outline">
                      Custom Order
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-gold-200 to-gold-400 rounded-full opacity-20 absolute -top-10 -right-10 w-72 h-72 blur-3xl" />
                <div className="relative bg-white rounded-2xl shadow-2xl p-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gold-50 rounded-xl p-4 text-center">
                      <Gem className="h-8 w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">500+</p>
                      <p className="text-sm text-gray-600">Unique Designs</p>
                    </div>
                    <div className="bg-gold-50 rounded-xl p-4 text-center">
                      <ShieldCheck className="h-8 w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">100%</p>
                      <p className="text-sm text-gray-600">Certified Pure</p>
                    </div>
                    <div className="bg-gold-50 rounded-xl p-4 text-center">
                      <HeartHandshake className="h-8 w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">50+</p>
                      <p className="text-sm text-gray-600">Trusted Shops</p>
                    </div>
                    <div className="bg-gold-50 rounded-xl p-4 text-center">
                      <Star className="h-8 w-8 mx-auto text-gold-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">4.9</p>
                      <p className="text-sm text-gray-600">Avg. Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Why Choose Our Platform?
              </h2>
              <p className="text-gray-600">
                We connect you with verified jewellers who craft authentic, 
                high-quality pieces with complete transparency.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 rounded-2xl p-8 card-hover">
                <div className="w-14 h-14 bg-gold-100 rounded-xl flex items-center justify-center mb-6">
                  <Gem className="h-7 w-7 text-gold-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Custom Manufacturing
                </h3>
                <p className="text-gray-600">
                  Get jewellery made to your exact specifications. Choose materials, 
                  design, and receive quotes from multiple shops.
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-8 card-hover">
                <div className="w-14 h-14 bg-gold-100 rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="h-7 w-7 text-gold-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Verified Purity
                </h3>
                <p className="text-gray-600">
                  All precious metals are certified. Choose from 24K, 22K, 18K gold, 
                  sterling silver, platinum, and more.
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-8 card-hover">
                <div className="w-14 h-14 bg-gold-100 rounded-xl flex items-center justify-center mb-6">
                  <Truck className="h-7 w-7 text-gold-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Secure Delivery
                </h3>
                <p className="text-gray-600">
                  Insured shipping with real-time tracking. Pay on delivery option 
                  available for your peace of mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                How Custom Orders Work
              </h2>
              <p className="text-gray-600">
                From design to delivery, we make custom jewellery simple.
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Submit Request', desc: 'Describe your jewellery, select materials and upload reference images' },
                { step: '2', title: 'Receive Quotes', desc: 'Get competitive offers from multiple verified jewellers' },
                { step: '3', title: 'Book & Track', desc: 'Pay booking fee and track manufacturing progress' },
                { step: '4', title: 'Receive & Pay', desc: 'Inspect your jewellery and pay the remaining balance' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 bg-gold-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 gold-gradient">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Find Your Perfect Piece?
            </h2>
            <p className="text-gold-100 mb-8 max-w-xl mx-auto">
              Join thousands of happy customers who found their dream jewellery 
              through our platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" variant="secondary">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/shops">
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-gold-600">
                  Browse Shops
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
