"use client";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api, { materialsApi } from "@/lib/api";
import {
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ClockIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import {
  DollarSign,
  Loader2,
  Minus,
  Package,
  Plus,
  Scale,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Shop {
  id: string;
  shopName: string;
  description?: string;
  about?: string;
  profileImage?: string;
  coverImage?: string;
  sellerTier?: string;
  country: string;
  state?: string;
  city: string;
  address: string;
  pincode?: string;
  isVerified: boolean;
  contactPhone: string;
  contactEmail?: string;
  websiteUrl?: string;
  businessHours?: string;
  supportedMaterials: string[];
  supportedJewelleryTypes: string[];
  makingChargePercent?: number;
  materialsPricing?: Array<{
    materialCode: string;
    makingChargePerGram: number | null;
  }>;
  averageRating?: number;
  totalRatings?: number;
  userId?: string;
  user?: {
    id?: string;
    firstName: string;
    lastName: string;
  };
  metalRates?: any[];
  ratings?: any[];
}

interface Product {
  id: string;
  sku: string;
  nameEn: string;
  descriptionEn?: string;
  jewelleryType: string;
  totalWeightGrams: number;
  totalPriceNpr: number;
  images: string[];
  status: string;
  stockQuantity: number;
  composition?: any;
}

const COUNTRIES: Record<
  string,
  { name: string; currency: string; symbol: string }
> = {
  NP: { name: "Nepal", currency: "NPR", symbol: "रू" },
  IN: { name: "India", currency: "INR", symbol: "₹" },
  US: { name: "United States", currency: "USD", symbol: "$" },
  UK: { name: "United Kingdom", currency: "GBP", symbol: "£" },
  AE: { name: "UAE", currency: "AED", symbol: "د.إ" },
};

const JEWELLERY_TYPES = [
  "RING",
  "NECKLACE",
  "PENDANT",
  "EARRING",
  "BRACELET",
  "BANGLE",
  "CHAIN",
  "ANKLET",
  "BROOCH",
  "NOSE_PIN",
  "MAANG_TIKKA",
  "OTHER",
];

const TIER_COLORS: Record<string, string> = {
  STANDARD: "bg-gray-100 text-gray-700",
  SILVER: "bg-slate-100 text-slate-700",
  GOLD: "bg-amber-100 text-amber-700",
  ELITE: "bg-purple-100 text-purple-700",
};

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const shopId = params.id as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Custom order dialog
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [customOrderForm, setCustomOrderForm] = useState({
    jewelleryType: "",
    metalType: "GOLD",
    purity: "22K",
    weightGrams: "",
    description: "",
    referenceImages: [] as string[],
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Market rates for pricing display
  const [marketRates, setMarketRates] = useState<Record<string, number>>({});

  // Product quantity state for cart
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Fix hydration - mark as mounted after client load
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (shopId) {
      loadShopDetails();
      loadShopProducts();
    }
  }, [shopId]);

  // Fetch market rates when shop loads
  useEffect(() => {
    if (shop?.country) {
      const countryInfo = COUNTRIES[shop.country];
      if (countryInfo) {
        materialsApi
          .getMarketRates({
            currency: countryInfo.currency,
            country: shop.country,
          })
          .then((res: any) => {
            setMarketRates(res.data?.metals || {});
          })
          .catch(() => setMarketRates({}));
      }
    }
  }, [shop?.country]);

  // Check if current user is the shop owner
  const isShopOwner =
    mounted &&
    isAuthenticated &&
    user &&
    shop &&
    (user.shop?.id === shop.id ||
      shop.userId === user.id ||
      shop.user?.id === user.id);

  const loadShopDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/shops/${shopId}`);
      setShop(response.data);
    } catch (err: any) {
      console.error("Failed to load shop:", err);
      setError(err.response?.data?.message || "Shop not found");
    } finally {
      setIsLoading(false);
    }
  };

  const loadShopProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await api.get("/inventory", {
        params: { shopId, status: "AVAILABLE" },
      });
      const items = response.data?.items || response.data || [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const getCurrency = () => {
    if (!shop) return { code: "NPR", symbol: "रू" };
    return {
      code: COUNTRIES[shop.country]?.currency || "NPR",
      symbol: COUNTRIES[shop.country]?.symbol || "रू",
    };
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarSolidIcon key={i} className="h-5 w-5 text-amber-400" />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarSolidIcon
            key={i}
            className="h-5 w-5 text-amber-400 opacity-50"
          />,
        );
      } else {
        stars.push(<StarIcon key={i} className="h-5 w-5 text-gray-300" />);
      }
    }
    return stars;
  };

  const handleAddToCart = async (product: Product) => {
    // Check if user is the shop owner
    if (isShopOwner) {
      toast({
        variant: "destructive",
        title: "Cannot Add to Cart",
        description: "You cannot purchase products from your own shop",
      });
      return;
    }

    const quantity = quantities[product.id] || 1;
    try {
      await addToCart({
        productId: product.id,
        shopId: shop!.id,
        quantity,
        product: {
          name: product.nameEn,
          sku: product.sku,
          price: product.totalPriceNpr,
          image: product.images?.[0],
          weight: product.totalWeightGrams,
        },
      });
      toast({
        title: "Added to Cart",
        description: `${product.nameEn} added to your cart`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item to cart",
      });
    }
  };

  const handleCustomOrder = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to place a custom order",
      });
      router.push("/auth/login");
      return;
    }

    if (!customOrderForm.jewelleryType || !customOrderForm.weightGrams) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in required fields",
      });
      return;
    }

    setSubmittingOrder(true);
    try {
      // Create RFQ request
      const response = await api.post("/rfq", {
        shopId: shop!.id,
        jewelleryType: customOrderForm.jewelleryType,
        buildMethod: "METHOD_A",
        alloyConfig: {
          metal: customOrderForm.metalType,
          purity: customOrderForm.purity,
        },
        weightGrams: parseFloat(customOrderForm.weightGrams),
        description: customOrderForm.description,
        referenceImages: customOrderForm.referenceImages,
      });

      toast({
        title: "Custom Order Submitted!",
        description: "The shop will respond to your request soon.",
      });
      setCustomOrderOpen(false);
      setCustomOrderForm({
        jewelleryType: "",
        metalType: "GOLD",
        purity: "22K",
        weightGrams: "",
        description: "",
        referenceImages: [],
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Failed to submit order",
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading shop details...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <BuildingStorefrontIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Shop Not Found</h2>
              <p className="text-muted-foreground mb-4">
                {error ||
                  "The shop you are looking for does not exist or has been removed."}
              </p>
              <Button onClick={() => router.push("/shops")}>
                <ChevronLeftIcon className="h-4 w-4 mr-2" />
                Browse All Shops
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currency = getCurrency();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Owner Banner */}
        {isShopOwner && (
          <div className="bg-blue-600 text-white py-3">
            <div className="container mx-auto px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BuildingStorefrontIcon className="h-5 w-5" />
                <span className="font-medium">
                  You are viewing your own shop
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/dashboard/shop")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative">
          {/* Cover Image */}
          {shop.coverImage ? (
            <div className="h-48 md:h-64 w-full overflow-hidden">
              <img
                src={shop.coverImage}
                alt="Shop cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
            </div>
          ) : (
            <div className="h-48 md:h-64 bg-gradient-to-br from-amber-600 to-amber-800" />
          )}

          <div className="container mx-auto px-4 relative -mt-16 pb-8">
            <Button
              variant="ghost"
              className="absolute -top-32 text-white/80 hover:text-white"
              onClick={() => router.push("/shops")}
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              All Shops
            </Button>

            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Profile Image */}
              <div className="h-28 w-28 rounded-xl border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden">
                {shop.profileImage ? (
                  <img
                    src={shop.profileImage}
                    alt={shop.shopName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BuildingStorefrontIcon className="h-12 w-12 text-amber-600" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {shop.shopName}
                  </h1>
                  {shop.isVerified && (
                    <Badge className="bg-green-500 text-white">
                      <CheckBadgeIcon className="h-4 w-4 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {shop.sellerTier && shop.sellerTier !== "STANDARD" && (
                    <Badge
                      className={TIER_COLORS[shop.sellerTier] || "bg-gray-100"}
                    >
                      {shop.sellerTier === "ELITE"
                        ? "👑"
                        : shop.sellerTier === "GOLD"
                          ? "🥇"
                          : "🥈"}{" "}
                      {shop.sellerTier}
                    </Badge>
                  )}
                </div>

                {shop.description && (
                  <p className="text-muted-foreground text-lg mb-2">
                    {shop.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" />
                    <span>
                      {shop.city},{" "}
                      {COUNTRIES[shop.country]?.name || shop.country}
                    </span>
                  </div>
                  {shop.averageRating && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {renderStars(shop.averageRating)}
                      </div>
                      <span className="ml-1">
                        {shop.averageRating.toFixed(1)} (
                        {shop.totalRatings || 0} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Dialog
                  open={customOrderOpen}
                  onOpenChange={setCustomOrderOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="bg-amber-600 text-white hover:bg-amber-700"
                    >
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Custom Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Custom Order</DialogTitle>
                      <DialogDescription>
                        Request a custom jewellery piece from {shop.shopName}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Jewellery Type *</Label>
                          <Select
                            value={customOrderForm.jewelleryType}
                            onValueChange={(v) =>
                              setCustomOrderForm({
                                ...customOrderForm,
                                jewelleryType: v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {JEWELLERY_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Metal Type</Label>
                          <Select
                            value={customOrderForm.metalType}
                            onValueChange={(v) =>
                              setCustomOrderForm({
                                ...customOrderForm,
                                metalType: v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GOLD">Gold</SelectItem>
                              <SelectItem value="SILVER">Silver</SelectItem>
                              <SelectItem value="PLATINUM">Platinum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Purity</Label>
                          <Select
                            value={customOrderForm.purity}
                            onValueChange={(v) =>
                              setCustomOrderForm({
                                ...customOrderForm,
                                purity: v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24K">24K (Pure)</SelectItem>
                              <SelectItem value="22K">22K</SelectItem>
                              <SelectItem value="18K">18K</SelectItem>
                              <SelectItem value="14K">14K</SelectItem>
                              <SelectItem value="925">925 Sterling</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Approx. Weight (grams) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={customOrderForm.weightGrams}
                            onChange={(e) =>
                              setCustomOrderForm({
                                ...customOrderForm,
                                weightGrams: e.target.value,
                              })
                            }
                            placeholder="e.g., 5.5"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description & Requirements</Label>
                        <Textarea
                          value={customOrderForm.description}
                          onChange={(e) =>
                            setCustomOrderForm({
                              ...customOrderForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Describe your design requirements, preferences, etc."
                          rows={4}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCustomOrderOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCustomOrder}
                        disabled={submittingOrder}
                      >
                        {submittingOrder ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            Submit Request
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {isShopOwner && shop.contactPhone && (
                  <a href={`tel:${shop.contactPhone}`}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <PhoneIcon className="h-5 w-5 mr-2" />
                      Call Now
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Products/Pre-built Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Available Products
                  </CardTitle>
                  <CardDescription>
                    Ready-to-buy jewellery items from this shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No products available at the moment</p>
                      <p className="text-sm mt-2">
                        Try placing a custom order instead!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <Card
                          key={product.id}
                          className="overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="aspect-square bg-gray-100 relative">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.nameEn}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-12 w-12 text-gray-300" />
                              </div>
                            )}
                            <Badge className="absolute top-2 right-2 bg-white/90 text-gray-900">
                              {product.jewelleryType?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-1 line-clamp-1">
                              {product.nameEn}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {product.sku}
                            </p>

                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Scale className="h-4 w-4" />
                                <span>{product.totalWeightGrams}g</span>
                              </div>
                              <span className="font-bold text-lg">
                                {currency.symbol}{" "}
                                {product.totalPriceNpr?.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isShopOwner && (
                                <div className="flex items-center border rounded-md">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      setQuantities({
                                        ...quantities,
                                        [product.id]: Math.max(
                                          1,
                                          (quantities[product.id] || 1) - 1,
                                        ),
                                      })
                                    }
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm">
                                    {quantities[product.id] || 1}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      setQuantities({
                                        ...quantities,
                                        [product.id]: Math.min(
                                          product.stockQuantity,
                                          (quantities[product.id] || 1) + 1,
                                        ),
                                      })
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {isShopOwner ? (
                                <Button
                                  className="flex-1"
                                  variant="secondary"
                                  disabled
                                >
                                  Your Product
                                </Button>
                              ) : (
                                <Button
                                  className="flex-1"
                                  onClick={() => handleAddToCart(product)}
                                  disabled={product.stockQuantity <= 0}
                                >
                                  <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                  Add to Cart
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* About Section */}
              {shop.about && (
                <Card>
                  <CardHeader>
                    <CardTitle>About Us</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {shop.about}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              {shop.ratings && shop.ratings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StarIcon className="h-5 w-5" />
                      Customer Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {shop.ratings
                        .filter((r: any) => r.isPublic !== false)
                        .map((review: any, idx: number) => (
                          <div
                            key={idx}
                            className="border-b pb-4 last:border-0"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) =>
                                  i < review.overall ? (
                                    <StarSolidIcon
                                      key={i}
                                      className="h-4 w-4 text-amber-400"
                                    />
                                  ) : (
                                    <StarIcon
                                      key={i}
                                      className="h-4 w-4 text-gray-300"
                                    />
                                  ),
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {review.reviewText && (
                              <p className="text-sm">{review.reviewText}</p>
                            )}
                            {/* Seller Reply */}
                            {review.sellerReply && (
                              <div className="mt-3 ml-4 pl-4 border-l-2 border-amber-200 bg-amber-50/50 rounded-r-lg p-3">
                                <p className="text-xs font-medium text-amber-700 mb-1">
                                  Seller Reply
                                </p>
                                <p className="text-sm text-amber-900">
                                  {review.sellerReply}
                                </p>
                                {review.sellerRepliedAt && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    {new Date(
                                      review.sellerRepliedAt,
                                    ).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Shop Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {shop.city}
                        {shop.state && `, ${shop.state}`}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <FlagImage code={shop.country as FlagCode} size={14} />{" "}
                        {COUNTRIES[shop.country]?.name || shop.country}
                      </p>
                    </div>
                  </div>

                  {/* Only show phone/email to shop owner */}
                  {isShopOwner && shop.contactPhone && (
                    <div className="flex items-start gap-3">
                      <PhoneIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <a
                          href={`tel:${shop.contactPhone}`}
                          className="text-sm text-amber-600 hover:underline"
                        >
                          {shop.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {isShopOwner && shop.contactEmail && (
                    <div className="flex items-start gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Email</p>
                        <a
                          href={`mailto:${shop.contactEmail}`}
                          className="text-sm text-amber-600 hover:underline"
                        >
                          {shop.contactEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Non-owners see a message to use platform */}
                  {!isShopOwner && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        Use Custom Order or platform messaging to contact this
                        shop
                      </p>
                    </div>
                  )}

                  {shop.websiteUrl && (
                    <div className="flex items-start gap-3">
                      <GlobeAltIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a
                          href={shop.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    </div>
                  )}

                  {shop.businessHours && (
                    <div className="flex items-start gap-3">
                      <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Business Hours</p>
                        <p className="text-sm text-muted-foreground">
                          {shop.businessHours}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Materials & Pricing */}
              {shop.supportedMaterials &&
                shop.supportedMaterials.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                        Materials & Making Charges
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Compare pricing per gram to find the best deal
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-2 font-medium">Material</th>
                              <th className="pb-2 font-medium text-right">
                                Market Rate /g
                              </th>
                              <th className="pb-2 font-medium text-right">
                                Making Charge /g
                              </th>
                              <th className="pb-2 font-medium text-right">
                                Total /g
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {shop.supportedMaterials.map((material) => {
                              const pricing = shop.materialsPricing?.find(
                                (p) => p.materialCode === material,
                              );
                              const liveRate = marketRates[material] || 0;
                              const makingCharge =
                                pricing?.makingChargePerGram ?? null;
                              const total =
                                liveRate && makingCharge !== null
                                  ? liveRate + makingCharge
                                  : null;
                              const { symbol } = getCurrency();

                              return (
                                <tr
                                  key={material}
                                  className="border-b last:border-0"
                                >
                                  <td className="py-3">
                                    <Badge variant="outline" className="font-medium">
                                      {material?.replace(/_/g, " ")}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-right tabular-nums">
                                    {liveRate
                                      ? `${symbol}${liveRate.toLocaleString()}`
                                      : "—"}
                                  </td>
                                  <td className="py-3 text-right tabular-nums">
                                    {makingCharge !== null
                                      ? `${symbol}${makingCharge.toLocaleString()}`
                                      : "—"}
                                    {makingCharge !== null &&
                                      liveRate > 0 && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                          (
                                          {(
                                            (makingCharge / liveRate) *
                                            100
                                          ).toFixed(1)}
                                          %)
                                        </span>
                                      )}
                                  </td>
                                  <td className="py-3 text-right font-semibold tabular-nums">
                                    {total !== null
                                      ? `${symbol}${total.toLocaleString()}`
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {shop.makingChargePercent !== undefined && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Default making charge rate:{" "}
                          <span className="font-medium">
                            {shop.makingChargePercent}%
                          </span>{" "}
                          of metal rate
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

              {/* Supported Jewellery Types */}
              {shop.supportedJewelleryTypes &&
                shop.supportedJewelleryTypes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Jewellery Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {shop.supportedJewelleryTypes.map((type) => (
                          <Badge key={type} variant="secondary">
                            {type?.replace(/_/g, " ") || type}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
