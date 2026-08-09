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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SET_ROLES = [
  { value: "EARRING", label: "Earrings" },
  { value: "RING", label: "Ring" },
  { value: "MAANG_TIKKA", label: "Maang Tikka" },
  { value: "NECKLACE", label: "Necklace" },
  { value: "NATHUNI", label: "Nathuni / Nose pin" },
  { value: "MANGALSUTRA", label: "Mangalsutra" },
  { value: "BANGLE", label: "Bangles" },
  { value: "OTHER", label: "Other" },
];

const GEMSTONE_TYPES = [
  { code: "DIAMOND", name: "Diamond" },
  { code: "RUBY", name: "Ruby" },
  { code: "EMERALD", name: "Emerald" },
  { code: "SAPPHIRE", name: "Sapphire" },
  { code: "PEARL", name: "Pearl" },
  { code: "AMETHYST", name: "Amethyst" },
  { code: "TOPAZ", name: "Topaz" },
  { code: "OPAL", name: "Opal" },
  { code: "GARNET", name: "Garnet" },
  { code: "OTHER", name: "Other" },
];

const GEMSTONE_CUTS = [
  "Round",
  "Princess",
  "Oval",
  "Marquise",
  "Pear",
  "Cushion",
  "Emerald Cut",
  "Cabochon",
  "Other",
];

type GemstoneData = {
  type: string;
  cut: string;
  caratWeight: number;
  color?: string;
  clarity?: string;
  valueNpr: number;
};

type CompRow = {
  key: string;
  mode: "existing" | "new";
  componentItemId?: string;
  role: string;
  nameEn: string;
  sku: string;
  jewelleryType: string;
  totalWeightGrams: string;
  metalValueNpr: string;
  makingChargeNpr: string;
  gemstoneValueNpr: string;
  gemstones: GemstoneData[];
  /** Display price when picking existing */
  totalPriceNpr?: number;
};

function sumGemstoneValue(gems: GemstoneData[]) {
  return gems.reduce((sum, g) => sum + (g.valueNpr || 0), 0);
}

const PIECE_TYPES = [
  "EARRING",
  "NECKLACE",
  "MAANG_TIKKA",
  "NOSE_PIN",
  "MANGALSUTRA",
  "BANGLE",
  "RING",
  "PENDANT",
  "BRACELET",
  "OTHER",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  currencySymbol: string;
  formatCurrency: (n: number) => string;
  onCreated: () => void;
};

export function SetBuilderDialog({
  open,
  onOpenChange,
  shopId,
  currencySymbol,
  formatCurrency,
  onCreated,
}: Props) {
  const t = useT();
  const [nameEn, setNameEn] = useState("");
  const [sku, setSku] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = useState("5");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [availablePieces, setAvailablePieces] = useState<any[]>([]);
  const [components, setComponents] = useState<CompRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !shopId) return;
    setNameEn("");
    setSku(`SET-${Date.now().toString(36).toUpperCase()}`);
    setDiscountType("PERCENT");
    setDiscountValue("5");
    setLocationId("");
    setComponents([
      {
        key: crypto.randomUUID(),
        mode: "new",
        role: "NECKLACE",
        nameEn: "",
        sku: `CMP-${Date.now().toString(36).toUpperCase()}`,
        jewelleryType: "NECKLACE",
        totalWeightGrams: "",
        metalValueNpr: "",
        makingChargeNpr: "",
        gemstoneValueNpr: "0",
        gemstones: [],
      },
    ]);

    (async () => {
      try {
        const [locRes, invRes] = await Promise.all([
          inventoryApi.getStorageLocations(shopId),
          inventoryApi.getShopInventory(shopId, {
            status: "AVAILABLE",
            excludeSetComponents: true,
            limit: 100,
          }),
        ]);
        const locData = locRes.data?.data ?? locRes.data;
        setLocations(locData?.flat || []);
        const items =
          invRes.data?.items || invRes.data?.data?.items || invRes.data || [];
        setAvailablePieces(
          (Array.isArray(items) ? items : []).filter(
            (i: any) => i.jewelleryType !== "SET",
          ),
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }, [open, shopId]);

  const componentSum = useMemo(() => {
    return components.reduce((sum, c) => {
      if (c.mode === "existing" && c.totalPriceNpr != null) {
        return sum + c.totalPriceNpr;
      }
      const metal = parseFloat(c.metalValueNpr) || 0;
      const making = parseFloat(c.makingChargeNpr) || 0;
      const gem = parseFloat(c.gemstoneValueNpr) || 0;
      return sum + metal + making + gem;
    }, 0);
  }, [components]);

  const discountAmt = useMemo(() => {
    const v = parseFloat(discountValue) || 0;
    if (discountType === "PERCENT") return (componentSum * v) / 100;
    return Math.min(v, componentSum);
  }, [componentSum, discountType, discountValue]);

  const setPrice = Math.max(0, componentSum - discountAmt);

  const updateRow = (key: string, patch: Partial<CompRow>) => {
    setComponents((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  };

  const addGemstoneToRow = (rowKey: string) => {
    setComponents((rows) =>
      rows.map((r) => {
        if (r.key !== rowKey) return r;
        return {
          ...r,
          gemstones: [
            ...r.gemstones,
            { type: "", cut: "", caratWeight: 0, valueNpr: 0 },
          ],
        };
      }),
    );
  };

  const updateGemstoneInRow = (
    rowKey: string,
    gemIndex: number,
    field: keyof GemstoneData,
    value: string | number,
  ) => {
    setComponents((rows) =>
      rows.map((r) => {
        if (r.key !== rowKey) return r;
        const gemstones = [...r.gemstones];
        gemstones[gemIndex] = { ...gemstones[gemIndex], [field]: value };
        const gemstoneValueNpr = sumGemstoneValue(gemstones).toString();
        return { ...r, gemstones, gemstoneValueNpr };
      }),
    );
  };

  const removeGemstoneFromRow = (rowKey: string, gemIndex: number) => {
    setComponents((rows) =>
      rows.map((r) => {
        if (r.key !== rowKey) return r;
        const gemstones = r.gemstones.filter((_, i) => i !== gemIndex);
        const gemstoneValueNpr = sumGemstoneValue(gemstones).toString();
        return { ...r, gemstones, gemstoneValueNpr };
      }),
    );
  };

  const addRow = () => {
    setComponents((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        mode: "new",
        role: "EARRING",
        nameEn: "",
        sku: `CMP-${Date.now().toString(36).toUpperCase()}`,
        jewelleryType: "EARRING",
        totalWeightGrams: "",
        metalValueNpr: "",
        makingChargeNpr: "",
        gemstoneValueNpr: "0",
        gemstones: [],
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!nameEn.trim() || !sku.trim()) {
      toast({
        title: t("Name and SKU required"),
        variant: "destructive",
      });
      return;
    }
    if (components.length === 0) {
      toast({
        title: t("Add at least one component"),
        variant: "destructive",
      });
      return;
    }

    const payloadComponents = components.map((c, i) => {
      if (c.mode === "existing" && c.componentItemId) {
        return {
          componentItemId: c.componentItemId,
          role: c.role,
          sortOrder: i,
        };
      }
      return {
        role: c.role,
        sortOrder: i,
        nameEn: c.nameEn,
        sku: c.sku,
        jewelleryType: c.jewelleryType,
        totalWeightGrams: parseFloat(c.totalWeightGrams) || 0.01,
        metalValueNpr: parseFloat(c.metalValueNpr) || 0,
        makingChargeNpr: parseFloat(c.makingChargeNpr) || 0,
        gemstoneValueNpr: parseFloat(c.gemstoneValueNpr) || 0,
        gemstones: c.gemstones.filter((g) => g.type),
        composition: {
          baseAlloy: { metal: "GOLD", purity: "22K" },
          gemstones: c.gemstones.filter((g) => g.type),
        },
      };
    });

    for (const c of payloadComponents) {
      if (!(c as any).componentItemId && !(c as any).nameEn) {
        toast({
          title: t("Each new piece needs a name"),
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      await inventoryApi.createSet(shopId, {
        nameEn: nameEn.trim(),
        sku: sku.trim(),
        setDiscountType: discountType,
        setDiscountValue: parseFloat(discountValue) || 0,
        locationId: locationId || undefined,
        components: payloadComponents,
      });
      toast({ title: t("Set created") });
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({
        title: t("Failed to create set"),
        description:
          err?.response?.data?.message || err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <T>Add jewelry set</T>
          </DialogTitle>
          <DialogDescription>
            <T>
              Create a bridal or matching set with its own SKU. Components stay
              linked and are not sold separately until you break the set.
            </T>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>
                <T>Set name</T>
              </Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("Bridal set — Meera")}
              />
            </div>
            <div>
              <Label>
                <T>Set SKU</T>
              </Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
          </div>

          {locations.length > 0 && (
            <div>
              <Label>
                <T>Storage location</T>
              </Label>
              <Select
                value={locationId || "__none__"}
                onValueChange={(v) =>
                  setLocationId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Optional")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <T>Unassigned</T>
                  </SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                <T>Components</T>
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addRow}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>Add piece</T>
              </Button>
            </div>

            {components.map((c) => (
              <div
                key={c.key}
                className="border rounded-lg p-3 space-y-2 bg-muted/20"
              >
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="w-36">
                    <Label className="text-xs">
                      <T>Source</T>
                    </Label>
                    <Select
                      value={c.mode}
                      onValueChange={(v) =>
                        updateRow(c.key, {
                          mode: v as "existing" | "new",
                          componentItemId: undefined,
                          totalPriceNpr: undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">
                          <T>New piece</T>
                        </SelectItem>
                        <SelectItem value="existing">
                          <T>Existing</T>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">
                      <T>Role</T>
                    </Label>
                    <Select
                      value={c.role}
                      onValueChange={(v) => updateRow(c.key, { role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SET_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() =>
                      setComponents((rows) =>
                        rows.filter((r) => r.key !== c.key),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {c.mode === "existing" ? (
                  <Select
                    value={c.componentItemId || ""}
                    onValueChange={(id) => {
                      const piece = availablePieces.find((p) => p.id === id);
                      updateRow(c.key, {
                        componentItemId: id,
                        totalPriceNpr: piece?.totalPriceNpr,
                        nameEn: piece?.nameEn,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Pick inventory piece")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePieces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.sku} — {p.nameEn} ({currencySymbol}
                          {p.totalPriceNpr?.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">
                        <T>Name</T>
                      </Label>
                      <Input
                        value={c.nameEn}
                        onChange={(e) =>
                          updateRow(c.key, { nameEn: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={c.sku}
                        onChange={(e) =>
                          updateRow(c.key, { sku: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <T>Type</T>
                      </Label>
                      <Select
                        value={c.jewelleryType}
                        onValueChange={(v) =>
                          updateRow(c.key, { jewelleryType: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIECE_TYPES.map((ty) => (
                            <SelectItem key={ty} value={ty}>
                              {ty.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">
                        <T>Weight (g)</T>
                      </Label>
                      <Input
                        type="number"
                        value={c.totalWeightGrams}
                        onChange={(e) =>
                          updateRow(c.key, {
                            totalWeightGrams: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <T>Metal value</T>
                      </Label>
                      <Input
                        type="number"
                        value={c.metalValueNpr}
                        onChange={(e) =>
                          updateRow(c.key, { metalValueNpr: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <T>Making</T>
                      </Label>
                      <Input
                        type="number"
                        value={c.makingChargeNpr}
                        onChange={(e) =>
                          updateRow(c.key, { makingChargeNpr: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <T>Gemstone value</T>
                      </Label>
                      <Input
                        type="number"
                        value={c.gemstoneValueNpr}
                        onChange={(e) =>
                          updateRow(c.key, { gemstoneValueNpr: e.target.value })
                        }
                        readOnly={c.gemstones.length > 0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">
                        <T>Gemstones</T>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addGemstoneToRow(c.key)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <T>Add gemstone</T>
                      </Button>
                    </div>
                    {c.gemstones.map((gem, gemIdx) => (
                      <div
                        key={gemIdx}
                        className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end rounded border p-2 bg-background"
                      >
                        <div>
                          <Label className="text-[10px]">
                            <T>Type</T>
                          </Label>
                          <Select
                            value={gem.type}
                            onValueChange={(v) =>
                              updateGemstoneInRow(c.key, gemIdx, "type", v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={t("Type")} />
                            </SelectTrigger>
                            <SelectContent>
                              {GEMSTONE_TYPES.map((ty) => (
                                <SelectItem key={ty.code} value={ty.code}>
                                  {ty.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            <T>Cut</T>
                          </Label>
                          <Select
                            value={gem.cut}
                            onValueChange={(v) =>
                              updateGemstoneInRow(c.key, gemIdx, "cut", v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={t("Cut")} />
                            </SelectTrigger>
                            <SelectContent>
                              {GEMSTONE_CUTS.map((cut) => (
                                <SelectItem key={cut} value={cut}>
                                  {cut}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            <T>Carat</T>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8"
                            value={gem.caratWeight || ""}
                            onChange={(e) =>
                              updateGemstoneInRow(
                                c.key,
                                gemIdx,
                                "caratWeight",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            <T>Value</T> ({currencySymbol})
                          </Label>
                          <Input
                            type="number"
                            className="h-8"
                            value={gem.valueNpr || ""}
                            onChange={(e) =>
                              updateGemstoneInRow(
                                c.key,
                                gemIdx,
                                "valueNpr",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => removeGemstoneFromRow(c.key, gemIdx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-4 space-y-3 bg-amber-500/5">
            <div className="flex justify-between text-sm">
              <span>
                <T>Components sum</T>
              </span>
              <span className="font-medium">{formatCurrency(componentSum)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">
                  <T>Discount type</T>
                </Label>
                <Select
                  value={discountType}
                  onValueChange={(v) =>
                    setDiscountType(v as "PERCENT" | "FIXED")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">
                      <T>Percent</T>
                    </SelectItem>
                    <SelectItem value="FIXED">
                      <T>Fixed amount</T>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  <T>Discount</T>
                </Label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                <T>Discount amount</T>
              </span>
              <span>−{formatCurrency(discountAmt)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t pt-2">
              <span>
                <T>Set sell price</T>
              </span>
              <Badge className="text-sm px-3 py-1">
                {formatCurrency(setPrice)}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <T>Cancel</T>
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <T>Create set</T>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
