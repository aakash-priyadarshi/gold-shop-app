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
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api";
import type { BillSettings } from "@/lib/billPrint";
import { unwrapInvoiceSettingsResponse } from "@/lib/invoiceBranding";
import {
  BILL_TEMPLATES,
  billOrnamentSvg,
  billTemplateFrameStyle,
  getBillTemplate,
  type BillTemplateMeta,
  type BillTemplateTheme,
} from "@gold-shop/shared";
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Building2,
    Check,
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
import Image from "next/image";
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
  billTemplateId: string;
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
  billTemplateId: "classic",
};

function mapRowToSettings(row: BillSettings): InvoiceSettingsData {
  return {
    shopNameOnBill: row.shopNameOnBill || "",
    shopLogoUrl: row.shopLogoUrl || "",
    tagline: row.tagline || "",
    shopAddress: row.shopAddress || "",
    shopPhone: row.shopPhone || "",
    shopEmail: row.shopEmail || "",
    gstin: row.gstin || "",
    licenseNumber: row.licenseNumber || "",
    footerNote: row.footerNote || "",
    termsText: row.termsText || "",
    shopNamePosition: (row.shopNamePosition as Position) || "TOP",
    logoPosition: (row.logoPosition as Position) || "TOP",
    taglinePosition: (row.taglinePosition as Position) || "TOP",
    addressPosition: (row.addressPosition as Position) || "TOP",
    phonePosition: (row.phonePosition as Position) || "TOP",
    emailPosition: (row.emailPosition as Position) || "TOP",
    gstinPosition: (row.gstinPosition as Position) || "TOP",
    licensePosition: (row.licensePosition as Position) || "TOP",
    footerPosition: (row.footerPosition as Position) || "BOTTOM",
    termsPosition: (row.termsPosition as Position) || "BOTTOM",
    showLogo: row.showLogo ?? true,
    showAddress: row.showAddress ?? true,
    showPhone: row.showPhone ?? true,
    showEmail: row.showEmail ?? false,
    showGstin: row.showGstin ?? true,
    showLicense: row.showLicense ?? false,
    showFooter: row.showFooter ?? true,
    showTerms: row.showTerms ?? true,
    billTemplateId: row.billTemplateId || "classic",
  };
}

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

function BillOrnamentMark({
  theme,
  position,
  size = 24,
}: {
  theme: BillTemplateTheme;
  position: "top" | "bottom";
  size?: number;
}) {
  return (
    <span
      className={`absolute left-1/2 z-10 -translate-x-1/2 px-1.5 leading-none ${
        position === "top" ? "-top-3" : "-bottom-3"
      }`}
      style={{ backgroundColor: theme.paper }}
      dangerouslySetInnerHTML={{
        __html: billOrnamentSvg(theme.ornamentIcon, theme.ornamentColor, size),
      }}
    />
  );
}

function TemplateThumb({ template }: { template: BillTemplateMeta }) {
  const theme = template.theme;
  const royal = theme.style === "royal";
  return (
    <div
      className="relative h-28 w-full overflow-visible pointer-events-none rounded-sm"
      style={{ ...billTemplateFrameStyle(theme), padding: "10px 8px 12px" }}
    >
      {theme.frame === "corners" && (
        <>
          <span
            className="absolute left-5 right-5 top-0 h-[1.5px]"
            style={{ background: theme.ornamentColor }}
          />
          <span
            className="absolute left-5 right-5 bottom-0 h-[1.5px]"
            style={{ background: theme.ornamentColor }}
          />
        </>
      )}
      <BillOrnamentMark theme={theme} position="top" size={16} />
      <div
        style={{
          background: royal ? theme.headerBg : "transparent",
          height: royal ? 18 : 0,
          margin: royal ? "4px -6px 0" : 0,
        }}
      />
      <div className="px-1.5 pt-2 space-y-1.5">
        <div
          className="h-1.5 rounded-full"
          style={{ width: "62%", background: theme.accent }}
        />
        <div
          className="h-1 rounded-full"
          style={{ width: "40%", background: theme.muted, opacity: 0.45 }}
        />
        <div className="pt-1 space-y-1">
          <div className="flex justify-between gap-2">
            <div
              className="h-1 flex-1 rounded-full"
              style={{ background: theme.border, opacity: 0.45 }}
            />
            <div
              className="h-1 w-6 rounded-full"
              style={{ background: theme.accent, opacity: 0.5 }}
            />
          </div>
          <div className="flex justify-between gap-2">
            <div
              className="h-1 flex-1 rounded-full"
              style={{ background: theme.border, opacity: 0.45 }}
            />
            <div
              className="h-1 w-8 rounded-full"
              style={{ background: theme.accent, opacity: 0.5 }}
            />
          </div>
          <div
            className="h-px mt-1"
            style={{ background: theme.totalBorder }}
          />
          <div className="flex justify-between gap-2">
            <div
              className="h-1.5 w-10 rounded-full"
              style={{ background: theme.ink, opacity: 0.35 }}
            />
            <div
              className="h-1.5 w-8 rounded-full"
              style={{ background: theme.ornamentColor }}
            />
          </div>
        </div>
      </div>
      <BillOrnamentMark theme={theme} position="bottom" size={16} />
    </div>
  );
}

const BILL_LOGO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);
const BILL_LOGO_EXT = /\.(jpe?g|png)$/i;

function isAllowedBillLogo(file: File): boolean {
  if (BILL_LOGO_TYPES.has(file.type)) return true;
  if (!file.type && BILL_LOGO_EXT.test(file.name)) return true;
  return false;
}

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] =
    useState<InvoiceSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const applySettingsRow = (row: BillSettings | null) => {
    if (!row) return;
    const next = mapRowToSettings(row);
    settingsRef.current = next;
    setSettings(next);
  };

  const persistSettings = async (patch: Partial<InvoiceSettingsData> = {}) => {
    const payload = { ...settingsRef.current, ...patch };
    const res = await invoicesApi.updateSettings(payload);
    applySettingsRow(unwrapInvoiceSettingsResponse(res.data));
    return payload;
  };

  const {
    uploading: isUploadingLogo,
    progress: uploadProgress,
    upload: uploadLogo,
  } = useImageUpload({
    type: "profile",
    outputMime: "image/png",
    onSuccess: async (result) => {
      if (!result.url) return;
      try {
        await persistSettings({ shopLogoUrl: result.url });
        toast({ title: "Logo saved" });
      } catch {
        toast({
          variant: "destructive",
          title: "Logo uploaded but not saved",
          description: "Click Save Settings to keep your logo.",
        });
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
    let cancelled = false;
    (async () => {
      try {
        const res = await invoicesApi.getSettings();
        if (!cancelled) {
          applySettingsRow(unwrapInvoiceSettingsResponse(res.data));
        }
      } catch {
        // Will use defaults
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await persistSettings();
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
    if (!isAllowedBillLogo(file)) {
      toast({
        variant: "destructive",
        title: "JPG or PNG only",
        description:
          "Other formats (WebP, GIF, SVG) are blocked so the logo prints on the PDF bill.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
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
        <Image
          src={settings.shopLogoUrl}
          alt="Logo"
          className="h-12 w-12 object-contain"
          width={48}
          height={48}
          unoptimized
        />
      </div>,
    );
  }
  const previewShopName =
    settings.shopNameOnBill || user?.shop?.shopName || "";
  if (previewShopName) {
    addPreviewItem(
      "shopNamePosition",
      null,
      "name",
      <p className="font-bold text-lg text-center">
        {previewShopName}
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

  const previewTemplate = getBillTemplate(settings.billTemplateId);
  const previewTheme = previewTemplate.theme;
  const previewCompact = previewTheme.density === "compact";
  const previewRoyal = previewTemplate.id === "royal";

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
        <div className="space-y-6 max-w-6xl mx-auto">
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
                      <Image
                        src={settings.shopLogoUrl}
                        alt="Logo"
                        className="object-contain"
                        fill
                        sizes="64px"
                        unoptimized
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
                      accept="image/png,image/jpeg,.jpg,.jpeg,.png"
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
                      <T>
                        JPG or PNG only — other formats are blocked so the logo
                        prints on the PDF bill. Max 5MB. Recommended 200×200px.
                      </T>
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

          {/* Layout + live preview side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Card data-tour="invoice-settings-layout">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-amber-500" />
                  <T>Layout & Visibility</T>
                </CardTitle>
                <CardDescription>
                  <T>Choose where each field appears (top or bottom of the bill) and toggle visibility. The preview on the right updates as you change these.</T>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <span className="text-sm font-medium">
                      <T>{label}</T>
                    </span>
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

            <Card className="border-dashed border-2 lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  <T>Live preview</T>
                </CardTitle>
                <CardDescription>
                  <T>Changes appear here as you edit. Save Settings to print with this look.</T>
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-visible pt-4">
                <div
                  className="rounded-sm text-sm"
                  style={{
                    ...billTemplateFrameStyle(previewTheme),
                    color: previewTheme.ink,
                  }}
                >
                  {previewTheme.frame === "corners" && (
                    <>
                      <span
                        className="absolute left-7 right-7 top-0 h-[1.5px]"
                        style={{ background: previewTheme.ornamentColor }}
                      />
                      <span
                        className="absolute left-7 right-7 bottom-0 h-[1.5px]"
                        style={{ background: previewTheme.ornamentColor }}
                      />
                    </>
                  )}
                  <BillOrnamentMark theme={previewTheme} position="top" />
                  <p
                    className="text-center font-semibold tracking-widest mb-3"
                    style={{
                      color: previewRoyal
                        ? previewTheme.accent
                        : previewTheme.ink,
                      fontSize: previewCompact ? 10 : 11,
                      letterSpacing:
                        previewTemplate.id === "minimal" ? "0.18em" : "0.12em",
                    }}
                  >
                    INVOICE
                  </p>
                  {topItems.length > 0 && (
                    <div
                      className={
                        previewRoyal
                          ? "space-y-1 -mx-1 px-3 py-3 rounded-sm [&_.text-muted-foreground]:text-slate-300"
                          : "space-y-1 pb-3 border-b"
                      }
                      style={
                        previewRoyal
                          ? {
                              background: previewTheme.headerBg,
                              color: previewTheme.headerInk,
                            }
                          : { borderColor: previewTheme.border }
                      }
                    >
                      {topItems.map((item) => (
                        <div key={item.key}>{item.content}</div>
                      ))}
                    </div>
                  )}

                  <div
                    className="border-dashed"
                    style={{
                      padding: previewCompact ? "10px 0" : "20px 0",
                      borderTop: `1px dashed ${previewTheme.border}`,
                      borderBottom: `1px dashed ${previewTheme.border}`,
                    }}
                  >
                    <div
                      className="flex justify-between text-xs mb-1.5"
                      style={{ color: previewTheme.muted }}
                    >
                      <span>
                        <T>Gold chain 22K</T>
                      </span>
                      <span
                        style={{ color: previewTheme.ink, fontWeight: 600 }}
                      >
                        45,000
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-xs mb-1.5"
                      style={{ color: previewTheme.muted }}
                    >
                      <span>
                        <T>Making charge</T>
                      </span>
                      <span
                        style={{ color: previewTheme.ink, fontWeight: 600 }}
                      >
                        4,500
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-xs pt-2 font-semibold"
                      style={{
                        color: previewTheme.ink,
                        borderTop: `2px solid ${previewTheme.totalBorder}`,
                      }}
                    >
                      <span>
                        <T>Total</T>
                      </span>
                      <span>49,500</span>
                    </div>
                  </div>

                  {bottomItems.length > 0 && (
                    <div
                      className="space-y-1 pt-3"
                      style={{
                        borderTop: `1px solid ${previewTheme.border}`,
                      }}
                    >
                      {bottomItems.map((item) => (
                        <div key={item.key}>{item.content}</div>
                      ))}
                    </div>
                  )}
                  <BillOrnamentMark theme={previewTheme} position="bottom" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-tour="invoice-settings-templates">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <T>Bill templates</T>
              </CardTitle>
              <CardDescription>
                <T>Pick a layout for printed bills and shared PDFs. The live preview above updates immediately — click Save Settings to keep it.</T>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/40 p-3">
                <div className="flex gap-3 overflow-x-auto py-3 snap-x snap-mandatory">
                  {BILL_TEMPLATES.map((tpl) => {
                    const selected = settings.billTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => updateField("billTemplateId", tpl.id)}
                        className={`snap-start flex-1 min-w-[9.5rem] text-left rounded-lg p-2 transition-all ${
                          selected
                            ? "ring-2 ring-amber-500 bg-background shadow-sm"
                            : "bg-background/70 hover:bg-background border border-transparent hover:border-border"
                        }`}
                      >
                        <div className="relative">
                          <TemplateThumb template={tpl} />
                          {selected && (
                            <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium leading-tight">
                          <T>{tpl.label}</T>
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          <T>{tpl.description}</T>
                        </p>
                      </button>
                    );
                  })}
                </div>
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
