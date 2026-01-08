'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart,
  Star,
  Gem,
  Shield,
  Truck,
  Phone,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus
} from 'lucide-react';

interface InventoryItem {
  id: string;
  nameEn: string;
  nameNe?: string;
  descriptionEn?: string;
  descriptionNe?: string;
  category: string;
  metalType: string;
  purity?: string;
  weightGrams: number;
  totalPriceNpr: number;
  stockQuantity: number;
  images: string[];
  status: string;
  finishType?: string;
  gemstones?: any;
  shop: {
    id: string;
    shopName: string;
    logoUrl?: string;
    addressLine1?: string;
    city?: string;
    phone?: string;
    isVerified: boolean;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (params.id) {
      fetchItem(params.id as string);
    }
  }, [params.id]);

  const fetchItem = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/inventory/${id}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      }
    } catch (error) {
      console.error('Failed to fetch item:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Gem className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Item not found</h2>
            <Link href="/shop">
              <Button>Back to Shop</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shop
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-white rounded-2xl overflow-hidden">
                {item.images?.[currentImageIndex] ? (
                  <img
                    src={item.images[currentImageIndex]}
                    alt={item.nameEn}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Gem className="h-24 w-24 text-gray-300" />
                  </div>
                )}
                
                {item.images && item.images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80"
                      onClick={() => setCurrentImageIndex(prev => 
                        prev === 0 ? item.images.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80"
                      onClick={() => setCurrentImageIndex(prev => 
                        prev === item.images.length - 1 ? 0 : prev + 1
                      )}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {item.images && item.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {item.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        currentImageIndex === idx ? 'border-gold-500' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{item.metalType.replace('_', ' ')}</Badge>
                  <Badge variant="secondary">{item.category}</Badge>
                  {item.stockQuantity <= 2 && item.stockQuantity > 0 && (
                    <Badge className="bg-orange-500">Only {item.stockQuantity} left</Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {item.nameEn}
                </h1>
                {item.nameNe && (
                  <p className="text-lg text-gray-600">{item.nameNe}</p>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">4.0 (24 reviews)</span>
              </div>

              {/* Price */}
              <div className="bg-gold-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Price</p>
                <p className="text-3xl font-bold text-gold-600">
                  {formatPrice(item.totalPriceNpr)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Weight: {item.weightGrams}g | {item.purity || item.metalType}
                </p>
              </div>

              {/* Shop Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      {item.shop.logoUrl ? (
                        <img src={item.shop.logoUrl} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <Gem className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.shop.shopName}</h3>
                        {item.shop.isVerified && (
                          <Badge className="bg-green-500 text-xs">Verified</Badge>
                        )}
                      </div>
                      {item.shop.city && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.shop.city}
                        </p>
                      )}
                    </div>
                    <Link href={`/shops/${item.shop.id}`}>
                      <Button variant="outline" size="sm">Visit Shop</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Quantity & Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold">{quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setQuantity(Math.min(item.stockQuantity, quantity + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {item.stockQuantity} available
                  </span>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1 gold-gradient text-white" size="lg">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </Button>
                  <Button size="lg" variant="outline">
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-gray-600">Certified Purity</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Truck className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-gray-600">Secure Delivery</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-6 w-6 mx-auto text-gold-600 mb-1" />
                  <p className="text-xs text-gray-600">Support</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mt-12">
            <Tabs defaultValue="description">
              <TabsList className="w-full justify-start border-b bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger 
                  value="specifications"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  Specifications
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                <div className="bg-white rounded-xl p-6">
                  <p className="text-gray-600 leading-relaxed">
                    {item.descriptionEn || 'No description available for this item.'}
                  </p>
                  {item.descriptionNe && (
                    <p className="text-gray-600 leading-relaxed mt-4">
                      {item.descriptionNe}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="mt-6">
                <div className="bg-white rounded-xl p-6">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-gray-500">Metal Type</dt>
                      <dd className="font-medium">{item.metalType.replace('_', ' ')}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-gray-500">Purity</dt>
                      <dd className="font-medium">{item.purity || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-gray-500">Weight</dt>
                      <dd className="font-medium">{item.weightGrams}g</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <dt className="text-gray-500">Category</dt>
                      <dd className="font-medium">{item.category}</dd>
                    </div>
                    {item.finishType && (
                      <div className="flex justify-between py-2 border-b">
                        <dt className="text-gray-500">Finish</dt>
                        <dd className="font-medium">{item.finishType}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="bg-white rounded-xl p-6 text-center">
                  <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                  <p className="text-gray-500">Be the first to review this product</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
