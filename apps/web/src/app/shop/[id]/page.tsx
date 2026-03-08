"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/image-upload";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Gem,
  Heart,
  Info,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Share2,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface GemstoneDetail {
  type: string;
  cut?: string;
  caratWeight?: number;
  color?: string;
  clarity?: string;
  setting?: string;
  count?: number;
  valueNpr?: number;
}

interface InventoryItem {
  id: string;
  sku?: string;
  nameEn: string;
  nameNe?: string;
  descriptionEn?: string;
  descriptionNe?: string;
  jewelleryType: string;
  buildMethod: string;
  composition: any;
  totalWeightGrams: number;
  metalValueNpr?: number;
  makingChargeNpr?: number;
  gemstoneValueNpr?: number;
  totalPriceNpr: number;
  stockQuantity: number;
  images: string[];
  status: string;
  gemstones?: GemstoneDetail[];
  gender?: string;
  occasion?: string;
  collection?: string;
  size?: string;
  shop: {
    id: string;
    shopName: string;
    logoUrl?: string;
    addressLine1?: string;
    city?: string;
    phone?: string;
    isVerified: boolean;
  };
}

import { useTaxRules } from "@/hooks/useTaxRules";
import { getApiUrl } from "@/lib/api";
import { CURRENCIES, usePreferencesStore } from "@/store/preferences";

const API_URL = getApiUrl();

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Cart context
  const { addToCart } = useCart();
  const t = useT();

  // Get currency and country from global preferences store
  const currency = usePreferencesStore((state) => state.currency);
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.USD;
  const country = usePreferencesStore((state) => state.country);

  // Fetch dynamic tax rules for customer's country
  const { getTaxBreakdown, loading: taxLoading } = useTaxRules(country);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchItem(params.id as string);
    }
  }, [params.id]);

  const fetchItem = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${id}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract metal info from composition
  const getMetalInfo = () => {
    if (!item?.composition) return { metal: "N/A", purity: "" };
    const metal =
      item.composition?.baseAlloy?.metal || item.composition?.metal || "";
    const purity =
      item.composition?.baseAlloy?.purity || item.composition?.purity || "";
    return { metal, purity };
  };

  // Helper to get build method description
  const getBuildMethodInfo = (method: string) => {
    const methods: Record<string, { label: string; description: string }> = {
      METHOD_A: {
        label: "Solid Pure Metal",
        description:
          "Handcrafted from solid gold/silver without any base metal. Highest purity with traditional craftsmanship.",
      },
      METHOD_B: {
        label: "Gold/Silver Alloy",
        description:
          "Mixed with other metals for enhanced durability. Standard jewellery making method used by most jewellers worldwide.",
      },
      METHOD_C: {
        label: "Plated/Coated",
        description:
          "Base metal coated with gold/silver layer. An affordable option that maintains a similar luxurious appearance.",
      },
      METHOD_D: {
        label: "Machine Made",
        description:
          "Factory manufactured with precision machinery. Ensures consistent quality and enables modern intricate designs.",
      },
    };
    return (
      methods[method] || {
        label: method?.replace("_", " ") || "Unknown",
        description: "Standard manufacturing process.",
      }
    );
  };

  // Get metal color from composition
  const getMetalColor = () => {
    const metal = getMetalInfo().metal?.toLowerCase() || "";
    if (metal.includes("gold")) return "Yellow";
    if (metal.includes("white gold")) return "White";
    if (metal.includes("rose gold")) return "Rose";
    if (metal.includes("silver")) return "Silver";
    if (metal.includes("platinum")) return "Silver";
    return "Yellow";
  };

  // Calculate price per gram (for metal rate display)
  const getPricePerGram = () => {
    if (!item?.metalValueNpr || !item?.totalWeightGrams) return 0;
    return item.metalValueNpr / item.totalWeightGrams;
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!item) return;

    setAddingToCart(true);
    try {
      await addToCart({
        productId: item.id,
        shopId: item.shop.id,
        quantity: quantity,
        product: {
          name: item.nameEn,
          sku: item.sku || item.id,
          price: item.totalPriceNpr,
          image: item.images?.[0],
          weight: item.totalWeightGrams,
        },
      });
      toast({
        title: t("Added to Cart"),
        description: `${item.nameEn} ${t("has been added to your cart.")}`,
      });
    } catch (error) {
      toast({
        title: t("Error"),
        description: t("Failed to add item to cart. Please try again."),
        variant: "destructive",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  // Format price in user's preferred currency
  const formatPrice = (priceNpr: number) => {
    // TODO: Convert from NPR to user's currency using exchange rates
    // For now, show in NPR with indication of user's currency preference
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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
        </main>
        <DynamicFooter />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Gem className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2"><T>Item not found</T></h2>
            <Link href="/shop">
              <Button><T>Back to Shop</T></Button>
            </Link>
          </div>
        </main>
        <DynamicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-gray-900 border-b">
          <div className="container mx-auto px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <T>Back to Shop</T>
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
                {item.images?.[currentImageIndex] ? (
                  <img
                    src={getImageUrl(item.images[currentImageIndex])}
                    alt={item.nameEn}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Gem className="h-24 w-24 text-gray-300" />
                  </div>
                )}

                {item.images && item.images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900"
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === 0 ? item.images.length - 1 : prev - 1,
                        )
                      }
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900"
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === item.images.length - 1 ? 0 : prev + 1,
                        )
                      }
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnails - smaller images */}
              {item.images && item.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {item.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === idx
                          ? "border-gold-500 ring-2 ring-gold-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`${item?.nameEn || "Product"} - Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {getMetalInfo().metal}{" "}
                    {getMetalInfo().purity && `(${getMetalInfo().purity})`}
                  </Badge>
                  <Badge variant="secondary">
                    {item.jewelleryType?.replace("_", " ") || "Jewellery"}
                  </Badge>
                  {item.stockQuantity <= 2 && item.stockQuantity > 0 && (
                    <Badge className="bg-orange-500">
                      <T>Only {item.stockQuantity} left</T>
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {item.nameEn}
                </h1>
                {item.nameNe && (
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    {item.nameNe}
                  </p>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= 4
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600 dark:text-gray-300">
                  4.0 (24 <T>reviews</T>)
                </span>
              </div>

              {/* Price */}
              <div className="bg-gold-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <T>Price</T>
                </p>
                <p className="text-3xl font-bold text-gold-600">
                  {formatPrice(item.totalPriceNpr)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <T>Weight:</T> {item.totalWeightGrams}g | {getMetalInfo().metal}{" "}
                  {getMetalInfo().purity}
                </p>
              </div>

              {/* Shop Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      {item.shop.logoUrl ? (
                        <img
                          src={item.shop.logoUrl}
                          alt={`${item.shop.shopName} logo`}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <Gem className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.shop.shopName}</h3>
                        {item.shop.isVerified && (
                          <Badge className="bg-green-500 text-xs">
                            <T>Verified</T>
                          </Badge>
                        )}
                      </div>
                      {item.shop.city && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.shop.city}
                        </p>
                      )}
                    </div>
                    <Link href={`/shops/${item.shop.id}`}>
                      <Button variant="outline" size="sm">
                        <T>Visit Shop</T>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Quantity & Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 dark:text-gray-300">
                    <T>Quantity:</T>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold">
                      {quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        setQuantity(Math.min(item.stockQuantity, quantity + 1))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.stockQuantity} <T>available</T>
                  </span>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 gold-gradient text-white"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={addingToCart || item.stockQuantity === 0}
                  >
                    {addingToCart ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-5 w-5 mr-2" />
                    )}
                    {item.stockQuantity === 0 ? t("Out of Stock") : t("Add to Cart")}
                  </Button>
                  <Button size="lg" variant="outline">
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <T>Certified Purity</T>
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Truck className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <T>Secure Delivery</T>
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-6 w-6 mx-auto text-gold-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <T>Support</T>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mt-12">
            <Tabs defaultValue="details">
              <TabsList className="w-full justify-start border-b bg-transparent h-auto p-0 flex-wrap">
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  <T>Product Details</T>
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  <T>Price Breakdown</T>
                </TabsTrigger>
                <TabsTrigger
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  <T>Description</T>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold-500"
                >
                  <T>Reviews</T>
                </TabsTrigger>
              </TabsList>

              {/* Product Details Tab */}
              <TabsContent value="details" className="mt-6">
                <div className="space-y-6">
                  {/* 1. Metal Details */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center">
                          <span className="text-gold-600 font-bold text-sm">
                            1
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold"><T>METAL DETAILS</T></h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {getMetalInfo().purity || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Karatage</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {getMetalColor()}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Material Colour</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {item.totalWeightGrams}g
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Gross Weight</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {getMetalInfo().metal || "Gold"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Metal</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {item.size || "Standard"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Size</T>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2. Gemstone Details (if applicable) */}
                  {item.gemstones && item.gemstones.length > 0 && (
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">
                              2
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold">
                            {item.gemstones[0]?.type?.toUpperCase() ||
                              "GEMSTONE"}{" "}
                            <T>DETAILS</T>
                          </h3>
                        </div>
                        {item.gemstones.map((gem, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-4"
                          >
                            {gem.clarity && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {gem.clarity}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {gem.type} <T>Clarity</T>
                                </p>
                              </div>
                            )}
                            {gem.color && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {gem.color}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {gem.type} <T>Color</T>
                                </p>
                              </div>
                            )}
                            {gem.count && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {String(gem.count).padStart(2, "0")}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  <T>No Of</T> {gem.type}s
                                </p>
                              </div>
                            )}
                            {gem.setting && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {gem.setting}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {gem.type} <T>Setting</T>
                                </p>
                              </div>
                            )}
                            {gem.cut && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {gem.cut}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {gem.type} <T>Shape</T>
                                </p>
                              </div>
                            )}
                            {gem.caratWeight && (
                              <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {gem.caratWeight} ct
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  <T>Carat Weight</T>
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* 3. General Details */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-sm">
                            {item.gemstones?.length ? "3" : "2"}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold">
                          <T>GENERAL DETAILS</T>
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                            {item.jewelleryType
                              ?.replace(/_/g, " ")
                              .toLowerCase() || "Jewellery"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Jewellery Type</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {item.shop.shopName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Brand</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {item.collection || "Classic"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Collection</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                            {item.gender || "Unisex"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Gender</T>
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                            {item.occasion || "All Occasions"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <T>Occasion</T>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 4. Build Method */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">
                            {item.gemstones?.length ? "4" : "3"}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold"><T>CRAFTSMANSHIP</T></h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-6 w-6 text-gold-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {getBuildMethodInfo(item.buildMethod).label}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">
                              {getBuildMethodInfo(item.buildMethod).description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Price Breakdown Tab */}
              <TabsContent value="pricing" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <T>PRODUCT DETAILS</T>
                          </th>
                          <th className="text-center p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <T>RATE</T>
                          </th>
                          <th className="text-center p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <T>WEIGHT</T>
                          </th>
                          <th className="text-center p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <T>DISCOUNT</T>
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <T>VALUE</T>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Metal Row */}
                        <tr className="border-b">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500" />
                              <div>
                                <p className="font-medium">
                                  {getMetalColor()} {getMetalInfo().metal}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {getMetalInfo().purity}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center p-4">
                            {item.metalValueNpr && item.totalWeightGrams ? (
                              <span>{formatPrice(getPricePerGram())}/g</span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-center p-4">
                            {item.totalWeightGrams}g
                          </td>
                          <td className="text-center p-4">-</td>
                          <td className="text-right p-4 font-medium">
                            {item.metalValueNpr
                              ? formatPrice(item.metalValueNpr)
                              : formatPrice(item.totalPriceNpr * 0.6)}
                          </td>
                        </tr>

                        {/* Stone Row (if gemstones exist) */}
                        {item.gemstones && item.gemstones.length > 0 && (
                          <tr className="border-b">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400" />
                                <span className="font-medium">
                                  {item.gemstones[0]?.type || "Stone"}
                                </span>
                              </div>
                            </td>
                            <td className="text-center p-4">-</td>
                            <td className="text-center p-4">
                              {item.gemstones[0]?.caratWeight
                                ? `${item.gemstones[0].caratWeight} ct`
                                : "-"}
                            </td>
                            <td className="text-center p-4">-</td>
                            <td className="text-right p-4 font-medium">
                              {item.gemstoneValueNpr
                                ? formatPrice(item.gemstoneValueNpr)
                                : "-"}
                            </td>
                          </tr>
                        )}

                        {/* Making Charges Row */}
                        <tr className="border-b">
                          <td className="p-4 font-medium"><T>Making Charges</T></td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4">-</td>
                          <td className="text-right p-4 font-medium">
                            {item.makingChargeNpr
                              ? formatPrice(item.makingChargeNpr)
                              : formatPrice(item.totalPriceNpr * 0.1)}
                          </td>
                        </tr>

                        {/* Sub Total Row */}
                        <tr className="border-b bg-gray-50">
                          <td className="p-4 font-medium"><T>Sub Total</T></td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4 font-medium">
                            {item.totalWeightGrams}g<br />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              <T>Gross Wt.</T>
                            </span>
                          </td>
                          <td className="text-center p-4">-</td>
                          <td className="text-right p-4 font-bold">
                            {formatPrice(item.totalPriceNpr)}
                          </td>
                        </tr>

                        {/* Discount Row (placeholder) */}
                        <tr className="border-b">
                          <td className="p-4 font-medium"><T>Discount</T></td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4 text-red-500 font-medium">
                            -{formatPrice(0)}
                          </td>
                          <td className="text-right p-4">-</td>
                        </tr>

                        {/* Subtotal after Discount */}
                        <tr className="border-b">
                          <td className="p-4 font-medium">
                            <T>Subtotal after Discount</T>
                          </td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4">-</td>
                          <td className="text-center p-4">-</td>
                          <td className="text-right p-4 font-medium">
                            {formatPrice(item.totalPriceNpr)}
                          </td>
                        </tr>

                        {/* Tax Rows - dynamic per category */}
                        {(() => {
                          const breakdown = getTaxBreakdown({
                            metal:
                              item.metalValueNpr || item.totalPriceNpr * 0.6,
                            making:
                              item.makingChargeNpr || item.totalPriceNpr * 0.1,
                            gemstone: item.gemstoneValueNpr || 0,
                          });
                          return (
                            <>
                              {breakdown.lineItems.map((li, idx) => (
                                <tr key={idx} className="border-b">
                                  <td className="p-4 font-medium">
                                    {li.taxName} (
                                    {(li.rate * 100).toFixed(
                                      (li.rate * 100) % 1 === 0 ? 0 : 1,
                                    )}
                                    %)
                                  </td>
                                  <td className="text-center p-4">-</td>
                                  <td className="text-center p-4">-</td>
                                  <td className="text-center p-4">-</td>
                                  <td className="text-right p-4 font-medium">
                                    {formatPrice(li.taxAmount)}
                                  </td>
                                </tr>
                              ))}
                              {breakdown.lineItems.length === 0 && (
                                <tr className="border-b">
                                  <td className="p-4 font-medium"><T>Tax</T></td>
                                  <td className="text-center p-4">-</td>
                                  <td className="text-center p-4">-</td>
                                  <td className="text-center p-4">-</td>
                                  <td className="text-right p-4 font-medium">
                                    {formatPrice(0)}
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const bd = getTaxBreakdown({
                            metal:
                              item.metalValueNpr || item.totalPriceNpr * 0.6,
                            making:
                              item.makingChargeNpr || item.totalPriceNpr * 0.1,
                            gemstone: item.gemstoneValueNpr || 0,
                          });
                          return (
                            <tr className="bg-gray-900 text-white">
                              <td colSpan={4} className="p-4 font-bold text-lg">
                                <T>Grand Total</T>
                              </td>
                              <td className="text-right p-4 font-bold text-xl text-gold-400">
                                {formatPrice(bd.grandTotal)}
                              </td>
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Description Tab */}
              <TabsContent value="description" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold">
                        <T>Product Description</T>
                      </h3>
                    </div>
                    <div className="prose max-w-none">
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.descriptionEn ||
                          `This beautiful ${item.jewelleryType?.replace(/_/g, " ").toLowerCase() || "piece"} is crafted with ${getMetalInfo().purity || ""} ${getMetalInfo().metal || "precious metal"}, weighing ${item.totalWeightGrams}g. ${getBuildMethodInfo(item.buildMethod).description}`}
                      </p>
                      {item.descriptionNe && (
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4 border-t pt-4">
                          {item.descriptionNe}
                        </p>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-3">
                        <T>Why Choose This Product?</T>
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span><T>BIS Hallmarked for assured purity</T></span>
                        </li>
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Sparkles className="h-4 w-4 text-gold-600" />
                          <span>
                            {getBuildMethodInfo(item.buildMethod).label}{" "}
                            <T>craftsmanship</T>
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span><T>Insured delivery to your doorstep</T></span>
                        </li>
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Phone className="h-4 w-4 text-purple-600" />
                          <span><T>Lifetime maintenance support</T></span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
                  <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2"><T>No reviews yet</T></h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    <T>Be the first to review this product</T>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <DynamicFooter />
    </div>
  );
}
