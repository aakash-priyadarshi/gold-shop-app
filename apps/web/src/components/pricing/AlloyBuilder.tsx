'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Info, Gem, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import {
  BASE_PRECIOUS_METALS,
  GOLD_KARATS_METHOD_B,
  SILVER_PURITIES,
  ALLOY_FAMILIES,
  ALLOY_RECIPE_PRESETS,
  getAvailableFamiliesForKarat,
  getRecipePresets,
  getRecipePresetById,
  type BasePreciousMetal,
  type GoldKarat,
  type AlloyFamily,
  type AlloyRecipePreset,
} from '@/lib/pricing/alloy-constants';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface AlloyConfig {
  baseMetal: BasePreciousMetal;
  karat?: GoldKarat;
  silverPurity?: 'STERLING_925' | 'ARGENTIUM_935';
  alloyFamily?: AlloyFamily;
  recipePresetId?: string;
}

interface AlloyBuilderProps {
  value: AlloyConfig;
  onChange: (config: AlloyConfig) => void;
  nickelComplianceAllowed?: boolean; // Based on country/settings
  currencySymbol?: string;
  marketRates?: Record<string, number>; // All metal rates from API keyed by metal type
  weightGrams?: number; // For price preview
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export function AlloyBuilder({
  value,
  onChange,
  nickelComplianceAllowed = false,
  currencySymbol = '₹',
  marketRates = {},
  weightGrams = 0,
}: AlloyBuilderProps) {
  
  // Get available options based on selections
  const availableFamilies = value.karat 
    ? getAvailableFamiliesForKarat(value.karat)
    : [];
  
  const availableRecipes = (value.alloyFamily && value.karat)
    ? getRecipePresets(value.alloyFamily, value.karat, !nickelComplianceAllowed)
    : [];
  
  const selectedRecipe = value.recipePresetId 
    ? getRecipePresetById(value.recipePresetId) 
    : undefined;

  // Update handlers
  const updateBaseMetal = (metal: BasePreciousMetal) => {
    onChange({
      baseMetal: metal,
      karat: undefined,
      silverPurity: metal === 'SILVER' ? 'STERLING_925' : undefined,
      alloyFamily: undefined,
      recipePresetId: undefined,
    });
  };

  const updateKarat = (karat: GoldKarat) => {
    onChange({
      ...value,
      karat,
      alloyFamily: undefined,
      recipePresetId: undefined,
    });
  };

  const updateSilverPurity = (purity: 'STERLING_925' | 'ARGENTIUM_935') => {
    onChange({
      ...value,
      silverPurity: purity,
    });
  };

  const updateFamily = (family: AlloyFamily) => {
    onChange({
      ...value,
      alloyFamily: family,
      recipePresetId: undefined,
    });
  };

  const updateRecipe = (recipeId: string) => {
    const recipe = getRecipePresetById(recipeId);
    if (recipe) {
      onChange({
        ...value,
        recipePresetId: recipeId,
      });
    }
  };

  // Get the correct market rate based on selection
  const getMarketRate = (): number => {
    if (value.baseMetal === 'GOLD' && value.karat) {
      // Map karat to API rate key
      const karatConfig = GOLD_KARATS_METHOD_B.find(k => k.value === value.karat);
      const rateKey = karatConfig?.rateKey || 'GOLD_24K';
      return marketRates[rateKey] || 0;
    } else if (value.baseMetal === 'SILVER') {
      const purityConfig = SILVER_PURITIES.find(p => p.value === value.silverPurity);
      const rateKey = purityConfig?.rateKey || 'SILVER_925';
      return marketRates[rateKey] || 0;
    }
    return 0;
  };

  // Calculate preview price
  const marketRate = getMarketRate();
  const baseCost = marketRate * weightGrams;
  const premiumMultiplier = selectedRecipe?.priceMultiplier || 1;
  const totalEstimate = baseCost * premiumMultiplier;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Gem className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Alloy Builder (Method B)</h3>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="text-xs">
                Method B uses precious metal alloys - gold or silver mixed with other metals 
                for specific colors and durability. Choose your base metal, purity, and alloy recipe.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Step 1: Base Metal */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1">
            Step 1: Base Precious Metal
            <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {BASE_PRECIOUS_METALS.map((metal) => (
              <Button
                key={metal.value}
                type="button"
                variant={value.baseMetal === metal.value ? 'default' : 'outline'}
                className={`h-auto py-3 w-full overflow-hidden ${value.baseMetal === metal.value ? 'gold-gradient text-white' : ''}`}
                onClick={() => updateBaseMetal(metal.value as BasePreciousMetal)}
              >
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{metal.label}</div>
                  <div className="text-xs opacity-80 truncate">{metal.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Step 2: Purity/Karat (Gold) or Purity (Silver) */}
        {value.baseMetal === 'GOLD' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              Step 2: Gold Karat
              <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    24K is pure gold (not available in Method B as it's not an alloy).
                    Lower karats contain more alloy metals for durability.
                  </p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GOLD_KARATS_METHOD_B.map((karat) => (
                <Tooltip key={karat.value}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={value.karat === karat.value ? 'default' : 'outline'}
                      className={`w-full text-center whitespace-nowrap text-sm px-2 ${value.karat === karat.value ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                      onClick={() => updateKarat(karat.value as GoldKarat)}
                    >
                      {karat.value} ({(karat.purity * 100).toFixed(karat.purity * 100 % 1 === 0 ? 0 : 1)}%)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{karat.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              24K is not available in Method B (24K is pure gold, not an alloy)
            </p>
          </div>
        )}

        {value.baseMetal === 'SILVER' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              Step 2: Silver Purity
              <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SILVER_PURITIES.map((purity) => (
                <Tooltip key={purity.value}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={value.silverPurity === purity.value ? 'default' : 'outline'}
                      className={`h-auto py-3 w-full overflow-hidden ${value.silverPurity === purity.value ? 'bg-gray-500 hover:bg-gray-600 text-white' : ''}`}
                      onClick={() => updateSilverPurity(purity.value as 'STERLING_925' | 'ARGENTIUM_935')}
                    >
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm truncate">{purity.label.split(' (')[0]}</div>
                        <div className="text-xs opacity-80 truncate">{purity.label.split(' (')[1]?.replace(')', '')}</div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p className="text-xs">{purity.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Alloy Family (Gold only) */}
        {value.baseMetal === 'GOLD' && value.karat && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              Step 3: Alloy Family
              <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {availableFamilies.map((family) => (
                <Tooltip key={family.value}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={value.alloyFamily === family.value ? 'default' : 'outline'}
                      className={`h-auto py-2.5 px-3 relative overflow-hidden w-full ${value.alloyFamily === family.value ? '' : ''}`}
                      style={{
                        backgroundColor: value.alloyFamily === family.value ? family.colorHex : undefined,
                        color: value.alloyFamily === family.value ? 'white' : undefined,
                        textShadow: value.alloyFamily === family.value ? '0 1px 2px rgba(0,0,0,0.3)' : undefined,
                      }}
                      onClick={() => updateFamily(family.value as AlloyFamily)}
                    >
                      <div className="text-left min-w-0 w-full pr-5">
                        <div className="font-medium text-sm truncate">{family.label}</div>
                        <div className="text-xs opacity-80 truncate">{family.description}</div>
                      </div>
                      <div 
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow flex-shrink-0"
                        style={{ backgroundColor: family.colorHex }}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <div className="space-y-1 text-xs">
                      <p><strong>Color:</strong> {family.tooltip.color}</p>
                      <p><strong>Allergy:</strong> {family.tooltip.allergy}</p>
                      <p><strong>Care:</strong> {family.tooltip.maintenance}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Recipe Preset */}
        {value.baseMetal === 'GOLD' && value.karat && value.alloyFamily && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              Step 4: Alloy Recipe
              <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">
                    Each recipe has specific alloy metal ratios that affect color, 
                    durability, and price. Recipes are pre-configured by expert jewellers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </Label>
            
            {availableRecipes.length > 0 ? (
              <div className="space-y-2">
                {availableRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    selected={value.recipePresetId === recipe.id}
                    onSelect={() => updateRecipe(recipe.id)}
                    currencySymbol={currencySymbol}
                    baseCost={baseCost}
                    nickelComplianceAllowed={nickelComplianceAllowed}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                No recipes available for this combination. Try a different karat or family.
              </div>
            )}
          </div>
        )}

        {/* Silver - simple confirmation */}
        {value.baseMetal === 'SILVER' && value.silverPurity && (
          <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Silver Alloy Summary</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {value.silverPurity === 'STERLING_925' 
                ? 'Sterling Silver (92.5% pure silver + 7.5% copper for strength)'
                : 'Argentium Silver (93.5% silver with germanium for tarnish resistance)'
              }
            </p>
            {value.silverPurity === 'ARGENTIUM_935' && (
              <Badge variant="secondary" className="text-xs">
                Premium +15%
              </Badge>
            )}
          </div>
        )}

        {/* Price Preview */}
        {weightGrams > 0 && marketRate > 0 && (value.karat || value.silverPurity) && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-amber-800">Metal Cost Preview</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate min-w-0">
                  {value.baseMetal === 'GOLD' ? `${value.karat} Gold` : 
                   value.silverPurity === 'STERLING_925' ? 'Sterling Silver' : 'Argentium Silver'} 
                  ({weightGrams}g @ {currencySymbol}{marketRate.toLocaleString()}/g)
                </span>
                <span className="font-medium whitespace-nowrap flex-shrink-0">
                  {currencySymbol}{baseCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              {selectedRecipe && selectedRecipe.priceMultiplier > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Alloy premium ({((selectedRecipe.priceMultiplier - 1) * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-amber-600 whitespace-nowrap flex-shrink-0">
                    +{currencySymbol}{((baseCost * selectedRecipe.priceMultiplier) - baseCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                <span className="text-amber-800 font-medium">Total metal</span>
                <span className="font-bold text-amber-900 whitespace-nowrap">
                  {currencySymbol}{totalEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════
// RECIPE CARD COMPONENT
// ═══════════════════════════════════════════

interface RecipeCardProps {
  recipe: AlloyRecipePreset;
  selected: boolean;
  onSelect: () => void;
  currencySymbol: string;
  baseCost: number;
  nickelComplianceAllowed: boolean;
}

function RecipeCard({ recipe, selected, onSelect, currencySymbol, baseCost, nickelComplianceAllowed }: RecipeCardProps) {
  const isNickelRecipe = !recipe.nickelCompliant;
  const isDisabled = isNickelRecipe && !nickelComplianceAllowed;
  const premiumAmount = baseCost > 0 ? (baseCost * recipe.priceMultiplier) - baseCost : 0;
  
  const durabilityColors = {
    LOW: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-green-100 text-green-700',
    VERY_HIGH: 'bg-emerald-100 text-emerald-700',
  };
  
  const allergyColors = {
    NONE: 'bg-green-100 text-green-700',
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-red-100 text-red-700',
  };

  return (
    <div 
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${selected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'hover:border-amber-300'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={isDisabled ? undefined : onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{recipe.name}</span>
            {isNickelRecipe && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ Contains Nickel
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
          
          {/* Characteristics */}
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className={`text-xs ${durabilityColors[recipe.characteristics.durability]}`}>
              {recipe.characteristics.durability.replace('_', ' ')} durability
            </Badge>
            <Badge variant="outline" className={`text-xs ${allergyColors[recipe.characteristics.allergyRisk]}`}>
              {recipe.characteristics.allergyRisk === 'NONE' ? '✓ Hypoallergenic' : 
               recipe.characteristics.allergyRisk === 'HIGH' ? '⚠️ Allergy risk' :
               `${recipe.characteristics.allergyRisk} allergy risk`}
            </Badge>
          </div>
          
          {/* Alloy Components */}
          <div className="text-xs text-muted-foreground mt-2">
            Components: {recipe.components.map(c => `${c.metal} ${c.percentage}%`).join(', ')}
          </div>
        </div>
        
        {/* Price Info */}
        <div className="text-right ml-4">
          {recipe.priceMultiplier > 1 ? (
            <div className="text-amber-600 font-medium">
              +{((recipe.priceMultiplier - 1) * 100).toFixed(0)}%
            </div>
          ) : (
            <div className="text-green-600 font-medium">
              Standard
            </div>
          )}
          {premiumAmount > 0 && (
            <div className="text-xs text-muted-foreground">
              +{currencySymbol}{premiumAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
      </div>
      
      {/* Tooltip info */}
      <p className="text-xs text-muted-foreground mt-2 italic">
        {recipe.tooltip}
      </p>
      
      {isDisabled && (
        <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Nickel not allowed in your region. Choose a palladium option.
        </div>
      )}
    </div>
  );
}

export default AlloyBuilder;
