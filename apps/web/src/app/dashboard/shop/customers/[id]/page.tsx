"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { chatApi, customerCrmApi, shopsApi } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Shield,
  ShoppingCart,
  StickyNote,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NOTE_CATEGORIES = [
  { value: "GENERAL", label: "General", color: "bg-gray-100 text-gray-700" },
  {
    value: "PREFERENCE",
    label: "Preference",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "FOLLOW_UP",
    label: "Follow Up",
    color: "bg-yellow-100 text-yellow-700",
  },
  { value: "COMPLAINT", label: "Complaint", color: "bg-red-100 text-red-700" },
  { value: "VIP", label: "VIP", color: "bg-purple-100 text-purple-700" },
];

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { symbol: currencySymbol } = useShopCurrency();
  const { user } = useAuth();

  // New note form
  const [newNote, setNewNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("GENERAL");
  const [addingNote, setAddingNote] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const handleMessageCustomer = async () => {
    if (profile?.type !== "REGISTERED") {
      toast({
        title: "Cannot message walk-in customers",
        description:
          "Only registered customers can be messaged through the platform.",
      });
      return;
    }
    setStartingChat(true);
    try {
      // 1. Check for existing conversation
      const res = await chatApi.listConversations();
      const conversations = res.data || [];
      const existing = conversations.find(
        (c: any) => c.buyer?.id === customerId || c.buyerId === customerId,
      );
      if (existing) {
        router.push(`/dashboard/shop/messages?chat=${existing.id}`);
        return;
      }

      // 2. No existing conversation — create one (requires customer to have orders)
      const shopId = user?.shop?.id;
      if (!shopId) {
        toast({ variant: "destructive", title: "Shop not found" });
        return;
      }
      const convRes = await chatApi.createConversation({
        shopId,
        buyerId: customerId,
      });
      if (convRes.data?.id) {
        router.push(`/dashboard/shop/messages?chat=${convRes.data.id}`);
      } else {
        toast({ variant: "destructive", title: "Failed to create conversation" });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to start conversation";
      toast({ variant: "destructive", title: msg });
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [customerId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, ordersRes, statsRes, notesRes] = await Promise.all([
        customerCrmApi.getCustomerProfile(customerId),
        customerCrmApi
          .getCustomerOrders(customerId)
          .catch(() => ({ data: { orders: [] } })),
        customerCrmApi
          .getCustomerStats(customerId)
          .catch(() => ({ data: null })),
        customerCrmApi.getCustomerNotes(customerId).catch(() => ({ data: [] })),
      ]);
      setProfile(profileRes.data);
      setOrders(ordersRes.data.orders || []);
      setStats(statsRes.data);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load customer" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await customerCrmApi.addCustomerNote(customerId, {
        note: newNote,
        category: noteCategory,
      });
      setNotes([res.data, ...notes]);
      setNewNote("");
      toast({ title: "Note added" });
    } catch {
      toast({ variant: "destructive", title: "Failed to add note" });
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  if (!profile) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <User className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
            <p className="text-muted-foreground">Customer not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        profile.type === "REGISTERED"
                          ? "text-green-600 border-green-200 bg-green-50"
                          : "text-blue-600 border-blue-200 bg-blue-50"
                      }
                    >
                      {profile.type === "REGISTERED" ? "Registered" : "Walk-in"}
                    </Badge>
                    {profile.country && (
                      <span className="text-muted-foreground text-sm">
                        {profile.country}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Message Customer button */}
            {profile.type === "REGISTERED" && (
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleMessageCustomer}
                disabled={startingChat}
              >
                {startingChat ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Message Customer
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar - Contact Info */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {profile.city}
                        {profile.country ? `, ${profile.country}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Customer since{" "}
                    {new Date(profile.memberSince).toLocaleDateString()}
                  </div>
                  <Separator />
                  {profile.type === "REGISTERED" ? (
                    <>
                      <Button
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={handleMessageCustomer}
                        disabled={startingChat}
                      >
                        {startingChat ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4 mr-2" />
                        )}
                        Message Customer
                      </Button>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          Platform Communication Policy
                        </p>
                        <p className="text-xs text-amber-600 leading-relaxed">
                          All customer communication must happen through platform messaging. 
                          Do not share personal contact details (phone numbers, email addresses, 
                          social media) in messages. Violations may result in account suspension.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Walk-in customer — messaging not available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Purchase Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Orders
                      </span>
                      <span className="font-bold">{stats.totalOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Spent
                      </span>
                      <span className="font-bold text-amber-600">
                        {currencySymbol}{" "}
                        {(stats.totalSpent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Avg Order Value
                      </span>
                      <span className="font-medium">
                        {currencySymbol}{" "}
                        {Math.round(
                          stats.averageOrderValue || 0,
                        ).toLocaleString()}
                      </span>
                    </div>
                    {stats.activeRfqs > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Active RFQs
                        </span>
                        <Badge className="bg-blue-500">
                          {stats.activeRfqs}
                        </Badge>
                      </div>
                    )}
                    {stats.firstOrderDate && (
                      <>
                        <Separator />
                        <div className="text-xs text-muted-foreground">
                          First order:{" "}
                          {new Date(stats.firstOrderDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last order:{" "}
                          {new Date(stats.lastOrderDate).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Addresses */}
              {profile.addresses && profile.addresses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Addresses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {profile.addresses.map((addr: any, i: number) => (
                      <div
                        key={i}
                        className="text-sm p-2 rounded border bg-gray-50"
                      >
                        {addr.label && (
                          <span className="font-medium text-xs text-amber-600">
                            {addr.label}
                          </span>
                        )}
                        <p>
                          {addr.addressLine1 || addr.address}
                          {addr.addressLine2 && `, ${addr.addressLine2}`}
                        </p>
                        <p className="text-muted-foreground">
                          {addr.city}
                          {addr.state ? `, ${addr.state}` : ""}
                          {addr.country ? ` — ${addr.country}` : ""}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right content - Tabs */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="orders">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger
                    value="orders"
                    className="flex items-center gap-1"
                  >
                    <ShoppingCart className="h-4 w-4" /> Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="flex items-center gap-1"
                  >
                    <StickyNote className="h-4 w-4" /> Notes
                    {notes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {notes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="stats"
                    className="flex items-center gap-1"
                  >
                    <TrendingUp className="h-4 w-4" /> Analytics
                  </TabsTrigger>
                </TabsList>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-3 mt-4">
                  {orders.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center py-8 text-center">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-30 mb-2" />
                        <p className="text-muted-foreground">
                          No orders from this customer yet
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders.map((order: any) => (
                      <Link
                        key={order.id}
                        href={`/dashboard/shop/orders/${order.id}`}
                      >
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                          <CardContent className="flex items-center justify-between p-4">
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                              <p className="font-bold text-amber-600">
                                {order.displayCurrency || currencySymbol}{" "}
                                {(order.totalNpr || 0).toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4 mt-4">
                  {/* Add Note */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Select
                          value={noteCategory}
                          onValueChange={setNoteCategory}
                        >
                          <SelectTrigger className="w-36">
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
                        <Textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note about this customer..."
                          className="flex-1 min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          disabled={addingNote || !newNote.trim()}
                          className="bg-amber-500 hover:bg-amber-600"
                        >
                          {addingNote ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Add Note
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes List */}
                  {notes.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center py-8 text-center">
                        <MessageSquare className="h-10 w-10 text-muted-foreground opacity-30 mb-2" />
                        <p className="text-muted-foreground">No notes yet</p>
                        <p className="text-sm text-muted-foreground">
                          Add notes about preferences, follow-ups, or VIP status
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    notes.map((note: any) => {
                      const catInfo = NOTE_CATEGORIES.find(
                        (c) => c.value === note.category,
                      );
                      return (
                        <Card key={note.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={catInfo?.color || ""}
                                >
                                  {catInfo?.label || note.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  by {note.author?.firstName}{" "}
                                  {note.author?.lastName}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.createdAt).toLocaleDateString()}{" "}
                                {new Date(note.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {note.note}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="stats" className="mt-4">
                  {stats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <ShoppingCart className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                          <p className="text-2xl font-bold">
                            {stats.totalOrders}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Orders
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <DollarSign className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                          <p className="text-2xl font-bold text-amber-600">
                            {currencySymbol}{" "}
                            {(stats.totalSpent || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Lifetime Value
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
                          <p className="text-2xl font-bold">
                            {currencySymbol}{" "}
                            {Math.round(
                              stats.averageOrderValue || 0,
                            ).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Avg Order Value
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Calendar className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                          <p className="text-2xl font-bold">
                            {stats.activeRfqs}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Active RFQs
                          </p>
                        </CardContent>
                      </Card>

                      {/* Per-currency stats */}
                      {stats.purchaseStats &&
                        stats.purchaseStats.length > 0 && (
                          <div className="col-span-2">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">
                                  Spending by Currency
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {stats.purchaseStats.map((ps: any) => (
                                    <div
                                      key={ps.id}
                                      className="flex justify-between items-center p-2 rounded bg-gray-50"
                                    >
                                      <div>
                                        <span className="font-medium">
                                          {ps.currency}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                          {ps.orderCount} orders
                                        </span>
                                      </div>
                                      <span className="font-bold text-amber-600">
                                        {ps.totalSpent.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center py-8 text-center">
                        <TrendingUp className="h-10 w-10 text-muted-foreground opacity-30 mb-2" />
                        <p className="text-muted-foreground">
                          No analytics available yet
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
