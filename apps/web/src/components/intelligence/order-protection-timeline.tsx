"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { intelligenceApi } from "@/lib/api";
import {
  CheckCircle,
  Clock,
  Factory,
  Loader2,
  Package,
  Shield,
  Star,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Stage {
  id: string;
  label: string;
  description: string;
  icon: string;
  status: "completed" | "active" | "upcoming";
  protectedAmount?: number;
  milestones?: Array<{
    type: string;
    title: string;
    completedAt: string;
    hasEvidence: boolean;
  }>;
  qcPassed?: boolean;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  disputeWindowEnds?: string | null;
}

interface ProtectionData {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  shop: { shopName: string; isVerified: boolean; sellerTier: string };
  stages: Stage[];
  totalProtected: number;
  protectionLevel: string;
}

interface OrderProtectionTimelineProps {
  orderId: string;
}

const iconMap: Record<string, React.ReactNode> = {
  shield: <Shield className="h-5 w-5" />,
  factory: <Factory className="h-5 w-5" />,
  "check-circle": <CheckCircle className="h-5 w-5" />,
  truck: <Truck className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
};

const statusColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  completed: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-700",
    icon: "text-green-600",
  },
  active: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    icon: "text-blue-600",
  },
  upcoming: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-400",
    icon: "text-gray-300",
  },
};

export function OrderProtectionTimeline({ orderId }: OrderProtectionTimelineProps) {
  const [data, setData] = useState<ProtectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [orderId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const res = await intelligenceApi.getOrderProtection(orderId);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load protection timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gold-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Order Protection
            </CardTitle>
            <CardDescription>
              Your order #{data.orderNumber} is{" "}
              {data.protectionLevel === "FULL" ? "fully" : "standard"} protected
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              data.protectionLevel === "FULL"
                ? "border-green-300 text-green-700"
                : "border-blue-300 text-blue-700"
            }
          >
            {data.protectionLevel === "FULL" ? "Full Protection" : "Standard Protection"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total protected amount */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-blue-600">Amount Protected</p>
          <p className="text-xl font-bold text-blue-800">
            NPR {Math.round(data.totalProtected).toLocaleString()}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {data.stages.map((stage, idx) => {
            const colors = statusColors[stage.status];
            const isLast = idx === data.stages.length - 1;

            return (
              <div key={stage.id} className="relative flex gap-4">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${colors.border} ${colors.bg}`}
                  >
                    <span className={colors.icon}>
                      {iconMap[stage.icon] || <Shield className="h-5 w-5" />}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-[2rem] ${
                        stage.status === "completed"
                          ? "bg-green-300"
                          : stage.status === "active"
                            ? "bg-blue-300"
                            : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${colors.text}`}>
                      {stage.label}
                    </h4>
                    {stage.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {stage.status === "active" && (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs text-blue-500">Active</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {stage.description}
                  </p>

                  {/* Production milestones */}
                  {stage.milestones && stage.milestones.length > 0 && (
                    <div className="mt-2 ml-2 space-y-1">
                      {stage.milestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-gray-500"
                        >
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span>{m.title}</span>
                          {m.hasEvidence && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0"
                            >
                              Photo proof
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tracking info */}
                  {stage.trackingNumber && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-400">Tracking: </span>
                      <span className="font-mono text-blue-600">
                        {stage.trackingNumber}
                      </span>
                    </div>
                  )}
                  {stage.estimatedDelivery && (
                    <div className="text-xs flex items-center gap-1 mt-1 text-gray-500">
                      <Clock className="h-3 w-3" />
                      Est. {new Date(stage.estimatedDelivery).toLocaleDateString()}
                    </div>
                  )}

                  {/* Dispute window */}
                  {stage.disputeWindowEnds && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                      Dispute window ends:{" "}
                      {new Date(stage.disputeWindowEnds).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
