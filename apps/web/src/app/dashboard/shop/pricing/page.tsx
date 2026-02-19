'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Percent,
  Save,
  Loader2,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface ShopPricing {
  defaultMakingChargePercent: number;
  defaultMarginPercent: number;
  metalOverrides: Array<{
    metalType: string;
    purity: string;
    makingChargePercent: number;
    marginPercent: number;
  }>;
}

const defaultMetals = [
  { metalType: 'GOLD', purity: '24K', label: 'Gold 24K' },
  { metalType: 'GOLD', purity: '22K', label: 'Gold 22K' },
  { metalType: 'GOLD', purity: '18K', label: 'Gold 18K' },
  { metalType: 'SILVER', purity: '999', label: 'Silver 999' },
  { metalType: 'SILVER', purity: '925', label: 'Silver 925' },
  { metalType: 'PLATINUM', purity: '950', label: 'Platinum 950' },
];

export default function ShopPricingPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [defaultMakingCharge, setDefaultMakingCharge] = useState('10');
  const [defaultMargin, setDefaultMargin] = useState('2');
  const [overrides, setOverrides] = useState<Record<string, { making: string; margin: string }>>({});

  useEffect(() => {
    if (user?.shop?.id) {
      loadPricing();
    }
  }, [user?.shop?.id]);

  const loadPricing = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/shops/my-shop');
      const shop = response.data;
      
      if (shop.defaultMakingChargePercent) {
        setDefaultMakingCharge(shop.defaultMakingChargePercent.toString());
      }
      if (shop.defaultMarginPercent) {
        setDefaultMargin(shop.defaultMarginPercent.toString());
      }
      
      // Load metal overrides if they exist
      if (shop.metalRates) {
        const overrideMap: Record<string, { making: string; margin: string }> = {};
        shop.metalRates.forEach((rate: any) => {
          const key = `${rate.metalType}_${rate.purity}`;
          overrideMap[key] = {
            making: rate.makingChargePercent?.toString() || '',
            margin: rate.marginPercent?.toString() || '',
          };
        });
        setOverrides(overrideMap);
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load pricing',
        description: 'Could not fetch pricing settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverrideChange = (
    metalType: string,
    purity: string,
    field: 'making' | 'margin',
    value: string
  ) => {
    const key = `${metalType}_${purity}`;
    setOverrides((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const savePricing = async () => {
    setIsSaving(true);
    try {
      // Save default rates
      await api.patch(`/api/shops/${user?.shop?.id}`, {
        defaultMakingChargePercent: parseFloat(defaultMakingCharge) || 10,
        defaultMarginPercent: parseFloat(defaultMargin) || 2,
      });

      // Save metal overrides
      const metalRates = Object.entries(overrides)
        .filter(([_, values]) => values.making || values.margin)
        .map(([key, values]) => {
          const [metalType, purity] = key.split('_');
          return {
            metalType,
            purity,
            makingChargePercent: parseFloat(values.making) || undefined,
            marginPercent: parseFloat(values.margin) || undefined,
          };
        });

      if (metalRates.length > 0) {
        await api.patch(`/api/shops/${user?.shop?.id}/metal-rates`, { metalRates });
      }

      toast({
        title: 'Settings Saved',
        description: 'Your pricing settings have been updated',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.response?.data?.message || 'Could not save settings',
      });
    } finally {
      setIsSaving(false);
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pricing Settings</h1>
              <p className="text-muted-foreground">
                Configure your shop's making charges and margins
              </p>
            </div>
            <Button onClick={savePricing} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Default Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Default Rates
              </CardTitle>
              <CardDescription>
                These rates apply to all metals unless overridden below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultMaking">Default Making Charge (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="defaultMaking"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={defaultMakingCharge}
                      onChange={(e) => setDefaultMakingCharge(e.target.value)}
                      className="w-32"
                    />
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Charged on top of metal value for craftsmanship
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultMargin">Default Margin (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="defaultMargin"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={defaultMargin}
                      onChange={(e) => setDefaultMargin(e.target.value)}
                      className="w-32"
                    />
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added to base metal price as profit margin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metal-specific Overrides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Metal-Specific Overrides
              </CardTitle>
              <CardDescription>
                Set custom rates for specific metals. Leave blank to use defaults.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metal</TableHead>
                    <TableHead>Making Charge (%)</TableHead>
                    <TableHead>Margin (%)</TableHead>
                    <TableHead>Effective Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultMetals.map((metal) => {
                    const key = `${metal.metalType}_${metal.purity}`;
                    const override = overrides[key] || { making: '', margin: '' };
                    const effectiveMaking = override.making || defaultMakingCharge;
                    const effectiveMargin = override.margin || defaultMargin;
                    
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{metal.label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder={defaultMakingCharge}
                            value={override.making}
                            onChange={(e) =>
                              handleOverrideChange(metal.metalType, metal.purity, 'making', e.target.value)
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder={defaultMargin}
                            value={override.margin}
                            onChange={(e) =>
                              handleOverrideChange(metal.metalType, metal.purity, 'margin', e.target.value)
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {effectiveMaking}% + {effectiveMargin}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">How Pricing Works</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>
                  <strong>Making Charge:</strong> Percentage added to metal value for craftsmanship
                </li>
                <li>
                  <strong>Margin:</strong> Your profit margin on the base metal price
                </li>
                <li>
                  Final Price = Metal Value × (1 + Margin%) + (Metal Value × Making Charge%)
                </li>
                <li>
                  Taxes are calculated separately based on the customer's region
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
