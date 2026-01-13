'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Trash2,
  ShoppingCart,
  Store,
  Package,
  Loader2,
  HeartOff,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  shop: {
    id: string;
    name: string;
  };
  addedAt: string;
  inStock: boolean;
}

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call when wishlist endpoint is available
      // const response = await api.get('/wishlist');
      // setWishlistItems(response.data);
      
      // For now, show empty state
      setWishlistItems([]);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load wishlist items',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      // TODO: Replace with actual API call
      // await api.delete(`/wishlist/${itemId}`);
      
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: 'Removed from wishlist',
        description: 'Item has been removed from your wishlist',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove item from wishlist',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Wishlist</h1>
              <p className="text-muted-foreground">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
            {wishlistItems.length > 0 && (
              <Button variant="outline" asChild>
                <Link href="/shops">
                  <Store className="h-4 w-4 mr-2" />
                  Browse More
                </Link>
              </Button>
            )}
          </div>

          {wishlistItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <HeartOff className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Start browsing our shops and save items you love to your wishlist.
                  They'll appear here for easy access later.
                </p>
                <Button asChild>
                  <Link href="/shops">
                    <Store className="h-4 w-4 mr-2" />
                    Browse Shops
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    {!item.inStock && (
                      <Badge variant="secondary" className="absolute top-2 left-2">
                        Out of Stock
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                        <Link
                          href={`/shop/${item.shop.id}`}
                          className="text-sm text-muted-foreground hover:text-primary"
                        >
                          {item.shop.name}
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromWishlist(item.id)}
                        disabled={removingId === item.id}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        {removingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">
                        {formatPrice(item.price, item.currency)}
                      </span>
                      <Button size="sm" disabled={!item.inStock}>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
