"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { intelligenceApi } from "@/lib/api";
import {
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  Medal,
  Shield,
  Star,
  TrendingDown,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OfferData {
  id: string;
  shop: {
    id: string;
    name: string;
    city: string;
    isVerified: boolean;
    tier: string;
    profileImage: string | null;
    badges: string[];
    rating: number;
    totalOrders: number;
    onTimeRate: number;
    responseTime: number;
  };
  pricing: {
    metalCost: number;
    makingCharge: number;
    makingChargePct: number;
    finishCost: number;
    gemstoneCost: number;
    tax: number;
    total: number;
    bookingFee: number;
    bookingFeePct: number;
  };
  delivery: {
    estimatedDays: number;
    weight: number | null;
    goldWeight: number | null;
  };
  notes: string | null;
  status: string;
  createdAt: string;
}

interface ComparisonData {
  rfqId: string;
  jewelleryType: string;
  buildMethod: string;
  budget: { min: number | null; max: number | null };
  totalOffers: number;
  offers: OfferData[];
  highlights: {
    lowestPrice: string | null;
    fastestDelivery: string | null;
    highestRated: string | null;
    lowestMakingCharge: string | null;
  };
}

interface OfferComparisonProps {
  rfqId: string;
  onSelectOffer?: (offerId: string) => void;
}

export function OfferComparison({
  rfqId,
  onSelectOffer,
}: OfferComparisonProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparison();
  }, [rfqId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const res = await intelligenceApi.compareOffers(rfqId);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load comparison:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gold-600" />
      </div>
    );
  }

  if (!data || !data.offers || data.offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-400">
          No offers to compare yet
        </CardContent>
      </Card>
    );
  }

  const formatNpr = (n: number) => `NPR ${Math.round(n).toLocaleString()}`;

  const tierIcons: Record<string, React.ReactNode> = {
    STANDARD: <Medal className="h-3 w-3" />,
    SILVER: <Medal className="h-3 w-3 text-gray-400" />,
    GOLD: <Crown className="h-3 w-3 text-yellow-500" />,
    ELITE: <Trophy className="h-3 w-3 text-purple-500" />,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            Compare {data.totalOffers} Offers
          </h3>
          <p className="text-sm text-gray-500">
            {data.jewelleryType} &bull;{" "}
            {data.buildMethod.replace("METHOD_", "Method ")}
            {data.budget.min && data.budget.max && (
              <span>
                {" "}
                &bull; Budget: {formatNpr(data.budget.min)} –{" "}
                {formatNpr(data.budget.max)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Highlight Badges */}
      <div className="flex flex-wrap gap-2">
        {data.highlights.lowestPrice && (
          <Badge
            variant="outline"
            className="gap-1 text-green-700 border-green-300"
          >
            <TrendingDown className="h-3 w-3" />
            Best Price
          </Badge>
        )}
        {data.highlights.fastestDelivery && (
          <Badge
            variant="outline"
            className="gap-1 text-blue-700 border-blue-300"
          >
            <Zap className="h-3 w-3" />
            Fastest
          </Badge>
        )}
        {data.highlights.highestRated && (
          <Badge
            variant="outline"
            className="gap-1 text-yellow-700 border-yellow-300"
          >
            <Star className="h-3 w-3" />
            Top Rated
          </Badge>
        )}
      </div>

      {/* Offer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.offers.map((offer) => {
          const isLowest = offer.id === data.highlights.lowestPrice;
          const isFastest = offer.id === data.highlights.fastestDelivery;
          const isTopRated = offer.id === data.highlights.highestRated;

          return (
            <Card
              key={offer.id}
              className={`relative ${
                isLowest ? "border-green-300 ring-1 ring-green-200" : ""
              }`}
            >
              {/* Highlight tags */}
              {(isLowest || isFastest || isTopRated) && (
                <div className="absolute -top-2 right-3 flex gap-1">
                  {isLowest && (
                    <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                      Best Price
                    </Badge>
                  )}
                  {isFastest && (
                    <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">
                      Fastest
                    </Badge>
                  )}
                  {isTopRated && (
                    <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0">
                      Top Rated
                    </Badge>
                  )}
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {/* Shop avatar */}
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {offer.shop.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate flex items-center gap-1">
                      {offer.shop.name}
                      {offer.shop.isVerified && (
                        <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1">
                      {offer.shop.city}
                      {tierIcons[offer.shop.tier] && (
                        <>
                          {" "}
                          &bull; {tierIcons[offer.shop.tier]} {offer.shop.tier}
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Trust indicators */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {offer.shop.rating > 0
                      ? offer.shop.rating.toFixed(1)
                      : "New"}
                  </span>
                  <span>{offer.shop.totalOrders} orders</span>
                  {offer.shop.onTimeRate > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {offer.shop.onTimeRate.toFixed(0)}% on-time
                    </span>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Metal</span>
                    <span>{formatNpr(offer.pricing.metalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Making ({offer.pricing.makingChargePct}%)
                    </span>
                    <span>{formatNpr(offer.pricing.makingCharge)}</span>
                  </div>
                  {offer.pricing.finishCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Finish</span>
                      <span>{formatNpr(offer.pricing.finishCost)}</span>
                    </div>
                  )}
                  {offer.pricing.gemstoneCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gemstones</span>
                      <span>{formatNpr(offer.pricing.gemstoneCost)}</span>
                    </div>
                  )}
                  {offer.pricing.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax</span>
                      <span>{formatNpr(offer.pricing.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1.5">
                    <span>Total</span>
                    <span className="text-green-700">
                      {formatNpr(offer.pricing.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Booking fee ({offer.pricing.bookingFeePct}%)</span>
                    <span>{formatNpr(offer.pricing.bookingFee)}</span>
                  </div>
                </div>

                {/* Delivery */}
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    Delivery
                  </span>
                  <span className="font-medium">
                    {offer.delivery.estimatedDays} days
                  </span>
                </div>

                {/* Weight */}
                {offer.delivery.weight && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Weight</span>
                    <span>
                      {offer.delivery.weight}g
                      {offer.delivery.goldWeight && (
                        <span className="text-gray-400">
                          {" "}
                          ({offer.delivery.goldWeight}g gold)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {offer.notes && (
                  <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                    {offer.notes}
                  </p>
                )}

                {/* Select Button */}
                {onSelectOffer && (
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    onClick={() => onSelectOffer(offer.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Select This Offer
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
