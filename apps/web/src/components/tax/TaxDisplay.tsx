/**
 * Tax Display Component
 * 
 * Shows tax breakdown with country-aware labels and tooltips
 */

'use client';

import { TaxResult } from '@/lib/tax/types';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaxDisplayProps {
  taxResult: TaxResult;
  country: string;
  currencySymbol: string;
  isEstimate?: boolean;
}

export function TaxDisplay({
  taxResult,
  country,
  currencySymbol,
  isEstimate = true,
}: TaxDisplayProps) {
  if (!taxResult || taxResult.totalTax === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No tax applicable
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {/* Tax line items */}
        {taxResult.lineItems.map((item, index) => (
          <div key={item.ruleId + index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {item.displayName} ({(item.rate * 100).toFixed(0)}%)
              </span>
              {country === 'NP' && item.name === 'VAT' && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-blue-500" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p className="text-xs">
                      Applied to {item.appliedTo}. 
                      {' '}VAT calculation mode is configurable by admin based on regulatory interpretation.
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span className="font-medium">
              {currencySymbol} {item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        ))}
        
        {/* Total tax */}
        <div className="flex items-center justify-between text-sm font-medium border-t pt-2">
          <span>Total Tax</span>
          <span>
            {currencySymbol} {taxResult.totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        
        {/* Disclaimers */}
        {isEstimate && (
          <div className="text-xs text-muted-foreground italic pt-2 border-t">
            {taxResult.flags?.requiresAddressVerification ? (
              <p>
                <Info className="h-3 w-3 inline mr-1" />
                Final tax calculated at checkout based on delivery address.
              </p>
            ) : (
              <p>Estimated tax. Final amount may vary at checkout.</p>
            )}
          </div>
        )}
        
        {/* Effective rate */}
        {taxResult.effectiveRate > 0 && (
          <div className="text-xs text-muted-foreground">
            Effective tax rate: {(taxResult.effectiveRate * 100).toFixed(2)}%
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact tax summary for cards/previews
 */
export function TaxSummary({
  taxResult,
  currencySymbol,
}: {
  taxResult: TaxResult;
  currencySymbol: string;
}) {
  if (!taxResult || taxResult.totalTax === 0) {
    return null;
  }

  const uniqueTaxNames = Array.from(
    new Set(taxResult.lineItems.map(item => item.displayName))
  );

  return (
    <div className="text-sm">
      <span className="text-muted-foreground">
        Tax ({uniqueTaxNames.join(' + ')}):
      </span>{' '}
      <span className="font-medium">
        {currencySymbol} {taxResult.totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
