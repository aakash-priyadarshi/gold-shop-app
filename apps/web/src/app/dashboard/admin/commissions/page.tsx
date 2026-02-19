"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
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
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Store,
  Unlock,
} from "lucide-react";
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
    icon: FileText,
    label: "Waived",
  },
};

interface CommissionLedger {
  id: string;
  orderId: string;
  shopId: string;
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
  shop?: {
    businessName: string;
    isOnHold: boolean;
    holdReason?: string;
  };
}

interface CommissionStats {
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  shopsOnHold: number;
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<CommissionLedger[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [selectedCommission, setSelectedCommission] =
    useState<CommissionLedger | null>(null);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [isReleaseHoldDialogOpen, setIsReleaseHoldDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await api.get(`/commission/admin/list?${params}`);
      setCommissions(response.data.commissions || []);
      setTotalPages(response.data.totalPages || 1);

      // Also fetch stats
      const statsResponse = await api.get("/commission/admin/stats");
      setStats(statsResponse.data);
    } catch (error) {
      console.error("Failed to fetch commissions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load commissions",
      });
      // Use mock data for development
      setCommissions([]);
      setStats({
        totalPending: 5,
        totalOverdue: 2,
        totalPaid: 15,
        pendingAmount: 5000,
        overdueAmount: 2500,
        paidAmount: 15000,
        shopsOnHold: 2,
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const handleMarkPaid = async () => {
    if (!selectedCommission) return;

    setActionLoading(true);
    try {
      await api.post(`/commission/admin/${selectedCommission.id}/mark-paid`);
      toast({
        title: "Success",
        description: "Commission marked as paid",
      });
      setIsMarkPaidDialogOpen(false);
      setSelectedCommission(null);
      fetchCommissions();
    } catch (error) {
      console.error("Failed to mark commission as paid:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark as paid",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!selectedCommission?.shopId) return;

    setActionLoading(true);
    try {
      await api.post(
        `/commission/admin/shop/${selectedCommission.shopId}/release-hold`,
      );
      toast({
        title: "Success",
        description: "Shop hold released",
      });
      setIsReleaseHoldDialogOpen(false);
      setSelectedCommission(null);
      fetchCommissions();
    } catch (error) {
      console.error("Failed to release shop hold:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to release hold",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "NPR") => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Commission Management
              </h1>
              <p className="text-muted-foreground">
                Track and manage shopkeeper commission settlements
              </p>
            </div>
            <Button onClick={fetchCommissions} variant="outline" size="sm">
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Commissions
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalPending || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.pendingAmount || 0)} due
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.totalOverdue || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.overdueAmount || 0)} overdue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Paid This Month
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.totalPaid || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.paidAmount || 0)} collected
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Shops On Hold
                </CardTitle>
                <ShieldOff className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.shopsOnHold || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Due to overdue commissions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by shop name or order number..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="WAIVED">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Commissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Ledger</CardTitle>
              <CardDescription>
                Track commission settlements from paid-at-shop orders
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
                  <h3 className="text-lg font-medium">No commissions found</h3>
                  <p className="text-sm text-muted-foreground">
                    Commission entries will appear here when customers pay at
                    shop
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Shop Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => {
                      const style =
                        statusStyles[commission.status] || statusStyles.PENDING;
                      const StatusIcon = style.icon;

                      return (
                        <TableRow key={commission.id}>
                          <TableCell>
                            <div className="font-medium">
                              {commission.order?.orderNumber ||
                                commission.orderId.slice(0, 8)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {commission.order
                                ? formatCurrency(commission.order.totalNpr)
                                : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {commission.shop?.businessName ||
                                  "Unknown Shop"}
                              </span>
                            </div>
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
                              <span>
                                {format(
                                  new Date(commission.dueAt),
                                  "MMM dd, yyyy",
                                )}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(commission.dueAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {commission.shop?.isOnHold ? (
                              <Badge variant="destructive" className="gap-1">
                                <Ban className="h-3 w-3" />
                                On Hold
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="gap-1 text-green-600 border-green-300"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {(commission.status === "PENDING" ||
                                commission.status === "OVERDUE") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCommission(commission);
                                    setIsMarkPaidDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Mark Paid
                                </Button>
                              )}
                              {commission.shop?.isOnHold &&
                                commission.status === "PAID" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-300"
                                    onClick={() => {
                                      setSelectedCommission(commission);
                                      setIsReleaseHoldDialogOpen(true);
                                    }}
                                  >
                                    <Unlock className="mr-1 h-3 w-3" />
                                    Release Hold
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mark Paid Dialog */}
          <Dialog
            open={isMarkPaidDialogOpen}
            onOpenChange={setIsMarkPaidDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Commission as Paid</DialogTitle>
                <DialogDescription>
                  Confirm that the shopkeeper has paid the commission for this
                  order.
                </DialogDescription>
              </DialogHeader>
              {selectedCommission && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order:</span>
                      <span className="font-medium">
                        {selectedCommission.order?.orderNumber ||
                          selectedCommission.orderId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shop:</span>
                      <span className="font-medium">
                        {selectedCommission.shop?.businessName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Commission Amount:
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(
                          selectedCommission.amount,
                          selectedCommission.currency,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsMarkPaidDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleMarkPaid} disabled={actionLoading}>
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Release Hold Dialog */}
          <Dialog
            open={isReleaseHoldDialogOpen}
            onOpenChange={setIsReleaseHoldDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Release Shop Hold</DialogTitle>
                <DialogDescription>
                  This will allow the shop to resume operations. Make sure all
                  outstanding commissions are paid.
                </DialogDescription>
              </DialogHeader>
              {selectedCommission && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shop:</span>
                      <span className="font-medium">
                        {selectedCommission.shop?.businessName}
                      </span>
                    </div>
                    {selectedCommission.shop?.holdReason && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-700 dark:text-red-300">
                        <strong>Hold Reason:</strong>{" "}
                        {selectedCommission.shop.holdReason}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsReleaseHoldDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReleaseHold}
                  disabled={actionLoading}
                  variant="default"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Release Hold
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
