"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ShopCommissionStatus } from "@/components/shop/ShopCommissionStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
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
import { useT } from "@/providers/translation-provider";
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
    color: "bg-yellow-100 text-yellow-800 dark:text-yellow-200",
    icon: Clock,
    label: "Pending",
  },
  OVERDUE: {
    color: "bg-red-100 text-red-800 dark:text-red-200",
    icon: AlertTriangle,
    label: "Overdue",
  },
  PAID: {
    color: "bg-green-100 text-green-800 dark:text-green-200",
    icon: CheckCircle,
    label: "Paid",
  },
  WAIVED: {
    color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
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
  const t = useT();
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
              <T>Commission Ledger</T>
            </h1>
            <p className="text-muted-foreground">
              <T>Track your commission obligations for paid-at-shop orders</T>
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
              <CardTitle><T>Commission History</T></CardTitle>
              <CardDescription>
                <T>Your commission records for all paid-at-shop orders</T>
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
                  <h3 className="text-lg font-medium"><T>No commission records</T></h3>
                  <p className="text-sm text-muted-foreground">
                    <T>Commission entries will appear when customers pay at your shop</T>
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><T>Order</T></TableHead>
                      <TableHead><T>Order Total</T></TableHead>
                      <TableHead><T>Commission</T></TableHead>
                      <TableHead><T>Status</T></TableHead>
                      <TableHead><T>Due Date</T></TableHead>
                      <TableHead className="text-right"><T>Action</T></TableHead>
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
                          className={
                            isOverdue ? "bg-red-50 dark:bg-red-950/30" : ""
                          }
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
              <CardTitle><T>Commission Policy</T></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">1%</div>
                  <div className="text-sm text-muted-foreground">
                    <T>Commission Rate</T>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">21</div>
                  <div className="text-sm text-muted-foreground">
                    <T>Days to Settle</T>
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <Ban className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <T>Shop Hold if Overdue</T>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong><T>How it works:</T></strong> <T>When a customer pays at your shop, a 1% commission is recorded. You have 21 days to settle this commission with the platform.</T>
                </p>
                <p>
                  <strong><T>Important:</T></strong> <T>Failure to settle commissions within 21 days will result in your shop being placed on hold. While on hold, new orders cannot be placed at your shop.</T>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
