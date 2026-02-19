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
import { intelligenceApi } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Check,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Milestone,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardData {
  overview: {
    totalInsights: number;
    completedOrders: number;
    currentPhase: { phase: number; name: string };
    unreviewedAnomalies: number;
  };
  averages: {
    avgOfferPrice: number | null;
    avgMakingChargePct: number | null;
    avgEstimatedDays: number | null;
    avgOffersPerRfq: number | null;
  };
  milestones: Array<{
    id: string;
    phase: number;
    milestoneName: string;
    description: string;
    thresholdValue: number;
    currentValue: number;
    isReached: boolean;
    reachedAt: string | null;
    actionItems: Array<{
      action: string;
      status: string;
      completedAt: string | null;
    }>;
    progress: number;
  }>;
  topJewelleryTypes: Array<{
    rfqJewelleryType: string;
    _count: { id: number };
    _avg: { avgOfferPrice: number | null };
  }>;
  lossReasonBreakdown: Array<{
    lossReasonCategory: string;
    _count: { id: number };
  }>;
}

interface AiCapabilities {
  phase: number;
  name: string;
  completedOrders: number;
  capabilities: Record<
    string,
    { available: boolean; accuracy: string; description: string }
  >;
}

interface Anomaly {
  id: string;
  offerId: string;
  shopId: string;
  anomalyType: string;
  severity: string;
  expectedValue: number;
  actualValue: number;
  deviationPct: number;
  isReviewed: boolean;
  reviewNote: string | null;
  createdAt: string;
}

export default function IntelligenceDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "milestones" | "anomalies" | "capabilities"
  >("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, capRes, anomRes] = await Promise.all([
        intelligenceApi.getDashboard(),
        intelligenceApi.getAiCapabilities(),
        intelligenceApi.getAnomalies({ reviewed: "false", limit: "20" }),
      ]);
      setDashboard(dashRes.data);
      setCapabilities(capRes.data);
      setAnomalies(anomRes.data?.anomalies || []);
    } catch (err) {
      console.error("Failed to load intelligence data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneAction = async (
    milestoneId: string,
    actionIndex: number,
    status: "completed" | "skipped",
  ) => {
    try {
      await intelligenceApi.updateMilestoneAction(milestoneId, {
        actionIndex,
        status,
      });
      loadData();
    } catch (err) {
      console.error("Failed to update milestone action:", err);
    }
  };

  const handleReviewAnomaly = async (anomalyId: string) => {
    try {
      await intelligenceApi.reviewAnomaly(anomalyId, {
        note: "Reviewed from dashboard",
      });
      setAnomalies((prev) => prev.filter((a) => a.id !== anomalyId));
    } catch (err) {
      console.error("Failed to review anomaly:", err);
    }
  };

  const phaseColors: Record<number, string> = {
    1: "bg-blue-100 text-blue-800 border-blue-200",
    2: "bg-amber-100 text-amber-800 border-amber-200",
    3: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };

  const severityColors: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    HIGH: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <AdminGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
          </div>
        </DashboardLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Brain className="h-7 w-7 text-purple-600" />
                Marketplace Intelligence
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                AI phase tracking, data insights, and anomaly detection
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Phase Status Banner */}
          {dashboard && (
            <Card
              className={`border-2 ${phaseColors[dashboard.overview.currentPhase.phase]}`}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/60 dark:bg-[#161B22]/60">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        Phase {dashboard.overview.currentPhase.phase}:{" "}
                        {dashboard.overview.currentPhase.name}
                      </p>
                      <p className="text-sm opacity-80">
                        {dashboard.overview.completedOrders} completed orders
                        captured &bull; {dashboard.overview.totalInsights} total
                        RFQ insights
                      </p>
                    </div>
                  </div>
                  {dashboard.overview.unreviewedAnomalies > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {dashboard.overview.unreviewedAnomalies} anomalies
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b pb-2">
            {(
              [
                { key: "overview", label: "Overview", icon: BarChart3 },
                { key: "milestones", label: "AI Milestones", icon: Milestone },
                { key: "anomalies", label: "Anomalies", icon: AlertTriangle },
                {
                  key: "capabilities",
                  label: "AI Capabilities",
                  icon: Sparkles,
                },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={activeTab === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(key)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && dashboard && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Insights</p>
                        <p className="text-2xl font-bold">
                          {dashboard.overview.totalInsights}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg Offer Price</p>
                        <p className="text-2xl font-bold">
                          {dashboard.averages.avgOfferPrice
                            ? `NPR ${Math.round(dashboard.averages.avgOfferPrice).toLocaleString()}`
                            : "—"}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Avg Making Charge
                        </p>
                        <p className="text-2xl font-bold">
                          {dashboard.averages.avgMakingChargePct
                            ? `${dashboard.averages.avgMakingChargePct.toFixed(1)}%`
                            : "—"}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-amber-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg Offers/RFQ</p>
                        <p className="text-2xl font-bold">
                          {dashboard.averages.avgOffersPerRfq
                            ? dashboard.averages.avgOffersPerRfq.toFixed(1)
                            : "—"}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Jewellery Types & Loss Reasons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Top Jewellery Types
                    </CardTitle>
                    <CardDescription>Most requested categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboard.topJewelleryTypes.length > 0 ? (
                      <div className="space-y-3">
                        {dashboard.topJewelleryTypes.map((item, idx) => (
                          <div
                            key={item.rfqJewelleryType}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-4">
                                {idx + 1}.
                              </span>
                              <span className="font-medium">
                                {item.rfqJewelleryType}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {item._count.id} RFQs
                              </span>
                              {item._avg.avgOfferPrice && (
                                <Badge variant="outline">
                                  ~NPR{" "}
                                  {Math.round(
                                    item._avg.avgOfferPrice,
                                  ).toLocaleString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No data yet — insights appear after RFQs are processed
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Loss Reasons</CardTitle>
                    <CardDescription>
                      Why offers are not selected
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboard.lossReasonBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {dashboard.lossReasonBreakdown.map((item) => (
                          <div
                            key={item.lossReasonCategory}
                            className="flex items-center justify-between"
                          >
                            <span className="font-medium text-sm">
                              {item.lossReasonCategory
                                ?.replace(/_/g, " ")
                                .toLowerCase()
                                .replace(/^\w/, (c: string) => c.toUpperCase())}
                            </span>
                            <Badge variant="secondary">{item._count.id}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No loss reasons recorded yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === "milestones" && dashboard && (
            <div className="space-y-4">
              {dashboard.milestones.map((milestone) => (
                <Card
                  key={milestone.id}
                  className={`${milestone.isReached ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {milestone.isReached ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            Phase {milestone.phase}:{" "}
                            {milestone.milestoneName.replace(/_/g, " ")}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {milestone.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            milestone.isReached
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {milestone.isReached
                            ? "Reached"
                            : `${milestone.progress}%`}
                        </Badge>
                        {milestone.thresholdValue > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {milestone.currentValue} /{" "}
                            {milestone.thresholdValue} orders
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    {milestone.thresholdValue > 0 && (
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${milestone.isReached ? "bg-green-500" : "bg-purple-500"}`}
                          style={{
                            width: `${Math.min(100, milestone.progress)}%`,
                          }}
                        />
                      </div>
                    )}
                  </CardHeader>
                  {milestone.actionItems &&
                    (milestone.actionItems as any[]).length > 0 && (
                      <CardContent>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                          Action Items
                        </p>
                        <div className="space-y-2">
                          {(milestone.actionItems as any[]).map(
                            (action: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              >
                                <div className="flex items-center gap-2">
                                  {action.status === "completed" ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : action.status === "skipped" ? (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 rounded" />
                                  )}
                                  <span
                                    className={`text-sm ${action.status === "completed" ? "text-green-700 dark:text-green-300 line-through" : action.status === "skipped" ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}`}
                                  >
                                    {action.action}
                                  </span>
                                </div>
                                {action.status === "pending" &&
                                  milestone.isReached && (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          handleMilestoneAction(
                                            milestone.id,
                                            idx,
                                            "completed",
                                          )
                                        }
                                      >
                                        Done
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-gray-400"
                                        onClick={() =>
                                          handleMilestoneAction(
                                            milestone.id,
                                            idx,
                                            "skipped",
                                          )
                                        }
                                      >
                                        Skip
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    )}
                </Card>
              ))}
            </div>
          )}

          {/* Anomalies Tab */}
          {activeTab === "anomalies" && (
            <div className="space-y-4">
              {anomalies.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      No unreviewed anomalies
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Quote anomaly detection runs every 6 hours
                    </p>
                  </CardContent>
                </Card>
              ) : (
                anomalies.map((anomaly) => (
                  <Card
                    key={anomaly.id}
                    className="border-l-4 border-l-amber-400"
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={severityColors[anomaly.severity]}>
                              {anomaly.severity}
                            </Badge>
                            <span className="font-medium text-sm">
                              {anomaly.anomalyType.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Expected:{" "}
                            <span className="font-medium">
                              {Math.round(
                                anomaly.expectedValue,
                              ).toLocaleString()}
                            </span>{" "}
                            &bull; Actual:{" "}
                            <span className="font-medium">
                              {Math.round(anomaly.actualValue).toLocaleString()}
                            </span>{" "}
                            &bull; Deviation:{" "}
                            <span className="font-medium text-amber-600">
                              {anomaly.deviationPct.toFixed(1)}%
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(anomaly.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewAnomaly(anomaly.id)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Mark Reviewed
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* AI Capabilities Tab */}
          {activeTab === "capabilities" && capabilities && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Current AI Phase: {capabilities.phase} — {capabilities.name}
                  </CardTitle>
                  <CardDescription>
                    {capabilities.completedOrders} completed orders captured.
                    {capabilities.phase < 3 &&
                      ` Next phase at ${capabilities.phase === 1 ? 100 : 500} orders.`}
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(capabilities.capabilities).map(([key, cap]) => (
                  <Card
                    key={key}
                    className={
                      cap.available
                        ? "border-green-200"
                        : "border-gray-200 opacity-60"
                    }
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        {cap.available ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">
                            {key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (s) => s.toUpperCase())}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {cap.description}
                          </p>
                          <Badge variant="outline" className="mt-2">
                            Accuracy: {cap.accuracy}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
