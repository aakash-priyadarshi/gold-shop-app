"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Phone,
  Save,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InvoiceSettingsData {
  shopNameOnBill: string;
  shopLogoUrl: string;
  tagline: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  gstin: string;
  licenseNumber: string;
  footerNote: string;
  termsText: string;
  headerPosition: "TOP" | "BOTTOM";
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showGstin: boolean;
  showLicense: boolean;
  showFooter: boolean;
  showTerms: boolean;
}

const defaultSettings: InvoiceSettingsData = {
  shopNameOnBill: "",
  shopLogoUrl: "",
  tagline: "",
  shopAddress: "",
  shopPhone: "",
  shopEmail: "",
  gstin: "",
  licenseNumber: "",
  footerNote: "Thank you for your business!",
  termsText: "All items are subject to hallmarking verification.",
  headerPosition: "TOP",
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showEmail: false,
  showGstin: true,
  showLicense: false,
  showFooter: true,
  showTerms: true,
};

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<InvoiceSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await invoicesApi.getSettings();
      if (res.data) {
        setSettings({
          shopNameOnBill: res.data.shopNameOnBill || "",
          shopLogoUrl: res.data.shopLogoUrl || "",
          tagline: res.data.tagline || "",
          shopAddress: res.data.shopAddress || "",
          shopPhone: res.data.shopPhone || "",
          shopEmail: res.data.shopEmail || "",
          gstin: res.data.gstin || "",
          licenseNumber: res.data.licenseNumber || "",
          footerNote: res.data.footerNote || "",
          termsText: res.data.termsText || "",
          headerPosition: res.data.headerPosition || "TOP",
          showLogo: res.data.showLogo ?? true,
          showAddress: res.data.showAddress ?? true,
          showPhone: res.data.showPhone ?? true,
          showEmail: res.data.showEmail ?? false,
          showGstin: res.data.showGstin ?? true,
          showLicense: res.data.showLicense ?? false,
          showFooter: res.data.showFooter ?? true,
          showTerms: res.data.showTerms ?? true,
        });
      }
    } catch {
      // Will use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoicesApi.updateSettings(settings);
      toast({ title: "Settings saved", description: "Invoice settings updated successfully" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof InvoiceSettingsData, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/shop/invoices")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Settings2 className="h-6 w-6 text-amber-500" />
                  Invoice Settings
                </h1>
                <p className="text-muted-foreground">
                  Customise how your invoices look when printed or shared
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>

          {/* Shop Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Shop Branding
              </CardTitle>
              <CardDescription>
                Name, logo, and tagline printed on your invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Shop Name on Bill</Label>
                <Input
                  value={settings.shopNameOnBill}
                  onChange={(e) => updateField("shopNameOnBill", e.target.value)}
                  placeholder="Your jewellery shop name"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use your registered shop name
                </p>
              </div>
              <div>
                <Label>Shop Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.shopLogoUrl}
                    onChange={(e) => updateField("shopLogoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {settings.shopLogoUrl && (
                    <div className="w-10 h-10 rounded border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.shopLogoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste a URL to your shop logo (PNG or JPG, recommended 200x200px)
                </p>
              </div>
              <div>
                <Label>Tagline</Label>
                <Input
                  value={settings.tagline}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  placeholder='e.g. "Trusted since 1990" or "Pure Gold, Pure Trust"'
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Legal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Contact &amp; Legal Details
              </CardTitle>
              <CardDescription>
                Contact info and registration numbers shown on the bill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Shop Address</Label>
                <Textarea
                  value={settings.shopAddress}
                  onChange={(e) => updateField("shopAddress", e.target.value)}
                  placeholder="Full address to display on invoices"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={settings.shopPhone}
                    onChange={(e) => updateField("shopPhone", e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={settings.shopEmail}
                    onChange={(e) => updateField("shopEmail", e.target.value)}
                    placeholder="shop@example.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>GSTIN / VAT / PAN Number</Label>
                  <Input
                    value={settings.gstin}
                    onChange={(e) => updateField("gstin", e.target.value)}
                    placeholder="e.g. 27AABCU9603R1ZM"
                  />
                </div>
                <div>
                  <Label>BIS / Hallmark License</Label>
                  <Input
                    value={settings.licenseNumber}
                    onChange={(e) => updateField("licenseNumber", e.target.value)}
                    placeholder="e.g. R-XXXXX/XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer & Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Footer &amp; Terms
              </CardTitle>
              <CardDescription>
                Custom text at the bottom of your invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Footer Note</Label>
                <Textarea
                  value={settings.footerNote}
                  onChange={(e) => updateField("footerNote", e.target.value)}
                  placeholder="Thank you for your business!"
                  rows={2}
                />
              </div>
              <div>
                <Label>Terms &amp; Conditions</Label>
                <Textarea
                  value={settings.termsText}
                  onChange={(e) => updateField("termsText", e.target.value)}
                  placeholder="Default terms and conditions for all invoices"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Layout Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-amber-500" />
                Layout &amp; Visibility
              </CardTitle>
              <CardDescription>
                Control where details appear and which sections to show
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position toggle */}
              <div>
                <Label className="text-sm font-medium">Branding Position on Bill</Label>
                <div className="flex gap-3 mt-2">
                  <Button
                    type="button"
                    variant={settings.headerPosition === "TOP" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField("headerPosition", "TOP")}
                    className={settings.headerPosition === "TOP" ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    Top of Bill
                  </Button>
                  <Button
                    type="button"
                    variant={settings.headerPosition === "BOTTOM" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField("headerPosition", "BOTTOM")}
                    className={settings.headerPosition === "BOTTOM" ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    Bottom of Bill
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose where your shop name, logo, and details appear
                </p>
              </div>

              <Separator />

              {/* Visibility switches */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Show / Hide Sections</p>
                {[
                  { key: "showLogo" as const, label: "Shop Logo", icon: <ImageIcon className="h-4 w-4" /> },
                  { key: "showAddress" as const, label: "Shop Address", icon: <Building2 className="h-4 w-4" /> },
                  { key: "showPhone" as const, label: "Phone Number", icon: <Phone className="h-4 w-4" /> },
                  { key: "showEmail" as const, label: "Email Address", icon: null },
                  { key: "showGstin" as const, label: "GSTIN / VAT / PAN", icon: null },
                  { key: "showLicense" as const, label: "BIS / Hallmark License", icon: null },
                  { key: "showFooter" as const, label: "Footer Note", icon: null },
                  { key: "showTerms" as const, label: "Terms & Conditions", icon: null },
                ].map(({ key, label, icon }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      {icon && <span className="text-muted-foreground">{icon}</span>}
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch
                      checked={settings[key]}
                      onCheckedChange={(checked) => updateField(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="border-dashed border-2">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 border shadow-sm space-y-4 text-sm">
                {/* Top branding */}
                {settings.headerPosition === "TOP" && (
                  <div className="text-center space-y-1 pb-3 border-b">
                    {settings.showLogo && settings.shopLogoUrl && (
                      <div className="flex justify-center mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={settings.shopLogoUrl}
                          alt="Logo"
                          className="h-12 w-12 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    {settings.shopNameOnBill && (
                      <p className="font-bold text-lg">{settings.shopNameOnBill}</p>
                    )}
                    {settings.tagline && (
                      <p className="text-xs text-muted-foreground italic">
                        {settings.tagline}
                      </p>
                    )}
                    {settings.showAddress && settings.shopAddress && (
                      <p className="text-xs text-muted-foreground">
                        {settings.shopAddress}
                      </p>
                    )}
                    <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                      {settings.showPhone && settings.shopPhone && (
                        <span>{settings.shopPhone}</span>
                      )}
                      {settings.showEmail && settings.shopEmail && (
                        <span>{settings.shopEmail}</span>
                      )}
                    </div>
                    {settings.showGstin && settings.gstin && (
                      <p className="text-xs text-muted-foreground">
                        GSTIN: {settings.gstin}
                      </p>
                    )}
                    {settings.showLicense && settings.licenseNumber && (
                      <p className="text-xs text-muted-foreground">
                        License: {settings.licenseNumber}
                      </p>
                    )}
                  </div>
                )}

                {/* Invoice body placeholder */}
                <div className="py-6 text-center text-muted-foreground border-y border-dashed">
                  <p className="text-xs">— Invoice line items will appear here —</p>
                </div>

                {/* Bottom branding */}
                {settings.headerPosition === "BOTTOM" && (
                  <div className="text-center space-y-1 pt-3 border-t">
                    {settings.showLogo && settings.shopLogoUrl && (
                      <div className="flex justify-center mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={settings.shopLogoUrl}
                          alt="Logo"
                          className="h-12 w-12 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    {settings.shopNameOnBill && (
                      <p className="font-bold text-lg">{settings.shopNameOnBill}</p>
                    )}
                    {settings.tagline && (
                      <p className="text-xs text-muted-foreground italic">
                        {settings.tagline}
                      </p>
                    )}
                    {settings.showAddress && settings.shopAddress && (
                      <p className="text-xs text-muted-foreground">
                        {settings.shopAddress}
                      </p>
                    )}
                    <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                      {settings.showPhone && settings.shopPhone && (
                        <span>{settings.shopPhone}</span>
                      )}
                      {settings.showEmail && settings.shopEmail && (
                        <span>{settings.shopEmail}</span>
                      )}
                    </div>
                    {settings.showGstin && settings.gstin && (
                      <p className="text-xs text-muted-foreground">
                        GSTIN: {settings.gstin}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer */}
                {settings.showFooter && settings.footerNote && (
                  <p className="text-center text-xs text-muted-foreground pt-2 border-t">
                    {settings.footerNote}
                  </p>
                )}
                {settings.showTerms && settings.termsText && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    Terms: {settings.termsText}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom save button */}
          <div className="flex justify-end pb-8">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
