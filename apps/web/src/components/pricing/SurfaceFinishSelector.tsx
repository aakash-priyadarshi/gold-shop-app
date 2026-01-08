'use client';

import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info, Sparkles, Brush, Eye } from 'lucide-react';
import { SURFACE_FINISHES, type SurfaceFinish } from '@/lib/pricing/constants';
import { Badge } from '@/components/ui/badge';

interface SurfaceFinishSelectorProps {
  selectedFinish: string;
  onFinishChange: (finish: SurfaceFinish) => void;
  disabled?: boolean;
  makingCharge?: number; // For percentage-based pricing display
}

export function SurfaceFinishSelector({
  selectedFinish,
  onFinishChange,
  disabled = false,
  makingCharge = 0,
}: SurfaceFinishSelectorProps) {
  const selectedFinishInfo = SURFACE_FINISHES.find(f => f.value === selectedFinish);

  const getFinishPriceDisplay = (finish: typeof SURFACE_FINISHES[number]) => {
    if (finish.priceType === 'FLAT') {
      if (!finish.priceNpr) return 'Included';
      return `+₹${finish.priceNpr}`;
    } else if (finish.priceType === 'PERCENTAGE' && finish.pricePercent) {
      const amount = makingCharge * (finish.pricePercent / 100);
      return `+${finish.pricePercent}% (≈₹${Math.round(amount)})`;
    }
    return '';
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Surface Finish</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p className="text-xs">
                The texture and appearance of the metal surface. 
                Each finish has different visual effects and maintenance needs.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SURFACE_FINISHES.map((finish) => (
            <Popover key={finish.value}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onFinishChange(finish.value as SurfaceFinish)}
                  className={`
                    relative flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all min-h-[80px]
                    ${selectedFinish === finish.value 
                      ? 'border-gold-500 bg-gold-50 ring-1 ring-gold-200' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-xs leading-tight">{finish.label}</span>
                    <Info className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-1" />
                  </div>
                  <span className={`text-[10px] mt-auto ${
                    finish.priceType === 'FLAT' && !('priceNpr' in finish && finish.priceNpr) ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {getFinishPriceDisplay(finish)}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72" side="top" align="center">
                <FinishTooltipContent tooltip={finish.tooltip} label={finish.label} />
              </PopoverContent>
            </Popover>
          ))}
        </div>

        {/* Selection Summary */}
        {selectedFinishInfo && (
          <div className="bg-gray-50 border rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-gold-500" />
              <span className="font-medium">{selectedFinishInfo.label}</span>
              {selectedFinishInfo.priceType === 'FLAT' && !selectedFinishInfo.priceNpr && (
                <Badge variant="secondary" className="text-[10px]">Included</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedFinishInfo.tooltip.visual}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Tooltip content component for surface finishes
interface FinishTooltipContentProps {
  label: string;
  tooltip: {
    visual: string;
    maintenance: string;
    bestFor: string;
  };
}

function FinishTooltipContent({ label, tooltip }: FinishTooltipContentProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">{label}</h4>
      
      <div className="flex items-start gap-2">
        <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-xs">Visual Effect</p>
          <p className="text-xs text-muted-foreground">{tooltip.visual}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-2">
        <Brush className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-xs">Maintenance</p>
          <p className="text-xs text-muted-foreground">{tooltip.maintenance}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-xs">Best For</p>
          <p className="text-xs text-muted-foreground">{tooltip.bestFor}</p>
        </div>
      </div>
    </div>
  );
}

export default SurfaceFinishSelector;
