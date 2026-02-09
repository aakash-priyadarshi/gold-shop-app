"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ShopCommissionStatus } from "@/components/shop/ShopCommissionStatus";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import api from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// Commission status styles
const statusStyles: Record<
  string,
  { color: string; icon: any; label: string }
> = {
  PENDING: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    label: "Pending",
  },
  OVERDUE: {
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
    label: "Overdue",
  },
  PAID: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Paid",
  },
  WAIVED: {
    color: "bg-gray-100 text-gray-800",
    icon: DollarSign,
    label: "Waived",
  },
};

interface CommissionLedger {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "OVERDUE" | "PAID" | "WAIVED";
  dueAt: string;
  paidAt?: string;
  createdAt: string;
  order?: {
    orderNumber: string;
    totalNpr: number;
  };
}

export default function ShopCommissionsPage() {
  const { user } = useAuth();
  const { currencyCode, locale, symbol } = useShopCurrency();
  const [commissions, setCommissions] = useState<CommissionLedger[]>([]);
  const [loading, setLoading] = useState(true);

  const shopId = user?.shop?.id;
  const isOnHold = user?.shop?.isOnHold;
  const holdReason = user?.shop?.holdReason;

  const fetchCommissions = useCallback(async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const response = await api.get(`/commission/shop/${shopId}/ledger`);
      setCommissions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch commissions:", error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const formatCurrency = (amount: number, cur: string = currencyCode) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Commission Ledger
            </h1>
            <p className="text-muted-foreground">
              Track your commission obligations for paid-at-shop orders
            </p>
          </div>

          {/* Shop Status Banner */}
          {shopId && (
            <ShopCommissionStatus
              shopId={shopId}
              isOnHold={isOnHold}
              holdReason={holdReason}
            />
          )}

          {/* Commissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>
                Your commission records for all paid-at-shop orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : commissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No commission records</h3>
                  <p className="text-sm text-muted-foreground">
                    Commission entries will appear when customers pay at your
                    shop
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Order Total</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => {
                      const style =
                        statusStyles[commission.status] || statusStyles.PENDING;
                      const StatusIcon = style.icon;
                      const isOverdue =
                        commission.status === "OVERDUE" ||
                        (commission.status === "PENDING" &&
                          new Date(commission.dueAt) < new Date());

                      return (
                        <TableRow
                          key={commission.id}
                          className={isOverdue ? "bg-red-50" : ""}
                        >
                          <TableCell>
                            <div className="font-medium">
                              {commission.order?.orderNumber ||
                                commission.orderId.slice(0, 8)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {commission.order
                              ? formatCurrency(commission.order.totalNpr)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(
                                commission.amount,
                                commission.currency,
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              1% commission
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={style.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span
                                className={
                                  isOverdue ? "text-red-600 font-medium" : ""
                                }
                              >
                                {format(
                                  new Date(commission.dueAt),
                                  "MMM dd, yyyy",
                                )}
                              </span>
                            </div>
                            <div
                              className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}
                            >
                              {formatDistanceToNow(new Date(commission.dueAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/shop/orders/${commission.orderId}`}
                            >
                              <Button variant="outline" size="sm">
                                View Order
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">1%</div>
                  <div className="text-sm text-muted-foreground">
                    Commission Rate
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">21</div>
                  <div className="text-sm text-muted-foreground">
                    Days to Settle
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <Ban className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Shop Hold if Overdue
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>How it works:</strong> When a customer pays at your
                  shop, a 1% commission is recorded. You have 21 days to settle
                  this commission with the platform.
                </p>
                <p>
                  <strong>Important:</strong> Failure to settle commissions
                  within 21 days will result in your shop being placed on hold.
                  While on hold, new orders cannot be placed at your shop.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
