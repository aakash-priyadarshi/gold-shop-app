'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Trash2, HelpCircle, Plus, Gem } from 'lucide-react';
import {
  GEMSTONE_TYPES,
  GEMSTONE_SHAPES,
  SETTING_STYLES,
  SIZE_PRESETS_MM,
  SIZE_PRESETS_CARAT,
  DIAMOND_COLORS,
  DIAMOND_CLARITY,
  DIAMOND_CUT,
  COLORED_GEM_COLORS,
  COLORED_GEM_CLARITY,
  DEFAULT_GEM_COLORS,
  getColorOptionsForStone,
  getClarityOptionsForStone,
  needsClarityGrading,
  needsCutGrading,
  getDefaultSizeUnit,
  hasOriginOption,
  type SizeUnit,
  type GemstoneOrigin,
} from '@/lib/pricing/constants';

export interface GemstoneEntry {
  id: string;
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

interface GemstoneEditorProps {
  gemstones: GemstoneEntry[];
  onChange: (gemstones: GemstoneEntry[]) => void;
  onPriceEstimate?: (gemstone: GemstoneEntry) => Promise<number>;
}

const createNewGemstone = (): GemstoneEntry => ({
  id: `gem-${Date.now()}`,
  stoneType: '',
  shape: '',
  sizeUnit: 'MM',
  sizeValue: '',
  color: '',
  settingStyle: '',
  count: 1,
});

export function GemstoneEditor({ gemstones, onChange, onPriceEstimate }: GemstoneEditorProps) {
  const addGemstone = () => {
    onChange([...gemstones, createNewGemstone()]);
  };

  const updateGemstone = (index: number, field: keyof GemstoneEntry, value: string | number) => {
    const updated = [...gemstones];
    const gem = { ...updated[index], [field]: value };
    
    // Auto-update size unit when stone type changes
    if (field === 'stoneType' && typeof value === 'string') {
      gem.sizeUnit = getDefaultSizeUnit(value);
      gem.sizeValue = ''; // Reset size
      gem.color = ''; // Reset color
      gem.clarity = undefined;
      gem.cut = undefined;
      
      // Set origin for lab diamonds
      if (value === 'DIAMOND_LAB') {
        gem.origin = 'LAB';
      } else if (value === 'DIAMOND_NATURAL') {
        gem.origin = 'NATURAL';
      } else {
        gem.origin = undefined;
      }
    }
    
    updated[index] = gem;
    onChange(updated);
  };

  const removeGemstone = (index: number) => {
    onChange(gemstones.filter((_, i) => i !== index));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {gemstones.map((gem, index) => (
          <GemstoneCard
            key={gem.id}
            index={index}
            gemstone={gem}
            onUpdate={(field, value) => updateGemstone(index, field, value)}
            onRemove={() => removeGemstone(index)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addGemstone}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Gemstone
        </Button>
      </div>
    </TooltipProvider>
  );
}

interface GemstoneCardProps {
  index: number;
  gemstone: GemstoneEntry;
  onUpdate: (field: keyof GemstoneEntry, value: string | number) => void;
  onRemove: () => void;
}

function GemstoneCard({ index, gemstone, onUpdate, onRemove }: GemstoneCardProps) {
  const colorOptions = gemstone.stoneType ? getColorOptionsForStone(gemstone.stoneType) : DEFAULT_GEM_COLORS;
  const clarityOptions = gemstone.stoneType ? getClarityOptionsForStone(gemstone.stoneType) : null;
  const showClarity = gemstone.stoneType && needsClarityGrading(gemstone.stoneType);
  const showCut = gemstone.stoneType && needsCutGrading(gemstone.stoneType);
  const showOrigin = gemstone.stoneType && hasOriginOption(gemstone.stoneType);
  const sizePresets = gemstone.sizeUnit === 'CARAT' ? SIZE_PRESETS_CARAT : SIZE_PRESETS_MM;

  return (
    <div className="border rounded-lg p-4 bg-white space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-sm">Stone #{index + 1}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stone Type */}
        <div className="space-y-1">
          <FieldLabel label="Stone Type" tooltip="The type of gemstone or diamond you want" required />
          <Select value={gemstone.stoneType} onValueChange={(v) => onUpdate('stoneType', v)}>
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
            <FieldLabel label="Origin" tooltip="Natural stones are mined from earth. Lab-grown are created in laboratories with same properties." />
            <Select value={gemstone.origin || ''} onValueChange={(v) => onUpdate('origin', v as GemstoneOrigin)}>
              <SelectTrigger>
                <SelectValue placeholder="Select origin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NATURAL">Natural (Mined)</SelectItem>
                <SelectItem value="LAB">Lab-grown (Created)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Shape */}
        <div className="space-y-1">
          <FieldLabel label="Shape" tooltip="The cut shape of the gemstone. Affects sparkle and appearance." required />
          <Select value={gemstone.shape} onValueChange={(v) => onUpdate('shape', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select shape..." />
            </SelectTrigger>
            <SelectContent>
              {GEMSTONE_SHAPES.map((shape) => (
                <SelectItem key={shape.value} value={shape.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{shape.label}</span>
                    {shape.priceMultiplier !== 1.0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {shape.priceMultiplier > 1 ? `+${((shape.priceMultiplier - 1) * 100).toFixed(0)}%` : `${((shape.priceMultiplier - 1) * 100).toFixed(0)}%`}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size Unit */}
        <div className="space-y-1">
          <FieldLabel label="Size Unit" tooltip="Diamonds & moissanite are typically measured in carats (weight). Other gems often use millimeters (diameter)." />
          <Select value={gemstone.sizeUnit} onValueChange={(v) => {
            onUpdate('sizeUnit', v as SizeUnit);
            onUpdate('sizeValue', ''); // Reset size when unit changes
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM">Millimeters (mm)</SelectItem>
              <SelectItem value="CARAT">Carats (ct)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size Value */}
        <div className="space-y-1">
          <FieldLabel 
            label={`Size (${gemstone.sizeUnit === 'CARAT' ? 'carats' : 'mm'})`} 
            tooltip={gemstone.sizeUnit === 'CARAT' 
              ? '1 carat = 200mg. Higher carat = larger & more expensive.' 
              : 'Diameter in millimeters. 6mm is common for center stones.'
            } 
            required 
          />
          <Select value={gemstone.sizeValue} onValueChange={(v) => onUpdate('sizeValue', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select size..." />
            </SelectTrigger>
            <SelectContent>
              {sizePresets.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{size.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground ml-2">ⓘ</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs max-w-[200px]">{size.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <FieldLabel 
            label={gemstone.stoneType?.includes('DIAMOND') ? 'Color Grade' : 'Color'} 
            tooltip={gemstone.stoneType?.includes('DIAMOND') 
              ? 'D is colorless (most valuable). Lower grades have more yellow tint.' 
              : 'The primary color of the gemstone.'
            } 
            required 
          />
          <Select value={gemstone.color} onValueChange={(v) => onUpdate('color', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select color..." />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{color.label}</span>
                    {'priceMultiplier' in color && color.priceMultiplier !== 1.0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {color.priceMultiplier > 1 ? `+${((color.priceMultiplier - 1) * 100).toFixed(0)}%` : `${((color.priceMultiplier - 1) * 100).toFixed(0)}%`}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clarity (for diamonds and precious gems) */}
        {showClarity && clarityOptions && (
          <div className="space-y-1">
            <FieldLabel 
              label="Clarity" 
              tooltip="How clear the stone is from internal flaws (inclusions). Higher clarity = more valuable." 
            />
            <Select value={gemstone.clarity || ''} onValueChange={(v) => onUpdate('clarity', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select clarity..." />
              </SelectTrigger>
              <SelectContent>
                {clarityOptions.map((clarity) => (
                  <SelectItem key={clarity.value} value={clarity.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{clarity.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {clarity.priceMultiplier > 1 ? `+${((clarity.priceMultiplier - 1) * 100).toFixed(0)}%` : `${((clarity.priceMultiplier - 1) * 100).toFixed(0)}%`}
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
              tooltip="How well the diamond is cut affects its sparkle. Excellent cut reflects most light." 
            />
            <Select value={gemstone.cut || ''} onValueChange={(v) => onUpdate('cut', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select cut..." />
              </SelectTrigger>
              <SelectContent>
                {DIAMOND_CUT.map((cut) => (
                  <SelectItem key={cut.value} value={cut.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{cut.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {cut.priceMultiplier > 1 ? `+${((cut.priceMultiplier - 1) * 100).toFixed(0)}%` : `${((cut.priceMultiplier - 1) * 100).toFixed(0)}%`}
                      </span>
                    </div>
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
            tooltip="How the stone is secured to the metal. Affects both security and appearance." 
            required 
          />
          <Select value={gemstone.settingStyle} onValueChange={(v) => onUpdate('settingStyle', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select setting..." />
            </SelectTrigger>
            <SelectContent>
              {SETTING_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{style.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground ml-1" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[250px]">
                        <p className="text-xs">{style.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        <div className="space-y-1">
          <FieldLabel label="Quantity" tooltip="Number of this exact stone configuration" required />
          <Input
            type="number"
            min={1}
            max={100}
            value={gemstone.count}
            onChange={(e) => onUpdate('count', parseInt(e.target.value) || 1)}
            className="w-full"
          />
        </div>
      </div>

      {/* Price Estimate Line (if available) */}
      {gemstone.estimatedPrice && (
        <div className="pt-2 border-t flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Estimated stone cost:</span>
          <span className="font-medium text-green-600">
            ₹ {gemstone.estimatedPrice.toLocaleString()} × {gemstone.count} = ₹ {(gemstone.estimatedPrice * gemstone.count).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// Helper component for field labels with tooltips
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

export default GemstoneEditor;
