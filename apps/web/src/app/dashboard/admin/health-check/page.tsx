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
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Database,
    Mail,
    MessageSquare,
    RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ApiHealthResponse {
  overallStatus: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    [key: string]: {
      status: "up" | "down" | "not-configured" | "degraded";
      latency?: number;
      message?: string;
      error?: boolean;
      type?: string;
      provider?: string;
      sender?: string;
      service?: string;
      accountStatus?: string;
    };
  };
}

const statusConfig = {
  up: {
    color: "bg-green-500/10",
    borderColor: "border-green-500/20",
    textColor: "text-green-700",
    badgeVariant: "default" as const,
    icon: CheckCircle,
  },
  down: {
    color: "bg-red-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-700",
    badgeVariant: "destructive" as const,
    icon: AlertCircle,
  },
  "not-configured": {
    color: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-700",
    badgeVariant: "outline" as const,
    icon: AlertTriangle,
  },
  degraded: {
    color: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-700",
    badgeVariant: "outline" as const,
    icon: AlertTriangle,
  },
};

export default function HealthCheckPage() {
  const [health, setHealth] = useState<ApiHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await adminApi.checkApisHealth();
      setHealth(response.data);
      setLastRefresh(new Date());
      toast({
        title: "Health check complete",
        description: "API health status updated",
      });
    } catch (error: any) {
      console.error("Health check failed:", error);
      toast({
        title: "Health check failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch health status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Activity;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">System API Health</h1>
            <p className="text-muted-foreground">
              Monitor the health status of all connected APIs and services
            </p>
          </div>

          {/* Overall Status Card */}
          {health && (
            <Card
              className={`border-2 ${
                health.overallStatus === "healthy"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Overall System Status</CardTitle>
                    <CardDescription className="text-xs">
                      Last updated:{" "}
                      {lastRefresh?.toLocaleTimeString() || "—"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      health.overallStatus === "healthy"
                        ? "default"
                        : "outline"
                    }
                    className={
                      health.overallStatus === "healthy"
                        ? "bg-green-500"
                        : "bg-amber-500 text-white"
                    }
                  >
                    {health.overallStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {health.overallStatus === "healthy"
                    ? "✅ All systems operational"
                    : "⚠️ Some services may have issues"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Refresh Button */}
          <div className="flex gap-2">
            <Button
              onClick={fetchHealth}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Checking..." : "Refresh Status"}
            </Button>
          </div>

          {/* Health Checks Grid */}
          {health && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Database */}
              {health.checks.database && (
                <HealthCard
                  title="Database"
                  icon={Database}
                  data={health.checks.database}
                />
              )}

              {/* Twilio */}
              {health.checks.twilio && (
                <HealthCard
                  title="Twilio SMS"
                  icon={MessageSquare}
                  data={health.checks.twilio}
                />
              )}

              {/* Email Service */}
              {health.checks.email && (
                <HealthCard
                  title="Email Service"
                  icon={Mail}
                  data={health.checks.email}
                />
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && !health && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}

interface HealthCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data: {
    status: "up" | "down" | "not-configured" | "degraded";
    latency?: number;
    message?: string;
    error?: boolean;
    type?: string;
    provider?: string;
    sender?: string;
    service?: string;
    accountStatus?: string;
  };
}

function HealthCard({ title, icon: Icon, data }: HealthCardProps) {
  const config = statusConfig[data.status as keyof typeof statusConfig];

  return (
    <Card
      className={`border ${config.borderColor} ${config.color} cursor-default`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.textColor}`} />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={config.badgeVariant}>
            {data.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {data.message && (
          <p className="text-muted-foreground">{data.message}</p>
        )}

        {data.latency !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Response time</span>
            <span className="font-mono font-medium">{data.latency}ms</span>
          </div>
        )}

        {data.type && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Type</span>
            <span className="font-mono">{data.type}</span>
          </div>
        )}

        {data.provider && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-mono">{data.provider}</span>
          </div>
        )}

        {data.sender && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Sender</span>
            <span className="font-mono text-ellipsis overflow-hidden">
              {data.sender}
            </span>
          </div>
        )}

        {data.service && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Service</span>
            <span className="font-mono">{data.service}</span>
          </div>
        )}

        {data.accountStatus && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Account Status</span>
            <span className="font-mono capitalize">{data.accountStatus}</span>
          </div>
        )}

        {data.error && (
          <div className="mt-2 rounded bg-destructive/10 p-2 text-destructive text-xs">
            ⚠️ This service requires attention
          </div>
        )}
      </CardContent>
    </Card>
  );
}
