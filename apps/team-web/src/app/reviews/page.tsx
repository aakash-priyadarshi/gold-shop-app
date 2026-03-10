"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reviewApi } from "@/lib/api";
import { MessageSquare, Minus, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SENTIMENT_ICONS: Record<string, any> = {
  POSITIVE: { icon: ThumbsUp, color: "text-emerald-500" },
  NEGATIVE: { icon: ThumbsDown, color: "text-red-500" },
  NEUTRAL: { icon: Minus, color: "text-amber-500" },
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      reviewApi.listReviews(filter),
      reviewApi.listTrackers(),
      reviewApi.getDashboard(),
    ]).then(([revRes, trkRes, dashRes]) => {
      setReviews(
        revRes.status === "fulfilled"
          ? Array.isArray(revRes.value.data)
            ? revRes.value.data
            : (revRes.value.data?.data ?? [])
          : [],
      );
      setTrackers(
        trkRes.status === "fulfilled"
          ? Array.isArray(trkRes.value.data)
            ? trkRes.value.data
            : (trkRes.value.data?.data ?? [])
          : [],
      );
      setDashboard(dashRes.status === "fulfilled" ? dashRes.value.data : null);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleRespond = async (reviewId: string) => {
    const content = prompt("Enter your response:");
    if (!content) return;
    try {
      await reviewApi.draftResponse(reviewId, { content });
      toast.success("Response drafted");
      load();
    } catch {
      toast.error("Failed to draft response");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Reviews & Reputation
        </h1>
        <p className="text-muted-foreground">
          Track and respond to customer reviews
        </p>
      </div>

      {/* Dashboard stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gold-500 fill-gold-500" />
              <span className="text-2xl font-bold">
                {dashboard?.averageRating?.toFixed(1) ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dashboard?.totalReviews ?? reviews.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">
              {dashboard?.needsResponse ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Positive %</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">
              {dashboard?.positivePercent ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="trackers">Trackers</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select
              value={filter.sentiment ?? "__all__"}
              onValueChange={(v) => setFilter({ ...filter, sentiment: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="POSITIVE">Positive</SelectItem>
                <SelectItem value="NEUTRAL">Neutral</SelectItem>
                <SelectItem value="NEGATIVE">Negative</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.needsResponse ?? "__all__"}
              onValueChange={(v) => setFilter({ ...filter, needsResponse: v === "__all__" ? "" : v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Response status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="true">Needs Response</SelectItem>
                <SelectItem value="false">Responded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No reviews found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((review: any) => {
                const sentiment =
                  SENTIMENT_ICONS[review.sentiment] ?? SENTIMENT_ICONS.NEUTRAL;
                const SentimentIcon = sentiment.icon;
                return (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <SentimentIcon
                              className={`h-4 w-4 ${sentiment.color}`}
                            />
                            <span className="font-semibold text-sm">
                              {review.reviewerName ?? "Anonymous"}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < (review.rating ?? 0) ? "text-gold-500 fill-gold-500" : "text-muted-foreground"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {review.platform ?? ""}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{review.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                review.reviewDate ?? review.createdAt,
                              ).toLocaleDateString()}
                            </span>
                            {review.tracker && (
                              <Badge variant="outline" className="text-[10px]">
                                {review.tracker.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge
                            variant={review.responded ? "success" : "warning"}
                          >
                            {review.responded ? "Responded" : "Pending"}
                          </Badge>
                          {!review.responded && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRespond(review.id)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Reply
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trackers" className="space-y-4">
          {trackers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No review trackers configured
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trackers.map((tracker: any) => (
                <Card key={tracker.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{tracker.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tracker.platform} — {tracker.url ?? ""}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge
                        variant={
                          tracker.isActive !== false ? "success" : "secondary"
                        }
                      >
                        {tracker.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {tracker._count?.reviews ?? 0} reviews
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
