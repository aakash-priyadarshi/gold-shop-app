"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { posApi } from "@/lib/api";
import {
  Heart,
  Loader2,
  Minus,
  Package,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface PosSessionItem {
  id: string;
  inventoryItemId: string;
  variantId?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  inventoryItem: {
    id: string;
    nameEn: string;
    sku: string;
    images: string[];
    totalPriceNpr?: number;
    stockQuantity?: number;
  };
  variant?: {
    id: string;
    sizeLabel: string;
    sku: string;
    stock?: number;
    priceOverride?: number;
  } | null;
}

interface PosSession {
  id: string;
  shopId: string;
  customerId?: string;
  conversationId?: string;
  status: string;
  expiresAt: string;
  items: PosSessionItem[];
}

interface WishlistItem {
  id: string;
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    nameEn: string;
    sku: string;
    images: string[];
    totalPriceNpr: number;
    stockQuantity: number;
    variants: Array<{
      id: string;
      sizeLabel: string;
      stock: number;
      priceOverride?: number;
      isActive: boolean;
    }>;
  };
}

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PosPageInner />
    </Suspense>
  );
}

function PosPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const t = useT();

  // URL params from chat integration
  const urlCustomerId = searchParams.get("customerId");
  const urlConversationId = searchParams.get("conversationId");

  const [session, setSession] = useState<PosSession | null>(null);
  const [customerPicks, setCustomerPicks] = useState<WishlistItem[]>([]);
  const [customerId, setCustomerId] = useState(urlCustomerId || "");
  const [loading, setLoading] = useState(false);
  const [picksLoading, setPicksLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Load active session on mount
  const loadActiveSession = useCallback(async () => {
    try {
      const res = await posApi.getActiveSession();
      if (res.data) {
        setSession(res.data);
      }
    } catch {
      // No active session - that's ok
    }
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  // Auto-create session if coming from chat with customer
  useEffect(() => {
    if (urlCustomerId && urlConversationId && !session) {
      handleCreateSession(urlCustomerId, urlConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCustomerId, urlConversationId]);

  // ─── Create Session ───

  const handleCreateSession = async (cId?: string, convId?: string) => {
    setLoading(true);
    try {
      const res = await posApi.createSession({
        customerId: cId || customerId || undefined,
        conversationId: convId || urlConversationId || undefined,
      });
      setSession(res.data);
      toast({ title: t("POS session started (30 min)") });

      // Auto-load picks if we have a customer
      if (cId || customerId) {
        await loadCustomerPicks(cId || customerId);
      }
    } catch (err: any) {
      toast({
        title: t("Failed to create session"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Load Customer Picks ───

  const loadCustomerPicks = async (cId?: string) => {
    const id = cId || customerId;
    if (!id) return;
    setPicksLoading(true);
    try {
      const res = await posApi.getCustomerPicks(id);
      setCustomerPicks(res.data);
    } catch (err: any) {
      toast({
        title: t("Cannot load picks"),
        description:
          err?.response?.data?.message || t("No relationship with customer"),
        variant: "destructive",
      });
      setCustomerPicks([]);
    } finally {
      setPicksLoading(false);
    }
  };

  // ─── Add Item to Basket ───

  const handleAddItem = async (
    inventoryItemId: string,
    variantId?: string,
    qty = 1,
  ) => {
    if (!session) return;
    try {
      const res = await posApi.addItems(session.id, [
        { inventoryItemId, variantId, qty },
      ]);
      setSession(res.data);
      toast({ title: t("Item added to basket") });
    } catch (err: any) {
      toast({
        title: t("Failed to add item"),
        description: err?.response?.data?.message || t("Insufficient stock?"),
        variant: "destructive",
      });
    }
  };

  // ─── Update Item Qty ───

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    if (!session) return;
    try {
      await posApi.updateItem(session.id, itemId, newQty);
      // Refresh session
      const res = await posApi.getSession(session.id);
      setSession(res.data);
    } catch (err: any) {
      toast({
        title: t("Failed to update"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    }
  };

  // ─── Checkout ───

  const handleCheckout = async () => {
    if (!session) return;
    setCheckoutLoading(true);
    try {
      const res = await posApi.checkout(session.id, {
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        notes: notes || undefined,
        taxRate,
        discountAmount,
      });
      setSession(null);
      setCheckoutOpen(false);
      setCustomerPicks([]);
      toast({
        title: t("Checkout complete!"),
        description: t("Invoice") + ` ${res.data.invoice.invoiceNumber} ` + t("created"),
      });
    } catch (err: any) {
      toast({
        title: t("Checkout failed"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ─── Cancel Session ───

  const handleCancelSession = async () => {
    if (!session) return;
    try {
      await posApi.cancelSession(session.id);
      setSession(null);
      setCustomerPicks([]);
      toast({ title: t("POS session cancelled, stock released") });
    } catch (err: any) {
      toast({
        title: t("Failed to cancel"),
        description: err?.response?.data?.message || t("Unknown error"),
        variant: "destructive",
      });
    }
  };

  // ─── Compute Basket Totals ───

  const basketSubtotal =
    session?.items?.reduce((sum, i) => sum + i.lineTotal, 0) || 0;
  const basketTax = basketSubtotal * (taxRate || 0);
  const basketTotal = basketSubtotal + basketTax - (discountAmount || 0);

  // ─── Time remaining ───

  const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
  const minsRemaining = expiresAt
    ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))
    : 0;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ScanLine className="h-6 w-6" /> <T>POS Basket</T>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                <T>Load customer picks, build a basket, and checkout with an invoice</T>
              </p>
            </div>
            {session && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={minsRemaining > 5 ? "default" : "destructive"}
                  className="text-sm"
                >
                  {minsRemaining} <T>min remaining</T>
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelSession}
                >
                  <X className="h-4 w-4 mr-1" /> <T>Cancel Session</T>
                </Button>
              </div>
            )}
          </div>

          {/* No Session → Start */}
          {!session && (
            <Card>
              <CardHeader>
                <CardTitle><T>Start a POS Session</T></CardTitle>
                <CardDescription>
                  <T>Create a new POS session. Optionally enter a customer ID to load their liked items. Sessions last 30 minutes.</T>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="customerId"><T>Customer ID (optional)</T></Label>
                    <Input
                      id="customerId"
                      placeholder={t("Paste customer user ID...")}
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleCreateSession()}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-1" />
                    )}
                    <T>Start Session</T>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Session */}
          {session && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Customer Picks */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" /> <T>Customer Picks</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Load picks */}
                    {customerPicks.length === 0 && (
                      <div className="space-y-3">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label><T>Customer ID</T></Label>
                            <Input
                              placeholder={t("Customer user ID")}
                              value={customerId}
                              onChange={(e) => setCustomerId(e.target.value)}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => loadCustomerPicks()}
                            disabled={picksLoading || !customerId}
                          >
                            {picksLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {picksLoading && (
                          <p className="text-xs text-muted-foreground">
                            <T>Loading...</T>
                          </p>
                        )}
                      </div>
                    )}

                    {customerPicks.length > 0 && (
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {customerPicks.map((pick) => (
                          <div
                            key={pick.id}
                            className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent/50 transition"
                          >
                            {pick.inventoryItem.images?.[0] ? (
                              <img
                                src={pick.inventoryItem.images[0]}
                                alt=""
                                className="h-12 w-12 rounded object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {pick.inventoryItem.nameEn}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pick.inventoryItem.sku} · NPR{" "}
                                {pick.inventoryItem.totalPriceNpr?.toLocaleString()}
                              </p>
                              {pick.inventoryItem.variants?.length > 0 && (
                                <p className="text-xs text-blue-600">
                                  {pick.inventoryItem.variants.length} <T>sizes</T>
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleAddItem(pick.inventoryItem.id)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manual Add */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <T>Quick Add by SKU</T>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ManualAddForm
                      onAdd={(itemId, variantId) =>
                        handleAddItem(itemId, variantId)
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right: Basket */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" /> <T>Basket</T>
                        {session.items?.length > 0 && (
                          <Badge variant="secondary">
                            {session.items.length} <T>items</T>
                          </Badge>
                        )}
                      </CardTitle>
                      {session.items?.length > 0 && (
                        <Button onClick={() => setCheckoutOpen(true)}>
                          <T>Checkout</T>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(!session.items || session.items.length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p><T>Basket is empty</T></p>
                        <p className="text-xs mt-1">
                          <T>Add items from customer picks or by SKU</T>
                        </p>
                      </div>
                    )}

                    {session.items && session.items.length > 0 && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead><T>Item</T></TableHead>
                              <TableHead><T>Variant</T></TableHead>
                              <TableHead className="text-right">
                                <T>Unit Price</T>
                              </TableHead>
                              <TableHead className="text-center"><T>Qty</T></TableHead>
                              <TableHead className="text-right">
                                <T>Line Total</T>
                              </TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.inventoryItem?.images?.[0] ? (
                                      <img
                                        src={item.inventoryItem.images[0]}
                                        alt=""
                                        className="h-8 w-8 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-8 w-8 bg-muted rounded" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">
                                        {item.inventoryItem?.nameEn}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.inventoryItem?.sku}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {item.variant ? (
                                    <Badge variant="outline">
                                      {item.variant.sizeLabel}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  NPR {item.unitPrice?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        handleUpdateQty(
                                          item.id,
                                          Math.max(0, item.qty - 1),
                                        )
                                      }
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">
                                      {item.qty}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        handleUpdateQty(item.id, item.qty + 1)
                                      }
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  NPR {item.lineTotal?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleUpdateQty(item.id, 0)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Totals */}
                        <div className="mt-4 border-t pt-4 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              <T>Subtotal</T>
                            </span>
                            <span>NPR {basketSubtotal.toLocaleString()}</span>
                          </div>
                          {taxRate > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                <T>Tax</T> ({(taxRate * 100).toFixed(1)}%)
                              </span>
                              <span>NPR {basketTax.toLocaleString()}</span>
                            </div>
                          )}
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span><T>Discount</T></span>
                              <span>
                                - NPR {discountAmount.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-base pt-2 border-t">
                            <span><T>Total</T></span>
                            <span>NPR {basketTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Dialog */}
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle><T>Checkout</T></DialogTitle>
              <DialogDescription>
                <T>Complete the sale and generate an invoice</T>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="checkout-name"><T>Customer Name *</T></Label>
                <Input
                  id="checkout-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("Full name")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label><T>Phone</T></Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t("Optional")}
                  />
                </div>
                <div>
                  <Label><T>Email</T></Label>
                  <Input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={t("Optional")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label><T>Tax Rate</T></Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    placeholder={t("e.g. 0.13")}
                  />
                </div>
                <div>
                  <Label><T>Discount (NPR)</T></Label>
                  <Input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label><T>Notes</T></Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("Optional notes...")}
                  rows={2}
                />
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span><T>Items</T></span>
                  <span>{session?.items?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span><T>Subtotal</T></span>
                  <span>NPR {basketSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span><T>Total</T></span>
                  <span>NPR {basketTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading || !customerName.trim()}
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                <T>Complete Sale</T>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ShopGuard>
  );
}

// ─── Manual Add mini-form (search by inventory item ID for now) ───

function ManualAddForm({
  onAdd,
}: {
  onAdd: (itemId: string, variantId?: string) => void;
}) {
  const [itemId, setItemId] = useState("");

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label><T>Inventory Item ID</T></Label>
        <Input
          placeholder={t("Paste item ID")}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        disabled={!itemId.trim()}
        onClick={() => {
          onAdd(itemId.trim());
          setItemId("");
        }}
      >
        <Plus className="h-4 w-4 mr-1" /> <T>Add</T>
      </Button>
    </div>
  );
}
