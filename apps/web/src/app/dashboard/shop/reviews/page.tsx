"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { sellerPerformanceApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { CheckCircle, ExternalLink, Loader2, Star, Upload } from "lucide-react";
import { useEffect, useState } from "react";

interface PlatformReviewEntry {
  platform: string;
  submitted: boolean;
  review: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    proofScreenshot: string;
    reviewUrl: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    adminNotes: string | null;
    rewardGranted: boolean;
  } | null;
}

const PLATFORM_DISPLAY: Record<
  string,
  { name: string; url: string; logo: string; description: string }
> = {
  saashub: {
    name: "SaaSHub",
    url: "https://www.saashub.com/orivraa-alternatives",
    logo: "🔍",
    description:
      "SaaSHub helps users discover software alternatives. A review here boosts our visibility among thousands of SaaS seekers.",
  },
  g2: {
    name: "G2",
    url: "https://www.g2.com/products/orivraa/reviews",
    logo: "⭐",
    description:
      "G2 is the #1 B2B software review platform. Your authentic review helps other jewellers find Orivraa.",
  },
  crunchbase: {
    name: "Crunchbase",
    url: "https://www.crunchbase.com/organization/orivraa",
    logo: "📊",
    description:
      "Crunchbase tracks innovative startups. Your review signals to investors and partners that Orivraa delivers value.",
  },
};

export default function SellerReviewsPage() {
  const t = useT();
  const [platformReviews, setPlatformReviews] = useState<PlatformReviewEntry[]>(
    [],
  );
  const [reviewSubmitting, setReviewSubmitting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { upload: uploadReviewProof } = useImageUpload({
    type: "review-proof",
    onSuccess: () => {},
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t("Upload failed"),
        description: err,
      }),
  });

  useEffect(() => {
    loadPlatformReviews();
  }, []);

  const loadPlatformReviews = async () => {
    setLoading(true);
    try {
      const res = await sellerPerformanceApi.getMyReviews();
      if (res?.data) setPlatformReviews(res.data);
    } catch (error) {
      console.warn("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (platform: string, reviewUrl: string) => {
    setReviewSubmitting(platform);
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      const file = await new Promise<File | null>((resolve) => {
        input.onchange = (e) =>
          resolve((e.target as HTMLInputElement).files?.[0] || null);
        input.click();
        setTimeout(() => resolve(null), 120000);
      });
      if (!file) {
        setReviewSubmitting(null);
        return;
      }

      const uploadResult = await uploadReviewProof(file);
      if (!uploadResult?.url) throw new Error("Upload failed");

      await sellerPerformanceApi.submitReview({
        platform,
        proofScreenshot: uploadResult.url,
        reviewUrl,
      });
      toast({ title: t("Review submitted! We'll verify it shortly.") });
      loadPlatformReviews();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Failed to submit review"),
        description:
          error?.response?.data?.message || t("Something went wrong."),
      });
    } finally {
      setReviewSubmitting(null);
    }
  };

  const approvedCount = platformReviews.filter(
    (r) => r.review?.status === "APPROVED",
  ).length;
  const rewardedCount = platformReviews.filter(
    (r) => r.review?.rewardGranted,
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            <T>Review & Earn</T>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T>
              Leave a review on any platform below and earn 1 month of Pro for
              free!
            </T>
          </p>
        </div>

        {/* How it works */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30">
          <CardContent className="p-6">
            <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-3">
              <T>How it works</T>
            </h3>
            <div className="grid sm:grid-cols-4 gap-4 text-sm text-amber-700 dark:text-amber-300">
              <div className="flex flex-col items-center text-center gap-1">
                <span className="text-2xl">1️⃣</span>
                <T>Visit platform & leave a review</T>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="text-2xl">2️⃣</span>
                <T>Take a screenshot of your review</T>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="text-2xl">3️⃣</span>
                <T>Upload the proof below</T>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="text-2xl">4️⃣</span>
                <T>Get 1 month Pro after admin approval</T>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6">
            {(platformReviews.length > 0
              ? platformReviews
              : Object.keys(PLATFORM_DISPLAY).map((p) => ({
                  platform: p,
                  submitted: false,
                  review: null,
                }))
            ).map((entry) => {
              const info = PLATFORM_DISPLAY[entry.platform];
              if (!info) return null;
              const review = entry.review;

              return (
                <Card key={entry.platform} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left: Platform info */}
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{info.logo}</span>
                        <div>
                          <h3 className="text-lg font-bold">{info.name}</h3>
                          <a
                            href={info.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-amber-600 hover:underline inline-flex items-center gap-1"
                          >
                            <T>Visit profile</T>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                    </div>

                    {/* Right: Status & action */}
                    <div className="sm:w-64 p-6 bg-muted/30 flex flex-col items-center justify-center gap-3 border-t sm:border-t-0 sm:border-l">
                      {review?.status === "APPROVED" && (
                        <>
                          <CheckCircle className="h-10 w-10 text-green-500" />
                          <Badge className="bg-green-600">
                            <T>Approved</T>
                          </Badge>
                          {review.rewardGranted && (
                            <p className="text-xs text-green-600 font-medium text-center">
                              <T>1 month Pro granted!</T>
                            </p>
                          )}
                        </>
                      )}

                      {review?.status === "PENDING" && (
                        <>
                          <Badge variant="secondary">
                            <T>Under Review</T>
                          </Badge>
                          <p className="text-xs text-muted-foreground text-center">
                            <T>Submitted</T>{" "}
                            {new Date(review.submittedAt).toLocaleDateString()}
                          </p>
                          {review.proofScreenshot && (
                            <a
                              href={review.proofScreenshot}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              <T>View uploaded proof</T>
                            </a>
                          )}
                        </>
                      )}

                      {review?.status === "REJECTED" && (
                        <>
                          <Badge variant="destructive">
                            <T>Rejected</T>
                          </Badge>
                          {review.adminNotes && (
                            <p className="text-xs text-red-600 text-center max-w-[200px]">
                              {review.adminNotes}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleReviewSubmit(entry.platform, info.url)
                            }
                            disabled={reviewSubmitting === entry.platform}
                          >
                            {reviewSubmitting === entry.platform ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1" />
                            )}
                            <T>Re-submit Proof</T>
                          </Button>
                        </>
                      )}

                      {!review && (
                        <Button
                          onClick={() =>
                            handleReviewSubmit(entry.platform, info.url)
                          }
                          disabled={reviewSubmitting === entry.platform}
                          className="w-full"
                        >
                          {reviewSubmitting === entry.platform ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1" />
                          )}
                          <T>Upload Review Screenshot</T>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {platformReviews.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Total Submissions</T>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {approvedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Approved</T>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {rewardedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Pro Months Earned</T>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
