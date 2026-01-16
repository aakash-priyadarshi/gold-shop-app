'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  UserPlus,
  MoreVertical,
  Play,
  Package,
  IndianRupee,
  Users,
  TrendingUp,
  Phone,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { shopQuotesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { usePreferencesStore, CURRENCIES, type CurrencyCode } from '@/store/preferences';

interface ShopQuote {
  id: string;
  quoteNumber: string;
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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  QUOTED: { label: 'Quoted', color: 'bg-amber-100 text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: Play },
  READY: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: Package },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ShopQuotesPage() {
  const { user } = useAuth();
  const { currency } = usePreferencesStore();
  
  // Get shop-based currency from shop's country
  const shopCountry = user?.shop?.country || 'NP';
  const shopCurrency = shopCountry === 'IN' ? 'INR' : shopCountry === 'AE' ? 'AED' : shopCountry === 'US' ? 'USD' : shopCountry === 'UK' ? 'GBP' : 'NPR';
  const currencySymbol = CURRENCIES[shopCurrency as CurrencyCode]?.symbol || CURRENCIES[currency as CurrencyCode]?.symbol || 'Rs.';
  
  const [quotes, setQuotes] = useState<ShopQuote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    if (user?.shop?.id) {
      loadData();
    }
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
      console.error('Failed to load quotes:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load quotes',
        description: 'Could not fetch quote data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      await shopQuotesApi.updateStatus(quoteId, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `Quote status changed to ${statusConfig[newStatus]?.label || newStatus}`,
      });
      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update status',
        description: error.response?.data?.message || 'Could not update quote status',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getFilteredQuotes = () => {
    if (activeTab === 'all') return quotes;
    return quotes.filter(q => q.status === activeTab.toUpperCase());
  };

  const filteredQuotes = getFilteredQuotes();

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Walk-in Quotes</h1>
              <p className="text-muted-foreground">Manage quotes for walk-in customers</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/shop/rfqs">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Online RFQs
                </Button>
              </Link>
              <Link href="/dashboard/shop/quotes/create">
                <Button className="bg-amber-500 hover:bg-amber-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Walk-in Quote
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
                      <p className="text-sm text-muted-foreground">Total Quotes</p>
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
                      <p className="text-sm text-muted-foreground">Active Orders</p>
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
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unique Customers</p>
                      <p className="text-2xl font-bold">{stats.uniqueCustomers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quotes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>
                View and manage all walk-in customer quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({quotes.length})</TabsTrigger>
                  <TabsTrigger value="quoted">Pending ({stats?.byStatus.pending || 0})</TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmed ({stats?.byStatus.confirmed || 0})</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress ({stats?.byStatus.inProgress || 0})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({stats?.byStatus.completed || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredQuotes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No quotes found</p>
                      <Link href="/dashboard/shop/quotes/create">
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Quote
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quote #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuotes.map((quote) => {
                          const status = statusConfig[quote.status] || statusConfig.QUOTED;
                          const StatusIcon = status.icon;
                          
                          return (
                            <TableRow key={quote.id}>
                              <TableCell className="font-medium">
                                {quote.quoteNumber}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{quote.walkInCustomer.name}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {quote.walkInCustomer.phone}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p>{quote.jewelleryType}</p>
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
                                    <p className="font-medium">{formatCurrency(quote.totalPriceNpr)}</p>
                                    {quote.balanceDueNpr && quote.balanceDueNpr > 0 && (
                                      <p className="text-xs text-orange-600">
                                        Due: {formatCurrency(quote.balanceDueNpr)}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Not set</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
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
                                    <Link href={`/dashboard/shop/quotes/${quote.id}`}>
                                      <DropdownMenuItem>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                    </Link>
                                    {quote.status === 'QUOTED' && (
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(quote.id, 'CONFIRMED')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Confirm Order
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === 'CONFIRMED' && (
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(quote.id, 'IN_PROGRESS')}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Start Production
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === 'IN_PROGRESS' && (
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(quote.id, 'READY')}>
                                        <Package className="h-4 w-4 mr-2" />
                                        Mark Ready
                                      </DropdownMenuItem>
                                    )}
                                    {quote.status === 'READY' && (
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(quote.id, 'COMPLETED')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Complete & Deliver
                                      </DropdownMenuItem>
                                    )}
                                    {!['COMPLETED', 'CANCELLED'].includes(quote.status) && (
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusUpdate(quote.id, 'CANCELLED')}
                                        className="text-red-600"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel Quote
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
