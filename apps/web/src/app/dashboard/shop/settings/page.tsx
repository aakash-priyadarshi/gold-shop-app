"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput, needsCountryCode } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { authApi, sellerPerformanceApi, shopsApi } from "@/lib/api";
import { getCitiesForCountry, getStatesForCountry } from "@gold-shop/shared";
import {
  AlertTriangle,
  Award,
  Building2,
  CheckCircle,
  CreditCard,
  Crown,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  Shield,
  Loader2 as SpinnerIcon,
  Star,
  Store,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "SG", name: "Singapore", currency: "SGD" },
];

const currencies = [
  { code: "NPR", name: "Nepali Rupee (रू)", symbol: "रू" },
  { code: "INR", name: "Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", name: "US Dollar ($)", symbol: "$" },
  { code: "GBP", name: "British Pound (£)", symbol: "£" },
  { code: "AUD", name: "Australian Dollar (A$)", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar (C$)", symbol: "C$" },
  { code: "AED", name: "UAE Dirham (د.إ)", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar (S$)", symbol: "S$" },
];

interface TierDashboard {
  performance: any;
  shop: {
    sellerTier: string;
    tierUnlockedAt: string | null;
    makingChargeCap: number | null;
    makingChargePercent: number | null;
    isVerified: boolean;
    eliteFastTracked: boolean;
  };
  badges: any[];
  nextTier: string | null;
  viewingTier?: string;
  tierProgress: Record<
    string,
    { current: number | boolean; required: number | boolean; met: boolean }
  >;
  overallProgress: { met: number; total: number; percentage: number };
}

const TIER_META: Record<
  string,
  {
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    gradient: string;
  }
> = {
  STANDARD: {
    label: "Standard",
    icon: Shield,
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-300",
    gradient: "from-gray-200 to-gray-100",
  },
  SILVER: {
    label: "Silver",
    icon: Star,
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-400",
    gradient: "from-slate-300 to-slate-100",
  },
  GOLD: {
    label: "Gold",
    icon: Award,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    gradient: "from-yellow-300 to-yellow-50",
  },
  ELITE: {
    label: "Elite",
    icon: Crown,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-400",
    gradient: "from-purple-300 to-purple-50",
  },
};

export default function ShopSettingsPage() {
  const { user } = useAuth();
  const { placeholders: countryPlaceholders, symbol: currencySymbol } =
    useShopCurrency();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tierDashboard, setTierDashboard] = useState<TierDashboard | null>(
    null,
  );
  const [tierLoading, setTierLoading] = useState(false);

  // Phone availability check state
  const [phoneCheckState, setPhoneCheckState] = useState<{
    checking: boolean;
    exists: boolean | null;
    originalPhone: string;
  }>({ checking: false, exists: null, originalPhone: "" });
  const phoneCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check phone availability with debounce
  const checkPhoneAvailability = useCallback(
    async (phone: string) => {
      // Skip if phone is same as original
      if (phone === phoneCheckState.originalPhone) {
        setPhoneCheckState((prev) => ({
          ...prev,
          checking: false,
          exists: null,
        }));
        return;
      }

      // Skip if phone is empty or needs country code
      if (!phone || phone.length < 7 || needsCountryCode(phone)) {
        setPhoneCheckState((prev) => ({
          ...prev,
          checking: false,
          exists: null,
        }));
        return;
      }

      // Debounce
      if (phoneCheckTimeout.current) {
        clearTimeout(phoneCheckTimeout.current);
      }

      setPhoneCheckState((prev) => ({ ...prev, checking: true }));

      phoneCheckTimeout.current = setTimeout(async () => {
        try {
          const response = await authApi.checkPhone(phone);
          setPhoneCheckState((prev) => ({
            ...prev,
            checking: false,
            exists: response.data.exists,
          }));
        } catch {
          setPhoneCheckState((prev) => ({
            ...prev,
            checking: false,
            exists: null,
          }));
        }
      }, 500);
    },
    [phoneCheckState.originalPhone],
  );

  useEffect(() => {
    if (user?.shop?.id) {
      loadSettings();
      loadTierDashboard();
    }
  }, [user?.shop?.id]);

  const loadTierDashboard = async (targetTier?: string) => {
    setTierLoading(true);
    try {
      const response = await sellerPerformanceApi.getMyDashboard(targetTier);
      setTierDashboard(response.data);
    } catch (error) {
      console.error("Failed to load tier dashboard:", error);
      // Silently fail — tier info is supplementary
    } finally {
      setTierLoading(false);
    }
  };

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

      // Store original phone for comparison
      setPhoneCheckState((prev) => ({
        ...prev,
        originalPhone: shop.contactPhone || "",
      }));
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast({
        variant: "destructive",
        title: "Failed to load settings",
        description: "Could not fetch shop settings",
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
        title: "Settings Saved",
        description: "Your shop settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.response?.data?.message || "Could not save settings",
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

  const updateBankDetails = (
    updates: Partial<NonNullable<ShopData["bankAccountDetails"]>>,
  ) => {
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
            <p className="text-muted-foreground">
              Could not load shop settings.
            </p>
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
                <Badge variant="default" className="bg-green-500">
                  Verified
                </Badge>
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

          {/* Alert for missing address */}
          {(!shopData.address || !shopData.city || !shopData.state) && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Complete your shop address</p>
                <p className="text-sm mt-1">
                  Your shop address (country, state, city) is required for
                  customers to find you in seller matching. Go to the{" "}
                  <strong>Location</strong> tab to set your address.
                </p>
              </div>
            </div>
          )}

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
                        value={shopData.shopName || ""}
                        onChange={(e) =>
                          updateShopData({ shopName: e.target.value })
                        }
                        placeholder="Your Shop Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopNameNe">Shop Name (नेपाली)</Label>
                      <Input
                        id="shopNameNe"
                        value={shopData.shopNameNe || ""}
                        onChange={(e) =>
                          updateShopData({ shopNameNe: e.target.value })
                        }
                        placeholder="तपाईंको पसलको नाम"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={shopData.description || ""}
                      onChange={(e) =>
                        updateShopData({ description: e.target.value })
                      }
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
                      <div className="relative">
                        <PhoneInput
                          id="phone"
                          value={shopData.contactPhone || ""}
                          onChange={(value) => {
                            updateShopData({ contactPhone: value });
                            checkPhoneAvailability(value);
                          }}
                          placeholder={countryPlaceholders.phone}
                          error={phoneCheckState.exists === true}
                        />
                        {/* Real-time phone check indicator */}
                        <div className="absolute right-3 top-[22px] -translate-y-1/2 z-10">
                          {phoneCheckState.checking && (
                            <SpinnerIcon className="h-4 w-4 text-gray-400 animate-spin" />
                          )}
                          {!phoneCheckState.checking &&
                            phoneCheckState.exists === true && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          {!phoneCheckState.checking &&
                            phoneCheckState.exists === false &&
                            shopData.contactPhone &&
                            shopData.contactPhone !==
                              phoneCheckState.originalPhone && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                      </div>
                      {phoneCheckState.exists === true && (
                        <p className="text-xs text-red-500">
                          This phone number is already registered
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Business Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={shopData.contactEmail || ""}
                        onChange={(e) =>
                          updateShopData({ contactEmail: e.target.value })
                        }
                        placeholder="shop@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp Number</Label>
                      <Input
                        id="whatsapp"
                        value={shopData.whatsappNumber || ""}
                        onChange={(e) =>
                          updateShopData({ whatsappNumber: e.target.value })
                        }
                        placeholder={countryPlaceholders.phone}
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
                        value={shopData.country || "NP"}
                        onValueChange={(value) =>
                          updateShopData({ country: value })
                        }
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
                      <Label htmlFor="state">State/Province *</Label>
                      {getStatesForCountry(shopData.country || "NP").length >
                      0 ? (
                        <Select
                          value={shopData.state || ""}
                          onValueChange={(value) =>
                            updateShopData({ state: value, city: "" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {getStatesForCountry(shopData.country || "NP").map(
                              (s) => (
                                <SelectItem key={s.code} value={s.code}>
                                  {s.name}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="state"
                          value={shopData.state || ""}
                          onChange={(e) =>
                            updateShopData({ state: e.target.value })
                          }
                          placeholder={countryPlaceholders.state}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      {getCitiesForCountry(
                        shopData.country || "NP",
                        shopData.state || undefined,
                      ).length > 0 ? (
                        <Select
                          value={shopData.city || ""}
                          onValueChange={(value) =>
                            updateShopData({ city: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCitiesForCountry(
                              shopData.country || "NP",
                              shopData.state || undefined,
                            ).map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="city"
                          value={shopData.city || ""}
                          onChange={(e) =>
                            updateShopData({ city: e.target.value })
                          }
                          placeholder={countryPlaceholders.city}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">
                        {countryPlaceholders.pincodeLabel}
                      </Label>
                      <Input
                        id="pincode"
                        value={shopData.pincode || ""}
                        onChange={(e) =>
                          updateShopData({ pincode: e.target.value })
                        }
                        placeholder={countryPlaceholders.pincode}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address *</Label>
                    <Textarea
                      id="address"
                      value={shopData.address || ""}
                      onChange={(e) =>
                        updateShopData({ address: e.target.value })
                      }
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
                      onCheckedChange={(checked) =>
                        updateShopData({ isActive: checked })
                      }
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
                        Your country determines market rates. Currency is for
                        display purposes - all prices are stored in your
                        market's base currency and converted automatically.
                      </p>
                    </div>
                  </div>

                  {/* ── Seller Tier & Making Charge ───────────────── */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Your Seller Tier & Making Charge
                    </h4>

                    {/* Compact Current Tier Badge */}
                    {tierLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading tier information...
                      </div>
                    ) : tierDashboard ? (
                      <div className="space-y-3">
                        {(() => {
                          const currentTier =
                            tierDashboard.shop?.sellerTier || "STANDARD";
                          const meta =
                            TIER_META[currentTier] || TIER_META.STANDARD;
                          const TierIcon = meta.icon;
                          const cap = tierDashboard.shop?.makingChargeCap;
                          return (
                            <div
                              className={`rounded-lg border-2 ${meta.border} bg-gradient-to-r ${meta.gradient} p-4`}
                            >
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2 rounded-full ${meta.bg}`}
                                  >
                                    <TierIcon
                                      className={`h-6 w-6 ${meta.color}`}
                                    />
                                  </div>
                                  <div>
                                    <p
                                      className={`font-bold text-lg ${meta.color}`}
                                    >
                                      {meta.label} Tier
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {currentTier === "ELITE"
                                        ? "No cap on making charge!"
                                        : cap != null
                                          ? `Making charge cap: up to ${cap}%`
                                          : "Complete milestones to unlock higher tiers"}
                                    </p>
                                  </div>
                                </div>
                                <a href="/dashboard/shop/engagement">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-xs"
                                  >
                                    <Award className="h-3.5 w-3.5" />
                                    View Tier Roadmap & Details
                                  </Button>
                                </a>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          Tier information will appear once your shop has some
                          activity.{" "}
                          <a
                            href="/dashboard/shop/engagement"
                            className="underline font-medium"
                          >
                            View Engagement & Tiers
                          </a>
                        </p>
                      </div>
                    )}

                    {/* Making Charge Input with Live Validation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="makingCharge">
                          Default Making Charge (%)
                        </Label>
                        <Input
                          id="makingCharge"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={shopData.makingChargePercent ?? 10}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateShopData({ makingChargePercent: val });
                          }}
                          className={
                            tierDashboard?.shop?.makingChargeCap != null &&
                            (shopData.makingChargePercent ?? 10) >
                              tierDashboard.shop.makingChargeCap
                              ? "border-red-400 focus-visible:ring-red-400"
                              : ""
                          }
                        />
                        {/* Live cap warning */}
                        {tierDashboard?.shop?.makingChargeCap != null &&
                        (shopData.makingChargePercent ?? 10) >
                          tierDashboard.shop.makingChargeCap ? (
                          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-red-700">
                              <p className="font-medium">
                                Exceeds your{" "}
                                {TIER_META[tierDashboard.shop.sellerTier]
                                  ?.label || "Standard"}{" "}
                                tier cap of {tierDashboard.shop.makingChargeCap}
                                %
                              </p>
                              <p>
                                {tierDashboard.nextTier
                                  ? `Upgrade to ${TIER_META[tierDashboard.nextTier]?.label} tier to increase your cap. Your offer will be rejected if making charge exceeds ${tierDashboard.shop.makingChargeCap}%.`
                                  : `Your offers will be rejected if making charge exceeds ${tierDashboard.shop.makingChargeCap}%.`}
                              </p>
                            </div>
                          </div>
                        ) : tierDashboard?.shop?.makingChargeCap != null ? (
                          <p className="text-xs text-muted-foreground">
                            Your{" "}
                            {TIER_META[tierDashboard.shop.sellerTier]?.label ||
                              "Standard"}{" "}
                            tier allows up to{" "}
                            {tierDashboard.shop.makingChargeCap}% making charge
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Applied to all materials if not specified
                            individually
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minOrder">Minimum Order Value</Label>
                        <Input
                          id="minOrder"
                          type="number"
                          value={shopData.minOrderValueNpr ?? 0}
                          onChange={(e) =>
                            updateShopData({
                              minOrderValueNpr: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder={countryPlaceholders.minOrderExample}
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
                      onCheckedChange={(checked) =>
                        updateShopData({ codEnabled: checked })
                      }
                    />
                  </div>

                  {shopData.codEnabled && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="codMax">Maximum COD Value</Label>
                      <Input
                        id="codMax"
                        type="number"
                        value={shopData.codMaxValueNpr || ""}
                        onChange={(e) =>
                          updateShopData({
                            codMaxValueNpr:
                              parseInt(e.target.value) || undefined,
                          })
                        }
                        placeholder={countryPlaceholders.maxCodExample}
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
                          value={shopData.bankAccountDetails?.bankName || ""}
                          onChange={(e) =>
                            updateBankDetails({ bankName: e.target.value })
                          }
                          placeholder={countryPlaceholders.bankName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branchName">Branch Name</Label>
                        <Input
                          id="branchName"
                          value={shopData.bankAccountDetails?.branchName || ""}
                          onChange={(e) =>
                            updateBankDetails({ branchName: e.target.value })
                          }
                          placeholder={countryPlaceholders.bankBranch}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Holder Name</Label>
                        <Input
                          id="accountName"
                          value={shopData.bankAccountDetails?.accountName || ""}
                          onChange={(e) =>
                            updateBankDetails({ accountName: e.target.value })
                          }
                          placeholder="Shop Owner Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          value={
                            shopData.bankAccountDetails?.accountNumber || ""
                          }
                          onChange={(e) =>
                            updateBankDetails({ accountNumber: e.target.value })
                          }
                          placeholder="0123456789012345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="swiftCode">
                          {countryPlaceholders.swiftLabel} (for international)
                        </Label>
                        <Input
                          id="swiftCode"
                          value={shopData.bankAccountDetails?.swiftCode || ""}
                          onChange={(e) =>
                            updateBankDetails({ swiftCode: e.target.value })
                          }
                          placeholder="NBLNPKA"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 mb-2">
                        Online Payments (Coming Soon)
                      </h4>
                      <p className="text-sm text-amber-700">
                        Stripe integration for accepting credit/debit cards and
                        international payments will be available soon. You'll be
                        able to receive payments directly to your connected
                        Stripe account.
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
