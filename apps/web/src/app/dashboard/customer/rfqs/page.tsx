"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { Eye, FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RFQ {
  id: string;
  jewelleryType: string;
  buildMethod: string;
  composition: Record<string, unknown>;
  targetTotalWeightG: number;
  budgetMinNpr: number;
  budgetMaxNpr: number;
  status: string;
  createdAt: string;
  offers?: Array<{
    id: string;
    status: string;
    totalPriceNpr: number;
    shop?: { shopName: string };
  }>;
}

const ACTIVE_STATUSES = [
  "DRAFT",
  "SENT_TO_SHOPS",
  "OFFERS_RECEIVED",
  "OFFER_SELECTED",
];
const COMPLETED_STATUSES = ["CONFIRMED", "COMPLETED"];
const CLOSED_STATUSES = ["CANCELLED", "EXPIRED"];

function getMetalLabel(rfq: RFQ): string {
  const comp = rfq.composition as any;
  if (comp?.preciousMetal) return comp.preciousMetal.replace(/_/g, " ");
  if (comp?.alloyConfig?.baseMetal)
    return `${comp.alloyConfig.baseMetal} Alloy`;
  if (comp?.coreMetal) return comp.coreMetal.replace(/_/g, " ");
  if (comp?.metalType) return comp.metalType.replace(/_/g, " ");
  return rfq.buildMethod?.replace("METHOD_", "Method ") || "—";
}

export default function CustomerRFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const t = useT();

  useEffect(() => {
    loadRFQs();
  }, []);

  const loadRFQs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/rfq/my-requests");
      let rfqsArr = response.data;
      if (!Array.isArray(rfqsArr)) {
        rfqsArr = [];
      }
      setRfqs(rfqsArr);
    } catch (error) {
      console.error("Failed to load RFQs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            <T>Draft</T>
          </Badge>
        );
      case "SENT_TO_SHOPS":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            <T>Sent to Seller</T>
          </Badge>
        );
      case "OFFERS_RECEIVED":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            <T>Offers Received</T>
          </Badge>
        );
      case "OFFER_SELECTED":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200"
          >
            <T>Offer Selected</T>
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <T>Confirmed</T>
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <T>Completed</T>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <T>Cancelled</T>
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-500 border-gray-200"
          >
            <T>Expired</T>
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status.replace(/_/g, " ")}</Badge>;
    }
  };

  const filteredRFQs = rfqs.filter((rfq) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ACTIVE_STATUSES.includes(rfq.status);
    if (activeTab === "completed")
      return COMPLETED_STATUSES.includes(rfq.status);
    if (activeTab === "closed") return CLOSED_STATUSES.includes(rfq.status);
    return true;
  });

  const stats = {
    total: rfqs.length,
    active: rfqs.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
    completed: rfqs.filter((r) => COMPLETED_STATUSES.includes(r.status)).length,
    closed: rfqs.filter((r) => CLOSED_STATUSES.includes(r.status)).length,
    totalOffers: rfqs.reduce((sum, r) => sum + (r.offers?.length || 0), 0),
  };

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold"><T>My Custom Orders</T></h1>
              <p className="text-muted-foreground">
                <T>Track your custom jewellery requests and seller responses</T>
              </p>
            </div>
            <Button asChild>
              <Link href="/rfq/create">
                <Plus className="h-4 w-4 mr-2" />
                <T>New Request</T>
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Total Requests</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Active</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.active}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Completed</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Closed</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                  {stats.closed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription><T>Total Offers</T></CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalOffers}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RFQ List */}
          <Card>
            <CardHeader>
              <CardTitle><T>Custom Orders</T></CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">{t(`All (${rfqs.length})`)}</TabsTrigger>
                  <TabsTrigger value="active">
                    {t(`Active (${stats.active})`)}
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    {t(`Completed (${stats.completed})`)}
                  </TabsTrigger>
                  <TabsTrigger value="closed">
                    {t(`Closed (${stats.closed})`)}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {filteredRFQs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2"><T>No requests found</T></h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {activeTab === "all"
                          ? t("You haven't created any custom order requests yet")
                          : t(`No ${activeTab} requests`)}
                      </p>
                      <Button asChild>
                        <Link href="/rfq/create">
                          <T>Create Your First Request</T>
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead><T>Item</T></TableHead>
                          <TableHead><T>Metal</T></TableHead>
                          <TableHead><T>Weight</T></TableHead>
                          <TableHead><T>Budget</T></TableHead>
                          <TableHead><T>Offers</T></TableHead>
                          <TableHead><T>Status</T></TableHead>
                          <TableHead><T>Created</T></TableHead>
                          <TableHead className="text-right"><T>Actions</T></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRFQs.map((rfq) => (
                          <TableRow key={rfq.id}>
                            <TableCell className="font-medium">
                              {rfq.jewelleryType}
                            </TableCell>
                            <TableCell>{getMetalLabel(rfq)}</TableCell>
                            <TableCell>
                              {rfq.targetTotalWeightG
                                ? `${rfq.targetTotalWeightG}g`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {rfq.budgetMaxNpr
                                ? `Rs. ${rfq.budgetMaxNpr.toLocaleString()}`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {t(`${rfq.offers?.length || 0} offers`)}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(rfq.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  href={`/dashboard/customer/rfqs/${rfq.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  <T>View</T>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
