"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlagImage } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useMarket, type WeightUnit } from "@/hooks/useMarket";
import { getApiUrl, shopQuotesApi } from "@/lib/api";
import { getImageUrl } from "@/lib/image-upload";
import { CURRENCIES, usePreferencesStore } from "@/store/preferences";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

// Pricing components

// Local type that includes METHOD_D for walk-in quotes
type BuildMethod = "METHOD_A" | "METHOD_B" | "METHOD_C" | "METHOD_D";

const API_URL = getApiUrl();

const JEWELLERY_TYPES = [
  { value: "RING", label: "Ring" },
  { value: "NECKLACE", label: "Necklace" },
  { value: "BRACELET", label: "Bracelet" },
  { value: "EARRING", label: "Earrings" },
  { value: "PENDANT", label: "Pendant" },
  { value: "BANGLE", label: "Bangle" },
  { value: "CHAIN", label: "Chain" },
  { value: "ANKLET", label: "Anklet" },
  { value: "BROOCH", label: "Brooch" },
  { value: "TIE_PIN", label: "Tie Pin" },
  { value: "CUFFLINKS", label: "Cufflinks" },
  { value: "NOSE_PIN", label: "Nose Pin" },
  { value: "MANGALSUTRA", label: "Mangalsutra" },
  { value: "MAANG_TIKKA", label: "Maang Tikka" },
  { value: "OTHER", label: "Other" },
];

const BUILD_METHODS = [
  {
    value: "METHOD_A",
    label: "Method A: Solid Precious Metal",
    description: "Pure gold, silver, or platinum throughout",
  },
  {
    value: "METHOD_B",
    label: "Method B: Precious Metal Alloy",
    description: "Gold/silver mixed with other metals for durability",
  },
  {
    value: "METHOD_C",
    label: "Method C: Base Metal + Plating",
    description: "Not solid gold. Plated/Coated.",
  },
  {
    value: "METHOD_D",
    label: "Method D: Italian Machine Made",
    description: "Machine-made chains, bangles, and intricate patterns",
  },
];

// Country codes for phone
const COUNTRY_CODES = [
  { code: "+91", country: "India", flagCode: "IN" as const },
  { code: "+977", country: "Nepal", flagCode: "NP" as const },
  { code: "+1", country: "USA", flagCode: "US" as const },
  { code: "+44", country: "UK", flagCode: "GB" as const },
  { code: "+971", country: "UAE", flagCode: "AE" as const },
  { code: "+65", country: "Singapore", flagCode: null },
  { code: "+61", country: "Australia", flagCode: null },
  { code: "+81", country: "Japan", flagCode: null },
];

interface CustomerLookupResult {
  found: boolean;
  customer: {
    id: string;
    name: string;
    phone: string;
    phoneCountryCode: string;
    email?: string;
    address: string;
    city: string;
    country: string;
    recentOrders?: Array<{
      id: string;
      quoteNumber: string;
      jewelleryType: string;
      totalPriceNpr?: number;
      status: string;
      createdAt: string;
    }>;
  } | null;
  source: "cache" | "database" | null;
}

export default function CreateShopQuotePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Customer lookup state
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<CustomerLookupResult | null>(
    null,
  );
  const [showReturningCustomerAlert, setShowReturningCustomerAlert] =
    useState(false);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Customer details state
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phoneCountryCode: "+91",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "India",
  });

  // Get currency from global preferences store
  const currency = usePreferencesStore((state) => state.currency);
  const currencyInfo = CURRENCIES[currency];
  const country = usePreferencesStore((state) => state.country);

  // Get weight unit from market context
  const { selectedWeightUnit, config: marketConfig } = useMarket();
  const [displayWeightUnit, setDisplayWeightUnit] =
    useState<WeightUnit>(selectedWeightUnit);

  // Form data
  const [formData, setFormData] = useState({
    jewelleryType: "",
    buildMethod: "METHOD_A" as BuildMethod,
    composition: {} as Record<string, unknown>,
    targetTotalWeightG: "",
    targetGoldWeightG: "",
    specialInstructions: "",
    referenceImages: [] as string[],
    metalCostNpr: "",
    makingChargeNpr: "",
    gemstoneCostNpr: "",
    finishCostNpr: "",
    estimatedDays: "",
    shopNotes: "",
  });

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploading: isUploadingImage,
    progress: uploadProgress,
    upload: uploadImageToR2,
  } = useImageUpload({
    type: "rfq",
    onSuccess: (result) => {
      if (result.url) {
        setFormData((prev) => ({
          ...prev,
          referenceImages: [...prev.referenceImages, result.url!],
        }));
      }
    },
    onError: (error) => {
      setError(`Image upload failed: ${error}`);
    },
  });

  // Phone lookup with debounce
  const lookupCustomer = useCallback(
    async (phoneCountryCode: string, phone: string) => {
      if (phone.length < 7) {
        setLookupResult(null);
        setShowReturningCustomerAlert(false);
        return;
      }

      setIsLookingUp(true);
      try {
        const response = await shopQuotesApi.lookupCustomer({
          phoneCountryCode,
          phone,
        });
        const result = response.data as CustomerLookupResult;
        setLookupResult(result);

        if (result.found && result.customer) {
          setShowReturningCustomerAlert(true);
        }
      } catch (err) {
        console.error("Customer lookup failed:", err);
        setLookupResult(null);
      } finally {
        setIsLookingUp(false);
      }
    },
    [],
  );

  // Debounced phone input handler
  const handlePhoneChange = (phone: string) => {
    setCustomerDetails((prev) => ({ ...prev, phone }));

    if (phoneDebounceRef.current) {
      clearTimeout(phoneDebounceRef.current);
    }

    phoneDebounceRef.current = setTimeout(() => {
      lookupCustomer(customerDetails.phoneCountryCode, phone);
    }, 500);
  };

  // Auto-fill from returning customer
  const handleAutoFillCustomer = () => {
    if (lookupResult?.customer) {
      const c = lookupResult.customer;
      setCustomerDetails({
        name: c.name,
        phoneCountryCode: c.phoneCountryCode,
        phone: c.phone.replace(c.phoneCountryCode, ""),
        email: c.email || "",
        address: c.address,
        city: c.city,
        country: c.country,
      });
      setShowReturningCustomerAlert(false);
      toast({
        title: "Customer details auto-filled",
        description: `Welcome back, ${c.name}!`,
      });
    }
  };

  const handleReferenceImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Each image must be smaller than 10MB");
        continue;
      }
      await uploadImageToR2(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeReferenceImage = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((img) => img !== url),
    }));
  };

  // Calculate total price
  const calculateTotal = () => {
    const metal = parseFloat(formData.metalCostNpr) || 0;
    const making = parseFloat(formData.makingChargeNpr) || 0;
    const gemstone = parseFloat(formData.gemstoneCostNpr) || 0;
    const finish = parseFloat(formData.finishCostNpr) || 0;
    const subtotal = metal + making + gemstone + finish;
    const tax = subtotal * 0.13; // 13% VAT
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmit = async () => {
    // Validate customer details
    if (
      !customerDetails.name ||
      !customerDetails.phone ||
      !customerDetails.address ||
      !customerDetails.city
    ) {
      setError(
        "Please fill in all required customer details (name, phone, address, city)",
      );
      return;
    }

    // Validate phone format
    if (!/^\d{7,15}$/.test(customerDetails.phone)) {
      setError("Please enter a valid phone number (7-15 digits)");
      return;
    }

    // Validate jewellery details
    if (!formData.jewelleryType || !formData.buildMethod) {
      setError("Please select jewellery type and build method");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await shopQuotesApi.create({
        customer: {
          name: customerDetails.name,
          phoneCountryCode: customerDetails.phoneCountryCode,
          phone: customerDetails.phone,
          email: customerDetails.email || undefined,
          address: customerDetails.address,
          city: customerDetails.city,
          country: customerDetails.country,
        },
        jewelleryType: formData.jewelleryType,
        buildMethod: formData.buildMethod,
        composition: formData.composition,
        targetTotalWeightG:
          parseFloat(formData.targetTotalWeightG) || undefined,
        targetGoldWeightG: parseFloat(formData.targetGoldWeightG) || undefined,
        specialInstructions: formData.specialInstructions || undefined,
        referenceImages: formData.referenceImages,
        metalCostNpr: parseFloat(formData.metalCostNpr) || undefined,
        makingChargeNpr: parseFloat(formData.makingChargeNpr) || undefined,
        gemstoneCostNpr: parseFloat(formData.gemstoneCostNpr) || undefined,
        finishCostNpr: parseFloat(formData.finishCostNpr) || undefined,
        estimatedDays: parseInt(formData.estimatedDays) || undefined,
        shopNotes: formData.shopNotes || undefined,
      });

      toast({
        title: "Quote Created Successfully",
        description: `Quote ${response.data.quoteNumber} created for ${customerDetails.name}`,
      });

      router.push("/dashboard/shop/quotes");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotal();

  const customerDetailsComplete =
    customerDetails.name &&
    customerDetails.phone &&
    customerDetails.address &&
    customerDetails.city;
  const jewelleryDetailsComplete =
    formData.jewelleryType && formData.buildMethod;
  const canSubmit = customerDetailsComplete && jewelleryDetailsComplete;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Create Walk-in Quote</h1>
              <p className="text-muted-foreground">
                Create a quote for a customer visiting your shop
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              Step {step} of 3
            </Badge>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? "bg-amber-500 text-white"
                      : s < step
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 ${s < step ? "bg-green-500" : "bg-gray-200"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Returning Customer Alert */}
          {showReturningCustomerAlert && lookupResult?.customer && (
            <Alert className="border-green-500 bg-green-50">
              <UserCheck className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                Returning Customer Found!
              </AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="flex items-center justify-between">
                  <span>
                    Is this <strong>{lookupResult.customer.name}</strong> from{" "}
                    {lookupResult.customer.city}?
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAutoFillCustomer}>
                      <Check className="h-4 w-4 mr-1" /> Yes, auto-fill
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReturningCustomerAlert(false)}
                    >
                      No, new customer
                    </Button>
                  </div>
                </div>
                {lookupResult.customer.recentOrders &&
                  lookupResult.customer.recentOrders.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs mb-1">Recent orders:</p>
                      <div className="flex flex-wrap gap-1">
                        {lookupResult.customer.recentOrders
                          .slice(0, 3)
                          .map((order) => (
                            <Badge
                              key={order.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {order.quoteNumber} - {order.jewelleryType}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Customer Details */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Customer Details
                </CardTitle>
                <CardDescription>
                  Enter the walk-in customer's information. Phone numbers are
                  used to identify returning customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Number with lookup */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Country Code *</Label>
                    <Select
                      value={customerDetails.phoneCountryCode}
                      onValueChange={(value) => {
                        setCustomerDetails((prev) => ({
                          ...prev,
                          phoneCountryCode: value,
                        }));
                        if (customerDetails.phone.length >= 7) {
                          lookupCustomer(value, customerDetails.phone);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              {c.flagCode && (
                                <FlagImage code={c.flagCode} size={16} />
                              )}
                              {c.code} ({c.country})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Phone Number *</Label>
                    <div className="relative">
                      <Input
                        placeholder="9876543210"
                        value={customerDetails.phone}
                        onChange={(e) =>
                          handlePhoneChange(e.target.value.replace(/\D/g, ""))
                        }
                      />
                      {isLookingUp && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {lookupResult?.found && !showReturningCustomerAlert && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter phone to check for returning customer
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter customer's full name"
                    value={customerDetails.name}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerDetails.email}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Address */}
                <div>
                  <Label>Address *</Label>
                  <Textarea
                    placeholder="Enter full address"
                    value={customerDetails.address}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>

                {/* City and Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      placeholder="Mumbai"
                      value={customerDetails.city}
                      onChange={(e) =>
                        setCustomerDetails((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Select
                      value={customerDetails.country}
                      onValueChange={(value) =>
                        setCustomerDetails((prev) => ({
                          ...prev,
                          country: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">
                          <span className="flex items-center gap-2">
                            <FlagImage code="IN" size={16} /> India
                          </span>
                        </SelectItem>
                        <SelectItem value="Nepal">
                          <span className="flex items-center gap-2">
                            <FlagImage code="NP" size={16} /> Nepal
                          </span>
                        </SelectItem>
                        <SelectItem value="USA">
                          <span className="flex items-center gap-2">
                            <FlagImage code="US" size={16} /> USA
                          </span>
                        </SelectItem>
                        <SelectItem value="UK">
                          <span className="flex items-center gap-2">
                            <FlagImage code="UK" size={16} /> UK
                          </span>
                        </SelectItem>
                        <SelectItem value="UAE">
                          <span className="flex items-center gap-2">
                            <FlagImage code="AE" size={16} /> UAE
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Jewellery Details */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Jewellery Details</CardTitle>
                <CardDescription>
                  Specify what the customer is ordering
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Jewellery Type */}
                <div>
                  <Label>Jewellery Type *</Label>
                  <Select
                    value={formData.jewelleryType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, jewelleryType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {JEWELLERY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Build Method */}
                <div>
                  <Label>Build Method *</Label>
                  <Select
                    value={formData.buildMethod}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        buildMethod: value as BuildMethod,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILD_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div>
                            <span className="font-medium">{method.label}</span>
                            <p className="text-xs text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Total Weight (grams)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 10.5"
                      value={formData.targetTotalWeightG}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetTotalWeightG: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {formData.buildMethod === "METHOD_D" && (
                    <div>
                      <Label>Target Gold Weight (grams)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 8.0"
                        value={formData.targetGoldWeightG}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            targetGoldWeightG: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Reference Images */}
                <div>
                  <Label>Reference Images</Label>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleReferenceImageUpload}
                      className="hidden"
                    />
                    {formData.referenceImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {formData.referenceImages.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={getImageUrl(url)}
                              alt={`Reference ${idx + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                            <button
                              onClick={() => removeReferenceImage(url)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="w-full"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Add Reference Images
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div>
                  <Label>Special Instructions</Label>
                  <Textarea
                    placeholder="Any special requirements or notes about the order..."
                    value={formData.specialInstructions}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        specialInstructions: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Pricing */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Quote</CardTitle>
                <CardDescription>
                  Set the price for this order. Payment will be collected at
                  your shop.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Metal Cost (NPR)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.metalCostNpr}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          metalCostNpr: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Making Charge (NPR)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.makingChargeNpr}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          makingChargeNpr: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Gemstone Cost (NPR)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.gemstoneCostNpr}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gemstoneCostNpr: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Finish Cost (NPR)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.finishCostNpr}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          finishCostNpr: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-amber-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>NPR {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (13% VAT)</span>
                    <span>NPR {tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-amber-600">
                      NPR {total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Estimated Days */}
                <div>
                  <Label>Estimated Completion (days)</Label>
                  <Input
                    type="number"
                    placeholder="14"
                    value={formData.estimatedDays}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedDays: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Shop Notes (internal) */}
                <div>
                  <Label>Internal Notes (not shown to customer)</Label>
                  <Textarea
                    placeholder="Any internal notes for your reference..."
                    value={formData.shopNotes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shopNotes: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>

                {/* Payment Note */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Payment at Shop</AlertTitle>
                  <AlertDescription>
                    This is a walk-in order. Payment will be collected directly
                    at your shop. You can record advance payments and track the
                    balance due.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !customerDetailsComplete) ||
                  (step === 2 && !jewelleryDetailsComplete)
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Quote
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Summary Preview */}
          {step === 3 && customerDetailsComplete && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quote Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  <strong>Customer:</strong> {customerDetails.name}
                </p>
                <p>
                  <strong>Phone:</strong> {customerDetails.phoneCountryCode}{" "}
                  {customerDetails.phone}
                </p>
                <p>
                  <strong>City:</strong> {customerDetails.city}
                </p>
                <p>
                  <strong>Jewellery:</strong>{" "}
                  {JEWELLERY_TYPES.find(
                    (t) => t.value === formData.jewelleryType,
                  )?.label || formData.jewelleryType}
                </p>
                <p>
                  <strong>Method:</strong>{" "}
                  {BUILD_METHODS.find((m) => m.value === formData.buildMethod)
                    ?.label || formData.buildMethod}
                </p>
                {formData.targetTotalWeightG && (
                  <p>
                    <strong>Weight:</strong> {formData.targetTotalWeightG}g
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
