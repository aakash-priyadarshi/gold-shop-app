'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { variantsApi } from '@/lib/api';

interface ProductVariant {
  id: string;
  sizeLabel: string;
  sizeSystem?: string;
  sizeValue?: number;
  sku: string;
  stock: number;
  priceOverride?: number;
  isActive: boolean;
}

interface SizeVariantSelectorProps {
  inventoryItemId: string;
  hasSizes: boolean;
  basePrice: number;
  formatPrice: (price: number) => string;
  onVariantSelect: (variant: ProductVariant | null) => void;
}

export function SizeVariantSelector({
  inventoryItemId,
  hasSizes,
  basePrice,
  formatPrice,
  onVariantSelect,
}: SizeVariantSelectorProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasSizes && inventoryItemId) {
      loadVariants();
    }
  }, [inventoryItemId, hasSizes]);

  async function loadVariants() {
    setLoading(true);
    try {
      const res = await variantsApi.listVariants(inventoryItemId);
      const data = res.data || [];
      setVariants(data.filter((v: ProductVariant) => v.isActive));
    } catch (e) {
      console.error('Failed to load variants', e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(variant: ProductVariant) {
    if (variant.stock <= 0) return;
    const next = selected?.id === variant.id ? null : variant;
    setSelected(next);
    onVariantSelect(next);
  }

  if (!hasSizes || variants.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Select Size</Label>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading sizes...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const isSelected = selected?.id === v.id;
            const isOutOfStock = v.stock <= 0;
            const priceDisplay = v.priceOverride
              ? formatPrice(v.priceOverride)
              : null;

            return (
              <button
                key={v.id}
                onClick={() => handleSelect(v)}
                disabled={isOutOfStock}
                className={`px-3 py-2 border rounded-lg text-sm transition-colors
                  ${isSelected
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : isOutOfStock
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                      : 'border-gray-300 hover:border-primary/50'
                  }
                `}
                title={isOutOfStock ? 'Out of stock' : `Size ${v.sizeLabel}`}
              >
                <span>{v.sizeLabel}</span>
                {priceDisplay && !isOutOfStock && (
                  <span className="block text-xs text-muted-foreground">{priceDisplay}</span>
                )}
                {isOutOfStock && (
                  <span className="block text-xs">Out of stock</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {selected && (
        <p className="text-xs text-muted-foreground">
          Selected: Size {selected.sizeLabel}
          {selected.stock <= 3 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Only {selected.stock} left
            </Badge>
          )}
        </p>
      )}
    </div>
  );
}
