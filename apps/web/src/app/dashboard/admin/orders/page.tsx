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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Store,
  Truck,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// Order status badge styles - matches DetailedOrderStatus enum + legacy OrderStatus values
const statusStyles: Record<
  string,
  { color: string; icon: any; label: string }
> = {
  // DetailedOrderStatus values
  PLACED: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "Placed" },
  CONFIRMED: {
    color: "bg-indigo-100 text-indigo-800",
    icon: CheckCircle,
    label: "Confirmed",
  },
  IN_PROGRESS: {
    color: "bg-amber-100 text-amber-800",
    icon: Package,
    label: "In Progress",
  },
  READY: { color: "bg-teal-100 text-teal-800", icon: Package, label: "Ready" },
  SHIPPED: {
    color: "bg-cyan-100 text-cyan-800",
    icon: Truck,
    label: "Shipped",
  },
  OUT_FOR_DELIVERY: {
    color: "bg-purple-100 text-purple-800",
    icon: Truck,
    label: "Out for Delivery",
  },
  DELIVERED: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Delivered",
  },
  CANCELLED: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Cancelled",
  },
  REFUNDED: {
    color: "bg-orange-100 text-orange-800",
    icon: DollarSign,
    label: "Refunded",
  },
  // Legacy OrderStatus values (for backwards compatibility)
  CREATED: {
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
    label: "Created",
  },
  PAYMENT_PENDING: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    label: "Payment Pending",
  },
  PAID: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Paid",
  },
  PACKED: {
    color: "bg-indigo-100 text-indigo-800",
    icon: Package,
    label: "Packed",
  },
  IN_PRODUCTION: {
    color: "bg-amber-100 text-amber-800",
    icon: Package,
    label: "In Production",
  },
  QC_PENDING: {
    color: "bg-orange-100 text-orange-800",
    icon: Clock,
    label: "QC Pending",
  },
  QC_PASSED: {
    color: "bg-teal-100 text-teal-800",
    icon: CheckCircle,
    label: "QC Passed",
  },
  QC_FAILED: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "QC Failed",
  },
  READY_TO_SHIP: {
    color: "bg-cyan-100 text-cyan-800",
    icon: Package,
    label: "Ready to Ship",
  },
  COMPLETED: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Completed",
  },
  PAYMENT_FAILED: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Payment Failed",
  },
};

// Payment status styles
const paymentStyles: Record<string, { color: string; label: string }> = {
  PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  PARTIAL: { color: "bg-blue-100 text-blue-800", label: "Partial" },
  COMPLETED: { color: "bg-green-100 text-green-800", label: "Paid" },
  PAID_AT_SHOP: {
    color: "bg-emerald-100 text-emerald-800",
    label: "Paid at Shop",
  },
  REFUNDED: { color: "bg-red-100 text-red-800", label: "Refunded" },
};

// Order status options for dropdown
const ORDER_STATUS_OPTIONS = Object.entries(statusStyles).map(
  ([value, { label }]) => ({ value, label }),
);

// Order-type-specific status options
const PREBUILT_STATUS_OPTIONS = [
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PACKED", label: "Packed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const CUSTOM_STATUS_OPTIONS = [
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Order Accepted" },
  { value: "IN_PROGRESS", label: "Forging / Being Made" },
  { value: "READY", label: "Ready" },
  { value: "PACKED", label: "Packed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Payment status options for dropdown
const PAYMENT_STATUS_OPTIONS = Object.entries(paymentStyles).map(
  ([value, { label }]) => ({ value, label }),
);

// Payment methods by market
const PAYMENT_METHODS: Record<string, { value: string; label: string }[]> = {
  IN: [
    { value: "UPI", label: "UPI" },
    { value: "CARD", label: "Card" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CASH", label: "Cash" },
  ],
  NP: [
    { value: "ESEWA", label: "eSewa" },
    { value: "KHALTI", label: "Khalti" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CASH", label: "Cash" },
  ],
  US: [
    { value: "CARD", label: "Card" },
    { value: "PAYPAL", label: "PayPal" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
  ],
  DEFAULT: [
    { value: "CARD", label: "Card" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CASH", label: "Cash" },
  ],
};

interface Order {
  id: string;
  orderNumber: string;
  orderType: "INVENTORY" | "CUSTOM";
  status: string;
  detailedStatus?: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalNpr: number;
  subtotalNpr?: number;
  taxNpr?: number;
  shippingNpr?: number;
  discountNpr?: number;
  balanceDueNpr: number;
  bookingFeePaidNpr?: number;
  displayCurrency?: string;
  createdAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  trackingNumber?: string;
  shippingMethod?: string;
  marketCountry?: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shop: {
    id: string;
    shopName?: string;
    businessName?: string;
  };
  productSnapshot?: {
    jewelleryType?: string;
    buildMethod?: string;
    composition?: {
      baseAlloy?: {
        metal?: string;
        purity?: string;
      };
    };
    nameEn?: string;
    nameNe?: string;
    totalWeightGrams?: number;
    goldWeightGrams?: number;
    referenceImages?: string[];
    sku?: string;
    quantity?: number;
    images?: string[];
  };
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  adminNotes?: string;
  createdByAdmin?: boolean;
  paymentVerifiedByAdmin?: boolean;
  commissionBreakdown?: {
    shopkeeperAmount: number;
    platformCommission: number;
    commissionRate: number;
    commissionStatus: string;
    commissionDueAt?: string;
    commissionPaidAt?: string;
  };
}

interface OrderStats {
  total: number;
  pending: number;
  inProduction: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  pendingPayments: number;
}

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Loading states for inline updates
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isEditTimelineDialogOpen, setIsEditTimelineDialogOpen] =
    useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);

  // Form states
  const [cancelReason, setCancelReason] = useState("");
  const [newEstimatedDelivery, setNewEstimatedDelivery] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [paymentVerificationNotes, setPaymentVerificationNotes] = useState("");

  // Fetch orders from real API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: "20",
      };

      if (statusFilter !== "all") params.status = statusFilter;
      if (paymentFilter !== "all") params.paymentStatus = paymentFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await api.get("/orders/admin/all", { params });

      // Map the response to match our frontend shape
      const ordersData = response.data.orders || [];
      const mappedOrders = ordersData.map((o: any) => ({
        ...o,
        shop: o.shop
          ? {
              id: o.shop.id,
              businessName: o.shop.shopName || o.shop.businessName,
            }
          : { id: "", businessName: "Unknown" },
      }));

      setOrders(mappedOrders);
      setTotalPages(response.data.meta?.totalPages || 1);
      setTotalOrders(response.data.meta?.totalCount || 0);
    } catch (error: any) {
      console.error("Failed to fetch orders:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentFilter, typeFilter, searchQuery, toast]);

  // Fetch stats from real API
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get("/orders/admin/stats");
      // Map backend stats to frontend shape
      setStats({
        total: response.data.totalOrders || 0,
        pending: response.data.pendingOrders || 0,
        inProduction: response.data.inProductionOrders || 0,
        delivered: response.data.deliveredOrders || 0,
        cancelled: response.data.cancelledOrders || 0,
        totalRevenue: response.data.totalRevenue || 0,
        pendingPayments: response.data.pendingPayments || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // Update order status (inline dropdown)
  async function handleUpdateOrderStatus(orderId: string, newStatus: string) {
    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/orders/admin/${orderId}/order-status`, {
        detailedStatus: newStatus,
      });

      // Update local state optimistically
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, detailedStatus: newStatus }
            : o,
        ),
      );

      toast({
        title: "Status Updated",
        description: `Order status changed to ${statusStyles[newStatus]?.label || newStatus}`,
      });

      fetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // Update payment status (inline dropdown)
  async function handleUpdatePaymentStatus(
    orderId: string,
    newStatus: string,
    method?: string,
  ) {
    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/orders/admin/${orderId}/payment-status`, {
        paymentStatus: newStatus,
        paymentMethod: method,
      });

      // Update local state optimistically
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentStatus: newStatus,
                paymentMethod: method || o.paymentMethod,
              }
            : o,
        ),
      );

      toast({
        title: "Payment Updated",
        description: `Payment status changed to ${paymentStyles[newStatus]?.label || newStatus}`,
      });

      fetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // Filter orders based on search (client-side for quick filtering)
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customer?.firstName?.toLowerCase().includes(query) ||
        order.customer?.lastName?.toLowerCase().includes(query) ||
        order.customer?.email?.toLowerCase().includes(query) ||
        order.shop?.businessName?.toLowerCase().includes(query),
    );
  }, [orders, searchQuery]);

  // Action handlers
  async function handleCancelOrder() {
    if (!selectedOrder || !cancelReason) return;
    setUpdatingOrderId(selectedOrder.id);
    try {
      await api.post(`/orders/admin/${selectedOrder.id}/cancel`, {
        reason: cancelReason,
      });

      setIsCancelDialogOpen(false);
      setCancelReason("");
      setSelectedOrder(null);

      toast({
        title: "Order Cancelled",
        description: `Order ${selectedOrder.orderNumber} has been cancelled`,
      });

      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleUpdateTimeline() {
    if (!selectedOrder || !newEstimatedDelivery) return;
    setUpdatingOrderId(selectedOrder.id);
    try {
      await api.patch(`/orders/admin/${selectedOrder.id}/timeline`, {
        estimatedDelivery: newEstimatedDelivery,
        adminNotes,
      });

      setIsEditTimelineDialogOpen(false);
      setNewEstimatedDelivery("");
      setAdminNotes("");
      setSelectedOrder(null);

      toast({
        title: "Timeline Updated",
        description: `Order timeline has been updated`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update timeline",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleMarkAsPaid() {
    if (!selectedOrder || !paymentVerificationNotes) return;
    setUpdatingOrderId(selectedOrder.id);
    try {
      await api.post(`/orders/admin/${selectedOrder.id}/verify-payment`, {
        notes: paymentVerificationNotes,
      });

      setIsMarkPaidDialogOpen(false);
      setPaymentVerificationNotes("");
      setSelectedOrder(null);

      toast({
        title: "Payment Verified",
        description: `Payment has been marked as verified`,
      });

      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function formatCurrency(amount: number, currency?: string): string {
    const currencyCode = currency || "NPR";
    const locale =
      currencyCode === "INR"
        ? "en-IN"
        : currencyCode === "USD"
          ? "en-US"
          : "en-NP";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Helper to get currency symbol
  function getCurrencySymbol(currency?: string): string {
    switch (currency) {
      case "INR":
        return "₹";
      case "USD":
        return "$";
      case "NPR":
      default:
        return "Rs.";
    }
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <TooltipProvider delayDuration={200}>
          <div className="flex-1 space-y-4 lg:space-y-6 p-4 lg:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
                  <ClipboardList className="h-7 w-7 text-gold-500" />
                  Order Management
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage all customer orders across the platform
                </p>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={fetchOrders}>
                      <RefreshCw
                        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Orders</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export Orders</TooltipContent>
                </Tooltip>
                <Dialog
                  open={isCreateOrderDialogOpen}
                  onOpenChange={setIsCreateOrderDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="gold-gradient text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Create Order</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        Create Order on Behalf of Customer
                      </DialogTitle>
                      <DialogDescription>
                        This feature allows admins to create orders for
                        customers who placed orders via phone or in person.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        This feature is coming soon. It will allow you to:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                        <li>Search and select a customer</li>
                        <li>Choose inventory item or create custom order</li>
                        <li>Set pricing and payment terms</li>
                        <li>Assign to a shop</li>
                      </ul>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateOrderDialogOpen(false)}
                      >
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Orders
                        </p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {stats.total || 0}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          In Production
                        </p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {stats.inProduction || 0}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Revenue
                        </p>
                        <p className="text-xl lg:text-2xl font-bold">
                          {formatCurrency(stats.totalRevenue || 0)}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Pending Payments
                        </p>
                        <p className="text-xl lg:text-2xl font-bold text-amber-600">
                          {formatCurrency(stats.pendingPayments || 0)}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by order #, customer, or shop..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="CREATED">Created</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="IN_PRODUCTION">
                          In Production
                        </SelectItem>
                        <SelectItem value="SHIPPED">Shipped</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={paymentFilter}
                      onValueChange={setPaymentFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Payment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="INVENTORY">Inventory</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">All Orders</CardTitle>
                <CardDescription>
                  {totalOrders} orders found • Page {page} of {totalPages}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Customer
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Shop
                        </TableHead>
                        <TableHead>Order Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Method
                        </TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden xl:table-cell text-right">
                          Commission
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-2">
                              Loading orders...
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No orders found. Orders will appear here when
                            customers place them.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => {
                          const orderStatus =
                            order.detailedStatus || order.status || "CREATED";
                          const statusStyle = statusStyles[orderStatus] || {
                            color: "bg-gray-100 text-gray-800",
                            icon: Clock,
                            label: orderStatus,
                          };
                          const paymentStyle =
                            paymentStyles[order.paymentStatus] ||
                            paymentStyles.PENDING;
                          const StatusIcon = statusStyle.icon || Clock;
                          const isUpdating = updatingOrderId === order.id;
                          const marketMethods =
                            PAYMENT_METHODS[order.marketCountry || "DEFAULT"] ||
                            PAYMENT_METHODS["DEFAULT"];

                          return (
                            <TableRow
                              key={order.id}
                              className={isUpdating ? "opacity-50" : ""}
                            >
                              <TableCell>
                                <div className="font-medium">
                                  {order.orderNumber}
                                </div>
                                <div className="text-xs text-muted-foreground md:hidden">
                                  {order.customer?.firstName}{" "}
                                  {order.customer?.lastName}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs mt-1"
                                >
                                  {order.orderType}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-gray-500" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {order.customer?.firstName}{" "}
                                      {order.customer?.lastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {order.customer?.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {order.shop?.businessName}
                                  </span>
                                </div>
                              </TableCell>
                              {/* Order Status Dropdown */}
                              <TableCell>
                                <Select
                                  value={order.detailedStatus || order.status}
                                  onValueChange={(value) =>
                                    handleUpdateOrderStatus(order.id, value)
                                  }
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="w-[140px] h-8">
                                    <div className="flex items-center gap-1">
                                      <StatusIcon className="h-3 w-3" />
                                      <span className="text-xs">
                                        {statusStyle.label}
                                      </span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(order.orderType === "CUSTOM"
                                      ? CUSTOM_STATUS_OPTIONS
                                      : PREBUILT_STATUS_OPTIONS
                                    ).map((s) => (
                                      <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              {/* Payment Status Dropdown */}
                              <TableCell>
                                <Select
                                  value={order.paymentStatus}
                                  onValueChange={(value) =>
                                    handleUpdatePaymentStatus(order.id, value)
                                  }
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="w-[110px] h-8">
                                    <span className="text-xs">
                                      {paymentStyle.label}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PAYMENT_STATUS_OPTIONS.map((s) => (
                                      <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              {/* Payment Method Dropdown */}
                              <TableCell className="hidden sm:table-cell">
                                <Select
                                  value={order.paymentMethod || ""}
                                  onValueChange={(value) =>
                                    handleUpdatePaymentStatus(
                                      order.id,
                                      order.paymentStatus,
                                      value,
                                    )
                                  }
                                  disabled={
                                    isUpdating ||
                                    order.paymentStatus === "PENDING"
                                  }
                                >
                                  <SelectTrigger className="w-[100px] h-8">
                                    <span className="text-xs">
                                      {order.paymentMethod || "Select"}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {marketMethods.map((m) => (
                                      <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-medium">
                                  {formatCurrency(
                                    order.totalNpr,
                                    order.displayCurrency,
                                  )}
                                </div>
                                {order.balanceDueNpr > 0 && (
                                  <div className="text-xs text-amber-600">
                                    Due:{" "}
                                    {formatCurrency(
                                      order.balanceDueNpr,
                                      order.displayCurrency,
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              {/* Commission Breakdown */}
                              <TableCell className="hidden xl:table-cell text-right">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-help">
                                        <div className="text-xs text-green-600 font-medium">
                                          Shop:{" "}
                                          {formatCurrency(
                                            order.commissionBreakdown
                                              ?.shopkeeperAmount ||
                                              order.totalNpr * 0.99,
                                            order.displayCurrency,
                                          )}
                                        </div>
                                        <div className="text-xs text-blue-600">
                                          Platform:{" "}
                                          {formatCurrency(
                                            order.commissionBreakdown
                                              ?.platformCommission ||
                                              order.totalNpr * 0.01,
                                            order.displayCurrency,
                                          )}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="left"
                                      className="max-w-xs"
                                    >
                                      <div className="space-y-1">
                                        <p className="font-medium">
                                          Commission Breakdown (1%)
                                        </p>
                                        <p className="text-xs">
                                          Shopkeeper (99%):{" "}
                                          {formatCurrency(
                                            order.commissionBreakdown
                                              ?.shopkeeperAmount ||
                                              order.totalNpr * 0.99,
                                            order.displayCurrency,
                                          )}
                                        </p>
                                        <p className="text-xs">
                                          Platform Fee (1%):{" "}
                                          {formatCurrency(
                                            order.commissionBreakdown
                                              ?.platformCommission ||
                                              order.totalNpr * 0.01,
                                            order.displayCurrency,
                                          )}
                                        </p>
                                        {order.commissionBreakdown
                                          ?.commissionStatus && (
                                          <Badge
                                            variant={
                                              order.commissionBreakdown
                                                .commissionStatus === "PAID"
                                                ? "default"
                                                : order.commissionBreakdown
                                                      .commissionStatus ===
                                                    "OVERDUE"
                                                  ? "destructive"
                                                  : "secondary"
                                            }
                                            className="text-xs mt-1"
                                          >
                                            {
                                              order.commissionBreakdown
                                                .commissionStatus
                                            }
                                          </Badge>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                      Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setIsViewDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setNewEstimatedDelivery(
                                          order.estimatedDelivery?.split(
                                            "T",
                                          )[0] || "",
                                        );
                                        setIsEditTimelineDialogOpen(true);
                                      }}
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Edit Timeline
                                    </DropdownMenuItem>
                                    {order.paymentStatus !== "COMPLETED" && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order);
                                          setIsMarkPaidDialogOpen(true);
                                        }}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {order.status !== "CANCELLED" &&
                                      order.status !== "DELIVERED" && (
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => {
                                            setSelectedOrder(order);
                                            setIsCancelDialogOpen(true);
                                          }}
                                        >
                                          <Ban className="h-4 w-4 mr-2" />
                                          Cancel Order
                                        </DropdownMenuItem>
                                      )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Order Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Order Details</DialogTitle>
                  <DialogDescription>
                    {selectedOrder?.orderNumber} • {selectedOrder?.orderType}{" "}
                    Order
                  </DialogDescription>
                </DialogHeader>
                {selectedOrder && (
                  <div className="space-y-4">
                    {/* Status Row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Order Status
                        </Label>
                        <Badge
                          className={
                            statusStyles[
                              selectedOrder.detailedStatus ||
                                selectedOrder.status
                            ]?.color || ""
                          }
                        >
                          {statusStyles[
                            selectedOrder.detailedStatus || selectedOrder.status
                          ]?.label || selectedOrder.status}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Payment Status
                        </Label>
                        <Badge
                          className={
                            paymentStyles[selectedOrder.paymentStatus]?.color ||
                            ""
                          }
                        >
                          {paymentStyles[selectedOrder.paymentStatus]?.label ||
                            selectedOrder.paymentStatus}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Payment Method
                        </Label>
                        <p className="text-sm font-medium">
                          {selectedOrder.paymentMethod?.replace(/_/g, " ") ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Customer & Shop Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Customer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <p className="font-medium">
                            {selectedOrder.customer.firstName}{" "}
                            {selectedOrder.customer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedOrder.customer.email}
                          </p>
                          {selectedOrder.customer.phone && (
                            <p className="text-sm text-muted-foreground">
                              {selectedOrder.customer.phone}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Shop
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium">
                            {selectedOrder.shop.shopName ||
                              selectedOrder.shop.businessName}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Product Details */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Product Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedOrder.productSnapshot?.jewelleryType && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              Jewellery Type
                            </span>
                            <span className="font-medium">
                              {selectedOrder.productSnapshot.jewelleryType.replace(
                                /_/g,
                                " ",
                              )}
                            </span>
                          </div>
                        )}
                        {selectedOrder.productSnapshot?.nameEn && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              Name
                            </span>
                            <span className="font-medium">
                              {selectedOrder.productSnapshot.nameEn}
                            </span>
                          </div>
                        )}
                        {selectedOrder.productSnapshot?.buildMethod && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              Build Method
                            </span>
                            <span className="font-medium">
                              {selectedOrder.productSnapshot.buildMethod.replace(
                                /_/g,
                                " ",
                              )}
                            </span>
                          </div>
                        )}
                        {selectedOrder.productSnapshot?.composition
                          ?.baseAlloy && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              Metal
                            </span>
                            <span className="font-medium">
                              {
                                selectedOrder.productSnapshot.composition
                                  .baseAlloy.metal
                              }{" "}
                              {
                                selectedOrder.productSnapshot.composition
                                  .baseAlloy.purity
                              }
                            </span>
                          </div>
                        )}
                        {selectedOrder.productSnapshot?.totalWeightGrams && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              Weight
                            </span>
                            <span className="font-medium">
                              {selectedOrder.productSnapshot.totalWeightGrams}g
                            </span>
                          </div>
                        )}
                        {selectedOrder.productSnapshot?.sku && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              SKU
                            </span>
                            <span className="font-medium">
                              {selectedOrder.productSnapshot.sku}
                            </span>
                          </div>
                        )}
                        {selectedOrder.productSnapshot?.quantity && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">
                              Quantity
                            </span>
                            <span className="font-medium">
                              {selectedOrder.productSnapshot.quantity}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    {selectedOrder.shippingAddress &&
                      Object.keys(selectedOrder.shippingAddress).length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Shipping Address
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm space-y-1">
                              {selectedOrder.shippingAddress.fullName && (
                                <p className="font-medium">
                                  {selectedOrder.shippingAddress.fullName}
                                </p>
                              )}
                              {selectedOrder.shippingAddress.phone && (
                                <p className="text-muted-foreground">
                                  {selectedOrder.shippingAddress.phone}
                                </p>
                              )}
                              {selectedOrder.shippingAddress.addressLine1 && (
                                <p>
                                  {selectedOrder.shippingAddress.addressLine1}
                                </p>
                              )}
                              {selectedOrder.shippingAddress.addressLine2 && (
                                <p>
                                  {selectedOrder.shippingAddress.addressLine2}
                                </p>
                              )}
                              <p>
                                {[
                                  selectedOrder.shippingAddress.city,
                                  selectedOrder.shippingAddress.state,
                                  selectedOrder.shippingAddress.pincode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              {selectedOrder.shippingAddress.country && (
                                <p>{selectedOrder.shippingAddress.country}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    {/* Price Breakdown */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Price Breakdown (
                          {selectedOrder.displayCurrency || "NPR"})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedOrder.subtotalNpr !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Subtotal
                            </span>
                            <span>
                              {formatCurrency(
                                selectedOrder.subtotalNpr,
                                selectedOrder.displayCurrency,
                              )}
                            </span>
                          </div>
                        )}
                        {selectedOrder.taxNpr !== undefined &&
                          selectedOrder.taxNpr > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax</span>
                              <span>
                                {formatCurrency(
                                  selectedOrder.taxNpr,
                                  selectedOrder.displayCurrency,
                                )}
                              </span>
                            </div>
                          )}
                        {selectedOrder.shippingNpr !== undefined &&
                          selectedOrder.shippingNpr > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Shipping
                              </span>
                              <span>
                                {formatCurrency(
                                  selectedOrder.shippingNpr,
                                  selectedOrder.displayCurrency,
                                )}
                              </span>
                            </div>
                          )}
                        {selectedOrder.discountNpr !== undefined &&
                          selectedOrder.discountNpr > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Discount</span>
                              <span>
                                -
                                {formatCurrency(
                                  selectedOrder.discountNpr,
                                  selectedOrder.displayCurrency,
                                )}
                              </span>
                            </div>
                          )}
                        <div className="flex justify-between font-bold pt-2 border-t">
                          <span>Total</span>
                          <span className="text-lg">
                            {formatCurrency(
                              selectedOrder.totalNpr,
                              selectedOrder.displayCurrency,
                            )}
                          </span>
                        </div>
                        {selectedOrder.bookingFeePaidNpr !== undefined &&
                          selectedOrder.bookingFeePaidNpr > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Booking Fee Paid</span>
                              <span>
                                {formatCurrency(
                                  selectedOrder.bookingFeePaidNpr,
                                  selectedOrder.displayCurrency,
                                )}
                              </span>
                            </div>
                          )}
                        {selectedOrder.balanceDueNpr > 0 && (
                          <div className="flex justify-between text-sm font-medium text-amber-600">
                            <span>Balance Due</span>
                            <span>
                              {formatCurrency(
                                selectedOrder.balanceDueNpr,
                                selectedOrder.displayCurrency,
                              )}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Delivery Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Created At
                        </Label>
                        <p className="text-sm">
                          {new Date(selectedOrder.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {selectedOrder.estimatedDelivery && (
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Estimated Delivery
                          </Label>
                          <p className="text-sm">
                            {new Date(
                              selectedOrder.estimatedDelivery,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {selectedOrder.trackingNumber && (
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Tracking Number
                          </Label>
                          <p className="text-sm font-mono">
                            {selectedOrder.trackingNumber}
                          </p>
                        </div>
                      )}
                      {selectedOrder.shippingMethod && (
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Shipping Method
                          </Label>
                          <p className="text-sm">
                            {selectedOrder.shippingMethod}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Admin Notes */}
                    {selectedOrder.adminNotes && (
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Admin Notes
                        </Label>
                        <p className="text-sm bg-muted p-2 rounded">
                          {selectedOrder.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Reference Images / AI Design Preview */}
                    {selectedOrder.productSnapshot?.referenceImages &&
                      selectedOrder.productSnapshot.referenceImages.length >
                        0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Reference Images
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {selectedOrder.productSnapshot.referenceImages.map(
                                (url, idx) => (
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
                                          AI Design
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Cancel Order Dialog */}
            <Dialog
              open={isCancelDialogOpen}
              onOpenChange={setIsCancelDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Cancel Order
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel order{" "}
                    {selectedOrder?.orderNumber}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cancelReason">Cancellation Reason *</Label>
                    <Textarea
                      id="cancelReason"
                      placeholder="Please provide a reason for cancellation..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(false)}
                  >
                    Keep Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelOrder}
                    disabled={!cancelReason}
                  >
                    Cancel Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Timeline Dialog */}
            <Dialog
              open={isEditTimelineDialogOpen}
              onOpenChange={setIsEditTimelineDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gold-500" />
                    Edit Order Timeline
                  </DialogTitle>
                  <DialogDescription>
                    Update the estimated delivery date for{" "}
                    {selectedOrder?.orderNumber}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="estimatedDelivery">
                      Estimated Delivery Date *
                    </Label>
                    <Input
                      id="estimatedDelivery"
                      type="date"
                      value={newEstimatedDelivery}
                      onChange={(e) => setNewEstimatedDelivery(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Add any notes about this timeline change..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditTimelineDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="gold-gradient text-white"
                    onClick={handleUpdateTimeline}
                    disabled={!newEstimatedDelivery}
                  >
                    Update Timeline
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Mark as Paid Dialog */}
            <Dialog
              open={isMarkPaidDialogOpen}
              onOpenChange={setIsMarkPaidDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Verify Payment
                  </DialogTitle>
                  <DialogDescription>
                    Mark payment as verified for {selectedOrder?.orderNumber}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">
                            Important
                          </p>
                          <p className="text-amber-700">
                            Only mark as paid if you have verified the payment
                            through bank statement, transaction receipt, or
                            other reliable means.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedOrder && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Total Amount
                        </Label>
                        <p className="font-bold">
                          {formatCurrency(selectedOrder.totalNpr)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Balance Due
                        </Label>
                        <p className="font-bold text-amber-600">
                          {formatCurrency(selectedOrder.balanceDueNpr)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="paymentNotes">Verification Notes *</Label>
                    <Textarea
                      id="paymentNotes"
                      placeholder="E.g., Verified via bank statement dated 2024-01-15, Transaction ID: ABC123..."
                      value={paymentVerificationNotes}
                      onChange={(e) =>
                        setPaymentVerificationNotes(e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsMarkPaidDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMarkAsPaid}
                    disabled={!paymentVerificationNotes}
                  >
                    Confirm Payment Verified
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TooltipProvider>
      </DashboardLayout>
    </AdminGuard>
  );
}
