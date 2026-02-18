"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PLATING_OPTIONS,
  PLATING_TIERS,
  calculateBaseMetalCost,
  calculatePlatingCost,
  getAvailableBaseMetals,
  getBaseMetal,
  getPlatingOption,
  getPlatingTier,
  type BaseMetalType,
  type PlatingTierC,
  type PlatingTypeC,
} from "@/lib/pricing/base-metal-constants";
import {
  AlertTriangle,
  HelpCircle,
  Info,
  Layers,
  Shield,
  Sparkles,
} from "lucide-react";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface MethodCConfig {
  baseMetal: BaseMetalType;
  platingType: PlatingTypeC;
  platingTier: PlatingTierC;
}

interface MethodCSelectorProps {
  value: MethodCConfig;
  onChange: (config: MethodCConfig) => void;
  nickelAllowed?: boolean;
  jewelleryType?: string;
  weightGrams?: number;
  currencySymbol?: string;
  selectedCurrency?: string; // Currency code (NPR, INR, USD, etc.)
  exchangeRate?: number; // USD to selected currency rate
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export function MethodCSelector({
  value,
  onChange,
  nickelAllowed = false,
  jewelleryType = "RING",
  weightGrams = 0,
  currencySymbol = "₹",
  selectedCurrency = "NPR",
  exchangeRate = 144, // Default USD_NPR rate
}: MethodCSelectorProps) {
  const availableMetals = getAvailableBaseMetals(nickelAllowed);
  const selectedMetal = getBaseMetal(value.baseMetal);
  const selectedPlating = value.platingType
    ? getPlatingOption(value.platingType)
    : null;
  const selectedTier = getPlatingTier(value.platingTier);

  // Calculate NPR to selected currency conversion rate
  // Base metal and plating rates are in NPR
  // To convert NPR to selected currency: NPR × (USD_SelectedCurrency / USD_NPR)
  // For NPR itself: rate = 1
  // For INR: rate = 90/144 ≈ 0.625
  // For USD: rate = 1/144 ≈ 0.0069
  const nprToSelectedRate = selectedCurrency === "NPR" ? 1 : exchangeRate / 144;

  // Calculate costs (convert from NPR to selected currency)
  const baseMetalCostNpr =
    value.baseMetal && weightGrams > 0
      ? calculateBaseMetalCost(value.baseMetal, weightGrams)
      : 0;
  const baseMetalCost = baseMetalCostNpr * nprToSelectedRate;

  const platingCostNpr =
    value.platingType &&
    value.platingType !== "NONE" &&
    value.platingTier &&
    weightGrams > 0
      ? calculatePlatingCost(
          value.platingType,
          value.platingTier,
          jewelleryType,
          weightGrams,
        )
      : 0;
  // Convert plating cost from NPR to selected currency
  const platingCost = platingCostNpr * nprToSelectedRate;

  const totalCost = baseMetalCost + platingCost;

  // Check if plating is selected - now optional with 'NONE' option
  const hasPlatingSelected = value.platingType !== undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Layers className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Base Metal + Plating (Method C)</h3>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="text-xs">
                Method C uses affordable base metals with a precious metal
                plating. This gives the look of gold/silver at a fraction of the
                cost.
                <br />
                <br />
                <strong>Note:</strong> Plating wears over time and may need
                re-application.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Plating pricing disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <strong>Plating cost is a service charge</strong>, not gold weight.
          </p>
          <p className="mt-1 text-blue-700">
            Prices reflect coating thickness, durability, and process quality —
            not precious metal by the gram.
          </p>
        </div>

        {/* Step 1: Base Metal */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1">
            Step 1: Base Metal
            <span className="text-red-500">*</span>
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableMetals.map((metal) => (
              <Tooltip key={metal.value}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={
                      value.baseMetal === metal.value ? "default" : "outline"
                    }
                    className={`h-auto py-3 justify-start ${
                      value.baseMetal === metal.value
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : ""
                    }`}
                    onClick={() =>
                      onChange({ ...value, baseMetal: metal.value })
                    }
                  >
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{metal.label}</span>
                        {metal.allergyRisk === "NONE" && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1"
                          >
                            <Shield className="h-2 w-2 mr-0.5" />
                            Hypoallergenic
                          </Badge>
                        )}
                        {metal.allergyRisk === "HIGH" && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] py-0 px-1"
                          >
                            ⚠️ Allergy
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs opacity-80 mt-0.5">
                        {metal.description}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {currencySymbol}{" "}
                        {(metal.ratePerGramNpr * nprToSelectedRate).toFixed(2)}
                        /g
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>What it is:</strong> {metal.tooltip.what}
                    </p>
                    <p>
                      <strong>Durability:</strong> {metal.tooltip.durability}
                    </p>
                    <p>
                      <strong>Allergy Info:</strong> {metal.tooltip.allergyRisk}
                    </p>
                    <p>
                      <strong>Best for:</strong> {metal.tooltip.bestFor}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Step 2: Plating Type (Optional) */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1">
            Step 2: Plating Type
            <Badge variant="outline" className="text-[10px] ml-1">
              Optional
            </Badge>
          </Label>

          {!value.baseMetal && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Select a base metal first
            </div>
          )}

          {value.baseMetal && (
            <>
              <Select
                value={value.platingType || ""}
                onValueChange={(v) =>
                  onChange({ ...value, platingType: v as PlatingTypeC })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plating type..." />
                </SelectTrigger>
                <SelectContent>
                  {/* No Plating Option */}
                  <SelectItem value="NONE">
                    <div className="flex items-center justify-between w-full gap-4">
                      <div>
                        <span className="font-medium">No Plating</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (raw base metal finish)
                        </span>
                      </div>
                      <span className="text-xs text-green-600 font-medium">
                        {currencySymbol}0
                      </span>
                    </div>
                  </SelectItem>
                  {PLATING_OPTIONS.map((plating) => (
                    <SelectItem key={plating.value} value={plating.value}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div>
                          <span className="font-medium">{plating.label}</span>
                          {plating.goldContent && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({plating.goldContent})
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-green-600 font-medium">
                          {currencySymbol}
                          {Math.round(
                            plating.baseRateNpr * nprToSelectedRate,
                          ).toLocaleString()}
                          +
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* No Plating Warning */}
              {value.platingType === "NONE" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div>
                    <strong>No plating selected.</strong>
                    <p className="text-xs mt-1">
                      Base metal without plating may tarnish and develop patina
                      over time. Consider adding plating for longer-lasting
                      appearance.
                    </p>
                  </div>
                </div>
              )}

              {/* Selected plating details */}
              {selectedPlating && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-amber-800">
                      {selectedPlating.label}
                    </span>
                    {selectedPlating.minimumThickness && (
                      <Badge variant="outline" className="text-xs">
                        {selectedPlating.minimumThickness}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-amber-700 font-medium">
                        What it is:
                      </span>
                      <p className="text-amber-900">
                        {selectedPlating.tooltip.what}
                      </p>
                    </div>
                    <div>
                      <span className="text-amber-700 font-medium">
                        Durability:
                      </span>
                      <p className="text-amber-900">
                        {selectedPlating.tooltip.durability}
                      </p>
                    </div>
                    <div>
                      <span className="text-amber-700 font-medium">Care:</span>
                      <p className="text-amber-900">
                        {selectedPlating.tooltip.care}
                      </p>
                    </div>
                    <div>
                      <span className="text-amber-700 font-medium">
                        Re-plating:
                      </span>
                      <p className="text-amber-900">
                        {selectedPlating.tooltip.replatFrequency}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200">
                    <p className="text-xs text-amber-700 italic">
                      ⚠️ {selectedPlating.tooltip.disclaimer}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step 3: Plating Tier */}
        {value.platingType && (
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1">
              Step 3: Plating Thickness
              <span className="text-red-500">*</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PLATING_TIERS.map((tier) => (
                <Tooltip key={tier.value}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={
                        value.platingTier === tier.value ? "default" : "outline"
                      }
                      className={`h-auto py-3 ${
                        value.platingTier === tier.value
                          ? tier.value === "ECONOMY"
                            ? "bg-gray-500 hover:bg-gray-600"
                            : tier.value === "STANDARD"
                              ? "bg-blue-500 hover:bg-blue-600"
                              : "bg-amber-500 hover:bg-amber-600"
                          : ""
                      } ${value.platingTier === tier.value ? "text-white" : ""}`}
                      onClick={() =>
                        onChange({ ...value, platingTier: tier.value })
                      }
                    >
                      <div className="text-center">
                        <div className="font-medium">{tier.label}</div>
                        <div className="text-xs opacity-80">
                          {tier.thicknessDescription}
                        </div>
                        <div className="text-xs mt-1">
                          {tier.multiplier === 1
                            ? "Standard price"
                            : tier.multiplier < 1
                              ? `${((1 - tier.multiplier) * 100).toFixed(0)}% less`
                              : `+${((tier.multiplier - 1) * 100).toFixed(0)}%`}
                        </div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">{tier.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Cost Summary */}
        {weightGrams > 0 && value.baseMetal && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-800">Cost Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">
                Base metal ({weightGrams}g):
              </div>
              <div className="text-right font-medium">
                {currencySymbol}{" "}
                {baseMetalCost.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              {value.platingType &&
                value.platingType !== "NONE" &&
                selectedPlating && (
                  <>
                    <div className="text-muted-foreground">
                      {selectedPlating.label} (
                      {selectedTier?.label || "Standard"}):
                    </div>
                    <div className="text-right font-medium text-amber-600">
                      {currencySymbol}{" "}
                      {platingCost.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </>
                )}
              {value.platingType === "NONE" && (
                <>
                  <div className="text-muted-foreground">No Plating:</div>
                  <div className="text-right font-medium text-green-600">
                    {currencySymbol} 0
                  </div>
                </>
              )}
              <div className="text-blue-800 font-medium border-t pt-1">
                Total materials:
              </div>
              <div className="text-right font-bold text-blue-900 border-t pt-1">
                {currencySymbol}{" "}
                {totalCost.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic pt-2 border-t">
              Note: This is significantly less than solid precious metal. Making
              charges will be calculated on total.
            </p>
          </div>
        )}

        {/* Allergy Warning */}
        {selectedMetal?.allergyRisk === "HIGH" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Allergy Warning:</strong> {selectedMetal.label} may cause
              allergic reactions in some individuals. Consider 316L Stainless
              Steel or Titanium for sensitive skin.
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default MethodCSelector;
