"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Store,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Shop {
  id: string;
  shopName: string;
  city: string;
  isVerified: boolean;
  contactPhone?: string;
}

interface Offer {
  id: string;
  offerType: string;
  status: string;
  totalPriceNpr: number;
  metalCostNpr: number;
  makingChargeNpr: number;
  finishCostNpr: number;
  gemstoneCostNpr: number;
  taxNpr: number;
  estimatedDays: number;
  bookingFeeNpr: number;
  bookingFeePercent: number;
  shopNotes: string | null;
  declineReason: string | null;
  parentOfferId: string | null;
  createdAt: string;
  shop: Shop;
  counterOffers?: Offer[];
}

interface RFQDetail {
  id: string;
  jewelleryType: string;
  buildMethod: string;
  composition: any;
  targetTotalWeightG: number | null;
  budgetMinNpr: number | null;
  budgetMaxNpr: number | null;
  preferredDeliveryDays: number | null;
  specialInstructions: string | null;
  referenceImages: string[];
  status: string;
  createdAt: string;
  offers: Offer[];
  selectedOfferId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  SENT_TO_SHOPS: { label: "Sent to Shops", color: "bg-blue-100 text-blue-700" },
  OFFERS_RECEIVED: {
    label: "Offers Received",
    color: "bg-green-100 text-green-700",
  },
  OFFER_SELECTED: {
    label: "Offer Selected",
    color: "bg-purple-100 text-purple-700",
  },
  BOOKING_PENDING: {
    label: "Booking Pending",
    color: "bg-yellow-100 text-yellow-700",
  },
  CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const OFFER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  ACCEPTED: {
    label: "Accepted",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  COUNTERED: {
    label: "Countered",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  SELECTED: {
    label: "Selected",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

export default function CustomerRFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState<RFQDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Counter-offer dialog
  const [counterDialog, setCounterDialog] = useState<{
    open: boolean;
    offer: Offer | null;
  }>({
    open: false,
    offer: null,
  });
  const [counterForm, setCounterForm] = useState({
    proposedPriceNpr: 0,
    message: "",
    preferredDeliveryDays: 0,
  });

  // Decline dialog
  const [declineDialog, setDeclineDialog] = useState<{
    open: boolean;
    offer: Offer | null;
  }>({
    open: false,
    offer: null,
  });
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (params.id) {
      loadRFQ();
    }
  }, [params.id]);

  const loadRFQ = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/rfq/${params.id}`);
      setRfq(response.data);
    } catch (error) {
      console.error("Failed to load RFQ:", error);
      toast({
        variant: "destructive",
        title: "Failed to load request",
        description: "Could not fetch request details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    setActionLoading(offerId);
    try {
      const response = await api.post(`/offers/${offerId}/accept`);
      toast({
        title: "Offer Accepted!",
        description: response.data.order
          ? `Order ${response.data.order.orderNumber} has been created.`
          : "The offer has been accepted.",
      });
      loadRFQ();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to accept offer",
        description: error.response?.data?.message || "Could not accept offer",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openCounterDialog = (offer: Offer) => {
    setCounterForm({
      proposedPriceNpr: Math.round(offer.totalPriceNpr * 0.9),
      message: "",
      preferredDeliveryDays: offer.estimatedDays,
    });
    setCounterDialog({ open: true, offer });
  };

  const submitCounterOffer = async () => {
    if (!counterDialog.offer) return;

    setActionLoading(counterDialog.offer.id);
    try {
      await api.post(
        `/offers/${counterDialog.offer.id}/customer-counter`,
        counterForm,
      );
      toast({
        title: "Counter-offer Sent",
        description: "The shop will review your counter-offer.",
      });
      setCounterDialog({ open: false, offer: null });
      loadRFQ();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send counter-offer",
        description:
          error.response?.data?.message || "Could not send counter-offer",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openDeclineDialog = (offer: Offer) => {
    setDeclineReason("");
    setDeclineDialog({ open: true, offer });
  };

  const submitDecline = async () => {
    if (!declineDialog.offer) return;

    setActionLoading(declineDialog.offer.id);
    try {
      await api.post(`/offers/${declineDialog.offer.id}/decline`, {
        reason: declineReason,
      });
      toast({
        title: "Offer Declined",
        description: "You have declined this offer.",
      });
      setDeclineDialog({ open: false, offer: null });
      loadRFQ();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to decline offer",
        description: error.response?.data?.message || "Could not decline offer",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const cancelRFQ = async () => {
    try {
      await api.patch(`/rfq/${params.id}`, { status: "CANCELLED" });
      toast({
        title: "Request Cancelled",
        description: "Your quote request has been cancelled",
      });
      router.push("/dashboard/customer/rfqs");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to cancel",
        description:
          error.response?.data?.message || "Could not cancel request",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getOfferStatusBadge = (status: string) => {
    const config = OFFER_STATUS_CONFIG[status] || {
      label: status,
      color: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActiveOffers = (offers: Offer[]): Offer[] => {
    if (!offers) return [];
    const activeOffers = offers.filter(
      (o) =>
        o.status === "PENDING" ||
        o.status === "ACCEPTED" ||
        o.status === "DECLINED",
    );
    return activeOffers.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  };

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  if (!rfq) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Request Not Found</h2>
            <Button asChild>
              <Link href="/dashboard/customer/rfqs">Back to Requests</Link>
            </Button>
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  const activeOffers = getActiveOffers(rfq.offers || []);
  const canAcceptOffers = ["SENT_TO_SHOPS", "OFFERS_RECEIVED"].includes(
    rfq.status,
  );

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/customer/rfqs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {rfq.jewelleryType.replace(/_/g, " ")} Request
                </h1>
                {getStatusBadge(rfq.status)}
              </div>
              <p className="text-muted-foreground">
                Created {new Date(rfq.createdAt).toLocaleDateString()}
              </p>
            </div>
            {canAcceptOffers && (
              <Button variant="outline" onClick={cancelRFQ}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Request
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request Details */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {rfq.jewelleryType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium">
                      {rfq.buildMethod.replace(/_/g, " ")}
                    </p>
                  </div>
                  {rfq.targetTotalWeightG && (
                    <div>
                      <p className="text-muted-foreground">Target Weight</p>
                      <p className="font-medium">{rfq.targetTotalWeightG}g</p>
                    </div>
                  )}
                  {rfq.preferredDeliveryDays && (
                    <div>
                      <p className="text-muted-foreground">Delivery</p>
                      <p className="font-medium">
                        {rfq.preferredDeliveryDays} days
                      </p>
                    </div>
                  )}
                  {(rfq.budgetMinNpr || rfq.budgetMaxNpr) && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-medium">
                        {rfq.budgetMinNpr && rfq.budgetMaxNpr
                          ? `${formatCurrency(rfq.budgetMinNpr)} - ${formatCurrency(rfq.budgetMaxNpr)}`
                          : rfq.budgetMaxNpr
                            ? `Up to ${formatCurrency(rfq.budgetMaxNpr)}`
                            : `From ${formatCurrency(rfq.budgetMinNpr!)}`}
                      </p>
                    </div>
                  )}
                </div>

                {rfq.specialInstructions && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Special Instructions
                      </p>
                      <p className="text-sm">{rfq.specialInstructions}</p>
                    </div>
                  </>
                )}

                {rfq.referenceImages && rfq.referenceImages.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Reference Images
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {rfq.referenceImages.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`Reference ${i + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Quotations ({activeOffers.length})
                </CardTitle>
                <CardDescription>
                  {canAcceptOffers
                    ? "Review quotations from shops. Accept, counter-offer, or decline."
                    : "View quotations received for this request."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeOffers.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Waiting for Quotations</h3>
                    <p className="text-muted-foreground text-sm">
                      Shops typically respond within 24-48 hours.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeOffers.map((offer) => (
                      <Card key={offer.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {offer.shop.shopName}
                                  </p>
                                  {offer.shop.isVerified && (
                                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {offer.shop.city}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {offer.offerType === "CUSTOMER_COUNTER" && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700"
                                >
                                  Your Counter
                                </Badge>
                              )}
                              {getOfferStatusBadge(offer.status)}
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Price
                              </p>
                              <p className="font-bold text-lg text-primary">
                                {formatCurrency(offer.totalPriceNpr)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Delivery
                              </p>
                              <p className="font-medium">
                                {offer.estimatedDays} days
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Booking Fee
                              </p>
                              <p className="font-medium">
                                {formatCurrency(offer.bookingFeeNpr)} (
                                {offer.bookingFeePercent}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Quoted
                              </p>
                              <p className="font-medium">
                                {new Date(offer.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <details className="mb-4">
                            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                              View price breakdown
                            </summary>
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Metal</p>
                                <p>{formatCurrency(offer.metalCostNpr)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Making</p>
                                <p>{formatCurrency(offer.makingChargeNpr)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Finish</p>
                                <p>{formatCurrency(offer.finishCostNpr)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Gemstones
                                </p>
                                <p>{formatCurrency(offer.gemstoneCostNpr)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tax</p>
                                <p>{formatCurrency(offer.taxNpr)}</p>
                              </div>
                            </div>
                          </details>

                          {offer.shopNotes && (
                            <div className="mb-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">
                                {offer.offerType === "CUSTOMER_COUNTER"
                                  ? "Your Message:"
                                  : "Shop Notes:"}
                              </p>
                              <p className="text-sm">{offer.shopNotes}</p>
                            </div>
                          )}

                          {offer.status === "DECLINED" &&
                            offer.declineReason && (
                              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  <strong>Decline Reason:</strong>{" "}
                                  {offer.declineReason}
                                </p>
                              </div>
                            )}

                          {canAcceptOffers &&
                            offer.status === "PENDING" &&
                            offer.offerType !== "CUSTOMER_COUNTER" && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  onClick={() => acceptOffer(offer.id)}
                                  disabled={actionLoading === offer.id}
                                  className="flex-1 sm:flex-none"
                                >
                                  {actionLoading === offer.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Accept Quotation
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => openCounterDialog(offer)}
                                  disabled={actionLoading === offer.id}
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  Counter-Offer
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => openDeclineDialog(offer)}
                                  disabled={actionLoading === offer.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Decline
                                </Button>
                              </div>
                            )}

                          {offer.offerType === "CUSTOMER_COUNTER" &&
                            offer.status === "PENDING" && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Waiting for shop to respond to your
                                counter-offer...
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Counter-Offer Dialog */}
        <Dialog
          open={counterDialog.open}
          onOpenChange={(open) =>
            setCounterDialog({ open, offer: counterDialog.offer })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make a Counter-Offer</DialogTitle>
              <DialogDescription>
                Propose a different price to{" "}
                {counterDialog.offer?.shop.shopName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Shop&apos;s Quote
                </p>
                <p className="text-lg font-bold">
                  {counterDialog.offer &&
                    formatCurrency(counterDialog.offer.totalPriceNpr)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedPrice">Your Proposed Price (NPR)</Label>
                <Input
                  id="proposedPrice"
                  type="number"
                  value={counterForm.proposedPriceNpr}
                  onChange={(e) =>
                    setCounterForm({
                      ...counterForm,
                      proposedPriceNpr: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDays">Preferred Delivery Days</Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  value={counterForm.preferredDeliveryDays}
                  onChange={(e) =>
                    setCounterForm({
                      ...counterForm,
                      preferredDeliveryDays: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message to Shop (Optional)</Label>
                <Textarea
                  id="message"
                  value={counterForm.message}
                  onChange={(e) =>
                    setCounterForm({ ...counterForm, message: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCounterDialog({ open: false, offer: null })}
              >
                Cancel
              </Button>
              <Button
                onClick={submitCounterOffer}
                disabled={
                  !counterForm.proposedPriceNpr ||
                  actionLoading === counterDialog.offer?.id
                }
              >
                {actionLoading === counterDialog.offer?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                )}
                Send Counter-Offer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Dialog */}
        <Dialog
          open={declineDialog.open}
          onOpenChange={(open) =>
            setDeclineDialog({ open, offer: declineDialog.offer })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Quotation</DialogTitle>
              <DialogDescription>
                Are you sure you want to decline this quotation from{" "}
                {declineDialog.offer?.shop.shopName}?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="declineReason">Reason (Optional)</Label>
                <Textarea
                  id="declineReason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeclineDialog({ open: false, offer: null })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitDecline}
                disabled={actionLoading === declineDialog.offer?.id}
              >
                {actionLoading === declineDialog.offer?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Decline Quotation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </CustomerGuard>
  );
}
