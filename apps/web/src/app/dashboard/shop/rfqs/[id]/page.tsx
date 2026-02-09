"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
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
import { useAuth } from "@/hooks/useAuth";
import { offersApi, rfqApi } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileQuestion,
  ImageIcon,
  Loader2,
  MessageSquare,
  Reply,
  Scale,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface RfqDetails {
  id: string;
  jewelleryType: string;
  buildMethod: string;
  composition: {
    baseAlloy?: {
      metal: string;
      purity: string;
    };
    outerLayer?: {
      metal: string;
      purity: string;
    };
    [key: string]: any;
  };
  surfaceFinish?: string;
  targetTotalWeightG?: number;
  targetGoldWeightG?: number;
  budgetMinNpr?: number;
  budgetMaxNpr?: number;
  preferredDeliveryDays?: number;
  specialInstructions?: string;
  referenceImages?: string[];
  status: string;
  createdAt: string;
  expiresAt?: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  gemstones?: Array<{
    id: string;
    stoneType: string;
    shape: string;
    sizeMm?: number;
    caratWeight?: number;
    color?: string;
    clarity?: string;
    count: number;
  }>;
  offers: Array<{
    id: string;
    shopId: string;
    offerType: string;
    status: string;
    totalPriceNpr?: number;
    metalCostNpr?: number;
    makingChargeNpr?: number;
    finishCostNpr?: number;
    gemstoneCostNpr?: number;
    estimatedDays?: number;
    shopNotes?: string;
    counterMessage?: string;
    preferredDeliveryDays?: number;
    createdAt: string;
    parentOfferId?: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-amber-100 text-amber-700",
  BROADCAST: "bg-blue-100 text-blue-700",
  SENT_TO_SHOPS: "bg-blue-100 text-blue-700",
  OFFERS_RECEIVED: "bg-purple-100 text-purple-700",
  NEGOTIATING: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-700",
};

export default function ShopRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RfqDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerType, setOfferType] = useState<"ACCEPT" | "COUNTER" | "DECLINE">(
    "ACCEPT",
  );

  // Offer form state
  const [metalCost, setMetalCost] = useState("");
  const [makingCharge, setMakingCharge] = useState("");
  const [finishCost, setFinishCost] = useState("");
  const [gemstoneCost, setGemstoneCost] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [shopNotes, setShopNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  // Dialog states for customer counter-offer responses
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [counterDialogOpen, setCounterDialogOpen] = useState(false);
  const [selectedCounterOffer, setSelectedCounterOffer] = useState<
    string | null
  >(null);
  const [counterDeclineReason, setCounterDeclineReason] = useState("");
  const [counterResponseNote, setCounterResponseNote] = useState("");

  // Counter-counter-offer form state
  const [counterMetalCost, setCounterMetalCost] = useState("");
  const [counterMakingCharge, setCounterMakingCharge] = useState("");
  const [counterFinishCost, setCounterFinishCost] = useState("");
  const [counterGemstoneCost, setCounterGemstoneCost] = useState("");
  const [counterEstimatedDays, setCounterEstimatedDays] = useState("");
  const [counterShopNotes, setCounterShopNotes] = useState("");

  useEffect(() => {
    if (rfqId) {
      loadRfq();
    }
  }, [rfqId]);

  const loadRfq = async () => {
    setIsLoading(true);
    try {
      const response = await rfqApi.getById(rfqId);
      setRfq(response.data);
    } catch (error) {
      console.error("Failed to load RFQ:", error);
      toast({
        variant: "destructive",
        title: "Failed to load RFQ",
        description: "Could not fetch RFQ details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitOffer = async () => {
    if (offerType === "DECLINE" && !declineReason) {
      toast({
        variant: "destructive",
        title: "Missing Reason",
        description: "Please provide a reason for declining",
      });
      return;
    }

    if (
      offerType !== "DECLINE" &&
      (!metalCost || !makingCharge || !estimatedDays)
    ) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description:
          "Please fill in metal cost, making charge, and estimated days",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await offersApi.create({
        rfqId,
        offerType,
        ...(offerType === "DECLINE"
          ? { declineReason }
          : {
              metalCostNpr: parseFloat(metalCost),
              makingChargeNpr: parseFloat(makingCharge),
              finishCostNpr: finishCost ? parseFloat(finishCost) : undefined,
              gemstoneCostNpr: gemstoneCost
                ? parseFloat(gemstoneCost)
                : undefined,
              estimatedDays: parseInt(estimatedDays),
              shopNotes: shopNotes || undefined,
            }),
      });
      toast({
        title: offerType === "DECLINE" ? "Request Declined" : "Offer Submitted",
        description:
          offerType === "DECLINE"
            ? "You have declined this request"
            : "Your quote has been sent to the customer",
      });
      loadRfq();
      // Reset form
      setMetalCost("");
      setMakingCharge("");
      setFinishCost("");
      setGemstoneCost("");
      setEstimatedDays("");
      setShopNotes("");
      setDeclineReason("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.response?.data?.message || "Could not submit offer",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle accepting a customer counter-offer
  const handleAcceptCounterOffer = async () => {
    if (!selectedCounterOffer) return;

    setIsSubmitting(true);
    try {
      await offersApi.accept(selectedCounterOffer);
      toast({
        title: "Counter-Offer Accepted",
        description:
          "You have accepted the customer's counter-offer. An order has been created.",
      });
      loadRfq();
      setAcceptDialogOpen(false);
      setSelectedCounterOffer(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Accept",
        description:
          error.response?.data?.message || "Could not accept counter-offer",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle declining a customer counter-offer
  const handleDeclineCounterOffer = async () => {
    if (!selectedCounterOffer) return;

    setIsSubmitting(true);
    try {
      await offersApi.decline(selectedCounterOffer, counterDeclineReason);
      toast({
        title: "Counter-Offer Declined",
        description: "You have declined the customer's counter-offer.",
      });
      loadRfq();
      setDeclineDialogOpen(false);
      setSelectedCounterOffer(null);
      setCounterDeclineReason("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Decline",
        description:
          error.response?.data?.message || "Could not decline counter-offer",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle counter-counter-offer (shop's response to customer counter)
  const handleCounterCounterOffer = async () => {
    if (!selectedCounterOffer) return;

    if (!counterMetalCost || !counterMakingCharge || !counterEstimatedDays) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description:
          "Please fill in metal cost, making charge, and estimated days",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await offersApi.counter(selectedCounterOffer, {
        metalCostNpr: parseFloat(counterMetalCost),
        makingChargeNpr: parseFloat(counterMakingCharge),
        finishCostNpr: counterFinishCost
          ? parseFloat(counterFinishCost)
          : undefined,
        gemstoneCostNpr: counterGemstoneCost
          ? parseFloat(counterGemstoneCost)
          : undefined,
        estimatedDays: parseInt(counterEstimatedDays),
        shopNotes: counterShopNotes || undefined,
      });
      toast({
        title: "Counter-Offer Sent",
        description: "Your revised quote has been sent to the customer.",
      });
      loadRfq();
      setCounterDialogOpen(false);
      setSelectedCounterOffer(null);
      // Reset counter form
      setCounterMetalCost("");
      setCounterMakingCharge("");
      setCounterFinishCost("");
      setCounterGemstoneCost("");
      setCounterEstimatedDays("");
      setCounterShopNotes("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Submit Counter",
        description:
          error.response?.data?.message || "Could not submit counter-offer",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open dialog handlers
  const openAcceptDialog = (offerId: string) => {
    setSelectedCounterOffer(offerId);
    setAcceptDialogOpen(true);
  };

  const openDeclineDialog = (offerId: string) => {
    setSelectedCounterOffer(offerId);
    setDeclineDialogOpen(true);
  };

  const openCounterDialog = (
    offerId: string,
    offer: RfqDetails["offers"][0],
  ) => {
    setSelectedCounterOffer(offerId);
    // Pre-fill with customer's proposed values
    if (offer.totalPriceNpr) {
      // Try to distribute the total across costs
      setCounterMetalCost(String(Math.round(offer.totalPriceNpr * 0.85)));
      setCounterMakingCharge(String(Math.round(offer.totalPriceNpr * 0.15)));
    }
    if (offer.preferredDeliveryDays) {
      setCounterEstimatedDays(String(offer.preferredDeliveryDays));
    }
    setCounterDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Check if shop has already submitted an offer
  const myOffer = rfq?.offers?.find(
    (o) => o.shopId === user?.shop?.id && o.offerType !== "CUSTOMER_COUNTER",
  );
  const canSubmitOffer =
    ["PENDING", "BROADCAST", "SENT_TO_SHOPS", "OFFERS_RECEIVED"].includes(
      rfq?.status || "",
    ) && !myOffer;

  // Find customer counter-offers to my shop's offers
  const customerCounterOffers =
    rfq?.offers?.filter(
      (o) =>
        o.offerType === "CUSTOMER_COUNTER" &&
        o.parentOfferId &&
        rfq.offers.some(
          (parent) =>
            parent.id === o.parentOfferId && parent.shopId === user?.shop?.id,
        ),
    ) || [];

  // Get the negotiation chain (my offers and customer counter-offers)
  const getNegotiationChain = () => {
    if (!rfq?.offers || !user?.shop?.id) return [];

    const chain: typeof rfq.offers = [];
    const myOffers = rfq.offers.filter(
      (o) => o.shopId === user?.shop?.id || o.offerType === "CUSTOMER_COUNTER",
    );

    // Sort by creation date
    myOffers.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const offer of myOffers) {
      if (offer.shopId === user?.shop?.id) {
        chain.push(offer);
      } else if (
        offer.offerType === "CUSTOMER_COUNTER" &&
        offer.parentOfferId
      ) {
        // Check if this counter is to one of my offers
        const parent = rfq.offers.find((o) => o.id === offer.parentOfferId);
        if (parent?.shopId === user?.shop?.id) {
          chain.push(offer);
        }
      }
    }

    return chain;
  };

  const negotiationChain = getNegotiationChain();

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

  if (!rfq) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">RFQ Not Found</h2>
            <p className="text-muted-foreground">
              The request you're looking for doesn't exist.
            </p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">RFQ Details</h1>
                <p className="text-muted-foreground">
                  Request #{rfq.id.slice(0, 8)}
                </p>
              </div>
            </div>
            <Badge className={statusColors[rfq.status] || "bg-gray-100"}>
              {rfq.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">
                        Jewellery Type
                      </Label>
                      <p className="font-medium">
                        {rfq.jewelleryType?.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Build Method
                      </Label>
                      <p className="font-medium">
                        {rfq.buildMethod?.replace(/_/g, " ")}
                      </p>
                    </div>
                    {rfq.composition?.baseAlloy && (
                      <div>
                        <Label className="text-muted-foreground">
                          Base Metal
                        </Label>
                        <p className="font-medium">
                          {rfq.composition.baseAlloy.metal}{" "}
                          {rfq.composition.baseAlloy.purity}
                        </p>
                      </div>
                    )}
                    {rfq.composition?.outerLayer && (
                      <div>
                        <Label className="text-muted-foreground">
                          Outer Layer
                        </Label>
                        <p className="font-medium">
                          {rfq.composition.outerLayer.metal}{" "}
                          {rfq.composition.outerLayer.purity}
                        </p>
                      </div>
                    )}
                    {rfq.targetTotalWeightG && (
                      <div>
                        <Label className="text-muted-foreground">
                          Target Weight
                        </Label>
                        <div className="flex items-center gap-1">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {rfq.targetTotalWeightG}g
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">
                        Budget Range
                      </Label>
                      {rfq.budgetMaxNpr ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {rfq.budgetMinNpr
                              ? `Rs. ${rfq.budgetMinNpr.toLocaleString()} - `
                              : ""}
                            Rs. {rfq.budgetMaxNpr.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Not specified</p>
                      )}
                    </div>
                    {rfq.surfaceFinish && (
                      <div>
                        <Label className="text-muted-foreground">
                          Surface Finish
                        </Label>
                        <p className="font-medium">{rfq.surfaceFinish}</p>
                      </div>
                    )}
                    {rfq.preferredDeliveryDays && (
                      <div>
                        <Label className="text-muted-foreground">
                          Preferred Delivery
                        </Label>
                        <p className="font-medium">
                          {rfq.preferredDeliveryDays} days
                        </p>
                      </div>
                    )}
                  </div>

                  {rfq.specialInstructions && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">
                          Special Instructions
                        </Label>
                        <p className="mt-1">{rfq.specialInstructions}</p>
                      </div>
                    </>
                  )}

                  {rfq.gemstones && rfq.gemstones.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Gemstones
                        </Label>
                        <div className="mt-2 space-y-2">
                          {rfq.gemstones.map((gem, idx) => (
                            <div
                              key={gem.id || idx}
                              className="flex justify-between text-sm bg-gray-50 p-2 rounded"
                            >
                              <span>
                                {gem.stoneType} ({gem.shape})
                              </span>
                              <span className="text-muted-foreground">
                                {gem.count}x{" "}
                                {gem.caratWeight && `${gem.caratWeight}ct`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Reference Images / AI Design Preview */}
                  {rfq.referenceImages && rfq.referenceImages.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Reference Images
                        </Label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {rfq.referenceImages.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-square rounded-lg overflow-hidden border bg-gray-50"
                            >
                              <img
                                src={url}
                                alt={`Reference ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {idx === 0 && (
                                <div className="absolute top-1 right-1">
                                  <Badge className="bg-amber-500 text-white text-xs">
                                    <Sparkles className="h-2 w-2 mr-1" />
                                    AI Design
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Customer-provided reference images for the desired
                          design.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Submit Offer Form */}
              {canSubmitOffer && (
                <Card>
                  <CardHeader>
                    <CardTitle>Respond to Request</CardTitle>
                    <CardDescription>
                      Accept, counter-offer, or decline this request
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Response Type Selection */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={offerType === "ACCEPT" ? "default" : "outline"}
                        onClick={() => setOfferType("ACCEPT")}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant={
                          offerType === "COUNTER" ? "default" : "outline"
                        }
                        onClick={() => setOfferType("COUNTER")}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Counter
                      </Button>
                      <Button
                        type="button"
                        variant={
                          offerType === "DECLINE" ? "destructive" : "outline"
                        }
                        onClick={() => setOfferType("DECLINE")}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>

                    {offerType === "DECLINE" ? (
                      <div className="space-y-2">
                        <Label htmlFor="declineReason">
                          Reason for Declining
                        </Label>
                        <Textarea
                          id="declineReason"
                          placeholder="Please provide a reason..."
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="metalCost">
                              Metal Cost (NPR) *
                            </Label>
                            <Input
                              id="metalCost"
                              type="number"
                              placeholder="e.g., 50000"
                              value={metalCost}
                              onChange={(e) => setMetalCost(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="makingCharge">
                              Making Charge (NPR) *
                            </Label>
                            <Input
                              id="makingCharge"
                              type="number"
                              placeholder="e.g., 5000"
                              value={makingCharge}
                              onChange={(e) => setMakingCharge(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="finishCost">
                              Finish Cost (NPR)
                            </Label>
                            <Input
                              id="finishCost"
                              type="number"
                              placeholder="e.g., 1000"
                              value={finishCost}
                              onChange={(e) => setFinishCost(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gemstoneCost">
                              Gemstone Cost (NPR)
                            </Label>
                            <Input
                              id="gemstoneCost"
                              type="number"
                              placeholder="e.g., 10000"
                              value={gemstoneCost}
                              onChange={(e) => setGemstoneCost(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estimatedDays">
                            Estimated Delivery (days) *
                          </Label>
                          <Input
                            id="estimatedDays"
                            type="number"
                            placeholder="e.g., 14"
                            value={estimatedDays}
                            onChange={(e) => setEstimatedDays(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shopNotes">Notes (optional)</Label>
                          <Textarea
                            id="shopNotes"
                            placeholder="Add any additional details..."
                            value={shopNotes}
                            onChange={(e) => setShopNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                        {/* Total Preview */}
                        {(metalCost ||
                          makingCharge ||
                          finishCost ||
                          gemstoneCost) && (
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              Estimated Total
                            </p>
                            <p className="text-lg font-bold">
                              Rs.{" "}
                              {(
                                (parseFloat(metalCost) || 0) +
                                (parseFloat(makingCharge) || 0) +
                                (parseFloat(finishCost) || 0) +
                                (parseFloat(gemstoneCost) || 0)
                              ).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <Button
                      onClick={submitOffer}
                      disabled={isSubmitting}
                      className="w-full"
                      variant={
                        offerType === "DECLINE" ? "destructive" : "default"
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : offerType === "DECLINE" ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline Request
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit{" "}
                          {offerType === "COUNTER" ? "Counter-Offer" : "Quote"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* My Offer (if submitted) */}
              {myOffer && (
                <Card
                  className={
                    myOffer.offerType === "DECLINE"
                      ? "border-red-200 bg-red-50"
                      : "border-green-200 bg-green-50"
                  }
                >
                  <CardHeader>
                    <CardTitle
                      className={`flex items-center gap-2 ${myOffer.offerType === "DECLINE" ? "text-red-800" : "text-green-800"}`}
                    >
                      {myOffer.offerType === "DECLINE" ? (
                        <>
                          <XCircle className="h-5 w-5" />
                          You Declined This Request
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Your Submitted Quote
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myOffer.offerType !== "DECLINE" ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-muted-foreground">
                              Metal Cost
                            </Label>
                            <p className="font-medium">
                              Rs. {myOffer.metalCostNpr?.toLocaleString() || 0}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">
                              Making Charge
                            </Label>
                            <p className="font-medium">
                              Rs.{" "}
                              {myOffer.makingChargeNpr?.toLocaleString() || 0}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">
                              Total
                            </Label>
                            <p className="font-medium text-lg">
                              Rs. {myOffer.totalPriceNpr?.toLocaleString() || 0}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">
                              Delivery
                            </Label>
                            <p className="font-medium">
                              {myOffer.estimatedDays} days
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Label className="text-muted-foreground">
                            Status:
                          </Label>
                          <Badge variant="outline">{myOffer.status}</Badge>
                        </div>
                        {myOffer.shopNotes && (
                          <div className="mt-4">
                            <Label className="text-muted-foreground">
                              Your Notes
                            </Label>
                            <p className="text-sm mt-1">{myOffer.shopNotes}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        You have declined this request.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Customer Counter-Offers Section */}
              {customerCounterOffers.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <Reply className="h-5 w-5" />
                      Customer Counter-Offers ({customerCounterOffers.length})
                    </CardTitle>
                    <CardDescription>
                      The customer has sent counter-offers requiring your
                      response
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customerCounterOffers.map((counter, idx) => (
                      <div
                        key={counter.id}
                        className="bg-white rounded-lg p-4 border border-amber-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-700">
                              Counter #{idx + 1}
                            </Badge>
                            <Badge variant="outline">{counter.status}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(counter.createdAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="text-muted-foreground text-xs">
                              Proposed Price
                            </Label>
                            <p className="font-bold text-lg text-amber-700">
                              Rs. {counter.totalPriceNpr?.toLocaleString() || 0}
                            </p>
                          </div>
                          {counter.preferredDeliveryDays && (
                            <div>
                              <Label className="text-muted-foreground text-xs">
                                Preferred Delivery
                              </Label>
                              <p className="font-medium">
                                {counter.preferredDeliveryDays} days
                              </p>
                            </div>
                          )}
                        </div>

                        {counter.counterMessage && (
                          <div className="mb-4 p-3 bg-gray-50 rounded">
                            <Label className="text-muted-foreground text-xs">
                              Customer Message
                            </Label>
                            <p className="text-sm mt-1">
                              {counter.counterMessage}
                            </p>
                          </div>
                        )}

                        {counter.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => openAcceptDialog(counter.id)}
                            >
                              <ThumbsUp className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() =>
                                openCounterDialog(counter.id, counter)
                              }
                            >
                              <Reply className="h-4 w-4 mr-2" />
                              Counter
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => openDeclineDialog(counter.id)}
                            >
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {counter.status === "ACCEPTED" && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            You accepted this offer
                          </Badge>
                        )}

                        {counter.status === "DECLINED" && (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            You declined this offer
                          </Badge>
                        )}

                        {counter.status === "COUNTERED" && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            You sent a counter-offer
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Full Negotiation History */}
              {negotiationChain.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Negotiation History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {negotiationChain.map((offer, idx) => (
                        <div
                          key={offer.id}
                          className={`p-3 rounded-lg border ${
                            offer.offerType === "CUSTOMER_COUNTER"
                              ? "bg-amber-50 border-amber-200"
                              : "bg-green-50 border-green-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  offer.offerType === "CUSTOMER_COUNTER"
                                    ? "border-amber-300"
                                    : "border-green-300"
                                }
                              >
                                {offer.offerType === "CUSTOMER_COUNTER"
                                  ? "Customer"
                                  : "Your Offer"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                #{idx + 1}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {offer.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">
                              Rs. {offer.totalPriceNpr?.toLocaleString() || 0}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(offer.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {rfq.customer?.firstName} {rfq.customer?.lastName}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(rfq.createdAt)}</span>
                  </div>
                  {rfq.expiresAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires:</span>
                      <span>{formatDate(rfq.expiresAt)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Other Offers Count */}
              <Card>
                <CardHeader>
                  <CardTitle>Competition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {rfq.offers?.length || 0}
                    </span>
                    <span className="text-muted-foreground">total offers</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Accept Counter-Offer Dialog */}
        <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                Accept Customer Counter-Offer
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to accept this counter-offer? This will
                create an order and the customer will be notified to proceed
                with payment.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  By accepting, you agree to fulfill this order at the
                  customer's proposed price.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAcceptDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleAcceptCounterOffer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Offer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Counter-Offer Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-red-600" />
                Decline Customer Counter-Offer
              </DialogTitle>
              <DialogDescription>
                Provide a reason for declining this counter-offer (optional but
                recommended).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="counterDeclineReason">Reason (optional)</Label>
                <Textarea
                  id="counterDeclineReason"
                  placeholder="e.g., The proposed price is below our production cost..."
                  value={counterDeclineReason}
                  onChange={(e) => setCounterDeclineReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeclineDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeclineCounterOffer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline Offer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Counter Counter-Offer Dialog */}
        <Dialog open={counterDialogOpen} onOpenChange={setCounterDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Reply className="h-5 w-5 text-blue-600" />
                Send Counter-Offer
              </DialogTitle>
              <DialogDescription>
                Propose a revised quote in response to the customer's
                counter-offer.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="counterMetalCost">Metal Cost (NPR) *</Label>
                  <Input
                    id="counterMetalCost"
                    type="number"
                    placeholder="e.g., 45000"
                    value={counterMetalCost}
                    onChange={(e) => setCounterMetalCost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counterMakingCharge">
                    Making Charge (NPR) *
                  </Label>
                  <Input
                    id="counterMakingCharge"
                    type="number"
                    placeholder="e.g., 5000"
                    value={counterMakingCharge}
                    onChange={(e) => setCounterMakingCharge(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="counterFinishCost">Finish Cost (NPR)</Label>
                  <Input
                    id="counterFinishCost"
                    type="number"
                    placeholder="e.g., 1000"
                    value={counterFinishCost}
                    onChange={(e) => setCounterFinishCost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counterGemstoneCost">
                    Gemstone Cost (NPR)
                  </Label>
                  <Input
                    id="counterGemstoneCost"
                    type="number"
                    placeholder="e.g., 10000"
                    value={counterGemstoneCost}
                    onChange={(e) => setCounterGemstoneCost(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterEstimatedDays">
                  Estimated Delivery (days) *
                </Label>
                <Input
                  id="counterEstimatedDays"
                  type="number"
                  placeholder="e.g., 14"
                  value={counterEstimatedDays}
                  onChange={(e) => setCounterEstimatedDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterShopNotes">Notes (optional)</Label>
                <Textarea
                  id="counterShopNotes"
                  placeholder="Explain your revised quote..."
                  value={counterShopNotes}
                  onChange={(e) => setCounterShopNotes(e.target.value)}
                  rows={2}
                />
              </div>
              {/* Total Preview */}
              {(counterMetalCost ||
                counterMakingCharge ||
                counterFinishCost ||
                counterGemstoneCost) && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Estimated Total
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    Rs.{" "}
                    {(
                      (parseFloat(counterMetalCost) || 0) +
                      (parseFloat(counterMakingCharge) || 0) +
                      (parseFloat(counterFinishCost) || 0) +
                      (parseFloat(counterGemstoneCost) || 0)
                    ).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCounterDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCounterCounterOffer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Counter-Offer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ShopGuard>
  );
}
