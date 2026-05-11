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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { invoicesApi } from "@/lib/api";
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Building2,
    FileText,
    ImageIcon,
    LayoutTemplate,
    Loader2,
    Phone,
    Save,
    Settings2,
    Upload,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Position = "TOP" | "BOTTOM";

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
  // Per-field positions
  shopNamePosition: Position;
  logoPosition: Position;
  taglinePosition: Position;
  addressPosition: Position;
  phonePosition: Position;
  emailPosition: Position;
  gstinPosition: Position;
  licensePosition: Position;
  footerPosition: Position;
  termsPosition: Position;
  // Visibility
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
  shopNamePosition: "TOP",
  logoPosition: "TOP",
  taglinePosition: "TOP",
  addressPosition: "TOP",
  phonePosition: "TOP",
  emailPosition: "TOP",
  gstinPosition: "TOP",
  licensePosition: "TOP",
  footerPosition: "BOTTOM",
  termsPosition: "BOTTOM",
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showEmail: false,
  showGstin: true,
  showLicense: false,
  showFooter: true,
  showTerms: true,
};

function PositionToggle({
  value,
  onChange,
}: {
  value: Position;
  onChange: (v: Position) => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onChange("TOP")}
        className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${value === "TOP" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
      >
        <ArrowUp className="h-3 w-3 inline mr-0.5" />
        Top
      </button>
      <button
        type="button"
        onClick={() => onChange("BOTTOM")}
        className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${value === "BOTTOM" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
      >
        <ArrowDown className="h-3 w-3 inline mr-0.5" />
        Bottom
      </button>
    </div>
  );
}

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] =
    useState<InvoiceSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploading: isUploadingLogo,
    progress: uploadProgress,
    upload: uploadLogo,
  } = useImageUpload({
    type: "profile",
    onSuccess: (result) => {
      if (result.url) {
        updateField("shopLogoUrl", result.url);
        toast({ title: "Logo uploaded successfully" });
      }
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err,
      }),
  });

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
          shopNamePosition: res.data.shopNamePosition || "TOP",
          logoPosition: res.data.logoPosition || "TOP",
          taglinePosition: res.data.taglinePosition || "TOP",
          addressPosition: res.data.addressPosition || "TOP",
          phonePosition: res.data.phonePosition || "TOP",
          emailPosition: res.data.emailPosition || "TOP",
          gstinPosition: res.data.gstinPosition || "TOP",
          licensePosition: res.data.licensePosition || "TOP",
          footerPosition: res.data.footerPosition || "BOTTOM",
          termsPosition: res.data.termsPosition || "BOTTOM",
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
      toast({
        title: "Settings saved",
        description: "Invoice settings updated successfully",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof InvoiceSettingsData, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Max 5MB",
      });
      return;
    }
    await uploadLogo(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Collect which items go TOP vs BOTTOM for preview
  const topItems: { key: string; content: React.ReactNode }[] = [];
  const bottomItems: { key: string; content: React.ReactNode }[] = [];

  const addPreviewItem = (
    posKey: keyof InvoiceSettingsData,
    showKey: keyof InvoiceSettingsData | null,
    key: string,
    content: React.ReactNode,
  ) => {
    if (showKey && !settings[showKey]) return;
    const pos = settings[posKey] as Position;
    const item = { key, content };
    if (pos === "TOP") topItems.push(item);
    else bottomItems.push(item);
  };

  // Build preview items
  if (settings.shopLogoUrl) {
    addPreviewItem(
      "logoPosition",
      "showLogo",
      "logo",
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.shopLogoUrl}
          alt="Logo"
          className="h-12 w-12 object-contain"
        />
      </div>,
    );
  }
  if (settings.shopNameOnBill) {
    addPreviewItem(
      "shopNamePosition",
      null,
      "name",
      <p className="font-bold text-lg text-center">
        {settings.shopNameOnBill}
      </p>,
    );
  }
  if (settings.tagline) {
    addPreviewItem(
      "taglinePosition",
      null,
      "tagline",
      <p className="text-xs text-muted-foreground italic text-center">
        {settings.tagline}
      </p>,
    );
  }
  if (settings.shopAddress) {
    addPreviewItem(
      "addressPosition",
      "showAddress",
      "address",
      <p className="text-xs text-muted-foreground text-center">
        {settings.shopAddress}
      </p>,
    );
  }
  if (settings.shopPhone) {
    addPreviewItem(
      "phonePosition",
      "showPhone",
      "phone",
      <p className="text-xs text-muted-foreground text-center">
        Tel: {settings.shopPhone}
      </p>,
    );
  }
  if (settings.shopEmail) {
    addPreviewItem(
      "emailPosition",
      "showEmail",
      "email",
      <p className="text-xs text-muted-foreground text-center">
        {settings.shopEmail}
      </p>,
    );
  }
  if (settings.gstin) {
    addPreviewItem(
      "gstinPosition",
      "showGstin",
      "gstin",
      <p className="text-xs text-muted-foreground text-center">
        GSTIN: {settings.gstin}
      </p>,
    );
  }
  if (settings.licenseNumber) {
    addPreviewItem(
      "licensePosition",
      "showLicense",
      "license",
      <p className="text-xs text-muted-foreground text-center">
        License: {settings.licenseNumber}
      </p>,
    );
  }
  if (settings.footerNote) {
    addPreviewItem(
      "footerPosition",
      "showFooter",
      "footer",
      <p className="text-xs text-muted-foreground text-center">
        {settings.footerNote}
      </p>,
    );
  }
  if (settings.termsText) {
    addPreviewItem(
      "termsPosition",
      "showTerms",
      "terms",
      <p className="text-[10px] text-muted-foreground text-center">
        Terms: {settings.termsText}
      </p>,
    );
  }

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
          <Card data-tour="invoice-settings-branding">
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
                  onChange={(e) =>
                    updateField("shopNameOnBill", e.target.value)
                  }
                  placeholder="Your jewellery shop name"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use your registered shop name
                </p>
              </div>
              <div>
                <Label>Shop Logo</Label>
                <div className="flex items-center gap-3 mt-1">
                  {settings.shopLogoUrl ? (
                    <div className="relative w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0 bg-white dark:bg-[#161B22]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.shopLogoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => updateField("shopLogoUrl", "")}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground flex-shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or WebP. Max 5MB. Recommended 200×200px.
                    </p>
                  </div>
                </div>
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
                    onChange={(e) =>
                      updateField("licenseNumber", e.target.value)
                    }
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

          {/* Layout Options — per-field position + visibility */}
          <Card data-tour="invoice-settings-layout">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-amber-500" />
                Layout &amp; Visibility
              </CardTitle>
              <CardDescription>
                Choose where each field appears (top or bottom of the bill) and
                toggle visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-field controls */}
              {(
                [
                  {
                    label: "Shop Name",
                    posKey: "shopNamePosition" as const,
                    showKey: null,
                  },
                  {
                    label: "Shop Logo",
                    posKey: "logoPosition" as const,
                    showKey: "showLogo" as const,
                  },
                  {
                    label: "Tagline",
                    posKey: "taglinePosition" as const,
                    showKey: null,
                  },
                  {
                    label: "Address",
                    posKey: "addressPosition" as const,
                    showKey: "showAddress" as const,
                  },
                  {
                    label: "Phone",
                    posKey: "phonePosition" as const,
                    showKey: "showPhone" as const,
                  },
                  {
                    label: "Email",
                    posKey: "emailPosition" as const,
                    showKey: "showEmail" as const,
                  },
                  {
                    label: "GSTIN / VAT / PAN",
                    posKey: "gstinPosition" as const,
                    showKey: "showGstin" as const,
                  },
                  {
                    label: "Hallmark License",
                    posKey: "licensePosition" as const,
                    showKey: "showLicense" as const,
                  },
                  {
                    label: "Footer Note",
                    posKey: "footerPosition" as const,
                    showKey: "showFooter" as const,
                  },
                  {
                    label: "Terms & Conditions",
                    posKey: "termsPosition" as const,
                    showKey: "showTerms" as const,
                  },
                ] as const
              ).map(({ label, posKey, showKey }) => (
                <div
                  key={posKey}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <PositionToggle
                      value={settings[posKey] as Position}
                      onChange={(v) => updateField(posKey, v)}
                    />
                    {showKey && (
                      <Switch
                        checked={settings[showKey] as boolean}
                        onCheckedChange={(checked) =>
                          updateField(showKey, checked)
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
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
              <div className="bg-white dark:bg-[#161B22] rounded-lg p-6 border shadow-sm space-y-4 text-sm">
                {/* Top section */}
                {topItems.length > 0 && (
                  <div className="space-y-1 pb-3 border-b">
                    {topItems.map((item) => (
                      <div key={item.key}>{item.content}</div>
                    ))}
                  </div>
                )}

                {/* Invoice body placeholder */}
                <div className="py-6 text-center text-muted-foreground border-y border-dashed">
                  <p className="text-xs">
                    — Invoice line items will appear here —
                  </p>
                </div>

                {/* Bottom section */}
                {bottomItems.length > 0 && (
                  <div className="space-y-1 pt-3 border-t">
                    {bottomItems.map((item) => (
                      <div key={item.key}>{item.content}</div>
                    ))}
                  </div>
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
