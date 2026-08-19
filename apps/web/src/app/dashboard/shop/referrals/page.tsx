"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { sellerPerformanceApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  Copy,
  Gift,
  Loader2,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ReferralEntry {
  id: string;
  refereeEmail: string;
  referralCode: string;
  status: "PENDING" | "SIGNED_UP" | "PLAN_PURCHASED" | "COMPLETED" | "EXPIRED";
  invitedAt: string;
  signedUpAt: string | null;
  completedAt: string | null;
  refereeShop: { shopName: string; isVerified: boolean } | null;
}

interface ReferralSettings {
  commissionPercent: number;
  applyToInvoiceFirst: boolean;
  minCashoutAmount: number;
  maxReferrals: number;
  isActive: boolean;
}

interface CommissionRow {
  id: string;
  commissionAmount: number;
  currency: string;
  status: "ACCRUED" | "APPLIED" | "PAID_OUT" | "VOID";
  createdAt: string;
}

interface PayoutProfile {
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  hasConnectAccount: boolean;
}

export default function SellerReferralsPage() {
  const t = useT();
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralSettings, setReferralSettings] =
    useState<ReferralSettings | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [earnings, setEarnings] = useState({
    accrued: 0,
    applied: 0,
    paidOut: 0,
    commissions: [] as CommissionRow[],
  });
  const [payoutProfile, setPayoutProfile] = useState<PayoutProfile | null>(
    null,
  );
  const [referralEmail, setReferralEmail] = useState("");
  const [referralSending, setReferralSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [cashOutLoading, setCashOutLoading] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "return" || params.get("connect") === "refresh") {
      sellerPerformanceApi
        .refreshReferralConnect()
        .then(() => loadReferrals())
        .catch(() => undefined);
    }
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const res = await sellerPerformanceApi.getMyReferrals();
      if (res?.data) {
        setReferrals(res.data.referrals || []);
        setReferralSettings(res.data.settings || null);
        setShareLink(res.data.shareLink || "");
        setEarnings(
          res.data.earnings || {
            accrued: 0,
            applied: 0,
            paidOut: 0,
            commissions: [],
          },
        );
        setPayoutProfile(res.data.payoutProfile || null);
      }
    } catch (error) {
      console.warn("Failed to load referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReferral = async () => {
    if (!referralEmail.trim()) return;
    setReferralSending(true);
    try {
      await sellerPerformanceApi.createReferral({
        refereeEmail: referralEmail.trim(),
      });
      toast({
        title: t("Referral sent!"),
        description: t("We'll email them an invite link."),
      });
      setReferralEmail("");
      loadReferrals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Failed to send referral"),
        description:
          error?.response?.data?.message || t("Something went wrong."),
      });
    } finally {
      setReferralSending(false);
    }
  };

  const copyText = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: t(label) });
  };

  const startConnect = async () => {
    setConnectLoading(true);
    try {
      const res = await sellerPerformanceApi.startReferralConnect();
      const url = res?.data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast({
        variant: "destructive",
        title: t("Could not start Stripe Connect"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Stripe Connect unavailable"),
        description:
          error?.response?.data?.message ||
          t("Commission still applies to your next Orivraa invoice."),
      });
    } finally {
      setConnectLoading(false);
    }
  };

  const cashOut = async () => {
    setCashOutLoading(true);
    try {
      const res = await sellerPerformanceApi.cashOutReferralWallet();
      toast({
        title: t("Cash-out requested"),
        description:
          res?.data?.stripeFeeNote ||
          t("Stripe Connect charges a payout fee on cash-outs."),
      });
      loadReferrals();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Cash-out failed"),
        description:
          error?.response?.data?.message || t("Something went wrong."),
      });
    } finally {
      setCashOutLoading(false);
    }
  };

  const percent = referralSettings?.commissionPercent ?? 10;
  const completedCount = referrals.filter(
    (r) => r.status === "COMPLETED",
  ).length;
  const pendingCount = referrals.filter(
    (r) => r.status === "PENDING" || r.status === "SIGNED_UP",
  ).length;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-purple-500" />
            <T>Referral Programme</T>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T>
              Invite jewellery shops to Orivraa. You earn 10% of every paid
              subscription invoice while they stay subscribed — applied to your
              next Pro invoice first, leftover via Stripe Connect.
            </T>
          </p>
        </div>

        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-950/30">
          <CardContent className="p-6">
            <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-3">
              <T>How it works</T>
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-purple-700 dark:text-purple-300">
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <span className="text-2xl">🔗</span>
                <p className="font-medium">
                  <T>Share your link</T>
                </p>
                <p className="text-xs">
                  <T>Email an invite or copy your personal register link</T>
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <span className="text-2xl">💳</span>
                <p className="font-medium">
                  <T>They pay for a plan</T>
                </p>
                <p className="text-xs">
                  <T>Every paid invoice while they stay subscribed counts</T>
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <span className="text-2xl">📄</span>
                <p className="font-medium">
                  <T>You get 10% on your invoice</T>
                </p>
                <p className="text-xs">
                  <T>
                    Applied to your next Orivraa Pro invoice first (no extra
                    Stripe fee). Leftover cash-out uses Connect and Connect
                    fees apply.
                  </T>
                </p>
              </div>
            </div>

            {referralSettings && (
              <div className="mt-4 p-3 rounded-lg bg-white/60 dark:bg-gray-900/40 text-sm text-center">
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  <T>Reward:</T> {percent}%{" "}
                  <T>
                    of each paid subscription invoice, for as long as they keep
                    paying. Not AI credits and not a Pro+ upgrade.
                  </T>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {shareLink && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <T>Your referral link</T>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Input readOnly value={shareLink} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => copyText(shareLink, "Referral link copied!")}
              >
                <Copy className="h-4 w-4 mr-1" />
                <T>Copy</T>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <T>Earnings wallet</T>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{earnings.accrued.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  <T>Wallet (not yet applied)</T>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {earnings.applied.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Applied to invoices</T>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {earnings.paidOut.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Cashed out</T>
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>
                Invoice credit is applied first so you are not charged twice.
                Stripe Connect cash-out is only for leftover wallet balance and
                includes Connect payout fees. Referral cash is never paid by
                refunding the referred shop.
              </T>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={startConnect}
                disabled={connectLoading}
              >
                {connectLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {payoutProfile?.payoutsEnabled ? (
                  <T>Connect payouts ready</T>
                ) : (
                  <T>Set up leftover cash-out</T>
                )}
              </Button>
              <Button
                onClick={cashOut}
                disabled={cashOutLoading || earnings.accrued <= 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {cashOutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                <T>Cash out leftover</T>
              </Button>
            </div>
          </CardContent>
        </Card>

        {referralSettings?.isActive && (
          <Card data-tour="referrals-invite">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                <T>Send a Referral Invitation</T>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="refEmail" className="text-xs mb-1 block">
                    <T>Seller's Email</T>
                  </Label>
                  <Input
                    id="refEmail"
                    type="email"
                    placeholder="seller@example.com"
                    value={referralEmail}
                    onChange={(e) => setReferralEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReferral()}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSendReferral}
                    disabled={referralSending || !referralEmail.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {referralSending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    <T>Send</T>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-tour="referrals-list">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              <T>My Referrals</T>
              <Badge variant="secondary" className="ml-auto">
                {referrals.length}
                {referralSettings ? ` / ${referralSettings.maxReferrals}` : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  <T>No referrals yet. Share your link or send an invitation.</T>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ref.refereeEmail}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge
                          variant={
                            ref.status === "COMPLETED"
                              ? "default"
                              : ref.status === "EXPIRED"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            ref.status === "COMPLETED" ? "bg-green-600" : ""
                          }
                        >
                          {ref.status === "PENDING"
                            ? "Invited"
                            : ref.status === "SIGNED_UP"
                              ? "Signed Up"
                              : ref.status === "PLAN_PURCHASED"
                                ? "Plan Purchased"
                                : ref.status === "COMPLETED"
                                  ? "Earning"
                                  : "Expired"}
                        </Badge>
                        {ref.refereeShop && (
                          <span className="text-xs text-muted-foreground">
                            — {ref.refereeShop.shopName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ref.invitedAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          copyText(
                            `${window.location.origin}/auth/register?ref=${ref.referralCode}`,
                            "Referral link copied!",
                          )
                        }
                        title="Copy referral link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">
                  <T>Total Invited</T>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {pendingCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Pending</T>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {completedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Active (earning)</T>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
