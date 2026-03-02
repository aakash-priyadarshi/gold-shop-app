"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { intelligenceApi } from "@/lib/api";
import {
  Award,
  CheckCircle,
  Clock,
  Loader2,
  Shield,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TrustProfileData {
  shopId: string;
  shopName: string;
  isVerified: boolean;
  sellerTier: string;
  trustScore: number;
  totalOrders: number;
  completedOrders: number;
  onTimeRate: number;
  avgRating: number | null;
  badges: string[];
  joinedAt: string;
  recentReviews: Array<{
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
}

interface TrustProfileCardProps {
  shopId: string;
  compact?: boolean;
}

const tierConfig: Record<
  string,
  { color: string; label: string; icon: React.ReactNode }
> = {
  ELITE: {
    color: "text-purple-700 bg-purple-50 border-purple-200",
    label: "Elite",
    icon: <Award className="h-4 w-4 text-purple-600" />,
  },
  GOLD: {
    color: "text-yellow-700 bg-yellow-50 border-yellow-200",
    label: "Gold",
    icon: <Star className="h-4 w-4 text-yellow-600" />,
  },
  SILVER: {
    color: "text-gray-600 bg-gray-50 border-gray-200",
    label: "Silver",
    icon: <Shield className="h-4 w-4 text-gray-500" />,
  },
  STANDARD: {
    color: "text-blue-700 bg-blue-50 border-blue-200",
    label: "Standard",
    icon: <Shield className="h-4 w-4 text-blue-500" />,
  },
};

function TrustScoreMeter({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-blue-600";
    if (s >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-blue-500";
    if (s >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            className={getColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${getColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="w-full rounded-full h-1.5 bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${getBgColor(score)} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">Trust Score</p>
    </div>
  );
}

export function TrustProfileCard({
  shopId,
  compact = false,
}: TrustProfileCardProps) {
  const [data, setData] = useState<TrustProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [shopId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await intelligenceApi.getTrustProfile(shopId);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load trust profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gold-600" />
      </div>
    );
  }

  if (!data) return null;

  const tier = tierConfig[data.sellerTier] || tierConfig.STANDARD;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
        <TrustScoreMeter score={data.trustScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {data.shopName}
            </span>
            {data.isVerified && (
              <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-xs ${tier.color}`}>
              {tier.icon}
              <span className="ml-1">{tier.label}</span>
            </Badge>
            {data.avgRating && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {data.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {data.shopName}
              {data.isVerified && (
                <ShieldCheck className="h-4 w-4 text-blue-500" />
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`${tier.color}`}>
                {tier.icon}
                <span className="ml-1">{tier.label} Seller</span>
              </Badge>
              <span className="text-xs text-gray-400">
                Since {new Date(data.joinedAt).getFullYear()}
              </span>
            </CardDescription>
          </div>
          <TrustScoreMeter score={data.trustScore} />
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded bg-gray-50">
            <p className="text-lg font-bold text-gray-800">
              {data.completedOrders}
            </p>
            <p className="text-xs text-gray-500">Orders Done</p>
          </div>
          <div className="text-center p-2 rounded bg-gray-50">
            <p className="text-lg font-bold text-gray-800">
              {data.onTimeRate}%
            </p>
            <p className="text-xs text-gray-500">On-Time</p>
          </div>
          <div className="text-center p-2 rounded bg-gray-50">
            <p className="text-lg font-bold text-gray-800">
              {data.avgRating ? data.avgRating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-gray-500">Avg Rating</p>
          </div>
        </div>

        {/* Badges */}
        {(data.badges?.length ?? 0) > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Achievements</p>
            <div className="flex flex-wrap gap-1.5">
              {(data.badges ?? []).map((badge) => (
                <Badge
                  key={badge}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  {badge === "VERIFIED" && (
                    <ShieldCheck className="h-3 w-3 text-blue-500" />
                  )}
                  {badge === "HIGH_COMPLETION" && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  {badge === "TOP_RATED" && (
                    <Star className="h-3 w-3 text-yellow-500" />
                  )}
                  {badge === "FAST_RESPONDER" && (
                    <Clock className="h-3 w-3 text-purple-500" />
                  )}
                  {badge === "TRENDING" && (
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                  )}
                  {badge.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {data.recentReviews.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Recent Reviews</p>
            <div className="space-y-2">
              {data.recentReviews.slice(0, 3).map((review, idx) => (
                <div key={idx} className="p-2 rounded bg-gray-50 text-sm">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
