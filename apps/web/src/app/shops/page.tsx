"use client";

import { Header } from '@/components/layout/header';
import { DynamicFooter } from '@/components/layout/DynamicFooter';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api, { chatApi } from "@/lib/api";
import {
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface Shop {
  id: string;
  shopName: string;
  description?: string;
  country: string;
  state?: string;
  city: string;
  address: string;
  isVerified: boolean;
  contactPhone: string;
  contactEmail?: string;
  supportedMaterials: string[];
  supportedJewelleryTypes: string[];
  averageRating?: number;
  totalRatings?: number;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface FilterState {
  country: string;
  state: string;
  city: string;
  search: string;
  verified: string;
}

const COUNTRIES = {
  NP: {
    name: "Nepal",
    states: [
      "Bagmati",
      "Gandaki",
      "Lumbini",
      "Koshi",
      "Madhesh",
      "Karnali",
      "Sudurpashchim",
    ],
  },
  IN: {
    name: "India",
    states: [
      "Maharashtra",
      "Gujarat",
      "Rajasthan",
      "Tamil Nadu",
      "Karnataka",
      "Delhi",
      "West Bengal",
      "Kerala",
    ],
  },
  US: {
    name: "United States",
    states: ["California", "New York", "Texas", "Florida", "Illinois"],
  },
  UK: {
    name: "United Kingdom",
    states: ["England", "Scotland", "Wales", "Northern Ireland"],
  },
  AE: { name: "UAE", states: ["Dubai", "Abu Dhabi", "Sharjah"] },
};

export default function ShopsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messagingShopId, setMessagingShopId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    country: "all",
    state: "all",
    city: "",
    search: "",
    verified: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/shops/public");
      let shopsArr = response.data?.shops || response.data || [];
      if (!Array.isArray(shopsArr)) {
        shopsArr = [];
      }
      // Only show verified shops on public page
      setShops(shopsArr.filter((s: Shop) => s.isVerified));
    } catch (error) {
      console.error("Failed to load shops:", error);
      // Set demo data for now
      setShops([
        {
          id: "1",
          shopName: "Kathmandu Gold House",
          description: "Premium gold and silver jewelry for over 25 years",
          country: "NP",
          state: "Bagmati",
          city: "Kathmandu",
          address: "New Road, Kathmandu",
          isVerified: true,
          contactPhone: "+977-1-4123456",
          supportedMaterials: ["GOLD_24K", "GOLD_22K", "SILVER"],
          supportedJewelleryTypes: ["RING", "NECKLACE", "EARRINGS", "BRACELET"],
          averageRating: 4.8,
          totalRatings: 156,
        },
        {
          id: "2",
          shopName: "Mumbai Jewelers",
          description: "Traditional and contemporary designs",
          country: "IN",
          state: "Maharashtra",
          city: "Mumbai",
          address: "Zaveri Bazaar, Mumbai",
          isVerified: true,
          contactPhone: "+91-22-12345678",
          supportedMaterials: ["GOLD_22K", "GOLD_18K", "PLATINUM"],
          supportedJewelleryTypes: ["RING", "NECKLACE", "BANGLES"],
          averageRating: 4.5,
          totalRatings: 89,
        },
        {
          id: "3",
          shopName: "Pokhara Gems",
          description: "Specializing in custom designs and gemstones",
          country: "NP",
          state: "Gandaki",
          city: "Pokhara",
          address: "Lakeside, Pokhara",
          isVerified: true,
          contactPhone: "+977-61-123456",
          supportedMaterials: ["GOLD_22K", "SILVER"],
          supportedJewelleryTypes: ["RING", "PENDANT", "EARRINGS"],
          averageRating: 4.6,
          totalRatings: 42,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageShop = async (shopId: string) => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to message this shop",
      });
      router.push(`/auth/login?redirect=/shops`);
      return;
    }
    if (user?.role !== "CUSTOMER") {
      toast({
        variant: "destructive",
        title: "Not Allowed",
        description: "Only customers can initiate conversations with shops",
      });
      return;
    }
    setMessagingShopId(shopId);
    try {
      const res = await chatApi.createConversation({ shopId });
      const conversationId = res.data?.id || res.data?.conversationId;
      router.push(`/dashboard/customer/messages?chat=${conversationId}`);
    } catch (err: any) {
      // If conversation already exists, the backend might return it
      if (err.response?.data?.conversationId) {
        router.push(
          `/dashboard/customer/messages?chat=${err.response.data.conversationId}`,
        );
        return;
      }
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.message || "Failed to start conversation",
      });
    } finally {
      setMessagingShopId(null);
    }
  };

  // Get unique values for filters
  const uniqueStates = useMemo(() => {
    if (filters.country === "all") return [];
    return COUNTRIES[filters.country as keyof typeof COUNTRIES]?.states || [];
  }, [filters.country]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    shops.forEach((shop) => {
      if (filters.country === "all" || shop.country === filters.country) {
        if (filters.state === "all" || shop.state === filters.state) {
          cities.add(shop.city);
        }
      }
    });
    return Array.from(cities).sort();
  }, [shops, filters.country, filters.state]);

  // Filter shops
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      if (filters.country !== "all" && shop.country !== filters.country)
        return false;
      if (filters.state !== "all" && shop.state !== filters.state) return false;
      if (
        filters.city &&
        !shop.city.toLowerCase().includes(filters.city.toLowerCase())
      )
        return false;
      if (filters.verified === "verified" && !shop.isVerified) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          shop.shopName.toLowerCase().includes(searchLower) ||
          shop.description?.toLowerCase().includes(searchLower) ||
          shop.city.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [shops, filters]);

  // Group shops by country/state for display
  const shopsByLocation = useMemo(() => {
    const grouped: Record<string, Record<string, Shop[]>> = {};
    filteredShops.forEach((shop) => {
      const country = shop.country || "Other";
      const state = shop.state || "Other";
      if (!grouped[country]) grouped[country] = {};
      if (!grouped[country][state]) grouped[country][state] = [];
      grouped[country][state].push(shop);
    });
    return grouped;
  }, [filteredShops]);

  const clearFilters = () => {
    setFilters({
      country: "all",
      state: "all",
      city: "",
      search: "",
      verified: "all",
    });
  };

  const hasActiveFilters =
    filters.country !== "all" ||
    filters.state !== "all" ||
    filters.city ||
    filters.search ||
    filters.verified !== "all";

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarSolidIcon key={i} className="h-4 w-4 text-amber-400" />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarSolidIcon
            key={i}
            className="h-4 w-4 text-amber-400 opacity-50"
          />,
        );
      } else {
        stars.push(<StarIcon key={i} className="h-4 w-4 text-gray-300 dark:text-gray-600" />);
      }
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find Trusted Jewelers
          </h1>
          <p className="text-xl text-amber-100 max-w-2xl mx-auto mb-8">
            Browse verified gold and silver shops near you. All our sellers are
            verified and rated by real customers.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by shop name, city, or description..."
                className="pl-12 pr-4 h-14 text-lg rounded-xl bg-white text-gray-900 dark:text-white border-0 shadow-lg"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter Toggle & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-amber-500 text-white"
                >
                  Active
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 dark:text-gray-400"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredShops.length}
            </span>{" "}
            verified sellers
          </p>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Country Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 block">
                    Country
                  </label>
                  <Select
                    value={filters.country}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        country: v,
                        state: "all",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {Object.entries(COUNTRIES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <span className="flex items-center gap-2">
                            <FlagImage code={code as FlagCode} size={16} />
                            {info.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 block">
                    State/Province
                  </label>
                  <Select
                    value={filters.state}
                    onValueChange={(v) =>
                      setFilters((prev) => ({ ...prev, state: v }))
                    }
                    disabled={filters.country === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All states" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 block">
                    City
                  </label>
                  <Input
                    placeholder="Filter by city..."
                    value={filters.city}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>

                {/* Verified Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5 block">
                    Verification
                  </label>
                  <Select
                    value={filters.verified}
                    onValueChange={(v) =>
                      setFilters((prev) => ({ ...prev, verified: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sellers</SelectItem>
                      <SelectItem value="verified">Verified Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BuildingStorefrontIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No sellers found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your filters or search terms
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Shop Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => (
              <Card
                key={shop.id}
                className="group hover:shadow-lg transition-shadow overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {shop.shopName}
                        {shop.isVerified && (
                          <CheckBadgeIcon className="h-5 w-5 text-blue-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPinIcon className="h-4 w-4" />
                        {shop.city},{" "}
                        {COUNTRIES[shop.country as keyof typeof COUNTRIES]
                          ?.name || shop.country}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                    >
                      <FlagImage code={shop.country as FlagCode} size={14} />{" "}
                      {shop.country}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {shop.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-600 line-clamp-2">
                      {shop.description}
                    </p>
                  )}

                  {/* Rating */}
                  {shop.averageRating && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {renderStars(shop.averageRating)}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {shop.averageRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({shop.totalRatings} reviews)
                      </span>
                    </div>
                  )}

                  {/* Location Details */}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {shop.state && <span>{shop.state}, </span>}
                    {shop.address}
                  </div>

                  {/* Materials */}
                  <div className="flex flex-wrap gap-1">
                    {shop.supportedMaterials?.slice(0, 3).map((material) => (
                      <Badge
                        key={material}
                        variant="secondary"
                        className="text-xs"
                      >
                        {material?.replace("_", " ") || material}
                      </Badge>
                    ))}
                    {(shop.supportedMaterials?.length || 0) > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(shop.supportedMaterials?.length || 0) - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/shops/${shop.id}`} className="flex-1">
                      <Button className="w-full gold-gradient text-white">
                        View Shop
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMessageShop(shop.id)}
                      disabled={messagingShopId === shop.id}
                    >
                      {messagingShopId === shop.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Location Summary */}
        {!isLoading && filteredShops.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Sellers by Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(shopsByLocation).map(([country, states]) => (
                <Card key={country}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FlagImage code={country as FlagCode} size={18} />
                      {COUNTRIES[country as keyof typeof COUNTRIES]?.name ||
                        country}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {Object.entries(states).map(([state, stateShops]) => (
                        <div
                          key={state}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-600 dark:text-gray-300 dark:text-gray-600">{state}</span>
                          <Badge variant="secondary">
                            {stateShops.length} sellers
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      <DynamicFooter />
    </div>
  );
}
