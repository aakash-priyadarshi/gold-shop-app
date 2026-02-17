"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Heart,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  PauseCircle,
  Phone,
  Search,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ─── TYPES ─── */

interface SellerItem {
  id: string;
  shopName: string;
  city: string;
  state?: string;
  contactPhone: string;
  contactEmail?: string;
  profileImage?: string;
  isVerified: boolean;
  isActive: boolean;
  isOnHold: boolean;
  sellerTier: string;
  createdAt: string;
  owner: { firstName: string; lastName: string; email: string; phone: string };
  performance: {
    totalOrders: number;
    successfulOrders: number;
    avgRating: number;
    totalRevenue: number;
    cancellationRate: number;
  } | null;
  badges: { badgeType: string; isActive: boolean }[];
  counts: {
    orders: number;
    rfqOffers: number;
    inventoryItems: number;
    shopQuotes: number;
    ratings: number;
  };
  healthScore: number;
}

interface CrmStats {
  total: number;
  active: number;
  inactive: number;
  onHold: number;
  verified: number;
  tiers: Record<string, number>;
  avgRevenue: number;
  avgRating: number;
}

interface HealthScore {
  profileCompleteness: { score: number; max: number; missing: string[] };
  performanceMetrics: {
    score: number;
    max: number;
    details: Record<string, number>;
  };
  verificationStatus: { score: number; max: number };
  capabilitySetup: { score: number; max: number; missing: string[] };
  engagementActivity: {
    score: number;
    max: number;
    details: Record<string, number>;
  };
  totalScore: number;
  grade: string;
}

interface OnboardingProgress {
  steps: { key: string; label: string; completed: boolean; category: string }[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  categories: Record<string, { completed: number; total: number }>;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  achieved: boolean;
  progress: number;
  target: number;
  current: number;
}

interface RfqFunnel {
  totalTargeted: number;
  viewed: number;
  responded: number;
  viewRate: number;
  responseRate: number;
  avgResponseTimeHours: number | null;
  periodBreakdown: {
    period: string;
    targeted: number;
    viewed: number;
    responded: number;
  }[];
}

interface SellerNote {
  id: string;
  note: string;
  category: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

interface SellerProfile {
  shop: any;
  performance: any;
  badges: any[];
  recentOrders: any[];
  rfqFunnel: RfqFunnel;
  healthScore: HealthScore;
  onboarding: OnboardingProgress;
  milestones: Milestone[];
}

/* ─── HELPERS ─── */

const tierColor: Record<string, string> = {
  STANDARD: "bg-gray-100 text-gray-800",
  SILVER: "bg-slate-200 text-slate-800",
  GOLD: "bg-yellow-100 text-yellow-800",
  ELITE: "bg-purple-100 text-purple-800",
};

const gradeColor: Record<string, string> = {
  A: "text-green-600",
  B: "text-blue-600",
  C: "text-yellow-600",
  D: "text-orange-600",
  F: "text-red-600",
};

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─── MAIN COMPONENT ─── */

export function AdminSellerCRM() {
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Profile drawer
  const [selectedSeller, setSelectedSeller] = useState<SellerProfile | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [notes, setNotes] = useState<SellerNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("GENERAL");

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, sortBy };
      if (search) params.search = search;
      if (tierFilter !== "all") params.tier = tierFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await adminApi.getSellers(params);
      setSellers(res.data.shops);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load sellers" });
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, statusFilter, sortBy, page]);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getSellerStats();
      setStats(res.data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => loadSellers(), 300);
    return () => clearTimeout(timer);
  }, [loadSellers]);

  const openProfile = async (shopId: string) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const results = await Promise.allSettled([
        adminApi.getSellerProfile(shopId),
        adminApi.getSellerNotes(shopId),
      ]);
      if (results[0].status === "fulfilled") {
        setSelectedSeller(results[0].value.data);
      } else {
        console.warn("Failed to load seller profile:", results[0].reason);
        toast({ variant: "destructive", title: "Failed to load seller profile" });
      }
      if (results[1].status === "fulfilled") {
        setNotes(results[1].value.data || []);
      } else {
        console.warn("Failed to load seller notes:", results[1].reason);
        setNotes([]);
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to load seller profile" });
    } finally {
      setDrawerLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedSeller?.shop?.id) return;
    try {
      const res = await adminApi.addSellerNote(selectedSeller.shop.id, {
        note: newNote.trim(),
        category: noteCategory,
      });
      setNotes([res.data, ...notes]);
      setNewNote("");
      toast({ title: "Note added" });
    } catch {
      toast({ variant: "destructive", title: "Failed to add note" });
    }
  };

  const exportCSV = async () => {
    try {
      const res = await adminApi.getSellerExport();
      const data: any[] = res.data;
      if (!data.length) {
        toast({ title: "No data to export" });
        return;
      }
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sellers-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Export failed" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══ STATS ROW ═══ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Sellers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.active}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {stats.inactive}
              </p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.verified}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.tiers?.GOLD || 0}</p>
              <p className="text-xs text-muted-foreground">Gold Tier</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.tiers?.ELITE || 0}
              </p>
              <p className="text-xs text-muted-foreground">Elite Tier</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {formatCurrency(stats.avgRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {stats.avgRating}
                <Star className="h-3 w-3 inline ml-1 text-yellow-500" />
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ FILTERS ═══ */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops, phone, email, city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={tierFilter}
          onValueChange={(v) => {
            setTierFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="STANDARD">Standard</SelectItem>
            <SelectItem value="SILVER">Silver</SelectItem>
            <SelectItem value="GOLD">Gold</SelectItem>
            <SelectItem value="ELITE">Elite</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="onHold">On Hold</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Newest</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="orders">Orders</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* ═══ SELLERS TABLE ═══ */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No sellers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openProfile(s.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {s.profileImage ? (
                            <img
                              src={s.profileImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.shopName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.city}
                            {s.owner && (
                              <span>
                                {" "}
                                · {s.owner.firstName} {s.owner.lastName}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={tierColor[s.sellerTier] || ""}
                      >
                        {s.sellerTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-bold text-sm ${s.healthScore >= 70 ? "text-green-600" : s.healthScore >= 50 ? "text-yellow-600" : "text-red-600"}`}
                        >
                          {s.healthScore}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /100
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {s.performance?.totalOrders || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatCurrency(s.performance?.totalRevenue || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm flex items-center gap-1">
                        {(s.performance?.avgRating || 0).toFixed(1)}
                        <Star className="h-3 w-3 text-yellow-500" />
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.isVerified && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 text-xs"
                          >
                            Verified
                          </Badge>
                        )}
                        {s.isOnHold && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 text-xs"
                          >
                            On Hold
                          </Badge>
                        )}
                        {!s.isActive && (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-800 text-xs"
                          >
                            Inactive
                          </Badge>
                        )}
                        {s.isActive && !s.isOnHold && !s.isVerified && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProfile(s.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of{" "}
            {total}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ SELLER PROFILE DRAWER ═══ */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {drawerLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedSeller ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Store className="h-5 w-5" />
                  {selectedSeller.shop?.shopName}
                  {selectedSeller.shop?.isVerified && (
                    <Shield className="h-4 w-4 text-green-600" />
                  )}
                  <Badge
                    variant="secondary"
                    className={tierColor[selectedSeller.shop?.sellerTier] || ""}
                  >
                    {selectedSeller.shop?.sellerTier}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="rfq">RFQ Funnel</TabsTrigger>
                  <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                {/* ─── OVERVIEW TAB ─── */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Health Score Card */}
                  {selectedSeller.healthScore ? (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Heart className="h-4 w-4" /> Health Score
                          </h3>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-3xl font-bold ${gradeColor[selectedSeller.healthScore.grade] || ""}`}
                            >
                              {selectedSeller.healthScore.totalScore}
                            </span>
                            <span
                              className={`text-lg font-bold ${gradeColor[selectedSeller.healthScore.grade] || ""}`}
                            >
                              ({selectedSeller.healthScore.grade})
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          {(
                            [
                              {
                                label: "Profile",
                                data: selectedSeller.healthScore
                                  .profileCompleteness,
                              },
                              {
                                label: "Performance",
                                data: selectedSeller.healthScore
                                  .performanceMetrics,
                              },
                              {
                                label: "Verification",
                                data: selectedSeller.healthScore
                                  .verificationStatus,
                              },
                              {
                                label: "Capabilities",
                                data: selectedSeller.healthScore
                                  .capabilitySetup,
                              },
                              {
                                label: "Engagement",
                                data: selectedSeller.healthScore
                                  .engagementActivity,
                              },
                            ] as {
                              label: string;
                              data:
                                | { score: number; max: number }
                                | null
                                | undefined;
                            }[]
                          ).map((item) => {
                            const score = item.data?.score ?? 0;
                            const max = item.data?.max ?? 1;
                            return (
                              <div key={item.label} className="text-center">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {item.label}
                                </p>
                                <p className="font-bold text-sm">
                                  {score}/{max}
                                </p>
                                <Progress
                                  value={max > 0 ? (score / max) * 100 : 0}
                                  className="h-1.5 mt-1"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-4 text-center text-muted-foreground">
                        <Heart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">
                          Health score not available for this shop yet
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <ShoppingBag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xl font-bold">
                          {selectedSeller.performance?.totalOrders ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Orders
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            selectedSeller.performance?.totalRevenue ?? 0,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <Star className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                        <p className="text-xl font-bold">
                          {(selectedSeller.performance?.avgRating ?? 0).toFixed(
                            1,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg Rating
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <XCircle className="h-4 w-4 mx-auto mb-1 text-red-400" />
                        <p className="text-xl font-bold">
                          {(
                            selectedSeller.performance?.cancellationRate ?? 0
                          ).toFixed(1)}
                          %
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cancellation
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shop Info + Badges */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">
                          Shop Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            {selectedSeller.shop?.city || "N/A"},{" "}
                            {selectedSeller.shop?.state ||
                              selectedSeller.shop?.country ||
                              "N/A"}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {selectedSeller.shop?.contactPhone || "Not set"}
                          </p>
                          {selectedSeller.shop?.contactEmail && (
                            <p className="flex items-center gap-2">
                              {selectedSeller.shop.contactEmail}
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Owner: {selectedSeller.shop?.user?.firstName ||
                              ""}{" "}
                            {selectedSeller.shop?.user?.lastName || ""}
                          </p>
                          {selectedSeller.shop?.createdAt && (
                            <p className="text-muted-foreground">
                              Joined:{" "}
                              {formatDate(selectedSeller.shop.createdAt)}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">
                          Badges ({(selectedSeller.badges || []).length})
                        </h4>
                        {(selectedSeller.badges || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No badges earned yet
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(selectedSeller.badges || []).map((b: any) => (
                              <Badge
                                key={b.id}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                <Award className="h-3 w-3" />
                                {b.badgeType.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Orders */}
                  {(selectedSeller.recentOrders || []).length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">
                          Recent Orders
                        </h4>
                        <div className="space-y-2">
                          {selectedSeller.recentOrders
                            .slice(0, 5)
                            .map((o: any) => (
                              <div
                                key={o.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div>
                                  <span className="font-mono text-xs">
                                    #{o.orderNumber}
                                  </span>
                                  <span className="text-muted-foreground ml-2">
                                    {o.customer?.firstName || o.buyer?.firstName}{" "}
                                    {o.customer?.lastName || o.buyer?.lastName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {o.status}
                                  </Badge>
                                  <span>{formatCurrency(o.totalPriceNpr || o.totalNpr || 0)}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ─── INSIGHTS TAB (Engagement Recommendations, Churn Risk, Quick Actions) ─── */}
                <TabsContent value="insights" className="space-y-4 mt-4">
                  {/* Churn Risk Indicator */}
                  {(() => {
                    const s = selectedSeller!;
                    const hs = s.healthScore?.totalScore ?? 0;
                    const orders = s.performance?.totalOrders ?? 0;
                    const cancRate = s.performance?.cancellationRate ?? 0;
                    const rating = s.performance?.avgRating ?? 0;
                    const isOnHold = s.shop?.isOnHold;

                    // Calculate churn risk
                    let riskScore = 0;
                    if (hs < 30) riskScore += 40;
                    else if (hs < 50) riskScore += 20;
                    else if (hs < 70) riskScore += 10;
                    if (orders === 0) riskScore += 25;
                    else if (orders < 3) riskScore += 15;
                    if (cancRate > 30) riskScore += 20;
                    else if (cancRate > 15) riskScore += 10;
                    if (rating > 0 && rating < 2.5) riskScore += 15;
                    else if (rating > 0 && rating < 3.5) riskScore += 5;
                    if (isOnHold) riskScore += 10;
                    const risk =
                      riskScore >= 60
                        ? "HIGH"
                        : riskScore >= 30
                          ? "MEDIUM"
                          : "LOW";
                    const riskColor =
                      risk === "HIGH"
                        ? "text-red-600 bg-red-50 border-red-200"
                        : risk === "MEDIUM"
                          ? "text-amber-600 bg-amber-50 border-amber-200"
                          : "text-green-600 bg-green-50 border-green-200";
                    const riskIcon =
                      risk === "HIGH" ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : risk === "MEDIUM" ? (
                        <TrendingDown className="h-5 w-5" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      );

                    return (
                      <Card className={`border ${riskColor}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {riskIcon}
                              <div>
                                <h3 className="font-semibold">
                                  Churn Risk: {risk}
                                </h3>
                                <p className="text-xs opacity-75">
                                  Score: {riskScore}/100 —{" "}
                                  {risk === "HIGH"
                                    ? "Immediate attention needed"
                                    : risk === "MEDIUM"
                                      ? "Monitor closely"
                                      : "Healthy seller"}
                                </p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold">
                              {riskScore}
                            </span>
                          </div>
                          {riskScore > 0 && (
                            <Progress value={riskScore} className="h-2 mt-3" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Engagement Recommendations */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Engagement Recommendations
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          const tips: {
                            icon: React.ReactNode;
                            text: string;
                            priority: string;
                          }[] = [];
                          const hs = selectedSeller!.healthScore;
                          const perf = selectedSeller!.performance;
                          const onb = selectedSeller!.onboarding;
                          const rfq = selectedSeller!.rfqFunnel;

                          // Profile completeness
                          if (
                            hs &&
                            hs.profileCompleteness &&
                            hs.profileCompleteness.score <
                              hs.profileCompleteness.max
                          ) {
                            const missing =
                              hs.profileCompleteness.missing || [];
                            tips.push({
                              icon: <Users className="h-4 w-4 text-blue-500" />,
                              text: `Complete shop profile — ${missing.length > 0 ? `missing: ${missing.slice(0, 3).join(", ")}` : "profile is incomplete"}`,
                              priority: "HIGH",
                            });
                          }

                          // No products
                          if (
                            !selectedSeller!.shop?.inventoryCount &&
                            (selectedSeller as any).counts?.inventoryItems === 0
                          ) {
                            tips.push({
                              icon: (
                                <ShoppingBag className="h-4 w-4 text-purple-500" />
                              ),
                              text: "Add products to inventory — shops with listings get 5x more visibility",
                              priority: "HIGH",
                            });
                          }

                          // Low rating
                          if (
                            perf &&
                            perf.avgRating > 0 &&
                            perf.avgRating < 3.5
                          ) {
                            tips.push({
                              icon: (
                                <Star className="h-4 w-4 text-yellow-500" />
                              ),
                              text: `Improve customer satisfaction — current rating is ${perf.avgRating.toFixed(1)}★. Consider faster response times`,
                              priority: "MEDIUM",
                            });
                          }

                          // High cancellation
                          if (perf && perf.cancellationRate > 15) {
                            tips.push({
                              icon: (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ),
                              text: `Reduce cancellation rate (${perf.cancellationRate.toFixed(1)}%) — review order fulfillment process`,
                              priority: "HIGH",
                            });
                          }

                          // Low RFQ response
                          if (
                            rfq &&
                            rfq.totalTargeted > 0 &&
                            rfq.responseRate < 50
                          ) {
                            tips.push({
                              icon: (
                                <MessageSquare className="h-4 w-4 text-indigo-500" />
                              ),
                              text: `Respond to more RFQs — ${rfq.responseRate}% response rate, aim for 80%+`,
                              priority: "MEDIUM",
                            });
                          }

                          // Low onboarding
                          if (onb && onb.percentage < 60) {
                            tips.push({
                              icon: (
                                <Target className="h-4 w-4 text-orange-500" />
                              ),
                              text: `Complete onboarding (${onb.percentage}%) — fully onboarded sellers earn 3x more`,
                              priority: "MEDIUM",
                            });
                          }

                          // Verification
                          if (!selectedSeller!.shop?.isVerified) {
                            tips.push({
                              icon: (
                                <Shield className="h-4 w-4 text-green-500" />
                              ),
                              text: "Get KYC verified — verified shops appear higher in search results",
                              priority: "HIGH",
                            });
                          }

                          // Capability setup
                          if (
                            hs &&
                            hs.capabilitySetup &&
                            hs.capabilitySetup.score <
                              hs.capabilitySetup.max * 0.5
                          ) {
                            tips.push({
                              icon: <Award className="h-4 w-4 text-teal-500" />,
                              text: "Set up capabilities — add supported materials, jewellery types, and build methods",
                              priority: "LOW",
                            });
                          }

                          if (tips.length === 0) {
                            return (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                <CheckCircle className="h-4 w-4 inline mr-1 text-green-500" />
                                Great job! This seller is well-engaged with no
                                urgent recommendations.
                              </p>
                            );
                          }

                          // Sort by priority
                          const priorityOrder: Record<string, number> = {
                            HIGH: 0,
                            MEDIUM: 1,
                            LOW: 2,
                          };
                          tips.sort(
                            (a, b) =>
                              (priorityOrder[a.priority] ?? 99) -
                              (priorityOrder[b.priority] ?? 99),
                          );

                          return tips.map((tip, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50"
                            >
                              <div className="mt-0.5">{tip.icon}</div>
                              <div className="flex-1">
                                <p className="text-sm">{tip.text}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs shrink-0 ${
                                  tip.priority === "HIGH"
                                    ? "border-red-300 text-red-600"
                                    : tip.priority === "MEDIUM"
                                      ? "border-amber-300 text-amber-600"
                                      : "border-gray-300 text-gray-600"
                                }`}
                              >
                                {tip.priority}
                              </Badge>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4" />
                        Quick Actions
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            if (
                              selectedSeller!.shop?.contactEmail ||
                              selectedSeller!.shop?.user?.email
                            ) {
                              window.open(
                                `mailto:${selectedSeller!.shop?.contactEmail || selectedSeller!.shop?.user?.email}?subject=Orivraa%20Seller%20Support`,
                                "_blank",
                              );
                            } else {
                              toast({ title: "No email address available" });
                            }
                          }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Send Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            if (
                              selectedSeller!.shop?.contactPhone ||
                              selectedSeller!.shop?.user?.phone
                            ) {
                              window.open(
                                `tel:${selectedSeller!.shop?.contactPhone || selectedSeller!.shop?.user?.phone}`,
                              );
                            } else {
                              toast({ title: "No phone number available" });
                            }
                          }}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call Seller
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`justify-start gap-2 ${selectedSeller!.shop?.isOnHold ? "text-green-600" : "text-amber-600"}`}
                          onClick={async () => {
                            if (!selectedSeller!.shop?.id) return;
                            try {
                              await adminApi.updateSeller(
                                selectedSeller!.shop.id,
                                {
                                  isOnHold: !selectedSeller!.shop.isOnHold,
                                },
                              );
                              toast({
                                title: selectedSeller!.shop.isOnHold
                                  ? "Hold removed"
                                  : "Shop put on hold",
                                description: selectedSeller!.shop.isOnHold
                                  ? "The shop is no longer on hold."
                                  : "The shop has been placed on hold.",
                              });
                              setDrawerOpen(false);
                              loadSellers();
                            } catch {
                              toast({
                                variant: "destructive",
                                title: "Failed to update hold status",
                              });
                            }
                          }}
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          {selectedSeller!.shop?.isOnHold
                            ? "Remove Hold"
                            : "Put on Hold"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            setNewNote("Follow-up scheduled: ");
                            setNoteCategory("ENGAGEMENT");
                            // Switch to notes tab
                            const notesTab = document.querySelector(
                              '[role="tab"][value="notes"]',
                            ) as HTMLButtonElement;
                            if (notesTab) notesTab.click();
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Schedule Follow-up
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => {
                            setNewNote("Performance review: ");
                            setNoteCategory("PERFORMANCE");
                            const notesTab = document.querySelector(
                              '[role="tab"][value="notes"]',
                            ) as HTMLButtonElement;
                            if (notesTab) notesTab.click();
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Performance Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2"
                          onClick={exportCSV}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── MILESTONES TAB ─── */}
                <TabsContent value="milestones" className="space-y-4 mt-4">
                  {(selectedSeller.milestones || []).length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-center text-muted-foreground">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">
                          No milestones data available yet
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(selectedSeller.milestones || []).map((m) => (
                          <Card
                            key={m.id}
                            className={
                              m.achieved
                                ? "border-green-200 bg-green-50/50"
                                : ""
                            }
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{m.icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">
                                      {m.title}
                                    </h4>
                                    {m.achieved ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.round(m.progress)}%
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {m.description}
                                  </p>
                                  {!m.achieved && (
                                    <Progress
                                      value={m.progress}
                                      className="h-1.5 mt-2"
                                    />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        <Trophy className="h-4 w-4 inline mr-1" />
                        {
                          (selectedSeller.milestones || []).filter(
                            (m) => m.achieved,
                          ).length
                        }{" "}
                        of {(selectedSeller.milestones || []).length} achieved
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ─── RFQ FUNNEL TAB ─── */}
                <TabsContent value="rfq" className="space-y-4 mt-4">
                  {selectedSeller.rfqFunnel ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Card>
                          <CardContent className="p-3 text-center">
                            <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xl font-bold">
                              {selectedSeller.rfqFunnel.totalTargeted}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Targeted
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xl font-bold">
                              {selectedSeller.rfqFunnel.viewed}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Viewed
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xl font-bold">
                              {selectedSeller.rfqFunnel.responded}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Responded
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xl font-bold">
                              {selectedSeller.rfqFunnel.responseRate}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Response Rate
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xl font-bold">
                              {selectedSeller.rfqFunnel.avgResponseTimeHours
                                ? `${selectedSeller.rfqFunnel.avgResponseTimeHours}h`
                                : "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Avg Response
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Weekly Breakdown */}
                      {(selectedSeller.rfqFunnel.periodBreakdown || []).length >
                        0 && (
                        <Card>
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-sm mb-3">
                              Weekly Breakdown
                            </h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Period</TableHead>
                                  <TableHead className="text-center">
                                    Targeted
                                  </TableHead>
                                  <TableHead className="text-center">
                                    Viewed
                                  </TableHead>
                                  <TableHead className="text-center">
                                    Responded
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedSeller.rfqFunnel.periodBreakdown.map(
                                  (w) => (
                                    <TableRow key={w.period}>
                                      <TableCell className="text-sm">
                                        {w.period}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {w.targeted}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {w.viewed}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {w.responded}
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-4 text-center text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">
                          No RFQ funnel data available yet
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ─── ONBOARDING TAB ─── */}
                <TabsContent value="onboarding" className="space-y-4 mt-4">
                  {selectedSeller.onboarding ? (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">Onboarding Progress</h3>
                          <span className="text-2xl font-bold">
                            {selectedSeller.onboarding.percentage}%
                          </span>
                        </div>
                        <Progress
                          value={selectedSeller.onboarding.percentage}
                          className="h-2 mb-4"
                        />

                        {Object.entries(
                          selectedSeller.onboarding.categories || {},
                        ).map(([cat, data]) => (
                          <div key={cat} className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium">{cat}</h4>
                              <span className="text-xs text-muted-foreground">
                                {(data as any).completed}/{(data as any).total}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {(selectedSeller.onboarding?.steps || [])
                                .filter((s) => s.category === cat)
                                .map((step) => (
                                  <div
                                    key={step.key}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    {step.completed ? (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                                    )}
                                    <span
                                      className={
                                        step.completed
                                          ? "text-muted-foreground line-through"
                                          : ""
                                      }
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-4 text-center text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">
                          No onboarding data available yet
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ─── NOTES TAB ─── */}
                <TabsContent value="notes" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Add Note</h4>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Write a note about this seller..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <Select
                            value={noteCategory}
                            onValueChange={setNoteCategory}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GENERAL">General</SelectItem>
                              <SelectItem value="PERFORMANCE">
                                Performance
                              </SelectItem>
                              <SelectItem value="COMPLIANCE">
                                Compliance
                              </SelectItem>
                              <SelectItem value="SUPPORT">Support</SelectItem>
                              <SelectItem value="ENGAGEMENT">
                                Engagement
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={addNote}
                            disabled={!newNote.trim()}
                          >
                            Add Note
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {notes.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">
                      No notes yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <Card key={n.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm">{n.note}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {n.author.firstName} {n.author.lastName} ·{" "}
                                  {formatDate(n.createdAt)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {n.category}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
