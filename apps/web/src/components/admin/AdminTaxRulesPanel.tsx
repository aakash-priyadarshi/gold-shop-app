/**
 * Admin Tax Rules Panel
 *
 * UI for managing country tax configurations
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CountryTaxConfig, TaxRule, VatMode } from "@/lib/tax/types";
import { AlertCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminTaxRulesPanel() {
  const [selectedCountry, setSelectedCountry] = useState<string>("NP");
  const [config, setConfig] = useState<CountryTaxConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [selectedCountry]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/tax-config?country=${selectedCountry}`,
      );
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load tax config:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/tax-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save tax config:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateRule = (ruleId: string, updates: Partial<TaxRule>) => {
    if (!config) return;

    setConfig({
      ...config,
      rules: config.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule,
      ),
    });
  };

  const addRule = () => {
    if (!config) return;

    const newRule: TaxRule = {
      id: `RULE_${Date.now()}`,
      name: "NEW_TAX",
      displayName: "New Tax",
      rate: 0.05,
      priority: config.rules.length + 1,
      applyWhen: { isJewellery: true },
      base: "item_subtotal_excluding_tax",
    };

    setConfig({
      ...config,
      rules: [...config.rules, newRule],
    });
  };

  const deleteRule = (ruleId: string) => {
    if (!config) return;

    setConfig({
      ...config,
      rules: config.rules.filter((rule) => rule.id !== ruleId),
    });
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="ml-2">Loading tax configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tax Rules Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage country-specific tax rates and rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadConfig} variant="outline" disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={saveConfig} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          {saved && (
            <Badge variant="default" className="bg-green-500">
              Saved!
            </Badge>
          )}
        </div>
      </div>

      {/* Country Selector */}
      <div className="space-y-2">
        <Label>Country</Label>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NP">
              <span className="flex items-center gap-2">
                <FlagImage code="NP" size={16} /> Nepal (NP)
              </span>
            </SelectItem>
            <SelectItem value="IN">
              <span className="flex items-center gap-2">
                <FlagImage code="IN" size={16} /> India (IN)
              </span>
            </SelectItem>
            <SelectItem value="AE">
              <span className="flex items-center gap-2">
                <FlagImage code="AE" size={16} /> UAE (AE)
              </span>
            </SelectItem>
            <SelectItem value="US">
              <span className="flex items-center gap-2">
                <FlagImage code="US" size={16} /> USA (US)
              </span>
            </SelectItem>
            <SelectItem value="UK">
              <span className="flex items-center gap-2">
                <FlagImage code="UK" size={16} /> UK
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config && (
        <>
          {/* Config Metadata */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs">Effective From</Label>
                <Input
                  type="date"
                  value={config.effectiveFrom.split("T")[0]}
                  onChange={(e) =>
                    setConfig({ ...config, effectiveFrom: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={config.effectiveTo?.split("T")[0] || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      effectiveTo: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
            {config.metadata?.description && (
              <p className="text-xs text-muted-foreground">
                {config.metadata.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Tax Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tax Rules</h3>
              <Button onClick={addRule} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {config.rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tax rules configured. Click "Add Rule" to create one.
              </div>
            )}

            {config.rules.map((rule, index) => (
              <div key={rule.id} className="border rounded-lg p-4 space-y-4">
                {/* Rule Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline">Rule {index + 1}</Badge>
                    <span className="ml-2 font-medium">{rule.displayName}</span>
                  </div>
                  <Button
                    onClick={() => deleteRule(rule.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Rule ID */}
                  <div>
                    <Label className="text-xs">Rule ID</Label>
                    <Input
                      value={rule.id}
                      onChange={(e) =>
                        updateRule(rule.id, { id: e.target.value })
                      }
                      placeholder="e.g., NP_LUXURY_TAX"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      value={rule.displayName}
                      onChange={(e) =>
                        updateRule(rule.id, { displayName: e.target.value })
                      }
                      placeholder="e.g., Luxury Tax"
                    />
                  </div>

                  {/* Rate */}
                  <div>
                    <Label className="text-xs">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(rule.rate * 100).toFixed(2)}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          rate: parseFloat(e.target.value) / 100,
                        })
                      }
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <Label className="text-xs">Priority (lower = first)</Label>
                    <Input
                      type="number"
                      value={rule.priority || 999}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          priority: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Apply When:</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.applyWhen.isJewellery === true}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, {
                            applyWhen: {
                              ...rule.applyWhen,
                              isJewellery: checked ? true : undefined,
                            },
                          })
                        }
                      />
                      <Label className="text-xs">Is Jewellery</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.applyWhen.isGold === true}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, {
                            applyWhen: {
                              ...rule.applyWhen,
                              isGold: checked ? true : undefined,
                            },
                          })
                        }
                      />
                      <Label className="text-xs">Is Gold</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.applyWhen.hasGemstones === true}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, {
                            applyWhen: {
                              ...rule.applyWhen,
                              hasGemstones: checked ? true : undefined,
                            },
                          })
                        }
                      />
                      <Label className="text-xs">Has Gemstones</Label>
                    </div>
                  </div>
                </div>

                {/* VAT Mode (for Nepal VAT rule) */}
                {rule.name === "VAT" && selectedCountry === "NP" && (
                  <div className="space-y-2 bg-amber-50 border border-amber-200 rounded p-3">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      VAT Calculation Mode (Nepal)
                    </Label>
                    <Select
                      value={rule.vatMode || "WHOLE_ITEM_IF_STUDDED"}
                      onValueChange={(value: VatMode) =>
                        updateRule(rule.id, { vatMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHOLE_ITEM_IF_STUDDED">
                          Whole Item (Conservative - VAT on full item if stones
                          present)
                        </SelectItem>
                        <SelectItem value="STONES_ONLY">
                          Stones Only (VAT only on gemstone portion)
                        </SelectItem>
                        <SelectItem value="DISABLED">
                          Disabled (No VAT)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-700">
                      {rule.vatMode === "WHOLE_ITEM_IF_STUDDED"
                        ? "VAT applies to entire item subtotal when gemstones are present"
                        : rule.vatMode === "STONES_ONLY"
                          ? "VAT applies only to the gemstone subtotal"
                          : "VAT is disabled"}
                    </p>
                  </div>
                )}

                {/* Include in Base */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Include in Tax Base:
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.includeInBase?.makingCharge !== false}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, {
                            includeInBase: {
                              ...rule.includeInBase,
                              makingCharge: checked,
                            },
                          })
                        }
                      />
                      <Label className="text-xs">Making Charge</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.includeInBase?.plating !== false}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, {
                            includeInBase: {
                              ...rule.includeInBase,
                              plating: checked,
                            },
                          })
                        }
                      />
                      <Label className="text-xs">Plating</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.includeInBase?.finish !== false}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, {
                            includeInBase: {
                              ...rule.includeInBase,
                              finish: checked,
                            },
                          })
                        }
                      />
                      <Label className="text-xs">Finish</Label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveConfig} disabled={loading} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
