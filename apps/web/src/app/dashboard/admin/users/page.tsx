"use client";

import { UserDetailSheet } from "@/components/admin/UserDetailSheet";
import { AdminCustomersCRM } from "@/components/admin/AdminCustomersCRM";
import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import api, { adminApi, sellerSubscriptionsApi } from "@/lib/api";
import {
  AlertCircle, Calendar, CheckCircle, Clock, Eye, Loader2,
  Mail, Pencil, Phone, Plus, Search, Shield, ShieldAlert, ShieldCheck,
  Store, Trash2, User, UserCheck, Users, UserX, Wifi, XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ShopData {
  id: string; shopName: string; city: string; address: string;
  country: string; contactPhone: string; contactEmail: string;
  isVerified: boolean; isActive: boolean; createdAt: string; updatedAt: string;
  supportedMaterials?: string[]; supportedJewelleryTypes?: string[];
  supportedMethods?: string[]; codMaxValueNpr?: number;
}

interface UserData {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string; phoneVerifiedAt?: string;
  role: "ADMIN" | "SHOPKEEPER" | "CUSTOMER" | "SUPPORT";
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "DEACTIVATED";
  preferredLanguage?: string; preferredCurrency?: string; preferredCountry?: string;
  preferredCity?: string; createdAt: string; updatedAt?: string; lastLoginAt?: string;
  shop?: ShopData; shops?: ShopData[];
  sessionSummary?: {
    totalSessions: number; totalTimeSec: number; totalPageViews: number;
    avgSessionSec: number; lastSeen: string | null; isOnlineNow: boolean;
  };
  riskScore?: { score: number; level: "LOW" | "MEDIUM" | "HIGH"; chatViolations: number; recentSecurityEvents: number };
}

interface UserSubscriptionSummary {
  status: string;
  planName: string;
  currentPeriodEnd?: string;
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" | undefined }) {
  if (!level) return null;
  if (level === "HIGH") return <Badge className="bg-red-100 text-red-700 text-xs gap-1"><ShieldAlert className="h-3 w-3" />High</Badge>;
  if (level === "MEDIUM") return <Badge className="bg-amber-100 text-amber-700 text-xs gap-1"><AlertCircle className="h-3 w-3" />Med</Badge>;
  return <Badge className="bg-green-100 text-green-700 text-xs gap-1"><ShieldCheck className="h-3 w-3" />Low</Badge>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [subscriptionByEmail, setSubscriptionByEmail] = useState<Record<string, UserSubscriptionSummary>>({});

  // Create user
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "", password: "", firstName: "", lastName: "", phone: "",
    role: "CUSTOMER" as "ADMIN" | "SHOPKEEPER" | "CUSTOMER" | "SUPPORT",
  });
  const [isCheckingNewEmail, setIsCheckingNewEmail] = useState(false);
  const [newEmailAvailable, setNewEmailAvailable] = useState<boolean | null>(null);
  const [newEmailError, setNewEmailError] = useState<string | null>(null);
  const [isCheckingNewPhone, setIsCheckingNewPhone] = useState(false);
  const [newPhoneAvailable, setNewPhoneAvailable] = useState<boolean | null>(null);
  const [newPhoneError, setNewPhoneError] = useState<string | null>(null);
  const newEmailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const newPhoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // View/Edit
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [editForm, setEditForm] = useState({ email: "", firstName: "", lastName: "", phone: "", role: "CUSTOMER" as string, status: "ACTIVE" as string });
  const [savingUser, setSavingUser] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Add shop
  const [addShopDialogOpen, setAddShopDialogOpen] = useState(false);
  const [addingShop, setAddingShop] = useState(false);
  const [newShopForm, setNewShopForm] = useState({
    shopName: "", city: "", address: "", contactPhone: "", contactEmail: "",
    country: "NP", state: "", pincode: "", isVerified: true,
  });
  const [deleteShopId, setDeleteShopId] = useState<string | null>(null);
  const [deletingShop, setDeletingShop] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  // Bulk actions
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => { loadUsers(); loadOnlineCount(); }, []);

  const filterUsers = useCallback(() => {
    let filtered = [...users];
    if (roleFilter !== "all") filtered = filtered.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") filtered = filtered.filter((u) => u.status === "ACTIVE");
    else if (statusFilter === "suspended") filtered = filtered.filter((u) => u.status === "SUSPENDED");
    else if (statusFilter === "pending") filtered = filtered.filter((u) => u.status === "PENDING_VERIFICATION");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.phone?.includes(q),
      );
    }
    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, statusFilter]);

  useEffect(() => { filterUsers(); }, [filterUsers]);

  const loadOnlineCount = async () => {
    try {
      const res = await adminApi.getOnlineNow();
      setOnlineCount(res.data.onlineNow ?? 0);
    } catch { /* silent */ }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, subscriptionsResponse] = await Promise.all([
        api.get("/users"),
        sellerSubscriptionsApi.listAll({ page: 1, limit: 400 }).catch(() => ({ data: [] })),
      ]);

      const subscriptionRows = Array.isArray(subscriptionsResponse.data?.data)
        ? subscriptionsResponse.data.data
        : Array.isArray(subscriptionsResponse.data)
          ? subscriptionsResponse.data
          : [];

      const statusPriority: Record<string, number> = {
        ACTIVE: 5,
        TRIALING: 4,
        PAST_DUE: 3,
        CANCELED: 2,
        INACTIVE: 1,
      };

      const nextSubscriptionByEmail: Record<string, UserSubscriptionSummary> = {};
      for (const subscription of subscriptionRows) {
        const ownerEmail = (
          subscription?.shop?.user?.email ||
          subscription?.shop?.owner?.email ||
          ""
        ).toLowerCase();
        if (!ownerEmail) continue;

        const candidate: UserSubscriptionSummary = {
          status: subscription?.status || "UNKNOWN",
          planName: subscription?.plan?.displayName || subscription?.plan?.name || "Plan",
          currentPeriodEnd: subscription?.currentPeriodEnd,
        };

        const existing = nextSubscriptionByEmail[ownerEmail];
        if (!existing) {
          nextSubscriptionByEmail[ownerEmail] = candidate;
          continue;
        }

        const currentPriority = statusPriority[candidate.status] || 0;
        const existingPriority = statusPriority[existing.status] || 0;
        if (currentPriority > existingPriority) {
          nextSubscriptionByEmail[ownerEmail] = candidate;
          continue;
        }

        const candidateEnd = candidate.currentPeriodEnd ? new Date(candidate.currentPeriodEnd).getTime() : 0;
        const existingEnd = existing.currentPeriodEnd ? new Date(existing.currentPeriodEnd).getTime() : 0;
        if (currentPriority === existingPriority && candidateEnd > existingEnd) {
          nextSubscriptionByEmail[ownerEmail] = candidate;
        }
      }

      setSubscriptionByEmail(nextSubscriptionByEmail);

      const response = usersResponse;
      let usersArr = response.data?.data || response.data?.users || response.data || [];
      if (!Array.isArray(usersArr)) usersArr = [];
      setUsers(usersArr);
    } catch {
      toast({ variant: "destructive", title: "Failed to load users", description: "Could not fetch user data" });
    } finally { setIsLoading(false); }
  };

  const filterUsers = () => {
    let filtered = [...users];
    if (roleFilter !== "all") filtered = filtered.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") filtered = filtered.filter((u) => u.status === "ACTIVE");
    else if (statusFilter === "suspended") filtered = filtered.filter((u) => u.status === "SUSPENDED");
    else if (statusFilter === "pending") filtered = filtered.filter((u) => u.status === "PENDING_VERIFICATION");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.phone?.includes(q),
      );
    }
    setFilteredUsers(filtered);
  };

  const handleViewUser = async (user: UserData) => {
    setSelectedUser(null);
    setSheetOpen(true);
    setLoadingUserDetails(true);
    try {
      const response = await adminApi.getUserDetails(user.id);
      setSelectedUser(response.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load user details" });
      setSheetOpen(false);
    } finally { setLoadingUserDetails(false); }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({ email: user.email, firstName: user.firstName || "", lastName: user.lastName || "", phone: user.phone || "", role: user.role, status: user.status });
    setEmailAvailable(null); setEmailError(null); setIsCheckingEmail(false);
    setPhoneAvailable(null); setPhoneError(null); setIsCheckingPhone(false);
    setEditDialogOpen(true);
  };

  const checkEmailAvailability = useCallback(async (email: string, excludeUserId: string) => {
    if (emailCheckTimeoutRef.current) clearTimeout(emailCheckTimeoutRef.current);
    if (!email || email.trim().length < 5 || !email.includes("@")) { setEmailAvailable(null); setEmailError(null); setIsCheckingEmail(false); return; }
    emailCheckTimeoutRef.current = setTimeout(async () => {
      setIsCheckingEmail(true); setEmailError(null);
      try {
        const res = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}&excludeUserId=${excludeUserId}`);
        const exists = res.data?.exists;
        setEmailAvailable(!exists);
        if (exists) setEmailError("This email is already registered to another user");
      } catch { setEmailError("Could not verify email availability"); setEmailAvailable(null); }
      finally { setIsCheckingEmail(false); }
    }, 500);
  }, []);

  const checkPhoneAvailability = useCallback(async (phone: string, excludeUserId: string) => {
    if (phoneCheckTimeoutRef.current) clearTimeout(phoneCheckTimeoutRef.current);
    const digits = phone.replace(/\D/g, "");
    if (!phone || digits.length < 10) { setPhoneAvailable(null); setPhoneError(null); setIsCheckingPhone(false); return; }
    phoneCheckTimeoutRef.current = setTimeout(async () => {
      setIsCheckingPhone(true); setPhoneError(null);
      try {
        const res = await api.get(`/auth/check-phone?phone=${encodeURIComponent(phone)}&excludeUserId=${excludeUserId}`);
        const exists = res.data?.exists;
        setPhoneAvailable(!exists);
        if (exists) setPhoneError("This phone number is already registered to another user");
      } catch { setPhoneError("Could not verify phone availability"); setPhoneAvailable(null); }
      finally { setIsCheckingPhone(false); }
    }, 500);
  }, []);

  const checkNewEmailAvailability = useCallback(async (email: string) => {
    if (newEmailCheckTimeoutRef.current) clearTimeout(newEmailCheckTimeoutRef.current);
    if (!email || email.trim().length < 5 || !email.includes("@")) { setNewEmailAvailable(null); setNewEmailError(null); setIsCheckingNewEmail(false); return; }
    newEmailCheckTimeoutRef.current = setTimeout(async () => {
      setIsCheckingNewEmail(true); setNewEmailError(null);
      try {
        const res = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
        const exists = res.data?.exists;
        setNewEmailAvailable(!exists);
        if (exists) setNewEmailError("This email is already registered");
      } catch { setNewEmailError("Could not verify email availability"); setNewEmailAvailable(null); }
      finally { setIsCheckingNewEmail(false); }
    }, 500);
  }, []);

  const checkNewPhoneAvailability = useCallback(async (phone: string) => {
    if (newPhoneCheckTimeoutRef.current) clearTimeout(newPhoneCheckTimeoutRef.current);
    const digits = phone.replace(/\D/g, "");
    if (!phone || digits.length < 10) { setNewPhoneAvailable(null); setNewPhoneError(null); setIsCheckingNewPhone(false); return; }
    newPhoneCheckTimeoutRef.current = setTimeout(async () => {
      setIsCheckingNewPhone(true); setNewPhoneError(null);
      try {
        const res = await api.get(`/auth/check-phone?phone=${encodeURIComponent(phone)}`);
        const exists = res.data?.exists;
        setNewPhoneAvailable(!exists);
        if (exists) setNewPhoneError("This phone number is already registered");
      } catch { setNewPhoneError("Could not verify phone availability"); setNewPhoneAvailable(null); }
      finally { setIsCheckingNewPhone(false); }
    }, 500);
  }, []);

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    if (emailAvailable === false || phoneAvailable === false) { toast({ variant: "destructive", title: "Validation Error", description: "Please fix validation errors before saving." }); return; }
    setSavingUser(true);
    try {
      await adminApi.updateUser(selectedUser.id, editForm);
      toast({ title: "User Updated" });
      setEditDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.response?.data?.message || "Could not update user" });
    } finally { setSavingUser(false); }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await adminApi.deleteUser(userToDelete.id);
      toast({ title: "User Deleted" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.response?.data?.message || "Could not delete user" });
    } finally { setDeletingUser(false); }
  };

  const handleTogglePhoneVerification = async () => {
    if (!selectedUser) return;
    setVerifyingPhone(true);
    try {
      const newV = !selectedUser.phoneVerifiedAt;
      const res = await adminApi.setPhoneVerified(selectedUser.id, newV);
      if (res.data?.success) {
        toast({ title: newV ? "Phone Verified" : "Phone Unverified" });
        setSelectedUser({ ...selectedUser, phoneVerifiedAt: newV ? new Date().toISOString() : undefined });
        loadUsers();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Update", description: error.response?.data?.message || "Could not update phone" });
    } finally { setVerifyingPhone(false); }
  };

  const handleAddShop = async () => {
    if (!selectedUser) return;
    if (!newShopForm.shopName || !newShopForm.city || !newShopForm.address || !newShopForm.contactPhone) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in all required fields" }); return;
    }
    setAddingShop(true);
    try {
      const res = await api.post(`/admin/users/${selectedUser.id}/shops`, newShopForm);
      if (res.data?.success) {
        toast({ title: "Shop Created" });
        setAddShopDialogOpen(false);
        setNewShopForm({ shopName: "", city: "", address: "", contactPhone: "", contactEmail: "", country: "NP", state: "", pincode: "", isVerified: true });
        handleViewUser(selectedUser);
        loadUsers();
      } else throw new Error(res.data?.error || "Failed");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || error.message || "Could not create shop" });
    } finally { setAddingShop(false); }
  };

  const handleDeleteShop = async () => {
    if (!selectedUser || !deleteShopId) return;
    setDeletingShop(true);
    try {
      const res = await api.delete(`/admin/users/${selectedUser.id}/shops/${deleteShopId}`);
      if (res.data?.success) {
        toast({ title: "Shop Deleted" });
        setDeleteShopId(null);
        handleViewUser(selectedUser);
        loadUsers();
      } else throw new Error(res.data?.error || "Failed");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || error.message || "Could not delete shop" });
    } finally { setDeletingShop(false); }
  };

  const handleSuspend = async (userId: string) => {
    setProcessingId(userId);
    try {
      await api.patch(`/users/${userId}/suspend`);
      toast({ title: "User Suspended" });
      if (selectedUser?.id === userId) setSelectedUser((u) => u ? { ...u, status: "SUSPENDED" } : u);
      loadUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.response?.data?.message || "Could not suspend" });
    } finally { setProcessingId(null); }
  };

  const handleActivate = async (userId: string) => {
    setProcessingId(userId);
    try {
      await api.patch(`/users/${userId}/activate`);
      toast({ title: "User Activated" });
      if (selectedUser?.id === userId) setSelectedUser((u) => u ? { ...u, status: "ACTIVE" } : u);
      loadUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.response?.data?.message || "Could not activate" });
    } finally { setProcessingId(null); }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName) { toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in all required fields." }); return; }
    if (newEmailAvailable === false || newPhoneAvailable === false) { toast({ variant: "destructive", title: "Validation Error" }); return; }
    setCreatingUser(true);
    try {
      await adminApi.createUser(newUser);
      toast({ title: "User Created" });
      setCreateDialogOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", phone: "", role: "CUSTOMER" });
      setNewEmailAvailable(null); setNewEmailError(null);
      setNewPhoneAvailable(null); setNewPhoneError(null);
      loadUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: error.response?.data?.message || "Could not create user." });
    } finally { setCreatingUser(false); }
  };

  const handleBulkSuspend = async () => {
    if (!selectedUserIds.size) return;
    setBulkActionLoading(true);
    let success = 0;
    for (const id of Array.from(selectedUserIds)) {
      try { await api.patch(`/users/${id}/suspend`); success++; } catch { /* skip */ }
    }
    toast({ title: `Suspended ${success} user(s)` });
    setSelectedUserIds(new Set());
    setBulkActionLoading(false);
    loadUsers();
  };

  const handleBulkExport = () => {
    const toExport = filteredUsers.filter((u) => selectedUserIds.has(u.id));
    const csv = ["ID,Email,First Name,Last Name,Role,Status,Joined",
      ...toExport.map((u) => `${u.id},${u.email},${u.firstName},${u.lastName},${u.role},${u.status},${u.createdAt}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-100 text-purple-700";
      case "SHOPKEEPER": return "bg-amber-100 text-amber-700";
      case "CUSTOMER": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const userStats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    shopkeepers: users.filter((u) => u.role === "SHOPKEEPER").length,
    customers: users.filter((u) => u.role === "CUSTOMER").length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    suspended: users.filter((u) => u.status === "SUSPENDED").length,
  };

  const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
  };
  const toggleSelect = (id: string) => {
    const s = new Set(selectedUserIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedUserIds(s);
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-muted-foreground">View and manage platform users</p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add User</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the platform. They will receive a welcome email.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createEmail">Email *</Label>
                    <div className="relative">
                      <Input id="createEmail" type="email" value={newUser.email}
                        onChange={(e) => { setNewUser((p) => ({ ...p, email: e.target.value })); checkNewEmailAvailability(e.target.value); }}
                        className={newEmailError ? "border-red-500 pr-10" : newEmailAvailable === true ? "border-green-500 pr-10" : ""} />
                      {isCheckingNewEmail && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                      {!isCheckingNewEmail && newEmailAvailable === true && <div className="absolute right-3 top-1/2 -translate-y-1/2"><CheckCircle className="h-4 w-4 text-green-500" /></div>}
                      {!isCheckingNewEmail && newEmailAvailable === false && <div className="absolute right-3 top-1/2 -translate-y-1/2"><AlertCircle className="h-4 w-4 text-red-500" /></div>}
                    </div>
                    {newEmailError && <p className="text-sm text-red-500">{newEmailError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createPhone">Phone</Label>
                    <div className="relative">
                      <Input id="createPhone" type="tel" value={newUser.phone}
                        onChange={(e) => { const v = e.target.value; setNewUser((p) => ({ ...p, phone: v })); if (v.trim()) checkNewPhoneAvailability(v); else { setNewPhoneAvailable(null); setNewPhoneError(null); } }}
                        placeholder="+977 98XXXXXXXX"
                        className={newPhoneError ? "border-red-500 pr-10" : newPhoneAvailable === true ? "border-green-500 pr-10" : ""} />
                      {isCheckingNewPhone && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                      {!isCheckingNewPhone && newPhoneAvailable === true && <div className="absolute right-3 top-1/2 -translate-y-1/2"><CheckCircle className="h-4 w-4 text-green-500" /></div>}
                      {!isCheckingNewPhone && newPhoneAvailable === false && <div className="absolute right-3 top-1/2 -translate-y-1/2"><AlertCircle className="h-4 w-4 text-red-500" /></div>}
                    </div>
                    {newPhoneError && <p className="text-sm text-red-500">{newPhoneError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createPassword">Password *</Label>
                    <Input id="createPassword" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createRole">Role</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser((p) => ({ ...p, role: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                        <SelectItem value="SUPPORT">Support</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setNewEmailAvailable(null); setNewEmailError(null); setNewPhoneAvailable(null); setNewPhoneError(null); }}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={creatingUser || isCheckingNewEmail || isCheckingNewPhone || newEmailAvailable === false || newPhoneAvailable === false}>
                    {creatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Platform Users</TabsTrigger>
              <TabsTrigger value="customers" className="gap-2"><User className="h-4 w-4" />Customers CRM</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6 mt-0">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: "Total Users", value: userStats.total, color: "" },
                  { label: "Admins", value: userStats.admins, color: "text-purple-600" },
                  { label: "Shopkeepers", value: userStats.shopkeepers, color: "text-amber-600" },
                  { label: "Customers", value: userStats.customers, color: "text-blue-600" },
                  { label: "Active", value: userStats.active, color: "text-green-600" },
                  { label: "Suspended", value: userStats.suspended, color: "text-red-600" },
                  { label: "Online Now", value: onlineCount ?? "—", color: "text-emerald-600", dot: true },
                ].map(({ label, value, color, dot }) => (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <div className="flex items-center gap-1.5">
                        {dot && typeof value === "number" && value > 0 && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filters + Bulk Actions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search by name, email or phone…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPPORT">Support</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedUserIds.size > 0 && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground">{selectedUserIds.size} selected</span>
                        <Button size="sm" variant="outline" onClick={handleBulkExport} className="h-8 text-xs">Export CSV</Button>
                        <Button size="sm" variant="outline" onClick={handleBulkSuspend} disabled={bulkActionLoading}
                          className="h-8 text-xs text-amber-600 border-amber-300 hover:bg-amber-50">
                          {bulkActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Bulk Suspend
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No users found.</p></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                          </TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Last Seen</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          
                          <TableRow key={user.id} className={selectedUserIds.has(user.id) ? "bg-muted/40" : ""}>
                            <TableCell>
                              <Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={() => toggleSelect(user.id)} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{user.email}
                                </p>
                                {user.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</p>}
                                {user.shop && <p className="text-xs text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" />{user.shop.shopName}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {user.status === "ACTIVE" ? <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                                : user.status === "SUSPENDED" ? <Badge variant="destructive" className="text-xs">Suspended</Badge>
                                : <Badge variant="secondary" className="text-xs">{user.status}</Badge>}
                            </TableCell>
                            <TableCell>
                              {user.role !== "SHOPKEEPER" ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : (() => {
                                const sub = subscriptionByEmail[user.email.toLowerCase()];
                                if (!sub) return <span className="text-xs text-muted-foreground">No subscription</span>;

                                const statusClass =
                                  sub.status === "ACTIVE"
                                    ? "bg-green-100 text-green-700"
                                    : sub.status === "TRIALING"
                                      ? "bg-blue-100 text-blue-700"
                                      : sub.status === "PAST_DUE"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-gray-100 text-gray-700";

                                return (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium leading-none">{sub.planName}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge className={`text-[10px] px-1.5 py-0 ${statusClass}`}>{sub.status}</Badge>
                                      {sub.currentPeriodEnd && (
                                        <span className="text-[10px] text-muted-foreground">
                                          Ends {formatDate(sub.currentPeriodEnd)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <RiskBadge level={user.riskScore?.level} />
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                {user.sessionSummary?.isOnlineNow ? (
                                  <span className="flex items-center gap-1 text-green-600 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />Online
                                  </span>
                                ) : user.sessionSummary?.lastSeen ? (
                                  <span className="flex items-center gap-1">
                                    <Wifi className="h-3 w-3" />{formatRelative(user.sessionSummary.lastSeen)}
                                  </span>
                                ) : user.lastLoginAt ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />{formatRelative(user.lastLoginAt)}
                                  </span>
                                ) : "Never"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />{formatDate(user.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleViewUser(user)} title="View Details">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} title="Edit User">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {user.role !== "ADMIN" && (user.status === "ACTIVE" ? (
                                  <Button size="sm" variant="ghost" onClick={() => handleSuspend(user.id)} disabled={processingId === user.id} className="text-amber-600 hover:text-amber-700" title="Suspend">
                                    {processingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" onClick={() => handleActivate(user.id)} disabled={processingId === user.id} className="text-green-600 hover:text-green-700" title="Activate">
                                    {processingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                                  </Button>
                                ))}
                                {user.role !== "ADMIN" && (
                                  <Button size="sm" variant="ghost" onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }} className="text-red-600 hover:text-red-700" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="mt-0">
              <AdminCustomersCRM />
            </TabsContent>
          </Tabs>
        </div>

        {/* User Detail Sheet */}
        <UserDetailSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          user={selectedUser}
          loading={loadingUserDetails}
          onEdit={() => { if (selectedUser) { setSheetOpen(false); handleEditUser(selectedUser); } }}
          onSuspend={() => { if (selectedUser) handleSuspend(selectedUser.id); }}
          onActivate={() => { if (selectedUser) handleActivate(selectedUser.id); }}
          onTogglePhoneVerify={handleTogglePhoneVerification}
          onAddShop={() => setAddShopDialogOpen(true)}
          onDeleteShop={(shopId) => setDeleteShopId(shopId)}
          verifyingPhone={verifyingPhone}
        />

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Input type="email" value={editForm.email}
                    onChange={(e) => { setEditForm((p) => ({ ...p, email: e.target.value })); if (selectedUser) checkEmailAvailability(e.target.value, selectedUser.id); }}
                    className={emailError ? "border-red-500 pr-10" : emailAvailable === true ? "border-green-500 pr-10" : ""} />
                  {isCheckingEmail && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                  {!isCheckingEmail && emailAvailable === true && <div className="absolute right-3 top-1/2 -translate-y-1/2"><CheckCircle className="h-4 w-4 text-green-500" /></div>}
                  {!isCheckingEmail && emailAvailable === false && <div className="absolute right-3 top-1/2 -translate-y-1/2"><AlertCircle className="h-4 w-4 text-red-500" /></div>}
                </div>
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Input type="tel" value={editForm.phone}
                    onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, phone: v })); if (selectedUser && v.trim()) checkPhoneAvailability(v, selectedUser.id); else { setPhoneAvailable(null); setPhoneError(null); } }}
                    className={phoneError ? "border-red-500 pr-10" : phoneAvailable === true ? "border-green-500 pr-10" : ""} />
                  {isCheckingPhone && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                  {!isCheckingPhone && phoneAvailable === true && <div className="absolute right-3 top-1/2 -translate-y-1/2"><CheckCircle className="h-4 w-4 text-green-500" /></div>}
                  {!isCheckingPhone && phoneAvailable === false && <div className="absolute right-3 top-1/2 -translate-y-1/2"><AlertCircle className="h-4 w-4 text-red-500" /></div>}
                </div>
                {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                    <SelectItem value="SUPPORT">Support</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveUser} disabled={savingUser || isCheckingEmail || isCheckingPhone || emailAvailable === false || phoneAvailable === false}>
                {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> ({userToDelete?.email}).
                {userToDelete?.shop && <span className="block mt-2 text-amber-600">⚠️ This user has a shop ({userToDelete.shop.shopName}) which will also be deleted.</span>}
                <span className="block mt-2">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} disabled={deletingUser} className="bg-red-600 hover:bg-red-700">
                {deletingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Shop Dialog */}
        <Dialog open={addShopDialogOpen} onOpenChange={setAddShopDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Shop for {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
              <DialogDescription>Create a new shop for this user</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2"><Label>Shop Name *</Label><Input value={newShopForm.shopName} onChange={(e) => setNewShopForm({ ...newShopForm, shopName: e.target.value })} placeholder="Enter shop name" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Country *</Label>
                  <Select value={newShopForm.country} onValueChange={(v) => setNewShopForm({ ...newShopForm, country: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NP">Nepal</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="AE">UAE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>State/Province</Label><Input value={newShopForm.state} onChange={(e) => setNewShopForm({ ...newShopForm, state: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City *</Label><Input value={newShopForm.city} onChange={(e) => setNewShopForm({ ...newShopForm, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Pincode</Label><Input value={newShopForm.pincode} onChange={(e) => setNewShopForm({ ...newShopForm, pincode: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Full Address *</Label><Input value={newShopForm.address} onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contact Phone *</Label><Input value={newShopForm.contactPhone} onChange={(e) => setNewShopForm({ ...newShopForm, contactPhone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contact Email</Label><Input type="email" value={newShopForm.contactEmail} onChange={(e) => setNewShopForm({ ...newShopForm, contactEmail: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="shop-verified" checked={newShopForm.isVerified} onCheckedChange={(c) => setNewShopForm({ ...newShopForm, isVerified: !!c })} />
                <Label htmlFor="shop-verified">Mark as Verified</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddShopDialogOpen(false)} disabled={addingShop}>Cancel</Button>
              <Button onClick={handleAddShop} disabled={addingShop} className="bg-green-600 hover:bg-green-700">
                {addingShop && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Shop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Shop Dialog */}
        <AlertDialog open={!!deleteShopId} onOpenChange={(open) => !open && setDeleteShopId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shop?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this shop and all its data. <span className="block mt-2 text-amber-600">⚠️ This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingShop}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteShop} disabled={deletingShop} className="bg-red-600 hover:bg-red-700">
                {deletingShop && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete Shop
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </AdminGuard>
  );
}
