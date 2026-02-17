"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import api, { adminApi } from "@/lib/api";
import {
  CheckCircle,
  ExternalLink,
  FileCheck,
  Globe,
  Loader2,
  Search,
  Shield,
  Store,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface VerificationRequest {
  id: string;
  type: "SHOP" | "USER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  shop?: {
    id: string;
    shopName: string;
    ownerName: string;
    country: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Shop {
  id: string;
  shopName: string;
  country: string;
  city?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kyc");

  // Shops for KYC review
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [kycFilter, setKycFilter] = useState<"all" | "pending" | "verified">(
    "pending",
  );

  // KYC Review dialog state
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [kycShopId, setKycShopId] = useState<string | null>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycProcessing, setKycProcessing] = useState(false);
  const [kycRejectReason, setKycRejectReason] = useState("");

  useEffect(() => {
    loadRequests();
    loadShops();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/admin/verifications");
      let arr = response.data.requests || response.data || [];
      if (!Array.isArray(arr)) arr = [];
      setRequests(arr);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load verifications",
        description: "Could not fetch verification requests",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadShops = async () => {
    setShopsLoading(true);
    try {
      const response = await api.get("/shops");
      let shopsArr = response.data.shops || response.data || [];
      if (!Array.isArray(shopsArr)) shopsArr = [];
      setShops(shopsArr);
    } catch (error) {
      console.error("Failed to load shops:", error);
    } finally {
      setShopsLoading(false);
    }
  };

  const openKycReview = async (shopId: string) => {
    setKycShopId(shopId);
    setKycDialogOpen(true);
    setKycLoading(true);
    setKycData(null);
    setKycRejectReason("");
    try {
      const response = await adminApi.getShopKyc(shopId);
      setKycData(response.data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to load KYC",
        description:
          error.response?.data?.message || "Could not fetch KYC data",
      });
    } finally {
      setKycLoading(false);
    }
  };

  const handleKycAction = async (action: "approve" | "reject") => {
    if (!kycShopId) return;
    setKycProcessing(true);
    try {
      await adminApi.updateShopKycStatus(
        kycShopId,
        action,
        action === "reject" ? kycRejectReason : undefined,
      );
      toast({
        title: action === "approve" ? "KYC Approved" : "KYC Rejected",
        description:
          action === "approve"
            ? "Shop has been verified based on KYC review."
            : "Shop KYC has been rejected.",
      });
      setKycDialogOpen(false);
      loadShops();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description:
          error.response?.data?.message || "Could not process KYC action",
      });
    } finally {
      setKycProcessing(false);
    }
  };

  const filteredShops = shops.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      kycFilter === "all"
        ? true
        : kycFilter === "pending"
          ? !s.isVerified
          : s.isVerified;

    return matchesSearch && matchesFilter;
  });

  const pendingCount = shops.filter((s) => !s.isVerified).length;
  const verifiedCount = shops.filter((s) => s.isVerified).length;
  const pendingRequestCount = requests.filter(
    (r) => r.status === "PENDING",
  ).length;

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Verifications & KYC
            </h1>
            <p className="text-muted-foreground">
              Review shop KYC documents and manage verification requests
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pending KYC</p>
                <p className="text-2xl font-bold text-amber-600">
                  {pendingCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Verified Shops</p>
                <p className="text-2xl font-bold text-green-600">
                  {verifiedCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Shops</p>
                <p className="text-2xl font-bold">{shops.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Pending Requests
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingRequestCount}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="kyc" className="gap-2">
                <FileCheck className="h-4 w-4" />
                KYC Review
                {pendingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-amber-100 text-amber-700"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <Shield className="h-4 w-4" />
                Verification Requests
                {pendingRequestCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {pendingRequestCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* KYC Review Tab */}
            <TabsContent value="kyc" className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shops by name, email, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={kycFilter === "pending" ? "default" : "outline"}
                    onClick={() => setKycFilter("pending")}
                  >
                    Pending ({pendingCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={kycFilter === "verified" ? "default" : "outline"}
                    onClick={() => setKycFilter("verified")}
                  >
                    Verified ({verifiedCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={kycFilter === "all" ? "default" : "outline"}
                    onClick={() => setKycFilter("all")}
                  >
                    All
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {shopsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredShops.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No shops match your filter</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>KYC Status</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShops.map((shop) => (
                          <TableRow key={shop.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gold-100 flex items-center justify-center">
                                  <Store className="h-4 w-4 text-gold-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{shop.shopName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {shop.city || "No city"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {shop.owner ? (
                                <div>
                                  <p className="text-sm">
                                    {shop.owner.firstName} {shop.owner.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {shop.owner.email}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{shop.country}</span>
                            </TableCell>
                            <TableCell>
                              {shop.isVerified ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-100 text-amber-700"
                                >
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(shop.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={shop.isVerified ? "ghost" : "outline"}
                                onClick={() => openKycReview(shop.id)}
                                className={`gap-1 ${shop.isVerified ? "text-green-600" : "text-blue-600 hover:text-blue-700"}`}
                              >
                                <FileCheck className="h-3.5 w-3.5" />
                                {shop.isVerified ? "View KYC" : "Review KYC"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Verification Requests Tab */}
            <TabsContent value="requests" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Verification Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No verification requests</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>
                              {req.type === "SHOP" ? (
                                <span className="flex items-center gap-2">
                                  <Store className="h-4 w-4" /> Shop
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <User className="h-4 w-4" /> User
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {req.type === "SHOP" && req.shop ? (
                                <span>
                                  {req.shop.shopName} ({req.shop.ownerName})
                                </span>
                              ) : req.user ? (
                                <span>
                                  {req.user.name} ({req.user.email})
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {req.status === "PENDING" ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-100 text-amber-700"
                                >
                                  Pending
                                </Badge>
                              ) : req.status === "APPROVED" ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />{" "}
                                  Approved
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-red-100 text-red-700"
                                >
                                  <XCircle className="h-3 w-3 mr-1" /> Rejected
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        {/* KYC Review Dialog */}
        <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                KYC Review
              </DialogTitle>
              <DialogDescription>
                Review submitted KYC documents and verify or reject the shop
              </DialogDescription>
            </DialogHeader>

            {kycLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : kycData ? (
              <div className="space-y-5">
                {/* Shop & Owner Info */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-semibold">{kycData.shopName}</p>
                    <p className="text-sm text-muted-foreground">
                      {kycData.user?.firstName} {kycData.user?.lastName} —{" "}
                      {kycData.user?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {kycData.country}
                    </span>
                    {kycData.isVerified ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Text-based KYC fields */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                    Identification Numbers
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "PAN Number", value: kycData.panNumber },
                      { label: "VAT/GST Number", value: kycData.vatNumber },
                      { label: "BIS License", value: kycData.bisLicenseNumber },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="p-3 rounded-lg border bg-white dark:bg-muted/30"
                      >
                        <Label className="text-muted-foreground text-xs">
                          {field.label}
                        </Label>
                        <p
                          className={`font-mono text-sm mt-1 ${field.value ? "text-foreground" : "text-muted-foreground italic"}`}
                        >
                          {field.value || "Not provided"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document uploads */}
                {kycData.verificationDocuments &&
                  Object.keys(kycData.verificationDocuments).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                        Submitted Documents
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(
                          kycData.verificationDocuments as Record<string, any>,
                        ).map(([key, value]) => {
                          const isUrl =
                            typeof value === "string" &&
                            value.startsWith("http");
                          const displayKey = key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (s: string) => s.toUpperCase());
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-muted/30"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {displayKey}
                                </p>
                                {!isUrl && (
                                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                    {String(value)}
                                  </p>
                                )}
                              </div>
                              {isUrl && (
                                <a
                                  href={value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View Document
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {(!kycData.verificationDocuments ||
                  Object.keys(kycData.verificationDocuments).length === 0) &&
                  !kycData.panNumber &&
                  !kycData.vatNumber &&
                  !kycData.bisLicenseNumber && (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">
                        No KYC documents submitted yet
                      </p>
                      <p className="text-sm mt-1">
                        The shop owner hasn&apos;t uploaded any verification
                        documents.
                      </p>
                    </div>
                  )}

                {/* Reject reason input */}
                <div className="space-y-2">
                  <Label htmlFor="rejectReason">
                    Rejection Reason (optional)
                  </Label>
                  <Input
                    id="rejectReason"
                    value={kycRejectReason}
                    onChange={(e) => setKycRejectReason(e.target.value)}
                    placeholder="Reason for rejection (visible in audit log)"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Failed to load KYC data</p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setKycDialogOpen(false)}>
                Close
              </Button>
              {kycData && (
                <>
                  {kycData.isVerified ? (
                    <Button
                      variant="destructive"
                      onClick={() => handleKycAction("reject")}
                      disabled={kycProcessing}
                    >
                      {kycProcessing && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke Verification
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleKycAction("reject")}
                        disabled={kycProcessing}
                      >
                        {kycProcessing && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleKycAction("approve")}
                        disabled={kycProcessing}
                      >
                        {kycProcessing && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve & Verify
                      </Button>
                    </>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>{" "}
      </DashboardLayout>
    </AdminGuard>
  );
}
