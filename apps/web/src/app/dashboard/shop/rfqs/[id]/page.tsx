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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { offersApi, rfqApi } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileQuestion,
  ImageIcon,
  Loader2,
  MessageSquare,
  Scale,
  Send,
  Sparkles,
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
    estimatedDays?: number;
    shopNotes?: string;
    createdAt: string;
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
  const myOffer = rfq?.offers?.find((o) => o.shopId === user?.shop?.id);
  const canSubmitOffer =
    ["PENDING", "BROADCAST", "SENT_TO_SHOPS", "OFFERS_RECEIVED"].includes(
      rfq?.status || "",
    ) && !myOffer;

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
      </DashboardLayout>
    </ShopGuard>
  );
}
