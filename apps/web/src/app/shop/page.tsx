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
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  Heart,
  ShoppingCart,
  Star,
  Gem,
  Loader2,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface InventoryItem {
  id: string;
  nameEn: string;
  nameNe?: string;
  descriptionEn?: string;
  jewelleryType: string;
  buildMethod: string;
  composition: any;
  totalWeightGrams: number;
  totalPriceNpr: number;
  stockQuantity: number;
  images: string[];
  shop: {
    id: string;
    shopName: string;
    city?: string;
    ratingAvg?: number;
  };
}

import { getApiUrl } from '@/lib/api';
const API_URL = getApiUrl();

export default function ShopPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [metalType, setMetalType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [category, metalType, sortBy]);

  useEffect(() => {
    // Fetch recommended items (simple heuristic: newest from different categories)
    fetchRecommendations();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('jewelleryType', category);
      
      // Map frontend sort values to database columns
      const sortMapping: Record<string, { field: string; order: string }> = {
        'newest': { field: 'createdAt', order: 'desc' },
        'price_low': { field: 'totalPriceNpr', order: 'asc' },
        'price_high': { field: 'totalPriceNpr', order: 'desc' },
        'popular': { field: 'createdAt', order: 'desc' },
      };
      const sort = sortMapping[sortBy] || sortMapping['newest'];
      params.append('sortBy', sort.field);
      params.append('sortOrder', sort.order);
      params.append('status', 'AVAILABLE');

      const response = await fetch(`${API_URL}/inventory?${params}`);
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

  const fetchRecommendations = async () => {
    try {
      const params = new URLSearchParams();
      params.append('sortBy', 'createdAt');
      params.append('sortOrder', 'desc');
      params.append('status', 'AVAILABLE');
      params.append('limit', '4');

      const response = await fetch(`${API_URL}/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendedItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  const getMetalFromComposition = (composition: any) => {
    const metal = composition?.baseAlloy?.metal || composition?.metal || '';
    const purity = composition?.baseAlloy?.purity || composition?.purity || '';
    return metal && purity ? `${metal} ${purity}` : metal || 'N/A';
  };

  const filteredItems = items.filter(item => {
    // Text search
    const matchesSearch = !searchQuery || 
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descriptionEn?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Price range
    const matchesPrice = item.totalPriceNpr >= priceRange[0] && 
      item.totalPriceNpr <= priceRange[1];
    
    // Metal type filter (check composition)
    const itemMetal = getMetalFromComposition(item.composition);
    const matchesMetal = metalType === 'all' || 
      itemMetal.toLowerCase().includes(metalType.toLowerCase().replace('_', ' '));
    
    return matchesSearch && matchesPrice && matchesMetal;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setMetalType('all');
    setPriceRange([0, 500000]);
  };

  const activeFiltersCount = [
    category !== 'all',
    metalType !== 'all',
    priceRange[0] > 0 || priceRange[1] < 500000,
  ].filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        {/* Page Header */}
        <section className="bg-gradient-to-r from-gold-50 to-amber-50 border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Browse Jewellery
            </h1>
            <p className="text-gray-600">
              Discover exquisite pieces from verified local artisans
            </p>
          </div>
        </section>

        {/* Recommendations Section */}
        {recommendedItems.length > 0 && (
          <section className="bg-white border-b py-6">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-gold-500" />
                <h2 className="text-lg font-semibold">Recommended for You</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendedItems.slice(0, 4).map((item) => (
                  <Link href={`/shop/${item.id}`} key={item.id}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="aspect-square bg-gray-100 relative">
                        {item.images?.[0] ? (
                          <img
                            src={item.images[0]}
                            alt={item.nameEn}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Gem className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm line-clamp-1">{item.nameEn}</p>
                        <p className="text-gold-600 font-bold text-sm">{formatPrice(item.totalPriceNpr)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Filters Bar */}
        <section className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-3 items-center">
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
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="RING">Rings</SelectItem>
                  <SelectItem value="NECKLACE">Necklaces</SelectItem>
                  <SelectItem value="BRACELET">Bracelets</SelectItem>
                  <SelectItem value="EARRING">Earrings</SelectItem>
                  <SelectItem value="PENDANT">Pendants</SelectItem>
                  <SelectItem value="BANGLE">Bangles</SelectItem>
                  <SelectItem value="CHAIN">Chains</SelectItem>
                  <SelectItem value="ANKLET">Anklets</SelectItem>
                  <SelectItem value="NOSE_PIN">Nose Pins</SelectItem>
                </SelectContent>
              </Select>

              {/* Metal Type Filter */}
              <Select value={metalType} onValueChange={setMetalType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Metal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metals</SelectItem>
                  <SelectItem value="gold 24k">24K Gold</SelectItem>
                  <SelectItem value="gold 22k">22K Gold</SelectItem>
                  <SelectItem value="gold 18k">18K Gold</SelectItem>
                  <SelectItem value="silver 999">999 Silver</SelectItem>
                  <SelectItem value="silver 925">925 Silver</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>

              {/* More Filters Button */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search results
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-6">
                    {/* Price Range */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium">Price Range (NPR)</label>
                      <Slider
                        value={priceRange}
                        onValueChange={(v) => setPriceRange(v as [number, number])}
                        min={0}
                        max={500000}
                        step={5000}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatPrice(priceRange[0])}</span>
                        <span>{formatPrice(priceRange[1])}</span>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
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

            {/* Active filters tags */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {category !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {category.replace(/_/g, ' ')}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setCategory('all')} />
                  </Badge>
                )}
                {metalType !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {metalType.replace(/_/g, ' ')}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setMetalType('all')} />
                  </Badge>
                )}
                {(priceRange[0] > 0 || priceRange[1] < 500000) && (
                  <Badge variant="secondary" className="gap-1">
                    {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRange([0, 500000])} />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-4">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
            </p>

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
                <Button onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
              }>
                {filteredItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square bg-gray-100">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.nameEn}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Gem className="h-16 w-16 text-gray-300" />
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
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
                          {getMetalFromComposition(item.composition)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.jewelleryType?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {item.nameEn}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {item.shop?.shopName || 'Unknown Shop'}
                        {item.shop?.city && ` • ${item.shop.city}`}
                      </p>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600">
                          {item.shop?.ratingAvg?.toFixed(1) || '4.8'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Weight: {item.totalWeightGrams}g
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
