"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";
import { useEffect, useState } from "react";

interface ReferralEntry {
  id: string;
  refereeEmail: string;
  referralCode: string;
  rewardType: "PRO_3_MONTHS" | "PRO_PLUS_1_5_MONTHS";
  status: "PENDING" | "SIGNED_UP" | "COMPLETED" | "EXPIRED";
  invitedAt: string;
  signedUpAt: string | null;
  completedAt: string | null;
  referrerRewarded: boolean;
  refereeShop: { shopName: string; isVerified: boolean } | null;
}

interface ReferralSettings {
  proMonths: number;
  proPlusMonths: number;
  maxReferrals: number;
  isActive: boolean;
}

const REWARD_LABELS: Record<string, string> = {
  PRO_3_MONTHS: "3 months Pro",
  PRO_PLUS_1_5_MONTHS: "1.5 months Pro+",
};

export default function SellerReferralsPage() {
  const t = useT();
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralSettings, setReferralSettings] =
    useState<ReferralSettings | null>(null);
  const [referralEmail, setReferralEmail] = useState("");
  const [referralReward, setReferralReward] = useState<string>("PRO_3_MONTHS");
  const [referralSending, setReferralSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const res = await sellerPerformanceApi.getMyReferrals();
      if (res?.data) {
        setReferrals(res.data.referrals || []);
        setReferralSettings(res.data.settings || null);
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
        rewardType: referralReward,
      });
      toast({
        title: t("Referral sent!"),
        description: t("We'll notify you when they sign up."),
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

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(`https://orivraa.com/register?ref=${code}`);
    toast({ title: t("Referral link copied!") });
  };

  const completedCount = referrals.filter(
    (r) => r.status === "COMPLETED",
  ).length;
  const pendingCount = referrals.filter(
    (r) => r.status === "PENDING" || r.status === "SIGNED_UP",
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-purple-500" />
            <T>Referral Programme</T>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T>
              Invite sellers to Orivraa. Both of you earn free plan time when
              they sign up and get verified!
            </T>
          </p>
        </div>

        {/* How it works */}
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-950/30">
          <CardContent className="p-6">
            <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-3">
              <T>How it works</T>
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-purple-700 dark:text-purple-300">
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <span className="text-2xl">📧</span>
                <p className="font-medium">
                  <T>Send an invitation</T>
                </p>
                <p className="text-xs">
                  <T>Enter the seller's email and pick your reward tier</T>
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <span className="text-2xl">✅</span>
                <p className="font-medium">
                  <T>They sign up & verify</T>
                </p>
                <p className="text-xs">
                  <T>When your referral creates a shop and gets KYC verified</T>
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <span className="text-2xl">🎁</span>
                <p className="font-medium">
                  <T>Both earn rewards!</T>
                </p>
                <p className="text-xs">
                  <T>Admin confirms and both of you get free plan time</T>
                </p>
              </div>
            </div>

            {referralSettings && (
              <div className="mt-4 p-3 rounded-lg bg-white/60 dark:bg-gray-900/40 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-purple-300 text-purple-700 dark:text-purple-300"
                  >
                    Option A
                  </Badge>
                  <span>
                    {referralSettings.proMonths}{" "}
                    <T>months Pro — both get it free</T>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-purple-300 text-purple-700 dark:text-purple-300"
                  >
                    Option B
                  </Badge>
                  <span>
                    {referralSettings.proPlusMonths}{" "}
                    <T>months Pro+ — both get it free</T>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Referral Form */}
        {referralSettings?.isActive && (
          <Card>
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
                <div className="w-48">
                  <Label className="text-xs mb-1 block">
                    <T>Reward Choice</T>
                  </Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={referralReward}
                    onChange={(e) => setReferralReward(e.target.value)}
                  >
                    <option value="PRO_3_MONTHS">
                      {referralSettings.proMonths} months Pro
                    </option>
                    <option value="PRO_PLUS_1_5_MONTHS">
                      {referralSettings.proPlusMonths} months Pro+
                    </option>
                  </select>
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

        {/* My Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              <T>My Referrals</T>
              <Badge variant="secondary" className="ml-auto">
                {referrals.length}
                {referralSettings
                  ? ` / ${referralSettings.maxReferrals}`
                  : ""}
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
                  <T>No referrals yet. Send your first invitation above!</T>
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
                              : ref.status === "COMPLETED"
                                ? "Rewarded ✓"
                                : "Expired"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {REWARD_LABELS[ref.rewardType] || ref.rewardType}
                        </span>
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
                        onClick={() => copyReferralCode(ref.referralCode)}
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

        {/* Summary */}
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
                  <T>Completed & Rewarded</T>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
