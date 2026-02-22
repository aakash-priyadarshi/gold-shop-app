"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PLATING_TIERS,
  PLATING_TYPES,
  type PlatingTier,
  type PlatingType,
} from "@/lib/pricing/constants";
import {
  AlertTriangle,
  Clock,
  Droplet,
  HelpCircle,
  Info,
  Shield,
  User,
} from "lucide-react";

interface PlatingSelectorProps {
  platingType: string;
  platingTier: string;
  onPlatingTypeChange: (type: PlatingType) => void;
  onPlatingTierChange: (tier: PlatingTier) => void;
  disabled?: boolean;
  baseMetalType?: string;
  showVermeilWarning?: boolean;
}

export function PlatingSelector({
  platingType,
  platingTier,
  onPlatingTypeChange,
  onPlatingTierChange,
  disabled = false,
  baseMetalType,
  showVermeilWarning = false,
}: PlatingSelectorProps) {
  const selectedPlatingInfo = PLATING_TYPES.find(
    (p) => p.value === platingType,
  );
  const selectedTierInfo = PLATING_TIERS.find((t) => t.value === platingTier);

  // Check if vermeil is selected but base metal is not sterling silver
  const isVermeilInvalid =
    platingType === "VERMEIL" &&
    baseMetalType &&
    !baseMetalType.includes("SILVER_925");

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Plating Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Plating Type</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p className="text-xs">
                  Plating adds a thin layer of precious metal over the base
                  metal. Different types have different appearances, durability,
                  and costs.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PLATING_TYPES.map((type) => (
              <Popover key={type.value}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onPlatingTypeChange(type.value as PlatingType)
                    }
                    className={`
                      relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all
                      ${
                        platingType === type.value
                          ? "border-gold-500 bg-gold-50 ring-1 ring-gold-200"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{type.label}</span>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {platingType === type.value && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        Selected
                      </Badge>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" side="right" align="start">
                  <PlatingTooltipContent tooltip={type.tooltip} />
                </PopoverContent>
              </Popover>
            ))}
          </div>

          {/* Vermeil Warning */}
          {isVermeilInvalid && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">
                  Vermeil requires Sterling Silver
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  True vermeil must be gold plating over 925 sterling silver.
                  Please select &quot;Sterling Silver&quot; as the base metal or
                  choose a different plating type.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Plating Tier */}
        {platingType && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Plating Thickness</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">
                    Thicker plating lasts longer but costs more. Premium is best
                    for daily wear items.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PLATING_TIERS.map((tier) => (
                <Tooltip key={tier.value}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onPlatingTierChange(tier.value as PlatingTier)
                      }
                      className={`
                        relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all
                        ${
                          platingTier === tier.value
                            ? "border-gold-500 bg-gold-50 ring-1 ring-gold-200"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      <span className="font-medium text-sm">{tier.label}</span>
                      {tier.priceMultiplier !== 1.0 && (
                        <span
                          className={`text-xs mt-1 ${tier.priceMultiplier > 1 ? "text-amber-600" : "text-green-600"}`}
                        >
                          {tier.priceMultiplier > 1
                            ? `+${((tier.priceMultiplier - 1) * 100).toFixed(0)}%`
                            : `${((tier.priceMultiplier - 1) * 100).toFixed(0)}%`}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p className="text-xs">{tier.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Summary Card */}
        {selectedPlatingInfo && selectedTierInfo && (
          <div className="bg-gray-50 border rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-gold-500" />
              <span className="font-medium">Your Selection</span>
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedPlatingInfo.label}
              </span>{" "}
              with{" "}
              <span className="font-medium text-foreground">
                {selectedTierInfo.label}
              </span>{" "}
              thickness
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPlatingInfo.tooltip.durability}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Tooltip content component for plating types
interface PlatingTooltipContentProps {
  tooltip: {
    what: string;
    durability: string;
    care: string;
    who: string;
    allergy: string;
  };
}

function PlatingTooltipContent({ tooltip }: PlatingTooltipContentProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">What is it?</p>
          <p className="text-xs text-muted-foreground">{tooltip.what}</p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Durability</p>
          <p className="text-xs text-muted-foreground">{tooltip.durability}</p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <Droplet className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Care Instructions</p>
          <p className="text-xs text-muted-foreground">{tooltip.care}</p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <User className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Best For</p>
          <p className="text-xs text-muted-foreground">{tooltip.who}</p>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Allergy Note</p>
          <p className="text-xs text-muted-foreground">{tooltip.allergy}</p>
        </div>
      </div>
    </div>
  );
}

export default PlatingSelector;
