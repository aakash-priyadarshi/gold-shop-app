"use client";

import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { recoveryOffersApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Gift, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const TOKEN_STORAGE_KEY = "orivraaRecoveryOfferToken";

type ClaimOutcome = "activated" | "extended" | "already_covered";

type Offer = {
  recipient: string;
  days: number;
  status: string;
  expiresAt: string;
  claimedAt?: string;
  claimable: boolean;
  requiresEmailVerification?: boolean;
  outcome?: ClaimOutcome;
};

export default function RecoveryProPage() {
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const t = useT();
  const [token, setToken] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let recoveredToken = "";
    try {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      recoveredToken = hash.get("token") || "";
      if (recoveredToken) {
        window.sessionStorage.setItem(TOKEN_STORAGE_KEY, recoveredToken);
        window.history.replaceState(null, "", "/recovery/pro");
      } else {
        recoveredToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
      }
    } catch {
      setError("Open the original recovery link in this browser to continue.");
      setLoading(false);
      return;
    }

    if (!recoveredToken) {
      setError("This recovery link is missing or invalid.");
      setLoading(false);
      return;
    }
    setToken(recoveredToken);
    recoveryOffersApi
      .lookup(recoveredToken)
      .then((response) => setOffer(response.data))
      .catch((lookupError) =>
        setError(
          lookupError?.response?.data?.message ||
            "This recovery offer could not be found.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const claim = async () => {
    if (!token) return;
    setClaiming(true);
    setError("");
    try {
      const response = await recoveryOffersApi.claim(token);
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setOffer((current) =>
        current
          ? {
              ...current,
              status: "CLAIMED",
              claimable: false,
              claimedAt: new Date().toISOString(),
              days: response.data.days,
              outcome: response.data.outcome,
            }
          : current,
      );
      try {
        await refreshUser();
      } catch (refreshError) {
        console.warn(
          "Recovery was claimed but the session refresh failed:",
          refreshError,
        );
      }
    } catch (claimError: any) {
      setError(
        claimError?.response?.data?.message ||
          "We could not activate the offer. Please contact support@orivraa.com.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const days = offer?.days ?? 50;
  const claimedMessage =
    offer?.outcome === "extended"
      ? `Your Pro access now runs ${days} days from today.`
      : offer?.outcome === "already_covered"
        ? `You already have more than ${days} days of Pro, so nothing changed.`
        : "Your complimentary Pro access is active.";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-4 py-12 dark:from-gray-950 dark:to-gray-900">
      <Card className="mx-auto max-w-lg border-amber-200 shadow-xl dark:border-amber-900">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Gift className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">
            {days} <T>days of Orivraa Pro on us</T>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          {loading || authLoading ? (
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-600" />
          ) : error && !offer ? (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {t(error)}
            </p>
          ) : offer?.status === "CLAIMED" ? (
            <>
              <ShieldCheck className="mx-auto h-12 w-12 text-green-600" />
              <p className="font-semibold text-green-700 dark:text-green-300">
                {t(claimedMessage)}
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/shop">
                  <T>Return to my shop</T>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  <T>
                    If this shop is not on Pro yet, activating this link starts
                    complimentary Pro from today. It does not require a card and
                    will not renew automatically.
                  </T>
                </p>
                <p>
                  <T>
                    If this shop already has Pro, activating this link extends
                    Pro to
                  </T>{" "}
                  {days}{" "}
                  <T>
                    days from today. If more than that already remains, your
                    current plan is left unchanged.
                  </T>
                </p>
                <p>
                  <T>
                    If your email is not verified yet, sign in first. We will
                    send a verification code, then you can activate this gift.
                  </T>
                </p>
              </div>
              {offer && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p>
                    <T>Account</T>: {offer.recipient}
                  </p>
                  <p>
                    <T>Offer expires</T>:{" "}
                    {new Date(offer.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {t(error)}
                </p>
              )}
              {offer?.requiresEmailVerification && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <T>
                    This email still needs verification. Sign in, enter the
                    code, then return here to activate the offer.
                  </T>
                </p>
              )}
              {!isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link href="/auth/login?returnTo=%2Frecovery%2Fpro">
                    <T>Sign in to claim this offer</T>
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={claiming || !offer?.claimable}
                  onClick={claim}
                >
                  {claiming && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <T>Activate this Pro offer</T>
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                <T>
                  Need help? Reply to the recovery email or contact
                  support@orivraa.com.
                </T>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
