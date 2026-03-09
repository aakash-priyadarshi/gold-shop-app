"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { customerCrmApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  Loader2,
  MessageSquare,
  Search,
  ShoppingCart,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Customer {
  id: string;
  type: "REGISTERED" | "WALK_IN";
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  orderCount: number;
  rfqCount: number;
  totalSpent: number;
  quoteCount?: number;
  lastActive: string;
  createdAt: string;
}

export default function CustomerDirectoryPage() {
  const { symbol: currencySymbol } = useShopCurrency();
  const t = useT();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerCrmApi.search({
        query: search,
        page,
        limit: 20,
      });
      setCustomers(res.data.customers);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      toast({ variant: "destructive", title: "Failed to load customers" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!featuresLoading && hasFeature("crm")) {
      const timer = setTimeout(fetchCustomers, 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, featuresLoading, hasFeature]);

  return (
    <ShopGuard>
      <DashboardLayout>
        <FeatureGate
          feature="crm"
          featureLabel="CRM / Customer Directory"
          hasFeature={hasFeature}
          planName={planName}
          loading={featuresLoading}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-amber-500" />
                  <T>Customer Directory</T>
                </h1>
                <p className="text-muted-foreground">
                  {t(`${total} total customers across registered and walk-in`)}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name..."
                className="pl-10"
              />
            </div>

            {/* Customer Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : customers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                  <p className="text-muted-foreground">
                    <T>No customers found</T>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <T>
                      Customers appear here after they place orders or RFQ
                      requests
                    </T>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/dashboard/shop/customers/${customer.id}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{customer.name}</p>
                              <Badge
                                variant="outline"
                                className={
                                  customer.type === "REGISTERED"
                                    ? "text-green-600 border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/30 text-xs"
                                    : "text-blue-600 border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 text-xs"
                                }
                              >
                                {customer.type === "REGISTERED"
                                  ? t("Registered")
                                  : t("Walk-in")}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Customer location & membership */}
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {customer.type === "REGISTERED" && (
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3 w-3 text-amber-500" />
                              <span className="text-amber-600 text-xs font-medium">
                                <T>Platform messaging available</T>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                          {customer.type === "REGISTERED" ? (
                            <>
                              <div className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                {t(`${customer.orderCount} orders`)}
                              </div>
                              <div>{t(`${customer.rfqCount} RFQs`)}</div>
                              {customer.totalSpent > 0 && (
                                <div className="font-medium text-amber-600">
                                  {currencySymbol}{" "}
                                  {customer.totalSpent.toLocaleString()}
                                </div>
                              )}
                            </>
                          ) : (
                            <div>{t(`${customer.quoteCount || 0} quotes`)}</div>
                          )}
                          <div className="ml-auto">
                            {new Date(customer.lastActive).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <T>Previous</T>
                </Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">
                  {t(`Page ${page} of ${totalPages}`)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <T>Next</T>
                </Button>
              </div>
            )}
          </div>
        </FeatureGate>
      </DashboardLayout>
    </ShopGuard>
  );
}
