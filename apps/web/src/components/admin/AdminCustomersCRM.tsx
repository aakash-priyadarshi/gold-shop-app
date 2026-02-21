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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import {
    Calendar,
    Download,
    Eye,
    Loader2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Search,
    ShoppingBag,
    Store,
    User,
    UserCheck,
    Users
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CRMCustomer {
  id: string;
  type: "REGISTERED" | "WALK_IN";
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  shop?: { id: string; name: string; city: string } | null;
  orderCount: number;
  rfqCount: number;
  quoteCount: number;
  totalSpent: number;
  lastActive: string;
  createdAt: string;
}

interface CustomerProfile {
  type: "REGISTERED" | "WALK_IN";
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  country?: string;
  city?: string;
  currency?: string;
  address?: string;
  addresses?: any[];
  shop?: { id: string; shopName: string; city: string } | null;
  purchaseStats?: any[];
  orderCount?: number;
  rfqCount?: number;
  quoteCount?: number;
  recentOrders?: any[];
  recentRfqs?: any[];
  recentQuotes?: any[];
  notes?: string;
  lastActive: string;
  memberSince: string;
}

interface CustomerNote {
  id: string;
  note: string;
  category: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

const NOTE_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "VIP", label: "VIP" },
  { value: "COMPLAINT", label: "Complaint" },
  { value: "PREFERENCE", label: "Preference" },
];

function getEngagementTags(customer: CRMCustomer) {
  const tags: { label: string; variant: string }[] = [];
  const now = new Date();
  const createdAt = new Date(customer.createdAt);
  const lastActive = new Date(customer.lastActive);
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
  );
  const totalActivity =
    customer.orderCount + customer.rfqCount + customer.quoteCount;

  if (daysSinceCreation <= 7) tags.push({ label: "New", variant: "default" });
  if (daysSinceActive > 60) tags.push({ label: "Inactive", variant: "secondary" });
  if (customer.totalSpent > 100000)
    tags.push({ label: "High Value", variant: "destructive" });
  if (totalActivity >= 2) tags.push({ label: "Repeat", variant: "outline" });

  return tags;
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  if (!amount) return "—";
  return `NPR ${amount.toLocaleString()}`;
}

export function AdminCustomersCRM() {
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    registeredTotal: 0,
    walkInTotal: 0,
  });

  // Profile drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("GENERAL");
  const [addingNote, setAddingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCustomers({
        query: searchQuery || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        page,
        limit: 25,
      });
      setCustomers(res.data.customers || []);
      setTotalPages(res.data.totalPages || 1);
      setStats({
        total: res.data.total || 0,
        registeredTotal: res.data.registeredTotal || 0,
        walkInTotal: res.data.walkInTotal || 0,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timeout);
  }, [searchQuery, typeFilter]);

  const openProfile = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setProfileOpen(true);
    setLoadingProfile(true);
    setShowNotes(false);
    try {
      const [profileRes, notesRes] = await Promise.all([
        adminApi.getCustomerProfile(customerId),
        adminApi.getCustomerNotes(customerId),
      ]);
      setProfile(profileRes.data);
      setNotes(notesRes.data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load customer profile",
        variant: "destructive",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCustomerId) return;
    setAddingNote(true);
    try {
      await adminApi.addCustomerNote(selectedCustomerId, {
        note: newNote.trim(),
        category: noteCategory,
      });
      // Refresh notes
      const notesRes = await adminApi.getCustomerNotes(selectedCustomerId);
      setNotes(notesRes.data || []);
      setNewNote("");
      setNoteCategory("GENERAL");
      toast({ title: "Note added" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all customers for export (up to 10000)
      const res = await adminApi.getCustomers({
        query: searchQuery || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        page: 1,
        limit: 10000,
      });
      const data: CRMCustomer[] = res.data.customers || [];
      if (data.length === 0) {
        toast({ title: "No data to export" });
        return;
      }

      const headers = [
        "Name",
        "Type",
        "Phone",
        "Email",
        "City",
        "Country",
        "Shop",
        "Orders",
        "RFQs",
        "Quotes",
        "Total Spent",
        "Last Active",
        "Joined",
      ];
      const rows = data.map((c) => [
        c.name,
        c.type === "REGISTERED" ? "Registered" : "Walk-in",
        c.phone || "",
        c.email || "",
        c.city || "",
        c.country || "",
        c.shop?.name || "",
        c.orderCount,
        c.rfqCount,
        c.quoteCount,
        c.totalSpent,
        formatDate(c.lastActive),
        formatDate(c.createdAt),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${data.length} customers` });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Active in last 30 days
  const activeLast30 = customers.filter((c) => {
    const d = new Date(c.lastActive);
    return (
      new Date().getTime() - d.getTime() < 30 * 24 * 60 * 60 * 1000
    );
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Customers</p>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Registered</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.registeredTotal}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-500" />
              <p className="text-sm text-muted-foreground">Walk-in</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {stats.walkInTotal}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Active (30d)</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{activeLast30}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="walkin">Walk-in</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No customers found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Activity</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const tags = getEngagementTags(customer);
                    const totalActivity =
                      customer.orderCount +
                      customer.rfqCount +
                      customer.quoteCount;
                    return (
                      <TableRow key={`${customer.type}-${customer.id}`}>
                        <TableCell>
                          <div className="font-medium">
                            {customer.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[160px]">
                                  {customer.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.type === "REGISTERED"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {customer.type === "REGISTERED"
                              ? "Registered"
                              : "Walk-in"}
                          </Badge>
                          {customer.shop && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {customer.shop.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.city || customer.country ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {[customer.city, customer.country]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {totalActivity}
                            </span>
                          </div>
                          {customer.totalSpent > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(customer.totalSpent)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tags.length > 0
                              ? tags.map((t) => (
                                  <Badge
                                    key={t.label}
                                    variant={t.variant as any}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {t.label}
                                  </Badge>
                                ))
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(customer.lastActive)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openProfile(customer.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({stats.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Profile
            </DialogTitle>
          </DialogHeader>

          {loadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : profile ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{profile.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        profile.type === "REGISTERED" ? "default" : "secondary"
                      }
                    >
                      {profile.type === "REGISTERED"
                        ? "Registered"
                        : "Walk-in"}
                    </Badge>
                    {profile.status && (
                      <Badge
                        variant={
                          profile.status === "ACTIVE"
                            ? "default"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {profile.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Notes ({notes.length})
                </Button>
              </div>

              {/* Contact Info */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {profile.phone}
                      </div>
                    )}
                    {profile.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {profile.email}
                      </div>
                    )}
                    {(profile.city || profile.country) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {[profile.city, profile.country]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                    {profile.shop && (
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {profile.shop.shopName}, {profile.shop.city}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <span>
                      Member since: {formatDate(profile.memberSince)}
                    </span>
                    <span>Last active: {formatDate(profile.lastActive)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Stats */}
              {(profile.orderCount ||
                profile.rfqCount ||
                profile.quoteCount) && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      Activity Summary
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {profile.type === "REGISTERED" ? (
                        <>
                          <div>
                            <p className="text-2xl font-bold">
                              {profile.orderCount || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Orders
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {profile.rfqCount || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              RFQs
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {profile.purchaseStats?.[0]?.totalSpent
                                ? formatCurrency(
                                    profile.purchaseStats[0].totalSpent,
                                  )
                                : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total Spent
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-3">
                          <p className="text-2xl font-bold">
                            {profile.quoteCount || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Walk-in Quotes
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Orders / Quotes */}
              {profile.recentOrders && profile.recentOrders.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      Recent Orders
                    </h4>
                    <div className="space-y-2">
                      {profile.recentOrders.map((order: any) => (
                        <div
                          key={order.id}
                          className="flex justify-between items-center text-sm border-b last:border-0 pb-2"
                        >
                          <div>
                            <span className="font-medium">
                              #{order.orderNumber}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {order.shop?.shopName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>
                              {formatCurrency(order.totalNpr)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {profile.recentQuotes && profile.recentQuotes.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      Recent Walk-in Quotes
                    </h4>
                    <div className="space-y-2">
                      {profile.recentQuotes.map((q: any) => (
                        <div
                          key={q.id}
                          className="flex justify-between items-center text-sm border-b last:border-0 pb-2"
                        >
                          <div>
                            <span className="font-medium">
                              #{q.quoteNumber}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {q.jewelleryType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>
                              {formatCurrency(q.totalPriceNpr)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {q.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {profile.recentRfqs && profile.recentRfqs.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      Recent RFQs
                    </h4>
                    <div className="space-y-2">
                      {profile.recentRfqs.map((rfq: any) => (
                        <div
                          key={rfq.id}
                          className="flex justify-between items-center text-sm border-b last:border-0 pb-2"
                        >
                          <span className="font-medium">
                            {rfq.jewelleryType}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {formatDate(rfq.createdAt)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {rfq.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CRM Notes Section */}
              {showNotes && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      CRM Notes
                    </h4>

                    {/* Add Note Form */}
                    <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                      <Textarea
                        placeholder="Add a note about this customer..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={2}
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
                            {NOTE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || addingNote}
                        >
                          {addingNote && (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          )}
                          Add Note
                        </Button>
                      </div>
                    </div>

                    {/* Existing Notes */}
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No notes yet
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {notes.map((n) => (
                          <div
                            key={n.id}
                            className="border rounded p-3 text-sm"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {n.category}
                                </Badge>
                                <span className="text-muted-foreground text-xs">
                                  {n.author.firstName} {n.author.lastName}
                                </span>
                              </div>
                              <span className="text-muted-foreground text-xs">
                                {formatDate(n.createdAt)}
                              </span>
                            </div>
                            <p>{n.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Customer not found
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
