"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { T } from "@/components/ui/T";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { inventoryApi } from "@/lib/api";
import {
  buildProductGemstonePricingRequest,
  buildProductMetalPricingComposition,
} from "@/lib/pricing/product-price-request";
import { getImageUrl } from "@/lib/image-upload";
import { SetBuilderDialog } from "@/components/shop/SetBuilderDialog";
import { ProductDescriptionGenerator } from "@/components/shop/ProductDescriptionGenerator";
import { CertificateUploadField } from "@/components/shop/CertificateUploadField";
import {
  SellerProductDetailDialog,
  type SellerProductDetail,
} from "@/components/shop/SellerProductDetailDialog";
import { useT } from "@/providers/translation-provider";
import {
    Edit,
    GripVertical,
    Image as ImageIcon,
    Loader2,
    Maximize2,
    Package,
    Plus,
    RefreshCw,
    Scale,
    Search,
    Sparkles,
    Trash2,
    Unlink,
    Zap,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  calculateGemstoneCarats,
  calculateGemstoneWeightGrams,
  calculateGrossWeightGrams,
  HALLMARK_ID_MAX_LENGTH,
  classifyHallmarkId,
  normalizeGemstoneSnapshot,
  normalizeHallmarkId,
} from "@gold-shop/shared";

interface InventoryItem {
  id: string;
  sku: string;
  nameEn: string;
  descriptionEn?: string;
  jewelleryType: string;
  buildMethod: string;
  composition: any;
  totalWeightGrams: number;
  grossWeightGrams?: number;
  metalValueNpr: number;
  makingChargeNpr: number;
  wastagePercent?: number;
  gemstoneValueNpr: number;
  totalPriceNpr: number;
  images: string[];
  status: string;
  stockQuantity: number;
  hallmarkNumber?: string;
  certificateUrl?: string | null;
  purityCertUrl?: string | null;
  rfidCode?: string | null;
  locationId?: string | null;
  setComponents?: any[];
  createdAt: string;
}

const jewelleryTypes = [
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

const buildMethods = [
  {
    value: "METHOD_A",
    label: "Method A - Solid Pure Metal",
    description:
      "Handcrafted from solid gold/silver without any base metal. Highest purity, traditional craftsmanship.",
  },
  {
    value: "METHOD_B",
    label: "Method B - Gold/Silver Alloy",
    description:
      "Mixed with other metals for durability. Standard jewellery making method used by most jewellers.",
  },
  {
    value: "METHOD_C",
    label: "Method C - Plated/Coated",
    description:
      "Base metal coated with gold/silver layer. Affordable option with similar appearance.",
  },
  {
    value: "METHOD_D",
    label: "Method D - Machine Made",
    description:
      "Factory manufactured with precision. Consistent quality and modern designs.",
  },
];

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700 dark:text-green-300",
  SOLD: "bg-blue-100 text-blue-700 dark:text-blue-300",
  RESERVED: "bg-amber-100 text-amber-700 dark:text-amber-300",
  UNAVAILABLE: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
};

// Gemstone types (same as RFQ)
const gemstoneTypes = [
  { code: "DIAMOND", name: "Diamond" },
  { code: "RUBY", name: "Ruby" },
  { code: "EMERALD", name: "Emerald" },
  { code: "SAPPHIRE", name: "Sapphire" },
  { code: "PEARL", name: "Pearl" },
  { code: "AMETHYST", name: "Amethyst" },
  { code: "TOPAZ", name: "Topaz" },
  { code: "OPAL", name: "Opal" },
  { code: "GARNET", name: "Garnet" },
  { code: "TURQUOISE", name: "Turquoise" },
  { code: "CORAL", name: "Coral" },
  { code: "JADE", name: "Jade" },
  { code: "CITRINE", name: "Citrine" },
  { code: "PERIDOT", name: "Peridot" },
  { code: "AQUAMARINE", name: "Aquamarine" },
  { code: "OTHER", name: "Other" },
];

// Gemstone cuts
const gemstoneCuts = [
  "Round",
  "Princess",
  "Oval",
  "Marquise",
  "Pear",
  "Cushion",
  "Emerald Cut",
  "Asscher",
  "Radiant",
  "Heart",
  "Cabochon",
  "Other",
];

// GIA/IGI-style colour grades (D best → Z) plus fancy.
const gemstoneColors = [
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "Fancy",
];

// Standard clarity grades.
const gemstoneClarities = [
  "FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3",
];

// Cut/polish/symmetry grades.
const gemstoneCutGrades = ["Excellent", "Very Good", "Good", "Fair", "Poor"];

// Grading laboratories.
const gemstoneLabs = ["GIA", "IGI", "AGS", "SGL", "GII", "Other"];

// Weight unit conversion
const TOLA_TO_GRAM = 11.6638;

interface GemstoneData {
  type: string;
  origin?: string;
  cut: string;
  caratWeight: number;
  sizeMm?: number;
  color?: string;
  clarity?: string;
  qualityTier?: "BUDGET" | "STANDARD" | "PREMIUM";
  cutGrade?: string;
  gradingLab?: string; // GIA, IGI, AGS, ...
  certNumber?: string; // e.g. "GIA-2141438171"
  reportUrl?: string; // link to the digital report / verification
  reportDate?: string; // YYYY-MM-DD
  count?: number;
  valueNpr: number;
}

interface ProductFormData {
  nameEn: string;
  descriptionEn: string;
  sku: string;
  jewelleryType: string;
  buildMethod: string;
  metalType: string;
  purity: string;
  totalWeightGrams: string;
  metalValueNpr: string;
  makingChargeNpr: string;
  wastagePercent: string;
  gemstoneValueNpr: string;
  stockQuantity: string;
  images: string[];
  gemstones: GemstoneData[];
  hallmarkNumber: string;
  certificateUrl: string;
  purityCertUrl: string;
  rfidCode: string;
  assayOffice: string;
  locationId: string;
}

const emptyForm: ProductFormData = {
  nameEn: "",
  descriptionEn: "",
  sku: "",
  jewelleryType: "",
  buildMethod: "METHOD_A",
  metalType: "GOLD",
  purity: "22K",
  totalWeightGrams: "",
  metalValueNpr: "",
  makingChargeNpr: "",
  wastagePercent: "0",
  gemstoneValueNpr: "0",
  stockQuantity: "1",
  images: [],
  gemstones: [],
  hallmarkNumber: "",
  certificateUrl: "",
  purityCertUrl: "",
  rfidCode: "",
  assayOffice: "",
  locationId: "",
};

// Currency from hook (replaces inline mapping)

export default function ShopProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Shop-based currency
  const {
    currencyCode,
    symbol: currencySymbol,
    format: formatCurrency,
  } = useShopCurrency();
  const currency = { code: currencyCode, symbol: currencySymbol };

  // Weight unit state
  const [weightUnit, setWeightUnit] = useState<"gram" | "tola">("gram");

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  // Live pricing toggle for catalog list
  const [livePricing, setLivePricing] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, any>>({});
  const [livePricingLoading, setLivePricingLoading] = useState(false);

  // Gemstone suggestion state
  const [gemSuggesting, setGemSuggesting] = useState<number | null>(null);

  // Reprice
  const [repriceOpen, setRepriceOpen] = useState(false);
  const [repriceLoading, setRepriceLoading] = useState(false);
  const [repriceApplying, setRepriceApplying] = useState(false);
  const [repricePreview, setRepricePreview] = useState<any>(null);
  const [repriceSelected, setRepriceSelected] = useState<Set<string>>(new Set());
  const [makingChargeMode, setMakingChargeMode] = useState<"KEEP" | "RECALC_PERCENT">("KEEP");
  const [repriceMode, setRepriceMode] = useState<"FROM_SHOP_RATES" | "FROM_MARKET_RATES">("FROM_SHOP_RATES");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(
    null,
  );
  const [viewingProduct, setViewingProduct] =
    useState<SellerProductDetail | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Image upload hook
  const {
    uploading: isUploadingImage,
    progress: imageProgress,
    upload: uploadImage,
  } = useImageUpload({
    type: "product",
    onSuccess: (result) => {
      if (result.url) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, result.url!],
        }));
        toast({
          title: "Image Uploaded",
          description: "Image uploaded to cloud successfully",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error,
      });
    },
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const t = useT();

  // Open create dialog when landing from Vault & Tags (or any ?create=1 link)
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openAddDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Weight conversion helpers
  const gramsToTola = (grams: number) => grams / TOLA_TO_GRAM;
  const tolaToGrams = (tola: number) => tola * TOLA_TO_GRAM;

  const getDisplayWeight = (grams: number) => {
    if (weightUnit === "tola") {
      return gramsToTola(grams).toFixed(2);
    }
    return grams.toFixed(2);
  };

  const getWeightLabel = () => (weightUnit === "tola" ? "tola" : "g");

  useEffect(() => {
    if (user?.shop?.id) {
      loadProducts();
      inventoryApi
        .getStorageLocations(user.shop.id)
        .then((res) => {
          const data = res.data?.data ?? res.data;
          setStorageLocations(data?.flat || []);
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.shop?.id, statusFilter]);

  const loadProducts = async () => {
    if (!user?.shop?.id) return;
    setIsLoading(true);
    try {
      const params: any = { excludeSetComponents: true, limit: 100 };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await inventoryApi.getShopInventory(
        user.shop.id,
        params,
      );
      const items = response.data?.items || response.data || [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast({
        variant: "destructive",
        title: "Failed to load products",
        description: "Could not fetch your products",
      });
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      ...emptyForm,
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
    });
    setWeightUnit("gram");
    setIsDialogOpen(true);
  };

  const openAddSetDialog = () => {
    setEditingSetId(null);
    setIsSetDialogOpen(true);
  };

  const openEditDialog = (product: InventoryItem) => {
    // Sets must use the set builder — not the single-product form
    if (product.jewelleryType === "SET") {
      setEditingSetId(product.id);
      setIsSetDialogOpen(true);
      return;
    }

    setEditingProduct(product);
    setWeightUnit("gram");
    const comp = product.composition || {};
    setFormData({
      nameEn: product.nameEn,
      descriptionEn: product.descriptionEn || "",
      sku: product.sku,
      jewelleryType: product.jewelleryType,
      buildMethod: product.buildMethod,
      metalType: comp.baseAlloy?.metal || comp.metal || "GOLD",
      purity: comp.baseAlloy?.purity || comp.purity || "22K",
      totalWeightGrams: product.totalWeightGrams.toString(),
      metalValueNpr: product.metalValueNpr.toString(),
      makingChargeNpr: product.makingChargeNpr.toString(),
      wastagePercent: String(product.wastagePercent ?? 0),
      gemstoneValueNpr: product.gemstoneValueNpr.toString(),
      stockQuantity: product.stockQuantity.toString(),
      images: product.images || [],
      gemstones: Array.isArray(comp.gemstones)
        ? comp.gemstones.flatMap((g: any) => {
            const normalized = normalizeGemstoneSnapshot(g);
            return normalized
              ? [{
                  type: normalized.type,
                  origin: normalized.origin,
                  cut: normalized.cut || "",
                  caratWeight: normalized.caratWeight || 0,
                  sizeMm: normalized.sizeMm,
                  color: normalized.color,
                  clarity: normalized.clarity,
                  qualityTier: normalized.qualityTier || "STANDARD",
                  cutGrade: normalized.cutGrade,
                  gradingLab: normalized.gradingLab,
                  certNumber: normalized.certNumber,
                  reportUrl: normalized.reportUrl,
                  reportDate: normalized.reportDate,
                  count: normalized.count || 1,
                  valueNpr: normalized.value ?? normalized.cost ?? 0,
                }]
              : [];
          })
        : [],
      hallmarkNumber: product.hallmarkNumber || "",
      certificateUrl: product.certificateUrl || "",
      purityCertUrl: product.purityCertUrl || "",
      rfidCode: product.rfidCode || "",
      assayOffice: (product as any).assayOffice || "",
      locationId: product.locationId || "",
    });
    setIsDialogOpen(true);
  };

  // Handle image file selection and upload to R2
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check max 3 images
    if (formData.images.length >= 3) {
      toast({
        variant: "destructive",
        title: "Maximum Images Reached",
        description: "You can upload a maximum of 3 images per product",
      });
      e.target.value = "";
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
      });
      return;
    }

    // Upload to Cloudflare R2
    await uploadImage(file);

    // Reset the input
    e.target.value = "";
  };

  // Gemstone helpers
  const addGemstone = () => {
    setFormData({
      ...formData,
      gemstones: [
        ...formData.gemstones,
        { type: "", cut: "", caratWeight: 0, qualityTier: "STANDARD", count: 1, valueNpr: 0 },
      ],
    });
  };

  const updateGemstone = (index: number, field: string, value: any) => {
    const newGemstones = [...formData.gemstones];
    const current = newGemstones[index];
    const next = { ...current, [field]: value };
    if (field === "type") {
      const isDiamond = String(value).toUpperCase() === "DIAMOND";
      next.origin =
        isDiamond && (current.origin === "NATURAL" || current.origin === "LAB")
          ? current.origin
          : isDiamond
            ? "NATURAL"
            : undefined;
    }
    newGemstones[index] = next;
    setFormData({ ...formData, gemstones: newGemstones });

    // Update total gemstone value
    const totalGemstoneValue = newGemstones.reduce(
      (sum, g) => sum + (g.valueNpr || 0),
      0,
    );
    setFormData((prev) => ({
      ...prev,
      gemstones: newGemstones,
      gemstoneValueNpr: totalGemstoneValue.toString(),
    }));
  };

  const removeGemstone = (index: number) => {
    const newGemstones = formData.gemstones.filter((_, i) => i !== index);
    const totalGemstoneValue = newGemstones.reduce(
      (sum, g) => sum + (g.valueNpr || 0),
      0,
    );
    setFormData({
      ...formData,
      gemstones: newGemstones,
      gemstoneValueNpr: totalGemstoneValue.toString(),
    });
  };

  // Fetch gemstone price suggestion from backend resolver
  const suggestGemstonePrice = async (index: number) => {
    if (!user?.shop?.id) return;
    const gem = formData.gemstones[index];
    if (!gem.type) {
      toast({ title: t("Select gemstone type first"), variant: "destructive" });
      return;
    }
    setGemSuggesting(index);
    try {
      const { pricingApi } = await import("@/lib/api");
      const res = await pricingApi.resolveGemstone(
        buildProductGemstonePricingRequest(user.shop.id, gem),
      );
      const data = res.data;
      if (data?.effectiveTotal != null) {
        updateGemstone(index, "valueNpr", data.effectiveTotal);
        toast({
          title: t("Price suggested"),
          description: `${data.source === "SHOP" ? t("Your shop rate") : t("Orivraa reference")}: ${currency.symbol}${data.effectiveTotal.toLocaleString()}`,
        });
      }
    } catch (error) {
      toast({
        title: t("Suggestion unavailable"),
        description: error instanceof Error ? t(error.message) : t("Enter price manually"),
        variant: "destructive",
      });
    } finally {
      setGemSuggesting(null);
    }
  };

  // Fetch live prices for visible catalog items (in chunks of 50)
  const fetchLivePrices = async (itemIds: string[]) => {
    if (!user?.shop?.id || itemIds.length === 0) return;
    setLivePricingLoading(true);
    try {
      const { pricingApi } = await import("@/lib/api");
      const chunkSize = 50;
      const merged: Record<string, any> = {};
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        const chunk = itemIds.slice(i, i + chunkSize);
        const res = await pricingApi.resolveBulk(user.shop.id, chunk);
        if (res.data?.items) {
          Object.assign(merged, res.data.items);
        }
      }
      setLivePrices(merged);
    } catch {
      // Silently fail — stored prices remain visible
    } finally {
      setLivePricingLoading(false);
    }
  };

  // Load live pricing preference from localStorage
  useEffect(() => {
    if (!user?.shop?.id) return;
    const saved = localStorage.getItem(`orivraa:livePricing:${user.shop.id}`);
    if (saved === "true") setLivePricing(true);
  }, [user?.shop?.id]);

  // Persist live pricing preference
  useEffect(() => {
    if (!user?.shop?.id) return;
    localStorage.setItem(
      `orivraa:livePricing:${user.shop.id}`,
      String(livePricing),
    );
  }, [livePricing, user?.shop?.id]);

  // Fetch live prices when toggle turns on or products change
  useEffect(() => {
    if (!livePricing || !user?.shop?.id) {
      setLivePrices({});
      return;
    }
    const ids = products
      .filter((p) => p.status === "AVAILABLE")
      .map((p) => p.id);
    if (ids.length > 0) {
      fetchLivePrices(ids);
    } else {
      setLivePrices({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePricing, products, user?.shop?.id]);

  const handleSubmit = async () => {
    if (!user?.shop?.id) return;

    // Validation
    if (
      !formData.nameEn ||
      !formData.sku ||
      !formData.jewelleryType ||
      !formData.totalWeightGrams
    ) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    // Convert weight if in tola
    const weightInGrams =
      weightUnit === "tola"
        ? tolaToGrams(parseFloat(formData.totalWeightGrams))
        : parseFloat(formData.totalWeightGrams);

    setIsSubmitting(true);
    try {
      const dto = {
        nameEn: formData.nameEn,
        descriptionEn: formData.descriptionEn || undefined,
        sku: formData.sku,
        jewelleryType: formData.jewelleryType,
        buildMethod: formData.buildMethod,
        composition: {
          baseAlloy: {
            metal: formData.metalType,
            purity: formData.purity,
          },
          gemstones: formData.gemstones.filter((g) => g.type),
        },
        totalWeightGrams: weightInGrams,
        metalValueNpr: parseFloat(formData.metalValueNpr) || 0,
        makingChargeNpr: parseFloat(formData.makingChargeNpr) || 0,
        wastagePercent: parseFloat(formData.wastagePercent) || 0,
        gemstoneValueNpr: parseFloat(formData.gemstoneValueNpr) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 1,
        images: formData.images,
        hallmarkNumber: normalizeHallmarkId(formData.hallmarkNumber) || undefined,
        certificateUrl: formData.certificateUrl.trim() || null,
        purityCertUrl: formData.purityCertUrl.trim() || null,
        rfidCode: formData.rfidCode.trim() || undefined,
        assayOffice: formData.assayOffice || null,
        locationId: formData.locationId || null,
      };

      if (editingProduct) {
        await inventoryApi.update(editingProduct.id, dto);
        toast({
          title: "Product Updated",
          description: "Your product has been updated successfully",
        });
      } else {
        await inventoryApi.create(user.shop.id, dto);
        toast({
          title: "Product Created",
          description: "Your product has been added to inventory",
        });
      }

      setIsDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: editingProduct ? "Update Failed" : "Create Failed",
        description: error.response?.data?.message || "Could not save product",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await inventoryApi.delete(deleteId);
      toast({
        title: "Product Deleted",
        description: "The product has been removed from inventory",
      });
      setDeleteId(null);
      loadProducts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description:
          error.response?.data?.message || "Could not delete product",
      });
    }
  };

  const addImage = () => {
    if (newImageUrl && !formData.images.includes(newImageUrl)) {
      setFormData({
        ...formData,
        images: [...formData.images, newImageUrl],
      });
      setNewImageUrl("");
    }
  };

  const removeImage = (url: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((img) => img !== url),
    });
  };

  const calculateTotal = () => {
    const metal = parseFloat(formData.metalValueNpr) || 0;
    const making = parseFloat(formData.makingChargeNpr) || 0;
    const gemstone = parseFloat(formData.gemstoneValueNpr) || 0;
    return metal + making + gemstone;
  };

  const enteredMetalWeight = parseFloat(formData.totalWeightGrams) || 0;
  const formMetalWeightGrams =
    weightUnit === "tola"
      ? tolaToGrams(enteredMetalWeight)
      : enteredMetalWeight;
  const formGemstoneCarats = calculateGemstoneCarats(formData.gemstones);
  const formGemstoneWeightGrams = calculateGemstoneWeightGrams(
    formData.gemstones,
  );
  const formGrossWeightGrams = calculateGrossWeightGrams(
    formMetalWeightGrams,
    formData.gemstones,
  );

  const filteredProducts = products.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Product Catalog</T>
              </h1>
              <p className="text-muted-foreground">
                <T>Pre-built items you can add to catalogues, sell via POS, and invoice. Vault & Tags shows the physical location view.</T>
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {/* Live pricing toggle */}
              <div className="flex items-center gap-2 mr-2">
                <Switch
                  id="live-pricing-toggle"
                  checked={livePricing}
                  onCheckedChange={setLivePricing}
                />
                <Label htmlFor="live-pricing-toggle" className="text-sm cursor-pointer flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <T>Live pricing</T>
                  {livePricingLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                </Label>
              </div>
              <Button
                variant="outline"
                data-tour="inventory-reprice"
                onClick={async () => {
                  if (!user?.shop?.id) return;
                  setRepriceOpen(true);
                  setRepriceLoading(true);
                  setRepricePreview(null);
                  try {
                    const res = await inventoryApi.repricePreview(user.shop.id, {
                      mode: repriceMode,
                      makingChargeMode,
                    });
                    const data = res.data?.data ?? res.data;
                    setRepricePreview(data);
                    setRepriceSelected(
                      new Set((data?.items || []).map((i: any) => i.id)),
                    );
                  } catch (err: any) {
                    toast({
                      title: t("Reprice preview failed"),
                      description:
                        err?.response?.data?.message || err?.message,
                      variant: "destructive",
                    });
                  } finally {
                    setRepriceLoading(false);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <T>Reprice from rates</T>
              </Button>
              <Button
                variant="outline"
                data-tour="inventory-add-set"
                onClick={openAddSetDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                <T>Add Set</T>
              </Button>
              <Button data-tour="inventory-add" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                <T>Add Product</T>
              </Button>
            </div>
          </div>

          <Dialog open={repriceOpen} onOpenChange={setRepriceOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle><T>Reprice catalog from rates</T></DialogTitle>
                <DialogDescription>
                  <T>
                    Preview new metal values from your Pricing Setup rates.
                    Making charges stay as-is unless you choose recalculate.
                    Amounts are in your shop currency
                  </T>
                  {` (${currency.code}).`}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-sm"><T>Rate source</T></Label>
                <Select
                  value={repriceMode}
                  onValueChange={async (v: "FROM_SHOP_RATES" | "FROM_MARKET_RATES") => {
                    setRepriceMode(v);
                    if (!user?.shop?.id) return;
                    setRepriceLoading(true);
                    try {
                      const res = await inventoryApi.repricePreview(user.shop.id, {
                        mode: v,
                        makingChargeMode,
                      });
                      const data = res.data?.data ?? res.data;
                      setRepricePreview(data);
                      setRepriceSelected(
                        new Set((data?.items || []).map((i: any) => i.id)),
                      );
                    } finally {
                      setRepriceLoading(false);
                    }
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FROM_SHOP_RATES"><T>Your shop rates</T></SelectItem>
                    <SelectItem value="FROM_MARKET_RATES">
                      <T>Orivraa reference (live market)</T>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-sm"><T>Making charges</T></Label>
                <Select
                  value={makingChargeMode}
                  onValueChange={async (v: "KEEP" | "RECALC_PERCENT") => {
                    setMakingChargeMode(v);
                    if (!user?.shop?.id) return;
                    setRepriceLoading(true);
                    try {
                      const res = await inventoryApi.repricePreview(user.shop.id, {
                        mode: repriceMode,
                        makingChargeMode: v,
                      });
                      const data = res.data?.data ?? res.data;
                      setRepricePreview(data);
                      setRepriceSelected(
                        new Set((data?.items || []).map((i: any) => i.id)),
                      );
                    } finally {
                      setRepriceLoading(false);
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEEP"><T>Keep existing</T></SelectItem>
                    <SelectItem value="RECALC_PERCENT">
                      <T>Recalc from shop %</T>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px]">
                {repriceLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !repricePreview?.items?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    <T>
                      No items could be repriced. Set base metal rates in Inventory
                      → Pricing Setup and ensure products have weight + metal type.
                    </T>
                    {repricePreview?.skipped?.length ? (
                      <span className="block mt-2">
                        {repricePreview.skipped.length} <T>skipped</T>
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead><T>Product</T></TableHead>
                        <TableHead className="text-right"><T>Old</T></TableHead>
                        <TableHead className="text-right"><T>New</T></TableHead>
                        <TableHead className="text-right"><T>Δ%</T></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repricePreview.items.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={repriceSelected.has(row.id)}
                              onChange={(e) => {
                                setRepriceSelected((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(row.id);
                                  else next.delete(row.id);
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.sku} · {row.metalType} · {row.weightG}g
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {currency.symbol}
                            {row.old.totalPriceNpr.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {currency.symbol}
                            {row.new.totalPriceNpr.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm ${
                              row.deltaPct > 0
                                ? "text-green-600"
                                : row.deltaPct < 0
                                  ? "text-red-600"
                                  : ""
                            }`}
                          >
                            {row.deltaPct > 0 ? "+" : ""}
                            {row.deltaPct}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRepriceOpen(false)}>
                  <T>Cancel</T>
                </Button>
                <Button
                  disabled={
                    repriceApplying ||
                    repriceLoading ||
                    repriceSelected.size === 0
                  }
                  onClick={async () => {
                    if (!user?.shop?.id || !repricePreview) return;
                    setRepriceApplying(true);
                    try {
                      const updates = repricePreview.items
                        .filter((i: any) => repriceSelected.has(i.id))
                        .map((i: any) => ({
                          itemId: i.id,
                          metalValueNpr: i.new.metalValueNpr,
                          makingChargeNpr: i.new.makingChargeNpr,
                          gemstoneValueNpr: i.new.gemstoneValueNpr,
                          taxNpr: i.new.taxNpr,
                          totalPriceNpr: i.new.totalPriceNpr,
                        }));
                      await inventoryApi.repriceApply(user.shop.id, {
                        updates,
                        reason: "REPRICE_FROM_RATES",
                        rateSnapshot: repricePreview.rateSnapshot,
                      });
                      toast({
                        title: t("Prices updated"),
                        description: `${updates.length} ${t("products repriced")}`,
                      });
                      setRepriceOpen(false);
                      // reload list
                      const res = await inventoryApi.getShopInventory(
                        user.shop.id,
                        { limit: 100 },
                      );
                      const data = res.data?.data ?? res.data;
                      setProducts(data?.items || data || []);
                    } catch (err: any) {
                      toast({
                        title: t("Apply failed"),
                        description:
                          err?.response?.data?.message || err?.message,
                        variant: "destructive",
                      });
                    } finally {
                      setRepriceApplying(false);
                    }
                  }}
                >
                  {repriceApplying ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  <T>Apply</T> ({repriceSelected.size})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Filters */}
          <Card data-tour="inventory-search">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("Search by name or SKU...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("Filter by status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <T>All Products</T>
                    </SelectItem>
                    <SelectItem value="AVAILABLE">
                      <T>Available</T>
                    </SelectItem>
                    <SelectItem value="SOLD">
                      <T>Sold</T>
                    </SelectItem>
                    <SelectItem value="RESERVED">
                      <T>Reserved</T>
                    </SelectItem>
                    <SelectItem value="DISCONTINUED">
                      <T>Discontinued</T>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card data-tour="inventory-table">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    <T>No products found</T>
                  </p>
                  <p className="text-sm">
                    <T>Add your first product to start selling</T>
                  </p>
                  <Button onClick={openAddDialog} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    <T>Add Product</T>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <T>Product</T>
                      </TableHead>
                      <TableHead>
                        <T>Type</T>
                      </TableHead>
                      <TableHead>
                        <T>Gross weight</T>
                      </TableHead>
                      <TableHead>
                        <T>Price</T>
                      </TableHead>
                      <TableHead>
                        <T>Stock</T>
                      </TableHead>
                      <TableHead>
                        <T>Status</T>
                      </TableHead>
                      <TableHead>
                        <T>Actions</T>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                              {product.images?.[0] ? (
                                <Image
                                  src={getImageUrl(
                                    product.images[0],
                                    "thumbnail",
                                  )}
                                  alt={product.nameEn}
                                  className="w-full h-full object-cover"
                                  width={48}
                                  height={48}
                                  unoptimized
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {product.nameEn}
                                {product.jewelleryType === "SET" && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <T>Set</T>
                                    {product.setComponents?.length
                                      ? ` · ${product.setComponents.length}`
                                      : ""}
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.sku}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.jewelleryType?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {getDisplayWeight(
                                product.grossWeightGrams ||
                                  calculateGrossWeightGrams(
                                    product.totalWeightGrams,
                                    product.composition,
                                  ),
                              )}{" "}
                              {getWeightLabel()}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            <T>Metal</T>: {getDisplayWeight(product.totalWeightGrams)} {getWeightLabel()}
                          </p>
                        </TableCell>
                        <TableCell>
                          {livePricing && livePrices[product.id] ? (
                            <div>
                              <span className="font-medium">
                                {currency.symbol}{" "}
                                {Math.round(livePrices[product.id].effectiveTotal).toLocaleString()}
                              </span>
                              {livePrices[product.id].storedTotal != null &&
                                livePrices[product.id].storedTotal !== livePrices[product.id].effectiveTotal && (
                                <span className="block text-xs text-muted-foreground line-through">
                                  {currency.symbol}{" "}
                                  {Math.round(livePrices[product.id].storedTotal).toLocaleString()}
                                </span>
                              )}
                              {livePrices[product.id].components?.some(
                                (c: any) => c.source === "SHOP",
                              ) && (
                                <Badge variant="secondary" className="text-[9px] ml-1">
                                  <T>Shop rate</T>
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {currency.symbol}{" "}
                                {product.totalPriceNpr?.toLocaleString() || 0}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.stockQuantity > 0
                                ? "default"
                                : "destructive"
                            }
                          >
                            {product.stockQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[product.status] ||
                              "bg-gray-100 dark:bg-gray-800"
                            }
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {product.jewelleryType === "SET" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title={t("Break set — release pieces for individual sale")}
                                onClick={async () => {
                                  if (!user?.shop?.id) return;
                                  if (
                                    !confirm(
                                      t(
                                        "Break this set? Components become sellable individually and the set SKU is discontinued.",
                                      ),
                                    )
                                  )
                                    return;
                                  try {
                                    await inventoryApi.breakSet(
                                      user.shop.id,
                                      product.id,
                                    );
                                    toast({ title: t("Set broken") });
                                    loadProducts();
                                  } catch (err: any) {
                                    toast({
                                      variant: "destructive",
                                      title: t("Failed to break set"),
                                      description:
                                        err?.response?.data?.message,
                                    });
                                  }
                                }}
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(product)}
                              title={
                                product.jewelleryType === "SET"
                                  ? t("Edit set")
                                  : t("Edit product")
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title={t("Show full details to customer")}
                              onClick={() =>
                                setViewingProduct(
                                  product as unknown as SellerProductDetail,
                                )
                              }
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteId(product.id)}
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <SellerProductDetailDialog
          item={viewingProduct}
          open={Boolean(viewingProduct)}
          onOpenChange={(open) => {
            if (!open) setViewingProduct(null);
          }}
        />

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? t("Edit Product") : t("Add New Product")}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? t("Update metal, stones, pricing, and photos for this piece")
                  : t("Add a single jewellery piece to your catalog. Use Add Set for bridal or matching sets.")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Basic Info */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <T>Basic details</T>
                </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">
                    <T>Product Name</T> *
                  </Label>
                  <Input
                    id="name"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    placeholder="e.g., 22K Gold Wedding Ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="SKU-XXXX"
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hallmarkNumber">
                    <T>HUID / Hallmark No.</T>
                  </Label>
                  <Input
                    id="hallmarkNumber"
                    value={formData.hallmarkNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hallmarkNumber: normalizeHallmarkId(e.target.value),
                      })
                    }
                    placeholder="e.g. 8A9B1C or AHM-22K-88421"
                    maxLength={HALLMARK_ID_MAX_LENGTH}
                    autoCapitalize="characters"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {classifyHallmarkId(formData.hallmarkNumber) === "empty" ? (
                      <T>
                        Optional. BIS HUID is 6 characters. Hallmark and assay numbers can be longer.
                      </T>
                    ) : classifyHallmarkId(formData.hallmarkNumber) === "huid" ? (
                      <span className="text-green-600 dark:text-green-400">
                        <T>Looks like a BIS HUID</T>
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">
                        <T>Hallmark / certificate number</T>
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfidCode"><T>RFID / EPC code</T></Label>
                  <Input
                    id="rfidCode"
                    value={formData.rfidCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rfidCode: e.target.value.toUpperCase().slice(0, 128),
                      })
                    }
                    placeholder="e.g. EPC-300833B2DDD9014000000001"
                    maxLength={128}
                    autoCapitalize="characters"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    <T>Optional. A physical RFID/EPC identifier for audits; QR tags remain linked to this inventory record.</T>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assayOffice">
                    <T>UK Assay Office</T>
                  </Label>
                  <Select
                    value={formData.assayOffice || "none"}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        assayOffice: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger id="assayOffice">
                      <SelectValue placeholder="Select assay office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <T>None</T>
                      </SelectItem>
                      <SelectItem value="LONDON">London</SelectItem>
                      <SelectItem value="BIRMINGHAM">Birmingham</SelectItem>
                      <SelectItem value="SHEFFIELD">Sheffield</SelectItem>
                      <SelectItem value="EDINBURGH">Edinburgh</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    <T>
                      Optional. Carried onto invoices for UK hallmark compliance.
                    </T>
                  </p>
                </div>
                {storageLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      <T>Storage location</T>
                    </Label>
                    <Select
                      value={formData.locationId || "__none__"}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          locationId: v === "__none__" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("Optional")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <T>Unassigned</T>
                        </SelectItem>
                        {storageLocations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="jewelleryType">
                    <T>Jewellery Type</T> *
                  </Label>
                  <Select
                    value={formData.jewelleryType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, jewelleryType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select type")} />
                    </SelectTrigger>
                    <SelectContent>
                      {jewelleryTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>

              {/* Material Info */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <T>Metal &amp; construction</T>
                </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buildMethod">
                    <T>Build Method</T>
                  </Label>
                  <Select
                    value={formData.buildMethod}
                    onValueChange={(v) =>
                      setFormData({ ...formData, buildMethod: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buildMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metalType">
                    <T>Metal Type</T>
                  </Label>
                  <Select
                    value={formData.metalType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, metalType: v })
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
                <div className="space-y-2">
                  <Label htmlFor="purity">
                    <T>Purity</T>
                  </Label>
                  <Select
                    value={formData.purity}
                    onValueChange={(v) =>
                      setFormData({ ...formData, purity: v })
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
                      <SelectItem value="999">999 Fine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Weight & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="weight">
                      <T>Metal weight</T> *
                    </Label>
                    <div className="flex gap-1 text-xs">
                      <Button
                        type="button"
                        variant={weightUnit === "gram" ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setWeightUnit("gram")}
                      >
                        Gram
                      </Button>
                      <Button
                        type="button"
                        variant={weightUnit === "tola" ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setWeightUnit("tola")}
                      >
                        Tola
                      </Button>
                    </div>
                  </div>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalWeightGrams}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalWeightGrams: e.target.value,
                      })
                    }
                    placeholder={
                      weightUnit === "gram" ? "e.g., 5.5g" : "e.g., 0.47 tola"
                    }
                  />
                  {formData.totalWeightGrams && (
                    <p className="text-xs text-muted-foreground">
                      {weightUnit === "tola"
                        ? `= ${formMetalWeightGrams.toFixed(3)} g`
                        : `= ${gramsToTola(formMetalWeightGrams).toFixed(3)} tola`}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">
                    <T>Stock Quantity</T>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stockQuantity: e.target.value,
                      })
                    }
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gemstone-weight"><T>Gemstone weight</T></Label>
                  <Input
                    id="gemstone-weight"
                    value={`${formGemstoneCarats.toFixed(2)} ct = ${formGemstoneWeightGrams.toFixed(3)} g`}
                    readOnly
                    className="bg-muted tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground"><T>1 carat = 0.2 g</T></p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gross-weight"><T>Gross weight</T></Label>
                  <Input
                    id="gross-weight"
                    value={`${getDisplayWeight(formGrossWeightGrams)} ${getWeightLabel()}`}
                    readOnly
                    className="bg-muted font-semibold tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground"><T>Metal weight plus all gemstone weight</T></p>
                </div>
              </div>
              </div>

              {/* Gemstones Section */}
              <div data-tour="product-gemstones" className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <T>Gemstones</T>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGemstone}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <T>Add Gemstone</T>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <T>Diamonds are priced by carat; other stones need size in mm. Price suggestions use type, origin, size/carat, pricing quality and quantity. Color, clarity and cut remain product and invoice specifications.</T>
                </p>
                {formData.gemstones.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    <T>Optional. Add stones and use the sparkle button for a price suggestion.</T>
                  </p>
                )}
                {formData.gemstones.length > 0 && (
                  <div className="space-y-3">
                    {formData.gemstones.map((gem, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-3 space-y-3 bg-background"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Gemstone #{idx + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 h-6"
                            onClick={() => removeGemstone(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={gem.type}
                            onValueChange={(v) =>
                              updateGemstone(idx, "type", v)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneTypes.map((type) => (
                                <SelectItem key={type.code} value={type.code}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {gem.type === "DIAMOND" && (
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground"><T>Origin</T></Label>
                              <Select
                                value={gem.origin || "NATURAL"}
                                onValueChange={(v) => updateGemstone(idx, "origin", v)}
                              >
                                <SelectTrigger className="h-9"><SelectValue placeholder={t("Origin")} /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NATURAL"><T>Natural</T></SelectItem>
                                  <SelectItem value="LAB"><T>Lab-grown</T></SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <Select
                            value={gem.cut || ""}
                            onValueChange={(v) => updateGemstone(idx, "cut", v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Cut" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneCuts.map((cut) => (
                                <SelectItem key={cut} value={cut}>
                                  {cut}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={gem.type === "DIAMOND" ? t("Carat weight") : t("Size (mm)")}
                            className="h-9"
                            value={gem.type === "DIAMOND" ? gem.caratWeight || "" : gem.sizeMm || ""}
                            onChange={(e) =>
                              updateGemstone(
                                idx,
                                gem.type === "DIAMOND" ? "caratWeight" : "sizeMm",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder={`Value (${currency.code})`}
                              className="h-9 flex-1"
                              value={gem.valueNpr || ""}
                              onChange={(e) =>
                                updateGemstone(
                                  idx,
                                  "valueNpr",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 px-2 shrink-0"
                              title={t("Get price suggestion")}
                              disabled={gemSuggesting === idx || !gem.type}
                              onClick={() => suggestGemstonePrice(idx)}
                            >
                              {gemSuggesting === idx ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </Button>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            placeholder={t("Quantity")}
                            className="h-9"
                            value={gem.count || 1}
                            onChange={(e) => updateGemstone(idx, "count", Math.max(1, parseInt(e.target.value, 10) || 1))}
                          />
                        </div>

                        {/* 4Cs grading + lab certificate */}
                        <div className="grid grid-cols-3 gap-3">
                          <Select
                            value={gem.color || ""}
                            onValueChange={(v) =>
                              updateGemstone(idx, "color", v)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Colour" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneColors.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={gem.clarity || ""}
                            onValueChange={(v) =>
                              updateGemstone(idx, "clarity", v)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Clarity" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneClarities.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={gem.cutGrade || ""}
                            onValueChange={(v) =>
                              updateGemstone(idx, "cutGrade", v)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Cut grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneCutGrades.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground"><T>Pricing quality</T></Label>
                            <Select
                              value={gem.qualityTier || "STANDARD"}
                              onValueChange={(v) => updateGemstone(idx, "qualityTier", v)}
                            >
                              <SelectTrigger className="h-9"><SelectValue placeholder={t("Pricing quality")} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BUDGET"><T>Budget</T></SelectItem>
                                <SelectItem value="STANDARD"><T>Standard</T></SelectItem>
                                <SelectItem value="PREMIUM"><T>Premium</T></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground"><T>Grading laboratory</T></Label>
                            <Select
                              value={gem.gradingLab || ""}
                              onValueChange={(v) => updateGemstone(idx, "gradingLab", v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={t("Grading laboratory")} />
                              </SelectTrigger>
                              <SelectContent>
                                {gemstoneLabs.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              <T>Gemstone certificate no.</T>
                            </Label>
                            <Input
                              placeholder="e.g. GIA-2141438171"
                              className="h-9"
                              value={gem.certNumber || ""}
                              onChange={(e) =>
                                updateGemstone(idx, "certNumber", e.target.value)
                              }
                            />
                          </div>
                          <Input
                            type="date"
                            placeholder="Report date"
                            className="h-9"
                            value={gem.reportDate || ""}
                            onChange={(e) =>
                              updateGemstone(idx, "reportDate", e.target.value)
                            }
                          />
                        </div>
                        <CertificateUploadField
                          label={<T>Gemstone report file</T>}
                          hint={
                            <T>
                              Photo or PDF of this stone&apos;s lab report. Also used as See certificate.
                            </T>
                          }
                          value={gem.reportUrl || ""}
                          onChange={(url) => updateGemstone(idx, "reportUrl", url)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <ProductDescriptionGenerator
                shopId={user?.shop?.id}
                value={formData.descriptionEn}
                onChange={(descriptionEn) =>
                  setFormData({ ...formData, descriptionEn })
                }
                specs={{
                  jewelleryType: formData.jewelleryType,
                  metalType: formData.metalType,
                  purity: formData.purity,
                  weightGrams:
                    weightUnit === "tola"
                      ? tolaToGrams(parseFloat(formData.totalWeightGrams) || 0)
                      : parseFloat(formData.totalWeightGrams) || 0,
                  weightUnit: weightUnit === "tola" ? "TOLA" : "GRAM",
                  gemstones: formData.gemstones,
                }}
              />

              <div
                data-tour="product-certificates"
                className="rounded-lg border bg-muted/20 p-4 space-y-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <T>Certificates</T>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <T>
                    Upload hallmark and gemstone certificates so walk-in customers and shared catalogue links can open See certificate. Photos are compressed; PDFs must be under 5MB.
                  </T>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CertificateUploadField
                    label={<T>Hallmark certificate</T>}
                    hint={<T>BIS / assay certificate for the metal.</T>}
                    value={formData.certificateUrl}
                    onChange={(certificateUrl) =>
                      setFormData({ ...formData, certificateUrl })
                    }
                  />
                  <CertificateUploadField
                    label={<T>Gemstone certificate</T>}
                    hint={<T>Lab report for diamonds or coloured stones on this piece.</T>}
                    value={formData.purityCertUrl}
                    onChange={(purityCertUrl) =>
                      setFormData({ ...formData, purityCertUrl })
                    }
                  />
                </div>
              </div>

              {/* Pricing */}
              <div data-tour="product-pricing" className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <T>Pricing</T>
                </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metalValue">
                    Metal Value ({currency.code})
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      id="metalValue"
                      type="number"
                      value={formData.metalValueNpr}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          metalValueNpr: e.target.value,
                        })
                      }
                      placeholder="e.g., 50000"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 shrink-0"
                      title={t("Suggest from live rate")}
                      disabled={!formData.metalType || !formData.totalWeightGrams}
                      onClick={async () => {
                        if (!user?.shop?.id) return;
                        try {
                          const { pricingApi } = await import("@/lib/api");
                          const res = await pricingApi.resolve({
                            shopId: user.shop.id,
                            composition: buildProductMetalPricingComposition({
                              metalType: formData.metalType,
                              purity: formData.purity || undefined,
                              enteredWeight: parseFloat(formData.totalWeightGrams) || 0,
                              weightUnit,
                            }),
                          });
                          const metalComp = res.data?.components?.find(
                            (c: any) => c.component === "METAL",
                          );
                          if (metalComp) {
                            setFormData((prev) => ({
                              ...prev,
                              metalValueNpr: String(metalComp.effectiveAmount),
                            }));
                            toast({
                              title: t("Metal value suggested"),
                              description: `${metalComp.meta?.metalCode || formData.metalType} · ${formMetalWeightGrams.toFixed(3)}g · ${metalComp.source === "SHOP" ? t("Your shop rate") : t("Live market rate")}: ${currency.symbol}${Number(metalComp.effectiveAmount).toFixed(2)}`,
                            });
                          }
                        } catch {
                          toast({ title: t("Suggestion unavailable"), variant: "destructive" });
                        }
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="makingCharge">
                    Making Charge ({currency.code})
                  </Label>
                  <Input
                    id="makingCharge"
                    type="number"
                    value={formData.makingChargeNpr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        makingChargeNpr: e.target.value,
                      })
                    }
                    placeholder="e.g., 5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wastagePercent">
                    <T>Wastage %</T>{" "}
                    <span className="text-amber-600">*</span>
                  </Label>
                  <Input
                    id="wastagePercent"
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    required
                    value={formData.wastagePercent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        wastagePercent: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    <T>
                      Required on catalog pieces (use 0 if none). Fetched onto
                      the invoice when you add this product — seller can change
                      the % on the bill; the original catalog % stays visible.
                    </T>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemstoneValue">
                    Gemstone Value ({currency.code})
                  </Label>
                  <Input
                    id="gemstoneValue"
                    type="number"
                    value={formData.gemstoneValueNpr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gemstoneValueNpr: e.target.value,
                      })
                    }
                    placeholder="e.g., 10000"
                    readOnly={formData.gemstones.length > 0}
                  />
                  {formData.gemstones.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <T>Auto-calculated from gemstones</T>
                    </p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-background border p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    <T>Total Price</T>
                  </span>
                  <span className="text-xl font-bold">
                    {currency.symbol} {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
              </div>

              {/* Images */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <T>Product Images (max 3)</T>
                </p>

                {/* File Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${formData.images.length >= 3 ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploadingImage || formData.images.length >= 3}
                  />
                  <label
                    htmlFor="image-upload"
                    className={
                      formData.images.length >= 3
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    }
                  >
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>
                          <T>Uploading...</T> {imageProgress}%
                        </span>
                        <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${imageProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <T>Click to upload image (max 10MB)</T>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formData.images.length}/3 images added
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {/* URL Input (fallback) */}
                <div className="flex gap-2">
                  <Input
                    placeholder={t("Or enter image URL")}
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addImage}>
                    <T>Add</T>
                  </Button>
                </div>

                {/* Image Preview Grid - Drag to reorder, first image is primary */}
                {formData.images.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      <T>
                        Drag to reorder - First image will be shown as primary
                      </T>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.images.map((url, idx) => (
                        <div
                          key={url}
                          className={`relative group cursor-move ${idx === 0 ? "ring-2 ring-gold-500 ring-offset-2" : ""}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "text/plain",
                              idx.toString(),
                            );
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add("opacity-50");
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove("opacity-50");
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove("opacity-50");
                            const fromIdx = parseInt(
                              e.dataTransfer.getData("text/plain"),
                            );
                            const toIdx = idx;
                            if (fromIdx !== toIdx) {
                              const newImages = [...formData.images];
                              const [moved] = newImages.splice(fromIdx, 1);
                              newImages.splice(toIdx, 0, moved);
                              setFormData({ ...formData, images: newImages });
                            }
                          }}
                        >
                          <div className="absolute top-1 left-1 z-10 bg-black/50 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-3 w-3 text-white" />
                          </div>
                          {idx === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gold-500 text-white text-[10px] text-center py-0.5">
                              Primary
                            </div>
                          )}
                          <Image
                            src={getImageUrl(url, "thumbnail")}
                            alt={`Product ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                            width={80}
                            height={80}
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(url)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <T>Cancel</T>
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <T>Saving...</T>
                  </>
                ) : editingProduct ? (
                  t("Update Product")
                ) : (
                  t("Add Product")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {user?.shop?.id && (
          <SetBuilderDialog
            open={isSetDialogOpen}
            onOpenChange={(open) => {
              setIsSetDialogOpen(open);
              if (!open) setEditingSetId(null);
            }}
            shopId={user.shop.id}
            editingSetId={editingSetId}
            currencySymbol={currency.symbol}
            formatCurrency={(n) =>
              `${currency.symbol} ${n.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}`
            }
            onCreated={loadProducts}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                <T>Delete Product</T>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <T>
                  Are you sure you want to delete this product? This action
                  cannot be undone.
                </T>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <T>Cancel</T>
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <T>Delete</T>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ShopGuard>
  );
}
