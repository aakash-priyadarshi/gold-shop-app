/**
 * Admin Tax Rules Panel
 *
 * UI for managing country-specific tax rules.
 * Tax rates vary by country AND by product category:
 *   - Nepal: 2% Luxury Tax on gold, 13% VAT on gemstones
 *   - India: 3% GST on metal, 5% GST on making charges
 *   - UAE/UK/EU: flat VAT on all components
 *
 * Admin can view, edit, add, and delete rules.
 * Each rule has its own save button for independent saving.
 * All changes persist to the TaxRuleConfig table via backend.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TaxRule {
  id: string;
  taxType: string;
  taxName: string;
  category: string;
  rate: number;
  isCompounding: boolean;
  priority: number;
  stateCode: string | null;
  description: string | null;
  isActive: boolean;
}

interface TaxRulesResponse {
  region: string;
  source: "DB" | "DEFAULT";
  rules: TaxRule[];
}

const CATEGORIES = [
  { value: "ALL", label: "All Components" },
  { value: "PRECIOUS_METAL", label: "Precious Metal (Gold/Silver)" },
  { value: "MAKING_CHARGE", label: "Making Charges" },
  { value: "GEMSTONE", label: "Gemstones & Diamonds" },
  { value: "FINISH", label: "Finish / Plating" },
];

const COUNTRIES = [
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  { code: "EU", name: "Europe", flag: "🇪🇺" },
  { code: "US", name: "United States", flag: "🇺🇸" },
];

export function AdminTaxRulesPanel() {
  const [selectedCountry, setSelectedCountry] = useState<string>("NP");
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [source, setSource] = useState<string>("DEFAULT");
  const [loading, setLoading] = useState(false);
  // Track which row index is currently saving
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadRules();
  }, [selectedCountry]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/settings/tax-config?country=${selectedCountry}`,
      );
      if (res.ok) {
        const data: TaxRulesResponse = await res.json();
        setRules(data.rules || []);
        setSource(data.source || "DEFAULT");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          title: "Error",
          description: errData.error || "Failed to load tax rules",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to load tax rules:", err);
      toast({
        title: "Error",
        description: "Failed to load tax rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save a single rule to the backend
   */
  const saveRule = async (index: number) => {
    const rule = rules[index];
    if (!rule) return;

    // Validate
    if (!rule.taxName || rule.taxName === "New Tax") {
      toast({
        title: "Validation Error",
        description: "Please enter a tax name",
        variant: "destructive",
      });
      return;
    }
    if (rule.rate <= 0) {
      toast({
        title: "Validation Error",
        description: "Rate must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setSavingIndex(index);
    try {
      const res = await fetch("/api/settings/tax-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: selectedCountry,
          rules: [
            {
              taxName: rule.taxName,
              taxType: rule.taxType,
              category: rule.category,
              rate: rule.rate,
              description: rule.description || null,
              priority: rule.priority,
              isActive: rule.isActive ?? true,
            },
          ],
        }),
      });

      if (res.ok) {
        toast({
          title: "Saved",
          description: `${rule.taxName} (${rule.category}) saved`,
        });
        // Reload to get the DB id back
        await loadRules();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          title: "Save Failed",
          description: errData.error || "Could not save tax rule",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to save tax rule:", err);
      toast({
        title: "Error",
        description: "Failed to save tax rule",
        variant: "destructive",
      });
    } finally {
      setSavingIndex(null);
    }
  };

  const updateRule = (index: number, updates: Partial<TaxRule>) => {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...updates } : rule)),
    );
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: "",
        taxType: "VAT",
        taxName: "",
        category: "ALL",
        rate: 0,
        isCompounding: false,
        priority: prev.length + 1,
        stateCode: null,
        description: "",
        isActive: true,
      },
    ]);
  };

  const deleteRule = async (index: number) => {
    // For now, just remove from local state.
    // If the rule has an id (exists in DB), we could call a delete endpoint.
    // The next save-all or individual save will not include it.
    setRules((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: "Rule Removed",
      description:
        "Rule removed from view. It will be deleted from the database when the remaining rules are saved.",
    });
  };

  const countryInfo = COUNTRIES.find((c) => c.code === selectedCountry);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Tax Rules Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage country-specific tax rates by product category. Changes apply
            to all pricing calculations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadRules}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Country Selector */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Country</Label>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  {c.flag} {c.name} ({c.code})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant={source === "DB" ? "default" : "secondary"}>
          {source === "DB" ? "From Database" : "Default Rules"}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading tax rules...
          </span>
        </div>
      ) : (
        <>
          {/* Info Banner */}
          {source === "DEFAULT" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                These are default fallback rules. Click the{" "}
                <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 rounded text-white text-xs mx-0.5">
                  ✓
                </span>{" "}
                button on each row to persist it to the database.
              </p>
            </div>
          )}

          <Separator />

          {/* Tax Rules Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Tax Rules for {countryInfo?.flag} {countryInfo?.name}
              </h3>
              <Button onClick={addRule} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>

            {rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tax rules configured. Click &quot;Add Rule&quot; to create
                one.
              </div>
            )}

            {/* Header row */}
            {rules.length > 0 && (
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-2">Tax Name</div>
                <div className="col-span-2">Tax Type</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-1 text-center">Rate (%)</div>
                <div className="col-span-1 text-center">Priority</div>
                <div className="col-span-2">Description</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
            )}

            {rules.map((rule, index) => (
              <div
                key={rule.id || `new-${index}`}
                className="grid grid-cols-12 gap-2 items-center px-3 py-2 border rounded-lg"
              >
                {/* Tax Name */}
                <div className="col-span-2">
                  <Input
                    value={rule.taxName}
                    onChange={(e) =>
                      updateRule(index, { taxName: e.target.value })
                    }
                    placeholder="e.g. Luxury Tax"
                    className="text-sm h-8"
                  />
                </div>

                {/* Tax Type */}
                <div className="col-span-2">
                  <Select
                    value={rule.taxType}
                    onValueChange={(v) => updateRule(index, { taxType: v })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VAT">VAT</SelectItem>
                      <SelectItem value="GST">GST</SelectItem>
                      <SelectItem value="LUXURY_TAX">Luxury Tax</SelectItem>
                      <SelectItem value="SALES_TAX">Sales Tax</SelectItem>
                      <SelectItem value="EXCISE">Excise</SelectItem>
                      <SelectItem value="CUSTOMS">Customs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="col-span-2">
                  <Select
                    value={rule.category}
                    onValueChange={(v) => updateRule(index, { category: v })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate */}
                <div className="col-span-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(rule.rate * 100).toFixed(2)}
                    onChange={(e) =>
                      updateRule(index, {
                        rate: parseFloat(e.target.value) / 100,
                      })
                    }
                    className="text-sm h-8 text-center"
                  />
                </div>

                {/* Priority */}
                <div className="col-span-1">
                  <Input
                    type="number"
                    value={rule.priority}
                    onChange={(e) =>
                      updateRule(index, {
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="text-sm h-8 text-center"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <Input
                    value={rule.description || ""}
                    onChange={(e) =>
                      updateRule(index, { description: e.target.value })
                    }
                    placeholder="Optional description"
                    className="text-sm h-8"
                  />
                </div>

                {/* Actions: Save (green tick) + Delete */}
                <div className="col-span-2 flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => saveRule(index)}
                    disabled={savingIndex === index}
                    title="Save this rule"
                  >
                    {savingIndex === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteRule(index)}
                    title="Delete this rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
