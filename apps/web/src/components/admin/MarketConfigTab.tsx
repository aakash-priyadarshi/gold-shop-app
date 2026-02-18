"use client";

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { marketConfigApi } from "@/lib/api";
import {
  CheckCircle2,
  Edit,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Save,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";

interface MarketConfig {
  id: string;
  countryCode: string;
  countryName: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultWeightUnit: string;
  supportedWeightUnits: string[];
  supportedPaymentMethods: string[];
  heroHeadline: string;
  heroSubheadline: string;
  footerContactTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactWhatsapp: string;
  taxPercentage: number;
  taxName: string;
  priceMultiplier: number;
  codEnabled: boolean;
  customOrdersEnabled: boolean;
  isActive: boolean;
}

export function MarketConfigTab() {
  const [configs, setConfigs] = useState<MarketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MarketConfig | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await marketConfigApi.list();
      setConfigs(res.data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load",
        description: "Could not load market configurations.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await marketConfigApi.seed();
      toast({
        title: "Seeded",
        description: "Default market configurations have been created.",
      });
      fetchConfigs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Seed Failed",
        description: "Could not seed configurations.",
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleEdit = (config: MarketConfig) => {
    setEditingConfig({ ...config });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingConfig) return;
    setSaving(true);
    try {
      await marketConfigApi.update(editingConfig.countryCode, {
        countryName: editingConfig.countryName,
        defaultCurrency: editingConfig.defaultCurrency,
        heroHeadline: editingConfig.heroHeadline,
        heroSubheadline: editingConfig.heroSubheadline,
        footerContactTitle: editingConfig.footerContactTitle,
        contactEmail: editingConfig.contactEmail,
        contactPhone: editingConfig.contactPhone,
        contactAddress: editingConfig.contactAddress,
        contactWhatsapp: editingConfig.contactWhatsapp,
        taxPercentage: editingConfig.taxPercentage,
        taxName: editingConfig.taxName,
        priceMultiplier: editingConfig.priceMultiplier,
        codEnabled: editingConfig.codEnabled,
        customOrdersEnabled: editingConfig.customOrdersEnabled,
        isActive: editingConfig.isActive,
      });
      toast({
        title: "Saved",
        description: `Market config for ${editingConfig.countryName} updated.`,
      });
      setEditDialogOpen(false);
      fetchConfigs();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save configuration.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Market Configurations
              </CardTitle>
              <CardDescription>
                Manage country-specific settings, contact info, and pricing
                for each market region.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Seed Defaults
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No market configurations found.</p>
              <p className="text-sm mt-1">
                Click &quot;Seed Defaults&quot; to create configurations for
                supported regions.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {configs.map((config) => (
                <div
                  key={config.countryCode}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-muted-foreground w-10 text-center">
                      {config.countryCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {config.countryName}
                        </span>
                        {config.isActive ? (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {config.contactEmail || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {config.contactPhone || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {config.contactAddress
                            ? config.contactAddress.substring(0, 30) + "..."
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>Currency: {config.defaultCurrency}</span>
                        <span>Tax: {config.taxPercentage}% ({config.taxName})</span>
                        <span>
                          Multiplier: {config.priceMultiplier}x
                        </span>
                        {config.codEnabled && (
                          <Badge variant="outline" className="text-xs">
                            COD
                          </Badge>
                        )}
                        {config.customOrdersEnabled && (
                          <Badge variant="outline" className="text-xs">
                            Custom Orders
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(config)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Market Config — {editingConfig?.countryName} (
              {editingConfig?.countryCode})
            </DialogTitle>
            <DialogDescription>
              Update contact information, pricing, and features for this market.
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="grid gap-6 py-4">
              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      value={editingConfig.contactEmail}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          contactEmail: e.target.value,
                        })
                      }
                      placeholder="support@orivraa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      value={editingConfig.contactPhone}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          contactPhone: e.target.value,
                        })
                      }
                      placeholder="+977 1-1234567"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Contact Address</Label>
                    <Textarea
                      value={editingConfig.contactAddress}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          contactAddress: e.target.value,
                        })
                      }
                      placeholder="Office address..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input
                      value={editingConfig.contactWhatsapp}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          contactWhatsapp: e.target.value,
                        })
                      }
                      placeholder="+977 9800000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Footer Contact Title</Label>
                    <Input
                      value={editingConfig.footerContactTitle}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          footerContactTitle: e.target.value,
                        })
                      }
                      placeholder="Contact Us"
                    />
                  </div>
                </div>
              </div>

              {/* Hero Content */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Homepage Hero Content
                </h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Hero Headline</Label>
                    <Input
                      value={editingConfig.heroHeadline}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          heroHeadline: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hero Subheadline</Label>
                    <Textarea
                      value={editingConfig.heroSubheadline}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          heroSubheadline: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Pricing & Currency
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Input
                      value={editingConfig.defaultCurrency}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          defaultCurrency: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax % ({editingConfig.taxName})</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingConfig.taxPercentage}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          taxPercentage: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Multiplier</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingConfig.priceMultiplier}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          priceMultiplier: parseFloat(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Features</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingConfig.isActive}
                      onCheckedChange={(v) =>
                        setEditingConfig({ ...editingConfig, isActive: v })
                      }
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingConfig.codEnabled}
                      onCheckedChange={(v) =>
                        setEditingConfig({ ...editingConfig, codEnabled: v })
                      }
                    />
                    <Label>COD</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingConfig.customOrdersEnabled}
                      onCheckedChange={(v) =>
                        setEditingConfig({
                          ...editingConfig,
                          customOrdersEnabled: v,
                        })
                      }
                    />
                    <Label>Custom Orders</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
