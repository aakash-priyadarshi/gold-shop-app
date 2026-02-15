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
  Award,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Target,
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
      const [profileRes, notesRes] = await Promise.all([
        adminApi.getSellerProfile(shopId),
        adminApi.getSellerNotes(shopId),
      ]);
      setSelectedSeller(profileRes.data);
      setNotes(notesRes.data);
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
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="rfq">RFQ Funnel</TabsTrigger>
                  <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                {/* ─── OVERVIEW TAB ─── */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Health Score Card */}
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
                        {[
                          {
                            label: "Profile",
                            ...selectedSeller.healthScore.profileCompleteness,
                          },
                          {
                            label: "Performance",
                            ...selectedSeller.healthScore.performanceMetrics,
                          },
                          {
                            label: "Verification",
                            ...selectedSeller.healthScore.verificationStatus,
                          },
                          {
                            label: "Capabilities",
                            ...selectedSeller.healthScore.capabilitySetup,
                          },
                          {
                            label: "Engagement",
                            ...selectedSeller.healthScore.engagementActivity,
                          },
                        ].map((item) => (
                          <div key={item.label} className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">
                              {item.label}
                            </p>
                            <p className="font-bold text-sm">
                              {item.score}/{item.max}
                            </p>
                            <Progress
                              value={(item.score / item.max) * 100}
                              className="h-1.5 mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <ShoppingBag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xl font-bold">
                          {selectedSeller.performance?.totalOrders || 0}
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
                            selectedSeller.performance?.totalRevenue || 0,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <Star className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                        <p className="text-xl font-bold">
                          {(selectedSeller.performance?.avgRating || 0).toFixed(
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
                            selectedSeller.performance?.cancellationRate || 0
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
                            {selectedSeller.shop?.city},{" "}
                            {selectedSeller.shop?.state ||
                              selectedSeller.shop?.country}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {selectedSeller.shop?.contactPhone}
                          </p>
                          {selectedSeller.shop?.contactEmail && (
                            <p className="flex items-center gap-2">
                              {selectedSeller.shop.contactEmail}
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            Owner: {selectedSeller.shop?.user?.firstName}{" "}
                            {selectedSeller.shop?.user?.lastName}
                          </p>
                          <p className="text-muted-foreground">
                            Joined: {formatDate(selectedSeller.shop?.createdAt)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">
                          Badges ({selectedSeller.badges.length})
                        </h4>
                        {selectedSeller.badges.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No badges earned yet
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedSeller.badges.map((b: any) => (
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
                  {selectedSeller.recentOrders.length > 0 && (
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
                                    {o.buyer?.firstName} {o.buyer?.lastName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {o.status}
                                  </Badge>
                                  <span>{formatCurrency(o.totalPriceNpr)}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ─── MILESTONES TAB ─── */}
                <TabsContent value="milestones" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedSeller.milestones.map((m) => (
                      <Card
                        key={m.id}
                        className={
                          m.achieved ? "border-green-200 bg-green-50/50" : ""
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
                      selectedSeller.milestones.filter((m) => m.achieved).length
                    }{" "}
                    of {selectedSeller.milestones.length} achieved
                  </div>
                </TabsContent>

                {/* ─── RFQ FUNNEL TAB ─── */}
                <TabsContent value="rfq" className="space-y-4 mt-4">
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
                        <p className="text-xs text-muted-foreground">Viewed</p>
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
                  {selectedSeller.rfqFunnel.periodBreakdown.length > 0 && (
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
                </TabsContent>

                {/* ─── ONBOARDING TAB ─── */}
                <TabsContent value="onboarding" className="space-y-4 mt-4">
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

                      {Object.entries(selectedSeller.onboarding.categories).map(
                        ([cat, data]) => (
                          <div key={cat} className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium">{cat}</h4>
                              <span className="text-xs text-muted-foreground">
                                {(data as any).completed}/{(data as any).total}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {selectedSeller.onboarding.steps
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
                        ),
                      )}
                    </CardContent>
                  </Card>
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
