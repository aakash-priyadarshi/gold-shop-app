"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { invoicesApi } from "@/lib/api";
import {
  ArrowRight,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  Search,
  Settings2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: string;
  paymentStatus: string;
  issuedAt: string;
  dueDate?: string;
  createdAt: string;
}

interface InvoiceStats {
  counts: {
    total: number;
    issued: number;
    paid: number;
    partiallyPaid: number;
    overdue: number;
    voided: number;
  };
  revenue: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-gray-100 text-gray-500 line-through",
  CANCELLED: "bg-red-100 text-red-500",
};

export default function InvoicesListPage() {
  const { symbol: currencySymbol } = useShopCurrency();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;

      const [invoicesRes, statsRes] = await Promise.all([
        invoicesApi.getAll(params),
        invoicesApi.getStats(),
      ]);
      setInvoices(invoicesRes.data.invoices);
      setTotalPages(invoicesRes.data.totalPages);
      setStats(statsRes.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load invoices",
        description: "Could not fetch invoice data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadInvoices();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const formatCurrency = (amount: number, currency?: string) => {
    return `${currency || currencySymbol} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Invoices</h1>
              <p className="text-muted-foreground">
                Manage billing and track payments
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/shop/invoices/settings">
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Bill Settings
                </Button>
              </Link>
              <Link href="/dashboard/shop/invoices/create">
                <Button className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {stats.counts.total}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Collected
                    </span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {formatCurrency(stats.revenue.totalCollected)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      Outstanding
                    </span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-amber-600">
                    {formatCurrency(stats.revenue.totalOutstanding)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Paid</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.counts.paid}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="VOID">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="text-lg font-medium">No invoices yet</h3>
                  <p className="text-muted-foreground">
                    Create your first invoice to start tracking payments.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{inv.customerName}</p>
                            {inv.customerPhone && (
                              <p className="text-xs text-muted-foreground">
                                {inv.customerPhone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(inv.totalAmount, inv.currency)}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(inv.paidAmount, inv.currency)}
                        </TableCell>
                        <TableCell
                          className={
                            inv.balanceDue > 0
                              ? "text-red-600 font-medium"
                              : "text-green-600"
                          }
                        >
                          {formatCurrency(inv.balanceDue, inv.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[inv.status] || "bg-gray-100"
                            }
                          >
                            {inv.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.issuedAt
                            ? formatDate(inv.issuedAt)
                            : formatDate(inv.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/shop/invoices/${inv.id}`}>
                            <Button variant="ghost" size="sm">
                              <ArrowRight className="h-4 w-4" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground py-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
