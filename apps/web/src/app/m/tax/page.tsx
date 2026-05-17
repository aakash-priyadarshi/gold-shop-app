"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { taxReportsApi } from "@/lib/api";
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Receipt,
  Share2,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Country = "NEPAL" | "INDIA" | "UAE" | "UK" | "EU" | "US";

interface CountryConfig {
  code: Country;
  flag: string;
  label: string;
  regime: string;
  rate: string;
  currency: string;
  filingFreq: string;
  portalLabel: string;
  portalUrl: string;
  note: string;
}

const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: "NEPAL",
    flag: "🇳🇵",
    label: "Nepal",
    regime: "VAT",
    rate: "13%",
    currency: "NPR",
    filingFreq: "Monthly (by 25th)",
    portalLabel: "IRD Portal",
    portalUrl: "https://ird.gov.np",
    note: "Jewellery is subject to 13% VAT in Nepal. Registration required if annual turnover > NPR 5M.",
  },
  {
    code: "INDIA",
    flag: "🇮🇳",
    label: "India",
    regime: "GST",
    rate: "3%",
    currency: "INR",
    filingFreq: "GSTR-1 monthly (11th) / GSTR-3B (20th)",
    portalLabel: "GSTN Portal",
    portalUrl: "https://www.gst.gov.in",
    note: "Gold & silver jewellery attracts 3% GST. Making charges are taxable at 5%. GSTR-1 due 11th, GSTR-3B due 20th of next month.",
  },
  {
    code: "UAE",
    flag: "🇦🇪",
    label: "UAE",
    regime: "VAT",
    rate: "5%",
    currency: "AED",
    filingFreq: "Quarterly (by 28th of next month)",
    portalLabel: "FTA EmaraTax",
    portalUrl: "https://tax.gov.ae",
    note: "UAE VAT is 5%. Investment gold (99%+ purity) is zero-rated. Fabricated jewellery is standard-rated at 5%. File VAT201 quarterly via FTA EmaraTax portal.",
  },
  {
    code: "UK",
    flag: "🇬🇧",
    label: "United Kingdom",
    regime: "VAT (MTD)",
    rate: "20%",
    currency: "GBP",
    filingFreq: "Quarterly (Making Tax Digital)",
    portalLabel: "HMRC MTD",
    portalUrl: "https://www.gov.uk/guidance/use-making-tax-digital-for-vat",
    note: "UK VAT is 20%. Investment gold is zero-rated; jewellery is standard-rated. MTD is mandated for all VAT-registered businesses — compatible software required.",
  },
  {
    code: "EU",
    flag: "🇪🇺",
    label: "European Union",
    regime: "VAT (OSS)",
    rate: "Varies by country",
    currency: "EUR",
    filingFreq: "Quarterly OSS return",
    portalLabel: "VAT OSS Portal",
    portalUrl: "https://vat-one-stop-shop.ec.europa.eu",
    note: "EU VAT varies: Austria 20%, France 20%, Germany 19%, Italy 22%. Investment gold is VAT-exempt across all member states. OSS simplifies cross-border EU filings into one return.",
  },
  {
    code: "US",
    flag: "🇺🇸",
    label: "United States",
    regime: "Sales Tax",
    rate: "0%–10.25% by state",
    currency: "USD",
    filingFreq: "Monthly / Quarterly (by state)",
    portalLabel: "State Tax Portals",
    portalUrl: "https://www.taxjar.com/resources/sales-tax/state-guides",
    note: "No federal sales tax in the US. Each state sets its own rate. Most states exempt bullion and investment gold. Fabricated jewellery is taxable in most states. Nexus rules apply.",
  },
];

function getMonthOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      value,
    });
  }
  return opts;
}

interface TaxSummary {
  totalSales: number;
  taxCollected: number;
  taxableAmount: number;
  invoiceCount: number;
  currency: string;
  exemptAmount?: number;
  zeroRatedAmount?: number;
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-1 ${
        highlight ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"
      }`}
    >
      <p className="text-xs text-gray-500">
        <T>{label}</T>
      </p>
      <p className={`text-lg font-bold ${highlight ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function DownloadRow({
  label,
  desc,
  icon: Icon,
  loading,
  onPress,
}: {
  label: string;
  desc: string;
  icon: React.ElementType;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 active:bg-gray-50 text-left disabled:opacity-50"
    >
      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
        {loading ? (
          <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
        ) : (
          <Icon className="h-5 w-5 text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          <T>{label}</T>
        </p>
        <p className="text-xs text-gray-500">
          <T>{desc}</T>
        </p>
      </div>
      <Download className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </button>
  );
}

function CountryNote({ config }: { config: CountryConfig }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-700">
            {config.flag} {config.regime} · {config.rate} · {config.filingFreq}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-blue-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-blue-100">
          <p className="text-xs text-blue-700 pt-2">{config.note}</p>
          <a
            href={config.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 underline underline-offset-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {config.portalLabel}
          </a>
        </div>
      )}
    </div>
  );
}

function blobDown(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function jsonDown(data: unknown, filename: string) {
  blobDown(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename,
  );
}

export default function TaxAuditPage() {
  const [country, setCountry] = useState<Country>("NEPAL");
  const monthOptions = getMonthOptions();
  const [period, setPeriod] = useState(monthOptions[0].value);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const config = COUNTRY_CONFIGS.find((c) => c.code === country)!;

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await taxReportsApi.summary(country, period);
      setSummary(res.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [country, period]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const cur = summary?.currency ?? config.currency;
  const fmt = (n?: number | null) =>
    `${cur} ${Math.round(Number(n ?? 0)).toLocaleString("en-IN")}`;

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      if (country === "INDIA") {
        if (type === "gstr1-csv") {
          const res = await taxReportsApi.indiaGstr1(period, "csv");
          blobDown(res.data, `GSTR1_${period}.csv`);
        } else if (type === "gstr3b") {
          const res = await taxReportsApi.indiaGstr3b(period);
          jsonDown(res.data, `GSTR3B_${period}.json`);
        } else if (type === "hsn") {
          const res = await taxReportsApi.indiaHsn(period, "csv");
          blobDown(res.data, `HSN_${period}.csv`);
        } else if (type === "tally") {
          const res = await taxReportsApi.indiaTallyXml(period);
          blobDown(res.data, `Tally_${period}.xml`);
        }
      } else if (country === "NEPAL") {
        if (type === "vat") {
          const res = await taxReportsApi.nepalVat(period);
          jsonDown(res.data, `VAT_${period}.json`);
        } else if (type === "audit") {
          const year = parseInt(period.split("-")[0]);
          const res = await taxReportsApi.nepalAudit(year);
          jsonDown(res.data, `NepalAudit_${year}.json`);
        }
      } else if (country === "UAE") {
        const res = await taxReportsApi.uaeVat201(period);
        jsonDown(res.data, `UAE_VAT201_${period}.json`);
      } else if (country === "UK") {
        const res = await taxReportsApi.ukMtd(period);
        jsonDown(res.data, `UK_MTD_${period}.json`);
      } else if (country === "EU") {
        if (type === "oss-csv") {
          const res = await taxReportsApi.euOss(period, "csv");
          blobDown(res.data, `EU_OSS_${period}.csv`);
        } else {
          const res = await taxReportsApi.euOss(period, "json");
          jsonDown(res.data, `EU_OSS_${period}.json`);
        }
      } else if (country === "US") {
        if (type === "us-csv") {
          const res = await taxReportsApi.usState(period, "csv");
          blobDown(res.data, `US_StateTax_${period}.csv`);
        } else {
          const res = await taxReportsApi.usState(period, "json");
          jsonDown(res.data, `US_StateTax_${period}.json`);
        }
      }
    } catch {
      // pass
    } finally {
      setDownloading(null);
    }
  };

  const shareWithAccountant = async () => {
    setSharing(true);
    try {
      const res = await taxReportsApi.createShareLink({ country, period, ttlDays: 7 });
      const url: string = res.data?.url ?? res.data?.shareUrl ?? "";
      if (url) {
        setShareUrl(url);
        const label = monthOptions.find((o) => o.value === period)?.label ?? period;
        const msg = `Hi, here is the ${config.regime} report for ${config.flag} ${config.label} — ${label}:\n${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch {
      // pass
    } finally {
      setSharing(false);
    }
  };

  return (
    <MobileFeatureGate feature="mobileTaxReports" featureName="Tax Audit & Reports">
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between -mt-2 mb-1">
          <div>
            <h1 className="text-base font-bold text-gray-900">
              <T>Tax Audit</T>
            </h1>
            <p className="text-[11px] text-gray-400">
              <T>GST · VAT · MTD · OSS · Sales Tax — 6 countries</T>
            </p>
          </div>
          <MobileHelpButton
            title="Multi-Country Tax Audit"
            description="Generate filing-ready tax reports for any month or quarter across all supported countries."
            tips={[
              "Select your country and the billing period",
              "Tap the blue info bar to see tax rates, deadlines, and portal links",
              "Download reports in the exact format each portal needs",
              "All sales are audited and displayed in their respective local currencies (e.g. INR for India, AED for UAE).",
              "Share a secure link with your accountant (7-day expiry)",
            ]}
          />
        </div>

        {/* Country tabs — horizontally scrollable chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {COUNTRY_CONFIGS.map((c) => (
            <button
              key={c.code}
              onClick={() => { setCountry(c.code); setShareUrl(null); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                country === c.code
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Period picker */}
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Country info/rules banner */}
        <CountryNote config={config} />

        {/* Summary stats */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Sales" value={fmt(summary.totalSales)} />
            <StatCard label="Tax Collected" value={fmt(summary.taxCollected)} highlight />
            <StatCard label="Taxable Amount" value={fmt(summary.taxableAmount)} />
            <StatCard
              label="Invoices"
              value={String(summary.invoiceCount ?? 0)}
              sub={monthOptions.find((o) => o.value === period)?.label}
            />
            {(summary.zeroRatedAmount ?? 0) > 0 && (
              <StatCard
                label="Zero-Rated"
                value={fmt(summary.zeroRatedAmount!)}
                sub="e.g. investment gold"
              />
            )}
            {(summary.exemptAmount ?? 0) > 0 && (
              <StatCard label="Exempt" value={fmt(summary.exemptAmount!)} />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
            <TrendingUp className="h-8 w-8" />
            <p className="text-sm">
              <T>No data for this period</T>
            </p>
          </div>
        )}

        {/* Download section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <T>Download Reports</T>
          </p>

          {country === "INDIA" && (
            <>
              <DownloadRow
                label="GSTR-1 (CSV)"
                desc="B2B & B2C sales for GST portal upload"
                icon={FileSpreadsheet}
                loading={downloading === "gstr1-csv"}
                onPress={() => handleDownload("gstr1-csv")}
              />
              <DownloadRow
                label="GSTR-3B (JSON)"
                desc="Monthly summary return"
                icon={FileText}
                loading={downloading === "gstr3b"}
                onPress={() => handleDownload("gstr3b")}
              />
              <DownloadRow
                label="HSN Summary (CSV)"
                desc="Harmonised nomenclature product report"
                icon={FileSpreadsheet}
                loading={downloading === "hsn"}
                onPress={() => handleDownload("hsn")}
              />
              <DownloadRow
                label="Tally XML"
                desc="Import directly into Tally ERP"
                icon={Download}
                loading={downloading === "tally"}
                onPress={() => handleDownload("tally")}
              />
            </>
          )}

          {country === "NEPAL" && (
            <>
              <DownloadRow
                label="VAT Return (JSON)"
                desc="Nepal IRD monthly VAT filing data"
                icon={Receipt}
                loading={downloading === "vat"}
                onPress={() => handleDownload("vat")}
              />
              <DownloadRow
                label="Annual Audit Report (JSON)"
                desc="Fiscal year audit data for IRD"
                icon={FileText}
                loading={downloading === "audit"}
                onPress={() => handleDownload("audit")}
              />
            </>
          )}

          {country === "UAE" && (
            <DownloadRow
              label="VAT201 Return (JSON)"
              desc="UAE FTA quarterly VAT201 return"
              icon={Receipt}
              loading={downloading === "vat201"}
              onPress={() => handleDownload("vat201")}
            />
          )}

          {country === "UK" && (
            <DownloadRow
              label="MTD VAT Return (JSON)"
              desc="HMRC Making Tax Digital — quarterly filing"
              icon={FileText}
              loading={downloading === "mtd"}
              onPress={() => handleDownload("mtd")}
            />
          )}

          {country === "EU" && (
            <>
              <DownloadRow
                label="OSS Return (CSV)"
                desc="EU One-Stop-Shop quarterly return"
                icon={FileSpreadsheet}
                loading={downloading === "oss-csv"}
                onPress={() => handleDownload("oss-csv")}
              />
              <DownloadRow
                label="OSS Return (JSON)"
                desc="Structured JSON for accountant import"
                icon={FileText}
                loading={downloading === "oss-json"}
                onPress={() => handleDownload("oss-json")}
              />
            </>
          )}

          {country === "US" && (
            <>
              <DownloadRow
                label="State Sales Tax (CSV)"
                desc="By-state breakdown for nexus reporting"
                icon={FileSpreadsheet}
                loading={downloading === "us-csv"}
                onPress={() => handleDownload("us-csv")}
              />
              <DownloadRow
                label="State Sales Tax (JSON)"
                desc="Structured data for TaxJar / Avalara import"
                icon={FileText}
                loading={downloading === "us-json"}
                onPress={() => handleDownload("us-json")}
              />
            </>
          )}
        </div>

        {/* Share with accountant */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <T>Share with Accountant</T>
          </p>
          <button
            onClick={shareWithAccountant}
            disabled={sharing}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 active:bg-gray-50 disabled:opacity-50 text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              {sharing ? (
                <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
              ) : (
                <Share2 className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                <T>Send to Accountant</T>
              </p>
              <p className="text-xs text-gray-500">
                <T>Secure link (7-day expiry) — opens WhatsApp</T>
              </p>
            </div>
          </button>

          {shareUrl && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-xs text-green-700 font-medium mb-1">
                <T>Link created:</T>
              </p>
              <p className="text-xs text-green-800 break-all">{shareUrl}</p>
            </div>
          )}
        </div>

        {/* Portal quick-link */}
        <a
          href={config.portalUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 active:bg-gray-50"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{config.portalLabel}</p>
            <p className="text-xs text-gray-500">
              <T>Open filing portal in browser</T>
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-300" />
        </a>
      </div>
    </MobileFeatureGate>
  );
}
