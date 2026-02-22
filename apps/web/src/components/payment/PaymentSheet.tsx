"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { paymentGatewayApi } from "@/lib/api";
import { CreditCard, ExternalLink, Loader2, Shield } from "lucide-react";
import { useState } from "react";

/**
 * PaymentSheet — Unified payment component.
 *
 * Usage:
 *   <PaymentSheet
 *     type="subscription"
 *     resourceId={subscriptionId}
 *     amount={499}
 *     currency="INR"
 *     country="IN"
 *     displayName="Pro Plan (Monthly)"
 *     onSuccess={(paymentId) => ...}
 *     onError={(err) => ...}
 *   />
 *
 * Automatically routes to the correct gateway based on country:
 *   - IN  → PhonePe (UPI redirect)
 *   - NP  → eSewa / Khalti (redirect)
 *   - US/UK/EU/AE → Stripe (inline card form)
 */

interface PaymentSheetProps {
  type: "subscription" | "order" | "rfq_booking" | "ai_credits";
  resourceId: string;
  amount: number;
  currency: string;
  country: string;
  displayName: string;
  metadata?: Record<string, string>;
  preferredGateway?: string;
  onSuccess?: (paymentId: string, gateway: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const GATEWAY_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  stripe: {
    label: "Pay with Card",
    icon: "💳",
    description: "Visa, Mastercard, Amex — secure card payment via Stripe",
  },
  phonepe: {
    label: "Pay with PhonePe",
    icon: "📱",
    description: "UPI, Debit Card — fast Indian payments via PhonePe",
  },
  esewa: {
    label: "Pay with eSewa",
    icon: "🟢",
    description: "Nepal's digital wallet — redirect to eSewa",
  },
  khalti: {
    label: "Pay with Khalti",
    icon: "🟣",
    description: "Khalti digital wallet — redirect to Khalti",
  },
  razorpay: {
    label: "Pay with Razorpay",
    icon: "🔷",
    description: "Cards, UPI, Netbanking — Razorpay checkout",
  },
  manual: {
    label: "Pay at Shop / COD",
    icon: "🏪",
    description: "Confirm order and pay later at the shop",
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  NPR: "रू",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AED: "د.إ",
};

export function PaymentSheet({
  type,
  resourceId,
  amount,
  currency,
  country,
  displayName,
  metadata,
  preferredGateway,
  onSuccess,
  onError,
  onCancel,
}: PaymentSheetProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    paymentId: string;
    gateway: string;
    clientSecret?: string;
    redirectUrl?: string;
    status: string;
    requiresAction: boolean;
  } | null>(null);

  const sym = CURRENCY_SYMBOLS[currency] || currency;

  const handlePay = async () => {
    try {
      setLoading(true);
      const res = await paymentGatewayApi.initiatePayment({
        type,
        resourceId,
        amount,
        currency,
        country,
        metadata,
        preferredGateway,
      });

      const data = res.data;
      setResult(data);

      // If there's a redirect URL (PhonePe, eSewa, Khalti), navigate
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // If Stripe with clientSecret, we need Stripe Elements (or mark as pending)
      if (data.gateway === "stripe" && data.clientSecret) {
        // For now, store result so Stripe Elements can mount
        // Full Stripe Elements integration requires @stripe/stripe-js
        // The clientSecret is available at data.clientSecret
      }

      // Manual/COD — mark success immediately
      if (data.gateway === "manual" || !data.requiresAction) {
        onSuccess?.(data.paymentId, data.gateway);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Payment initiation failed";
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const gwInfo =
    GATEWAY_LABELS[preferredGateway || ""] ||
    GATEWAY_LABELS[result?.gateway || ""] ||
    null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment
        </CardTitle>
        <CardDescription>{displayName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-3xl font-bold">
            {sym}
            {amount.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {currency} • {country}
          </div>
        </div>

        {/* Gateway Info */}
        {gwInfo && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <span className="text-2xl">{gwInfo.icon}</span>
            <div>
              <div className="font-medium text-sm">{gwInfo.label}</div>
              <div className="text-xs text-muted-foreground">
                {gwInfo.description}
              </div>
            </div>
          </div>
        )}

        {/* Stripe Elements placeholder */}
        {result?.gateway === "stripe" && result.clientSecret && (
          <div className="p-4 border-2 border-dashed border-muted rounded-lg text-center text-sm text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Stripe card form will mount here.
            <br />
            <code className="text-xs">clientSecret: {result.clientSecret.slice(0, 20)}...</code>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Processing...
              </>
            ) : result?.redirectUrl ? (
              <>
                <ExternalLink className="h-4 w-4 mr-1" />
                Redirecting...
              </>
            ) : (
              <>
                Pay {sym}
                {amount.toLocaleString()}
              </>
            )}
          </Button>
        </div>

        {/* Security badge */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          Payments processed securely. We never store card details.
        </div>
      </CardContent>
    </Card>
  );
}
