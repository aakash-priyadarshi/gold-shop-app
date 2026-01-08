'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Card, 
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  Heart,
  ShoppingCart,
  Star,
  Gem,
  Loader2
} from 'lucide-react';

interface InventoryItem {
  id: string;
  nameEn: string;
  nameNe?: string;
  descriptionEn?: string;
  category: string;
  metalType: string;
  purity?: string;
  weightGrams: number;
  totalPriceNpr: number;
  stockQuantity: number;
  images: string[];
  shop: {
    id: string;
    shopName: string;
    logoUrl?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ShopPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [metalType, setMetalType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchItems();
  }, [category, metalType, sortBy]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (metalType !== 'all') params.append('metalType', metalType);
      
      // Map frontend sort values to database columns
      const sortMapping: Record<string, { field: string; order: string }> = {
        'newest': { field: 'createdAt', order: 'desc' },
        'price_low': { field: 'totalPriceNpr', order: 'asc' },
        'price_high': { field: 'totalPriceNpr', order: 'desc' },
        'popular': { field: 'createdAt', order: 'desc' }, // TODO: implement popularity
      };
      const sort = sortMapping[sortBy] || sortMapping['newest'];
      params.append('sortBy', sort.field);
      params.append('sortOrder', sort.order);
      params.append('status', 'AVAILABLE');

      const response = await fetch(`${API_URL}/api/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.descriptionEn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        {/* Page Header */}
        <section className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Browse Jewellery
            </h1>
            <p className="text-gray-600">
              Discover exquisite pieces from verified local artisans
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jewellery..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="RING">Rings</SelectItem>
                  <SelectItem value="NECKLACE">Necklaces</SelectItem>
                  <SelectItem value="BRACELET">Bracelets</SelectItem>
                  <SelectItem value="EARRING">Earrings</SelectItem>
                  <SelectItem value="PENDANT">Pendants</SelectItem>
                  <SelectItem value="BANGLE">Bangles</SelectItem>
                  <SelectItem value="CHAIN">Chains</SelectItem>
                </SelectContent>
              </Select>

              {/* Metal Type Filter */}
              <Select value={metalType} onValueChange={setMetalType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Metal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metals</SelectItem>
                  <SelectItem value="GOLD_24K">24K Gold</SelectItem>
                  <SelectItem value="GOLD_22K">22K Gold</SelectItem>
                  <SelectItem value="GOLD_18K">18K Gold</SelectItem>
                  <SelectItem value="SILVER_999">999 Silver</SelectItem>
                  <SelectItem value="SILVER_925">925 Silver</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <Gem className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No items found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setCategory('all');
                  setMetalType('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
              }>
                {filteredItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden card-hover">
                    <div className="relative aspect-square bg-gray-100">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.nameEn}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Gem className="h-16 w-16 text-gray-300" />
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      {item.stockQuantity <= 2 && item.stockQuantity > 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-orange-500">
                          Only {item.stockQuantity} left
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {item.metalType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {item.nameEn}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {item.shop.shopName}
                      </p>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600">4.8</span>
                        <span className="text-sm text-gray-400">(24)</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Weight: {item.weightGrams}g
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-gold-600">
                          {formatPrice(item.totalPriceNpr)}
                        </p>
                      </div>
                      <Link href={`/shop/${item.id}`}>
                        <Button size="sm" className="gold-gradient text-white">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
