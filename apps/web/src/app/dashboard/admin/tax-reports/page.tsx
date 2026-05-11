"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminTaxApi, shopsApi } from "@/lib/api";
import {
    AlertCircle,
    Building2,
    Calendar,
    Download,
    FileText,
    ShieldCheck
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

interface Shop {
  id: string;
  name: string;
  country?: string;
}

export default function AdminTaxReportsPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [period, setPeriod] = useState<string>(currentMonth());
  const [activeCountry, setActiveCountry] = useState<string>("NP");

  useEffect(() => {
    shopsApi
      .getAll({ pageSize: 500, isVerified: true })
      .then((r) => {
        const arr: Shop[] = r.data?.shops || r.data || [];
        setShops(arr);
        if (arr.length > 0) setSelectedShopId(arr[0].id);
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load shops" }))
      .finally(() => setShopsLoading(false));
  }, []);

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-600" />
                Tax Filing Reports (Admin)
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                View and download tax reports for any registered shop. All access is audit-logged.
              </p>
            </div>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Shop
                </Label>
                {shopsLoading ? (
                  <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
                ) : (
                  <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue placeholder="Select a shop…" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.country ? ` (${s.country})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Period
                </Label>
                <Input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-44"
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy notice */}
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Admin access — audit-logged</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  You are viewing tax data as a platform admin. All actions are recorded. Shop data is
                  read-only and cannot be modified here.
                </p>
              </div>
            </CardContent>
          </Card>

          {!selectedShopId ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Select a shop to view its tax reports.</p>
            </div>
          ) : (
            <Tabs value={activeCountry} onValueChange={setActiveCountry}>
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
                {COUNTRY_TABS.map((c) => (
                  <TabsTrigger key={c.code} value={c.code} className="text-xs md:text-sm">
                    <span className="mr-1">{c.flag}</span>
                    {c.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="IN" className="mt-6">
                <IndiaPanel shopId={selectedShopId} period={period} shopName={selectedShop?.name} />
              </TabsContent>
              <TabsContent value="NP" className="mt-6">
                <NepalPanel shopId={selectedShopId} period={period} />
              </TabsContent>
              <TabsContent value="AE" className="mt-6">
                <UaePanel shopId={selectedShopId} period={period} />
              </TabsContent>
              <TabsContent value="GB" className="mt-6">
                <UkPanel shopId={selectedShopId} period={period} />
              </TabsContent>
              <TabsContent value="EU" className="mt-6">
                <EuPanel shopId={selectedShopId} period={period} />
              </TabsContent>
              <TabsContent value="US" className="mt-6">
                <UsPanel shopId={selectedShopId} period={period} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────
function SummaryGrid({ data }: { data: Record<string, any> | null }) {
  if (!data) return null;
  const entries = Object.entries(data).filter(
    ([k, v]) => !k.startsWith("_") && typeof v !== "object",
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg border bg-white dark:bg-gray-900 p-3">
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

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

function RowsTable({ rows, cols }: { rows: any[]; cols: string[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">No invoices in this period.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>
            {cols.map((c) => (
              <th key={c} className="py-2 px-2 capitalize">
                {c}
              </th>
            ))}
          </tr>
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

// ─── INDIA ────────────────────────────────────────────────────────
function IndiaPanel({
  shopId,
  period,
  shopName,
}: {
  shopId: string;
  period: string;
  shopName?: string;
}) {
  const { toast } = useToast();
  const [gstr3b, setGstr3b] = useState<any>(null);
  const [hsn, setHsn] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setGstr3b(null);
    setHsn([]);
    Promise.all([
      adminTaxApi.indiaGstr3b(shopId, period).then((r) => r.data),
      adminTaxApi.indiaHsn(shopId, period).then((r) => r.data),
    ])
      .then(([a, b]) => {
        setGstr3b(a);
        setHsn(b as any[]);
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load India report" }))
      .finally(() => setLoading(false));
  }, [shopId, period]);

  const downloadCsv = async (kind: "gstr1" | "hsn") => {
    try {
      const res =
        kind === "gstr1"
          ? await adminTaxApi.indiaGstr1(shopId, period, "csv")
          : await adminTaxApi.indiaHsn(shopId, period, "csv");
      downloadBlob(res.data, `${kind === "gstr1" ? "GSTR1" : "HSN"}-${period}.csv`);
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  const downloadTally = async () => {
    try {
      const res = await adminTaxApi.indiaTallyXml(shopId, period);
      downloadBlob(res.data, `Tally-${period}.xml`, "application/xml");
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>GSTR-3B Summary{shopName ? ` — ${shopName}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>{loading ? <SkeletonGrid /> : <SummaryGrid data={gstr3b} />}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Downloads</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <Button onClick={() => downloadCsv("gstr1")} variant="outline">
            <Download className="h-4 w-4 mr-2" /> GSTR-1 (CSV)
          </Button>
          <Button onClick={() => downloadCsv("hsn")} variant="outline">
            <Download className="h-4 w-4 mr-2" /> HSN Summary (CSV)
          </Button>
          <Button onClick={downloadTally} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Tally XML
          </Button>
        </CardContent>
      </Card>

      {hsn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>HSN-wise Breakdown</CardTitle>
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
                    <td className="py-2 px-2 text-right font-semibold">
                      {r.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── NEPAL ────────────────────────────────────────────────────────
function NepalPanel({ shopId, period }: { shopId: string; period: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setData(null);
    adminTaxApi
      .nepalVat(shopId, period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load Nepal VAT" }))
      .finally(() => setLoading(false));
  }, [shopId, period]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nepal VAT &amp; Luxury Tax Return</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <SkeletonGrid /> : <SummaryGrid data={data} />}
        <p className="text-xs text-gray-500 mt-4">
          Gold/silver jewellery: 2% luxury tax on metal + making. Gemstones & services: 13% VAT.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── UAE ──────────────────────────────────────────────────────────
function UaePanel({ shopId, period }: { shopId: string; period: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setData(null);
    adminTaxApi
      .uaeVat201(shopId, period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load UAE VAT 201" }))
      .finally(() => setLoading(false));
  }, [shopId, period]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>UAE VAT 201 (FTA)</CardTitle>
      </CardHeader>
      <CardContent>{loading ? <SkeletonGrid /> : <SummaryGrid data={data} />}</CardContent>
    </Card>
  );
}

// ─── UK ───────────────────────────────────────────────────────────
function UkPanel({ shopId, period }: { shopId: string; period: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setData(null);
    adminTaxApi
      .ukMtd(shopId, period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load UK MTD" }))
      .finally(() => setLoading(false));
  }, [shopId, period]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>UK MTD VAT Return (9-Box)</CardTitle>
      </CardHeader>
      <CardContent>{loading ? <SkeletonGrid /> : <SummaryGrid data={data} />}</CardContent>
    </Card>
  );
}

// ─── EU ───────────────────────────────────────────────────────────
function EuPanel({ shopId, period }: { shopId: string; period: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setData(null);
    adminTaxApi
      .euOss(shopId, period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load EU OSS" }))
      .finally(() => setLoading(false));
  }, [shopId, period]);

  const downloadCsv = async () => {
    try {
      const res = await adminTaxApi.euOss(shopId, period, "csv");
      downloadBlob(res.data, `EU-OSS-${period}.csv`);
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>EU OSS by Destination Country</span>
          <Button onClick={downloadCsv} variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <RowsTable
            rows={data?.rows || []}
            cols={["country", "invoiceCount", "netSales", "vatRate", "vatAmount"]}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── US ───────────────────────────────────────────────────────────
function UsPanel({ shopId, period }: { shopId: string; period: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setData(null);
    adminTaxApi
      .usState(shopId, period)
      .then((r) => setData(r.data))
      .catch(() => toast({ variant: "destructive", title: "Failed to load US state report" }))
      .finally(() => setLoading(false));
  }, [shopId, period]);

  const downloadCsv = async () => {
    try {
      const res = await adminTaxApi.usState(shopId, period, "csv");
      downloadBlob(res.data, `US-State-${period}.csv`);
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>US Sales Tax by State</span>
          <Button onClick={downloadCsv} variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <>
            <RowsTable
              rows={data?.rows || []}
              cols={["state", "invoiceCount", "netSales", "salesTax"]}
            />
            {data?._note && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {data._note}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
