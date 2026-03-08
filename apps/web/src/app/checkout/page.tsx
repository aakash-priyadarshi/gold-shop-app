"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { T } from "@/components/ui/T";
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
import { useCart, type DeliveryAddress } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { fetchTaxRules, lookupTaxRate } from "@/hooks/useTaxRules";
import { ordersApi, paymentsApi } from "@/lib/api";
import { CURRENCIES, usePreferencesStore } from "@/store/preferences";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CreditCardIcon,
  LockClosedIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { Banknote, CreditCard, Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useT } from "@/providers/translation-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COUNTRIES = [
  { code: "NP", name: "Nepal" },
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "AE", name: "UAE" },
];

// Payment methods available per country
const PAYMENT_METHODS_BY_COUNTRY: Record<
  string,
  Array<{
    id: string;
    name: string;
    icon: typeof CreditCard;
    description: string;
    available: boolean;
  }>
> = {
  NP: [
    {
      id: "ESEWA",
      name: "eSewa",
      icon: Banknote,
      description: "Pay via eSewa wallet",
      available: true,
    },
    {
      id: "KHALTI",
      name: "Khalti",
      icon: Banknote,
      description: "Pay via Khalti wallet",
      available: true,
    },
    {
      id: "BANK_TRANSFER",
      name: "Bank Transfer",
      icon: Banknote,
      description: "Direct bank transfer",
      available: true,
    },
  ],
  IN: [
    {
      id: "RAZORPAY",
      name: "Razorpay",
      icon: CreditCard,
      description: "UPI, Cards, NetBanking",
      available: true,
    },
    {
      id: "BANK_TRANSFER",
      name: "Bank Transfer",
      icon: Banknote,
      description: "Direct bank transfer",
      available: true,
    },
  ],
  US: [
    {
      id: "STRIPE",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Visa, Mastercard, Amex",
      available: true,
    },
  ],
  UK: [
    {
      id: "STRIPE",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Visa, Mastercard, Amex",
      available: true,
    },
  ],
  AE: [
    {
      id: "STRIPE",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Visa, Mastercard",
      available: true,
    },
    {
      id: "BANK_TRANSFER",
      name: "Bank Transfer",
      icon: Banknote,
      description: "Direct bank transfer",
      available: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKOUT PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function CheckoutPageContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    items,
    subtotal,
    addresses,
    selectedAddressId,
    addAddress,
    setSelectedAddress,
    clearCart,
  } = useCart();

  // Currency from preferences
  const { currency, country: userCountry } = usePreferencesStore();
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.USD;

  // State
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"address" | "payment" | "confirm">(
    "address",
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [payAtShop, setPayAtShop] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState<string | null>(null);

  // Address form state
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [newAddress, setNewAddress] = useState<Omit<DeliveryAddress, "id">>({
    label: "Home",
    fullName: user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "",
    phone: user?.phone || "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: userCountry || "NP",
    pincode: "",
    isDefault: true,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Order type (from URL for custom orders)
  const orderType =
    (searchParams.get("type") as "INVENTORY" | "CUSTOM") || "INVENTORY";
  const rfqId = searchParams.get("rfqId");
  const offerId = searchParams.get("offerId");

  // Determine if this is a custom order with same-city shop
  const [shopCity, setShopCity] = useState<string | null>(null);
  const [customerCity, setCustomerCity] = useState<string | null>(null);
  const canPayAtShop = useMemo(() => {
    if (orderType !== "CUSTOM") return false;
    if (!shopCity || !customerCity) return false;
    return shopCity.toLowerCase() === customerCity.toLowerCase();
  }, [orderType, shopCity, customerCity]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if cart is empty and not a custom order
  useEffect(() => {
    if (mounted && items.length === 0 && orderType !== "CUSTOM") {
      router.push("/cart");
    }
  }, [mounted, items, orderType, router]);

  // Get selected address
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // Update customer city when address changes
  useEffect(() => {
    if (selectedAddress) {
      setCustomerCity(selectedAddress.city);
    }
  }, [selectedAddress]);

  // Get available payment methods for user's country
  const availablePaymentMethods = useMemo(() => {
    const country = selectedAddress?.country || userCountry || "NP";
    return (
      PAYMENT_METHODS_BY_COUNTRY[country] || PAYMENT_METHODS_BY_COUNTRY["NP"]
    );
  }, [selectedAddress?.country, userCountry]);

  // Format price
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

  // Dynamic tax rate from admin-configured rules
  const [taxRate, setTaxRate] = useState(0.13);
  const [taxLabel, setTaxLabel] = useState("Tax (13%)");

  useEffect(() => {
    const country = selectedAddress?.country || userCountry || "NP";
    fetchTaxRules(country).then((result) => {
      if (result?.rules) {
        const { rate, name } = lookupTaxRate(result.rules);
        setTaxRate(rate);
        setTaxLabel(`${name} (${(rate * 100).toFixed(1)}%)`);
      }
    });
  }, [selectedAddress?.country, userCountry]);

  // Calculate totals
  const tax = subtotal * taxRate;
  const shipping = 0; // Free shipping for now
  const total = subtotal + tax + shipping;

  // Handle address save
  const handleSaveAddress = async () => {
    if (
      !newAddress.fullName ||
      !newAddress.phone ||
      !newAddress.addressLine1 ||
      !newAddress.city ||
      !newAddress.pincode
    ) {
      toast({
        title: t("Missing Information"),
        description: t("Please fill in all required fields"),
        variant: "destructive",
      });
      return;
    }

    setSavingAddress(true);
    try {
      await addAddress(newAddress);
      setAddressDialogOpen(false);
      toast({
        title: t("Address Saved"),
        description: t("Your delivery address has been saved"),
      });
    } catch {
      toast({
        title: t("Error"),
        description: t("Failed to save address"),
        variant: "destructive",
      });
    } finally {
      setSavingAddress(false);
    }
  };

  // Handle checkout submission
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({
        title: t("Select Address"),
        description: t("Please select a delivery address"),
        variant: "destructive",
      });
      return;
    }

    if (!payAtShop && !selectedPaymentMethod) {
      toast({
        title: t("Select Payment"),
        description: t("Please select a payment method"),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create order(s) - one per shop for inventory orders
      if (orderType === "INVENTORY") {
        // For inventory orders, create one order per item
        for (const item of items) {
          const orderData = {
            inventoryItemId: item.productId,
            quantity: item.quantity,
            shippingAddress: {
              fullName: selectedAddress.fullName,
              phone: selectedAddress.phone,
              addressLine1: selectedAddress.addressLine1,
              addressLine2: selectedAddress.addressLine2,
              city: selectedAddress.city,
              state: selectedAddress.state,
              country: selectedAddress.country,
              pincode: selectedAddress.pincode,
            },
          };

          const response = await ordersApi.createInventoryOrder(orderData);
          const order = response.data;

          // Initiate payment if not COD/Pay at shop
          if (!payAtShop && selectedPaymentMethod) {
            await paymentsApi.initiatePayment({
              orderId: order.id,
              paymentType: "FULL_PAYMENT",
              method: selectedPaymentMethod,
            });
          }

          setOrderCreated(order.orderNumber);
        }

        // Clear cart after successful order
        clearCart();
      } else if (orderType === "CUSTOM" && rfqId && offerId) {
        // For custom orders from RFQ
        const orderData = {
          rfqRequestId: rfqId,
          offerId: offerId,
          shippingAddress: {
            fullName: selectedAddress.fullName,
            phone: selectedAddress.phone,
            addressLine1: selectedAddress.addressLine1,
            addressLine2: selectedAddress.addressLine2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            country: selectedAddress.country,
            pincode: selectedAddress.pincode,
          },
          payAtShop,
        };

        const response = await ordersApi.createCustomOrder(orderData);
        const order = response.data;

        // Initiate payment if not pay at shop
        if (!payAtShop && selectedPaymentMethod) {
          await paymentsApi.initiatePayment({
            orderId: order.id,
            paymentType: "BOOKING_FEE",
            method: selectedPaymentMethod,
          });
        }

        setOrderCreated(order.orderNumber);
      }

      toast({
        title: t("Order Placed!"),
        description: t("Your order has been placed successfully"),
      });

      setStep("confirm");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: t("Order Failed"),
        description: err.response?.data?.message || t("Failed to place order"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </main>
        <DynamicFooter />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push("/auth/login?redirect=/checkout");
    return null;
  }

  // Order confirmation view
  if (step === "confirm" && orderCreated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-400">
                <T>Order Placed Successfully!</T>
              </CardTitle>
              <CardDescription className="text-lg">
                <T>Order Number:</T>
                {" "}<span className="font-mono font-semibold">{orderCreated}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                <T>Thank you for your order! You will receive a confirmation email
                shortly.</T>
              </p>
              {payAtShop && (
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <Store className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-400">
                    <T>Pay at Shop Selected</T>
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <T>Please visit the shop to complete your payment. Your order
                    will be held for 48 hours.</T>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/dashboard/customer">
                  <ShoppingCartIcon className="h-4 w-4 mr-2" />
                  <T>View My Orders</T>
                </Link>
              </Button>
              <Button asChild className="bg-amber-600 hover:bg-amber-700">
                <Link href="/shops"><T>Continue Shopping</T></Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <DynamicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          <T>Back</T>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Checkout Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className={`flex items-center gap-2 ${
                  step === "address"
                    ? "text-amber-600 font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "address"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  1
                </div>
                <span className="hidden sm:inline"><T>Address</T></span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
              <div
                className={`flex items-center gap-2 ${
                  step === "payment"
                    ? "text-amber-600 font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "payment"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  2
                </div>
                <span className="hidden sm:inline"><T>Payment</T></span>
              </div>
            </div>

            {/* Step 1: Address */}
            {step === "address" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5" />
                    <T>Delivery Address</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Select or add a delivery address</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addresses.length > 0 ? (
                    <RadioGroup
                      value={selectedAddressId || ""}
                      onValueChange={setSelectedAddress}
                      className="space-y-3"
                    >
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === address.id
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                          }`}
                          onClick={() => setSelectedAddress(address.id)}
                        >
                          <RadioGroupItem value={address.id} id={address.id} />
                          <label
                            htmlFor={address.id}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {address.label}
                              </span>
                              {address.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {address.fullName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400">
                              {address.addressLine1}
                              {address.addressLine2 &&
                                `, ${address.addressLine2}`}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400">
                              {address.city}, {address.state} {address.pincode}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <FlagImage
                                code={address.country as FlagCode}
                                size={14}
                              />
                              {address.phone}
                            </p>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p><T>No saved addresses</T></p>
                      <p className="text-sm"><T>Add an address to continue</T></p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAddressDialogOpen(true)}
                  >
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <T>Add New Address</T>
                  </Button>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    disabled={!selectedAddressId}
                    onClick={() => setStep("payment")}
                  >
                    <T>Continue to Payment</T>
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 2: Payment */}
            {step === "payment" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5" />
                    <T>Payment Method</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Select how you would like to pay</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pay at Shop option for custom orders */}
                  {canPayAtShop && (
                    <div className="p-4 border rounded-lg border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="payAtShop"
                          checked={payAtShop}
                          onCheckedChange={(checked) => {
                            setPayAtShop(checked as boolean);
                            if (checked) setSelectedPaymentMethod("");
                          }}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor="payAtShop"
                            className="font-medium cursor-pointer flex items-center gap-2"
                          >
                            <Store className="h-4 w-4" />
                            <T>Pay at Shop</T>
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <T>Visit the shop to pay in person. Only available
                            because you're in the same city as the shop.</T>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Online payment methods */}
                  {!payAtShop && (
                    <RadioGroup
                      value={selectedPaymentMethod}
                      onValueChange={setSelectedPaymentMethod}
                      className="space-y-3"
                    >
                      {availablePaymentMethods.map((method) => {
                        const Icon = method.icon;
                        return (
                          <div
                            key={method.id}
                            className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedPaymentMethod === method.id
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                                : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                            } ${
                              !method.available &&
                              "opacity-50 cursor-not-allowed"
                            }`}
                            onClick={() =>
                              method.available &&
                              setSelectedPaymentMethod(method.id)
                            }
                          >
                            <RadioGroupItem
                              value={method.id}
                              id={method.id}
                              disabled={!method.available}
                            />
                            <label
                              htmlFor={method.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">
                                  {method.name}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {method.description}
                              </p>
                            </label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {/* Security note */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-4">
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span>
                      <T>Your payment information is secure and encrypted</T>
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("address")}>
                    <T>Back</T>
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    disabled={!payAtShop && !selectedPaymentMethod}
                    onClick={handlePlaceOrder}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <T>Processing...</T>
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="h-4 w-4 mr-2" />
                        <T>Place Order</T> - {formatPrice(total)}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCartIcon className="h-5 w-5" />
                  <T>Order Summary</T>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      <T>Subtotal</T>
                    </span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {taxLabel}
                    </span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      <T>Shipping</T>
                    </span>
                    <span className="text-emerald-600"><T>Free</T></span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span><T>Total</T></span>
                    <span className="text-amber-600">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Delivery estimate */}
                {selectedAddress && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <TruckIcon className="h-4 w-4" />
                      <span><T>Delivering to</T> {selectedAddress.city}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <T>Estimated delivery: 3-7 business days</T>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Add Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle><T>Add Delivery Address</T></DialogTitle>
            <DialogDescription>
              <T>Enter your delivery address details</T>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label"><T>Address Label</T></Label>
                <Select
                  value={newAddress.label}
                  onValueChange={(value) =>
                    setNewAddress({ ...newAddress, label: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country"><T>Country</T></Label>
                <Select
                  value={newAddress.country}
                  onValueChange={(value) =>
                    setNewAddress({ ...newAddress, country: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <FlagImage code={c.code as FlagCode} size={16} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName"><T>Full Name *</T></Label>
              <Input
                id="fullName"
                value={newAddress.fullName}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, fullName: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone"><T>Phone Number *</T></Label>
              <Input
                id="phone"
                value={newAddress.phone}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, phone: e.target.value })
                }
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1"><T>Address Line 1 *</T></Label>
              <Input
                id="addressLine1"
                value={newAddress.addressLine1}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, addressLine1: e.target.value })
                }
                placeholder="House/Building number, Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2"><T>Address Line 2</T></Label>
              <Input
                id="addressLine2"
                value={newAddress.addressLine2 || ""}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, addressLine2: e.target.value })
                }
                placeholder="Apartment, Suite, Area (Optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city"><T>City *</T></Label>
                <Input
                  id="city"
                  value={newAddress.city}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state"><T>State/Province</T></Label>
                <Input
                  id="state"
                  value={newAddress.state}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, state: e.target.value })
                  }
                  placeholder="State"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode"><T>PIN/ZIP Code *</T></Label>
              <Input
                id="pincode"
                value={newAddress.pincode}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, pincode: e.target.value })
                }
                placeholder="PIN Code"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={newAddress.isDefault}
                onCheckedChange={(checked) =>
                  setNewAddress({
                    ...newAddress,
                    isDefault: checked as boolean,
                  })
                }
              />
              <label htmlFor="isDefault" className="text-sm cursor-pointer">
                <T>Set as default address</T>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddressDialogOpen(false)}
            >
              <T>Cancel</T>
            </Button>
            <Button onClick={handleSaveAddress} disabled={savingAddress}>
              {savingAddress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <T>Saving...</T>
                </>
              ) : (
                t("Save Address")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DynamicFooter />
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
