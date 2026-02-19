"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getGemstonePriceBreakdown } from "@/lib/pricing/calculate-estimate";
import {
  DEFAULT_GEM_COLORS,
  DIAMOND_CUT,
  GEMSTONE_SHAPES,
  GEMSTONE_TYPES,
  SETTING_STYLES,
  SIZE_PRESETS_CARAT,
  SIZE_PRESETS_MM,
  getClarityOptionsForStone,
  getColorOptionsForStone,
  getDefaultSizeUnit,
  hasOriginOption,
  needsClarityGrading,
  needsCutGrading,
  type GemstoneOrigin,
  type SizeUnit,
} from "@/lib/pricing/constants";
import {
  ALL_GEMSTONE_PRESETS,
  POPULAR_PRESETS,
  getGemstonePreset,
  type GemstonePreset,
} from "@/lib/pricing/gemstone-presets";
import { Gem, HelpCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface GemstoneEntry {
  id: string;
  presetId?: string;
  stoneType: string;
  origin?: GemstoneOrigin;
  shape: string;
  sizeUnit: SizeUnit;
  sizeValue: string;
  color: string;
  clarity?: string;
  cut?: string;
  settingStyle: string;
  count: number;
  estimatedPrice?: number;
}

interface GemstoneEditorV2Props {
  gemstones: GemstoneEntry[];
  onChange: (gemstones: GemstoneEntry[]) => void;
  currencySymbol?: string;
  selectedCurrency?: string;
  exchangeRate?: number; // USD to selected currency rate
}

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

const createNewGemstone = (): GemstoneEntry => ({
  id: `gem-${Date.now()}`,
  stoneType: "",
  shape: "",
  sizeUnit: "MM",
  sizeValue: "",
  color: "",
  settingStyle: "",
  count: 1,
});

/**
 * Apply preset values to gemstone entry
 */
const applyPreset = (preset: GemstonePreset): Partial<GemstoneEntry> => ({
  presetId: preset.id,
  stoneType: preset.stoneType,
  origin: preset.origin,
  shape: preset.shape,
  sizeUnit: preset.sizeUnit,
  sizeValue: preset.sizeValue,
  color: preset.color,
  clarity: preset.clarity,
  cut: preset.cut,
  settingStyle: preset.settingStyle,
  estimatedPrice: preset.estimatedPriceNpr,
});

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export function GemstoneEditorV2({
  gemstones,
  onChange,
  currencySymbol = "₹",
  selectedCurrency = "NPR",
  exchangeRate = 144, // Default USD to NPR rate
}: GemstoneEditorV2Props) {
  // Calculate NPR to selected currency conversion rate
  // Gemstone preset prices are stored in NPR
  // To convert NPR to selected currency: NPR × (USD_SelectedCurrency / USD_NPR)
  // For NPR itself: rate = 1
  // For INR: rate = 90/144 ≈ 0.625
  // For USD: rate = 1/144 ≈ 0.0069
  const nprToSelectedRate = selectedCurrency === "NPR" ? 1 : exchangeRate / 144;

  const addGemstone = () => {
    onChange([...gemstones, createNewGemstone()]);
  };

  const updateGemstone = useCallback(
    (index: number, updates: Partial<GemstoneEntry>) => {
      const updated = [...gemstones];
      updated[index] = { ...updated[index], ...updates };
      onChange(updated);
    },
    [gemstones, onChange],
  );

  const updateGemstoneField = (
    index: number,
    field: keyof GemstoneEntry,
    value: string | number,
  ) => {
    const updated = [...gemstones];
    const gem = { ...updated[index], [field]: value };

    // Clear preset when manually changing fields
    if (field !== "presetId" && field !== "count" && gem.presetId) {
      gem.presetId = undefined;
    }

    // Auto-update size unit when stone type changes
    if (field === "stoneType" && typeof value === "string") {
      gem.sizeUnit = getDefaultSizeUnit(value);
      gem.sizeValue = "";
      gem.color = "";
      gem.clarity = undefined;
      gem.cut = undefined;

      if (value === "DIAMOND_LAB") {
        gem.origin = "LAB";
      } else if (value === "DIAMOND_NATURAL") {
        gem.origin = "NATURAL";
      } else {
        gem.origin = undefined;
      }
    }

    updated[index] = gem;
    onChange(updated);
  };

  const handlePresetSelect = (index: number, presetId: string) => {
    if (presetId === "custom") {
      // Clear preset and keep current values
      updateGemstoneField(index, "presetId", "");
      return;
    }

    const preset = getGemstonePreset(presetId);
    if (preset) {
      const presetValues = applyPreset(preset);
      updateGemstone(index, presetValues);
    }
  };

  const removeGemstone = (index: number) => {
    onChange(gemstones.filter((_, i) => i !== index));
  };

  // Calculate total gemstone cost
  const totalCost = gemstones.reduce((sum, gem) => {
    return sum + (gem.estimatedPrice || 0) * gem.count;
  }, 0);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Popular Presets Quick Select */}
        {gemstones.length === 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Popular Choices
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_PRESETS.slice(0, 6).map((preset) => (
                <Badge
                  key={preset.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-400 dark:hover:border-purple-600"
                  onClick={() => {
                    const newGem = {
                      ...createNewGemstone(),
                      ...applyPreset(preset),
                    };
                    onChange([newGem]);
                  }}
                >
                  {preset.name} - {currencySymbol}
                  {Math.round(
                    preset.estimatedPriceNpr * nprToSelectedRate,
                  ).toLocaleString()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Gemstone Cards */}
        {gemstones.map((gem, index) => (
          <GemstoneCardV2
            key={gem.id}
            index={index}
            gemstone={gem}
            onUpdate={(field, value) =>
              updateGemstoneField(index, field, value)
            }
            onPresetSelect={(presetId) => handlePresetSelect(index, presetId)}
            onRemove={() => removeGemstone(index)}
            currencySymbol={currencySymbol}
            exchangeRate={nprToSelectedRate}
          />
        ))}

        {/* Add Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          onClick={addGemstone}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Gemstone
        </Button>

        {/* Total Cost */}
        {gemstones.length > 0 && totalCost > 0 && (
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Total Gemstone Cost:
            </span>
            <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {currencySymbol}{" "}
              {Math.round(totalCost * nprToSelectedRate).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════
// GEMSTONE CARD COMPONENT
// ═══════════════════════════════════════════

interface GemstoneCardV2Props {
  index: number;
  gemstone: GemstoneEntry;
  onUpdate: (field: keyof GemstoneEntry, value: string | number) => void;
  onPresetSelect: (presetId: string) => void;
  onRemove: () => void;
  currencySymbol: string;
  exchangeRate: number;
}

function GemstoneCardV2({
  index,
  gemstone,
  onUpdate,
  onPresetSelect,
  onRemove,
  currencySymbol,
  exchangeRate,
}: GemstoneCardV2Props) {
  const colorOptions = gemstone.stoneType
    ? getColorOptionsForStone(gemstone.stoneType)
    : DEFAULT_GEM_COLORS;
  const clarityOptions = gemstone.stoneType
    ? getClarityOptionsForStone(gemstone.stoneType)
    : null;
  const showClarity =
    gemstone.stoneType && needsClarityGrading(gemstone.stoneType);
  const showCut = gemstone.stoneType && needsCutGrading(gemstone.stoneType);
  const showOrigin = gemstone.stoneType && hasOriginOption(gemstone.stoneType);
  const sizePresets =
    gemstone.sizeUnit === "CARAT" ? SIZE_PRESETS_CARAT : SIZE_PRESETS_MM;

  const isUsingPreset = !!gemstone.presetId;

  return (
    <div
      className={`border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50 space-y-4 ${isUsingPreset ? "border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/20" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          <span className="font-medium text-sm dark:text-gray-100">Stone #{index + 1}</span>
          {isUsingPreset && (
            <Badge
              variant="secondary"
              className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
            >
              Preset
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset Selector */}
      <div className="space-y-1">
        <FieldLabel
          label="Quick Select Preset"
          tooltip="Choose a preset to auto-fill all fields. You can still customize after."
        />
        <Select
          value={gemstone.presetId || "custom"}
          onValueChange={onPresetSelect}
        >
          <SelectTrigger className={isUsingPreset ? "border-purple-400 dark:border-purple-600" : ""}>
            <SelectValue placeholder="Choose preset or customize..." />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="custom">
              <span className="text-muted-foreground">
                Custom specification
              </span>
            </SelectItem>

            {/* Group by category */}
            <div className="px-2 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30">
              💎 Diamonds
            </div>
            {ALL_GEMSTONE_PRESETS.filter((p) =>
              p.stoneType.includes("DIAMOND"),
            ).map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{preset.name}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {currencySymbol}
                    {Math.round(
                      preset.estimatedPriceNpr * exchangeRate,
                    ).toLocaleString()}
                  </span>
                </div>
              </SelectItem>
            ))}

            <div className="px-2 py-1 text-xs font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30">
              ✨ Moissanite
            </div>
            {ALL_GEMSTONE_PRESETS.filter(
              (p) => p.stoneType === "MOISSANITE",
            ).map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{preset.name}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {currencySymbol}
                    {Math.round(
                      preset.estimatedPriceNpr * exchangeRate,
                    ).toLocaleString()}
                  </span>
                </div>
              </SelectItem>
            ))}

            <div className="px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
              ❤️ Colored Gems
            </div>
            {ALL_GEMSTONE_PRESETS.filter((p) =>
              ["RUBY", "SAPPHIRE", "EMERALD"].includes(p.stoneType),
            ).map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{preset.name}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {currencySymbol}
                    {Math.round(
                      preset.estimatedPriceNpr * exchangeRate,
                    ).toLocaleString()}
                  </span>
                </div>
              </SelectItem>
            ))}

            <div className="px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
              💰 Budget-Friendly
            </div>
            {ALL_GEMSTONE_PRESETS.filter((p) =>
              [
                "CUBIC_ZIRCONIA",
                "AMETHYST",
                "TOPAZ",
                "GARNET",
                "CITRINE",
                "PEARL",
              ].includes(p.stoneType),
            ).map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{preset.name}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {currencySymbol}
                    {Math.round(
                      preset.estimatedPriceNpr * exchangeRate,
                    ).toLocaleString()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stone Type */}
        <div className="space-y-1">
          <FieldLabel
            label="Stone Type"
            tooltip="The type of gemstone or diamond"
            required
          />
          <Select
            value={gemstone.stoneType}
            onValueChange={(v) => onUpdate("stoneType", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stone..." />
            </SelectTrigger>
            <SelectContent>
              {GEMSTONE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Origin (for applicable stones) */}
        {showOrigin && (
          <div className="space-y-1">
            <FieldLabel label="Origin" tooltip="Natural or lab-grown" />
            <Select
              value={gemstone.origin || ""}
              onValueChange={(v) => onUpdate("origin", v as GemstoneOrigin)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select origin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NATURAL">Natural (Mined)</SelectItem>
                <SelectItem value="LAB">Lab-grown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Shape */}
        <div className="space-y-1">
          <FieldLabel
            label="Shape"
            tooltip="The cut shape of the gemstone"
            required
          />
          <Select
            value={gemstone.shape}
            onValueChange={(v) => onUpdate("shape", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select shape..." />
            </SelectTrigger>
            <SelectContent>
              {GEMSTONE_SHAPES.map((shape) => (
                <SelectItem key={shape.value} value={shape.value}>
                  {shape.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-1">
          <FieldLabel
            label={`Size (${gemstone.sizeUnit === "CARAT" ? "carats" : "mm"})`}
            tooltip={
              gemstone.sizeUnit === "CARAT"
                ? "Weight in carats"
                : "Diameter in millimeters"
            }
            required
          />
          <Select
            value={gemstone.sizeValue}
            onValueChange={(v) => onUpdate("sizeValue", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size..." />
            </SelectTrigger>
            <SelectContent>
              {sizePresets.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  <div className="flex items-center gap-2">
                    <span>{size.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({size.tooltip})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <FieldLabel
            label={
              gemstone.stoneType?.includes("DIAMOND") ? "Color Grade" : "Color"
            }
            tooltip={
              gemstone.stoneType?.includes("DIAMOND")
                ? "Diamond color grade (D is best)"
                : "Primary color"
            }
            required
          />
          <Select
            value={gemstone.color}
            onValueChange={(v) => onUpdate("color", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select color..." />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{color.label}</span>
                    {"priceMultiplier" in color &&
                      color.priceMultiplier !== 1.0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {color.priceMultiplier > 1
                            ? `+${((color.priceMultiplier - 1) * 100).toFixed(0)}%`
                            : `${((color.priceMultiplier - 1) * 100).toFixed(0)}%`}
                        </span>
                      )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clarity */}
        {showClarity && clarityOptions && (
          <div className="space-y-1">
            <FieldLabel
              label="Clarity"
              tooltip="How clear the stone is from inclusions"
            />
            <Select
              value={gemstone.clarity || ""}
              onValueChange={(v) => onUpdate("clarity", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select clarity..." />
              </SelectTrigger>
              <SelectContent>
                {clarityOptions.map((clarity) => (
                  <SelectItem key={clarity.value} value={clarity.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{clarity.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {clarity.priceMultiplier > 1
                          ? `+${((clarity.priceMultiplier - 1) * 100).toFixed(0)}%`
                          : `${((clarity.priceMultiplier - 1) * 100).toFixed(0)}%`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Cut Grade (diamonds only) */}
        {showCut && (
          <div className="space-y-1">
            <FieldLabel
              label="Cut Grade"
              tooltip="Quality of the diamond's cut"
            />
            <Select
              value={gemstone.cut || ""}
              onValueChange={(v) => onUpdate("cut", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cut..." />
              </SelectTrigger>
              <SelectContent>
                {DIAMOND_CUT.map((cut) => (
                  <SelectItem key={cut.value} value={cut.value}>
                    {cut.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Setting Style */}
        <div className="space-y-1">
          <FieldLabel
            label="Setting Style"
            tooltip="How the stone is mounted"
            required
          />
          <Select
            value={gemstone.settingStyle}
            onValueChange={(v) => onUpdate("settingStyle", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select setting..." />
            </SelectTrigger>
            <SelectContent>
              {SETTING_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <div className="flex items-center gap-2">
                    <span>{style.label}</span>
                    <span className="text-xs text-muted-foreground">
                      (+{currencySymbol}
                      {style.pricePerStone})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        <div className="space-y-1">
          <FieldLabel label="Quantity" tooltip="Number of stones" required />
          <Input
            type="number"
            min={1}
            max={100}
            value={gemstone.count}
            onChange={(e) => onUpdate("count", parseInt(e.target.value) || 1)}
            className="w-full"
          />
        </div>
      </div>

      {/* Price Estimate with Detailed Breakdown */}
      <GemstonePriceBreakdownDisplay
        gemstone={gemstone}
        currencySymbol={currencySymbol}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// PRICE BREAKDOWN DISPLAY COMPONENT
// ═══════════════════════════════════════════

interface GemstonePriceBreakdownDisplayProps {
  gemstone: GemstoneEntry;
  currencySymbol: string;
  exchangeRate: number;
}

function GemstonePriceBreakdownDisplay({
  gemstone,
  currencySymbol,
  exchangeRate,
}: GemstonePriceBreakdownDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // If using preset, show preset price
  if (gemstone.presetId && gemstone.estimatedPrice) {
    return (
      <div className="pt-2 border-t dark:border-gray-700 flex justify-between items-center text-sm bg-green-50 dark:bg-green-950/30 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
        <span className="text-green-700 dark:text-green-300">Preset price:</span>
        <span className="font-bold text-green-800 dark:text-green-200">
          {currencySymbol}{" "}
          {Math.round(gemstone.estimatedPrice * exchangeRate).toLocaleString()}{" "}
          × {gemstone.count} = {currencySymbol}{" "}
          {Math.round(
            gemstone.estimatedPrice * gemstone.count * exchangeRate,
          ).toLocaleString()}
        </span>
      </div>
    );
  }

  // Calculate custom breakdown if not using preset
  if (!gemstone.stoneType) {
    return null;
  }

  const breakdown = getGemstonePriceBreakdown({
    presetId: gemstone.presetId,
    stoneType: gemstone.stoneType,
    shape: gemstone.shape,
    sizeValue: gemstone.sizeValue,
    sizeUnit: gemstone.sizeUnit,
    color: gemstone.color,
    clarity: gemstone.clarity,
    cut: gemstone.cut,
    settingStyle: gemstone.settingStyle,
    count: gemstone.count,
  });

  const formatPrice = (price: number) =>
    `${currencySymbol}${Math.round(price * exchangeRate).toLocaleString()}`;

  const formatMultiplier = (mult: number) => {
    if (mult === 1) return "1.0×";
    if (mult > 1) return `+${((mult - 1) * 100).toFixed(0)}%`;
    return `-${((1 - mult) * 100).toFixed(0)}%`;
  };

  return (
    <div className="pt-2 border-t dark:border-gray-700 bg-green-50 dark:bg-green-950/30 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
      {/* Total with expand toggle */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        <span className="text-green-700 dark:text-green-300 flex items-center gap-1">
          Estimated stone cost:
          <Badge variant="outline" className="text-xs ml-1">
            {showBreakdown ? "▼ Hide details" : "▶ Show details"}
          </Badge>
        </span>
        <span className="font-bold text-green-800 dark:text-green-200">
          {formatPrice(breakdown.grandTotal)}
        </span>
      </div>

      {/* Detailed breakdown */}
      {showBreakdown && (
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/50 text-xs space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {/* Base Price */}
            <div className="text-gray-600 dark:text-gray-400">
              Base ({breakdown.basePriceLabel}):
            </div>
            <div className="text-right font-medium">
              {formatPrice(breakdown.basePrice)}
            </div>

            {/* Size */}
            <div className="text-gray-600 dark:text-gray-400">Size ({breakdown.sizeLabel}):</div>
            <div className="text-right font-medium">
              {formatMultiplier(breakdown.sizeMultiplier)}
            </div>

            {/* Color */}
            {breakdown.colorMultiplier !== 1 && (
              <>
                <div className="text-gray-600 dark:text-gray-400">
                  Color ({breakdown.colorLabel}):
                </div>
                <div
                  className={`text-right font-medium ${breakdown.colorMultiplier > 1 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {formatMultiplier(breakdown.colorMultiplier)}
                </div>
              </>
            )}

            {/* Clarity */}
            {breakdown.clarityMultiplier !== 1 && (
              <>
                <div className="text-gray-600 dark:text-gray-400">
                  Clarity ({breakdown.clarityLabel}):
                </div>
                <div
                  className={`text-right font-medium ${breakdown.clarityMultiplier > 1 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {formatMultiplier(breakdown.clarityMultiplier)}
                </div>
              </>
            )}

            {/* Cut */}
            {breakdown.cutMultiplier !== 1 && (
              <>
                <div className="text-gray-600 dark:text-gray-400">Cut ({breakdown.cutLabel}):</div>
                <div
                  className={`text-right font-medium ${breakdown.cutMultiplier > 1 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {formatMultiplier(breakdown.cutMultiplier)}
                </div>
              </>
            )}

            {/* Shape */}
            {breakdown.shapeMultiplier !== 1 && (
              <>
                <div className="text-gray-600 dark:text-gray-400">
                  Shape ({breakdown.shapeLabel}):
                </div>
                <div
                  className={`text-right font-medium ${breakdown.shapeMultiplier > 1 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {formatMultiplier(breakdown.shapeMultiplier)}
                </div>
              </>
            )}

            {/* Per stone total */}
            <div className="text-gray-800 dark:text-gray-200 font-medium pt-1 border-t border-green-200 dark:border-green-800/50">
              Per stone:
            </div>
            <div className="text-right font-bold text-green-800 dark:text-green-200 pt-1 border-t border-green-200 dark:border-green-800/50">
              {formatPrice(breakdown.totalPerStone)}
            </div>

            {/* Setting */}
            {breakdown.settingCost > 0 && (
              <>
                <div className="text-gray-600 dark:text-gray-400">
                  + {breakdown.settingLabel} setting:
                </div>
                <div className="text-right font-medium">
                  {formatPrice(breakdown.settingCost)}
                </div>
              </>
            )}

            {/* Quantity */}
            {breakdown.count > 1 && (
              <>
                <div className="text-gray-600 dark:text-gray-400">× Quantity:</div>
                <div className="text-right font-medium">
                  {breakdown.count} stones
                </div>
              </>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-2 border-t border-green-300 dark:border-green-800/50">
            <span className="font-semibold text-green-800 dark:text-green-200">Total:</span>
            <span className="font-bold text-lg text-green-900 dark:text-green-100">
              {formatPrice(breakdown.grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// FIELD LABEL HELPER
// ═══════════════════════════════════════════

interface FieldLabelProps {
  label: string;
  tooltip: string;
  required?: boolean;
}

function FieldLabel({ label, tooltip, required }: FieldLabelProps) {
  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default GemstoneEditorV2;
