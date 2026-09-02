"use client";

import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  type OfferCampaign,
  recoveryOffersApi,
} from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Gift, Loader2, Percent, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OfferLookup = {
  recipient: string;
  days: number;
  status: string;
  expiresAt: string;
  claimedAt?: string;
  claimable: boolean;
  requiresEmailVerification: boolean;
  campaign: OfferCampaign;
};

export default function FestivalOfferPage() {
  const params = useParams<{ campaignKey: string }>();
  const campaignKey = params.campaignKey;
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const t = useT();
  const [token, setToken] = useState("");
  const [offer, setOffer] = useState<OfferLookup | null>(null);
  const [campaign, setCampaign] = useState<OfferCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storageKey = `orivraaOfferToken:${campaignKey}`;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const rawToken =
      hash.get("token") || window.sessionStorage.getItem(storageKey) || "";
    if (rawToken) {
      window.sessionStorage.setItem(storageKey, rawToken);
      window.history.replaceState(null, "", `/offers/${campaignKey}`);
      setToken(rawToken);
      recoveryOffersApi
        .lookup(rawToken)
        .then((response) => {
          if (response.data.campaign.key !== campaignKey) {
            throw new Error("This link belongs to a different offer");
          }
          setOffer(response.data);
          setCampaign(response.data.campaign);
        })
        .catch((lookupError) =>
          setError(
            lookupError?.response?.data?.message ||
              lookupError?.message ||
              "This offer link could not be found.",
          ),
        )
        .finally(() => setLoading(false));
      return;
    }

    recoveryOffersApi
      .getCampaign(campaignKey)
      .then((response) => setCampaign(response.data))
      .catch(() => setError("This festival offer is unavailable."))
      .finally(() => setLoading(false));
  }, [campaignKey]);

  const claim = async () => {
    if (!token) return;
    setClaiming(true);
    setError("");
    try {
      const response = await recoveryOffersApi.claim(token);
      window.sessionStorage.removeItem(`orivraaOfferToken:${campaignKey}`);
      setOffer((current) =>
        current
          ? {
              ...current,
              status: "CLAIMED",
              claimable: false,
              claimedAt: new Date().toISOString(),
              days: response.data.days,
            }
          : current,
      );
      await refreshUser().catch(() => undefined);
    } catch (claimError: any) {
      setError(
        claimError?.response?.data?.message ||
          "We could not activate this offer. Contact support@orivraa.com.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const days = offer?.days ?? campaign?.complimentaryDays ?? 14;
  const discount = campaign?.discountPercent ?? 10;
  const returnTo = encodeURIComponent(`/offers/${campaignKey}`);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-violet-50 px-4 py-12 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950/20">
      <Card className="mx-auto max-w-2xl overflow-hidden border-amber-200 shadow-xl dark:border-amber-900">
        <CardHeader className="bg-slate-950 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
            <Gift className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            {campaign?.name || <T>Festival offer</T>}
          </p>
          <CardTitle className="mt-2 text-3xl">
            {campaign?.emailHeading || <T>A special offer from Orivraa</T>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 text-center sm:p-8">
          {loading || authLoading ? (
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-600" />
          ) : error && !campaign ? (
            <p className="rounded-lg bg-red-50 p-4 text-red-700">{t(error)}</p>
          ) : (
            <>
              <p className="text-muted-foreground">{campaign?.emailBody}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:bg-amber-950/20">
                  <Gift className="mx-auto h-6 w-6 text-amber-700" />
                  <p className="mt-2 text-3xl font-bold">{days}</p>
                  <p className="font-semibold">
                    <T>complimentary Pro days</T>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <T>No card and no automatic renewal</T>
                  </p>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:bg-violet-950/20">
                  <Percent className="mx-auto h-6 w-6 text-violet-700" />
                  <p className="mt-2 text-3xl font-bold">{discount}%</p>
                  <p className="font-semibold">
                    <T>off every paid plan</T>
                  </p>
                  {campaign?.endsAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <T>Buy before</T>{" "}
                      {new Date(campaign.endsAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {offer?.status === "CLAIMED" ? (
                <p className="flex items-center justify-center gap-2 font-semibold text-green-700">
                  <ShieldCheck className="h-5 w-5" />
                  <T>Your complimentary Pro offer is active.</T>
                </p>
              ) : offer && !isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link href={`/auth/login?returnTo=${returnTo}`}>
                    <T>Sign in to claim free Pro</T>
                  </Link>
                </Button>
              ) : offer ? (
                <Button
                  className="w-full"
                  disabled={claiming || !offer.claimable}
                  onClick={claim}
                >
                  {claiming && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <T>Claim complimentary Pro</T>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <T>
                    Open the personal link in your festival email to claim the
                    complimentary days.
                  </T>
                </p>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link
                  href={`/dashboard/shop/billing?tab=upgrade&offer=${encodeURIComponent(campaignKey)}`}
                >
                  <T>View discounted plans</T>
                </Link>
              </Button>
              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {t(error)}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
