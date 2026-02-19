"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { rfqApi } from "@/lib/api";
import {
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileQuestion,
  Loader2,
  MessageSquare,
  Scale,
  UserPlus,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type SourceFilter = "ALL" | "ONLINE" | "WALK_IN";

interface Rfq {
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
  targetTotalWeightG?: number;
  targetGoldWeightG?: number;
  budgetMinNpr?: number;
  budgetMaxNpr?: number;
  surfaceFinish?: string;
  specialInstructions?: string;
  status: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  offers?: Array<{
    id: string;
    status: string;
  }>;
  targetedShops?: Array<{
    viewedAt?: string;
    respondedAt?: string;
  }>;
  source?: string;
  walkInMeta?: {
    customerName?: string;
    catalogueSlug?: string;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  PENDING: "bg-amber-100 text-amber-700 dark:text-amber-300",
  BROADCAST: "bg-blue-100 text-blue-700 dark:text-blue-300",
  SENT_TO_SHOPS: "bg-blue-100 text-blue-700 dark:text-blue-300",
  OFFERS_RECEIVED: "bg-purple-100 text-purple-700 dark:text-purple-300",
  NEGOTIATING: "bg-orange-100 text-orange-700 dark:text-orange-300",
  ACCEPTED: "bg-green-100 text-green-700 dark:text-green-300",
  COMPLETED: "bg-green-100 text-green-700 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:text-red-300",
  EXPIRED: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
};

export default function ShopRfqsPage() {
  const { user } = useAuth();
  const { symbol: currencySymbol, format: formatShopCurrency } =
    useShopCurrency();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  useEffect(() => {
    if (user?.shop?.id) {
      loadRfqs();
    }
  }, [user?.shop?.id, sourceFilter]);

  const loadRfqs = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (sourceFilter !== "ALL") params.source = sourceFilter;
      const response = await rfqApi.getShopRequests(params);
      let rfqsArr = response.data?.rfqs || response.data || [];
      if (!Array.isArray(rfqsArr)) {
        rfqsArr = [];
      }
      setRfqs(rfqsArr);
    } catch (error) {
      console.error("Failed to load RFQs:", error);
      toast({
        variant: "destructive",
        title: "Failed to load RFQs",
        description: "Could not fetch RFQ data",
      });
      setRfqs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
      case "BROADCAST":
      case "SENT_TO_SHOPS":
        return <Clock className="h-3 w-3" />;
      case "OFFERS_RECEIVED":
      case "NEGOTIATING":
        return <MessageSquare className="h-3 w-3" />;
      case "ACCEPTED":
      case "COMPLETED":
        return <CheckCircle className="h-3 w-3" />;
      case "CANCELLED":
      case "EXPIRED":
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const pendingCount = rfqs.filter((r) =>
    ["PENDING", "BROADCAST", "SENT_TO_SHOPS"].includes(r.status),
  ).length;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">RFQ Requests</h1>
              <p className="text-muted-foreground">
                Incoming quote requests from online and walk-in customers
              </p>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-amber-700 dark:text-amber-300 bg-amber-100"
                >
                  {pendingCount} Pending
                </Badge>
              )}
              <Link href="/dashboard/shop/quotes">
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Walk-in Quotes
                </Button>
              </Link>
            </div>
          </div>

          {/* Source filter pills */}
          <div className="flex gap-2">
            {(["ALL", "ONLINE", "WALK_IN"] as SourceFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  sourceFilter === f
                    ? "bg-gold-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f === "ALL" ? "All" : f === "ONLINE" ? "Online" : "Walk-in"}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : rfqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No RFQ requests yet</p>
                  <p className="text-sm">
                    Quote requests will appear here when customers send them
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfqs.map((rfq) => (
                      <TableRow key={rfq.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {rfq.jewelleryType?.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rfq.buildMethod?.replace(/_/g, " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {rfq.source === "WALK_IN" &&
                              rfq.walkInMeta?.customerName
                                ? rfq.walkInMeta.customerName
                                : `${rfq.customer?.firstName || ""} ${rfq.customer?.lastName || ""}`}
                            </p>
                            {rfq.source === "WALK_IN" &&
                              !rfq.walkInMeta?.customerName && (
                                <p className="text-[10px] text-muted-foreground">
                                  Walk-in (anonymous)
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {rfq.composition?.baseAlloy && (
                              <p>
                                {rfq.composition.baseAlloy.metal}{" "}
                                {rfq.composition.baseAlloy.purity}
                              </p>
                            )}
                            {rfq.targetTotalWeightG && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Scale className="h-3 w-3" />
                                <span>{rfq.targetTotalWeightG}g</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rfq.budgetMaxNpr ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {rfq.budgetMinNpr
                                  ? `${currencySymbol} ${rfq.budgetMinNpr.toLocaleString()} - `
                                  : ""}
                                {currencySymbol}{" "}
                                {rfq.budgetMaxNpr.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              className={
                                statusColors[rfq.status] ||
                                "bg-gray-100 dark:bg-gray-800"
                              }
                            >
                              {getStatusIcon(rfq.status)}
                              <span className="ml-1">
                                {rfq.status?.replace(/_/g, " ")}
                              </span>
                            </Badge>
                            {rfq.source === "WALK_IN" && (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px]">
                                Walk-in
                              </Badge>
                            )}
                            {rfq.walkInMeta?.catalogueSlug && (
                              <span className="text-[10px] text-muted-foreground">
                                via {rfq.walkInMeta.catalogueSlug}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(rfq.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/shop/rfqs/${rfq.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              {[
                                "PENDING",
                                "BROADCAST",
                                "SENT_TO_SHOPS",
                              ].includes(rfq.status)
                                ? "Quote"
                                : "View"}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
