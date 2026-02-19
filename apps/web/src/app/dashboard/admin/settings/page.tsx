"use client";

import { AdminTaxRulesPanel } from "@/components/admin/AdminTaxRulesPanel";
import { MarketConfigTab } from "@/components/admin/MarketConfigTab";
import { PagesManagerTab } from "@/components/admin/PagesManagerTab";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, platformConfigApi } from "@/lib/api";
import {
  AlertTriangle,
  Award,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  DollarSign,
  FileText,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  Percent,
  Play,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const supportedRegions = [
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "UK", name: "United Kingdom", currency: "GBP" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "EU", name: "European Union", currency: "EUR" },
];

const supportedCurrencies = ["NPR", "INR", "USD", "GBP", "AED", "EUR"];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: "",
    message: "",
    type: "INFO",
    targetRoles: [] as string[],
  });

  // Email settings state
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    sender: string;
  } | null>(null);
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [adminEmailForm, setAdminEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });
  const [updatingAdminEmail, setUpdatingAdminEmail] = useState(false);

  // AI Description Service state
  const [aiServiceStatus, setAiServiceStatus] = useState<{
    isRateLimited: boolean;
    resumeAt: string | null;
    queueSize: number;
    dailyRequestCount: number;
    dailyRequestLimit: number;
    dailyResetAt: string | null;
    usagePercentage: number;
    estimatedCost: string;
  } | null>(null);
  const [loadingAiStatus, setLoadingAiStatus] = useState(true);
  const [newDailyLimit, setNewDailyLimit] = useState("");
  const [updatingLimit, setUpdatingLimit] = useState(false);
  const [resettingRateLimit, setResettingRateLimit] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);

  // Platform Config state
  const [platformConfig, setPlatformConfig] = useState<Record<string, number>>(
    {},
  );
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const SETTINGS_TABS = [
    { id: "general", label: "General", icon: Settings },
    { id: "pricing", label: "Pricing & Materials", icon: DollarSign },
    { id: "tiers", label: "Seller Tiers", icon: TrendingUp },
    { id: "operations", label: "Operations", icon: RefreshCw },
    { id: "email", label: "Email & AI", icon: Mail },
    { id: "tax", label: "Tax Rules", icon: Percent },
    { id: "market", label: "Market Config", icon: Globe },
    { id: "pages", label: "CMS Pages", icon: FileText },
  ];

  // Fetch platform config on mount
  useEffect(() => {
    const fetchPlatformConfig = async () => {
      try {
        const response = await platformConfigApi.getAll();
        setPlatformConfig(response.data);
      } catch (error) {
        console.error("Failed to fetch platform config:", error);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchPlatformConfig();
  }, []);

  const updateConfigValue = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setPlatformConfig((prev) => ({ ...prev, [key]: numValue }));
      setConfigDirty(true);
    }
  };

  const handleSavePlatformConfig = async () => {
    setSavingConfig(true);
    try {
      await platformConfigApi.update(platformConfig);
      toast({
        title: "Configuration Saved",
        description: "Platform configuration has been updated successfully.",
      });
      setConfigDirty(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error?.response?.data?.message || "Could not save configuration.",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Fetch email status on mount
  useEffect(() => {
    const fetchEmailStatus = async () => {
      try {
        const response = await adminApi.getEmailStatus();
        setEmailStatus(response.data);
      } catch (error) {
        console.error("Failed to fetch email status:", error);
      } finally {
        setLoadingEmailStatus(false);
      }
    };
    fetchEmailStatus();
  }, []);

  // Fetch AI service status on mount
  useEffect(() => {
    const fetchAiServiceStatus = async () => {
      try {
        const response = await adminApi.getAiDescriptionServiceStatus();
        setAiServiceStatus(response.data);
        if (response.data?.dailyRequestLimit) {
          setNewDailyLimit(response.data.dailyRequestLimit.toString());
        }
      } catch (error) {
        console.error("Failed to fetch AI service status:", error);
      } finally {
        setLoadingAiStatus(false);
      }
    };
    fetchAiServiceStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAiServiceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshAiServiceStatus = async () => {
    setLoadingAiStatus(true);
    try {
      const response = await adminApi.getAiDescriptionServiceStatus();
      setAiServiceStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch AI service status:", error);
    } finally {
      setLoadingAiStatus(false);
    }
  };

  const handleUpdateDailyLimit = async () => {
    const limit = parseInt(newDailyLimit);
    if (isNaN(limit) || limit < 1000) {
      toast({
        variant: "destructive",
        title: "Invalid Limit",
        description: "Limit must be at least 1,000 requests.",
      });
      return;
    }

    setUpdatingLimit(true);
    try {
      const response = await adminApi.updateAiDescriptionDailyLimit(limit);
      toast({
        title: "Limit Updated",
        description: response.data.message,
      });
      await refreshAiServiceStatus();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          error?.response?.data?.message || "Could not update limit.",
      });
    } finally {
      setUpdatingLimit(false);
    }
  };

  const handleResetRateLimit = async () => {
    setResettingRateLimit(true);
    try {
      await adminApi.resetAiDescriptionRateLimit();
      toast({
        title: "Rate Limit Reset",
        description: "AI service rate limit has been cleared.",
      });
      await refreshAiServiceStatus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "Could not reset rate limit.",
      });
    } finally {
      setResettingRateLimit(false);
    }
  };

  const handleClearAiQueue = async () => {
    setClearingQueue(true);
    try {
      const response = await adminApi.clearAiDescriptionQueue();
      toast({
        title: "Queue Cleared",
        description: response.data.message,
      });
      await refreshAiServiceStatus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: "Could not clear queue.",
      });
    } finally {
      setClearingQueue(false);
    }
  };

  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    try {
      const response = await adminApi.processAiDescriptionQueue();
      toast({
        title: "Queue Processing",
        description: response.data.message,
      });
      await refreshAiServiceStatus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Process Failed",
        description: "Could not process queue.",
      });
    } finally {
      setProcessingQueue(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
      });
      return;
    }

    setSendingTestEmail(true);
    try {
      await adminApi.sendTestEmail(testEmail);
      toast({
        title: "Test Email Sent",
        description: `Test email has been sent to ${testEmail}. Check your inbox.`,
      });
      setTestEmail("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Could not send test email. Check SMTP configuration.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleUpdateAdminEmail = async () => {
    if (!adminEmailForm.newEmail || !adminEmailForm.currentPassword) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all fields.",
      });
      return;
    }

    setUpdatingAdminEmail(true);
    try {
      await adminApi.updateAdminEmail({
        email: adminEmailForm.newEmail,
        currentPassword: adminEmailForm.currentPassword,
      });
      toast({
        title: "Admin Email Updated",
        description: `Admin notification email has been updated to ${adminEmailForm.newEmail}.`,
      });
      setEmailDialogOpen(false);
      setAdminEmailForm({ newEmail: "", currentPassword: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          error?.response?.data?.message ||
          "Could not update admin email. Check your password.",
      });
    } finally {
      setUpdatingAdminEmail(false);
    }
  };

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      await adminApi.refreshMarketRates();
      toast({
        title: "Market Rates Refreshed",
        description: "Latest market rates have been fetched successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh market rates. Try again later.",
      });
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await adminApi.clearCache();
      toast({
        title: "Cache Cleared",
        description: "Platform cache has been cleared successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: "Could not clear cache. Try again later.",
      });
    } finally {
      setClearingCache(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in title and message.",
      });
      return;
    }

    setSendingNotification(true);
    try {
      await adminApi.broadcastNotification(notificationData);
      toast({
        title: "Notification Sent",
        description: "System notification has been broadcasted.",
      });
      setNotificationDialogOpen(false);
      setNotificationData({
        title: "",
        message: "",
        type: "INFO",
        targetRoles: [],
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Could not send notification. Try again later.",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground">
              Configure platform-wide settings and defaults
            </p>
          </div>

          {/* Mobile tab bar */}
          <div className="flex overflow-x-auto gap-2 md:hidden -mx-2 px-2 pb-2">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-6">
            {/* Desktop sidebar nav */}
            <nav className="hidden md:block w-56 shrink-0">
              <div className="sticky top-6 space-y-1">
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}

                {/* Global save indicator */}
                {configDirty && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={handleSavePlatformConfig}
                      disabled={savingConfig}
                      size="sm"
                      className="w-full gap-2"
                    >
                      {savingConfig ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {savingConfig ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </nav>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              {activeTab === "general" && (
                <div className="grid gap-6">
                  {/* Platform Fee */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Percent className="h-5 w-5" />
                        Platform Commission
                      </CardTitle>
                      <CardDescription>
                        Commission rate charged on transactions (added to
                        seller&apos;s making charge for customer-facing display)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="platformFee">
                            Commission Rate (%)
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="platformFee"
                              type="number"
                              min="0"
                              max="50"
                              step="0.1"
                              value={
                                platformConfig.platform_commission_rate ?? 5
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "platform_commission_rate",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Platform commission is combined with the
                            seller&apos;s making charge and shown as a single
                            &quot;making charge&quot; to customers. E.g., seller
                            15% + platform 5% = 20% displayed.
                          </p>
                        </div>
                      </div>
                      {configDirty && (
                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={handleSavePlatformConfig}
                            disabled={savingConfig}
                            size="sm"
                            className="gap-2"
                          >
                            {savingConfig ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {savingConfig ? "Saving..." : "Save Commission"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Supported Regions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Supported Regions
                      </CardTitle>
                      <CardDescription>
                        Countries where the platform operates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {supportedRegions.map((region) => (
                          <div
                            key={region.code}
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <FlagImage
                              code={region.code as FlagCode}
                              size={28}
                            />
                            <div>
                              <p className="font-medium">{region.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {region.code} • {region.currency}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Supported Currencies */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Supported Currencies
                      </CardTitle>
                      <CardDescription>
                        Currencies available for transactions and display
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {supportedCurrencies.map((currency) => (
                          <Badge
                            key={currency}
                            variant="outline"
                            className="text-sm py-1 px-3"
                          >
                            {currency}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Defaults */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        System Defaults
                      </CardTitle>
                      <CardDescription>
                        Default values used across the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Default Making Charge</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              step="0.1"
                              value={
                                platformConfig.default_making_charge_percent ??
                                10
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "default_making_charge_percent",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Applied when shop hasn&apos;t set custom rates
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Price Flagging Threshold</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={
                                platformConfig.price_flagging_threshold ?? 50
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "price_flagging_threshold",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Flag prices exceeding this % above average
                          </p>
                        </div>
                      </div>
                      {configDirty && (
                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={handleSavePlatformConfig}
                            disabled={savingConfig}
                            size="sm"
                            className="gap-2"
                          >
                            {savingConfig ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {savingConfig ? "Saving..." : "Save Defaults"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "pricing" && (
                <div className="grid gap-6">
                  {/* Making Charge Caps per Tier */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Making Charge Caps by Seller Tier
                      </CardTitle>
                      <CardDescription>
                        Maximum making charge percentage sellers can set based
                        on their performance tier
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          {
                            tier: "Standard",
                            key: "making_charge_cap_standard",
                            color: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
                            default: 15,
                          },
                          {
                            tier: "Silver",
                            key: "making_charge_cap_silver",
                            color: "bg-slate-100 border-slate-400",
                            default: 18,
                          },
                          {
                            tier: "Gold",
                            key: "making_charge_cap_gold",
                            color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400",
                            default: 22,
                          },
                          {
                            tier: "Elite",
                            key: "making_charge_cap_elite",
                            color: "bg-purple-50 border-purple-400",
                            default: 100,
                          },
                        ].map(({ tier, key, color, default: def }) => (
                          <div
                            key={key}
                            className={`p-4 rounded-lg border-2 ${color}`}
                          >
                            <p className="font-semibold text-sm mb-2">{tier}</p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={platformConfig[key] ?? def}
                                onChange={(e) =>
                                  updateConfigValue(key, e.target.value)
                                }
                                disabled={loadingConfig}
                                className="w-20"
                              />
                              <span className="text-muted-foreground text-sm">
                                %
                              </span>
                            </div>
                            {key === "making_charge_cap_elite" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                100% = uncapped
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {configDirty && (
                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={handleSavePlatformConfig}
                            disabled={savingConfig}
                            size="sm"
                            className="gap-2"
                          >
                            {savingConfig ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {savingConfig ? "Saving..." : "Save Charge Caps"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* System Default Material Prices */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        System Default Material Prices
                      </CardTitle>
                      <CardDescription>
                        Default prices used in the RFQ calculator and seller
                        matching when a shop hasn&apos;t set custom component
                        prices. Sellers can override these on their Inventory
                        page.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Base Metals (NPR per gram) */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Database className="h-4 w-4 text-orange-500" />
                          Base Metals
                          <span className="text-xs font-normal text-muted-foreground">
                            (NPR per gram)
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { code: "BRASS", label: "Brass", default: 1.5 },
                            { code: "COPPER", label: "Copper", default: 2.0 },
                            { code: "BRONZE", label: "Bronze", default: 1.8 },
                            {
                              code: "STAINLESS_STEEL_316L",
                              label: "SS 316L",
                              default: 3.5,
                            },
                            {
                              code: "STAINLESS_STEEL_304",
                              label: "SS 304",
                              default: 3.0,
                            },
                            {
                              code: "TITANIUM",
                              label: "Titanium",
                              default: 8.0,
                            },
                            {
                              code: "NICKEL_SILVER",
                              label: "Nickel Silver",
                              default: 2.5,
                            },
                            { code: "PEWTER", label: "Pewter", default: 2.0 },
                          ].map(({ code, label, default: def }) => (
                            <div
                              key={code}
                              className="p-3 rounded-lg border bg-orange-50/50"
                            >
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {label}
                              </p>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={
                                    platformConfig[
                                      `default_base_metal_${code}`
                                    ] ?? def
                                  }
                                  onChange={(e) =>
                                    updateConfigValue(
                                      `default_base_metal_${code}`,
                                      e.target.value,
                                    )
                                  }
                                  disabled={loadingConfig}
                                  className="w-20 h-8 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">
                                  /g
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Plating (NPR per piece base rate) */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          Plating Types
                          <span className="text-xs font-normal text-muted-foreground">
                            (NPR base rate per piece)
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            {
                              code: "GOLD_PLATED",
                              label: "Gold Plated",
                              default: 45,
                            },
                            {
                              code: "GOLD_FILLED",
                              label: "Gold Filled",
                              default: 120,
                            },
                            { code: "VERMEIL", label: "Vermeil", default: 80 },
                            {
                              code: "ROSE_GOLD_PLATED",
                              label: "Rose Gold",
                              default: 50,
                            },
                            {
                              code: "RHODIUM_PLATED",
                              label: "Rhodium",
                              default: 40,
                            },
                            {
                              code: "PVD_GOLD",
                              label: "PVD Gold",
                              default: 75,
                            },
                            {
                              code: "PVD_ROSE",
                              label: "PVD Rose",
                              default: 75,
                            },
                            {
                              code: "PVD_BLACK",
                              label: "PVD Black",
                              default: 65,
                            },
                            {
                              code: "SILVER_PLATED",
                              label: "Silver Plated",
                              default: 25,
                            },
                            {
                              code: "RUTHENIUM_PLATED",
                              label: "Ruthenium",
                              default: 55,
                            },
                          ].map(({ code, label, default: def }) => (
                            <div
                              key={code}
                              className="p-3 rounded-lg border bg-blue-50/50"
                            >
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {label}
                              </p>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    platformConfig[`default_plating_${code}`] ??
                                    def
                                  }
                                  onChange={(e) =>
                                    updateConfigValue(
                                      `default_plating_${code}`,
                                      e.target.value,
                                    )
                                  }
                                  disabled={loadingConfig}
                                  className="w-20 h-8 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">
                                  /pc
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Surface Finishes (NPR per piece) */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          Surface Finishes
                          <span className="text-xs font-normal text-muted-foreground">
                            (NPR per piece)
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            {
                              code: "POLISHED",
                              label: "Polished",
                              default: 25,
                            },
                            {
                              code: "HIGH_POLISH",
                              label: "High Polish",
                              default: 25,
                            },
                            { code: "MATTE", label: "Matte", default: 30 },
                            { code: "SATIN", label: "Satin", default: 30 },
                            { code: "BRUSHED", label: "Brushed", default: 35 },
                            {
                              code: "OXIDISED_FINISH",
                              label: "Oxidised",
                              default: 35,
                            },
                            { code: "ANTIQUE", label: "Antique", default: 40 },
                            {
                              code: "SANDBLASTED",
                              label: "Sandblasted",
                              default: 45,
                            },
                            {
                              code: "BARK_TEXTURE",
                              label: "Bark Texture",
                              default: 45,
                            },
                            {
                              code: "HAMMERED",
                              label: "Hammered",
                              default: 50,
                            },
                            {
                              code: "FLORENTINE",
                              label: "Florentine",
                              default: 55,
                            },
                            {
                              code: "TWO_TONE",
                              label: "Two Tone",
                              default: 60,
                            },
                            {
                              code: "ENGRAVED",
                              label: "Engraved",
                              default: 65,
                            },
                            {
                              code: "DIAMOND_CUT",
                              label: "Diamond Cut",
                              default: 70,
                            },
                            {
                              code: "RHODIUM_PLATED",
                              label: "Rhodium Plated",
                              default: 80,
                            },
                          ].map(({ code, label, default: def }) => (
                            <div
                              key={code}
                              className="p-3 rounded-lg border bg-purple-50/50"
                            >
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {label}
                              </p>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    platformConfig[`default_finish_${code}`] ??
                                    def
                                  }
                                  onChange={(e) =>
                                    updateConfigValue(
                                      `default_finish_${code}`,
                                      e.target.value,
                                    )
                                  }
                                  disabled={loadingConfig}
                                  className="w-20 h-8 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">
                                  /pc
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {configDirty && (
                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={handleSavePlatformConfig}
                            disabled={savingConfig}
                            size="sm"
                            className="gap-2"
                          >
                            {savingConfig ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {savingConfig
                              ? "Saving..."
                              : "Save Material Defaults"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "tiers" && (
                <div className="grid gap-6">
                  {/* Seller Tier Criteria */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Seller Tier Criteria
                      </CardTitle>
                      <CardDescription>
                        Minimum thresholds sellers must meet to qualify for each
                        tier. Standard is the default — no criteria needed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* Silver Tier */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 rounded-full bg-slate-400" />
                          <h4 className="font-semibold text-slate-700">
                            Silver Tier
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            — Entry-level proven seller
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pl-5 border-l-2 border-slate-300">
                          <div className="space-y-1">
                            <Label className="text-xs">Min. Orders</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={platformConfig.silver_min_orders ?? 30}
                              onChange={(e) =>
                                updateConfigValue(
                                  "silver_min_orders",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Max. Cancel Rate (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={
                                platformConfig.silver_max_cancellation_rate ?? 5
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "silver_max_cancellation_rate",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Min. Rating</Label>
                            <Input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={platformConfig.silver_min_rating ?? 4.0}
                              onChange={(e) =>
                                updateConfigValue(
                                  "silver_min_rating",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. Tenure (months)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                platformConfig.silver_min_tenure_months ?? 3
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "silver_min_tenure_months",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gold Tier */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 rounded-full bg-yellow-400" />
                          <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">
                            Gold Tier
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            — High-performing, reliable seller
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5 border-l-2 border-yellow-400">
                          <div className="space-y-1">
                            <Label className="text-xs">Min. Orders</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={platformConfig.gold_min_orders ?? 75}
                              onChange={(e) =>
                                updateConfigValue(
                                  "gold_min_orders",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Max. Cancel Rate (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={
                                platformConfig.gold_max_cancellation_rate ?? 3
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "gold_max_cancellation_rate",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Min. Rating</Label>
                            <Input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={platformConfig.gold_min_rating ?? 4.5}
                              onChange={(e) =>
                                updateConfigValue(
                                  "gold_min_rating",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. Tenure (months)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={platformConfig.gold_min_tenure_months ?? 5}
                              onChange={(e) =>
                                updateConfigValue(
                                  "gold_min_tenure_months",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. Positive Feedback (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={
                                platformConfig.gold_min_positive_feedback ?? 80
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "gold_min_positive_feedback",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. On-Time Dispatch (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={
                                platformConfig.gold_min_on_time_dispatch ?? 90
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "gold_min_on_time_dispatch",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 pl-5">
                          Gold sellers must also be verified. Fast-track
                          available via campaign/escrow/express badges (25%
                          relaxed criteria).
                        </p>
                      </div>

                      {/* Elite Tier */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                            Elite Tier
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            — Best-in-class, premium craftsmanship
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5 border-l-2 border-purple-400">
                          <div className="space-y-1">
                            <Label className="text-xs">Min. Orders</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={platformConfig.elite_min_orders ?? 100}
                              onChange={(e) =>
                                updateConfigValue(
                                  "elite_min_orders",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Max. Cancel Rate (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={
                                platformConfig.elite_max_cancellation_rate ?? 2
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "elite_max_cancellation_rate",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Min. Rating</Label>
                            <Input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={platformConfig.elite_min_rating ?? 4.7}
                              onChange={(e) =>
                                updateConfigValue(
                                  "elite_min_rating",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. Tenure (months)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                platformConfig.elite_min_tenure_months ?? 6
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "elite_min_tenure_months",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. Positive Feedback (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={
                                platformConfig.elite_min_positive_feedback ?? 90
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "elite_min_positive_feedback",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Min. On-Time Dispatch (%)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={
                                platformConfig.elite_min_on_time_dispatch ?? 95
                              }
                              onChange={(e) =>
                                updateConfigValue(
                                  "elite_min_on_time_dispatch",
                                  e.target.value,
                                )
                              }
                              disabled={loadingConfig}
                              className="w-24"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 pl-5">
                          Elite sellers must be verified. Making charge cap is
                          effectively uncapped (100%).
                        </p>
                      </div>

                      {/* Standard Tier Info */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm text-muted-foreground">
                        <strong>Standard (default):</strong> All new sellers
                        start here. No minimum criteria — any registered seller
                        with an active shop is Standard tier. Making charge cap:{" "}
                        {platformConfig.making_charge_cap_standard ?? 15}%.
                      </div>
                      {configDirty && (
                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            onClick={handleSavePlatformConfig}
                            disabled={savingConfig}
                            size="sm"
                            className="gap-2"
                          >
                            {savingConfig ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {savingConfig ? "Saving..." : "Save Tier Criteria"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "operations" && (
                <div className="grid gap-6">
                  {/* Security Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security Settings
                      </CardTitle>
                      <CardDescription>
                        Authentication and security configuration
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Access Token Expiry</Label>
                          <div className="flex items-center gap-2">
                            <Input value="15" disabled className="w-24" />
                            <span className="text-muted-foreground">
                              minutes
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Refresh Token Expiry</Label>
                          <div className="flex items-center gap-2">
                            <Input value="30" disabled className="w-24" />
                            <span className="text-muted-foreground">days</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Quick Actions
                      </CardTitle>
                      <CardDescription>
                        Administrative operations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4">
                        <Button
                          variant="outline"
                          onClick={handleRefreshRates}
                          disabled={refreshingRates}
                        >
                          {refreshingRates ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Refresh Market Rates
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleClearCache}
                          disabled={clearingCache}
                        >
                          {clearingCache ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Database className="h-4 w-4 mr-2" />
                          )}
                          Clear Cache
                        </Button>
                        <Dialog
                          open={notificationDialogOpen}
                          onOpenChange={setNotificationDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Bell className="h-4 w-4 mr-2" />
                              Send System Notification
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Send System Notification
                              </DialogTitle>
                              <DialogDescription>
                                Broadcast a notification to all users or
                                specific roles.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                  placeholder="Notification title"
                                  value={notificationData.title}
                                  onChange={(e) =>
                                    setNotificationData((prev) => ({
                                      ...prev,
                                      title: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea
                                  placeholder="Notification message..."
                                  rows={3}
                                  value={notificationData.message}
                                  onChange={(e) =>
                                    setNotificationData((prev) => ({
                                      ...prev,
                                      message: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={notificationData.type}
                                  onValueChange={(value) =>
                                    setNotificationData((prev) => ({
                                      ...prev,
                                      type: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="INFO">
                                      Information
                                    </SelectItem>
                                    <SelectItem value="WARNING">
                                      Warning
                                    </SelectItem>
                                    <SelectItem value="SUCCESS">
                                      Success
                                    </SelectItem>
                                    <SelectItem value="ERROR">Error</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  Target Roles (leave empty for all)
                                </Label>
                                <Select
                                  value={
                                    notificationData.targetRoles[0] || "all"
                                  }
                                  onValueChange={(value) =>
                                    setNotificationData((prev) => ({
                                      ...prev,
                                      targetRoles:
                                        value === "all" ? [] : [value],
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="All Users" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">
                                      All Users
                                    </SelectItem>
                                    <SelectItem value="ADMIN">
                                      Admins Only
                                    </SelectItem>
                                    <SelectItem value="SHOPKEEPER">
                                      Shopkeepers Only
                                    </SelectItem>
                                    <SelectItem value="CUSTOMER">
                                      Customers Only
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setNotificationDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSendNotification}
                                disabled={sendingNotification}
                              >
                                {sendingNotification ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Send
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        These actions affect the entire platform. Use with
                        caution.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "email" && (
                <div className="grid gap-6">
                  {/* Email Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Settings
                      </CardTitle>
                      <CardDescription>
                        Configure and test email delivery
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Email Status */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {loadingEmailStatus ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : emailStatus?.configured ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">SMTP Status</p>
                            <p className="text-sm text-muted-foreground">
                              {loadingEmailStatus
                                ? "Checking configuration..."
                                : emailStatus?.configured
                                  ? `Configured • Sender: ${emailStatus.sender}`
                                  : "Not configured - check environment variables"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            emailStatus?.configured ? "default" : "destructive"
                          }
                        >
                          {loadingEmailStatus
                            ? "Loading"
                            : emailStatus?.configured
                              ? "Active"
                              : "Inactive"}
                        </Badge>
                      </div>

                      {/* Test Email */}
                      <div className="space-y-3">
                        <Label>Send Test Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Verify that email delivery is working correctly
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendTestEmail}
                            disabled={
                              sendingTestEmail || !emailStatus?.configured
                            }
                          >
                            {sendingTestEmail ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Send Test
                          </Button>
                        </div>
                      </div>

                      {/* Change Admin Email */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Admin Notification Email</Label>
                            <p className="text-sm text-muted-foreground">
                              Email address where admin alerts are sent
                            </p>
                          </div>
                          <Dialog
                            open={emailDialogOpen}
                            onOpenChange={setEmailDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <KeyRound className="h-4 w-4 mr-2" />
                                Change Admin Email
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Change Admin Email</DialogTitle>
                                <DialogDescription>
                                  Update the email address for admin
                                  notifications and alerts. You must verify your
                                  identity with your current password.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Current Email</Label>
                                  <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="bg-muted"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="newEmail">
                                    New Admin Email
                                  </Label>
                                  <Input
                                    id="newEmail"
                                    type="email"
                                    placeholder="new-admin@example.com"
                                    value={adminEmailForm.newEmail}
                                    onChange={(e) =>
                                      setAdminEmailForm((prev) => ({
                                        ...prev,
                                        newEmail: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="currentPassword">
                                    Current Password
                                  </Label>
                                  <Input
                                    id="currentPassword"
                                    type="password"
                                    placeholder="Enter your password to confirm"
                                    value={adminEmailForm.currentPassword}
                                    onChange={(e) =>
                                      setAdminEmailForm((prev) => ({
                                        ...prev,
                                        currentPassword: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEmailDialogOpen(false);
                                    setAdminEmailForm({
                                      newEmail: "",
                                      currentPassword: "",
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleUpdateAdminEmail}
                                  disabled={updatingAdminEmail}
                                >
                                  {updatingAdminEmail ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Mail className="h-4 w-4 mr-2" />
                                  )}
                                  Update Email
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Description Service Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        AI Description Service
                      </CardTitle>
                      <CardDescription>
                        Manage Gemini-powered jewelry description generation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Service Status */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {loadingAiStatus ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : aiServiceStatus?.isRateLimited ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">Service Status</p>
                            <p className="text-sm text-muted-foreground">
                              {loadingAiStatus
                                ? "Checking status..."
                                : aiServiceStatus?.isRateLimited
                                  ? `Rate limited until ${aiServiceStatus.resumeAt ? new Date(aiServiceStatus.resumeAt).toLocaleString() : "Unknown"}`
                                  : "Active • Using Gemini Flash API"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            aiServiceStatus?.isRateLimited
                              ? "destructive"
                              : "default"
                          }
                        >
                          {loadingAiStatus
                            ? "Loading"
                            : aiServiceStatus?.isRateLimited
                              ? "Limited"
                              : "Active"}
                        </Badge>
                      </div>

                      {/* Usage Stats */}
                      {aiServiceStatus && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-2xl font-bold">
                              {aiServiceStatus.dailyRequestCount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Requests Today
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-2xl font-bold">
                              {aiServiceStatus.usagePercentage}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Daily Usage
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-2xl font-bold">
                              {aiServiceStatus.queueSize}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Queued Items
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {aiServiceStatus.estimatedCost}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Est. Cost Today
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Daily Limit Config */}
                      <div className="space-y-3 pt-4 border-t">
                        <Label>Daily Request Limit</Label>
                        <p className="text-sm text-muted-foreground">
                          Maximum AI description requests per day. Current
                          limit:{" "}
                          <strong>
                            {aiServiceStatus?.dailyRequestLimit?.toLocaleString() ||
                              "1,000,000"}
                          </strong>
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="e.g., 1000000"
                            value={newDailyLimit}
                            onChange={(e) => setNewDailyLimit(e.target.value)}
                            className="flex-1"
                            min={1000}
                            max={10000000}
                          />
                          <Button
                            onClick={handleUpdateDailyLimit}
                            disabled={updatingLimit}
                          >
                            {updatingLimit ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Update"
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cost estimate: ~$0.00007 per request = ~$70 for 1M
                          requests
                        </p>
                      </div>

                      {/* Admin Actions */}
                      <div className="space-y-3 pt-4 border-t">
                        <Label>Admin Actions</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshAiServiceStatus}
                            disabled={loadingAiStatus}
                          >
                            {loadingAiStatus ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Refresh Status
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetRateLimit}
                            disabled={
                              resettingRateLimit ||
                              !aiServiceStatus?.isRateLimited
                            }
                          >
                            {resettingRateLimit ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reset Rate Limit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleProcessQueue}
                            disabled={
                              processingQueue || !aiServiceStatus?.queueSize
                            }
                          >
                            {processingQueue ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Process Queue
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAiQueue}
                            disabled={
                              clearingQueue || !aiServiceStatus?.queueSize
                            }
                          >
                            {clearingQueue ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Clear Queue
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Queue processes automatically every hour. Resets daily
                          at midnight.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "tax" && (
                <div className="grid gap-6">
                  {/* Tax Rules */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Tax Rules
                      </CardTitle>
                      <CardDescription>
                        Manage country-specific tax rates and categories.
                        Changes apply to all pricing on RFQ, shop, and custom
                        orders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AdminTaxRulesPanel />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "market" && <MarketConfigTab />}

              {activeTab === "pages" && <PagesManagerTab />}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
