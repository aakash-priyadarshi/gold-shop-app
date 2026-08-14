"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { useCart } from "@/contexts/CartContext";
import { ordersApi } from "@/lib/api";
import {
  COMPLETED_CHECKOUT_STORAGE_KEY,
  isOrderPaid,
  PENDING_CHECKOUT_STORAGE_KEY,
  type PendingCheckoutOrder,
} from "@/lib/checkout-market";
import { useT } from "@/providers/translation-provider";
import { CheckCircle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type VerificationState = "checking" | "pending" | "failed" | "confirmed";

function PaymentCallbackContent() {
  const t = useT();
  const params = useSearchParams();
  const { clearCart } = useCart();
  const gateway = params.get("gateway");
  const transaction = params.get("txn") || params.get("session_id");
  const wasCancelled = params.get("cancelled") === "true";
  const wasFailed = params.get("status") === "failed" || wasCancelled;
  const [state, setState] = useState<VerificationState>(
    wasFailed ? "failed" : "checking",
  );

  const verifyPendingOrder = useCallback(async () => {
    if (wasFailed) {
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("pendingAiCreditPurchase")
      ) {
        sessionStorage.removeItem("pendingAiCreditPurchase");
        window.location.replace(
          "/dashboard/shop/billing?tab=credits&credits=cancelled",
        );
        return;
      }
      setState("failed");
      return;
    }

    if (
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("pendingAiCreditPurchase")
    ) {
      sessionStorage.removeItem("pendingAiCreditPurchase");
      window.location.replace(
        "/dashboard/shop/billing?tab=credits&credits=success",
      );
      return;
    }

    const rawPending = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!rawPending) {
      // A webhook may still be processing a non-checkout payment. Do not call
      // it paid based only on query parameters supplied by a gateway.
      setState("pending");
      return;
    }

    let pending: { orders: PendingCheckoutOrder[]; currentIndex: number };
    try {
      pending = JSON.parse(rawPending);
    } catch {
      sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      setState("pending");
      return;
    }

    const currentOrder = pending.orders?.[pending.currentIndex || 0];
    if (!currentOrder) {
      setState("pending");
      return;
    }

    setState("checking");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const response = await ordersApi.getById(currentOrder.id);
        const order = (response.data?.order || response.data) as Record<
          string,
          unknown
        >;
        if (isOrderPaid(order)) {
          const nextIndex = (pending.currentIndex || 0) + 1;
          if (nextIndex < pending.orders.length) {
            sessionStorage.setItem(
              PENDING_CHECKOUT_STORAGE_KEY,
              JSON.stringify({ ...pending, currentIndex: nextIndex }),
            );
            window.location.replace("/checkout?payment=continue");
            return;
          }

          sessionStorage.setItem(
            COMPLETED_CHECKOUT_STORAGE_KEY,
            JSON.stringify({
              orderNumbers: pending.orders.map((item) => item.orderNumber),
            }),
          );
          sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
          clearCart();
          setState("confirmed");
          window.location.replace("/checkout?payment=completed");
          return;
        }
      } catch {
        // Retry briefly because gateway redirects can beat webhook processing.
      }

      if (attempt < 4) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
    }
    setState("pending");
  }, [clearCart, wasFailed]);

  useEffect(() => {
    void verifyPendingOrder();
  }, [verifyPendingOrder]);

  const failed = state === "failed";
  const checking = state === "checking";
  const confirmed = state === "confirmed";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {failed ? (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
          ) : checking ? (
            <Loader2 className="h-16 w-16 text-amber-500 mx-auto mb-2 animate-spin" />
          ) : confirmed ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
          ) : (
            <RefreshCw className="h-16 w-16 text-amber-500 mx-auto mb-2" />
          )}
          <CardTitle>
            {failed ? (
              <T>Payment not completed</T>
            ) : checking ? (
              <T>Checking payment status</T>
            ) : confirmed ? (
              <T>Payment confirmed</T>
            ) : (
              <T>Payment verification pending</T>
            )}
          </CardTitle>
          <CardDescription>
            {failed
              ? t(`Your payment via ${gateway || "the gateway"} was cancelled or failed.`)
              : checking
                ? t("We are checking the order with the server.")
                : confirmed
                  ? t("The order payment has been confirmed.")
                  : t("The gateway returned, but the order is not marked paid yet. This page will not report success until server verification completes.")}
            {transaction && (
              <span className="block mt-1 text-xs font-mono">
                {t(`Reference: ${transaction}`)}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!failed && !checking && !confirmed && (
            <Button className="w-full" onClick={() => void verifyPendingOrder()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              <T>Check payment status again</T>
            </Button>
          )}
          {failed && (
            <Button
              className="w-full"
              onClick={() => (window.location.href = "/checkout?payment=continue")}
            >
              <T>Return to checkout</T>
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = "/dashboard/customer")}
          >
            <T>View my orders</T>
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
