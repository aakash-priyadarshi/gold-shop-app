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
  Clock,
  Settings,
  Save,
  Loader2,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { shopsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface ShopSettings {
  name: string;
  description: string;
  phone: string;
  email: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  businessHours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  isActive: boolean;
  acceptingOrders: boolean;
  acceptingRfqs: boolean;
  displayCurrency: string;
  defaultCountry: string;
  minOrderValueNpr?: number;
  maxOrderValueNpr?: number;
  avgDeliveryDays?: number;
}

const countries = [
  { code: 'NP', name: 'Nepal' },
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
];

const currencies = [
  { code: 'NPR', name: 'Nepali Rupee (NPR)' },
  { code: 'INR', name: 'Indian Rupee (INR)' },
  { code: 'USD', name: 'US Dollar (USD)' },
];

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ShopSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
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
      setSettings(response.data);
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
    if (!settings) return;

    setIsSaving(true);
    try {
      await shopsApi.updateSettings(settings);
      toast({
        title: 'Settings Saved',
        description: 'Your shop settings have been updated',
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

  const updateSettings = (updates: Partial<ShopSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates });
    }
  };

  const updateAddress = (updates: Partial<ShopSettings['address']>) => {
    if (settings) {
      setSettings({
        ...settings,
        address: { ...settings.address, ...updates },
      });
    }
  };

  const updateBusinessHours = (day: string, type: 'open' | 'close', value: string) => {
    if (settings) {
      setSettings({
        ...settings,
        businessHours: {
          ...settings.businessHours,
          [day]: {
            ...(settings.businessHours as any)[day],
            [type]: value,
          },
        },
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

  if (!settings) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">Settings Not Found</h2>
            <p className="text-muted-foreground">Could not load shop settings.</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shop Settings</h1>
              <p className="text-muted-foreground">
                Manage your shop profile and preferences
              </p>
            </div>
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

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="hours">Business Hours</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="name">Shop Name</Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) => updateSettings({ name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={settings.description || ''}
                      onChange={(e) => updateSettings({ description: e.target.value })}
                      rows={4}
                      placeholder="Tell customers about your shop..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={settings.phone || ''}
                        onChange={(e) => updateSettings({ phone: e.target.value })}
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
                        value={settings.email || ''}
                        onChange={(e) => updateSettings({ email: e.target.value })}
                        placeholder="shop@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">
                      <Globe className="h-4 w-4 inline mr-1" />
                      Website (optional)
                    </Label>
                    <Input
                      id="website"
                      value={settings.website || ''}
                      onChange={(e) => updateSettings({ website: e.target.value })}
                      placeholder="https://yourshop.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shop Address
                  </CardTitle>
                  <CardDescription>
                    Where customers can find your physical store
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={settings.address?.street || ''}
                      onChange={(e) => updateAddress({ street: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={settings.address?.city || ''}
                        onChange={(e) => updateAddress({ city: e.target.value })}
                        placeholder="Kathmandu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={settings.address?.state || ''}
                        onChange={(e) => updateAddress({ state: e.target.value })}
                        placeholder="Bagmati"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={settings.address?.postalCode || ''}
                        onChange={(e) => updateAddress({ postalCode: e.target.value })}
                        placeholder="44600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={settings.address?.country || 'NP'}
                        onValueChange={(value) => updateAddress({ country: value })}
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Hours Tab */}
            <TabsContent value="hours" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Business Hours
                  </CardTitle>
                  <CardDescription>
                    Set your shop's operating hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {days.map((day) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24 capitalize font-medium">{day}</div>
                      <Input
                        type="time"
                        className="w-32"
                        value={(settings.businessHours as any)[day]?.open || '09:00'}
                        onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-32"
                        value={(settings.businessHours as any)[day]?.close || '18:00'}
                        onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                      />
                    </div>
                  ))}
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
                      checked={settings.isActive}
                      onCheckedChange={(checked) => updateSettings({ isActive: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Accepting Orders</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to place direct orders
                      </p>
                    </div>
                    <Switch
                      checked={settings.acceptingOrders}
                      onCheckedChange={(checked) => updateSettings({ acceptingOrders: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Accepting RFQs</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive custom order requests from customers
                      </p>
                    </div>
                    <Switch
                      checked={settings.acceptingRfqs}
                      onCheckedChange={(checked) => updateSettings({ acceptingRfqs: checked })}
                    />
                  </div>
                  <div className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Display Currency</Label>
                        <Select
                          value={settings.displayCurrency || 'NPR'}
                          onValueChange={(value) => updateSettings({ displayCurrency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="defaultCountry">Default Country</Label>
                        <Select
                          value={settings.defaultCountry || 'NP'}
                          onValueChange={(value) => updateSettings({ defaultCountry: value })}
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
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minOrder">Minimum Order Value (NPR)</Label>
                        <Input
                          id="minOrder"
                          type="number"
                          value={settings.minOrderValueNpr || ''}
                          onChange={(e) => updateSettings({ minOrderValueNpr: parseInt(e.target.value) || undefined })}
                          placeholder="e.g., 10000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avgDelivery">Average Delivery Days</Label>
                        <Input
                          id="avgDelivery"
                          type="number"
                          value={settings.avgDeliveryDays || ''}
                          onChange={(e) => updateSettings({ avgDeliveryDays: parseInt(e.target.value) || undefined })}
                          placeholder="e.g., 14"
                        />
                      </div>
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
