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
import { toast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import api from "@/lib/api";
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

  const loadData = useCallback(async (tab: string) => {
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
        title: "Error",
        description: "Failed to load data. Enterprise plan may be required.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [hasFeature]);

  useEffect(() => {
    if (!featuresLoading) loadData(activeTab);
  }, [activeTab, loadData, featuresLoading]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500" />
          Enterprise Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage branches, staff, integrations, AI tools, and white-label
          settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          <TabsTrigger value="branches" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="text-xs">
            <Key className="h-3 w-3 mr-1" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs">
            <Webhook className="h-3 w-3 mr-1" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="branding" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="repricing" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Repricing
          </TabsTrigger>
          <TabsTrigger value="forecasts" className="text-xs">
            <LineChart className="h-3 w-3 mr-1" />
            Forecasts
          </TabsTrigger>
        </TabsList>

        {/* ─── Branches ──────────────────────── */}
        <TabsContent value="branches" className="space-y-4">
          <FeatureGate feature="multiBranch" featureLabel="Multi-Branch Management" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Multi-Branch Management</h2>
            <Button size="sm">
              <Building2 className="h-4 w-4 mr-1" /> Add Branch
            </Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : branches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No branches configured yet.</p>
                <p className="text-sm">
                  Add your first branch location to manage multi-store
                  operations.
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
                          {b.branchName}
                        </CardTitle>
                        <CardDescription>{b.branchCode}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        {b.isHeadquarter && <Badge variant="default">HQ</Badge>}
                        <Badge variant={b.isActive ? "outline" : "secondary"}>
                          {b.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      {b.address}, {b.city}, {b.country}
                    </p>
                    <p>{b.contactPhone}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </FeatureGate>
        </TabsContent>

        {/* ─── Staff ─────────────────────────── */}
        <TabsContent value="staff" className="space-y-4">
          <FeatureGate feature="staffAccounts" featureLabel="Staff Accounts" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Staff Accounts</h2>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-1" /> Invite Staff
            </Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : staff.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No staff members yet.</p>
                <p className="text-sm">
                  Invite team members with specific roles and branch access.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <Card key={s.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {s.user.firstName} {s.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {s.user.email}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge>{s.staffRole}</Badge>
                      {!s.acceptedAt && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {!s.isActive && (
                        <Badge variant="destructive">Disabled</Badge>
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
          <FeatureGate feature="apiAccess" featureLabel="API Access" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">API Key Management</h2>
            <Button size="sm">
              <Key className="h-4 w-4 mr-1" /> Generate Key
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Use API keys to integrate OriVraa with your ERP, POS, or accounting
            systems.
          </p>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No API keys created yet.</p>
                <p className="text-sm">
                  Generate keys to integrate with external systems.
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
                        Scopes: {k.scopes.join(", ")}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={k.isActive ? "outline" : "secondary"}>
                        {k.isActive ? "Active" : "Revoked"}
                      </Badge>
                      {k.lastUsedAt && (
                        <span className="text-xs text-muted-foreground">
                          Last used:{" "}
                          {new Date(k.lastUsedAt).toLocaleDateString()}
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
          <FeatureGate feature="webhookSubscriptions" featureLabel="Webhook Subscriptions" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Webhook Subscriptions</h2>
            <Button size="sm">
              <Webhook className="h-4 w-4 mr-1" /> Add Webhook
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Receive real-time push notifications for order changes, payments,
            inventory events, and more.
          </p>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No webhooks configured.</p>
                <p className="text-sm">
                  Set up HTTPS endpoints to receive event notifications.
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
                        <p className="font-mono text-sm">{w.url}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Events: {w.events.join(", ")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant={w.isActive ? "outline" : "secondary"}>
                          {w.isActive ? "Active" : "Paused"}
                        </Badge>
                        {w.failureCount > 0 && (
                          <Badge variant="destructive">
                            {w.failureCount} failures
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
          <FeatureGate feature="customBranding" featureLabel="White-Label Branding" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <h2 className="text-lg font-semibold">White-Label Branding</h2>
          <p className="text-sm text-muted-foreground">
            Customize your storefront appearance, use a custom domain, and
            remove OriVraa branding.
          </p>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom Domain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-mono">
                    {whiteLabel?.customDomain || "Not configured"}
                  </p>
                  <Badge
                    variant={whiteLabel?.isActive ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {whiteLabel?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Brand Colors</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full border"
                      style={{
                        backgroundColor: whiteLabel?.primaryColor || "#D4AF37",
                      }}
                    />
                    <span className="text-xs">Primary</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full border"
                      style={{
                        backgroundColor:
                          whiteLabel?.secondaryColor || "#1F2937",
                      }}
                    />
                    <span className="text-xs">Secondary</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full border"
                      style={{
                        backgroundColor: whiteLabel?.accentColor || "#F59E0B",
                      }}
                    />
                    <span className="text-xs">Accent</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Font Family</span>
                    <span className="text-muted-foreground">
                      {whiteLabel?.fontFamily || "Inter"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hide OriVraa Branding</span>
                    <Badge
                      variant={
                        whiteLabel?.hideOrivraa ? "default" : "secondary"
                      }
                    >
                      {whiteLabel?.hideOrivraa ? "Yes" : "No"}
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
          <FeatureGate feature="aiPriceOptimization" featureLabel="Automated Repricing" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Automated Repricing Rules</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  api.post("/enterprise/repricing/evaluate").then((res) => {
                    toast({
                      title: "Evaluation complete",
                      description: `${res.data.filter((r: any) => r.triggered).length} rules triggered.`,
                    });
                  });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Evaluate Now
              </Button>
              <Button size="sm">
                <TrendingUp className="h-4 w-4 mr-1" /> Add Rule
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : repricingRules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No repricing rules configured.</p>
                <p className="text-sm">
                  Create rules to automatically adjust prices based on gold
                  rates, stock levels, or time.
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
                        Type: {r.ruleType.replace(/_/g, " ")} &middot; Triggered{" "}
                        {r.triggerCount}x
                      </p>
                    </div>
                    <Badge variant={r.isActive ? "outline" : "secondary"}>
                      {r.isActive ? "Active" : "Paused"}
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
          <FeatureGate feature="demandForecasting" featureLabel="AI Demand Forecasting" hasFeature={hasFeature} planName={planName} loading={featuresLoading}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">AI Demand Forecasting</h2>
            <Button
              size="sm"
              onClick={() => {
                api.post("/enterprise/forecasts/generate").then(() => {
                  toast({
                    title: "Forecasts generated",
                    description: "New predictions are ready.",
                  });
                  loadData("forecasts");
                });
              }}
            >
              <LineChart className="h-4 w-4 mr-1" /> Generate Forecasts
            </Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : forecasts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <LineChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No forecasts available yet.</p>
                <p className="text-sm">
                  Generate AI-powered demand predictions based on your
                  historical sales data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forecasts.map((f) => (
                <Card key={f.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{f.category}</CardTitle>
                      <Badge variant="outline">{f.period}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Predicted Demand</span>
                      <span className="font-bold">
                        {f.predictedDemand} units
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Confidence</span>
                      <span className="font-medium">
                        {Math.round(f.confidenceScore * 100)}%
                      </span>
                    </div>
                    {f.recommendation && (
                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                        {f.recommendation}
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
