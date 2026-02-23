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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  Copy,
  Crown,
  DollarSign,
  Globe,
  Link,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
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
  maxProducts?: number | null;
  maxInvoicesPerMonth?: number | null;
  maxCatalogues?: number | null;
  catalogueLimit?: number | null;
  maxOrdersPerMonth?: number | null;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  rolloverCap: number;
  extraCreditPrice: number;
  overageBehavior: string;
  features?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  badgeText?: string | null;
  buttonColor?: string | null;
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
  isDefault: boolean;
  supportedCountries: string[];
  supportedMethods: string[];
  priority: number;
  envKeyLabel: string;
  envKeysRequired?: string[];
  commissionInfo?: string;
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

/** All known feature keys — used for checkboxes in the edit dialog */
const ALL_FEATURE_KEYS: {
  key: string;
  label: string;
  category: string;
  enforced: boolean;
}[] = [
  {
    key: "marketplace",
    label: "Marketplace listing",
    category: "Marketplace",
    enforced: false,
  },
  {
    key: "priorityListing",
    label: "Priority listing",
    category: "Marketplace",
    enforced: false,
  },
  {
    key: "bulkUpload",
    label: "Bulk product upload",
    category: "Marketplace",
    enforced: true,
  },
  {
    key: "crm",
    label: "CRM suite",
    category: "CRM & Business",
    enforced: true,
  },
  {
    key: "invoicing",
    label: "Invoicing & billing",
    category: "CRM & Business",
    enforced: true,
  },
  {
    key: "inventoryManagement",
    label: "Inventory management",
    category: "CRM & Business",
    enforced: false,
  },
  {
    key: "customerManagement",
    label: "Customer management",
    category: "CRM & Business",
    enforced: false,
  },
  {
    key: "customBranding",
    label: "Custom branding",
    category: "CRM & Business",
    enforced: true,
  },
  {
    key: "staffAccounts",
    label: "Staff accounts",
    category: "CRM & Business",
    enforced: true,
  },
  {
    key: "multiBranch",
    label: "Multi-branch support",
    category: "CRM & Business",
    enforced: true,
  },
  {
    key: "purchasableAiCredits",
    label: "Purchasable AI credits",
    category: "AI & Intelligence",
    enforced: true,
  },
  {
    key: "aiDesignGeneration",
    label: "AI design generation",
    category: "AI & Intelligence",
    enforced: true,
  },
  {
    key: "aiSmartRecommendations",
    label: "Smart recommendations",
    category: "AI & Intelligence",
    enforced: false,
  },
  {
    key: "aiPriceOptimization",
    label: "Price optimization",
    category: "AI & Intelligence",
    enforced: true,
  },
  {
    key: "demandForecasting",
    label: "Demand forecasting",
    category: "AI & Intelligence",
    enforced: true,
  },
  {
    key: "basicAnalytics",
    label: "Basic analytics",
    category: "Analytics & Reports",
    enforced: false,
  },
  {
    key: "advancedAnalytics",
    label: "Advanced analytics",
    category: "Analytics & Reports",
    enforced: false,
  },
  {
    key: "scheduledReports",
    label: "Scheduled reports",
    category: "Analytics & Reports",
    enforced: true,
  },
  {
    key: "auditLogExport",
    label: "Audit log export",
    category: "Analytics & Reports",
    enforced: false,
  },
  {
    key: "prioritySupport",
    label: "Priority support",
    category: "Support & Integration",
    enforced: true,
  },
  {
    key: "dedicatedSupport",
    label: "Dedicated support",
    category: "Support & Integration",
    enforced: true,
  },
  {
    key: "dedicatedAccountManager",
    label: "Account manager",
    category: "Support & Integration",
    enforced: false,
  },
  {
    key: "apiAccess",
    label: "API access",
    category: "Support & Integration",
    enforced: true,
  },
  {
    key: "webhookSubscriptions",
    label: "Webhook subscriptions",
    category: "Support & Integration",
    enforced: true,
  },
  {
    key: "whiteLabel",
    label: "White-label option",
    category: "Support & Integration",
    enforced: false,
  },
  {
    key: "customDomain",
    label: "Custom domain",
    category: "Support & Integration",
    enforced: false,
  },
  {
    key: "customIntegrations",
    label: "Custom integrations",
    category: "Support & Integration",
    enforced: false,
  },
];

const FEATURE_CATEGORIES = Array.from(
  new Set(ALL_FEATURE_KEYS.map((f) => f.category)),
);

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const openEditPlan = (plan: Plan) => {
    setEditPlan(plan);
    setEditForm({
      displayName: plan.displayName,
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice ?? "",
      maxProducts: plan.maxProducts ?? "",
      maxInvoicesPerMonth: plan.maxInvoicesPerMonth ?? "",
      maxCatalogues: plan.maxCatalogues ?? "",
      catalogueLimit: plan.catalogueLimit ?? "",
      maxOrdersPerMonth: plan.maxOrdersPerMonth ?? "",
      commissionPercent: plan.commissionPercent,
      includesAi: plan.includesAi,
      monthlyAiCredits: plan.monthlyAiCredits,
      rolloverCap: plan.rolloverCap,
      extraCreditPrice: plan.extraCreditPrice,
      sortOrder: plan.sortOrder,
      features: { ...(plan.features ?? {}) },
      badgeText: plan.badgeText ?? "",
      buttonColor: plan.buttonColor ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editPlan) return;
    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      const f = editForm;
      const p = editPlan;
      if (f.displayName !== p.displayName) payload.displayName = f.displayName;
      if (f.description !== (p.description || ""))
        payload.description = f.description;
      if (Number(f.monthlyPrice) !== p.monthlyPrice)
        payload.monthlyPrice = Number(f.monthlyPrice);
      if (
        f.annualPrice !== "" &&
        Number(f.annualPrice) !== (p.annualPrice ?? 0)
      )
        payload.annualPrice = Number(f.annualPrice);
      if (
        f.maxProducts !== "" &&
        Number(f.maxProducts) !== (p.maxProducts ?? 0)
      )
        payload.maxProducts = Number(f.maxProducts);
      if (
        f.maxInvoicesPerMonth !== "" &&
        Number(f.maxInvoicesPerMonth) !== (p.maxInvoicesPerMonth ?? 0)
      )
        payload.maxInvoicesPerMonth = Number(f.maxInvoicesPerMonth);
      if (
        f.maxCatalogues !== "" &&
        Number(f.maxCatalogues) !== (p.maxCatalogues ?? 0)
      )
        payload.maxCatalogues = Number(f.maxCatalogues);
      if (
        f.maxOrdersPerMonth !== "" &&
        Number(f.maxOrdersPerMonth) !== (p.maxOrdersPerMonth ?? 0)
      )
        payload.maxOrdersPerMonth = Number(f.maxOrdersPerMonth);
      if (Number(f.commissionPercent) !== p.commissionPercent)
        payload.commissionPercent = Number(f.commissionPercent);
      if (f.includesAi !== p.includesAi) payload.includesAi = f.includesAi;
      if (Number(f.monthlyAiCredits) !== p.monthlyAiCredits)
        payload.monthlyAiCredits = Number(f.monthlyAiCredits);
      if (Number(f.extraCreditPrice) !== p.extraCreditPrice)
        payload.extraCreditPrice = Number(f.extraCreditPrice);
      if (Number(f.rolloverCap) !== p.rolloverCap)
        payload.rolloverCap = Number(f.rolloverCap);
      if (Number(f.sortOrder) !== p.sortOrder)
        payload.sortOrder = Number(f.sortOrder);

      // Features — always send if changed
      const currentFeatures = JSON.stringify(p.features ?? {});
      const newFeatures = JSON.stringify(f.features ?? {});
      if (newFeatures !== currentFeatures) payload.features = f.features;

      // Display customization
      if ((f.badgeText ?? "") !== (p.badgeText ?? ""))
        payload.badgeText = f.badgeText || null;
      if ((f.buttonColor ?? "") !== (p.buttonColor ?? ""))
        payload.buttonColor = f.buttonColor || null;

      if (Object.keys(payload).length === 0) {
        toast({ title: "Info", description: "No changes detected." });
        setActionLoading(false);
        return;
      }
      await subscriptionPlansApi.update(p.id, payload);
      toast({
        title: "Success",
        description: `Plan "${p.displayName}" updated.`,
      });
      setEditPlan(null);
      fetchPlans();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update plan",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePlan) return;
    setActionLoading(true);
    try {
      await subscriptionPlansApi.deletePlan(deletePlan.id);
      toast({
        title: "Success",
        description: `Plan "${deletePlan.displayName}" deleted.`,
      });
      setDeletePlan(null);
      fetchPlans();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete plan",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

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

  const COUNTRY_PILLS: { code: string; label: string }[] = [
    { code: "", label: "All" },
    { code: "NP", label: "Nepal" },
    { code: "IN", label: "India" },
    { code: "AE", label: "UAE" },
    { code: "UK", label: "UK" },
    { code: "US", label: "US" },
    { code: "EU", label: "EU" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-700">
          {COUNTRY_PILLS.map((c) => (
            <button
              key={c.code}
              onClick={() => setCountryFilter(c.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                countryFilter === c.code
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title={c.label}
            >
              {c.label}
            </button>
          ))}
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
                <div className="mt-2 border-t pt-2 text-xs font-medium text-muted-foreground">
                  Resource Limits
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{plan.maxProducts ?? "∞"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoices/mo</span>
                  <span className="font-medium">
                    {plan.maxInvoicesPerMonth ?? "∞"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Catalogues</span>
                  <span className="font-medium">
                    {plan.maxCatalogues ?? "∞"}
                  </span>
                </div>
                {plan.catalogueLimit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Items/Catalogue
                    </span>
                    <span className="font-medium">{plan.catalogueLimit}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orders/mo</span>
                  <span className="font-medium">
                    {plan.maxOrdersPerMonth ?? "∞"}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditPlan(plan)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setDeletePlan(plan)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Plan Dialog */}
      <Dialog
        open={!!editPlan}
        onOpenChange={(open) => !open && setEditPlan(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              Edit Plan: {editPlan?.displayName}
            </DialogTitle>
            <DialogDescription>
              Update plan details. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Display Name</Label>
              <Input
                value={(editForm.displayName as string) || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayName: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input
                value={(editForm.description as string) || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Monthly Price ({editPlan?.currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={(editForm.monthlyPrice as number) ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, monthlyPrice: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Annual Price ({editPlan?.currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={(editForm.annualPrice as number) ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, annualPrice: e.target.value })
                }
                placeholder="Leave empty for none"
              />
            </div>
            <div>
              <Label>Commission %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={(editForm.commissionPercent as number) ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    commissionPercent: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.sortOrder as number) ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, sortOrder: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Resource Limits (empty = unlimited)
              </p>
            </div>
            <div>
              <Label>Max Products</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.maxProducts as number) ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, maxProducts: e.target.value })
                }
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Max Invoices/Month</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.maxInvoicesPerMonth as number) ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxInvoicesPerMonth: e.target.value,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Max Catalogues</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.maxCatalogues as number) ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, maxCatalogues: e.target.value })
                }
                placeholder="Unlimited"
              />
            </div>
            <div>
              <Label>Max Orders/Month</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.maxOrdersPerMonth as number) ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxOrdersPerMonth: e.target.value,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                AI Settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!editForm.includesAi}
                onChange={(e) =>
                  setEditForm({ ...editForm, includesAi: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label>Includes AI Features</Label>
            </div>
            <div>
              <Label>Monthly AI Credits</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.monthlyAiCredits as number) ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, monthlyAiCredits: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Extra Credit Price</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={(editForm.extraCreditPrice as number) ?? 0}
                onChange={(e) =>
                  setEditForm({ ...editForm, extraCreditPrice: parseFloat(e.target.value) || 0 })
                }
                placeholder="Price per extra AI credit"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Price per extra AI credit (in plan currency). Set &gt; 0 to enable purchasing.
              </p>
            </div>
            <div>
              <Label>Rollover Cap</Label>
              <Input
                type="number"
                min={0}
                value={(editForm.rolloverCap as number) ?? 0}
                onChange={(e) =>
                  setEditForm({ ...editForm, rolloverCap: parseInt(e.target.value) || 0 })
                }
                placeholder="0 = no rollover"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max unused credits that roll over to next month (0 = none)
              </p>
            </div>

            {/* ─── Display Customization ─────────────────────── */}
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Display Customization
              </p>
            </div>
            <div>
              <Label>Badge Text</Label>
              <Input
                value={(editForm.badgeText as string) || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, badgeText: e.target.value })
                }
                placeholder='e.g. "Most Popular"'
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shown on the pricing page card
              </p>
            </div>
            <div>
              <Label>Button Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={(editForm.buttonColor as string) || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, buttonColor: e.target.value })
                  }
                  placeholder="#f59e0b"
                  className="flex-1"
                />
                {(editForm.buttonColor as string) && (
                  <div
                    className="h-9 w-9 rounded-md border flex-shrink-0"
                    style={{ backgroundColor: editForm.buttonColor as string }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Hex color for CTA button on pricing page
              </p>
            </div>

            {/* ─── Plan Features (checkboxes) ────────────────── */}
            <div className="col-span-2 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Plan Features
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                <span className="inline-flex items-center gap-1">
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1 py-0.5 rounded text-[10px] font-medium">
                    Enforced
                  </span>{" "}
                  = backend blocks access when disabled.
                </span>{" "}
                <span className="inline-flex items-center gap-1">
                  <span className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 px-1 py-0.5 rounded text-[10px] font-medium">
                    Display only
                  </span>{" "}
                  = shown on pricing page only.
                </span>
              </p>
              <div className="space-y-4">
                {FEATURE_CATEGORIES.map((cat) => {
                  const keys = ALL_FEATURE_KEYS.filter(
                    (f) => f.category === cat,
                  );
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {cat}
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {keys.map(({ key, label, enforced }) => {
                          const features =
                            (editForm.features as Record<string, unknown>) ??
                            {};
                          const checked = !!features[key];
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const updated = {
                                    ...features,
                                    [key]: e.target.checked,
                                  };
                                  setEditForm({
                                    ...editForm,
                                    features: updated,
                                  });
                                }}
                                className="h-4 w-4 rounded border-gray-300 accent-amber-500"
                              />
                              <span
                                className={
                                  checked
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }
                              >
                                {label}
                              </span>
                              {enforced ? (
                                <span className="text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                                  Enforced
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                                  Display only
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog
        open={!!deletePlan}
        onOpenChange={(open) => !open && setDeletePlan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deletePlan?.displayName}</strong>? This will only succeed
              if there are <strong>zero</strong> active subscribers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlan(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePlanForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    description: "",
    country: "NP",
    currency: "NPR",
    monthlyPrice: 0,
    annualPrice: 0,
    maxProducts: 0,
    maxInvoicesPerMonth: 0,
    maxCatalogues: 0,
    catalogueLimit: 0,
    maxOrdersPerMonth: 0,
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
      // 0 means unlimited → send as null
      const payload = {
        ...form,
        maxProducts: form.maxProducts || null,
        maxInvoicesPerMonth: form.maxInvoicesPerMonth || null,
        maxCatalogues: form.maxCatalogues || null,
        catalogueLimit: form.catalogueLimit || null,
        maxOrdersPerMonth: form.maxOrdersPerMonth || null,
      };
      await subscriptionPlansApi.create(payload);
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Extra Credit Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.extraCreditPrice}
            onChange={(e) =>
              setForm({
                ...form,
                extraCreditPrice: parseFloat(e.target.value) || 0,
              })
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            Price per extra AI credit. Set &gt; 0 to enable purchasing.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Rollover Cap</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.rolloverCap}
            onChange={(e) =>
              setForm({
                ...form,
                rolloverCap: parseInt(e.target.value) || 0,
              })
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            Max unused credits rolling over (0 = none)
          </p>
        </div>
      </div>

      {/* ── Resource Limits (0 = unlimited) ──────────── */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          Resource Limits (0 = unlimited)
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Max Products</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.maxProducts}
            onChange={(e) =>
              setForm({ ...form, maxProducts: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Max Invoices/mo</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.maxInvoicesPerMonth}
            onChange={(e) =>
              setForm({
                ...form,
                maxInvoicesPerMonth: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Max Catalogues</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.maxCatalogues}
            onChange={(e) =>
              setForm({ ...form, maxCatalogues: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Items/Catalogue</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.catalogueLimit}
            onChange={(e) =>
              setForm({
                ...form,
                catalogueLimit: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Max Orders/mo</label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900"
            value={form.maxOrdersPerMonth}
            onChange={(e) =>
              setForm({
                ...form,
                maxOrdersPerMonth: parseInt(e.target.value) || 0,
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({
    shopId: "",
    planId: "",
    durationMonths: 1,
    reason: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, statsRes, plansRes] = await Promise.all([
        sellerSubscriptionsApi.listAll({ limit: 100 }),
        sellerSubscriptionsApi.getStats(),
        subscriptionPlansApi.list(),
      ]);
      const subsData = subsRes.data;
      setSubs(Array.isArray(subsData) ? subsData : (subsData?.data ?? []));
      setStats(statsRes.data);
      setPlans(
        Array.isArray(plansRes.data)
          ? plansRes.data
          : (plansRes.data?.data ?? []),
      );
    } catch {
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignPlan = async () => {
    if (!assignForm.shopId || !assignForm.planId) {
      toast({
        title: "Error",
        description: "Please select a shop and a plan",
        variant: "destructive",
      });
      return;
    }
    setActionLoading(true);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + assignForm.durationMonths);

      await sellerSubscriptionsApi.adminOverride({
        shopId: assignForm.shopId,
        planId: assignForm.planId,
        periodEnd: periodEnd.toISOString(),
        reason:
          assignForm.reason ||
          `Admin assigned for ${assignForm.durationMonths} month(s)`,
      });
      toast({
        title: "Success",
        description: `Plan assigned for ${assignForm.durationMonths} month(s).`,
      });
      setAssignDialog(false);
      setAssignForm({ shopId: "", planId: "", durationMonths: 1, reason: "" });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to assign plan",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (subId: string) => {
    try {
      await sellerSubscriptionsApi.adminActivate(subId);
      toast({ title: "Success", description: "Subscription activated." });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to activate",
        variant: "destructive",
      });
    }
  };

  // Get unique shops from subscriptions for the assign dialog
  const uniqueShops = Array.from(
    new Map(
      subs.map((s) => [
        s.shopId,
        {
          id: s.shopId,
          name:
            (s.shop as any)?.shopName ||
            (s.shop as any)?.businessName ||
            s.shopId,
          email:
            (s.shop as any)?.user?.email || (s.shop as any)?.owner?.email || "",
        },
      ]),
    ).values(),
  );

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

      {/* Assign Plan Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">All Subscriptions</h3>
        <Button onClick={() => setAssignDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign Plan to Shop
        </Button>
      </div>

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
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subs.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {(sub.shop as any)?.shopName ||
                          (sub.shop as any)?.businessName ||
                          sub.shopId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(sub.shop as any)?.user?.email ||
                          (sub.shop as any)?.owner?.email}
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {sub.status !== "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivate(sub.id)}
                        >
                          Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAssignForm({
                            shopId: sub.shopId,
                            planId: "",
                            durationMonths: 1,
                            reason: "",
                          });
                          setAssignDialog(true);
                        }}
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        Change Plan
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Plan Dialog */}
      <Dialog
        open={assignDialog}
        onOpenChange={(open) => !open && setAssignDialog(false)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              Assign Plan to Shop
            </DialogTitle>
            <DialogDescription>
              Force-assign a subscription plan to a shop for 1-12 months. The
              current active subscription will be cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Shop</Label>
              {assignForm.shopId ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="px-3 py-1.5">
                    {uniqueShops.find((s) => s.id === assignForm.shopId)
                      ?.name || assignForm.shopId}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAssignForm({ ...assignForm, shopId: "" })}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <Input
                    placeholder="Paste Shop ID or select from table..."
                    value={assignForm.shopId}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, shopId: e.target.value })
                    }
                  />
                  {uniqueShops.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto rounded border p-1">
                      {uniqueShops.map((shop) => (
                        <button
                          key={shop.id}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted/50"
                          onClick={() =>
                            setAssignForm({ ...assignForm, shopId: shop.id })
                          }
                        >
                          <span className="font-medium">{shop.name}</span>
                          {shop.email && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {shop.email}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Plan</Label>
              <Select
                value={assignForm.planId}
                onValueChange={(v) =>
                  setAssignForm({ ...assignForm, planId: v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName} ({p.country}) — {p.currency}{" "}
                        {p.monthlyPrice}/mo
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (months)</Label>
              <Select
                value={String(assignForm.durationMonths)}
                onValueChange={(v) =>
                  setAssignForm({ ...assignForm, durationMonths: Number(v) })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} month{m > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Promotional offer, support case..."
                value={assignForm.reason}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, reason: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={
                actionLoading || !assignForm.shopId || !assignForm.planId
              }
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CREDITS TAB
// ═══════════════════════════════════════════════════

interface SellerCredit {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  aiCreditsBalance: number;
  shop: { id: string; shopName: string; autoRechargeEnabled: boolean } | null;
}

function CreditsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Seller list
  const [sellers, setSellers] = useState<SellerCredit[]>([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellersLoading, setSellersLoading] = useState(false);

  // Adjust dialog
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<SellerCredit | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    amount: 50,
    reason: "",
    isDeduction: false,
  });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchStats = async () => {
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
  };

  const fetchSellers = async (search?: string) => {
    try {
      setSellersLoading(true);
      const res = await aiCreditsApi.listSellers({
        search: search || undefined,
        limit: 20,
      });
      setSellers(res.data?.data ?? []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load sellers",
        variant: "destructive",
      });
    } finally {
      setSellersLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSellers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSellers(sellerSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [sellerSearch]);

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
      fetchStats();
      fetchSellers(sellerSearch);
    } catch {
      toast({
        title: "Error",
        description: "Failed to process monthly grant",
        variant: "destructive",
      });
    }
  };

  const openAdjustDialog = (seller: SellerCredit) => {
    setAdjustTarget(seller);
    setAdjustForm({ amount: 50, reason: "", isDeduction: false });
    setAdjustDialog(true);
  };

  const handleAdjust = async () => {
    if (!adjustTarget) return;
    if (!adjustForm.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the adjustment",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdjustLoading(true);
      const amount = adjustForm.isDeduction
        ? -Math.abs(adjustForm.amount)
        : Math.abs(adjustForm.amount);

      await aiCreditsApi.adminAdjust({
        userId: adjustTarget.id,
        amount,
        reason: adjustForm.reason,
      });

      toast({
        title: "Success",
        description: `${amount > 0 ? "Added" : "Deducted"} ${Math.abs(amount)} credits ${amount > 0 ? "to" : "from"} ${adjustTarget.email}`,
      });
      setAdjustDialog(false);
      fetchSellers(sellerSearch);
      fetchStats();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to adjust credits",
        variant: "destructive",
      });
    } finally {
      setAdjustLoading(false);
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

      {/* Seller Credits Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Seller Credits
              </CardTitle>
              <CardDescription>
                View and adjust AI credit balances for individual sellers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, email, or shop name..."
            value={sellerSearch}
            onChange={(e) => setSellerSearch(e.target.value)}
            className="mb-4"
          />

          {sellersLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
              Loading sellers...
            </div>
          ) : sellers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No sellers found.
            </p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Seller</th>
                    <th className="px-4 py-3 text-left font-medium">Shop</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Auto-Recharge
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {seller.firstName} {seller.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {seller.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {seller.shop?.shopName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-semibold ${
                            seller.aiCreditsBalance <= 0
                              ? "text-red-500"
                              : seller.aiCreditsBalance < 10
                                ? "text-orange-500"
                                : "text-green-600"
                          }`}
                        >
                          {seller.aiCreditsBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {seller.shop?.autoRechargeEnabled ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-green-400 text-green-600"
                          >
                            ON
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            OFF
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustDialog(seller)}
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Credits Dialog */}
      <Dialog
        open={adjustDialog}
        onOpenChange={(open) => !open && setAdjustDialog(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Adjust Credits
            </DialogTitle>
            <DialogDescription>
              {adjustTarget && (
                <>
                  Adjusting credits for <strong>{adjustTarget.email}</strong>
                  {adjustTarget.shop?.shopName && (
                    <> ({adjustTarget.shop.shopName})</>
                  )}
                  . Current balance:{" "}
                  <strong>
                    {adjustTarget.aiCreditsBalance.toLocaleString()}
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setAdjustForm({ ...adjustForm, isDeduction: false })
                }
                className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                  !adjustForm.isDeduction
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950"
                    : "hover:border-green-300"
                }`}
              >
                <Plus className="mx-auto mb-1 h-5 w-5" />
                Add Credits
              </button>
              <button
                onClick={() =>
                  setAdjustForm({ ...adjustForm, isDeduction: true })
                }
                className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                  adjustForm.isDeduction
                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950"
                    : "hover:border-red-300"
                }`}
              >
                <AlertTriangle className="mx-auto mb-1 h-5 w-5" />
                Deduct Credits
              </button>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min={1}
                value={adjustForm.amount}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    amount: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Input
                placeholder="e.g., Promotional bonus, Bug fix compensation..."
                value={adjustForm.reason}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, reason: e.target.value })
                }
                className="mt-1"
              />
            </div>
            {adjustTarget && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>
                  New balance:{" "}
                  <strong>
                    {(
                      adjustTarget.aiCreditsBalance +
                      (adjustForm.isDeduction
                        ? -Math.abs(adjustForm.amount)
                        : Math.abs(adjustForm.amount))
                    ).toLocaleString()}
                  </strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustLoading || !adjustForm.reason.trim()}
              variant={adjustForm.isDeduction ? "destructive" : "default"}
            >
              {adjustLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : adjustForm.isDeduction ? (
                <AlertTriangle className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {adjustForm.isDeduction ? "Deduct" : "Add"}{" "}
              {Math.abs(adjustForm.amount)} Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// GATEWAYS TAB
// ═══════════════════════════════════════════════════

function GatewaysTab() {
  const [configs, setConfigs] = useState<GatewayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthMap, setHealthMap] = useState<
    Record<string, { status: string; latencyMs?: number; message?: string }>
  >({});
  const [checkingHealth, setCheckingHealth] = useState(false);

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

  const fetchHealth = async () => {
    try {
      setCheckingHealth(true);
      const res = await paymentGatewayApi.healthCheckAll();
      const map: typeof healthMap = {};
      for (const h of res.data as any[]) {
        map[h.gateway] = {
          status: h.status,
          latencyMs: h.latencyMs,
          message: h.message,
        };
      }
      setHealthMap(map);
    } catch {
      toast({
        title: "Error",
        description: "Health check failed",
        variant: "destructive",
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Auto-check health after configs load
  useEffect(() => {
    if (configs.length > 0) fetchHealth();
  }, [configs.length]);

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

  const handleSetDefault = async (config: GatewayConfig) => {
    try {
      await paymentGatewayApi.setDefault(config.id);
      toast({
        title: "Success",
        description: `${config.displayName} set as default fallback gateway`,
      });
      fetchConfigs();
    } catch {
      toast({
        title: "Error",
        description: "Failed to set default gateway",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: text });
  };

  const HealthDot = ({ gateway }: { gateway: string }) => {
    const h = healthMap[gateway];
    if (!h)
      return (
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300"
          title="Not checked"
        />
      );
    const color =
      h.status === "online"
        ? "bg-green-500"
        : h.status === "not_configured"
          ? "bg-yellow-400"
          : "bg-red-500";
    return (
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
        title={`${h.status}${h.latencyMs ? ` (${h.latencyMs}ms)` : ""}${h.message ? ` — ${h.message}` : ""}`}
      />
    );
  };

  const GATEWAY_ICONS: Record<string, string> = {
    stripe: "💳",
    phonepe: "📱",
    esewa: "🟢",
    khalti: "🟣",
    razorpay: "🔷",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Payment Gateways
          </h3>
          <p className="text-sm text-muted-foreground">
            Gateway secrets are stored as environment variables, never in the
            database. Keys shown below are labels only.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          disabled={checkingHealth}
        >
          {checkingHealth ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Check Health
        </Button>
      </div>

      {/* Health Summary Bar */}
      {Object.keys(healthMap).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {configs.map((c) => {
            const h = healthMap[c.gatewayName];
            return (
              <div
                key={c.gatewayName}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted"
              >
                <HealthDot gateway={c.gatewayName} />
                <span className="font-medium">{c.displayName}</span>
                {h?.latencyMs && (
                  <span className="text-muted-foreground">{h.latencyMs}ms</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
          Loading gateways...
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payment gateways configured yet. Run the gateway seed script to
            populate.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configs.map((config) => (
            <Card
              key={config.id}
              className={`transition-all ${config.isEnabled ? "border-l-4 border-l-green-500" : "opacity-70"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{GATEWAY_ICONS[config.gatewayName] || "🔌"}</span>
                    {config.displayName}
                    <HealthDot gateway={config.gatewayName} />
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {config.isDefault && (
                      <Badge
                        variant="outline"
                        className="text-xs border-amber-400 text-amber-600"
                      >
                        <Star className="h-3 w-3 mr-0.5" /> Default
                      </Badge>
                    )}
                    <Badge variant={config.isEnabled ? "default" : "secondary"}>
                      {config.isEnabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  {config.supportedCountries.join(", ")}
                  <span className="text-muted-foreground">•</span>
                  Priority: {config.priority}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Commission Info */}
                {config.commissionInfo && (
                  <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <DollarSign className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {config.commissionInfo}
                    </span>
                  </div>
                )}

                {/* Payment Methods */}
                <div className="flex flex-wrap gap-1">
                  {config.supportedMethods.map((m) => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {m}
                    </Badge>
                  ))}
                </div>

                {/* Env Keys Required */}
                {config.envKeysRequired &&
                  config.envKeysRequired.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Required Env Keys:
                      </span>
                      <div className="space-y-0.5">
                        {(config.envKeysRequired as string[]).map((key) => {
                          const h = healthMap[config.gatewayName];
                          const isConfigured =
                            h?.status === "online" || h?.status === undefined;
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              {isConfigured ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              )}
                              <code className="text-xs bg-muted px-1 rounded">
                                {key}
                              </code>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Webhook URL */}
                {config.webhookEndpoint && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Webhook:
                    </span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1 truncate">
                      {config.webhookEndpoint}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(
                          `https://api.orivraa.com${config.webhookEndpoint}`,
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Health status message */}
                {healthMap[config.gatewayName]?.message && (
                  <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                    {healthMap[config.gatewayName].status === "online" ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-500" />
                    )}
                    {healthMap[config.gatewayName].message}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={config.isEnabled ? "destructive" : "default"}
                    className="flex-1"
                    onClick={() => handleToggle(config)}
                  >
                    {config.isEnabled ? (
                      <>
                        <ToggleRight className="h-3.5 w-3.5 mr-1" /> Disable
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-3.5 w-3.5 mr-1" /> Enable
                      </>
                    )}
                  </Button>
                  {!config.isDefault && config.isEnabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(config)}
                      title="Set as default fallback gateway"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Webhook Status ─── */}
      <WebhookStatusSection />

      {/* ─── Stripe Sandbox Testing ─── */}
      <StripeSandboxSection />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// WEBHOOK STATUS SECTION
// ═══════════════════════════════════════════════════

function WebhookStatusSection() {
  const [webhooks, setWebhooks] = useState<
    {
      name: string;
      endpoint: string;
      configured: boolean;
      secretEnvKey: string;
      description: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await paymentGatewayApi.getWebhookStatus();
      setWebhooks(res.data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load webhook status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: text });
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Link className="h-5 w-5" /> Stripe Webhook Endpoints
          </h3>
          <p className="text-sm text-muted-foreground">
            Both endpoints must be registered in your{" "}
            <a
              href="https://dashboard.stripe.com/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              Stripe Dashboard → Webhooks
            </a>
            . Each endpoint needs its own signing secret.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 mx-auto animate-spin mb-1" />
          Checking webhooks...
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {webhooks.map((wh) => (
            <Card
              key={wh.name}
              className={`transition-all ${wh.configured ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-400"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {wh.configured ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    {wh.name}
                  </CardTitle>
                  <Badge variant={wh.configured ? "default" : "destructive"}>
                    {wh.configured ? "Configured" : "Not Set"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">{wh.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">URL:</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded flex-1 truncate">
                    https://api.orivraa.com{wh.endpoint}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() =>
                      copyToClipboard(`https://api.orivraa.com${wh.endpoint}`)
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">Secret Env:</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded">
                    {wh.secretEnvKey}
                  </code>
                  {!wh.configured && (
                    <span className="text-red-500 text-[10px]">
                      Add this env variable in Railway
                    </span>
                  )}
                </div>
                {wh.name === "Stripe Subscriptions" && (
                  <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-[10px] text-amber-700 dark:text-amber-400">
                    <strong>Events to listen for:</strong> checkout.session.completed,
                    invoice.paid, invoice.payment_failed,
                    customer.subscription.updated, customer.subscription.deleted
                  </div>
                )}
                {wh.name === "Stripe Payments" && (
                  <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-[10px] text-blue-700 dark:text-blue-400">
                    <strong>Events to listen for:</strong> payment_intent.succeeded,
                    payment_intent.payment_failed
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STRIPE SANDBOX TESTING SECTION
// ═══════════════════════════════════════════════════

function StripeSandboxSection() {
  const [isSandbox, setIsSandbox] = useState<boolean | null>(null);
  const [modeMessage, setModeMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [testingPayment, setTestingPayment] = useState(false);
  const [testingSub, setTestingSub] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    paymentIntentId?: string;
    refundId?: string;
    error?: string;
    details?: string;
  } | null>(null);
  const [subResult, setSubResult] = useState<{
    success: boolean;
    subscriptionId?: string;
    customerId?: string;
    error?: string;
    details?: string;
  } | null>(null);

  // Test config
  const [paymentAmount, setPaymentAmount] = useState(1.0);
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [subAmount, setSubAmount] = useState(9.99);
  const [subCurrency, setSubCurrency] = useState("USD");
  const [subInterval, setSubInterval] = useState<"month" | "year">("month");

  useEffect(() => {
    paymentGatewayApi
      .getStripeMode()
      .then((res) => {
        setIsSandbox(res.data.isSandbox);
        setModeMessage(res.data.message);
      })
      .catch(() => {
        setIsSandbox(false);
        setModeMessage("Could not determine Stripe mode");
      })
      .finally(() => setLoading(false));
  }, []);

  const runPaymentTest = async () => {
    setTestingPayment(true);
    setPaymentResult(null);
    try {
      const res = await paymentGatewayApi.testStripePayment({
        amount: paymentAmount,
        currency: paymentCurrency,
      });
      setPaymentResult(res.data);
    } catch (err: any) {
      setPaymentResult({
        success: false,
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setTestingPayment(false);
    }
  };

  const runSubTest = async () => {
    setTestingSub(true);
    setSubResult(null);
    try {
      const res = await paymentGatewayApi.testStripeSubscription({
        amount: subAmount,
        currency: subCurrency,
        interval: subInterval,
      });
      setSubResult(res.data);
    } catch (err: any) {
      setSubResult({
        success: false,
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setTestingSub(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-4 border-t">
        <div className="py-4 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 mx-auto animate-spin mb-1" />
          Checking Stripe mode...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4 border-t">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TestTube2 className="h-5 w-5" /> Stripe Sandbox Testing
        </h3>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {isSandbox ? (
            <>
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                TEST MODE
              </span>
              — {modeMessage}
            </>
          ) : (
            <>
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                LIVE MODE
              </span>
              — {modeMessage}
            </>
          )}
        </p>
      </div>

      {!isSandbox ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="font-medium">Live Mode Active</p>
            <p className="text-sm mt-1">
              Sandbox testing is only available when using{" "}
              <code className="bg-muted px-1 rounded">sk_test_</code> keys.
              Switch to test keys in Railway env to enable sandbox tests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* One-Time Payment Test */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Test One-Time Payment
              </CardTitle>
              <CardDescription className="text-xs">
                Creates a PaymentIntent with a test card, confirms it, then
                auto-refunds. Tests the{" "}
                <code className="text-[10px]">/payment-gateway/webhooks/stripe</code>{" "}
                flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(parseFloat(e.target.value) || 1)
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="NPR">NPR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={runPaymentTest}
                disabled={testingPayment}
                size="sm"
                className="w-full"
              >
                {testingPayment ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Run Payment Test
              </Button>
              {paymentResult && (
                <div
                  className={`p-2 rounded text-xs space-y-1 ${
                    paymentResult.success
                      ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-1 font-medium">
                    {paymentResult.success ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {paymentResult.success ? "PASSED" : "FAILED"}
                  </div>
                  {paymentResult.details && <p>{paymentResult.details}</p>}
                  {paymentResult.error && <p>Error: {paymentResult.error}</p>}
                  {paymentResult.paymentIntentId && (
                    <p className="text-[10px] text-muted-foreground">
                      PI: {paymentResult.paymentIntentId}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Test */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Test Subscription
              </CardTitle>
              <CardDescription className="text-xs">
                Creates a customer, subscription, then cancels &amp; cleans up.
                Tests the{" "}
                <code className="text-[10px]">
                  /seller-subscriptions/webhooks/stripe
                </code>{" "}
                flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={subAmount}
                    onChange={(e) =>
                      setSubAmount(parseFloat(e.target.value) || 9.99)
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={subCurrency} onValueChange={setSubCurrency}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="NPR">NPR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Interval</Label>
                  <Select
                    value={subInterval}
                    onValueChange={(v) => setSubInterval(v as "month" | "year")}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={runSubTest}
                disabled={testingSub}
                size="sm"
                className="w-full"
              >
                {testingSub ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Run Subscription Test
              </Button>
              {subResult && (
                <div
                  className={`p-2 rounded text-xs space-y-1 ${
                    subResult.success
                      ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-1 font-medium">
                    {subResult.success ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {subResult.success ? "PASSED" : "FAILED"}
                  </div>
                  {subResult.details && <p>{subResult.details}</p>}
                  {subResult.error && <p>Error: {subResult.error}</p>}
                  {subResult.subscriptionId && (
                    <p className="text-[10px] text-muted-foreground">
                      Sub: {subResult.subscriptionId}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}