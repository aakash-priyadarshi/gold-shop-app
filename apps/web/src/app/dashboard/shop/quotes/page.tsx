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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { T } from "@/components/ui/T";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { getJewelleryTypeLabel } from "@/lib/constants/jewellery";
import { shopQuotesApi } from "@/lib/api";
import { useT, useTranslation } from "@/providers/translation-provider";
import { LANGUAGES } from "@/store/preferences";
import {
    CheckCircle,
    Clock,
    Eye,
    FileText,
    Loader2,
    MoreVertical,
    Package,
    Phone,
    Play,
    Plus,
    Receipt,
    TrendingUp,
    UserPlus,
    Users,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ShopQuote {
  id: string;
  quoteNumber: string;
  invoiceNumber?: string;
  jewelleryType: string;
  buildMethod: string;
  targetTotalWeightG?: number;
  totalPriceNpr?: number;
  status: string;
  estimatedDays?: number;
  advancePaidNpr: number;
  balanceDueNpr?: number;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  walkInCustomer: {
    id: string;
    name: string;
    phone: string;
    city: string;
  };
}

interface QuoteStats {
  total: number;
  byStatus: {
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  totalRevenue: number;
  uniqueCustomers: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  QUOTED: {
    label: "Quoted",
    color: "bg-amber-100 text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700 dark:text-blue-300",
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-purple-100 text-purple-700 dark:text-purple-300",
    icon: Play,
  },
  READY: {
    label: "Ready",
    color: "bg-green-100 text-green-700 dark:text-green-300",
    icon: Package,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-700 dark:text-green-300",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:text-red-300",
    icon: XCircle,
  },
};

export default function ShopQuotesPage() {
  const t = useT();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const {
    currencyCode: shopCurrency,
    symbol: currencySymbol,
    format: formatShopCurrency,
  } = useShopCurrency();

  const [quotes, setQuotes] = useState<ShopQuote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    if (user?.shop?.id) {
      loadData();
    }
    // Refetch only when the shop changes; toast copy reads the latest t().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.shop?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [quotesRes, statsRes] = await Promise.all([
        shopQuotesApi.getAll(),
        shopQuotesApi.getStats(),
      ]);
      setQuotes(quotesRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to load quotes:", error);
      toast({
        variant: "destructive",
        title: t("Failed to load quotes"),
        description: t("Could not fetch quote data"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToInvoice = async (quoteId: string) => {
    try {
      const res = await shopQuotesApi.convertToInvoice(quoteId);
      toast({
        title: t("Invoice Created"),
        description: t("Invoice {number} generated successfully.").replace(
          "{number}",
          res.data.invoiceNumber,
        ),
      });
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Failed to create invoice"),
        description:
          error.response?.data?.message || t("Could not convert to invoice"),
      });
    }
  };

  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      const payload: {
        status: string;
        wastagePercent?: number;
      } = { status: newStatus };
      if (newStatus === "READY") {
        const raw = window.prompt(
          t("Billing wastage % for this built piece (0 allowed):"),
          "0",
        );
        if (raw === null) return;
        const pct = parseFloat(raw);
        if (!Number.isFinite(pct) || pct < 0) {
          toast({
            variant: "destructive",
            title: t("Invalid wastage %"),
            description: t("Enter 0 or a positive number."),
          });
          return;
        }
        payload.wastagePercent = pct;
      }
      await shopQuotesApi.updateStatus(quoteId, payload);
      toast({
        title: t("Status Updated"),
        description: `${t("Quote status changed to")} ${
          t(statusConfig[newStatus]?.label || newStatus)
        }`,
      });
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Failed to update status"),
        description:
          error.response?.data?.message || t("Could not update quote status"),
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(LANGUAGES[locale].intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  const getFilteredQuotes = () => {
    if (activeTab === "all") return quotes;
    return quotes.filter((q) => q.status === activeTab.toUpperCase());
  };

  const filteredQuotes = getFilteredQuotes();

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Walk-in Quotes</T>
              </h1>
              <p className="text-muted-foreground">
                <T>Manage quotes for walk-in customers</T>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/shop/rfqs">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  <T>Online RFQs</T>
                </Button>
              </Link>
              <Link href="/dashboard/shop/quotes/create" data-tour="quotes-create">
                <Button className="bg-amber-500 hover:bg-amber-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  <T>New Walk-in Quote</T>
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Total Quotes</T>
                      </p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Active Orders</T>
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.byStatus.confirmed + stats.byStatus.inProgress}
                      </p>
                    </div>
                    <Play className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Total Revenue</T>
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <T>Unique Customers</T>
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.uniqueCustomers}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quotes Table */}
          <Card data-tour="quotes-list">
            <CardHeader>
              <CardTitle>
                <T>Quotes</T>
              </CardTitle>
              <CardDescription>
                <T>View and manage all walk-in customer quotes</T>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">
                    <T>All</T> ({quotes.length})
                  </TabsTrigger>
                  <TabsTrigger value="quoted">
                    <T>Pending</T> ({stats?.byStatus.pending || 0})
                  </TabsTrigger>
                  <TabsTrigger value="confirmed">
                    <T>Confirmed</T> ({stats?.byStatus.confirmed || 0})
                  </TabsTrigger>
                  <TabsTrigger value="in_progress">
                    <T>In Progress</T> ({stats?.byStatus.inProgress || 0})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    <T>Completed</T> ({stats?.byStatus.completed || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredQuotes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        <T>No quotes found</T>
                      </p>
                      <Link href="/dashboard/shop/quotes/create">
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          <T>Create First Quote</T>
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <T>Quote #</T>
                          </TableHead>
                          <TableHead>
                            <T>Customer</T>
                          </TableHead>
                          <TableHead>
                            <T>Type</T>
                          </TableHead>
                          <TableHead>
                            <T>Price</T>
                          </TableHead>
                          <TableHead>
                            <T>Status</T>
                          </TableHead>
                          <TableHead>
                            <T>Date</T>
                          </TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuotes.map((quote) => {
                          const status =
                            statusConfig[quote.status] || statusConfig.QUOTED;
                          const StatusIcon = status.icon;

                          return (
                            <TableRow key={quote.id}>
                              <TableCell className="font-medium">
                                {quote.quoteNumber}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {quote.walkInCustomer.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {quote.walkInCustomer.phone}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p><T>{getJewelleryTypeLabel(quote.jewelleryType)}</T></p>
                                  {quote.targetTotalWeightG && (
                                    <p className="text-xs text-muted-foreground">
                                      {quote.targetTotalWeightG}g
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {quote.totalPriceNpr ? (
                                  <div>
                                    <p className="font-medium">
                                      {formatCurrency(quote.totalPriceNpr)}
                                    </p>
                                    {quote.balanceDueNpr &&
                                      quote.balanceDueNpr > 0 && (
                                        <p className="text-xs text-orange-600">
                                          <T>Due:</T>{" "}
                                          {formatCurrency(quote.balanceDueNpr)}
                                        </p>
                                      )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    <T>Not set</T>
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${status.color} flex items-center gap-1 w-fit`}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  <T>{status.label}</T>
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(quote.createdAt)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <Link
                                      href={`/dashboard/shop/quotes/${quote.id}`}
                                    >
                                      <DropdownMenuItem>
                                        <Eye className="h-4 w-4 mr-2" />
                                        <T>View Details</T>
                                      </DropdownMenuItem>
                                    </Link>
                                    {/* Convert to Invoice — show if not already invoiced */}
                                    {!quote.invoiceNumber &&
                                      !["CANCELLED"].includes(quote.status) && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleConvertToInvoice(quote.id)
                                          }
                                        >
                                          <Receipt className="h-4 w-4 mr-2" />
                                          <T>Create Invoice</T>
                                        </DropdownMenuItem>
                                      )}
                                    {quote.invoiceNumber && (
                                      <DropdownMenuItem disabled>
                                        <Receipt className="h-4 w-4 mr-2 text-green-500" />
                                        {quote.invoiceNumber}
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === "QUOTED" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusUpdate(
                                            quote.id,
                                            "CONFIRMED",
                                          )
                                        }
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        <T>Confirm Order</T>
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === "CONFIRMED" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusUpdate(
                                            quote.id,
                                            "IN_PROGRESS",
                                          )
                                        }
                                      >
                                        <Play className="h-4 w-4 mr-2" />
                                        <T>Start Production</T>
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === "IN_PROGRESS" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusUpdate(quote.id, "READY")
                                        }
                                      >
                                        <Package className="h-4 w-4 mr-2" />
                                        <T>Mark Ready</T>
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === "READY" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusUpdate(
                                            quote.id,
                                            "COMPLETED",
                                          )
                                        }
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        <T>Complete & Deliver</T>
                                      </DropdownMenuItem>
                                    )}
                                    {!["COMPLETED", "CANCELLED"].includes(
                                      quote.status,
                                    ) && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusUpdate(
                                            quote.id,
                                            "CANCELLED",
                                          )
                                        }
                                        className="text-red-600"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        <T>Cancel Quote</T>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
