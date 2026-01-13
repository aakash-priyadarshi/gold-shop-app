'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Store,
  MapPin,
  Settings,
  Save,
  Loader2,
  Globe,
  Phone,
  Mail,
  CreditCard,
  Building2,
  Wallet,
  Info,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { shopsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface ShopData {
  id: string;
  shopName: string;
  shopNameNe?: string;
  shopNameHi?: string;
  description?: string;
  descriptionNe?: string;
  descriptionHi?: string;
  country: string;
  state?: string;
  city: string;
  address: string;
  pincode?: string;
  contactPhone: string;
  contactEmail?: string;
  whatsappNumber?: string;
  isVerified: boolean;
  isActive: boolean;
  codEnabled: boolean;
  codMaxValueNpr?: number;
  makingChargePercent: number;
  minOrderValueNpr: number;
  maxOrderValueNpr?: number;
  bankAccountDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    branchName?: string;
    swiftCode?: string;
  };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    preferredCurrency: string;
  };
}

const countries = [
  { code: 'NP', name: 'Nepal', currency: 'NPR' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AE', name: 'UAE', currency: 'AED' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
];

const currencies = [
  { code: 'NPR', name: 'Nepali Rupee (रू)', symbol: 'रू' },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$' },
  { code: 'AED', name: 'UAE Dirham (د.إ)', symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
];

export default function ShopSettingsPage() {
  const { user } = useAuth();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.shop?.id) {
      loadSettings();
    }
  }, [user?.shop?.id]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await shopsApi.getSettings();
      const data = response.data;
      
      // Handle both formats: { shop, user } or direct shop object
      const shop = data.shop || data;
      const userData = data.user || shop.user;
      
      setShopData({
        ...shop,
        user: userData,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load settings',
        description: 'Could not fetch shop settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!shopData) return;

    setIsSaving(true);
    try {
      await shopsApi.updateSettings({
        shopName: shopData.shopName,
        shopNameNe: shopData.shopNameNe,
        description: shopData.description,
        country: shopData.country,
        state: shopData.state,
        city: shopData.city,
        address: shopData.address,
        pincode: shopData.pincode,
        contactPhone: shopData.contactPhone,
        contactEmail: shopData.contactEmail,
        whatsappNumber: shopData.whatsappNumber,
        isActive: shopData.isActive,
        codEnabled: shopData.codEnabled,
        codMaxValueNpr: shopData.codMaxValueNpr,
        makingChargePercent: shopData.makingChargePercent,
        minOrderValueNpr: shopData.minOrderValueNpr,
        maxOrderValueNpr: shopData.maxOrderValueNpr,
        bankAccountDetails: shopData.bankAccountDetails,
      });
      toast({
        title: 'Settings Saved',
        description: 'Your shop settings have been updated successfully',
      });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.response?.data?.message || 'Could not save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateShopData = (updates: Partial<ShopData>) => {
    if (shopData) {
      setShopData({ ...shopData, ...updates });
    }
  };

  const updateBankDetails = (updates: Partial<NonNullable<ShopData['bankAccountDetails']>>) => {
    if (shopData) {
      setShopData({
        ...shopData,
        bankAccountDetails: { ...shopData.bankAccountDetails, ...updates },
      });
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

  if (!shopData) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">Settings Not Found</h2>
            <p className="text-muted-foreground">Could not load shop settings.</p>
            <Button onClick={loadSettings} className="mt-4">
              Retry
            </Button>
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Shop Settings</h1>
              <p className="text-muted-foreground">
                Manage your shop profile and preferences
              </p>
            </div>
            <div className="flex items-center gap-2">
              {shopData.isVerified ? (
                <Badge variant="default" className="bg-green-500">Verified</Badge>
              ) : (
                <Badge variant="secondary">Pending Verification</Badge>
              )}
              <Button onClick={saveSettings} disabled={isSaving}>
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
          </div>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="payments">Payment Methods</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Shop Information
                  </CardTitle>
                  <CardDescription>
                    Basic information about your shop
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shopName">Shop Name (English) *</Label>
                      <Input
                        id="shopName"
                        value={shopData.shopName || ''}
                        onChange={(e) => updateShopData({ shopName: e.target.value })}
                        placeholder="Your Shop Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopNameNe">Shop Name (नेपाली)</Label>
                      <Input
                        id="shopNameNe"
                        value={shopData.shopNameNe || ''}
                        onChange={(e) => updateShopData({ shopNameNe: e.target.value })}
                        placeholder="तपाईंको पसलको नाम"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={shopData.description || ''}
                      onChange={(e) => updateShopData({ description: e.target.value })}
                      rows={4}
                      placeholder="Tell customers about your shop, specialties, and history..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        value={shopData.contactPhone || ''}
                        onChange={(e) => updateShopData({ contactPhone: e.target.value })}
                        placeholder="+977 98XXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Business Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={shopData.contactEmail || ''}
                        onChange={(e) => updateShopData({ contactEmail: e.target.value })}
                        placeholder="shop@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp Number</Label>
                      <Input
                        id="whatsapp"
                        value={shopData.whatsappNumber || ''}
                        onChange={(e) => updateShopData({ whatsappNumber: e.target.value })}
                        placeholder="+977 98XXXXXXXX"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shop Location
                  </CardTitle>
                  <CardDescription>
                    Where customers can find your physical store
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select
                        value={shopData.country || 'NP'}
                        onValueChange={(value) => updateShopData({ country: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        This determines your market rates and tax rules
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={shopData.state || ''}
                        onChange={(e) => updateShopData({ state: e.target.value })}
                        placeholder="Bagmati"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shopData.city || ''}
                        onChange={(e) => updateShopData({ city: e.target.value })}
                        placeholder="Kathmandu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Postal Code</Label>
                      <Input
                        id="pincode"
                        value={shopData.pincode || ''}
                        onChange={(e) => updateShopData({ pincode: e.target.value })}
                        placeholder="44600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address *</Label>
                    <Textarea
                      id="address"
                      value={shopData.address || ''}
                      onChange={(e) => updateShopData({ address: e.target.value })}
                      rows={2}
                      placeholder="Street address, building, floor..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Shop Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure your shop's operational settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Shop Active</Label>
                      <p className="text-sm text-muted-foreground">
                        Make your shop visible to customers
                      </p>
                    </div>
                    <Switch
                      checked={shopData.isActive ?? true}
                      onCheckedChange={(checked) => updateShopData({ isActive: checked })}
                    />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Currency & Region
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <p className="text-sm text-blue-700">
                        Your country determines market rates. Currency is for display purposes - 
                        all prices are stored in your market's base currency and converted automatically.
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Pricing Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="makingCharge">Default Making Charge (%)</Label>
                        <Input
                          id="makingCharge"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={shopData.makingChargePercent ?? 10}
                          onChange={(e) => updateShopData({ makingChargePercent: parseFloat(e.target.value) || 10 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Applied to all materials if not specified individually
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minOrder">Minimum Order Value</Label>
                        <Input
                          id="minOrder"
                          type="number"
                          value={shopData.minOrderValueNpr ?? 0}
                          onChange={(e) => updateShopData({ minOrderValueNpr: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 10000"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Methods Tab */}
            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Configure how customers can pay you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cash on Delivery / Pay at Shop */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Cash on Delivery / Pay at Shop
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to pay when they collect their order
                      </p>
                    </div>
                    <Switch
                      checked={shopData.codEnabled ?? false}
                      onCheckedChange={(checked) => updateShopData({ codEnabled: checked })}
                    />
                  </div>
                  
                  {shopData.codEnabled && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="codMax">Maximum COD Value</Label>
                      <Input
                        id="codMax"
                        type="number"
                        value={shopData.codMaxValueNpr || ''}
                        onChange={(e) => updateShopData({ codMaxValueNpr: parseInt(e.target.value) || undefined })}
                        placeholder="e.g., 100000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty for no limit
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-4">
                      <Building2 className="h-4 w-4" />
                      Bank Account Details
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      For receiving bank transfers from customers
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          value={shopData.bankAccountDetails?.bankName || ''}
                          onChange={(e) => updateBankDetails({ bankName: e.target.value })}
                          placeholder="Nepal Bank Limited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branchName">Branch Name</Label>
                        <Input
                          id="branchName"
                          value={shopData.bankAccountDetails?.branchName || ''}
                          onChange={(e) => updateBankDetails({ branchName: e.target.value })}
                          placeholder="New Road Branch"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Holder Name</Label>
                        <Input
                          id="accountName"
                          value={shopData.bankAccountDetails?.accountName || ''}
                          onChange={(e) => updateBankDetails({ accountName: e.target.value })}
                          placeholder="Shop Owner Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          value={shopData.bankAccountDetails?.accountNumber || ''}
                          onChange={(e) => updateBankDetails({ accountNumber: e.target.value })}
                          placeholder="0123456789012345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="swiftCode">SWIFT/BIC Code (for international)</Label>
                        <Input
                          id="swiftCode"
                          value={shopData.bankAccountDetails?.swiftCode || ''}
                          onChange={(e) => updateBankDetails({ swiftCode: e.target.value })}
                          placeholder="NBLNPKA"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 mb-2">Online Payments (Coming Soon)</h4>
                      <p className="text-sm text-amber-700">
                        Stripe integration for accepting credit/debit cards and international payments 
                        will be available soon. You'll be able to receive payments directly to your 
                        connected Stripe account.
                      </p>
                    </div>
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
