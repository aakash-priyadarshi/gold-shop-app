"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useTourContext } from "@/components/tutorial/useTourContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { taxReportsApi } from "@/lib/api";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Loader2,
    Lock,
    Share2,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

const COUNTRY_TABS = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "EU", name: "EU OSS", flag: "🇪🇺" },
  { code: "US", name: "US", flag: "🇺🇸" },
];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function downloadBlob(data: any, filename: string, type = "text/csv") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TaxReportsPage() {
  const { user } = useAuth();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const homeCountry = user?.shop?.country || "NP";
  const defaultTab = COUNTRY_TABS.find((c) => c.code === homeCountry)?.code || "NP";

  const [period, setPeriod] = useState<string>(currentMonth());
  const [activeCountry, setActiveCountry] = useState<string>(defaultTab);

  const canDownload = hasFeature("taxReportsDownload");
  const canShare = hasFeature("taxCaShare");

  // Sync active country tab → tour context so TutorialButton shows country-specific steps
  const setTourSubKey = useTourContext((s) => s.setSubKey);
  useEffect(() => {
    setTourSubKey(activeCountry);
    return () => setTourSubKey(null);
  }, [activeCountry, setTourSubKey]);

  if (featuresLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-amber-600" />
              <T>Tax Filing Reports</T>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <T>
                Generate compliant tax reports for every country you sell in. Files are
                ready for your CA, GST portal, HMRC MTD, FTA, OSS, and US states.
              </T>
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> <T>Period</T>
              </Label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-44"
                data-tour="tax-period"
              />
            </div>
          </div>
        </div>

        {/* Privacy notice */}
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                <T>Your data is shop-scoped and audit-logged</T>
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                <T>
                  All exports are logged with hashed IP for GDPR compliance. Share links
                  expire in 7 days. No customer PII appears in filenames.
                </T>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Country tabs */}
        <Tabs value={activeCountry} onValueChange={setActiveCountry} data-tour="tax-countries">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            {COUNTRY_TABS.map((c) => (
              <TabsTrigger key={c.code} value={c.code} className="text-xs md:text-sm">
                <span className="mr-1">{c.flag}</span>
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="IN" className="mt-6">
            <IndiaPanel period={period} canDownload={canDownload} canShare={canShare} />
          </TabsContent>
          <TabsContent value="NP" className="mt-6">
            <NepalPanel period={period} canShare={canShare} />
          </TabsContent>
          <TabsContent value="AE" className="mt-6">
            <UaePanel period={period} canShare={canShare} />
          </TabsContent>
          <TabsContent value="GB" className="mt-6">
            <UkPanel period={period} canShare={canShare} />
          </TabsContent>
          <TabsContent value="EU" className="mt-6">
            <EuPanel period={period} canDownload={canDownload} canShare={canShare} />
          </TabsContent>
          <TabsContent value="US" className="mt-6">
            <UsPanel period={period} canDownload={canDownload} canShare={canShare} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ─── Reusable summary card ─────────────────────────────────────────
function SummaryGrid({ data }: { data: Record<string, any> | null }) {
  if (!data) return null;
  const entries = Object.entries(data).filter(
    ([k, v]) => !k.startsWith("_") && typeof v !== "object",
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className="rounded-lg border bg-white dark:bg-gray-900 p-3"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">{k}</div>
          <div className="text-lg font-semibold mt-1">
            {typeof v === "number" ? v.toLocaleString() : String(v)}
          </div>
        </div>
      ))}
      {data._note && (
        <div className="col-span-full text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 mt-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{data._note}</span>
        </div>
      )}
    </div>
  );
}

function ShareWithCAButton({ country, period, canShare }: { country: string; period: string; canShare: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  if (!canShare) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-70 cursor-not-allowed">
        <Lock className="h-3 w-3 mr-1" />
        <T>Share with CA</T>
        <span className="ml-1.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Pro+</span>
      </Button>
    );
  }

  const handle = async () => {
    setLoading(true);
    try {
      const res = await taxReportsApi.createShareLink({ country, period });
      const url = `${window.location.origin}/share/tax/${res.data.token}`;
      setLink(url);
      navigator.clipboard.writeText(url);
      toast({ title: "Share link copied to clipboard (7 day expiry)" });
    } catch {
      toast({ variant: "destructive", title: "Failed to create share link" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <Button onClick={handle} disabled={loading} variant="outline" size="sm">
        {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Share2 className="h-3 w-3 mr-1" />}
        <T>Share with CA (7d link)</T>
      </Button>
      {link && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(link);
            toast({ title: "Copied" });
          }}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Copy className="h-3 w-3" /> {link.slice(0, 32)}…
        </button>
      )}
    </div>
  );
}

// ─── Locked download state for free plan users ────────────────────
function LockedDownloadSection() {
  return (
    <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5 text-amber-500 shrink-0" />
        <div>
          <p className="text-sm font-medium"><T>Downloads require Pro plan</T></p>
          <p className="text-xs text-muted-foreground"><T>Upgrade to export GSTR-1 CSV, HSN CSV, and Tally XML files</T></p>
        </div>
      </div>
      <a href="/pricing" className="shrink-0">
        <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
          <Sparkles className="h-3 w-3 mr-1" /> <T>Upgrade</T>
        </Button>
      </a>
    </div>
  );
}

// ─── INDIA ────────────────────────────────────────────────────────
function IndiaPanel({ period, canDownload, canShare }: { period: string; canDownload: boolean; canShare: boolean }) {
  const { toast } = useToast();
  const [gstr3b, setGstr3b] = useState<any>(null);
  const [hsn, setHsn] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      taxReportsApi.indiaGstr3b(period).then((r) => r.data),
      taxReportsApi.indiaHsn(period).then((r) => r.data),
    ])
      .then(([a, b]) => {
        setGstr3b(a);
        setHsn(b as any[]);
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load India report" }))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadCsv = async (kind: "gstr1" | "hsn") => {
    const res = kind === "gstr1"
      ? await taxReportsApi.indiaGstr1(period, "csv")
      : await taxReportsApi.indiaHsn(period, "csv");
    downloadBlob(res.data, `${kind === "gstr1" ? "GSTR1" : "HSN"}-${period}.csv`);
  };
  const downloadTally = async () => {
    const res = await taxReportsApi.indiaTallyXml(period);
    downloadBlob(res.data, `Tally-${period}.xml`, "application/xml");
  };

  return (
    <div className="space-y-4">
      <Card data-tour="india-gstr3b">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span><T>GSTR-3B Summary</T></span>
            <ShareWithCAButton country="IN" period={period} canShare={canShare} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonGrid /> : <SummaryGrid data={gstr3b} />}
        </CardContent>
      </Card>

      <Card data-tour="india-downloads">
        <CardHeader>
          <CardTitle><T>Downloads</T></CardTitle>
        </CardHeader>
        <CardContent>
          {canDownload ? (
            <div className="grid md:grid-cols-3 gap-3">
              <Button onClick={() => downloadCsv("gstr1")} variant="outline">
                <Download className="h-4 w-4 mr-2" /> GSTR-1 (CSV)
              </Button>
              <Button onClick={() => downloadCsv("hsn")} variant="outline">
                <Download className="h-4 w-4 mr-2" /> HSN Summary (CSV)
              </Button>
              <Button onClick={downloadTally} variant="outline">
                <Download className="h-4 w-4 mr-2" /> Tally XML
              </Button>
            </div>
          ) : (
            <LockedDownloadSection />
          )}
        </CardContent>
      </Card>

      {hsn.length > 0 && (
        <Card data-tour="india-hsn">
          <CardHeader>
            <CardTitle><T>HSN-wise Breakdown</T></CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 px-2">HSN</th>
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Taxable Value</th>
                  <th className="py-2 px-2 text-right">IGST</th>
                  <th className="py-2 px-2 text-right">CGST</th>
                  <th className="py-2 px-2 text-right">SGST</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {hsn.map((r) => (
                  <tr key={r.hsn} className="border-b">
                    <td className="py-2 px-2 font-mono">{r.hsn}</td>
                    <td className="py-2 px-2">{r.description}</td>
                    <td className="py-2 px-2 text-right">{r.quantity}</td>
                    <td className="py-2 px-2 text-right">{r.taxableValue.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{r.igst.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{r.cgst.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{r.sgst.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-semibold">{r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PhaseCNote items={[
        "e-Invoice IRN via NIC IRP (requires GSP/ASP credentials)",
        "Direct GSTR-1 filing via GSTN APIs (requires GSP partnership)",
        "Auto reconciliation with GSTR-2B for ITC",
      ]} />
    </div>
  );
}

// ─── NEPAL ────────────────────────────────────────────────────────
function NepalPanel({ period, canShare }: { period: string; canShare: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditTab, setAuditTab] = useState<"monthly" | "yearly">("monthly");
  const [auditYear, setAuditYear] = useState(() => new Date().getFullYear());
  const [auditData, setAuditData] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    taxReportsApi.nepalVat(period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load Nepal VAT" }))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAudit = (year: number) => {
    setAuditLoading(true);
    setAuditData(null);
    taxReportsApi.nepalAudit(year)
      .then((r) => setAuditData(r.data))
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || "Unknown error";
        toast({ variant: "destructive", title: "Failed to load yearly audit", description: msg });
      })
      .finally(() => setAuditLoading(false));
  };

  useEffect(() => {
    if (auditTab !== "yearly") return;
    loadAudit(auditYear);
  }, [auditTab, auditYear]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <Tabs value={auditTab} onValueChange={(v) => setAuditTab(v as "monthly" | "yearly")} data-tour="nepal-audit-tabs">
        <TabsList className="mb-2">
          <TabsTrigger value="monthly">Monthly Return</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span><T>Nepal VAT & Luxury Tax Return</T></span>
                <ShareWithCAButton country="NP" period={period} canShare={canShare} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <SkeletonGrid /> : <SummaryGrid data={data} />}
              <p className="text-xs text-gray-500 mt-4">
                <T>Gold/silver jewellery: 2% luxury tax on metal + making. Gemstones & services: 13% VAT.</T>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <T>Nepal Yearly Audit</T>
                  {auditData?.auditRequired && (
                    <span className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                      IRD Audit Required
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setAuditYear(y => y - 1)}>‹</Button>
                    <span className="text-sm font-medium w-12 text-center">{auditYear}</span>
                    <Button variant="outline" size="sm" onClick={() => setAuditYear(y => y + 1)} disabled={auditYear >= new Date().getFullYear()}>›</Button>
                  </div>
                  <ShareWithCAButton country="NP" period={String(auditYear)} canShare={canShare} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <SkeletonGrid />
              ) : auditData ? (
                <div className="space-y-4">
                  {/* IRD threshold bar */}
                  <div className="space-y-1" data-tour="nepal-audit-threshold">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>IRD audit threshold (NPR 1 crore)</span>
                      <span>{auditData.thresholdUsedPct}% used</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${auditData.auditRequired ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(auditData.thresholdUsedPct, 100)}%` }}
                      />
                    </div>
                    {auditData.auditRequired && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Annual sales exceed NPR 1 crore — IRD audit filing required.
                      </p>
                    )}
                  </div>

                  {/* Month-by-month table */}
                  <div className="overflow-x-auto" data-tour="nepal-audit-table">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 pr-3">Month</th>
                          <th className="text-right py-2 pr-3">Invoices</th>
                          <th className="text-right py-2 pr-3">Sales (NPR)</th>
                          <th className="text-right py-2 pr-3">Luxury Tax (2%)</th>
                          <th className="text-right py-2">VAT (13%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.months.map((m: any) => (
                          <tr key={m.month} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 pr-3 font-medium">{m.label}</td>
                            <td className="text-right py-2 pr-3 text-muted-foreground">{m.invoiceCount}</td>
                            <td className="text-right py-2 pr-3">{m.totalSales.toLocaleString()}</td>
                            <td className="text-right py-2 pr-3">{m.luxuryTax.toLocaleString()}</td>
                            <td className="text-right py-2">{m.vatCollected.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold text-sm border-t-2">
                          <td className="py-2 pr-3">Total</td>
                          <td className="text-right py-2 pr-3">{auditData.totals.annualInvoices}</td>
                          <td className="text-right py-2 pr-3">{auditData.totals.annualSales.toLocaleString()}</td>
                          <td className="text-right py-2 pr-3">{auditData.totals.annualLuxuryTax.toLocaleString()}</td>
                          <td className="text-right py-2">{auditData.totals.annualVat.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Compliant with IRD Nepal annual audit requirements. Share with your CA using the share button above.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-muted-foreground">Failed to load audit data.</p>
                  <Button variant="outline" size="sm" onClick={() => loadAudit(auditYear)}>Retry</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── UAE ──────────────────────────────────────────────────────────
function UaePanel({ period, canShare }: { period: string; canShare: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    taxReportsApi.uaeVat201(period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load UAE VAT 201" }))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <Card data-tour="uae-vat201">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span><T>UAE VAT 201 (FTA)</T></span>
            <ShareWithCAButton country="AE" period={period} canShare={canShare} />
          </CardTitle>
        </CardHeader>
        <CardContent>{loading ? <SkeletonGrid /> : <SummaryGrid data={data} />}</CardContent>
      </Card>
      <PhaseCNote items={["Direct submission to EmaraTax portal (requires FTA TRN integration)"]} />
    </div>
  );
}

// ─── UK ───────────────────────────────────────────────────────────
function UkPanel({ period, canShare }: { period: string; canShare: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    taxReportsApi.ukMtd(period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load UK MTD" }))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <Card data-tour="uk-mtd">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span><T>UK MTD VAT Return (9-Box)</T></span>
            <ShareWithCAButton country="GB" period={period} canShare={canShare} />
          </CardTitle>
        </CardHeader>
        <CardContent>{loading ? <SkeletonGrid /> : <SummaryGrid data={data} />}</CardContent>
      </Card>
      <PhaseCNote items={["Direct submission to HMRC MTD API (requires HMRC OAuth + bridging certification)"]} />
    </div>
  );
}

// ─── EU ───────────────────────────────────────────────────────────
function EuPanel({ period, canDownload, canShare }: { period: string; canDownload: boolean; canShare: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    taxReportsApi.euOss(period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load EU OSS" }))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  const downloadCsv = async () => {
    const res = await taxReportsApi.euOss(period, "csv");
    downloadBlob(res.data, `EU-OSS-${period}.csv`);
  };
  return (
    <div className="space-y-4">
      <Card data-tour="eu-oss">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span><T>EU OSS by Destination Country</T></span>
            <div className="flex gap-2">
              {canDownload ? (
                <Button onClick={downloadCsv} variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="opacity-70 cursor-not-allowed">
                  <Lock className="h-3 w-3 mr-1" /> CSV
                  <span className="ml-1.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Pro</span>
                </Button>
              )}
              <ShareWithCAButton country="EU" period={period} canShare={canShare} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonGrid /> : (
            <CountryRowsTable rows={data?.rows || []} cols={["country", "invoiceCount", "netSales", "vatRate", "vatAmount"]} />
          )}
        </CardContent>
      </Card>
      <PhaseCNote items={["Direct OSS submission to home-state portal (requires national portal certification)"]} />
    </div>
  );
}

// ─── US ───────────────────────────────────────────────────────────
function UsPanel({ period, canDownload, canShare }: { period: string; canDownload: boolean; canShare: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    taxReportsApi.usState(period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load US state report" }))
      .finally(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  const downloadCsv = async () => {
    const res = await taxReportsApi.usState(period, "csv");
    downloadBlob(res.data, `US-State-${period}.csv`);
  };
  return (
    <div className="space-y-4">
      <Card data-tour="us-state-tax">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span><T>US Sales Tax by State</T></span>
            <div className="flex gap-2">
              {canDownload ? (
                <Button onClick={downloadCsv} variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="opacity-70 cursor-not-allowed">
                  <Lock className="h-3 w-3 mr-1" /> CSV
                  <span className="ml-1.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Pro</span>
                </Button>
              )}
              <ShareWithCAButton country="US" period={period} canShare={canShare} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonGrid /> : (
            <>
              <CountryRowsTable rows={data?.rows || []} cols={["state", "invoiceCount", "netSales", "salesTax"]} />
              {data?._note && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {data._note}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <PhaseCNote items={["TaxJar / Avalara integration for real-time rooftop rates", "Auto-file to each state portal"]} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function CountryRowsTable({ rows, cols }: { rows: any[]; cols: string[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500"><T>No invoices in this period.</T></p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>{cols.map((c) => <th key={c} className="py-2 px-2 capitalize">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {cols.map((c) => (
                <td key={c} className="py-2 px-2">
                  {typeof r[c] === "number" ? r[c].toLocaleString() : String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

function PhaseCNote({ items }: { items: string[] }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4 flex items-start gap-3">
        <Lock className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <p className="font-semibold flex items-center gap-2">
            <T>Available on Enterprise plan</T>
            <ExternalLink className="h-3 w-3" />
          </p>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            {items.map((it) => <li key={it}>{it}</li>)}
          </ul>
          <a href="/contact" className="text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
            <T>Contact us to enable</T> <CheckCircle2 className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
