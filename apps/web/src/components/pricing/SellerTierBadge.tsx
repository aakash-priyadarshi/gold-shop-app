"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Crown, Shield, Star } from "lucide-react";

type SellerTier = "STANDARD" | "SILVER" | "GOLD" | "ELITE";

const TIER_CONFIG: Record<
  SellerTier,
  {
    label: string;
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
    borderColor: string;
    description: string;
  }
> = {
  STANDARD: {
    label: "Standard",
    icon: Shield,
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
    borderColor: "border-gray-300",
    description: "Standard seller",
  },
  SILVER: {
    label: "Silver",
    icon: Star,
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
    borderColor: "border-slate-400",
    description: "Silver tier — proven track record with consistent quality",
  },
  GOLD: {
    label: "Gold",
    icon: Award,
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-400",
    description:
      "Gold tier — top performer with excellent ratings and reliability",
  },
  ELITE: {
    label: "Elite",
    icon: Crown,
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-400",
    description:
      "Elite seller — best-in-class performance, premium craftsmanship",
  },
};

interface SellerTierBadgeProps {
  tier: SellerTier;
  compact?: boolean;
}

export function SellerTierBadge({
  tier,
  compact = false,
}: SellerTierBadgeProps) {
  // Don't show badge for STANDARD tier
  if (tier === "STANDARD") return null;

  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{config.description}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {config.label} Seller
        </span>
      </TooltipTrigger>
      <TooltipContent>{config.description}</TooltipContent>
    </Tooltip>
  );
}
