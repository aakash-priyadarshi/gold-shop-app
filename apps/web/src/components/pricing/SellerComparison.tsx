"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getApiUrl } from "@/lib/api";
import { COUNTRIES, type CountryCode } from "@/store/preferences";
import {
  Check,
  Clock,
  HelpCircle,
  Loader2,
  MapPin,
  Shield,
  Star,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = getApiUrl();

export interface SellerEstimate {
  shop: {
    id: string;
    shopName: string;
    city: string;
    country: string;
    isVerified: boolean;
    rating?: number;
    reviewCount?: number;
    makingChargePercent: number;
  };
  pricing: {
    metalCost: number;
    makingCharge: number;
    finishCost: number;
    gemstoneCost: number;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  breakdown: {
    category: string;
    description: string;
    amount: number;
    source: "SHOP" | "SYSTEM";
  }[];
  deliveryEstimate: {
    minDays: number;
    maxDays: number;
  };
  priceComparison: {
    vsSystemPrice: number; // Percentage difference from system price
    rank: number; // 1 = cheapest
  };
}

interface SellerComparisonProps {
  country: CountryCode;
  currency: string;
  formData: {
    jewelleryType: string;
    buildMethod: string;
    metalType: string;
    weightGrams: number;
    platingType?: string;
    platingTier?: string;
    surfaceFinish?: string;
    gemstones?: Array<{
      stoneType: string;
      shape: string;
      sizeValue: number;
      sizeUnit: string;
      count: number;
    }>;
  };
  systemEstimate: {
    total: number;
    breakdown: {
      metalCost: number;
      makingCharge: number;
      finishCost: number;
      gemstoneCost: number;
      tax: number;
    };
  };
  onSelectSeller?: (seller: SellerEstimate) => void;
}

export function SellerComparison({
  country,
  currency,
  formData,
  systemEstimate,
  onSelectSeller,
}: SellerComparisonProps) {
  const [sellers, setSellers] = useState<SellerEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  const countryInfo = COUNTRIES[country] || COUNTRIES.US;

  useEffect(() => {
    const fetchSellerPrices = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/pricing/seller-comparison`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country,
            currency,
            ...formData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch seller prices");
        }

        const data = await response.json();
        setSellers(data.sellers || []);
      } catch (err) {
        console.error("Error fetching seller comparison:", err);
        setError("Unable to load seller prices. Please try again.");
        // Use mock data for demo
        setSellers(getMockSellers(country, systemEstimate, currency));
      } finally {
        setLoading(false);
      }
    };

    if (formData.jewelleryType && formData.metalType && formData.weightGrams) {
      fetchSellerPrices();
    }
  }, [country, currency, formData, systemEstimate]);

  const handleSelectSeller = (seller: SellerEstimate) => {
    setSelectedSellerId(seller.shop.id);
    onSelectSeller?.(seller);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            <p className="text-sm text-muted-foreground">
              Finding jewellers in {countryInfo?.name || country}...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && sellers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-gold-500" />
                Available Jewellers
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {sellers.length} jeweller{sellers.length !== 1 ? "s" : ""} in{" "}
                {countryInfo?.flag} {countryInfo?.name}
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p className="text-xs">
                  Prices vary by seller based on their material rates, making
                  charges, and overhead costs. System price is our estimated
                  baseline.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System baseline */}
          <div className="p-3 bg-gray-50 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Baseline
                </Badge>
                <span className="text-sm font-medium">System Estimate</span>
              </div>
              <span className="font-semibold">
                {getCurrencySymbol(currency)}{" "}
                {systemEstimate.total.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reference price based on market rates
            </p>
          </div>

          {/* Seller cards */}
          <div className="space-y-3">
            {sellers.map((seller, index) => (
              <SellerCard
                key={seller.shop.id}
                seller={seller}
                currency={currency}
                systemTotal={systemEstimate.total}
                isSelected={selectedSellerId === seller.shop.id}
                onSelect={() => handleSelectSeller(seller)}
                rank={index + 1}
              />
            ))}
          </div>

          {sellers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>
                No jewellers available in this region for your requirements.
              </p>
              <p className="text-xs mt-1">
                Try adjusting your specifications or selecting a different
                country.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface SellerCardProps {
  seller: SellerEstimate;
  currency: string;
  systemTotal: number;
  isSelected: boolean;
  onSelect: () => void;
  rank: number;
}

function SellerCard({
  seller,
  currency,
  systemTotal,
  isSelected,
  onSelect,
  rank,
}: SellerCardProps) {
  const priceDiff = ((seller.pricing.total - systemTotal) / systemTotal) * 100;
  const isLower = priceDiff < 0;
  const symbol = getCurrencySymbol(currency);

  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all cursor-pointer
        ${
          isSelected
            ? "border-gold-500 bg-gold-50 ring-1 ring-gold-200"
            : "border-gray-200 hover:border-gray-300 bg-white"
        }
      `}
      onClick={onSelect}
    >
      {/* Rank badge */}
      {rank <= 3 && (
        <div
          className={`
          absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
          ${rank === 1 ? "bg-gold-500 text-white" : rank === 2 ? "bg-gray-300 text-gray-700" : "bg-amber-600 text-white"}
        `}
        >
          {rank}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {/* Shop info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{seller.shop.shopName}</h4>
            {seller.shop.isVerified && (
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="h-4 w-4 text-blue-500" />
                </TooltipTrigger>
                <TooltipContent>Verified Seller</TooltipContent>
              </Tooltip>
            )}
            {rank === 1 && (
              <Badge className="bg-green-100 text-green-700 text-[10px]">
                Best Price
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {seller.shop.city}
            </span>
            {seller.shop.rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {seller.shop.rating.toFixed(1)}
                {seller.shop.reviewCount && (
                  <span className="text-muted-foreground">
                    ({seller.shop.reviewCount})
                  </span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {seller.deliveryEstimate.minDays}-
              {seller.deliveryEstimate.maxDays} days
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="text-lg font-bold">
            {symbol} {seller.pricing.total.toLocaleString()}
          </div>
          <div
            className={`flex items-center gap-1 text-xs ${isLower ? "text-green-600" : "text-red-500"}`}
          >
            {isLower ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {Math.abs(priceDiff).toFixed(1)}% {isLower ? "lower" : "higher"}
          </div>
        </div>
      </div>

      {/* Price breakdown tooltip trigger */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>
                Metal: {symbol}
                {seller.pricing.metalCost.toLocaleString()}
              </span>
              <span>
                Making: {symbol}
                {seller.pricing.makingCharge.toLocaleString()}
              </span>
              {seller.pricing.gemstoneCost > 0 && (
                <span>
                  Gems: {symbol}
                  {seller.pricing.gemstoneCost.toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-gold-600 underline cursor-help">
              View breakdown
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[350px]">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Price Breakdown</p>
            <div className="text-xs space-y-1">
              {seller.breakdown.map((item, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="flex items-center gap-1">
                    {item.description}
                    {item.source === "SHOP" && (
                      <Badge variant="outline" className="text-[8px] px-1">
                        Shop Rate
                      </Badge>
                    )}
                  </span>
                  <span>
                    {symbol}
                    {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>
                {symbol}
                {seller.pricing.total.toLocaleString()}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="h-6 w-6 rounded-full bg-gold-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get currency symbol
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    NPR: "रु",
    INR: "₹",
    AED: "د.إ",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };
  return symbols[currency] || currency;
}

// Mock data for demo purposes
function getMockSellers(
  country: CountryCode,
  systemEstimate: { total: number; breakdown: any },
  currency: string,
): SellerEstimate[] {
  const mockShops = {
    NP: [
      {
        name: "Ramesh Gold House",
        city: "Kathmandu",
        rating: 4.8,
        reviews: 156,
        making: 12,
      },
      {
        name: "Suna Jewellers",
        city: "Kathmandu",
        rating: 4.6,
        reviews: 89,
        making: 10,
      },
      {
        name: "Nepal Gold Palace",
        city: "Pokhara",
        rating: 4.5,
        reviews: 45,
        making: 11,
      },
    ],
    IN: [
      {
        name: "Tanishq",
        city: "Mumbai",
        rating: 4.9,
        reviews: 2340,
        making: 14,
      },
      {
        name: "Kalyan Jewellers",
        city: "Delhi",
        rating: 4.7,
        reviews: 1890,
        making: 12,
      },
      {
        name: "Malabar Gold",
        city: "Chennai",
        rating: 4.6,
        reviews: 1560,
        making: 13,
      },
    ],
    AE: [
      {
        name: "Damas Jewellery",
        city: "Dubai",
        rating: 4.8,
        reviews: 890,
        making: 8,
      },
      {
        name: "Joyalukkas",
        city: "Abu Dhabi",
        rating: 4.7,
        reviews: 670,
        making: 9,
      },
    ],
    UK: [
      {
        name: "Hatton Garden Jewellers",
        city: "London",
        rating: 4.8,
        reviews: 456,
        making: 15,
      },
    ],
    EU: [
      {
        name: "Cartier",
        city: "Paris",
        rating: 4.9,
        reviews: 1230,
        making: 20,
      },
    ],
    US: [
      {
        name: "Tiffany & Co",
        city: "New York",
        rating: 4.9,
        reviews: 3450,
        making: 18,
      },
      {
        name: "Blue Nile",
        city: "Seattle",
        rating: 4.7,
        reviews: 2100,
        making: 12,
      },
    ],
  };

  const shops = mockShops[country] || mockShops.NP;

  return shops
    .map((shop, index) => {
      // Vary prices slightly from system estimate
      const priceVariance = Math.random() * 0.3 - 0.15; // -15% to +15%
      const total = Math.round(systemEstimate.total * (1 + priceVariance));
      const metalCost = Math.round(
        systemEstimate.breakdown.metalCost * (1 + priceVariance * 0.5),
      );
      const makingCharge = Math.round(total * (shop.making / 100));

      return {
        shop: {
          id: `shop-${index + 1}`,
          shopName: shop.name,
          city: shop.city,
          country,
          isVerified: true,
          rating: shop.rating,
          reviewCount: shop.reviews,
          makingChargePercent: shop.making,
        },
        pricing: {
          metalCost,
          makingCharge,
          finishCost: systemEstimate.breakdown.finishCost || 0,
          gemstoneCost: systemEstimate.breakdown.gemstoneCost || 0,
          subtotal: total - systemEstimate.breakdown.tax,
          tax: systemEstimate.breakdown.tax,
          total,
          currency,
        },
        breakdown: [
          {
            category: "METAL",
            description: "Metal Cost",
            amount: metalCost,
            source: "SHOP" as const,
          },
          {
            category: "MAKING",
            description: `Making Charge (${shop.making}%)`,
            amount: makingCharge,
            source: "SHOP" as const,
          },
          {
            category: "TAX",
            description: "Tax",
            amount: systemEstimate.breakdown.tax,
            source: "SYSTEM" as const,
          },
        ],
        deliveryEstimate: {
          minDays: 7 + index * 2,
          maxDays: 14 + index * 3,
        },
        priceComparison: {
          vsSystemPrice: priceVariance * 100,
          rank: index + 1,
        },
      };
    })
    .sort((a, b) => a.pricing.total - b.pricing.total);
}

export default SellerComparison;
