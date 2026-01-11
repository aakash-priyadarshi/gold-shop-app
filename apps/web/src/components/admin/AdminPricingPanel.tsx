'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Settings,
  DollarSign,
  Gem,
  Palette,
  Percent,
  Save,
  RefreshCw,
  AlertCircle,
  Check,
  Store,
  Globe,
  Loader2,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

const API_URL = getApiUrl();

// Types
interface MetalPrice {
  code: string;
  displayName: string;
  apiRate: number;
  overrideRate: number | null;
  marginPercent: number;
  finalRate: number;
  source: 'API' | 'OVERRIDE' | 'HYBRID';
  isEnabled: boolean;
}

interface GemstonePrice {
  stoneType: string;
  origin: string;
  qualityGrade: string;
  sizeRange: string;
  pricePerUnit: number;
  unit: 'CARAT' | 'MM' | 'PIECE';
  source: 'SYSTEM' | 'MANUAL';
}

interface FinishPrice {
  finishType: string;
  tier: string;
  basePrice: number;
  pricingModel: 'FIXED' | 'PERCENTAGE' | 'PER_GRAM';
  percentageValue?: number;
  perGramRate?: number;
}

interface ShopOverride {
  shopId: string;
  shopName: string;
  overrideType: string;
  itemCode: string;
  overrideMode: 'FIXED' | 'PERCENTAGE' | 'MULTIPLIER';
  overrideValue: number;
  isActive: boolean;
}

export function AdminPricingPanel() {
  const [activeTab, setActiveTab] = useState('metals');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // State for each pricing category
  const [metalPrices, setMetalPrices] = useState<MetalPrice[]>([]);
  const [gemstonePrices, setGemstonePrices] = useState<GemstonePrice[]>([]);
  const [finishPrices, setFinishPrices] = useState<FinishPrice[]>([]);
  const [shopOverrides, setShopOverrides] = useState<ShopOverride[]>([]);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');

  // Global settings
  const [globalSettings, setGlobalSettings] = useState({
    useApiForMetals: true,
    defaultMakingChargePercent: 12,
    platformFeePercent: 1,
    autoSyncInterval: 60, // minutes
  });

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    setLoading(true);
    try {
      // In real app, fetch from API
      // const [metals, gems, finishes, shops] = await Promise.all([...]);
      
      // Mock data for demo
      setMetalPrices(getMockMetalPrices());
      setGemstonePrices(getMockGemstonePrices());
      setFinishPrices(getMockFinishPrices());
      setShops([
        { id: 'shop-1', name: 'Ramesh Gold House' },
        { id: 'shop-2', name: 'Suna Jewellers' },
      ]);
      setShopOverrides(getMockShopOverrides());
    } catch (error) {
      console.error('Failed to load pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      console.log('Saving pricing data...', { metalPrices, gemstonePrices, finishPrices, globalSettings });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateMetalPrice = (code: string, field: keyof MetalPrice, value: any) => {
    setMetalPrices(prev => prev.map(metal => {
      if (metal.code !== code) return metal;
      
      const updated = { ...metal, [field]: value };
      
      // Recalculate final rate
      if (updated.source === 'OVERRIDE' && updated.overrideRate !== null) {
        updated.finalRate = updated.overrideRate;
      } else if (updated.source === 'HYBRID') {
        updated.finalRate = updated.apiRate * (1 + (updated.marginPercent / 100));
      } else {
        updated.finalRate = updated.apiRate;
      }
      
      return updated;
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-gold-500" />
              Pricing Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure system-wide pricing, API overrides, and seller-specific rates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadPricingData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Global Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Global Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Use Live API for Metals
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      When enabled, metal prices are fetched from MetalpriceAPI
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Switch
                  checked={globalSettings.useApiForMetals}
                  onCheckedChange={(v) => setGlobalSettings(prev => ({ ...prev, useApiForMetals: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Making Charge %</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={globalSettings.defaultMakingChargePercent}
                  onChange={(e) => setGlobalSettings(prev => ({ 
                    ...prev, 
                    defaultMakingChargePercent: parseFloat(e.target.value) 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform Fee %</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={globalSettings.platformFeePercent}
                  onChange={(e) => setGlobalSettings(prev => ({ 
                    ...prev, 
                    platformFeePercent: parseFloat(e.target.value) 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Auto-sync Interval (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={globalSettings.autoSyncInterval}
                  onChange={(e) => setGlobalSettings(prev => ({ 
                    ...prev, 
                    autoSyncInterval: parseInt(e.target.value) 
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="metals" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Metals
            </TabsTrigger>
            <TabsTrigger value="gemstones" className="flex items-center gap-1">
              <Gem className="h-4 w-4" />
              Gems
            </TabsTrigger>
            <TabsTrigger value="finishes" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Finishes
            </TabsTrigger>
            <TabsTrigger value="sellers" className="flex items-center gap-1">
              <Store className="h-4 w-4" />
              Sellers
            </TabsTrigger>
          </TabsList>

          {/* Metals Tab */}
          <TabsContent value="metals" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Metal Pricing</CardTitle>
                <CardDescription>
                  Configure metal rates - API-driven, fixed override, or hybrid (API + margin)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metal</TableHead>
                      <TableHead>API Rate ($/oz)</TableHead>
                      <TableHead>Source Mode</TableHead>
                      <TableHead>Override Rate</TableHead>
                      <TableHead>Margin %</TableHead>
                      <TableHead>Final Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metalPrices.map((metal) => (
                      <TableRow key={metal.code}>
                        <TableCell className="font-medium">{metal.displayName}</TableCell>
                        <TableCell>${metal.apiRate.toLocaleString()}</TableCell>
                        <TableCell>
                          <Select
                            value={metal.source}
                            onValueChange={(v) => updateMetalPrice(metal.code, 'source', v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="API">API Only</SelectItem>
                              <SelectItem value="OVERRIDE">Override</SelectItem>
                              <SelectItem value="HYBRID">API + Margin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24"
                            disabled={metal.source === 'API'}
                            value={metal.overrideRate || ''}
                            onChange={(e) => updateMetalPrice(metal.code, 'overrideRate', parseFloat(e.target.value))}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            disabled={metal.source !== 'HYBRID'}
                            value={metal.marginPercent}
                            onChange={(e) => updateMetalPrice(metal.code, 'marginPercent', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ${metal.finalRate.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={metal.isEnabled}
                            onCheckedChange={(v) => updateMetalPrice(metal.code, 'isEnabled', v)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gemstones Tab */}
          <TabsContent value="gemstones" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Gemstone Pricing</CardTitle>
                <CardDescription>
                  Configure base prices per carat/mm for each stone type and quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stone Type</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Size Range</TableHead>
                      <TableHead>Price/Unit</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gemstonePrices.map((gem, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{gem.stoneType}</TableCell>
                        <TableCell>
                          <Badge variant={gem.origin === 'LAB' ? 'secondary' : 'outline'}>
                            {gem.origin}
                          </Badge>
                        </TableCell>
                        <TableCell>{gem.qualityGrade}</TableCell>
                        <TableCell>{gem.sizeRange}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24"
                            value={gem.pricePerUnit}
                            onChange={(e) => {
                              const updated = [...gemstonePrices];
                              updated[idx] = { ...gem, pricePerUnit: parseFloat(e.target.value) };
                              setGemstonePrices(updated);
                            }}
                          />
                        </TableCell>
                        <TableCell>${gem.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finishes Tab */}
          <TabsContent value="finishes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Finish & Plating Pricing</CardTitle>
                <CardDescription>
                  Configure pricing for surface finishes and plating options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finish Type</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Pricing Model</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>% Value</TableHead>
                      <TableHead>Per Gram</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finishPrices.map((finish, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{finish.finishType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{finish.tier}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={finish.pricingModel}
                            onValueChange={(v) => {
                              const updated = [...finishPrices];
                              updated[idx] = { ...finish, pricingModel: v as any };
                              setFinishPrices(updated);
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                              <SelectItem value="PERCENTAGE">% of MC</SelectItem>
                              <SelectItem value="PER_GRAM">Per Gram</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            value={finish.basePrice}
                            onChange={(e) => {
                              const updated = [...finishPrices];
                              updated[idx] = { ...finish, basePrice: parseFloat(e.target.value) };
                              setFinishPrices(updated);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-16"
                            disabled={finish.pricingModel !== 'PERCENTAGE'}
                            value={finish.percentageValue || ''}
                            onChange={(e) => {
                              const updated = [...finishPrices];
                              updated[idx] = { ...finish, percentageValue: parseFloat(e.target.value) };
                              setFinishPrices(updated);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-16"
                            disabled={finish.pricingModel !== 'PER_GRAM'}
                            value={finish.perGramRate || ''}
                            onChange={(e) => {
                              const updated = [...finishPrices];
                              updated[idx] = { ...finish, perGramRate: parseFloat(e.target.value) };
                              setFinishPrices(updated);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Seller Price Overrides</CardTitle>
                    <CardDescription>
                      Configure shop-specific pricing that overrides system defaults
                    </CardDescription>
                  </div>
                  <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select a shop..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {selectedShopId ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Override Type</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shopOverrides
                        .filter(o => o.shopId === selectedShopId)
                        .map((override, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge variant="outline">{override.overrideType}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{override.itemCode}</TableCell>
                            <TableCell>
                              <Select
                                value={override.overrideMode}
                                onValueChange={(v) => {
                                  const updated = [...shopOverrides];
                                  const realIdx = shopOverrides.findIndex(
                                    o => o.shopId === selectedShopId && o.itemCode === override.itemCode
                                  );
                                  updated[realIdx] = { ...override, overrideMode: v as any };
                                  setShopOverrides(updated);
                                }}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="FIXED">Fixed Rate</SelectItem>
                                  <SelectItem value="PERCENTAGE">% Addon</SelectItem>
                                  <SelectItem value="MULTIPLIER">Multiplier</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="w-24"
                                value={override.overrideValue}
                                onChange={(e) => {
                                  const updated = [...shopOverrides];
                                  const realIdx = shopOverrides.findIndex(
                                    o => o.shopId === selectedShopId && o.itemCode === override.itemCode
                                  );
                                  updated[realIdx] = { ...override, overrideValue: parseFloat(e.target.value) };
                                  setShopOverrides(updated);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={override.isActive}
                                onCheckedChange={(v) => {
                                  const updated = [...shopOverrides];
                                  const realIdx = shopOverrides.findIndex(
                                    o => o.shopId === selectedShopId && o.itemCode === override.itemCode
                                  );
                                  updated[realIdx] = { ...override, isActive: v };
                                  setShopOverrides(updated);
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Select a shop to view and edit their price overrides</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Mock data generators
function getMockMetalPrices(): MetalPrice[] {
  return [
    { code: 'GOLD_24K', displayName: 'Gold 24K (999)', apiRate: 2350, overrideRate: null, marginPercent: 2, finalRate: 2397, source: 'HYBRID', isEnabled: true },
    { code: 'GOLD_22K', displayName: 'Gold 22K (916)', apiRate: 2154, overrideRate: null, marginPercent: 2, finalRate: 2197, source: 'HYBRID', isEnabled: true },
    { code: 'GOLD_18K', displayName: 'Gold 18K (750)', apiRate: 1763, overrideRate: null, marginPercent: 2, finalRate: 1798, source: 'HYBRID', isEnabled: true },
    { code: 'SILVER_999', displayName: 'Silver 999', apiRate: 28, overrideRate: null, marginPercent: 3, finalRate: 28.84, source: 'HYBRID', isEnabled: true },
    { code: 'SILVER_925', displayName: 'Silver 925', apiRate: 26, overrideRate: null, marginPercent: 3, finalRate: 26.78, source: 'HYBRID', isEnabled: true },
    { code: 'PLATINUM_950', displayName: 'Platinum 950', apiRate: 980, overrideRate: null, marginPercent: 1, finalRate: 989.8, source: 'API', isEnabled: true },
  ];
}

function getMockGemstonePrices(): GemstonePrice[] {
  return [
    { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'PREMIUM', sizeRange: '0.5-1ct', pricePerUnit: 5000, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'STANDARD', sizeRange: '0.5-1ct', pricePerUnit: 2000, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'PREMIUM', sizeRange: '0.5-1ct', pricePerUnit: 1000, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'PREMIUM', sizeRange: '1-2ct', pricePerUnit: 300, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'PREMIUM', sizeRange: '3-5mm', pricePerUnit: 1000, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'PREMIUM', sizeRange: '3-5mm', pricePerUnit: 800, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'PREMIUM', sizeRange: '3-5mm', pricePerUnit: 1200, unit: 'CARAT', source: 'SYSTEM' },
    { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'STANDARD', sizeRange: '2-4mm', pricePerUnit: 5, unit: 'PIECE', source: 'SYSTEM' },
  ];
}

function getMockFinishPrices(): FinishPrice[] {
  return [
    { finishType: 'GOLD_PLATING', tier: 'LIGHT', basePrice: 5, pricingModel: 'PER_GRAM', perGramRate: 0.5 },
    { finishType: 'GOLD_PLATING', tier: 'STANDARD', basePrice: 10, pricingModel: 'PER_GRAM', perGramRate: 1.0 },
    { finishType: 'GOLD_PLATING', tier: 'PREMIUM', basePrice: 20, pricingModel: 'PER_GRAM', perGramRate: 2.0 },
    { finishType: 'VERMEIL', tier: 'STANDARD', basePrice: 25, pricingModel: 'FIXED' },
    { finishType: 'VERMEIL', tier: 'PREMIUM', basePrice: 40, pricingModel: 'FIXED' },
    { finishType: 'RHODIUM_PLATING', tier: 'STANDARD', basePrice: 18, pricingModel: 'FIXED' },
    { finishType: 'PVD_COATING', tier: 'STANDARD', basePrice: 15, pricingModel: 'FIXED' },
    { finishType: 'MATTE', tier: 'STANDARD', basePrice: 3, pricingModel: 'FIXED' },
    { finishType: 'BRUSHED', tier: 'STANDARD', basePrice: 4, pricingModel: 'FIXED' },
    { finishType: 'HAMMERED', tier: 'STANDARD', basePrice: 0, pricingModel: 'PERCENTAGE', percentageValue: 5 },
    { finishType: 'DIAMOND_CUT', tier: 'STANDARD', basePrice: 0, pricingModel: 'PERCENTAGE', percentageValue: 10 },
  ];
}

function getMockShopOverrides(): ShopOverride[] {
  return [
    { shopId: 'shop-1', shopName: 'Ramesh Gold House', overrideType: 'METAL_RATE', itemCode: 'GOLD_24K', overrideMode: 'FIXED', overrideValue: 11500, isActive: true },
    { shopId: 'shop-1', shopName: 'Ramesh Gold House', overrideType: 'METAL_RATE', itemCode: 'GOLD_22K', overrideMode: 'FIXED', overrideValue: 10800, isActive: true },
    { shopId: 'shop-1', shopName: 'Ramesh Gold House', overrideType: 'MAKING_CHARGE', itemCode: 'DEFAULT', overrideMode: 'PERCENTAGE', overrideValue: 12, isActive: true },
    { shopId: 'shop-2', shopName: 'Suna Jewellers', overrideType: 'METAL_RATE', itemCode: 'GOLD_24K', overrideMode: 'FIXED', overrideValue: 11300, isActive: true },
    { shopId: 'shop-2', shopName: 'Suna Jewellers', overrideType: 'METAL_RATE', itemCode: 'GOLD_22K', overrideMode: 'FIXED', overrideValue: 10600, isActive: true },
    { shopId: 'shop-2', shopName: 'Suna Jewellers', overrideType: 'MAKING_CHARGE', itemCode: 'DEFAULT', overrideMode: 'PERCENTAGE', overrideValue: 10, isActive: true },
  ];
}

export default AdminPricingPanel;
