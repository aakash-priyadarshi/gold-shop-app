"use client";

import { DynamicFooter } from '@/components/layout/DynamicFooter';
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useCart,
  type DeliveryAddress,
  type DeliveryEstimate,
} from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { CURRENCIES, usePreferencesStore } from "@/store/preferences";
import {
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { Loader2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const COUNTRIES = [
  { code: "NP", name: "Nepal" },
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "AE", name: "UAE" },
];

interface ShopInfo {
  id: string;
  shopName: string;
  pincode?: string;
  city: string;
  country: string;
}

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    items,
    itemCount,
    subtotal,
    isLoading,
    updateQuantity,
    removeFromCart,
    clearCart,
    getItemsByShop,
    addresses,
    selectedAddressId,
    addAddress,
    removeAddress,
    setSelectedAddress,
    estimateDelivery,
  } = useCart();

  // Currency from preferences
  const currency = usePreferencesStore((state) => state.currency);
  const currencyInfo = CURRENCIES[currency];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format price in user's preferred currency
  const formatPrice = (priceNpr: number) => {
    if (!mounted) {
      return new Intl.NumberFormat("ne-NP", {
        style: "currency",
        currency: "NPR",
        minimumFractionDigits: 0,
      }).format(priceNpr);
    }

    return new Intl.NumberFormat(currencyInfo?.locale || "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(priceNpr);
  };

  const [shopInfos, setShopInfos] = useState<Record<string, ShopInfo>>({});
  const [deliveryEstimates, setDeliveryEstimates] = useState<
    Record<string, DeliveryEstimate>
  >({});
  const [loadingShops, setLoadingShops] = useState(true);

  // Add address dialog
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState<Omit<DeliveryAddress, "id">>({
    label: "",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "NP",
    pincode: "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const itemsByShop = getItemsByShop();
  const shopIds = Object.keys(itemsByShop);

  // Load shop info for delivery estimation
  useEffect(() => {
    const loadShopInfos = async () => {
      if (shopIds.length === 0) {
        setLoadingShops(false);
        return;
      }

      setLoadingShops(true);
      const infos: Record<string, ShopInfo> = {};

      for (const shopId of shopIds) {
        try {
          const response = await api.get(`/shops/${shopId}`);
          infos[shopId] = {
            id: shopId,
            shopName: response.data.shopName,
            pincode: response.data.pincode,
            city: response.data.city,
            country: response.data.country,
          };
        } catch (error) {
          console.error(`Failed to load shop ${shopId}:`, error);
        }
      }

      setShopInfos(infos);
      setLoadingShops(false);
    };

    loadShopInfos();
  }, [shopIds.join(",")]);

  // Calculate delivery estimates when address or shops change
  useEffect(() => {
    if (!selectedAddressId || loadingShops) return;

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress?.pincode) return;

    const estimates: Record<string, DeliveryEstimate> = {};

    for (const [shopId, shop] of Object.entries(shopInfos)) {
      if (shop.pincode) {
        estimates[shopId] = estimateDelivery(
          shop.pincode,
          selectedAddress.pincode,
        );
      }
    }

    setDeliveryEstimates(estimates);
  }, [selectedAddressId, shopInfos, addresses, loadingShops, estimateDelivery]);

  const handleAddAddress = async () => {
    if (
      !newAddress.fullName ||
      !newAddress.phone ||
      !newAddress.addressLine1 ||
      !newAddress.city ||
      !newAddress.pincode
    ) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    setSavingAddress(true);
    try {
      await addAddress(newAddress);
      toast({
        title: "Address Added",
        description: "Your delivery address has been saved",
      });
      setAddressDialogOpen(false);
      setNewAddress({
        label: "",
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "NP",
        pincode: "",
        isDefault: false,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save address",
      });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to proceed with checkout",
      });
      router.push("/auth/login");
      return;
    }

    if (!selectedAddressId) {
      toast({
        variant: "destructive",
        title: "Address Required",
        description: "Please add a delivery address",
      });
      return;
    }

    router.push("/checkout");
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <DynamicFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-6">
              <ShoppingCartIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your Cart is Empty</h2>
              <p className="text-muted-foreground mb-6">
                Browse our verified jewelers and add items to your cart
              </p>
              <Button onClick={() => router.push("/shops")}>
                Browse Shops
              </Button>
            </CardContent>
          </Card>
        </main>
        <DynamicFooter />
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCartIcon className="h-6 w-6" />
            Shopping Cart ({itemCount} items)
          </h1>
          <Button variant="outline" onClick={clearCart}>
            Clear Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {shopIds.map((shopId) => {
              const shopItems = itemsByShop[shopId];
              const shop = shopInfos[shopId];
              const estimate = deliveryEstimates[shopId];

              return (
                <Card key={shopId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-lg">
                          {shop?.shopName || "Loading..."}
                        </CardTitle>
                      </div>
                      {shop && (
                        <Badge variant="outline">
                          {shop.city}, {shop.country}
                        </Badge>
                      )}
                    </div>

                    {/* Delivery Estimate */}
                    {estimate && (
                      <div
                        className={`mt-3 p-3 rounded-lg ${
                          estimate.deliveryType === "same-city"
                            ? "bg-green-50 border border-green-200"
                            : estimate.deliveryType === "same-country"
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-amber-50 border border-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <TruckIcon className="h-4 w-4" />
                          <span className="font-medium text-sm">
                            Estimated Delivery:{" "}
                            {formatDate(estimate.estimatedDate.min)} -{" "}
                            {formatDate(estimate.estimatedDate.max)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {estimate.estimatedDays.min}-
                            {estimate.estimatedDays.max} days
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {estimate.notes.map((note, idx) => (
                            <p key={idx}>{note}</p>
                          ))}
                        </div>
                        {estimate.customsInfo && (
                          <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs">
                            <div className="flex items-start gap-1">
                              <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-amber-700">
                                {estimate.customsInfo}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {shopItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 py-3 border-b last:border-0"
                      >
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.product.sku}
                          </p>
                          {item.product.weight && (
                            <p className="text-xs text-muted-foreground">
                              {item.product.weight}g
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <p className="font-semibold">
                            {formatPrice(item.product.price * item.quantity)}
                          </p>

                          <div className="flex items-center gap-1 border rounded-md">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 h-6 px-2"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addresses.length === 0 ? (
                  <div className="text-center py-4">
                    <MapPinIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No delivery address added
                    </p>
                    <Dialog
                      open={addressDialogOpen}
                      onOpenChange={setAddressDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Address
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Delivery Address</DialogTitle>
                          <DialogDescription>
                            Enter your delivery address for order shipment
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Label</Label>
                              <Input
                                placeholder="e.g., Home, Office"
                                value={newAddress.label}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    label: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Full Name *</Label>
                              <Input
                                value={newAddress.fullName}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    fullName: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Phone *</Label>
                            <Input
                              value={newAddress.phone}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Address Line 1 *</Label>
                            <Input
                              value={newAddress.addressLine1}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  addressLine1: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Address Line 2</Label>
                            <Input
                              value={newAddress.addressLine2}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  addressLine2: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>City *</Label>
                              <Input
                                value={newAddress.city}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    city: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>State/Province</Label>
                              <Input
                                value={newAddress.state}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    state: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Country *</Label>
                              <Select
                                value={newAddress.country}
                                onValueChange={(v) =>
                                  setNewAddress({ ...newAddress, country: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRIES.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                      <span className="flex items-center gap-2">
                                        <FlagImage
                                          code={c.code as FlagCode}
                                          size={16}
                                        />
                                        {c.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Pincode/ZIP *</Label>
                              <Input
                                value={newAddress.pincode}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    pincode: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="isDefault"
                              checked={newAddress.isDefault}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  isDefault: e.target.checked,
                                })
                              }
                            />
                            <Label htmlFor="isDefault" className="text-sm">
                              Set as default address
                            </Label>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setAddressDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddAddress}
                            disabled={savingAddress}
                          >
                            {savingAddress ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Save Address
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <RadioGroup
                      value={selectedAddressId || ""}
                      onValueChange={setSelectedAddress}
                    >
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === addr.id
                              ? "border-amber-500 bg-amber-50"
                              : "hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedAddress(addr.id)}
                        >
                          <div className="flex items-start gap-3">
                            <RadioGroupItem value={addr.id} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {addr.label || "Address"}
                                </span>
                                {addr.isDefault && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{addr.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {addr.addressLine1}
                                {addr.addressLine2 && `, ${addr.addressLine2}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {addr.city}, {addr.state} {addr.pincode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {addr.phone}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAddress(addr.id);
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>

                    <Dialog
                      open={addressDialogOpen}
                      onOpenChange={setAddressDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add New Address
                        </Button>
                      </DialogTrigger>
                      {/* Same dialog content as above */}
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span className="text-muted-foreground">
                    Calculated at checkout
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span className="text-muted-foreground">
                    Calculated at checkout
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(subtotal)}+</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={!selectedAddressId}
                >
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}
