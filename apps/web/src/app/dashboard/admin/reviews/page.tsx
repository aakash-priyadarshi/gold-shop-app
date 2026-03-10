"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { sellerPerformanceApi } from "@/lib/api";
import {
  Bell,
  CheckCircle,
  ExternalLink,
  Eye,
  Loader2,
  Star,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ReviewSubmission {
  id: string;
  shopId: string;
  platform: string;
  reviewUrl: string | null;
  proofScreenshot: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  adminNotes: string | null;
  rewardGranted: boolean;
  rewardGrantedAt: string | null;
  shop: {
    id: string;
    shopName: string;
    userId: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

const PLATFORM_NAMES: Record<string, string> = {
  saashub: "SaaSHub",
  g2: "G2",
  crunchbase: "Crunchbase",
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [selectedReview, setSelectedReview] =
    useState<ReviewSubmission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await sellerPerformanceApi.getAdminReviews(
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setReviews(res?.data || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to load reviews" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      await sellerPerformanceApi.processReview(
        selectedReview.id,
        action,
        adminNotes || undefined,
      );
      toast({
        title:
          action === "approve"
            ? "Review approved — Pro month granted!"
            : "Review rejected",
      });
      setSelectedReview(null);
      setAdminNotes("");
      loadReviews();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await sellerPerformanceApi.sendReviewReminders();
      toast({
        title: `Reminders sent to ${res?.data?.sentCount || 0} sellers`,
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to send reminders" });
    } finally {
      setSendingReminders(false);
    }
  };

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Review & Earn — Admin
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Verify seller review submissions and award Pro months
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReminders}
                disabled={sendingReminders}
              >
                {sendingReminders ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Bell className="h-4 w-4 mr-1" />
                )}
                Send Reminders
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">
                    Pending {pendingCount > 0 && `(${pendingCount})`}
                  </SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {reviews.filter((r) => r.status === "PENDING").length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reviews.filter((r) => r.status === "APPROVED").length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {reviews.filter((r) => r.status === "REJECTED").length}
                </p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No review submissions found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Proof</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {review.shop.shopName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {review.shop.user.firstName}{" "}
                              {review.shop.user.lastName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PLATFORM_NAMES[review.platform] ||
                              review.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(review.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              review.status === "APPROVED"
                                ? "default"
                                : review.status === "PENDING"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={
                              review.status === "APPROVED"
                                ? "bg-green-600"
                                : ""
                            }
                          >
                            {review.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={review.proofScreenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View
                          </a>
                          {review.reviewUrl && (
                            <a
                              href={review.reviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1 ml-2"
                            >
                              <ExternalLink className="h-3 w-3" /> Review
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          {review.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReview(review);
                                setAdminNotes("");
                              }}
                            >
                              Review
                            </Button>
                          )}
                          {review.status !== "PENDING" &&
                            review.adminNotes && (
                              <span className="text-xs text-muted-foreground">
                                {review.adminNotes}
                              </span>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Review Dialog */}
        <Dialog
          open={!!selectedReview}
          onOpenChange={(open) => !open && setSelectedReview(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Review Submission —{" "}
                {selectedReview &&
                  (PLATFORM_NAMES[selectedReview.platform] ||
                    selectedReview.platform)}
              </DialogTitle>
              <DialogDescription>
                {selectedReview?.shop.shopName} ({selectedReview?.shop.user.email})
              </DialogDescription>
            </DialogHeader>

            {selectedReview && (
              <div className="space-y-4">
                {/* Proof screenshot */}
                <div>
                  <Label className="text-sm font-medium">
                    Proof Screenshot
                  </Label>
                  <div className="mt-1 border rounded-lg overflow-hidden">
                    <a
                      href={selectedReview.proofScreenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={selectedReview.proofScreenshot}
                        alt="Review proof"
                        className="w-full max-h-64 object-contain bg-gray-50"
                      />
                    </a>
                  </div>
                </div>

                {/* Review URL */}
                {selectedReview.reviewUrl && (
                  <div>
                    <Label className="text-sm font-medium">Review Link</Label>
                    <a
                      href={selectedReview.reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      {selectedReview.reviewUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Add notes (shown to seller if rejected)..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleAction("reject")}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Approve & Grant Pro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AdminGuard>
  );
}
