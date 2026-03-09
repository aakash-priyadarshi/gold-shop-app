"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { useT } from "@/providers/translation-provider";
import { sellerPerformanceApi, shopsApi } from "@/lib/api";
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  Camera,
  CheckCircle,
  Crown,
  Edit3,
  ExternalLink,
  Flag,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Save,
  Shield,
  Star,
  Store,
  TrendingUp,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────

interface ShopProfile {
  id: string;
  shopName: string;
  description?: string;
  about?: string;
  profileImage?: string;
  coverImage?: string;
  country: string;
  city: string;
  state?: string;
  isVerified: boolean;
  isActive: boolean;
  sellerTier?: string;
  makingChargeCap?: number;
  createdAt: string;
}

interface Review {
  id: string;
  overall: number;
  quality?: number;
  communication?: number;
  delivery?: number;
  accuracy?: number;
  reviewText?: string;
  isPublic: boolean;
  createdAt: string;
  sellerReply?: string;
  sellerRepliedAt?: string;
  deleteRequested: boolean;
  deleteRequestStatus?: string;
  deleteRequestReason?: string;
  customer: { firstName: string; lastName: string };
}

interface TierDashboard {
  performance: any;
  shop: {
    sellerTier: string;
    tierUnlockedAt: string | null;
    makingChargeCap: number | null;
    isVerified: boolean;
  };
  badges: any[];
  nextTier: string | null;
  tierProgress: Record<
    string,
    { current: number | boolean; required: number | boolean; met: boolean }
  >;
  overallProgress: { met: number; total: number; percentage: number };
}

const TIER_META: Record<
  string,
  { label: string; icon: any; color: string; bg: string; border: string }
> = {
  STANDARD: {
    label: "Standard",
    icon: Shield,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    border: "border-gray-300 dark:border-gray-600",
  },
  SILVER: {
    label: "Silver",
    icon: Star,
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-400",
  },
  GOLD: {
    label: "Gold",
    icon: Award,
    color: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-400",
  },
  ELITE: {
    label: "Elite",
    icon: Crown,
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-400",
  },
};

const CRITERIA_LABELS: Record<
  string,
  { label: string; unit: string; lowerIsBetter?: boolean }
> = {
  orders: { label: "Completed Orders", unit: "" },
  cancellationRate: {
    label: "Cancellation Rate",
    unit: "%",
    lowerIsBetter: true,
  },
  rating: { label: "Average Rating (60d)", unit: "★" },
  tenure: { label: "Shop Tenure", unit: " months" },
  positiveFeedback: { label: "Positive Feedback", unit: "%" },
  onTimeDispatch: { label: "On-Time Dispatch", unit: "%" },
  verified: { label: "Shop Verified", unit: "" },
};

// ── Component ────────────────────────────────────────

export default function ShopPublicProfilePage() {
  const { user } = useAuth();
  const { symbol } = useShopCurrency();
  const t = useT();

  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsMeta, setReviewsMeta] = useState<any>(null);
  const [tierDashboard, setTierDashboard] = useState<TierDashboard | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Edit states
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [aboutViolations, setAboutViolations] = useState<string[]>([]);
  const [aboutChecking, setAboutChecking] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [shopName, setShopName] = useState("");

  // Review reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  // Delete request
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [savingDeleteRequest, setSavingDeleteRequest] = useState(false);

  const aboutCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.shop?.id) {
      loadAll();
    }
  }, [user?.shop?.id]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, reviewsRes, tierRes] = await Promise.all([
        shopsApi.getSettings(),
        shopsApi.getMyReviews({ page: 1, pageSize: 50 }),
        sellerPerformanceApi.getMyDashboard().catch(() => null),
      ]);

      const shopData = settingsRes.data?.shop || settingsRes.data;
      setShop(shopData);
      setAboutText(shopData?.about || "");
      setShopName(shopData?.shopName || "");
      setReviews(reviewsRes.data?.reviews || []);
      setReviewsMeta(reviewsRes.data?.meta || null);
      if (tierRes?.data) setTierDashboard(tierRes.data);
    } catch (error) {
      console.error("Failed to load shop profile:", error);
      toast({
        variant: "destructive",
        title: t("Failed to load"),
        description: t("Could not fetch shop profile data"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── About Text Moderation (Live) ─────────────────

  const checkAboutContent = useCallback((text: string) => {
    if (aboutCheckTimeout.current) clearTimeout(aboutCheckTimeout.current);
    if (!text.trim()) {
      setAboutViolations([]);
      return;
    }

    setAboutChecking(true);
    aboutCheckTimeout.current = setTimeout(async () => {
      try {
        const res = await shopsApi.moderateAbout(text);
        const data = res.data;
        setAboutViolations(data.safe ? [] : data.violations || []);
      } catch {
        setAboutViolations([]);
      } finally {
        setAboutChecking(false);
      }
    }, 800);
  }, []);

  const handleAboutChange = (text: string) => {
    setAboutText(text);
    checkAboutContent(text);
  };

  const saveAbout = async () => {
    if (aboutViolations.length > 0) {
      toast({
        variant: "destructive",
        title: t("Cannot save"),
        description: t("Please fix the violations in your about section first"),
      });
      return;
    }

    setSavingProfile(true);
    try {
      await shopsApi.updateProfile({ about: aboutText });
      setEditingAbout(false);
      toast({ title: t("Saved"), description: t("About section updated") });
      if (shop) setShop({ ...shop, about: aboutText });
    } catch (error: any) {
      const violations = error.response?.data?.violations;
      if (violations) {
        setAboutViolations(violations);
      }
      toast({
        variant: "destructive",
        title: t("Save failed"),
        description:
          error.response?.data?.message || t("Could not save about section"),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveShopName = async () => {
    if (!shopName.trim()) return;
    setSavingProfile(true);
    try {
      await shopsApi.updateProfile({ shopName });
      setEditingName(false);
      toast({ title: t("Saved"), description: t("Shop name updated") });
      if (shop) setShop({ ...shop, shopName });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Save failed"),
        description: error.response?.data?.message || t("Could not update name"),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveProfileImage = async (url: string) => {
    try {
      await shopsApi.updateProfile({ profileImage: url });
      if (shop) setShop({ ...shop, profileImage: url });
      toast({ title: t("Profile image updated") });
    } catch {
      toast({ variant: "destructive", title: t("Failed to update image") });
    }
  };

  const saveCoverImage = async (url: string) => {
    try {
      await shopsApi.updateProfile({ coverImage: url });
      if (shop) setShop({ ...shop, coverImage: url });
      toast({ title: t("Cover image updated") });
    } catch {
      toast({ variant: "destructive", title: t("Failed to update cover") });
    }
  };

  // ── Review Actions ───────────────────────────────

  const submitReply = async () => {
    if (!replyingTo || !replyText.trim()) return;
    setSavingReply(true);
    try {
      await shopsApi.replyToReview(replyingTo, replyText.trim());
      toast({ title: t("Reply posted") });
      setReplyingTo(null);
      setReplyText("");
      loadAll(); // Refresh
    } catch (error: any) {
      const violations = error.response?.data?.violations;
      toast({
        variant: "destructive",
        title: t("Reply failed"),
        description: violations
          ? violations.join(", ")
          : error.response?.data?.message || t("Could not post reply"),
      });
    } finally {
      setSavingReply(false);
    }
  };

  const submitDeleteRequest = async () => {
    if (!deleteRequestId || !deleteReason.trim()) return;
    setSavingDeleteRequest(true);
    try {
      await shopsApi.requestReviewDeletion(
        deleteRequestId,
        deleteReason.trim(),
      );
      toast({
        title: t("Request submitted"),
        description: t("Admin will review your request"),
      });
      setDeleteRequestId(null);
      setDeleteReason("");
      loadAll();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Request failed"),
        description:
          error.response?.data?.message || t("Could not submit request"),
      });
    } finally {
      setSavingDeleteRequest(false);
    }
  };

  // ── Stars renderer ────────────────────────────────

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  // Average rating
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.overall, 0) / reviews.length
      : 0;

  // ── Render ────────────────────────────────────────

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  if (!shop) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold"><T>Shop Not Found</T></h2>
            <p className="text-muted-foreground">
              <T>Could not load shop profile data.</T>
            </p>
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  const currentTier = shop.sellerTier || "STANDARD";
  const tierMeta = TIER_META[currentTier] || TIER_META.STANDARD;
  const TierIcon = tierMeta.icon;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* ── Cover Image ──────────────────────────── */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-amber-100 to-yellow-50 h-48 md:h-56">
            {shop.coverImage ? (
              <img
                src={shop.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 opacity-30" />
              </div>
            )}
            <div className="absolute bottom-3 right-3">
              <Button
                size="sm"
                variant="secondary"
                className="opacity-80 hover:opacity-100"
                onClick={() => {
                  const url = prompt("Enter cover image URL:");
                  if (url) saveCoverImage(url);
                }}
              >
                <Camera className="h-4 w-4 mr-1" /> <T>Change Cover</T>
              </Button>
            </div>
          </div>

          {/* ── Profile Header ───────────────────────── */}
          <div className="flex flex-col md:flex-row items-start gap-4 -mt-12 md:-mt-16 px-4 md:px-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={shop.profileImage || undefined} />
                <AvatarFallback className="text-2xl bg-amber-100 text-amber-800">
                  {shop.shopName?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute bottom-0 right-0 p-1 bg-background border rounded-full shadow hover:bg-muted"
                onClick={() => {
                  const url = prompt("Enter profile image URL:");
                  if (url) saveProfileImage(url);
                }}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 mt-2 md:mt-8">
              <div className="flex items-center gap-2 flex-wrap">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-64"
                    />
                    <Button
                      size="sm"
                      onClick={saveShopName}
                      disabled={savingProfile}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingName(false);
                        setShopName(shop.shopName);
                      }}
                    >
                      <T>Cancel</T>
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{shop.shopName}</h1>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {shop.city}, {shop.country}
                </span>
                {shop.isVerified && (
                  <Badge
                    variant="default"
                    className="bg-green-500 text-xs px-1.5 py-0"
                  >
                    <CheckCircle className="h-3 w-3 mr-0.5" /> <T>Verified</T>
                  </Badge>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tierMeta.bg} ${tierMeta.color} border ${tierMeta.border}`}
                >
                  <TierIcon className="h-3.5 w-3.5" />
                  {tierMeta.label} <T>Seller</T>
                </span>
                {reviews.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    {avgRating.toFixed(1)} ({reviews.length} <T>reviews</T>)
                  </span>
                )}
              </div>

              <a
                href={`/shops/${shop.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> <T>View public page</T>
              </a>
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────── */}
          <Tabs defaultValue="about" className="space-y-4">
            <TabsList>
              <TabsTrigger value="about"><T>About</T></TabsTrigger>
              <TabsTrigger value="tier"><T>Tier & Performance</T></TabsTrigger>
              <TabsTrigger value="reviews">
                <T>Reviews</T> ({reviews.length})
              </TabsTrigger>
            </TabsList>

            {/* ── About Tab ───────────────────────────── */}
            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle><T>About Your Shop</T></CardTitle>
                      <CardDescription>
                        <T>Tell customers about your craftsmanship, history, and specialties</T>
                      </CardDescription>
                    </div>
                    {!editingAbout && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAbout(true)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" /> <T>Edit</T>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingAbout ? (
                    <div className="space-y-3">
                      <Textarea
                        value={aboutText}
                        onChange={(e) => handleAboutChange(e.target.value)}
                        rows={6}
                        maxLength={2000}
                        placeholder={t("Share your shop's story — your craft, specialties, years of experience, unique techniques...")}
                        className={
                          aboutViolations.length > 0
                            ? "border-red-400 focus-visible:ring-red-400"
                            : ""
                        }
                      />

                      {/* Live moderation feedback */}
                      {aboutChecking && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> <T>Checking
                          content...</T>
                        </p>
                      )}

                      {aboutViolations.length > 0 && (
                        <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3 space-y-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" /> <T>Content policy
                            violation</T>
                          </p>
                          {aboutViolations.map((v, i) => (
                            <p
                              key={i}
                              className="text-xs text-red-700 dark:text-red-300"
                            >
                              • {v}
                            </p>
                          ))}
                          <p className="text-xs text-red-600 mt-1">
                            <T>Personal contacts (phone, email, address, social
                            media) and offensive content are not allowed. This
                            content will not be saved.</T>
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {aboutText.length}/2000 <T>characters</T>
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAbout(false);
                              setAboutText(shop.about || "");
                              setAboutViolations([]);
                            }}
                          >
                            <T>Cancel</T>
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveAbout}
                            disabled={
                              savingProfile || aboutViolations.length > 0
                            }
                          >
                            {savingProfile ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            <T>Save</T>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {shop.about ? (
                        <p className="text-sm whitespace-pre-wrap">
                          {shop.about}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          <T>No about section yet. Click Edit to add one — tell
                          customers about your craftsmanship!</T>
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {shop.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <T>Shop Description</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{shop.description}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Tier & Performance Tab ───────────────── */}
            <TabsContent value="tier" className="space-y-4">
              {tierDashboard ? (
                <>
                  {/* Current Tier */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-full ${tierMeta.bg} border-2 ${tierMeta.border}`}
                        >
                          <TierIcon className={`h-8 w-8 ${tierMeta.color}`} />
                        </div>
                        <div>
                          <h2 className={`text-xl font-bold ${tierMeta.color}`}>
                            {tierMeta.label} <T>Tier</T>
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            <T>Making charge cap:</T>{" "}
                            {tierDashboard.shop.makingChargeCap}% | <T>Member since</T>{" "}
                            {new Date(shop.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progress to next tier */}
                  {tierDashboard.nextTier && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ArrowUpRight className="h-5 w-5" />
                          <T>Progress to</T> {
                            TIER_META[tierDashboard.nextTier]?.label
                          }{" "}
                          <T>Tier</T>
                        </CardTitle>
                        <CardDescription>
                          {tierDashboard.overallProgress.met}/
                          {tierDashboard.overallProgress.total} <T>criteria met</T> (
                          {tierDashboard.overallProgress.percentage}%)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Progress
                          value={tierDashboard.overallProgress.percentage}
                          className="h-3"
                        />
                        <div className="grid gap-2 mt-4">
                          {Object.entries(tierDashboard.tierProgress).map(
                            ([key, criterion]) => {
                              const meta = CRITERIA_LABELS[key];
                              if (!meta) return null;
                              const isBool =
                                typeof criterion.required === "boolean";
                              return (
                                <div
                                  key={key}
                                  className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                                    criterion.met
                                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50"
                                      : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {criterion.met ? (
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-amber-500" />
                                    )}
                                    <span className="font-medium text-sm">
                                      {meta.label}
                                    </span>
                                  </div>
                                  <span className="font-mono text-sm">
                                    {isBool ? (
                                      criterion.current ? (
                                        <T>Yes</T>
                                      ) : (
                                        <T>No</T>
                                      )
                                    ) : meta.lowerIsBetter ? (
                                      <>
                                        {Number(criterion.current).toFixed(1)}
                                        {meta.unit} / ≤{" "}
                                        {Number(criterion.required).toFixed(1)}
                                        {meta.unit}
                                      </>
                                    ) : (
                                      <>
                                        {typeof criterion.current ===
                                          "number" &&
                                        criterion.current % 1 !== 0
                                          ? Number(criterion.current).toFixed(1)
                                          : criterion.current}
                                        {meta.unit} /{" "}
                                        {typeof criterion.required ===
                                          "number" &&
                                        (criterion.required as number) % 1 !== 0
                                          ? Number(criterion.required).toFixed(
                                              1,
                                            )
                                          : criterion.required}
                                        {meta.unit}
                                      </>
                                    )}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tier Roadmap */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        <T>Tier Roadmap</T>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {(["STANDARD", "SILVER", "GOLD", "ELITE"] as const).map(
                          (tier, i) => {
                            const m = TIER_META[tier];
                            const tierOrder = [
                              "STANDARD",
                              "SILVER",
                              "GOLD",
                              "ELITE",
                            ];
                            const isCurrentOrPast =
                              tierOrder.indexOf(currentTier) >= i;
                            return (
                              <React.Fragment key={tier}>
                                <div
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center ${
                                    isCurrentOrPast
                                      ? `${m.bg} ${m.color} border-2 ${m.border}`
                                      : "bg-muted text-muted-foreground border border-muted"
                                  }`}
                                >
                                  {React.createElement(m.icon, {
                                    className: "h-4 w-4",
                                  })}
                                  <span className="hidden sm:inline">
                                    {m.label}
                                  </span>
                                </div>
                                {i < 3 && (
                                  <div
                                    className={`h-0.5 w-4 rounded ${isCurrentOrPast ? "bg-primary" : "bg-muted-foreground/20"}`}
                                  />
                                )}
                              </React.Fragment>
                            );
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Stats */}
                  {tierDashboard.performance && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          <T>Performance Statistics</T>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            {
                              label: "Total Orders",
                              value: tierDashboard.performance.totalOrders || 0,
                            },
                            {
                              label: "Successful",
                              value:
                                tierDashboard.performance.successfulOrders || 0,
                            },
                            {
                              label: "Avg Rating",
                              value: `${(tierDashboard.performance.avgRating60Days || 0).toFixed(1)} ★`,
                            },
                            {
                              label: "On-Time %",
                              value: `${(tierDashboard.performance.onTimeDispatchRate || 0).toFixed(0)}%`,
                            },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="text-center p-3 rounded-lg bg-muted/50"
                            >
                              <p className="text-2xl font-bold">{stat.value}</p>
                              <p className="text-xs text-muted-foreground">
                                <T>{stat.label}</T>
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">
                      <T>Performance data will appear once your shop has some
                      activity.</T>
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Reviews Tab ─────────────────────────── */}
            <TabsContent value="reviews" className="space-y-4">
              {/* Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold">
                        {avgRating.toFixed(1)}
                      </p>
                      {renderStars(Math.round(avgRating))}
                      <p className="text-xs text-muted-foreground mt-1">
                        {reviews.length} <T>reviews</T>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual reviews */}
              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">
                      <T>No reviews yet. Reviews will appear here once customers
                      rate their orders.</T>
                    </p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card
                    key={review.id}
                    className={
                      review.deleteRequestStatus === "PENDING"
                        ? "border-amber-300"
                        : ""
                    }
                  >
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {review.customer.firstName}{" "}
                            {review.customer.lastName?.charAt(0)}.
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {renderStars(review.overall)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Deletion status badges */}
                        {review.deleteRequestStatus === "PENDING" && (
                          <Badge variant="outline" className="text-amber-600">
                            <T>Deletion Pending</T>
                          </Badge>
                        )}
                        {review.deleteRequestStatus === "REJECTED" && (
                          <Badge variant="outline" className="text-red-600">
                            <T>Deletion Rejected</T>
                          </Badge>
                        )}
                        {review.deleteRequestStatus === "APPROVED" && (
                          <Badge variant="outline" className="text-green-600">
                            <T>Deleted</T>
                          </Badge>
                        )}
                      </div>

                      {review.reviewText && (
                        <p className="text-sm">{review.reviewText}</p>
                      )}

                      {/* Seller Reply */}
                      {review.sellerReply && (
                        <div className="ml-4 pl-4 border-l-2 border-primary/20">
                          <p className="text-xs font-semibold text-primary">
                            <T>Your Reply</T>
                          </p>
                          <p className="text-sm">{review.sellerReply}</p>
                          <p className="text-xs text-muted-foreground">
                            {review.sellerRepliedAt &&
                              new Date(
                                review.sellerRepliedAt,
                              ).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        {!review.sellerReply && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(review.id);
                              setReplyText("");
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" /> <T>Reply</T>
                          </Button>
                        )}
                        {review.deleteRequestStatus === "NONE" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setDeleteRequestId(review.id);
                              setDeleteReason("");
                            }}
                          >
                            <Flag className="h-3.5 w-3.5 mr-1" /> <T>Request
                            Removal</T>
                          </Button>
                        )}
                      </div>

                      {/* Inline Reply Form */}
                      {replyingTo === review.id && (
                        <div className="mt-2 space-y-2 bg-muted/30 p-3 rounded-lg">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            placeholder={t("Write a professional reply to this review...")}
                            maxLength={500}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReplyingTo(null)}
                            >
                              <T>Cancel</T>
                            </Button>
                            <Button
                              size="sm"
                              onClick={submitReply}
                              disabled={savingReply || !replyText.trim()}
                            >
                              {savingReply ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}{" "}
                              <T>Post Reply</T>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* ── Delete Request Dialog ─────────────────── */}
          <Dialog
            open={!!deleteRequestId}
            onOpenChange={(open) => {
              if (!open) {
                setDeleteRequestId(null);
                setDeleteReason("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle><T>Request Review Removal</T></DialogTitle>
                <DialogDescription>
                  <T>Explain why this review should be removed. The admin team will
                  review your request. You cannot delete reviews yourself — only
                  the admin can approve removal.</T>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label><T>Reason for removal (min 20 characters)</T></Label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={4}
                  placeholder={t("Explain why this review is unfair, inaccurate, or violates our policies. Include any evidence or order details that support your case...")}
                />
                <p className="text-xs text-muted-foreground">
                  {deleteReason.length}/20 <T>minimum characters</T>
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteRequestId(null)}
                >
                  <T>Cancel</T>
                </Button>
                <Button
                  onClick={submitDeleteRequest}
                  disabled={
                    savingDeleteRequest || deleteReason.trim().length < 20
                  }
                >
                  {savingDeleteRequest && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  )}
                  <T>Submit Request</T>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
