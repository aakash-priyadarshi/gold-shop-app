"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Shop {
  id: string;
  name: string;
  slug: string;
  status: string;
  isVerified: boolean;
}

interface ShopSwitcherProps {
  currentShopId?: string;
  onShopChange?: (shopId: string) => void;
}

export function ShopSwitcher({
  currentShopId,
  onShopChange,
}: ShopSwitcherProps) {
  const t = useT();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [newShopDialogOpen, setNewShopDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newShopForm, setNewShopForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    country: "Nepal",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (shops.length > 0 && currentShopId) {
      const current = shops.find((s) => s.id === currentShopId);
      if (current) {
        setActiveShop(current);
      }
    }
  }, [shops, currentShopId]);

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/shops/my-shops");
      setShops(response.data);

      // Set active shop
      if (response.data.length > 0) {
        const activeResponse = await api.get("/users/me");
        const activeId = activeResponse.data.activeShopId;
        const active =
          response.data.find((s: Shop) => s.id === activeId) ||
          response.data[0];
        setActiveShop(active);
      }
    } catch (error) {
      console.error("Failed to load shops:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchShop = async (shop: Shop) => {
    if (shop.id === activeShop?.id) return;

    setIsSwitching(true);
    try {
      await api.patch("/users/me/active-shop", { shopId: shop.id });
      setActiveShop(shop);
      onShopChange?.(shop.id);
      toast({
        title: t("Shop Switched"),
        description: `${t("Now managing")} ${shop.name}`,
      });
      // Refresh the page to load new shop data
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Switch Failed"),
        description: t(
          error.response?.data?.message || "Could not switch shop",
        ),
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const createNewShop = async () => {
    if (
      !newShopForm.name ||
      !newShopForm.address ||
      !newShopForm.city ||
      !newShopForm.phone ||
      !newShopForm.email
    ) {
      toast({
        variant: "destructive",
        title: t("Missing Fields"),
        description: t("Please fill in all required fields"),
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post("/shops", newShopForm);
      setNewShopDialogOpen(false);
      setNewShopForm({
        name: "",
        description: "",
        address: "",
        city: "",
        country: "Nepal",
        phone: "",
        email: "",
      });
      await loadShops();
      toast({
        title: t("Shop Created"),
        description: t("Your new shop is pending verification"),
      });
      // Switch to the new shop
      switchShop(response.data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Creation Failed"),
        description: t(
          error.response?.data?.message || "Could not create shop",
        ),
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-full justify-start">
        <Loader2 className="h-4 w-4 me-2 animate-spin" />
        <T>Loading shops...</T>
      </Button>
    );
  }

  if (shops.length === 0) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setNewShopDialogOpen(true)}
      >
        <Plus className="h-4 w-4 me-2" />
        <T>Create Your First Shop</T>
      </Button>
    );
  }

  const getStatusBadge = (shop: Shop) => {
    if (!shop.isVerified) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          <T>Pending</T>
        </Badge>
      );
    }
    if (shop.status === "ACTIVE") {
      return (
        <Badge variant="default" className="bg-green-600">
          <T>Active</T>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <T>{shop.status}</T>
      </Badge>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={isSwitching}
          >
            <div className="flex items-center gap-2 truncate">
              <Store className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                <span dir="auto">{activeShop?.name || t("Select Shop")}</span>
              </span>
            </div>
            {isSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <T>Your Shops</T>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {shops.map((shop) => (
            <DropdownMenuItem
              key={shop.id}
              onClick={() => switchShop(shop)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {shop.id === activeShop?.id && (
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
                <span
                  className={`truncate ${shop.id !== activeShop?.id ? "ms-6" : ""}`}
                  dir="auto"
                >
                  {shop.name}
                </span>
              </div>
              {getStatusBadge(shop)}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setNewShopDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 me-2" />
            <T>Add New Shop</T>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Shop Dialog */}
      <Dialog open={newShopDialogOpen} onOpenChange={setNewShopDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <T>Create New Shop</T>
            </DialogTitle>
            <DialogDescription>
              <T>
                Add another shop to your account. It will require verification
                before going live.
              </T>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="shopName">
                <T>Shop Name *</T>
              </Label>
              <Input
                id="shopName"
                value={newShopForm.name}
                onChange={(e) =>
                  setNewShopForm({ ...newShopForm, name: e.target.value })
                }
                placeholder={t("e.g., Golden Jewelers Main Branch")}
                dir="auto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopDescription">
                <T>Description</T>
              </Label>
              <Textarea
                id="shopDescription"
                value={newShopForm.description}
                onChange={(e) =>
                  setNewShopForm({
                    ...newShopForm,
                    description: e.target.value,
                  })
                }
                placeholder={t("Brief description of your shop")}
                dir="auto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopCity">
                  <T>City *</T>
                </Label>
                <Input
                  id="shopCity"
                  value={newShopForm.city}
                  onChange={(e) =>
                    setNewShopForm({ ...newShopForm, city: e.target.value })
                  }
                  placeholder={t("e.g., Kathmandu")}
                  dir="auto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopCountry">
                  <T>Country *</T>
                </Label>
                <Input
                  id="shopCountry"
                  value={newShopForm.country}
                  onChange={(e) =>
                    setNewShopForm({ ...newShopForm, country: e.target.value })
                  }
                  placeholder={t("Nepal")}
                  dir="auto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopAddress">
                <T>Address *</T>
              </Label>
              <Input
                id="shopAddress"
                value={newShopForm.address}
                onChange={(e) =>
                  setNewShopForm({ ...newShopForm, address: e.target.value })
                }
                placeholder={t("Street address")}
                dir="auto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopPhone">
                  <T>Phone *</T>
                </Label>
                <Input
                  id="shopPhone"
                  value={newShopForm.phone}
                  onChange={(e) =>
                    setNewShopForm({ ...newShopForm, phone: e.target.value })
                  }
                  placeholder="+977 9XXXXXXXXX"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopEmail">
                  <T>Email *</T>
                </Label>
                <Input
                  id="shopEmail"
                  type="email"
                  value={newShopForm.email}
                  onChange={(e) =>
                    setNewShopForm({ ...newShopForm, email: e.target.value })
                  }
                  placeholder="shop@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <T>
                  New shops require admin verification before they can accept
                  orders or appear in search results.
                </T>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewShopDialogOpen(false)}
            >
              <T>Cancel</T>
            </Button>
            <Button onClick={createNewShop} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 me-2" />
              )}
              <T>Create Shop</T>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
