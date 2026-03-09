"use client";

import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentCallbackContent() {
  const t = useT();
  const params = useSearchParams();
  const gateway = params.get("gateway");
  const txn = params.get("txn");
  const status = params.get("status");

  // eSewa sends status=failed in URL on failure
  const isFailed = status === "failed";

  if (isFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
            <CardTitle><T>Payment Failed</T></CardTitle>
            <CardDescription>
              {t(`Your payment via ${gateway || "the gateway"} was not completed.`)}
              {txn && (
                <span className="block mt-1 text-xs">{t(`Transaction: ${txn}`)}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => window.history.back()}>
              <T>Try Again</T>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/dashboard")}
            >
              <T>Back to Dashboard</T>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success / Pending verification
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
          <CardTitle><T>Payment Received!</T></CardTitle>
          <CardDescription>
            {t(`Your payment via ${gateway || "the gateway"} is being verified.`)}
            {txn && (
              <span className="block mt-1 text-xs font-mono">{t(`Ref: ${txn}`)}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center text-sm text-muted-foreground">
            <T>You will receive a confirmation once the payment is verified. This may take a few moments.</T>
          </div>
          <Button
            className="w-full"
            onClick={() => (window.location.href = "/dashboard")}
          >
            <T>Back to Dashboard</T>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
