"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import api from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  Building2,
  Code,
  Globe,
  Key,
  LineChart,
  Palette,
  RefreshCw,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────

interface Branch {
  id: string;
  branchName: string;
  branchCode: string;
  country: string;
  city: string;
  address: string;
  contactPhone: string;
  isActive: boolean;
  isHeadquarter: boolean;
}

interface StaffMember {
  id: string;
  staffRole: string;
  permissions: Record<string, boolean>;
  branchIds: string[];
  isActive: boolean;
  acceptedAt: string | null;
  user: { id: string; email: string; firstName: string; lastName: string };
}

interface ApiKey {
  id: string;
  keyName: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

interface WebhookSub {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastDeliveredAt: string | null;
}

interface WhiteLabelConfig {
  customDomain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  hideOrivraa: boolean;
  isActive: boolean;
}

interface RepricingRule {
  id: string;
  ruleName: string;
  ruleType: string;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  isActive: boolean;
  lastTriggeredAt: string | null;
  triggerCount: number;
}

interface Forecast {
  id: string;
  period: string;
  category: string;
  predictedDemand: number;
  confidenceScore: number;
  recommendation: string | null;
}

/** Maps each tab key to the backend feature key that gates it */
const TAB_FEATURE_MAP: Record<string, string> = {
  branches: "multiBranch",
  staff: "staffAccounts",
  "api-keys": "apiAccess",
  webhooks: "webhookSubscriptions",
  branding: "customBranding",
  repricing: "aiPriceOptimization",
  forecasts: "demandForecasting",
};

// ─── Main Page ───────────────────────────────────

export default function EnterprisePage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <EnterpriseContent />
      </DashboardLayout>
    </ShopGuard>
  );
}

function EnterpriseContent() {
  const t = useT();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const [activeTab, setActiveTab] = useState("branches");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSub[]>([]);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig | null>(null);
  const [repricingRules, setRepricingRules] = useState<RepricingRule[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    async (tab: string) => {
      // Skip API call if the feature is disabled — FeatureGate will show upgrade prompt
      const featureKey = TAB_FEATURE_MAP[tab];
      if (featureKey && !hasFeature(featureKey)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        switch (tab) {
          case "branches": {
            const res = await api.get("/enterprise/branches");
            setBranches(res.data);
            break;
          }
          case "staff": {
            const res = await api.get("/enterprise/staff");
            setStaff(res.data);
            break;
          }
          case "api-keys": {
            const res = await api.get("/enterprise/api-keys");
            setApiKeys(res.data);
            break;
          }
          case "webhooks": {
            const res = await api.get("/enterprise/webhooks");
            setWebhooks(res.data);
            break;
          }
          case "branding": {
            const res = await api.get("/enterprise/white-label");
            setWhiteLabel(res.data);
            break;
          }
          case "repricing": {
            const res = await api.get("/enterprise/repricing");
            setRepricingRules(res.data);
            break;
          }
          case "forecasts": {
            const res = await api.get("/enterprise/forecasts");
            setForecasts(res.data);
            break;
          }
        }
      } catch {
        toast({
          title: t("Error"),
          description: t(
            "Failed to load data. Enterprise plan may be required.",
          ),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [hasFeature, t],
  );

  useEffect(() => {
    if (!featuresLoading) loadData(activeTab);
  }, [activeTab, loadData, featuresLoading]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500" />
          <T>Enterprise Hub</T>
        </h1>
        <p className="text-muted-foreground mt-1">
          <T>
            Manage branches, staff, integrations, AI tools, and white-label
            settings
          </T>
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          <TabsTrigger value="branches" className="text-xs">
            <Building2 className="h-3 w-3 me-1" />
            <T>Branches</T>
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">
            <Users className="h-3 w-3 me-1" />
            <T>Staff</T>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="text-xs">
            <Key className="h-3 w-3 me-1" />
            <T>API Keys</T>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs">
            <Webhook className="h-3 w-3 me-1" />
            <T>Webhooks</T>
          </TabsTrigger>
          <TabsTrigger value="branding" className="text-xs">
            <Palette className="h-3 w-3 me-1" />
            <T>Branding</T>
          </TabsTrigger>
          <TabsTrigger value="repricing" className="text-xs">
            <TrendingUp className="h-3 w-3 me-1" />
            <T>Repricing</T>
          </TabsTrigger>
          <TabsTrigger value="forecasts" className="text-xs">
            <LineChart className="h-3 w-3 me-1" />
            <T>Forecasts</T>
          </TabsTrigger>
        </TabsList>

        {/* ─── Branches ──────────────────────── */}
        <TabsContent value="branches" className="space-y-4">
          <FeatureGate
            feature="multiBranch"
            featureLabel="Multi-Branch Management"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                <T>Multi-Branch Management</T>
              </h2>
              <Button size="sm">
                <Building2 className="h-4 w-4 me-1" /> <T>Add Branch</T>
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : branches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    <T>No branches configured yet.</T>
                  </p>
                  <p className="text-sm">
                    <T>
                      Add your first branch location to manage multi-store
                      operations.
                    </T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {branches.map((b) => (
                  <Card key={b.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            <span dir="auto">{b.branchName}</span>
                          </CardTitle>
                          <CardDescription>{b.branchCode}</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          {b.isHeadquarter && (
                            <Badge variant="default">
                              <T>HQ</T>
                            </Badge>
                          )}
                          <Badge variant={b.isActive ? "outline" : "secondary"}>
                            <T>{b.isActive ? "Active" : "Inactive"}</T>
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p dir="auto">
                        {b.address}, {b.city}, {b.country}
                      </p>
                      <p dir="ltr">{b.contactPhone}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FeatureGate>
        </TabsContent>

        {/* ─── Staff ─────────────────────────── */}
        <TabsContent value="staff" className="space-y-4">
          <FeatureGate
            feature="staffAccounts"
            featureLabel="Staff Accounts"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                <T>Staff Accounts</T>
              </h2>
              <Button size="sm">
                <UserPlus className="h-4 w-4 me-1" /> <T>Invite Staff</T>
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : staff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    <T>No staff members yet.</T>
                  </p>
                  <p className="text-sm">
                    <T>
                      Invite team members with specific roles and branch access.
                    </T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {staff.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium" dir="auto">
                          {s.user.firstName} {s.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {s.user.email}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge>
                          <T>{s.staffRole.replace(/_/g, " ")}</T>
                        </Badge>
                        {!s.acceptedAt && (
                          <Badge variant="secondary">
                            <T>Pending</T>
                          </Badge>
                        )}
                        {!s.isActive && (
                          <Badge variant="destructive">
                            <T>Disabled</T>
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FeatureGate>
        </TabsContent>

        {/* ─── API Keys ──────────────────────── */}
        <TabsContent value="api-keys" className="space-y-4">
          <FeatureGate
            feature="apiAccess"
            featureLabel="API Access"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                <T>API Key Management</T>
              </h2>
              <Button size="sm">
                <Key className="h-4 w-4 me-1" /> <T>Generate Key</T>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              <T>
                Use API keys to integrate OriVraa with your ERP, POS, or
                accounting systems.
              </T>
            </p>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : apiKeys.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    <T>No API keys created yet.</T>
                  </p>
                  <p className="text-sm">
                    <T>Generate keys to integrate with external systems.</T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((k) => (
                  <Card key={k.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{k.keyName}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {k.keyPrefix}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <T>Scopes</T>: <bdi>{k.scopes.join(", ")}</bdi>
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={k.isActive ? "outline" : "secondary"}>
                          <T>{k.isActive ? "Active" : "Revoked"}</T>
                        </Badge>
                        {k.lastUsedAt && (
                          <span className="text-xs text-muted-foreground">
                            <T>Last used</T>:{" "}
                            <bdi>
                              {new Date(k.lastUsedAt).toLocaleDateString()}
                            </bdi>
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FeatureGate>
        </TabsContent>

        {/* ─── Webhooks ──────────────────────── */}
        <TabsContent value="webhooks" className="space-y-4">
          <FeatureGate
            feature="webhookSubscriptions"
            featureLabel="Webhook Subscriptions"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                <T>Webhook Subscriptions</T>
              </h2>
              <Button size="sm">
                <Webhook className="h-4 w-4 me-1" /> <T>Add Webhook</T>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              <T>
                Receive real-time push notifications for order changes,
                payments, inventory events, and more.
              </T>
            </p>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : webhooks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    <T>No webhooks configured.</T>
                  </p>
                  <p className="text-sm">
                    <T>
                      Set up HTTPS endpoints to receive event notifications.
                    </T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {webhooks.map((w) => (
                  <Card key={w.id}>
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm" dir="ltr">
                            {w.url}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <T>Events</T>: <bdi>{w.events.join(", ")}</bdi>
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={w.isActive ? "outline" : "secondary"}>
                            <T>{w.isActive ? "Active" : "Paused"}</T>
                          </Badge>
                          {w.failureCount > 0 && (
                            <Badge variant="destructive">
                              <bdi>{w.failureCount}</bdi> <T>failures</T>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FeatureGate>
        </TabsContent>

        {/* ─── White-Label Branding ──────────── */}
        <TabsContent value="branding" className="space-y-4">
          <FeatureGate
            feature="customBranding"
            featureLabel="White-Label Branding"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <h2 className="text-lg font-semibold">
              <T>White-Label Branding</T>
            </h2>
            <p className="text-sm text-muted-foreground">
              <T>
                Customize your storefront appearance, use a custom domain, and
                remove OriVraa branding.
              </T>
            </p>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <T>Custom Domain</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-mono">
                      {whiteLabel?.customDomain || t("Not configured")}
                    </p>
                    <Badge
                      variant={whiteLabel?.isActive ? "default" : "secondary"}
                      className="mt-2"
                    >
                      <T>{whiteLabel?.isActive ? "Active" : "Inactive"}</T>
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <T>Brand Colors</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-full border"
                        style={{
                          backgroundColor:
                            whiteLabel?.primaryColor || "#D4AF37",
                        }}
                      />
                      <span className="text-xs">
                        <T>Primary</T>
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-full border"
                        style={{
                          backgroundColor:
                            whiteLabel?.secondaryColor || "#1F2937",
                        }}
                      />
                      <span className="text-xs">
                        <T>Secondary</T>
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-full border"
                        style={{
                          backgroundColor: whiteLabel?.accentColor || "#F59E0B",
                        }}
                      />
                      <span className="text-xs">
                        <T>Accent</T>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">
                      <T>Settings</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>
                        <T>Font Family</T>
                      </span>
                      <span className="text-muted-foreground">
                        {whiteLabel?.fontFamily || "Inter"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        <T>Hide OriVraa Branding</T>
                      </span>
                      <Badge
                        variant={
                          whiteLabel?.hideOrivraa ? "default" : "secondary"
                        }
                      >
                        <T>{whiteLabel?.hideOrivraa ? "Yes" : "No"}</T>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </FeatureGate>
        </TabsContent>

        {/* ─── Automated Repricing ───────────── */}
        <TabsContent value="repricing" className="space-y-4">
          <FeatureGate
            feature="aiPriceOptimization"
            featureLabel="Automated Repricing"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                <T>Automated Repricing Rules</T>
              </h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    api.post("/enterprise/repricing/evaluate").then((res) => {
                      toast({
                        title: t("Evaluation complete"),
                        description: `${(res.data || []).filter((r: any) => r.triggered).length} ${t("rules triggered.")}`,
                      });
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 me-1" /> <T>Evaluate Now</T>
                </Button>
                <Button size="sm">
                  <TrendingUp className="h-4 w-4 me-1" /> <T>Add Rule</T>
                </Button>
              </div>
            </div>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : repricingRules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    <T>No repricing rules configured.</T>
                  </p>
                  <p className="text-sm">
                    <T>
                      Create rules to automatically adjust prices based on gold
                      rates, stock levels, or time.
                    </T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {repricingRules.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{r.ruleName}</p>
                        <p className="text-xs text-muted-foreground">
                          <T>Type</T>: <T>{r.ruleType.replace(/_/g, " ")}</T>{" "}
                          &middot; <T>Triggered</T> <bdi>{r.triggerCount}x</bdi>
                        </p>
                      </div>
                      <Badge variant={r.isActive ? "outline" : "secondary"}>
                        <T>{r.isActive ? "Active" : "Paused"}</T>
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FeatureGate>
        </TabsContent>

        {/* ─── AI Demand Forecasts ───────────── */}
        <TabsContent value="forecasts" className="space-y-4">
          <FeatureGate
            feature="demandForecasting"
            featureLabel="AI Demand Forecasting"
            hasFeature={hasFeature}
            planName={planName}
            loading={featuresLoading}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                <T>AI Demand Forecasting</T>
              </h2>
              <Button
                size="sm"
                onClick={() => {
                  api.post("/enterprise/forecasts/generate").then(() => {
                    toast({
                      title: t("Forecasts generated"),
                      description: t("New predictions are ready."),
                    });
                    loadData("forecasts");
                  });
                }}
              >
                <LineChart className="h-4 w-4 me-1" /> <T>Generate Forecasts</T>
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">
                <T>Loading...</T>
              </p>
            ) : forecasts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <LineChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    <T>No forecasts available yet.</T>
                  </p>
                  <p className="text-sm">
                    <T>
                      Generate AI-powered demand predictions based on your
                      historical sales data.
                    </T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forecasts.map((f) => (
                  <Card key={f.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">
                          {t(f.category)}
                        </CardTitle>
                        <Badge variant="outline">{f.period}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mb-2">
                        <span>
                          <T>Predicted Demand</T>
                        </span>
                        <span className="font-bold">
                          <bdi>{f.predictedDemand}</bdi> <T>units</T>
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>
                          <T>Confidence</T>
                        </span>
                        <span className="font-medium">
                          {Math.round(f.confidenceScore * 100)}%
                        </span>
                      </div>
                      {f.recommendation && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          {t(f.recommendation)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
