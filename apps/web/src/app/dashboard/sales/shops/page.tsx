"use client";

import { AdminSellerCRM } from "@/components/admin/AdminSellerCRM";
import { SalesGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { Eye, Loader2, Search, Store, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Shop {
  id: string;
  shopName: string;
  country: string;
  city: string;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  totalOrders: number;
  createdAt: string;
  owner?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function SalesShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const t = useT();

  useEffect(() => {
    loadShops();
  }, [currentPage]);

  const loadShops = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/shops?page=${currentPage}&limit=20${searchQuery ? `&search=${searchQuery}` : ""}`,
      );
      setShops(res.data?.data || res.data?.shops || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load shops:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadShops();
  };

  const getCountryFlag = (code: string) => {
    try {
      return (
        <FlagImage code={code?.toLowerCase() as FlagCode} className="w-5 h-4" />
      );
    } catch {
      return null;
    }
  };

  return (
    <SalesGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              <T>Shops & CRM</T>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              <T>Browse shops and manage seller relationships</T>
            </p>
          </div>

          <Tabs defaultValue="directory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="directory" className="gap-2">
                <Store className="w-4 h-4" />
                <T>Shop Directory</T>
              </TabsTrigger>
              <TabsTrigger value="crm" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <T>Seller CRM</T>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="space-y-4">
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t("Search shops...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} variant="outline">
                  <T>Search</T>
                </Button>
              </div>

              {/* Shops table */}
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : shops.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <T>No shops found</T>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead><T>Shop</T></TableHead>
                          <TableHead><T>Owner</T></TableHead>
                          <TableHead><T>Location</T></TableHead>
                          <TableHead><T>Status</T></TableHead>
                          <TableHead><T>Orders</T></TableHead>
                          <TableHead><T>Actions</T></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shops.map((shop) => (
                          <TableRow key={shop.id}>
                            <TableCell>
                              <div className="font-medium">{shop.shopName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {shop.owner
                                  ? `${shop.owner.firstName} ${shop.owner.lastName}`
                                  : "—"}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {shop.owner?.email || ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {getCountryFlag(shop.country)}
                                <span className="text-sm">
                                  {shop.city || shop.country}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {shop.isVerified ? (
                                  <Badge variant="default" className="text-xs">
                                    <T>Verified</T>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <T>Unverified</T>
                                  </Badge>
                                )}
                                {shop.isActive ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-green-600"
                                  >
                                    <T>Active</T>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-red-600"
                                  >
                                    <T>Inactive</T>
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{shop.totalOrders || 0}</TableCell>
                            <TableCell>
                              <Link href={`/shops/${shop.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4 mr-1" />
                                  <T>View</T>
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
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <T>Previous</T>
                  </Button>
                  <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    {t(`Page ${currentPage} of ${totalPages}`)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <T>Next</T>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="crm">
              <AdminSellerCRM />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </SalesGuard>
  );
}
