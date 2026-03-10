"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { sellerPerformanceApi } from "@/lib/api";
import {
  CheckCircle,
  Clock,
  Gift,
  Loader2,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ReferralData {
  id: string;
  refereeEmail: string;
  referralCode: string;
  rewardType: "PRO_3_MONTHS" | "PRO_PLUS_1_5_MONTHS";
  status: "PENDING" | "SIGNED_UP" | "COMPLETED" | "EXPIRED";
  invitedAt: string;
  signedUpAt: string | null;
  completedAt: string | null;
  referrerRewarded: boolean;
  refereeRewarded: boolean;
  shop: {
    shopName: string;
    user: { firstName: string; lastName: string; email: string };
  };
  refereeShop: { shopName: string; isVerified: boolean } | null;
}

interface ReferralSettingsData {
  id: string;
  isActive: boolean;
  proMonths: number;
  proPlusMonths: number;
  maxReferralsPerShop: number;
  expiryDays: number;
}

const REWARD_LABELS: Record<string, string> = {
  PRO_3_MONTHS: "3 months Pro",
  PRO_PLUS_1_5_MONTHS: "1.5 months Pro+",
};

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<ReferralSettingsData | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expiringOld, setExpiringOld] = useState(false);

  useEffect(() => {
    loadReferrals();
    loadSettings();
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [statusFilter]);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const res = await sellerPerformanceApi.getAdminReferrals(
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setReferrals(res?.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load referrals" });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await sellerPerformanceApi.getReferralSettings();
      setSettings(res?.data || null);
    } catch {
      console.warn("Failed to load referral settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleComplete = async (referralId: string) => {
    setActionLoading(referralId);
    try {
      await sellerPerformanceApi.completeReferral(referralId);
      toast({ title: "Referral completed — rewards granted to both parties!" });
      loadReferrals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to complete referral",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await sellerPerformanceApi.updateReferralSettings({
        isActive: settings.isActive,
        proMonths: settings.proMonths,
        proPlusMonths: settings.proPlusMonths,
        maxReferralsPerShop: settings.maxReferralsPerShop,
        expirationDays: settings.expiryDays,
      });
      toast({ title: "Referral settings saved!" });
      loadSettings();
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExpireOld = async () => {
    setExpiringOld(true);
    try {
      const res = await sellerPerformanceApi.expireOldReferrals();
      toast({
        title: `Expired ${res?.data?.expiredCount || 0} old referrals`,
      });
      loadReferrals();
    } catch {
      toast({ variant: "destructive", title: "Failed to expire old referrals" });
    } finally {
      setExpiringOld(false);
    }
  };

  const stats = {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "PENDING").length,
    signedUp: referrals.filter((r) => r.status === "SIGNED_UP").length,
    completed: referrals.filter((r) => r.status === "COMPLETED").length,
    expired: referrals.filter((r) => r.status === "EXPIRED").length,
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="h-6 w-6 text-purple-500" />
                Referral Programme — Admin
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage referral invitations, complete rewards, and configure
                settings
              </p>
            </div>
          </div>

          <Tabs defaultValue="referrals">
            <TabsList>
              <TabsTrigger value="referrals" className="gap-1.5">
                <Users className="h-4 w-4" /> Referrals
                {stats.signedUp > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {stats.signedUp}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" /> Settings
              </TabsTrigger>
            </TabsList>

            {/* ═══ REFERRALS TAB ═══ */}
            <TabsContent value="referrals" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {stats.pending}
                    </p>
                    <p className="text-xs text-muted-foreground">Invited</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.signedUp}
                    </p>
                    <p className="text-xs text-muted-foreground">Signed Up</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.completed}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {stats.expired}
                    </p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter + Actions */}
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="PENDING">Invited</SelectItem>
                    <SelectItem value="SIGNED_UP">Signed Up</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpireOld}
                  disabled={expiringOld}
                >
                  {expiringOld ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Expire Old
                </Button>
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : referrals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No referrals found.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Referee Email</TableHead>
                          <TableHead>Reward</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Referee Shop</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referrals.map((ref) => (
                          <TableRow key={ref.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {ref.shop.shopName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ref.shop.user.firstName}{" "}
                                  {ref.shop.user.lastName}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {ref.refereeEmail}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {REWARD_LABELS[ref.rewardType] ||
                                  ref.rewardType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  ref.status === "COMPLETED"
                                    ? "default"
                                    : ref.status === "SIGNED_UP"
                                      ? "secondary"
                                      : ref.status === "EXPIRED"
                                        ? "destructive"
                                        : "outline"
                                }
                                className={
                                  ref.status === "COMPLETED"
                                    ? "bg-green-600"
                                    : ""
                                }
                              >
                                {ref.status === "PENDING"
                                  ? "Invited"
                                  : ref.status === "SIGNED_UP"
                                    ? "Signed Up"
                                    : ref.status === "COMPLETED"
                                      ? "Completed"
                                      : "Expired"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {ref.refereeShop ? (
                                <div>
                                  <p>{ref.refereeShop.shopName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ref.refereeShop.isVerified
                                      ? "✓ Verified"
                                      : "Not verified"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(ref.invitedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {ref.status === "SIGNED_UP" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleComplete(ref.id)}
                                  disabled={actionLoading === ref.id}
                                >
                                  {actionLoading === ref.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Complete & Reward
                                </Button>
                              )}
                              {ref.status === "COMPLETED" && (
                                <span className="text-xs text-green-600 font-medium">
                                  Both rewarded ✓
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ SETTINGS TAB ═══ */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              {settingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : settings ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Referral Programme Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">
                          Programme Active
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          When disabled, sellers cannot send new referrals
                        </p>
                      </div>
                      <Switch
                        checked={settings.isActive}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, isActive: checked })
                        }
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Pro months */}
                      <div>
                        <Label htmlFor="proMonths">Pro Months (Option A)</Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          Free Pro months each party gets
                        </p>
                        <Input
                          id="proMonths"
                          type="number"
                          min={1}
                          max={12}
                          value={settings.proMonths}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              proMonths: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </div>

                      {/* Pro+ months */}
                      <div>
                        <Label htmlFor="proPlusMonths">
                          Pro+ Months (Option B)
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          Free Pro+ months each party gets
                        </p>
                        <Input
                          id="proPlusMonths"
                          type="number"
                          min={0.5}
                          max={12}
                          step={0.5}
                          value={settings.proPlusMonths}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              proPlusMonths: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </div>

                      {/* Max referrals */}
                      <div>
                        <Label htmlFor="maxReferrals">
                          Max Referrals per Shop
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          How many invitations each seller can send
                        </p>
                        <Input
                          id="maxReferrals"
                          type="number"
                          min={1}
                          max={100}
                          value={settings.maxReferralsPerShop}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxReferralsPerShop:
                                Number(e.target.value) || 10,
                            })
                          }
                        />
                      </div>

                      {/* Expiry days */}
                      <div>
                        <Label htmlFor="expiryDays">
                          Invitation Expiry (days)
                        </Label>
                        <p className="text-xs text-muted-foreground mb-1">
                          After how many days an unclaimed invite expires
                        </p>
                        <Input
                          id="expiryDays"
                          type="number"
                          min={7}
                          max={365}
                          value={settings.expiryDays}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              expiryDays: Number(e.target.value) || 30,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {savingSettings ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Save Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Failed to load settings.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
