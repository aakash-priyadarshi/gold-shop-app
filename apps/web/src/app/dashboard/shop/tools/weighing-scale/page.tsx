"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WeighingScalePanel } from "@/components/scale/WeighingScalePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/providers/translation-provider";
import { ArrowLeft, ClipboardCopy, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WeighingScalePage() {
  const router = useRouter();
  const t = useT();
  const [capturedWeights, setCapturedWeights] = useState<
    { weight: number; timestamp: Date }[]
  >([]);

  const handleWeightCapture = (weightGrams: number) => {
    setCapturedWeights((prev) => [
      { weight: weightGrams, timestamp: new Date() },
      ...prev,
    ]);
    toast({
      title: "Weight Captured",
      description: `${weightGrams.toFixed(3)}g recorded`,
    });
  };

  const copyWeight = (weight: number) => {
    navigator.clipboard.writeText(weight.toFixed(3));
    toast({
      title: "Copied",
      description: `${weight.toFixed(3)}g copied to clipboard`,
    });
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/shop/tools")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Scale className="h-6 w-6 text-teal-500" />
                <T>Weighing Scale</T>
              </h1>
              <p className="text-muted-foreground">
                <T>
                  Connect a digital weighing scale via USB/Serial or use the
                  simulator
                </T>
              </p>
            </div>
          </div>

          {/* Full weighing scale panel (non-compact) */}
          <WeighingScalePanel
            compact={false}
            allowSimulated={true}
            onWeightCapture={handleWeightCapture}
          />

          {/* Captured weights log */}
          {capturedWeights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(`Captured Weights (${capturedWeights.length})`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {capturedWeights.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6">
                          #{capturedWeights.length - idx}
                        </span>
                        <span className="font-mono font-bold text-lg">
                          {entry.weight.toFixed(3)}g
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyWeight(entry.weight)}
                        >
                          <ClipboardCopy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
