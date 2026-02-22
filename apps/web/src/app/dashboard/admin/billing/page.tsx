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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  aiCreditsApi,
  paymentGatewayApi,
  sellerSubscriptionsApi,
  subscriptionPlansApi,
} from "@/lib/api";
import {
  Crown,
  DollarSign,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  country: string;
  currency: string;
  monthlyPrice: number;
  annualPrice?: number;
  catalogueLimit?: number;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  rolloverCap: number;
  extraCreditPrice: number;
  overageBehavior: string;
  features?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

interface Subscription {
  id: string;
  shopId: string;
  status: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  plan: Plan;
  shop?: { businessName: string; owner?: { email: string } };
}

interface GatewayConfig {
  id: string;
  gatewayName: string;
  displayName: string;
  isEnabled: boolean;
  supportedCountries: string[];
  supportedMethods: string[];
  priority: number;
  envKeyLabel: string;
  webhookEndpoint?: string;
}

// ─── Main Page ───────────────────────────────────

export default function AdminBillingPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Billing & Plans</h1>
            <p className="text-muted-foreground">
              Manage subscription plans, seller billing, AI credits, and payment
              gateways.
            </p>
          </div>

          <Tabs defaultValue="plans" className="space-y-4">
            <TabsList>
              <TabsTrigger value="plans">Plans</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="credits">AI Credits</TabsTrigger>
              <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
            </TabsList>

            <TabsContent value="plans">
              <PlansTab />
            </TabsContent>
            <TabsContent value="subscriptions">
              <SubscriptionsTab />
            </TabsContent>
            <TabsContent value="credits">
              <CreditsTab />
            </TabsContent>
            <TabsContent value="gateways">
              <GatewaysTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}

// ═══════════════════════════════════════════════════
// PLANS TAB
// ═══════════════════════════════════════════════════

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (countryFilter) params.country = countryFilter;
      const res = await subscriptionPlansApi.list(params);
      setPlans(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch {
      toast({
        title: "Error",
        description: "Failed to load plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [countryFilter]);

  const handleToggle = async (plan: Plan) => {
    try {
      await subscriptionPlansApi.toggle(plan.id, !plan.isActive);
      toast({
        title: "Success",
        description: `Plan ${plan.isActive ? "disabled" : "enabled"} successfully`,
      });
      fetchPlans();
    } catch {
      toast({
        title: "Error",
        description: "Failed to toggle plan",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={countryFilter || "ALL"} onValueChange={(v) => setCountryFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="NP">Nepal</SelectItem>
              <SelectItem value="IN">India</SelectItem>
              <SelectItem value="AE">UAE</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Subscription Plan</DialogTitle>
            </DialogHeader>
            <CreatePlanForm
              onSuccess={() => {
                setShowCreate(false);
                fetchPlans();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading plans...
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No plans found. Create your first subscription plan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription>
                  {plan.country} · {plan.currency}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="font-medium">
                    {plan.monthlyPrice === 0
                      ? "Free"
                      : `${plan.currency} ${plan.monthlyPrice}`}
                  </span>
                </div>
                {plan.annualPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual</span>
                    <span className="font-medium">
                      {plan.currency} {plan.annualPrice}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-medium">{plan.commissionPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Credits/mo</span>
                  <span className="font-medium">
                    {plan.includesAi ? plan.monthlyAiCredits : "—"}
                  </span>
                </div>
                {plan.catalogueLimit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Catalogue Limit
                    </span>
                    <span className="font-medium">{plan.catalogueLimit}</span>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(plan)}
                  >
                    {plan.isActive ? (
                      <ToggleLeft className="mr-1 h-3 w-3" />
                    ) : (
                      <ToggleRight className="mr-1 h-3 w-3" />
                    )}
                    {plan.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Plan Form ────────────────────────────

function CreatePlanForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    description: "",
    country: "NP",
    currency: "NPR",
    monthlyPrice: 0,
    annualPrice: 0,
    catalogueLimit: 0,
    commissionPercent: 5,
    includesAi: false,
    monthlyAiCredits: 0,
    rolloverCap: 0,
    extraCreditPrice: 0,
    overageBehavior: "BLOCK",
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const CURRENCY_MAP: Record<string, string> = {
    NP: "NPR",
    IN: "INR",
    AE: "AED",
    UK: "GBP",
    US: "USD",
    EU: "EUR",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await subscriptionPlansApi.create(form);
      toast({ title: "Success", description: "Plan created successfully" });
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to create plan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Plan Name</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            placeholder="FREE, PRO, ENTERPRISE"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Display Name</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            placeholder="Free Plan"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Country</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.country}
            onChange={(e) =>
              setForm({
                ...form,
                country: e.target.value,
                currency: CURRENCY_MAP[e.target.value] || "USD",
              })
            }
          >
            <option value="NP">Nepal</option>
            <option value="IN">India</option>
            <option value="AE">UAE</option>
            <option value="UK">UK</option>
            <option value="US">US</option>
            <option value="EU">EU</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Currency</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.currency}
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Monthly Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.monthlyPrice}
            onChange={(e) =>
              setForm({
                ...form,
                monthlyPrice: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Annual Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.annualPrice}
            onChange={(e) =>
              setForm({ ...form, annualPrice: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Commission %</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.commissionPercent}
            onChange={(e) =>
              setForm({
                ...form,
                commissionPercent: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.includesAi}
            onChange={(e) => setForm({ ...form, includesAi: e.target.checked })}
          />
          <label className="text-sm font-medium">Includes AI</label>
        </div>
        <div>
          <label className="text-sm font-medium">AI Credits/mo</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.monthlyAiCredits}
            onChange={(e) =>
              setForm({
                ...form,
                monthlyAiCredits: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Creating..." : "Create Plan"}
      </Button>
    </form>
  );
}

// ═══════════════════════════════════════════════════
// SUBSCRIPTIONS TAB
// ═══════════════════════════════════════════════════

function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true);
        const [subsRes, statsRes] = await Promise.all([
          sellerSubscriptionsApi.listAll({ limit: 50 }),
          sellerSubscriptionsApi.getStats(),
        ]);
        const subsData = subsRes.data;
        setSubs(Array.isArray(subsData) ? subsData : (subsData?.data ?? []));
        setStats(statsRes.data);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load subscriptions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly MRR</p>
                  <p className="text-2xl font-bold">
                    ${stats.mrr?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">By Status</p>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {stats.byStatus?.map((s: any) => (
                      <Badge key={s.status} variant="outline">
                        {s.status}: {s.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold">
                    {stats.byStatus?.find((s: any) => s.status === "ACTIVE")
                      ?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription list */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No subscriptions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Shop</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Period End</th>
                <th className="px-4 py-3 text-left font-medium">Auto Renew</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subs.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {(sub.shop as any)?.shopName || (sub.shop as any)?.businessName || sub.shopId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(sub.shop as any)?.user?.email || (sub.shop as any)?.owner?.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{sub.plan.displayName}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        sub.status === "ACTIVE"
                          ? "default"
                          : sub.status === "TRIALING"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{sub.autoRenew ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CREDITS TAB
// ═══════════════════════════════════════════════════

function CreditsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await aiCreditsApi.getCreditStats();
        setStats(res.data);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load credit stats",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const handleMonthlyGrant = async () => {
    if (
      !confirm(
        "This will grant monthly credits to all active subscribers. Continue?",
      )
    )
      return;
    try {
      const res = await aiCreditsApi.triggerMonthlyGrant();
      toast({
        title: "Success",
        description: `Granted credits to ${res.data.granted} users, expired ${res.data.expired} credits`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to process monthly grant",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Credit Overview</h3>
        <Button variant="outline" onClick={handleMonthlyGrant}>
          <Sparkles className="mr-2 h-4 w-4" />
          Trigger Monthly Grant
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Granted</p>
              <p className="text-2xl font-bold text-green-500">
                {stats.totalGranted?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Used</p>
              <p className="text-2xl font-bold text-blue-500">
                {stats.totalDebited?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Refunded</p>
              <p className="text-2xl font-bold text-yellow-500">
                {stats.totalRefunded?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">In Circulation</p>
              <p className="text-2xl font-bold">
                {stats.netCreditsInCirculation?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// GATEWAYS TAB
// ═══════════════════════════════════════════════════

function GatewaysTab() {
  const [configs, setConfigs] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await paymentGatewayApi.listConfigs();
      setConfigs(res.data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load gateway configs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = async (config: GatewayConfig) => {
    try {
      await paymentGatewayApi.toggleGateway(config.id, !config.isEnabled);
      toast({
        title: "Success",
        description: `${config.displayName} ${config.isEnabled ? "disabled" : "enabled"}`,
      });
      fetchConfigs();
    } catch {
      toast({
        title: "Error",
        description: "Failed to toggle gateway",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment Gateways</h3>
        <p className="text-sm text-muted-foreground">
          Gateway secrets are stored as environment variables, never in the
          database.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payment gateways configured yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {config.displayName}
                  </CardTitle>
                  <Badge variant={config.isEnabled ? "default" : "secondary"}>
                    {config.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription>{config.gatewayName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Countries</span>
                  <span>{config.supportedCountries.join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-medium">{config.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Env Key</span>
                  <code className="text-xs">{config.envKeyLabel}</code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => handleToggle(config)}
                >
                  {config.isEnabled ? "Disable" : "Enable"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
