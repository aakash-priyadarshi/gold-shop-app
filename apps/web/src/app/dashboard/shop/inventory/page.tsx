'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gem,
  CircleDot,
  Hammer,
  Sparkles,
  Save,
  Loader2,
  Info,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { shopsApi, materialsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { usePreferencesStore, CURRENCIES, type CurrencyCode } from '@/store/preferences';

interface Material {
  metal: string;
  purity: string;
  isAvailable: boolean;
  makingChargePerGram?: number;
  minWeightGrams?: number;
  maxWeightGrams?: number;
}

interface MaterialsData {
  materials: Material[];
  supportedMaterials: string[]; // e.g., ["GOLD_24K", "GOLD_22K", "SILVER"]
}

interface CapabilitiesData {
  jewelleryTypes: string[];
  buildMethods: string[];
  finishes: string[];
}

interface MarketRate {
  metalCode: string;
  ratePerGram: number;
  source: string;
  country: string;
  validFrom: string;
}

const DEFAULT_MAKING_CHARGE_PERCENT = 10;

const allMaterials = [
  { metal: 'GOLD', purity: '24K', label: 'Gold 24K (Pure)' },
  { metal: 'GOLD', purity: '22K', label: 'Gold 22K' },
  { metal: 'GOLD', purity: '18K', label: 'Gold 18K' },
  { metal: 'GOLD', purity: '14K', label: 'Gold 14K' },
  { metal: 'SILVER', purity: '925', label: 'Sterling Silver (925)' },
  { metal: 'SILVER', purity: '999', label: 'Fine Silver (999)' },
  { metal: 'PLATINUM', purity: '950', label: 'Platinum 950' },
];

const allJewelleryTypes = [
  'RING',
  'NECKLACE',
  'PENDANT',
  'EARRING',
  'BRACELET',
  'BANGLE',
  'CHAIN',
  'ANKLET',
  'BROOCH',
  'TIE_PIN',
  'CUFFLINKS',
  'NOSE_PIN',
  'MAANG_TIKKA',
  'OTHER',
];

const allBuildMethods = [
  { value: 'METHOD_A', label: 'Method A - Standard Gold/Silver' },
  { value: 'METHOD_B', label: 'Method B - Gold Plated on Silver Core' },
  { value: 'METHOD_C', label: 'Method C - Hollow/Tube Construction' },
  { value: 'METHOD_D', label: 'Method D - Italian Machines (Chain/Bangle)' },
];

const allFinishes = [
  'POLISHED',
  'MATTE',
  'BRUSHED',
  'HAMMERED',
  'SANDBLASTED',
  'RHODIUM_PLATED',
  'ANTIQUE',
  'TWO_TONE',
];

export default function ShopInventoryPage() {
  const { user } = useAuth();
  const { currency } = usePreferencesStore();
  const [materialsData, setMaterialsData] = useState<MaterialsData | null>(null);
  const [capabilitiesData, setCapabilitiesData] = useState<CapabilitiesData | null>(null);
  const [marketRates, setMarketRates] = useState<MarketRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get currency symbol
  const currencySymbol = CURRENCIES[currency as CurrencyCode]?.symbol || 'Rs.';

  useEffect(() => {
    if (user?.shop?.id) {
      loadData();
    }
  }, [user?.shop?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [materialsRes, capabilitiesRes, ratesRes] = await Promise.all([
        shopsApi.getMaterials(),
        shopsApi.getCapabilities(),
        materialsApi.getMarketRates(),
      ]);
      setMaterialsData(materialsRes.data);
      setCapabilitiesData(capabilitiesRes.data);
      setMarketRates(ratesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load inventory',
        description: 'Could not fetch inventory data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMarketRates = async () => {
    setIsRefreshingRates(true);
    try {
      const ratesRes = await materialsApi.getMarketRates();
      setMarketRates(ratesRes.data || []);
      toast({
        title: 'Rates Refreshed',
        description: 'Market rates updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Could not refresh market rates',
      });
    } finally {
      setIsRefreshingRates(false);
    }
  };

  // Get market rate for a material
  const getMarketRate = (metal: string, purity: string): number | null => {
    const materialCode = `${metal}_${purity}`;
    const rate = marketRates.find(r => r.metalCode === materialCode);
    return rate?.ratePerGram ?? null;
  };

  // Calculate default making charge (10% of metal value)
  const getDefaultMakingCharge = (metal: string, purity: string): number => {
    const rate = getMarketRate(metal, purity);
    if (!rate) return 0;
    return Math.round(rate * DEFAULT_MAKING_CHARGE_PERCENT / 100);
  };

  const saveMaterials = async () => {
    if (!materialsData) return;

    setIsSaving(true);
    try {
      await shopsApi.updateMaterials(materialsData);
      toast({
        title: 'Materials Saved',
        description: 'Your material settings have been updated',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.response?.data?.message || 'Could not save materials',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveCapabilities = async () => {
    if (!capabilitiesData) return;

    setIsSaving(true);
    try {
      await shopsApi.updateCapabilities(capabilitiesData);
      toast({
        title: 'Capabilities Saved',
        description: 'Your capabilities have been updated',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.response?.data?.message || 'Could not save capabilities',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMaterial = (materialKey: string) => {
    if (!materialsData) return;

    const currentSupported = new Set(materialsData.supportedMaterials);
    if (currentSupported.has(materialKey)) {
      currentSupported.delete(materialKey);
    } else {
      currentSupported.add(materialKey);
    }

    setMaterialsData({
      ...materialsData,
      supportedMaterials: Array.from(currentSupported),
    });
  };

  const updateMaterialPricing = (materialKey: string, field: string, value: number) => {
    if (!materialsData) return;

    const materials = materialsData.materials.map((m) => {
      const key = `${m.metal}_${m.purity}`;
      if (key === materialKey) {
        return { ...m, [field]: value };
      }
      return m;
    });

    // If material doesn't exist, add it
    if (!materials.find((m) => `${m.metal}_${m.purity}` === materialKey)) {
      const [metal, purity] = materialKey.split('_');
      materials.push({
        metal,
        purity,
        isAvailable: true,
        [field]: value,
      });
    }

    setMaterialsData({ ...materialsData, materials });
  };

  const toggleJewelleryType = (type: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.jewelleryTypes);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      jewelleryTypes: Array.from(current),
    });
  };

  const toggleBuildMethod = (method: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.buildMethods);
    if (current.has(method)) {
      current.delete(method);
    } else {
      current.add(method);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      buildMethods: Array.from(current),
    });
  };

  const toggleFinish = (finish: string) => {
    if (!capabilitiesData) return;

    const current = new Set(capabilitiesData.finishes);
    if (current.has(finish)) {
      current.delete(finish);
    } else {
      current.add(finish);
    }

    setCapabilitiesData({
      ...capabilitiesData,
      finishes: Array.from(current),
    });
  };

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Inventory & Capabilities</h1>
            <p className="text-muted-foreground">
              Manage your materials, jewellery types, and build methods
            </p>
          </div>

          {/* Live Market Rates Card */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-base">
                  <TrendingUp className="h-5 w-5" />
                  Live Market Rates
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshMarketRates}
                  disabled={isRefreshingRates}
                  className="text-amber-700"
                >
                  {isRefreshingRates ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 dark:text-amber-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {allMaterials.slice(0, 4).map((mat) => {
                  const rate = getMarketRate(mat.metal, mat.purity);
                  return (
                    <div key={`${mat.metal}_${mat.purity}`} className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                      <div className="text-xs text-amber-700 dark:text-amber-400">{mat.label}</div>
                      <div className="text-lg font-bold text-amber-900 dark:text-amber-200">
                        {rate ? `${currencySymbol} ${rate.toLocaleString()}/g` : 'N/A'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white/30 dark:bg-black/10 rounded-lg p-3 space-y-2">
                <p className="font-medium">
                  <Info className="h-4 w-4 inline mr-1" />
                  How Pricing Works:
                </p>
                <p><strong>Total Price = (Metal Weight × Live Rate) + Making Charges</strong></p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Market Rate:</strong> Fetched live from FENEGOSIDA (Nepal) or international sources.</li>
                  <li><strong>Making Charges:</strong> Set your own per gram rate below, or leave blank for system default (10% of metal value).</li>
                  <li><strong>Example:</strong> 10g Gold 24K at {currencySymbol} {(getMarketRate('GOLD', '24K') || 12000).toLocaleString()}/g = {currencySymbol} {((getMarketRate('GOLD', '24K') || 12000) * 10).toLocaleString()} metal + {currencySymbol} {Math.round((getMarketRate('GOLD', '24K') || 12000) * 10 * 0.1).toLocaleString()} making = {currencySymbol} {Math.round((getMarketRate('GOLD', '24K') || 12000) * 10 * 1.1).toLocaleString()} total</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="materials" className="space-y-4">
            <TabsList>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="jewellery">Jewellery Types</TabsTrigger>
              <TabsTrigger value="methods">Build Methods</TabsTrigger>
              <TabsTrigger value="finishes">Finishes</TabsTrigger>
            </TabsList>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5" />
                    Supported Materials
                  </CardTitle>
                  <CardDescription>
                    Select the metals and purities you work with
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allMaterials.map((material) => {
                      const key = `${material.metal}_${material.purity}`;
                      const isSelected = materialsData?.supportedMaterials?.includes(key);
                      const materialData = materialsData?.materials?.find(
                        (m) => m.metal === material.metal && m.purity === material.purity
                      );
                      const liveRate = getMarketRate(material.metal, material.purity);
                      const defaultMaking = getDefaultMakingCharge(material.metal, material.purity);

                      return (
                        <Card
                          key={key}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleMaterial(key)}
                                />
                                <div>
                                  <Label className="cursor-pointer font-medium">
                                    {material.label}
                                  </Label>
                                  {liveRate && (
                                    <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      Live: {currencySymbol} {liveRate.toLocaleString()}/g
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-4 space-y-3 pl-6">
                                {liveRate && (
                                  <div className="bg-green-50 dark:bg-green-950/30 rounded p-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-green-700 dark:text-green-400">Live Rate:</span>
                                      <span className="font-medium">{currencySymbol} {liveRate.toLocaleString()}/g</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Default Making (10%):</span>
                                      <span>{currencySymbol} {defaultMaking.toLocaleString()}/g</span>
                                    </div>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Your Making Charge ({currencySymbol}/gram)
                                  </Label>
                                  <Input
                                    type="number"
                                    placeholder={`Default: ${defaultMaking || 'N/A'}`}
                                    value={materialData?.makingChargePerGram || ''}
                                    onChange={(e) =>
                                      updateMaterialPricing(
                                        key,
                                        'makingChargePerGram',
                                        parseFloat(e.target.value)
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Leave blank to use default (10% of metal value)
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Min Weight (g)
                                    </Label>
                                    <Input
                                      type="number"
                                      placeholder="1"
                                      value={materialData?.minWeightGrams || ''}
                                      onChange={(e) =>
                                        updateMaterialPricing(
                                          key,
                                          'minWeightGrams',
                                          parseFloat(e.target.value)
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Max Weight (g)
                                    </Label>
                                    <Input
                                      type="number"
                                      placeholder="100"
                                      value={materialData?.maxWeightGrams || ''}
                                      onChange={(e) =>
                                        updateMaterialPricing(
                                          key,
                                          'maxWeightGrams',
                                          parseFloat(e.target.value)
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveMaterials} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Jewellery Types Tab */}
            <TabsContent value="jewellery" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDot className="h-5 w-5" />
                    Jewellery Types
                  </CardTitle>
                  <CardDescription>
                    Select the types of jewellery you can make
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allJewelleryTypes.map((type) => {
                      const isSelected = capabilitiesData?.jewelleryTypes?.includes(type);
                      return (
                        <div
                          key={type}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                          }`}
                          onClick={() => toggleJewelleryType(type)}
                        >
                          <Checkbox checked={isSelected} />
                          <Label className="cursor-pointer">
                            {type.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Jewellery Types
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Build Methods Tab */}
            <TabsContent value="methods" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hammer className="h-5 w-5" />
                    Build Methods
                  </CardTitle>
                  <CardDescription>
                    Select the construction methods you support
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {allBuildMethods.map((method) => {
                      const isSelected = capabilitiesData?.buildMethods?.includes(method.value);
                      return (
                        <div
                          key={method.value}
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                          }`}
                          onClick={() => toggleBuildMethod(method.value)}
                        >
                          <Checkbox checked={isSelected} className="mt-1" />
                          <div>
                            <Label className="cursor-pointer font-medium">
                              {method.label}
                            </Label>
                            {method.value === 'METHOD_A' && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Standard solid gold or silver construction
                              </p>
                            )}
                            {method.value === 'METHOD_B' && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Silver core with gold plating overlay
                              </p>
                            )}
                            {method.value === 'METHOD_C' && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Hollow/tube construction for lightweight pieces
                              </p>
                            )}
                            {method.value === 'METHOD_D' && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Machine-made chains and bangles (Italian style)
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Build Methods
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finishes Tab */}
            <TabsContent value="finishes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Surface Finishes
                  </CardTitle>
                  <CardDescription>
                    Select the finishes you can apply
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allFinishes.map((finish) => {
                      const isSelected = capabilitiesData?.finishes?.includes(finish);
                      return (
                        <div
                          key={finish}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                          }`}
                          onClick={() => toggleFinish(finish)}
                        >
                          <Checkbox checked={isSelected} />
                          <Label className="cursor-pointer">
                            {finish.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveCapabilities} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Finishes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
