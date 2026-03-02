"use client";

import { DynamicFooter } from '@/components/layout/DynamicFooter';
import { Header } from "@/components/layout/header";
import {
  MiniOrderStepper,
  type OrderType as OrderTypeEnum,
} from "@/components/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi } from "@/lib/api";
import { CURRENCIES, usePreferencesStore } from "@/store/preferences";
import {
  CalendarIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { Loader2, Package, Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: "INVENTORY" | "CUSTOM";
  status: string;
  detailedStatus: string;
  paymentStatus: string;
  totalNpr: number;
  createdAt: string;
  updatedAt: string;
  productSnapshot: {
    name?: string;
    nameEn?: string;
    jewelleryType?: string;
    images?: string[];
    referenceImages?: string[];
  };
  shop: {
    id: string;
    shopName: string;
  };
}

interface OrdersResponse {
  orders: OrderSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY ORDERS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function MyOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Currency from preferences
  const { currency } = usePreferencesStore();
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.USD;

  // State
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    setMounted(true);

    // Initialize from URL params
    const page = searchParams.get("page");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    if (page) setCurrentPage(parseInt(page));
    if (status) setStatusFilter(status);
    if (type) setTypeFilter(type);
  }, [searchParams]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: 10,
        };

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }
        if (typeFilter !== "all") {
          params.orderType = typeFilter;
        }
        if (searchQuery) {
          params.search = searchQuery;
        }
        if (sortBy === "oldest") {
          params.sortOrder = "asc";
        }

        const response = (await ordersApi.getMyOrders(params)) as {
          data: OrdersResponse;
        };
        setOrders(response.data.orders);
        setTotalPages(response.data.pages);
        setTotalOrders(response.data.total);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    if (mounted) {
      fetchOrders();
    }
  }, [
    isAuthenticated,
    currentPage,
    statusFilter,
    typeFilter,
    searchQuery,
    sortBy,
    mounted,
  ]);

  // Format price
  const formatPrice = (priceNpr: number) => {
    if (!mounted) {
      return new Intl.NumberFormat("ne-NP", {
        style: "currency",
        currency: "NPR",
        minimumFractionDigits: 0,
      }).format(priceNpr);
    }

    return new Intl.NumberFormat(currencyInfo?.locale || "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(priceNpr);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    // The search will be triggered by the useEffect watching searchQuery
  };

  // Loading state
  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </main>
        <DynamicFooter />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    router.push("/auth/login?redirect=/orders");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Orders
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and manage your orders
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search orders by order number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>

              {/* Filter controls */}
              <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="INVENTORY">Pre-built</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingBagIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No orders found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "You haven't placed any orders yet"}
              </p>
              <Button asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const productName =
                order.productSnapshot.name ||
                order.productSnapshot.nameEn ||
                order.productSnapshot.jewelleryType ||
                "Custom Jewellery";
              const productImage =
                order.productSnapshot.images?.[0] ||
                order.productSnapshot.referenceImages?.[0];

              return (
                <Card
                  key={order.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link href={`/orders/${order.id}`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* Product image */}
                        <div className="w-full lg:w-32 h-32 bg-gray-100 dark:bg-gray-800 flex-shrink-0 flex items-center justify-center">
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-gray-400" />
                          )}
                        </div>

                        {/* Order details */}
                        <div className="flex-1 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                              {/* Order number and type */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                                  #{order.orderNumber}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {order.orderType === "CUSTOM"
                                    ? "Custom"
                                    : "Pre-built"}
                                </Badge>
                              </div>

                              {/* Product name */}
                              <h3 className="font-medium mt-1">
                                {productName}
                              </h3>

                              {/* Shop */}
                              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <Store className="h-4 w-4" />
                                {order.shop.shopName}
                              </div>

                              {/* Date and price */}
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  {formatDate(order.createdAt)}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatPrice(order.totalNpr)}
                                </span>
                              </div>
                            </div>

                            {/* Mini stepper */}
                            <div className="sm:w-48">
                              <MiniOrderStepper
                                orderType={order.orderType as OrderTypeEnum}
                                currentStatus={order.detailedStatus}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <div className="hidden lg:flex items-center justify-center w-12 bg-gray-50 dark:bg-gray-800/50">
                          <ChevronRightIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {orders.length} of {totalOrders} orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-10"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      <DynamicFooter />
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <MyOrdersPageContent />
    </Suspense>
  );
}
