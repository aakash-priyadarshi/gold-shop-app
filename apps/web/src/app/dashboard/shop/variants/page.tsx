'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { T } from '@/components/ui/T';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Ruler,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Package,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { variantsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/providers/translation-provider';

interface InventoryItem {
  id: string;
  nameEn: string;
  sku?: string;
  jewelleryType: string;
  hasSizes: boolean;
  stockQuantity: number;
}

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

interface SizeChartEntry {
  sizeLabel: string;
  sizeSystem: string;
  sizeValue: number;
  diameterMm: number;
  region: string;
}

const JEWELLERY_TYPES_WITH_SIZES = ['RING', 'BANGLE', 'BRACELET', 'CHAIN', 'NECKLACE'];

export default function ShopVariantsPage() {
  const { user } = useAuth();
  const t = useT();
  const shopData = user?.shop;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New variant form
  const [newVariant, setNewVariant] = useState({
    sizeLabel: '',
    sizeSystem: 'US',
    sizeValue: '',
    sku: '',
    stock: '1',
    priceOverride: '',
  });

  useEffect(() => {
    if (shopData?.id) loadItems();
  }, [shopData?.id]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?shopId=${shopData?.id}`);
      const data = await res.json();
      const allItems = data?.items || data || [];
      // Only show types that can have sizes
      setItems(allItems.filter((i: InventoryItem) =>
        JEWELLERY_TYPES_WITH_SIZES.includes(i.jewelleryType)
      ));
    } catch (e) {
      console.error('Failed to load items', e);
    } finally {
      setLoading(false);
    }
  }

  async function selectItem(item: InventoryItem) {
    setSelectedItem(item);
    setVariants([]);
    setSizeChart([]);
    try {
      const [varRes, chartRes] = await Promise.all([
        variantsApi.listVariants(item.id),
        variantsApi.getSizeChart(item.jewelleryType).catch(() => ({ data: [] })),
      ]);
      setVariants(varRes.data || []);
      setSizeChart(chartRes.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleSizes(enabled: boolean) {
    if (!selectedItem) return;
    try {
      await variantsApi.toggleSizes(selectedItem.id, enabled);
      setSelectedItem({ ...selectedItem, hasSizes: enabled });
      // Refresh items list
      loadItems();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to toggle sizes');
    }
  }

  async function addVariant() {
    if (!selectedItem || !newVariant.sizeLabel || !newVariant.sku) return;
    setSaving(true);
    try {
      const payload = {
        sizeLabel: newVariant.sizeLabel,
        sizeSystem: newVariant.sizeSystem || undefined,
        sizeValue: newVariant.sizeValue ? parseFloat(newVariant.sizeValue) : undefined,
        sku: newVariant.sku,
        stock: parseInt(newVariant.stock) || 1,
        priceOverride: newVariant.priceOverride ? parseFloat(newVariant.priceOverride) : undefined,
      };
      await variantsApi.createVariant(selectedItem.id, payload);
      setNewVariant({ sizeLabel: '', sizeSystem: 'US', sizeValue: '', sku: '', stock: '1', priceOverride: '' });
      selectItem(selectedItem);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add variant');
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(variantId: string) {
    if (!selectedItem || !confirm('Delete this variant?')) return;
    try {
      await variantsApi.deleteVariant(selectedItem.id, variantId);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete variant');
    }
  }

  async function toggleVariantActive(variantId: string, isActive: boolean) {
    if (!selectedItem) return;
    try {
      await variantsApi.updateVariant(selectedItem.id, variantId, { isActive });
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, isActive } : v))
      );
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update');
    }
  }

  async function updateStock(variantId: string, stock: number) {
    if (!selectedItem) return;
    try {
      await variantsApi.updateVariant(selectedItem.id, variantId, { stock });
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, stock } : v))
      );
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update stock');
    }
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Ruler className="h-6 w-6" />
            <h1 className="text-2xl font-bold"><T>Size Variants</T></h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Item list */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base"><T>Products with Sizes</T></CardTitle>
                <CardDescription><T>Rings, bangles, bracelets, chains, necklaces</T></CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm"><T>Loading...</T></p>
                ) : items.length === 0 ? (
                  <p className="text-muted-foreground text-sm"><T>No size-eligible products</T></p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => selectItem(item)}
                        className={`w-full text-left p-3 border rounded-lg transition-colors ${
                          selectedItem?.id === item.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{item.nameEn}</span>
                          {item.hasSizes && (
                            <Badge variant="secondary" className="text-xs ml-1">Sized</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.jewelleryType} · {item.sku || item.id.slice(0, 8)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Variant management */}
            <div className="lg:col-span-2 space-y-4">
              {!selectedItem ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground"><T>Select a product to manage size variants</T></p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Toggle sizes */}
                  <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedItem.nameEn}</p>
                        <p className="text-sm text-muted-foreground">{selectedItem.jewelleryType}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="hasSizes" className="text-sm"><T>Enable Sizes</T></Label>
                        <Switch
                          id="hasSizes"
                          checked={selectedItem.hasSizes}
                          onCheckedChange={toggleSizes}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {selectedItem.hasSizes && (
                    <>
                      {/* Existing variants */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base"><T>Current Variants</T></CardTitle>
                        </CardHeader>
                        <CardContent>
                          {variants.length === 0 ? (
                            <p className="text-muted-foreground text-sm"><T>No variants yet</T></p>
                          ) : (
                            <div className="space-y-2">
                              {variants.map((v) => (
                                <div key={v.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                  <div className="flex-1">
                                    <span className="font-medium">{v.sizeLabel}</span>
                                    {v.sizeSystem && (
                                      <span className="text-xs text-muted-foreground ml-1">({v.sizeSystem})</span>
                                    )}
                                    <p className="text-xs text-muted-foreground">SKU: {v.sku}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      value={v.stock}
                                      onChange={(e) => updateStock(v.id, parseInt(e.target.value) || 0)}
                                      className="w-20 h-8 text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground">stock</span>
                                  </div>
                                  {v.priceOverride && (
                                    <Badge variant="outline" className="text-xs">
                                      {v.priceOverride}
                                    </Badge>
                                  )}
                                  <Switch
                                    checked={v.isActive}
                                    onCheckedChange={(checked) => toggleVariantActive(v.id, checked)}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteVariant(v.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Add new variant */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base"><T>Add Variant</T></CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Size Label *</Label>
                              <Select
                                value={newVariant.sizeLabel}
                                onValueChange={(v) => {
                                  const entry = sizeChart.find((s) => s.sizeLabel === v);
                                  setNewVariant((prev) => ({
                                    ...prev,
                                    sizeLabel: v,
                                    sizeValue: entry?.sizeValue?.toString() || prev.sizeValue,
                                    sizeSystem: entry?.sizeSystem || prev.sizeSystem,
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pick size" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sizeChart.length > 0 ? (
                                    sizeChart.map((s) => (
                                      <SelectItem key={s.sizeLabel} value={s.sizeLabel}>
                                        {s.sizeLabel} ({s.sizeSystem} — {s.diameterMm}mm)
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                      ))}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">SKU *</Label>
                              <Input
                                value={newVariant.sku}
                                onChange={(e) => setNewVariant((p) => ({ ...p, sku: e.target.value }))}
                                placeholder="RING-GOLD-7"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Stock</Label>
                              <Input
                                type="number"
                                min={0}
                                value={newVariant.stock}
                                onChange={(e) => setNewVariant((p) => ({ ...p, stock: e.target.value }))}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Size System</Label>
                              <Select
                                value={newVariant.sizeSystem}
                                onValueChange={(v) => setNewVariant((p) => ({ ...p, sizeSystem: v }))}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['US', 'UK', 'EU', 'INDIAN', 'JP'].map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Size Value</Label>
                              <Input
                                type="number"
                                step="0.5"
                                value={newVariant.sizeValue}
                                onChange={(e) => setNewVariant((p) => ({ ...p, sizeValue: e.target.value }))}
                                placeholder="7"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Price Override</Label>
                              <Input
                                type="number"
                                value={newVariant.priceOverride}
                                onChange={(e) => setNewVariant((p) => ({ ...p, priceOverride: e.target.value }))}
                                placeholder="Optional"
                                className="h-8"
                              />
                            </div>
                          </div>
                          <Button
                            className="mt-3"
                            size="sm"
                            onClick={addVariant}
                            disabled={saving || !newVariant.sizeLabel || !newVariant.sku}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {saving ? t('Adding...') : t('Add Variant')}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Size chart reference */}
                      {sizeChart.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base"><T>Size Chart Reference</T></CardTitle>
                            <CardDescription>
                              {t(`Standard sizes for ${selectedItem.jewelleryType}`)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-1 px-2">Label</th>
                                    <th className="text-left py-1 px-2">System</th>
                                    <th className="text-left py-1 px-2">Value</th>
                                    <th className="text-left py-1 px-2">Diameter (mm)</th>
                                    <th className="text-left py-1 px-2">Region</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sizeChart.map((s, i) => (
                                    <tr key={i} className="border-b">
                                      <td className="py-1 px-2 font-medium">{s.sizeLabel}</td>
                                      <td className="py-1 px-2">{s.sizeSystem}</td>
                                      <td className="py-1 px-2">{s.sizeValue}</td>
                                      <td className="py-1 px-2">{s.diameterMm}</td>
                                      <td className="py-1 px-2">{s.region}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
