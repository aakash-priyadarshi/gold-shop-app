"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { sellerPerformanceApi } from "@/lib/api";
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle,
  Crown,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
  Shield,
  Star,
  Target,
  Trophy,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ─── TYPES ─── */

interface HealthScore {
  profileCompleteness: { score: number; max: number; missing: string[] };
  performanceMetrics: { score: number; max: number; details: Record<string, number> };
  verificationStatus: { score: number; max: number };
  capabilitySetup: { score: number; max: number; missing: string[] };
  engagementActivity: { score: number; max: number; details: Record<string, number> };
  totalScore: number;
  grade: string;
}

interface OnboardingProgress {
  steps: { key: string; label: string; completed: boolean; category: string }[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  categories: Record<string, { completed: number; total: number }>;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  achieved: boolean;
  progress: number;
  target: number;
  current: number;
}

interface RfqFunnel {
  totalTargeted: number;
  viewed: number;
  responded: number;
  viewRate: number;
  responseRate: number;
  avgResponseTimeHours: number | null;
  periodBreakdown: { period: string; targeted: number; viewed: number; responded: number }[];
}

/* ─── HELPERS ─── */

const gradeColor: Record<string, string> = {
  A: "text-green-600 bg-green-50",
  B: "text-blue-600 bg-blue-50",
  C: "text-yellow-600 bg-yellow-50",
  D: "text-orange-600 bg-orange-50",
  F: "text-red-600 bg-red-50",
};

const gradeLabel: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Needs Work",
  F: "Critical",
};

const categoryIcons: Record<string, any> = {
  orders: Trophy,
  revenue: TrendingUp,
  ratings: Star,
  engagement: Zap,
  tenure: Crown,
};

/* ─── PAGE ─── */

export default function ShopEngagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [rfqFunnel, setRfqFunnel] = useState<RfqFunnel | null>(null);

  useEffect(() => {
    if (user?.shop?.id) {
      loadAll();
    }
  }, [user?.shop?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [hs, ob, ms, rf] = await Promise.all([
        sellerPerformanceApi.getHealthScore(),
        sellerPerformanceApi.getOnboarding(),
        sellerPerformanceApi.getMilestones(),
        sellerPerformanceApi.getRfqFunnel(),
      ]);
      setHealthScore(hs.data);
      setOnboarding(ob.data);
      setMilestones(ms.data);
      setRfqFunnel(rf.data);
    } catch (error) {
      console.error("Failed to load engagement data:", error);
      toast({ variant: "destructive", title: "Failed to load engagement data" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  const achievedCount = milestones.filter((m) => m.achieved).length;
  const totalMilestones = milestones.length;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6" /> Engagement & Growth
            </h1>
            <p className="text-muted-foreground">
              Track your shop&apos;s performance, milestones, and growth metrics
            </p>
          </div>

          {/* ═══ HEALTH SCORE HERO ═══ */}
          {healthScore && (
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${gradeColor[healthScore.grade]}`}>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{healthScore.totalScore}</p>
                        <p className="text-xs font-medium">/100</p>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Heart className="h-5 w-5" /> Shop Health Score
                      </h2>
                      <p className="text-muted-foreground">
                        Grade: <span className="font-bold">{healthScore.grade}</span> — {gradeLabel[healthScore.grade] || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "Profile", icon: Shield, ...healthScore.profileCompleteness },
                    { label: "Performance", icon: TrendingUp, ...healthScore.performanceMetrics },
                    { label: "Verification", icon: CheckCircle, ...healthScore.verificationStatus },
                    { label: "Capabilities", icon: Zap, ...healthScore.capabilitySetup },
                    { label: "Engagement", icon: Activity, ...healthScore.engagementActivity },
                  ].map((item: any) => {
                    const Icon = item.icon;
                    const pct = (item.score / item.max) * 100;
                    return (
                      <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                        <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                        <p className="font-bold">{item.score}<span className="text-xs text-muted-foreground">/{item.max}</span></p>
                        <Progress value={pct} className="h-1.5 mt-1" />
                        {item.missing && item.missing.length > 0 && (
                          <p className="text-[10px] text-orange-500 mt-1">
                            Missing: {item.missing.slice(0, 2).join(", ")}{item.missing.length > 2 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="milestones" className="gap-1">
                <Trophy className="h-4 w-4" /> Milestones
              </TabsTrigger>
              <TabsTrigger value="rfq" className="gap-1">
                <BarChart3 className="h-4 w-4" /> RFQ Funnel
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="gap-1">
                <CheckCircle className="h-4 w-4" /> Onboarding
              </TabsTrigger>
            </TabsList>

            {/* ═══ MILESTONES TAB ═══ */}
            <TabsContent value="milestones" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4 inline mr-1" />
                  {achievedCount} of {totalMilestones} milestones achieved
                </p>
                <Progress value={(achievedCount / totalMilestones) * 100} className="w-32 h-2" />
              </div>

              {/* Group by category */}
              {["orders", "revenue", "ratings", "engagement", "tenure"].map((cat) => {
                const catMilestones = milestones.filter((m) => m.category === cat);
                if (catMilestones.length === 0) return null;
                const CategoryIcon = categoryIcons[cat] || Trophy;
                return (
                  <div key={cat}>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 capitalize">
                      <CategoryIcon className="h-4 w-4" /> {cat}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {catMilestones.map((m) => (
                        <Card
                          key={m.id}
                          className={`transition-all ${m.achieved ? "border-green-200 bg-green-50/30 shadow-sm" : "opacity-80"}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <span className="text-3xl">{m.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-sm truncate">{m.title}</h4>
                                  {m.achieved && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                                {!m.achieved && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span>{typeof m.current === "number" && m.current > 1000 ? `${(m.current / 1000).toFixed(1)}k` : m.current}</span>
                                      <span className="text-muted-foreground">
                                        / {m.target > 1000 ? `${(m.target / 1000).toFixed(0)}k` : m.target}
                                      </span>
                                    </div>
                                    <Progress value={m.progress} className="h-1.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* ═══ RFQ FUNNEL TAB ═══ */}
            <TabsContent value="rfq" className="space-y-4 mt-4">
              {rfqFunnel && (
                <>
                  {/* Funnel Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-2xl font-bold">{rfqFunnel.totalTargeted}</p>
                        <p className="text-xs text-muted-foreground">RFQs Received</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
                        <p className="text-2xl font-bold">{rfqFunnel.viewed}</p>
                        <p className="text-xs text-muted-foreground">Viewed ({rfqFunnel.viewRate}%)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-bold">{rfqFunnel.responded}</p>
                        <p className="text-xs text-muted-foreground">Responded ({rfqFunnel.responseRate}%)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Activity className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                        <p className="text-2xl font-bold">
                          {rfqFunnel.avgResponseTimeHours ? `${rfqFunnel.avgResponseTimeHours}h` : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Response Time</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-2xl font-bold">{rfqFunnel.responseRate}%</p>
                        <p className="text-xs text-muted-foreground">Response Rate</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Funnel Visualization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Conversion Funnel</CardTitle>
                      <CardDescription>From RFQ received to response</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { label: "Targeted", value: rfqFunnel.totalTargeted, color: "bg-blue-500" },
                          { label: "Viewed", value: rfqFunnel.viewed, color: "bg-indigo-500" },
                          { label: "Responded", value: rfqFunnel.responded, color: "bg-green-500" },
                        ].map((step) => {
                          const pct = rfqFunnel.totalTargeted > 0 ? (step.value / rfqFunnel.totalTargeted) * 100 : 0;
                          return (
                            <div key={step.label}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>{step.label}</span>
                                <span className="font-bold">{step.value} ({Math.round(pct)}%)</span>
                              </div>
                              <div className="h-6 bg-muted rounded-md overflow-hidden">
                                <div
                                  className={`h-full ${step.color} rounded-md transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weekly Breakdown */}
                  {rfqFunnel.periodBreakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Weekly Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {rfqFunnel.periodBreakdown.map((w) => (
                            <div key={w.period} className="flex items-center gap-3 text-sm">
                              <span className="w-16 text-muted-foreground">{w.period}</span>
                              <div className="flex-1 flex items-center gap-2">
                                <Badge variant="outline">{w.targeted} sent</Badge>
                                <Badge variant="secondary">{w.viewed} viewed</Badge>
                                <Badge className="bg-green-100 text-green-800">{w.responded} responded</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {(!rfqFunnel || rfqFunnel.totalTargeted === 0) && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium">No RFQ Data Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      When customers send you RFQ requests, your conversion funnel data will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ═══ ONBOARDING TAB ═══ */}
            <TabsContent value="onboarding" className="space-y-4 mt-4">
              {onboarding && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-bold">Setup Progress</h2>
                          <p className="text-sm text-muted-foreground">
                            {onboarding.completedCount} of {onboarding.totalCount} steps completed
                          </p>
                        </div>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          onboarding.percentage >= 80 ? "bg-green-50 text-green-600" :
                          onboarding.percentage >= 50 ? "bg-yellow-50 text-yellow-600" :
                          "bg-red-50 text-red-600"
                        }`}>
                          <span className="text-xl font-bold">{onboarding.percentage}%</span>
                        </div>
                      </div>
                      <Progress value={onboarding.percentage} className="h-3" />
                    </CardContent>
                  </Card>

                  {Object.entries(onboarding.categories).map(([cat, data]) => {
                    const catData = data as { completed: number; total: number };
                    const catComplete = catData.completed === catData.total;
                    return (
                      <Card key={cat} className={catComplete ? "border-green-200" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {catComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {cat}
                            </CardTitle>
                            <Badge variant={catComplete ? "default" : "secondary"}>
                              {catData.completed}/{catData.total}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {onboarding.steps
                              .filter((s) => s.category === cat)
                              .map((step) => (
                                <div
                                  key={step.key}
                                  className={`flex items-center gap-3 p-2 rounded-md text-sm ${
                                    step.completed ? "bg-green-50/50" : "bg-muted/30"
                                  }`}
                                >
                                  {step.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                                  )}
                                  <span className={step.completed ? "text-muted-foreground" : "font-medium"}>
                                    {step.label}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
