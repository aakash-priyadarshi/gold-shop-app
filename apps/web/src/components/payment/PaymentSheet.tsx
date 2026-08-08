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
import { ordersApi, paymentGatewayApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { CreditCard, Loader2, Shield } from "lucide-react";
import { useState } from "react";

interface PaymentSheetProps {
  type: "subscription" | "order" | "rfq_booking" | "ai_credits";
  resourceId: string;
  amount: number;
  currency: string;
  country: string;
  displayName: string;
  metadata?: Record<string, string>;
  preferredGateway?: string;
  idempotencyKey?: string;
  onSuccess?: (paymentId: string, gateway: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const GATEWAY_LABELS: Record<string, { label: string; description: string }> = {
  stripe: {
    label: "Pay with card",
    description: "Continue to secure hosted checkout via Stripe",
  },
  phonepe: {
    label: "Pay with PhonePe",
    description: "UPI and card payment via PhonePe",
  },
  esewa: {
    label: "Pay with eSewa",
    description: "Continue to the eSewa wallet",
  },
  khalti: {
    label: "Pay with Khalti",
    description: "Continue to the Khalti wallet",
  },
  razorpay: {
    label: "Pay with Razorpay",
    description: "Cards, UPI and net banking via Razorpay",
  },
  manual: {
    label: "Bank transfer / pay later",
    description: "Confirm the order and complete payment manually",
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  NPR: "रू",
  LKR: "Rs.",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AED: "د.إ",
};

interface PaymentResult {
  paymentId: string;
  gateway: string;
  clientSecret?: string;
  redirectUrl?: string;
  status: string;
  requiresAction?: boolean;
}

export function PaymentSheet({
  type,
  resourceId,
  amount,
  currency,
  country,
  displayName,
  metadata,
  preferredGateway,
  idempotencyKey,
  onSuccess,
  onError,
  onCancel,
}: PaymentSheetProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: currency === "LKR" ? 2 : 0,
    maximumFractionDigits: currency === "LKR" ? 2 : 2,
  });

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      if (type === "order" && !idempotencyKey) {
        throw new Error(
          t(
            "A stable payment attempt key is required. Return to checkout and try again.",
          ),
        );
      }

      // Order amounts, currency and market are resolved by the backend from
      // the order itself. The generic initiation route is not trusted here.
      const response =
        type === "order"
          ? await ordersApi.payOrder(
              resourceId,
              preferredGateway,
              idempotencyKey!,
            )
          : await paymentGatewayApi.initiatePayment({
              type,
              resourceId,
              amount,
              currency,
              country,
              metadata,
              preferredGateway,
            });

      const data = response.data as PaymentResult;
      setResult(data);

      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }

      // Hosted Stripe Checkout should return redirectUrl. A clientSecret from
      // an older backend response cannot be completed by this component and
      // must never be displayed or treated as a successful payment.
      if (data.clientSecret) {
        const message = t(
          "This payment requires an embedded card form that is not available. Please retry or choose another payment method.",
        );
        setError(message);
        onError?.(message);
        return;
      }

      const status = String(data.status || "").toLowerCase();
      if (
        data.gateway === "manual" ||
        ["succeeded", "paid", "completed"].includes(status)
      ) {
        onSuccess?.(data.paymentId, data.gateway);
        return;
      }

      const message = t(
        "Payment was started but has not been confirmed. Check your order before trying again.",
      );
      setError(message);
      onError?.(message);
    } catch (caught: unknown) {
      const requestError = caught as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        t("Payment initiation failed");
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const gatewayInfo =
    GATEWAY_LABELS[preferredGateway || ""] ||
    GATEWAY_LABELS[result?.gateway || ""];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <T>Payment</T>
        </CardTitle>
        <CardDescription>{displayName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-3xl font-bold">
            {symbol} {formattedAmount}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {currency} · {country}
          </div>
          {type === "order" && (
            <div className="text-xs text-muted-foreground mt-2">
              <T>
                Canonical order balance. The final local-currency charge is
                calculated securely and shown by the payment provider.
              </T>
            </div>
          )}
        </div>

        {gatewayInfo && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <CreditCard className="h-6 w-6 text-amber-600" />
            <div>
              <div className="font-medium text-sm">
                <T>{gatewayInfo.label}</T>
              </div>
              <div className="text-xs text-muted-foreground">
                <T>{gatewayInfo.description}</T>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              <T>Cancel</T>
            </Button>
          )}
          <Button className="flex-1" onClick={handlePay} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                <T>Processing...</T>
              </>
            ) : preferredGateway === "manual" ? (
              <T>Confirm order</T>
            ) : (
              <T>Continue to secure payment</T>
            )}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          <T>Payments are processed securely. We never store card details.</T>
        </div>
      </CardContent>
    </Card>
  );
}
