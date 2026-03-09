"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { T } from "@/components/ui/T";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translation-provider";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Gem,
  Heart,
  Layers,
  Loader2,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// Types matching the API
interface Design {
  id: string;
  imageUrl: string;
  jewelryType: string;
  buildMethod: string;
  metalType?: string;
  metalColor?: string;
  weightCategory?: string;
  estimatedWeight?: number;
  surfaceFinish?: string;
  hasGemstones?: boolean;
  primaryStone?: string;
  stoneCut?: string;
  stoneCarat?: number;
  stoneColor?: string;
  settingStyle?: string;
  additionalSpecs?: Record<string, unknown>;
  likesCount: number;
  viewsCount: number;
  ordersCount: number;
  isPublic: boolean;
  createdAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  isLikedByUser?: boolean;
}

interface PaginatedResponse {
  designs: Design[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const JEWELRY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "RING", label: "Rings" },
  { value: "NECKLACE", label: "Necklaces" },
  { value: "BRACELET", label: "Bracelets" },
  { value: "EARRING", label: "Earrings" },
  { value: "PENDANT", label: "Pendants" },
  { value: "BANGLE", label: "Bangles" },
  { value: "CHAIN", label: "Chains" },
  { value: "ANKLET", label: "Anklets" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular", icon: TrendingUp },
  { value: "liked", label: "Most Liked", icon: Heart },
  { value: "recent", label: "Most Recent", icon: Clock },
  { value: "ordered", label: "Most Ordered", icon: ShoppingBag },
];

const BUILD_METHOD_LABELS: Record<string, string> = {
  METHOD_A: "Solid Precious Metal",
  METHOD_B: "Precious Metal Alloy",
  METHOD_C: "Base Metal + Plating",
  METHOD_D: "Italian Machine Made",
};

export default function DesignGalleryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const t = useT();

  // State
  const [designs, setDesigns] = useState<Design[]>([]);
  const [featured, setFeatured] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [jewelryType, setJewelryType] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);

  // Load featured designs
  useEffect(() => {
    const loadFeatured = async () => {
      setFeaturedLoading(true);
      try {
        const response = await api.get("/designs/featured");
        setFeatured(response.data || []);
      } catch (error) {
        console.error("Failed to load featured designs:", error);
      } finally {
        setFeaturedLoading(false);
      }
    };
    loadFeatured();
  }, []);

  // Load designs with filters
  const loadDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        sort: sortBy,
      });

      if (jewelryType !== "all") {
        params.append("jewelryType", jewelryType);
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const response = await api.get<PaginatedResponse>(`/designs?${params}`);
      setDesigns(response.data.designs || []);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Failed to load designs:", error);
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, jewelryType, searchQuery]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // Handle like/unlike
  const handleLike = async (design: Design, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/designs");
      return;
    }

    setLikingId(design.id);
    try {
      if (design.isLikedByUser) {
        await api.delete(`/designs/${design.id}/like`);
        // Update local state
        const updateDesign = (d: Design) =>
          d.id === design.id
            ? { ...d, isLikedByUser: false, likesCount: d.likesCount - 1 }
            : d;
        setDesigns((prev) => prev.map(updateDesign));
        setFeatured((prev) => prev.map(updateDesign));
        if (selectedDesign?.id === design.id) {
          setSelectedDesign({
            ...selectedDesign,
            isLikedByUser: false,
            likesCount: selectedDesign.likesCount - 1,
          });
        }
      } else {
        await api.post(`/designs/${design.id}/like`);
        const updateDesign = (d: Design) =>
          d.id === design.id
            ? { ...d, isLikedByUser: true, likesCount: d.likesCount + 1 }
            : d;
        setDesigns((prev) => prev.map(updateDesign));
        setFeatured((prev) => prev.map(updateDesign));
        if (selectedDesign?.id === design.id) {
          setSelectedDesign({
            ...selectedDesign,
            isLikedByUser: true,
            likesCount: selectedDesign.likesCount + 1,
          });
        }
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setLikingId(null);
    }
  };

  // Handle "Build me this"
  const handleBuildThis = async (design: Design) => {
    try {
      // Call the API to get the RFQ prefill data
      const response = await api.post(`/designs/${design.id}/build`);
      const apiResponse = response.data;

      // Flatten the API response structure for the RFQ form
      // API returns: { success, designId, imageUrl, prefill: {...} }
      // RFQ form expects: { designId, imageUrl, jewelleryType, buildMethod, ... }
      const prefillData = {
        designId: apiResponse.designId,
        imageUrl: apiResponse.imageUrl,
        ...apiResponse.prefill, // Spread the nested prefill data
      };

      // Store in sessionStorage for the RFQ form to pick up
      sessionStorage.setItem("rfq-prefill", JSON.stringify(prefillData));

      // Navigate to RFQ create page
      router.push("/rfq/create?from=design");
    } catch (error) {
      console.error("Failed to prepare RFQ:", error);
    }
  };

  // Open design detail
  const openDesignDetail = async (design: Design) => {
    setSelectedDesign(design);
    // Increment view count
    try {
      await api.patch(`/designs/${design.id}/view`);
      const updateDesign = (d: Design) =>
        d.id === design.id ? { ...d, viewsCount: d.viewsCount + 1 } : d;
      setDesigns((prev) => prev.map(updateDesign));
      setFeatured((prev) => prev.map(updateDesign));
    } catch {
      // Ignore view count errors
    }
  };

  // Design card component
  const DesignCard = ({
    design,
    featured = false,
  }: {
    design: Design;
    featured?: boolean;
  }) => (
    <Card
      className={cn(
        "group overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
        featured && "ring-2 ring-amber-400",
      )}
      onClick={() => openDesignDetail(design)}
    >
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        {design.imageUrl ? (
          <Image
            src={design.imageUrl}
            alt={`${design.jewelryType} design`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gem className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Orivraa Logo Watermark - Bottom Right */}
        {design.imageUrl && (
          <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
            <div className="flex items-center gap-1">
              <Image
                src="/brand/orivraa-icon.svg"
                alt="Orivraa"
                width={14}
                height={14}
              />
              <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                Orivraa
              </span>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleBuildThis(design);
            }}
          >
            <ShoppingBag className="h-4 w-4 mr-1" />
            <T>Build This</T>
          </Button>
        </div>

        {/* Like button */}
        <button
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
          onClick={(e) => handleLike(design, e)}
          disabled={likingId === design.id}
        >
          {likingId === design.id ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                design.isLikedByUser
                  ? "fill-red-500 text-red-500"
                  : "text-gray-600 dark:text-gray-300",
              )}
            />
          )}
        </button>

        {/* Featured badge */}
        {featured && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            <T>Featured</T>
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium text-sm">
              {t(
                design.jewelryType.charAt(0) +
                  design.jewelryType.slice(1).toLowerCase(),
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(BUILD_METHOD_LABELS[design.buildMethod] || design.buildMethod)}
            </p>
          </div>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {design.metalType && (
            <Badge variant="outline" className="text-xs">
              {t(design.metalType.replace(/_/g, " "))}
            </Badge>
          )}
          {design.primaryStone && (
            <Badge variant="outline" className="text-xs">
              <Gem className="h-3 w-3 mr-0.5" />
              {t(design.primaryStone)}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart
              className={cn(
                "h-3 w-3",
                design.isLikedByUser && "fill-red-500 text-red-500",
              )}
            />
            {design.likesCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {design.viewsCount}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingBag className="h-3 w-3" />
            {design.ordersCount}
          </span>
        </div>

        {/* Creator */}
        {design.creator && (
          <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>
              {t("by")} {design.creator.firstName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <Sparkles className="inline h-8 w-8 text-amber-500 mr-2" />
            <T>Design Gallery</T>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            <T>
              Explore AI-generated jewelry designs from our community. Find
              inspiration or click &quot;Build This&quot; to create your own
              custom piece.
            </T>
          </p>
        </div>

        {/* Featured Designs */}
        {!featuredLoading && featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <T>Trending Designs</T>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.slice(0, 4).map((design) => (
                <DesignCard key={design.id} design={design} featured />
              ))}
            </div>
          </section>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search designs...")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Jewelry Type Filter */}
          <Select
            value={jewelryType}
            onValueChange={(v) => {
              setJewelryType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("Jewelry Type")} />
            </SelectTrigger>
            <SelectContent>
              {JEWELRY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {t(type.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("Sort by")} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {t(option.label)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mobile filter toggle */}
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            <T>Filters</T>
          </Button>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? t("Loading...") : `${total} ${t("designs found")}`}
          </p>

          {/* Create your own CTA */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/rfq/create">
                  <Button variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    <T>Create Your Own</T>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  <T>Design your custom jewelry with AI preview</T>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Design Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <CardContent className="p-3">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-16">
            <Gem className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              <T>No designs found</T>
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || jewelryType !== "all"
                ? t("Try adjusting your filters")
                : t("Be the first to create a design!")}
            </p>
            <Link href="/rfq/create">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                <T>Create Design</T>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              <T>Previous</T>
            </Button>

            <span className="text-sm text-muted-foreground px-4">
              {t("Page")} {page} {t("of")} {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              <T>Next</T>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Design Detail Modal */}
      <Dialog
        open={!!selectedDesign}
        onOpenChange={(open) => !open && setSelectedDesign(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDesign && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {t(
                    selectedDesign.jewelryType.charAt(0) +
                      selectedDesign.jewelryType.slice(1).toLowerCase(),
                  )}{" "}
                  {t("Design")}
                  {selectedDesign.creator && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {t("by")} {selectedDesign.creator.firstName}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {t(BUILD_METHOD_LABELS[selectedDesign.buildMethod])}
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  {selectedDesign.imageUrl ? (
                    <Image
                      src={selectedDesign.imageUrl}
                      alt={t("Design preview")}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gem className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  {/* Orivraa Logo Watermark - Bottom Right */}
                  {selectedDesign.imageUrl && (
                    <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                      <div className="flex items-center gap-1">
                        <Image
                          src="/brand/orivraa-icon.svg"
                          alt="Orivraa"
                          width={16}
                          height={16}
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          Orivraa
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* AI-Generated Description - Show first */}
                  {(() => {
                    const desc = selectedDesign.additionalSpecs?.description;
                    return desc ? (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">
                          &ldquo;{String(desc)}&rdquo;
                        </p>
                      </div>
                    ) : null;
                  })()}

                  {/* Specifications */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <T>Specifications</T>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <T>Type</T>
                        </span>
                        <span>{t(selectedDesign.jewelryType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <T>Build Method</T>
                        </span>
                        <span>
                          {t(BUILD_METHOD_LABELS[selectedDesign.buildMethod])}
                        </span>
                      </div>
                      {selectedDesign.metalType && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            <T>Metal</T>
                          </span>
                          <span>
                            {t(selectedDesign.metalType.replace(/_/g, " "))}
                          </span>
                        </div>
                      )}
                      {selectedDesign.metalColor && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            <T>Color</T>
                          </span>
                          <span>{t(selectedDesign.metalColor)}</span>
                        </div>
                      )}
                      {selectedDesign.surfaceFinish && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            <T>Finish</T>
                          </span>
                          <span>
                            {t(selectedDesign.surfaceFinish.replace(/_/g, " "))}
                          </span>
                        </div>
                      )}
                      {selectedDesign.weightCategory && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            <T>Weight</T>
                          </span>
                          <span>
                            {t(
                              selectedDesign.weightCategory.replace(/_/g, " "),
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gemstone info */}
                  {selectedDesign.hasGemstones &&
                    selectedDesign.primaryStone && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Gem className="h-4 w-4" />
                          <T>Gemstone Details</T>
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              <T>Stone</T>
                            </span>
                            <span>{t(selectedDesign.primaryStone)}</span>
                          </div>
                          {selectedDesign.stoneCut && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                <T>Cut</T>
                              </span>
                              <span>{t(selectedDesign.stoneCut)}</span>
                            </div>
                          )}
                          {selectedDesign.stoneColor && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                <T>Color</T>
                              </span>
                              <span>{t(selectedDesign.stoneColor)}</span>
                            </div>
                          )}
                          {selectedDesign.stoneCarat && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                <T>Carat</T>
                              </span>
                              <span>{selectedDesign.stoneCarat}</span>
                            </div>
                          )}
                          {selectedDesign.settingStyle && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                <T>Setting</T>
                              </span>
                              <span>{t(selectedDesign.settingStyle)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 py-3 border-y">
                    <span className="flex items-center gap-1 text-sm">
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          selectedDesign.isLikedByUser &&
                            "fill-red-500 text-red-500",
                        )}
                      />
                      {selectedDesign.likesCount} {t("likes")}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <Eye className="h-4 w-4" />
                      {selectedDesign.viewsCount} {t("views")}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <ShoppingBag className="h-4 w-4" />
                      {selectedDesign.ordersCount} {t("orders")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleLike(selectedDesign)}
                      disabled={likingId === selectedDesign.id}
                    >
                      {likingId === selectedDesign.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Heart
                          className={cn(
                            "h-4 w-4 mr-2",
                            selectedDesign.isLikedByUser &&
                              "fill-red-500 text-red-500",
                          )}
                        />
                      )}
                      {selectedDesign.isLikedByUser ? t("Liked") : t("Like")}
                    </Button>
                    <Button
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                      onClick={() => handleBuildThis(selectedDesign)}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      <T>Build Me This</T>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DynamicFooter />
    </div>
  );
}
