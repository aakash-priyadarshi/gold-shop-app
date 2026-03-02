"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FLAG_IMAGES,
  FlagImage,
  type FlagCode,
} from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
  CheckCircle,
  DollarSign,
  Edit,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Scale,
} from "lucide-react";
import { useEffect, useState } from "react";

// Valid flag codes for rendering
const validFlagCodes = Object.keys(FLAG_IMAGES);

const marketNames: Record<string, string> = {
  NP: "Nepal",
  IN: "India",
  US: "United States",
  UK: "United Kingdom",
  EU: "European Union",
  AE: "United Arab Emirates",
};

const availableCurrencies = [
  { code: "NPR", name: "Nepalese Rupee", symbol: "रु" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
];

const availableWeightUnits = [
  { code: "GRAM", name: "Grams", symbol: "g" },
  { code: "KILOGRAM", name: "Kilograms", symbol: "kg" },
  { code: "TOLA", name: "Tola", symbol: "tola" },
  { code: "LAAL", name: "Laal", symbol: "laal" },
  { code: "OUNCE", name: "Troy Ounce", symbol: "oz" },
  { code: "POUND", name: "Pounds", symbol: "lb" },
];

const availablePaymentMethods = [
  { code: "CARD", name: "Credit/Debit Card" },
  { code: "BANK_TRANSFER", name: "Bank Transfer" },
  { code: "UPI", name: "UPI" },
  { code: "ESEWA", name: "eSewa" },
  { code: "KHALTI", name: "Khalti" },
  { code: "CONNECTIPS", name: "ConnectIPS" },
  { code: "PAYPAL", name: "PayPal" },
  { code: "STRIPE", name: "Stripe" },
  { code: "PAID_AT_SHOP", name: "Pay at Shop" },
];

interface MarketConfig {
  id: string;
  countryCode: string;
  isActive: boolean;
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultWeightUnit: string;
  supportedWeightUnits: string[];
  supportedPaymentMethods: string[];
  heroHeadline: string | null;
  heroSubheadline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminMarketSettingsPage() {
  const [markets, setMarkets] = useState<MarketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketConfig | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<MarketConfig>>({});

  useEffect(() => {
    fetchMarkets();
  }, []);

  async function fetchMarkets() {
    setLoading(true);
    try {
      const response = await api.get("/market/admin/list");
      setMarkets(response.data);
    } catch (error) {
      console.error("Failed to fetch markets:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load market configurations.",
      });
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(market: MarketConfig) {
    setSelectedMarket(market);
    setEditForm({
      isActive: market.isActive,
      defaultCurrency: market.defaultCurrency,
      supportedCurrencies: market.supportedCurrencies,
      defaultWeightUnit: market.defaultWeightUnit,
      supportedWeightUnits: market.supportedWeightUnits,
      supportedPaymentMethods: market.supportedPaymentMethods,
      heroHeadline: market.heroHeadline || "",
      heroSubheadline: market.heroSubheadline || "",
      contactEmail: market.contactEmail || "",
      contactPhone: market.contactPhone || "",
      contactAddress: market.contactAddress || "",
    });
    setIsEditDialogOpen(true);
  }

  async function handleSaveMarket() {
    if (!selectedMarket) return;

    setSaving(true);
    try {
      await api.patch(`/market/admin/${selectedMarket.countryCode}`, editForm);
      toast({
        title: "Market Updated",
        description: `${marketNames[selectedMarket.countryCode]} market configuration saved.`,
      });
      setIsEditDialogOpen(false);
      fetchMarkets();
    } catch (error) {
      console.error("Failed to save market:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save market configuration.",
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleArrayItem(array: string[], item: string): string[] {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="flex-1 space-y-4 lg:space-y-6 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Globe className="h-7 w-7 text-gold-500" />
                Market Settings
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure regional settings for each market
              </p>
            </div>
            <Button variant="outline" onClick={fetchMarkets} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Markets Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-6 bg-gray-200 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : markets.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No market configurations found. Run database seed to create
                  default markets.
                </CardContent>
              </Card>
            ) : (
              markets.map((market) => (
                <Card
                  key={market.id}
                  className={!market.isActive ? "opacity-60" : ""}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {validFlagCodes.includes(market.countryCode) ? (
                          <FlagImage
                            code={market.countryCode as FlagCode}
                            size={28}
                          />
                        ) : (
                          <span className="text-2xl">🌍</span>
                        )}
                        {marketNames[market.countryCode]}
                      </CardTitle>
                      <Badge
                        variant={market.isActive ? "default" : "secondary"}
                      >
                        {market.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Country code: {market.countryCode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">
                        {market.defaultCurrency}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (+{(market.supportedCurrencies?.length || 1) - 1} more)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-medium">
                        {market.defaultWeightUnit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (+{(market.supportedWeightUnits?.length || 1) - 1} more)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Payments:</span>
                      <span className="font-medium">
                        {market.supportedPaymentMethods?.length || 0} methods
                      </span>
                    </div>
                    {market.contactEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">
                          {market.contactEmail}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => openEditDialog(market)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Settings
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedMarket &&
                  validFlagCodes.includes(selectedMarket.countryCode) ? (
                    <FlagImage
                      code={selectedMarket.countryCode as FlagCode}
                      size={28}
                    />
                  ) : (
                    <span className="text-2xl">🌍</span>
                  )}
                  Edit{" "}
                  {selectedMarket && marketNames[selectedMarket.countryCode]}{" "}
                  Market
                </DialogTitle>
                <DialogDescription>
                  Configure regional settings for this market
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Active Status */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Market Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this market region
                    </p>
                  </div>
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isActive: checked })
                    }
                  />
                </div>

                {/* Currency Settings */}
                <div className="space-y-3">
                  <Label>Default Currency</Label>
                  <Select
                    value={editForm.defaultCurrency}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, defaultCurrency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.name} ({curr.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label>Supported Currencies</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableCurrencies.map((curr) => (
                      <Badge
                        key={curr.code}
                        variant={
                          editForm.supportedCurrencies?.includes(curr.code)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            supportedCurrencies: toggleArrayItem(
                              editForm.supportedCurrencies || [],
                              curr.code,
                            ),
                          })
                        }
                      >
                        {curr.code}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Weight Settings */}
                <div className="space-y-3">
                  <Label>Default Weight Unit</Label>
                  <Select
                    value={editForm.defaultWeightUnit}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, defaultWeightUnit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWeightUnits.map((unit) => (
                        <SelectItem key={unit.code} value={unit.code}>
                          {unit.name} ({unit.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label>Supported Weight Units</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableWeightUnits.map((unit) => (
                      <Badge
                        key={unit.code}
                        variant={
                          editForm.supportedWeightUnits?.includes(unit.code)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            supportedWeightUnits: toggleArrayItem(
                              editForm.supportedWeightUnits || [],
                              unit.code,
                            ),
                          })
                        }
                      >
                        {unit.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <Label>Supported Payment Methods</Label>
                  <div className="flex flex-wrap gap-2">
                    {availablePaymentMethods.map((method) => (
                      <Badge
                        key={method.code}
                        variant={
                          editForm.supportedPaymentMethods?.includes(
                            method.code,
                          )
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            supportedPaymentMethods: toggleArrayItem(
                              editForm.supportedPaymentMethods || [],
                              method.code,
                            ),
                          })
                        }
                      >
                        {method.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Hero Content */}
                <div className="space-y-3">
                  <Label>Hero Headline</Label>
                  <Input
                    value={editForm.heroHeadline || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, heroHeadline: e.target.value })
                    }
                    placeholder="Discover Exquisite Jewellery From Trusted Artisans"
                  />

                  <Label>Hero Subheadline</Label>
                  <Textarea
                    value={editForm.heroSubheadline || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        heroSubheadline: e.target.value,
                      })
                    }
                    placeholder="Connect with verified local jewellers..."
                    rows={2}
                  />
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Email
                  </Label>
                  <Input
                    type="email"
                    value={editForm.contactEmail || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, contactEmail: e.target.value })
                    }
                    placeholder="support@orivraa.com"
                  />

                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Phone
                  </Label>
                  <Input
                    value={editForm.contactPhone || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, contactPhone: e.target.value })
                    }
                    placeholder="+977 9800000000"
                  />

                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Contact Address
                  </Label>
                  <Textarea
                    value={editForm.contactAddress || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        contactAddress: e.target.value,
                      })
                    }
                    placeholder="123 Jewellery Street, Kathmandu"
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveMarket} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
