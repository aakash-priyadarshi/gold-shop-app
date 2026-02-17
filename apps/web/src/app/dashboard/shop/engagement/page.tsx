"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useImageUpload } from "@/hooks/useImageUpload";
import { sellerPerformanceApi, shopsApi } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  FileCheck,
  Globe,
  Heart,
  HelpCircle,
  Info,
  Loader2,
  MessageSquare,
  Settings,
  Shield,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════
 *  TYPES
 * ═══════════════════════════════════════════════════════ */

interface HealthScore {
  profileCompleteness: { score: number; max: number; missing: string[] };
  performanceMetrics: {
    score: number;
    max: number;
    details: Record<string, number>;
  };
  verificationStatus: { score: number; max: number };
  capabilitySetup: { score: number; max: number; missing: string[] };
  engagementActivity: {
    score: number;
    max: number;
    details: Record<string, number>;
  };
  totalScore: number;
  grade: string;
}

interface OnboardingProgress {
  steps: { key: string; label: string; completed: boolean; category: string }[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  categories: Record<string, { completed: number; total: number }>;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  achieved: boolean;
  progress: number;
  target: number;
  current: number;
}

interface RfqFunnel {
  totalTargeted: number;
  viewed: number;
  responded: number;
  viewRate: number;
  responseRate: number;
  avgResponseTimeHours: number | null;
  periodBreakdown: {
    period: string;
    targeted: number;
    viewed: number;
    responded: number;
  }[];
}

interface TierDashboard {
  performance: any;
  shop: {
    sellerTier: string;
    tierUnlockedAt: string | null;
    makingChargeCap: number | null;
    makingChargePercent: number | null;
    isVerified: boolean;
    eliteFastTracked: boolean;
  };
  badges: any[];
  nextTier: string | null;
  viewingTier?: string;
  tierProgress: Record<
    string,
    { current: number | boolean; required: number | boolean; met: boolean }
  >;
  overallProgress: { met: number; total: number; percentage: number };
}

interface KycData {
  id: string;
  country: string;
  panNumber: string | null;
  vatNumber: string | null;
  bisLicenseNumber: string | null;
  verificationDocuments: Record<string, any> | null;
  isVerified: boolean;
}

/* ═══════════════════════════════════════════════════════
 *  CONSTANTS
 * ═══════════════════════════════════════════════════════ */

const gradeColor: Record<string, string> = {
  A: "text-green-600 bg-green-50",
  B: "text-blue-600 bg-blue-50",
  C: "text-yellow-600 bg-yellow-50",
  D: "text-orange-600 bg-orange-50",
  F: "text-red-600 bg-red-50",
};

const gradeLabel: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Needs Work",
  F: "Critical",
};

const categoryIcons: Record<string, any> = {
  orders: Trophy,
  revenue: TrendingUp,
  ratings: Star,
  engagement: Zap,
  tenure: Crown,
};

const TIER_META: Record<
  string,
  {
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    gradient: string;
    benefits: string[];
  }
> = {
  STANDARD: {
    label: "Standard",
    icon: Shield,
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-300",
    gradient: "from-gray-200 to-gray-100",
    benefits: [
      "Listed in seller marketplace",
      "Receive RFQ requests",
      "Up to 10% making charge",
    ],
  },
  SILVER: {
    label: "Silver",
    icon: Star,
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-400",
    gradient: "from-slate-300 to-slate-100",
    benefits: [
      "Priority in seller matching",
      "Up to 12% making charge cap",
      "Silver badge on profile",
    ],
  },
  GOLD: {
    label: "Gold",
    icon: Award,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    gradient: "from-yellow-300 to-yellow-50",
    benefits: [
      "Featured in search results",
      "Up to 15% making charge cap",
      "Gold badge + trusted seller tag",
    ],
  },
  ELITE: {
    label: "Elite",
    icon: Crown,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-400",
    gradient: "from-purple-300 to-purple-50",
    benefits: [
      "No making charge cap",
      "Elite badge + premium visibility",
      "Priority customer support",
    ],
  },
};

const CRITERIA_LABELS: Record<
  string,
  { label: string; unit: string; lowerIsBetter?: boolean }
> = {
  orders: { label: "Completed Orders", unit: "" },
  cancellationRate: {
    label: "Cancellation Rate",
    unit: "%",
    lowerIsBetter: true,
  },
  rating: { label: "Average Rating (60d)", unit: "★" },
  tenure: { label: "Shop Tenure", unit: " months" },
  positiveFeedback: { label: "Positive Feedback", unit: "%" },
  onTimeDispatch: { label: "On-Time Dispatch", unit: "%" },
  verified: { label: "Shop Verified", unit: "" },
};

/* ─── Country-specific KYC configurations ─── */

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  NP: "Nepal",
  US: "United States",
  GB: "United Kingdom",
  AE: "UAE",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  AT: "Austria",
  PT: "Portugal",
  IE: "Ireland",
  SG: "Singapore",
  AU: "Australia",
  CA: "Canada",
};

interface KycField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "document";
  required: boolean;
  helpText?: string;
}

function getKycFieldsForCountry(country: string): {
  title: string;
  description: string;
  fields: KycField[];
} {
  const EU_COUNTRIES = ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE"];

  if (country === "IN") {
    return {
      title: "Indian KYC Verification",
      description:
        "Submit your Indian business verification documents. PAN card is mandatory for gold dealers.",
      fields: [
        {
          key: "panNumber",
          label: "PAN Card Number",
          placeholder: "ABCDE1234F",
          type: "text",
          required: true,
          helpText: "10-character Permanent Account Number",
        },
        {
          key: "panCard",
          label: "PAN Card Image",
          placeholder: "Upload PAN card scan",
          type: "document",
          required: true,
        },
        {
          key: "vatNumber",
          label: "GSTIN (GST Number)",
          placeholder: "22AAAAA0000A1Z5",
          type: "text",
          required: false,
          helpText: "15-digit Goods and Services Tax ID",
        },
        {
          key: "gstCertificate",
          label: "GST Certificate",
          placeholder: "Upload GST certificate",
          type: "document",
          required: false,
        },
        {
          key: "bisLicenseNumber",
          label: "BIS Hallmark License",
          placeholder: "R-XXXX",
          type: "text",
          required: false,
          helpText:
            "Bureau of Indian Standards hallmark registration (mandatory for gold sellers)",
        },
        {
          key: "bisLicense",
          label: "BIS License Document",
          placeholder: "Upload BIS license",
          type: "document",
          required: false,
        },
      ],
    };
  }

  if (country === "NP") {
    return {
      title: "Nepal KYC Verification",
      description:
        "Submit your Nepalese business verification documents for platform compliance.",
      fields: [
        {
          key: "panNumber",
          label: "PAN Number",
          placeholder: "123456789",
          type: "text",
          required: true,
          helpText: "9-digit Permanent Account Number (IRD)",
        },
        {
          key: "panCard",
          label: "PAN Card Image",
          placeholder: "Upload PAN card",
          type: "document",
          required: true,
        },
        {
          key: "vatNumber",
          label: "VAT Registration Number",
          placeholder: "301234567",
          type: "text",
          required: false,
          helpText: "Inland Revenue Department VAT registration",
        },
        {
          key: "vatCertificate",
          label: "VAT Certificate",
          placeholder: "Upload VAT certificate",
          type: "document",
          required: false,
        },
        {
          key: "companyRegistration",
          label: "Company Registration Document",
          placeholder: "Upload company registration",
          type: "document",
          required: false,
        },
      ],
    };
  }

  if (country === "GB") {
    return {
      title: "UK KYC Verification",
      description:
        "Submit your UK business verification documents. Hallmark registration may be required for precious metal dealers.",
      fields: [
        {
          key: "companiesHouseNumber",
          label: "Companies House Number",
          placeholder: "12345678",
          type: "text",
          required: true,
          helpText: "8-digit company registration number",
        },
        {
          key: "vatNumber",
          label: "VAT Registration Number",
          placeholder: "GB123456789",
          type: "text",
          required: false,
          helpText: "UK VAT number (required if turnover > £85,000)",
        },
        {
          key: "hallmarkRegistration",
          label: "Hallmark Registration Number",
          placeholder: "Assay office sponsor mark",
          type: "text",
          required: false,
          helpText: "UK Assay Office hallmark sponsor mark for precious metals",
        },
        {
          key: "companyCertificate",
          label: "Certificate of Incorporation",
          placeholder: "Upload certificate",
          type: "document",
          required: true,
        },
      ],
    };
  }

  if (country === "US") {
    return {
      title: "US KYC Verification",
      description:
        "Submit your US business documents for compliance with federal and state regulations.",
      fields: [
        {
          key: "einNumber",
          label: "EIN (Employer Identification Number)",
          placeholder: "12-3456789",
          type: "text",
          required: true,
          helpText: "Federal Tax Identification Number",
        },
        {
          key: "stateLicense",
          label: "State Business License Number",
          placeholder: "State-specific license",
          type: "text",
          required: false,
        },
        {
          key: "businessLicense",
          label: "Business License Document",
          placeholder: "Upload business license",
          type: "document",
          required: true,
        },
        {
          key: "ftcCompliance",
          label: "FTC Compliance Documentation",
          placeholder: "Upload FTC jewellery guides compliance",
          type: "document",
          required: false,
          helpText: "FTC Guides for Jewelry, Precious Metals, and Pewter",
        },
      ],
    };
  }

  if (country === "AE") {
    return {
      title: "UAE KYC Verification",
      description:
        "Submit your UAE business verification documents including trade license.",
      fields: [
        {
          key: "tradeLicenseNumber",
          label: "Trade License Number",
          placeholder: "DED-XXXXXX",
          type: "text",
          required: true,
          helpText: "DED (Department of Economic Development) Trade License",
        },
        {
          key: "tradeLicense",
          label: "Trade License Document",
          placeholder: "Upload trade license",
          type: "document",
          required: true,
        },
        {
          key: "vatNumber",
          label: "TRN (Tax Registration Number)",
          placeholder: "100XXXXXXXXX",
          type: "text",
          required: false,
          helpText: "15-digit Tax Registration Number for VAT",
        },
        {
          key: "emiratesId",
          label: "Emirates ID (Owner)",
          placeholder: "Upload Emirates ID",
          type: "document",
          required: true,
        },
        {
          key: "dmccCertificate",
          label: "DMCC/Gold Souk Registration",
          placeholder: "Upload DMCC certificate",
          type: "document",
          required: false,
          helpText: "Dubai Multi Commodities Centre registration if applicable",
        },
      ],
    };
  }

  if (EU_COUNTRIES.includes(country)) {
    return {
      title: "EU KYC Verification",
      description:
        "Submit your EU business documents. VAT ID and hallmark registration are key for precious metals trade.",
      fields: [
        {
          key: "vatNumber",
          label: "EU VAT ID Number",
          placeholder: `${country}XXXXXXXXX`,
          type: "text",
          required: true,
          helpText: "Intra-community VAT identification number",
        },
        {
          key: "businessRegistration",
          label: "Business Registration Number",
          placeholder: "National registration number",
          type: "text",
          required: true,
        },
        {
          key: "businessCertificate",
          label: "Business Registration Certificate",
          placeholder: "Upload registration certificate",
          type: "document",
          required: true,
        },
        {
          key: "hallmarkRegistration",
          label: "EU Hallmark Registration",
          placeholder: "Convention hallmark number",
          type: "text",
          required: false,
          helpText: "Hallmarking Convention registration for precious metals",
        },
      ],
    };
  }

  // Generic fallback
  return {
    title: "Business Verification",
    description:
      "Submit your business verification documents for platform compliance.",
    fields: [
      {
        key: "businessRegistration",
        label: "Business Registration Number",
        placeholder: "Your registration number",
        type: "text",
        required: true,
      },
      {
        key: "taxId",
        label: "Tax Identification Number",
        placeholder: "Your tax ID",
        type: "text",
        required: false,
      },
      {
        key: "businessCertificate",
        label: "Business Registration Certificate",
        placeholder: "Upload certificate",
        type: "document",
        required: true,
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════
 *  PAGE COMPONENT
 * ═══════════════════════════════════════════════════════ */

export default function ShopEngagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [rfqFunnel, setRfqFunnel] = useState<RfqFunnel | null>(null);
  const [tierDashboard, setTierDashboard] = useState<TierDashboard | null>(
    null,
  );
  const [selectedViewTier, setSelectedViewTier] = useState<string | null>(null);
  const [tierLoading, setTierLoading] = useState(false);

  // KYC state
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [kycSaving, setKycSaving] = useState(false);
  const [kycForm, setKycForm] = useState<Record<string, string>>({});

  // Explainer toggle
  const [showExplainer, setShowExplainer] = useState(false);

  // Image upload for KYC documents
  const {
    uploading: kycUploading,
    progress: kycUploadProgress,
    upload: uploadKycDoc,
  } = useImageUpload({
    type: "kyc",
    onSuccess: () => {},
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err,
      }),
  });

  useEffect(() => {
    if (user?.shop?.id) {
      loadAll();
    }
  }, [user?.shop?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        sellerPerformanceApi.getHealthScore(),
        sellerPerformanceApi.getOnboarding(),
        sellerPerformanceApi.getMilestones(),
        sellerPerformanceApi.getRfqFunnel(),
        shopsApi.getKyc(),
      ]);

      // Extract fulfilled values, null for rejected
      const getValue = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? r.value : null;

      const hs = results[0].status === "fulfilled" ? results[0].value : null;
      const ob = results[1].status === "fulfilled" ? results[1].value : null;
      const ms = results[2].status === "fulfilled" ? results[2].value : null;
      const rf = results[3].status === "fulfilled" ? results[3].value : null;
      const kyc = results[4].status === "fulfilled" ? results[4].value : null;

      if (hs?.data) setHealthScore(hs.data);
      if (ob?.data) setOnboarding(ob.data);
      if (ms?.data) setMilestones(ms.data);
      if (rf?.data) setRfqFunnel(rf.data);
      if (kyc?.data) {
        setKycData(kyc.data);

        // Pre-fill KYC text fields
        const k = kyc.data;
        const docs = (k.verificationDocuments as Record<string, any>) || {};
        setKycForm({
          panNumber: k.panNumber || "",
          vatNumber: k.vatNumber || "",
          bisLicenseNumber: k.bisLicenseNumber || "",
          ...Object.fromEntries(
            Object.entries(docs).filter(
              ([, v]) => typeof v === "string" && !v.startsWith("http"),
            ),
          ),
        });
      }

      // Log any failed calls for debugging
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const labels = [
            "healthScore",
            "onboarding",
            "milestones",
            "rfqFunnel",
            "kyc",
          ];
          console.warn(
            `Engagement: ${labels[i]} failed:`,
            r.reason?.message || r.reason,
          );
        }
      });

      // Load tier dashboard
      loadTierDashboard();
    } catch (error) {
      console.error("Failed to load engagement data:", error);
      toast({
        variant: "destructive",
        title: "Failed to load engagement data",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTierDashboard = async (targetTier?: string) => {
    setTierLoading(true);
    try {
      const response = await sellerPerformanceApi.getMyDashboard(targetTier);
      setTierDashboard(response.data);
    } catch (error) {
      console.error("Failed to load tier:", error);
    } finally {
      setTierLoading(false);
    }
  };

  const handleKycDocUpload = async (fieldKey: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const result = await uploadKycDoc(file);
      if (result.success && result.url) {
        setKycForm((prev) => ({ ...prev, [fieldKey]: result.url! }));
        toast({ title: "Document uploaded" });
      }
    };
    input.click();
  };

  const saveKyc = async () => {
    if (!kycData) return;
    setKycSaving(true);
    try {
      const docs: Record<string, any> = {
        ...(kycData.verificationDocuments || {}),
      };
      const textFields: Record<string, string | undefined> = {};

      // Separate text fields from document URLs
      for (const [key, value] of Object.entries(kycForm)) {
        if (
          key === "panNumber" ||
          key === "vatNumber" ||
          key === "bisLicenseNumber"
        ) {
          textFields[key] = value || undefined;
        } else if (
          [
            "einNumber",
            "tradeLicenseNumber",
            "companiesHouseNumber",
            "businessRegistration",
            "hallmarkRegistration",
            "stateLicense",
          ].includes(key)
        ) {
          docs[key] = value;
        } else if (
          value &&
          (value.startsWith("http") || value.startsWith("data:"))
        ) {
          docs[key] = value;
        } else if (value) {
          docs[key] = value;
        }
      }

      const res = await shopsApi.updateKyc({
        ...textFields,
        verificationDocuments: docs,
      });
      setKycData(res.data);
      toast({ title: "KYC details saved successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save KYC",
        description: error.response?.data?.message || "Please try again",
      });
    } finally {
      setKycSaving(false);
    }
  };

  if (loading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  const achievedCount = milestones.filter((m) => m.achieved).length;
  const totalMilestones = milestones.length;
  const shopCountry = kycData?.country || "NP";
  const kycConfig = getKycFieldsForCountry(shopCountry);

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 p-6">
          {/* ═══ HEADER ═══ */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6" /> Engagement & Growth
            </h1>
            <p className="text-muted-foreground">
              Track your shop&apos;s performance, tiers, milestones, and
              verification
            </p>
          </div>

          {/* ═══ HOW IT WORKS EXPLAINER ═══ */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-4">
              <button
                onClick={() => setShowExplainer(!showExplainer)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    How Engagement & Tiers Work
                  </span>
                </div>
                {showExplainer ? (
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                )}
              </button>

              {showExplainer && (
                <div className="mt-4 space-y-4 text-sm text-blue-900">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold flex items-center gap-1 mb-1">
                        <Heart className="h-4 w-4" /> Health Score
                      </h4>
                      <p>
                        Your shop health score (0-100) measures profile
                        completeness, performance metrics, verification status,
                        capabilities setup, and engagement activity. A higher
                        score means better visibility to customers.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold flex items-center gap-1 mb-1">
                        <Trophy className="h-4 w-4" /> Milestones
                      </h4>
                      <p>
                        Achieve milestones by completing orders, earning
                        revenue, getting positive reviews, and staying active.
                        Milestones contribute to your overall shop reputation.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-1 mb-2">
                      <TrendingUp className="h-4 w-4" /> Tier System
                    </h4>
                    <p className="mb-2">
                      Your seller tier determines your making charge cap and
                      marketplace visibility. Progress through tiers by meeting
                      performance criteria:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(["STANDARD", "SILVER", "GOLD", "ELITE"] as const).map(
                        (t) => {
                          const m = TIER_META[t];
                          return (
                            <div
                              key={t}
                              className={`p-2 rounded-lg border ${m.border} ${m.bg}`}
                            >
                              <p className={`font-semibold text-xs ${m.color}`}>
                                {m.label}
                              </p>
                              <ul className="text-[11px] mt-1 space-y-0.5 text-gray-700">
                                {m.benefits.map((b) => (
                                  <li key={b}>• {b}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-100/50 rounded p-2 text-xs">
                    <Info className="h-3 w-3 inline mr-1" />
                    <strong>Tip:</strong> Complete your KYC verification,
                    maintain a low cancellation rate, and respond to RFQs
                    quickly to climb tiers faster. Making charge settings can be
                    adjusted in{" "}
                    <Link
                      href="/dashboard/shop/settings?tab=preferences"
                      className="underline font-medium"
                    >
                      Shop Settings
                    </Link>
                    .
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ HEALTH SCORE HERO ═══ */}
          {healthScore && (
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center ${gradeColor[healthScore.grade]}`}
                    >
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {healthScore.totalScore}
                        </p>
                        <p className="text-xs font-medium">/100</p>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Heart className="h-5 w-5" /> Shop Health Score
                      </h2>
                      <p className="text-muted-foreground">
                        Grade:{" "}
                        <span className="font-bold">{healthScore.grade}</span> —{" "}
                        {gradeLabel[healthScore.grade] || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    {
                      label: "Profile",
                      icon: Shield,
                      ...healthScore.profileCompleteness,
                    },
                    {
                      label: "Performance",
                      icon: TrendingUp,
                      ...healthScore.performanceMetrics,
                    },
                    {
                      label: "Verification",
                      icon: CheckCircle,
                      ...healthScore.verificationStatus,
                    },
                    {
                      label: "Capabilities",
                      icon: Zap,
                      ...healthScore.capabilitySetup,
                    },
                    {
                      label: "Engagement",
                      icon: Activity,
                      ...healthScore.engagementActivity,
                    },
                  ].map((item: any) => {
                    const Icon = item.icon;
                    const pct = (item.score / item.max) * 100;
                    return (
                      <div
                        key={item.label}
                        className="text-center p-3 rounded-lg bg-muted/50"
                      >
                        <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.label}
                        </p>
                        <p className="font-bold">
                          {item.score}
                          <span className="text-xs text-muted-foreground">
                            /{item.max}
                          </span>
                        </p>
                        <Progress value={pct} className="h-1.5 mt-1" />
                        {item.missing && item.missing.length > 0 && (
                          <p className="text-[10px] text-orange-500 mt-1">
                            Missing: {item.missing.slice(0, 2).join(", ")}
                            {item.missing.length > 2 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ TIER ROADMAP SECTION ═══ */}
          {tierDashboard && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Seller Tier & Progression
                </CardTitle>
                <CardDescription>
                  Your tier determines making charge caps and marketplace
                  visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Tier Banner */}
                {(() => {
                  const currentTier =
                    tierDashboard.shop?.sellerTier || "STANDARD";
                  const meta = TIER_META[currentTier] || TIER_META.STANDARD;
                  const TierIcon = meta.icon;
                  const cap = tierDashboard.shop?.makingChargeCap;
                  return (
                    <div
                      className={`rounded-lg border-2 ${meta.border} bg-gradient-to-r ${meta.gradient} p-4`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${meta.bg}`}>
                            <TierIcon className={`h-6 w-6 ${meta.color}`} />
                          </div>
                          <div>
                            <p className={`font-bold text-lg ${meta.color}`}>
                              {meta.label} Tier
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {currentTier === "ELITE"
                                ? "No cap on making charge!"
                                : cap != null
                                  ? `Making charge cap: up to ${cap}%`
                                  : "Complete milestones to unlock higher tiers"}
                            </p>
                          </div>
                        </div>
                        <Link href="/dashboard/shop/settings?tab=preferences">
                          <Button variant="outline" size="sm" className="gap-1">
                            <Settings className="h-3.5 w-3.5" />
                            Set Making Charge
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })()}

                {/* Tier Roadmap Row */}
                <div className="rounded-lg border p-3 bg-muted/30">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Tier Roadmap — click to view requirements
                  </h5>
                  <div className="flex items-center gap-1">
                    {(["STANDARD", "SILVER", "GOLD", "ELITE"] as const).map(
                      (t, i) => {
                        const m = TIER_META[t];
                        const currentTierIdx = [
                          "STANDARD",
                          "SILVER",
                          "GOLD",
                          "ELITE",
                        ].indexOf(tierDashboard.shop?.sellerTier || "STANDARD");
                        const isCurrentOrPast = currentTierIdx >= i;
                        const viewingTier =
                          tierDashboard.viewingTier || tierDashboard.nextTier;
                        const isViewing = viewingTier === t;
                        return (
                          <div
                            key={t}
                            className="flex items-center gap-1 flex-1"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedViewTier(t);
                                loadTierDashboard(t);
                              }}
                              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium flex-1 justify-center transition-all cursor-pointer ${
                                isViewing
                                  ? `${m.bg} ${m.color} border-2 ${m.border} ring-2 ring-primary/30 shadow-sm`
                                  : isCurrentOrPast
                                    ? `${m.bg} ${m.color} border ${m.border} hover:shadow-sm`
                                    : "bg-muted text-muted-foreground border border-muted hover:bg-muted/50"
                              }`}
                            >
                              {React.createElement(m.icon, {
                                className: "h-3 w-3",
                              })}
                              <span className="hidden sm:inline">
                                {m.label}
                              </span>
                            </button>
                            {i < 3 && (
                              <div
                                className={`h-px w-2 ${isCurrentOrPast ? "bg-primary" : "bg-muted-foreground/30"}`}
                              />
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Progress for viewed tier */}
                {tierDashboard.viewingTier && (
                  <div className="space-y-3">
                    {(() => {
                      const viewTier = tierDashboard.viewingTier!;
                      const viewMeta =
                        TIER_META[viewTier] || TIER_META.STANDARD;
                      const currentTierIdx = [
                        "STANDARD",
                        "SILVER",
                        "GOLD",
                        "ELITE",
                      ].indexOf(tierDashboard.shop?.sellerTier || "STANDARD");
                      const viewIdx = [
                        "STANDARD",
                        "SILVER",
                        "GOLD",
                        "ELITE",
                      ].indexOf(viewTier);
                      const isAlreadyAchieved = currentTierIdx >= viewIdx;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <h5
                              className={`text-sm font-semibold flex items-center gap-1.5 ${viewMeta.color}`}
                            >
                              {React.createElement(viewMeta.icon, {
                                className: "h-4 w-4",
                              })}
                              {isAlreadyAchieved
                                ? `${viewMeta.label} Tier — Achieved!`
                                : `Requirements for ${viewMeta.label}`}
                            </h5>
                            <span className="text-sm font-bold text-primary">
                              {tierDashboard.overallProgress.percentage}%
                            </span>
                          </div>
                          <Progress
                            value={tierDashboard.overallProgress.percentage}
                            className="h-2"
                          />
                          <div className="grid gap-2">
                            {Object.entries(tierDashboard.tierProgress).map(
                              ([key, criterion]) => {
                                const cMeta = CRITERIA_LABELS[key];
                                if (!cMeta) return null;
                                const isBool =
                                  typeof criterion.required === "boolean";
                                return (
                                  <div
                                    key={key}
                                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${
                                      criterion.met
                                        ? "bg-green-50 border-green-200"
                                        : "bg-amber-50 border-amber-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {criterion.met ? (
                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                      )}
                                      <span>{cMeta.label}</span>
                                    </div>
                                    <span className="font-mono text-xs">
                                      {isBool ? (
                                        criterion.current ? (
                                          "Yes"
                                        ) : (
                                          "No"
                                        )
                                      ) : cMeta.lowerIsBetter ? (
                                        <>
                                          {Number(criterion.current).toFixed(1)}
                                          {cMeta.unit} / &le;{" "}
                                          {Number(criterion.required).toFixed(
                                            1,
                                          )}
                                          {cMeta.unit}
                                        </>
                                      ) : (
                                        <>
                                          {typeof criterion.current ===
                                            "number" &&
                                          criterion.current % 1 !== 0
                                            ? Number(criterion.current).toFixed(
                                                1,
                                              )
                                            : criterion.current}
                                          {cMeta.unit} /{" "}
                                          {typeof criterion.required ===
                                            "number" &&
                                          criterion.required % 1 !== 0
                                            ? Number(
                                                criterion.required,
                                              ).toFixed(1)
                                            : criterion.required}
                                          {cMeta.unit}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══ TABS ═══ */}
          <Tabs defaultValue="milestones" className="w-full">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="milestones" className="gap-1">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Milestones</span>
              </TabsTrigger>
              <TabsTrigger value="rfq" className="gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">RFQ Funnel</span>
              </TabsTrigger>
              <TabsTrigger value="kyc" className="gap-1">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">KYC</span>
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="gap-1">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Onboarding</span>
              </TabsTrigger>
            </TabsList>

            {/* ═══ MILESTONES TAB ═══ */}
            <TabsContent value="milestones" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4 inline mr-1" />
                  {achievedCount} of {totalMilestones} milestones achieved
                </p>
                <Progress
                  value={
                    totalMilestones > 0
                      ? (achievedCount / totalMilestones) * 100
                      : 0
                  }
                  className="w-32 h-2"
                />
              </div>

              {["orders", "revenue", "ratings", "engagement", "tenure"].map(
                (cat) => {
                  const catMilestones = milestones.filter(
                    (m) => m.category === cat,
                  );
                  if (catMilestones.length === 0) return null;
                  const CategoryIcon = categoryIcons[cat] || Trophy;
                  return (
                    <div key={cat}>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 capitalize">
                        <CategoryIcon className="h-4 w-4" /> {cat}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catMilestones.map((m) => (
                          <Card
                            key={m.id}
                            className={`transition-all ${m.achieved ? "border-green-200 bg-green-50/30 shadow-sm" : "opacity-80"}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <span className="text-3xl">{m.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm truncate">
                                      {m.title}
                                    </h4>
                                    {m.achieved && (
                                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {m.description}
                                  </p>
                                  {!m.achieved && (
                                    <div className="mt-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span>
                                          {typeof m.current === "number" &&
                                          m.current > 1000
                                            ? `${(m.current / 1000).toFixed(1)}k`
                                            : m.current}
                                        </span>
                                        <span className="text-muted-foreground">
                                          /{" "}
                                          {m.target > 1000
                                            ? `${(m.target / 1000).toFixed(0)}k`
                                            : m.target}
                                        </span>
                                      </div>
                                      <Progress
                                        value={m.progress}
                                        className="h-1.5"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </TabsContent>

            {/* ═══ RFQ FUNNEL TAB ═══ */}
            <TabsContent value="rfq" className="space-y-4 mt-4">
              {rfqFunnel && rfqFunnel.totalTargeted > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      {
                        icon: Target,
                        color: "text-blue-500",
                        value: rfqFunnel.totalTargeted,
                        label: "RFQs Received",
                      },
                      {
                        icon: Eye,
                        color: "text-indigo-500",
                        value: rfqFunnel.viewed,
                        label: `Viewed (${rfqFunnel.viewRate}%)`,
                      },
                      {
                        icon: MessageSquare,
                        color: "text-green-500",
                        value: rfqFunnel.responded,
                        label: `Responded (${rfqFunnel.responseRate}%)`,
                      },
                      {
                        icon: Activity,
                        color: "text-orange-500",
                        value: rfqFunnel.avgResponseTimeHours
                          ? `${rfqFunnel.avgResponseTimeHours}h`
                          : "N/A",
                        label: "Avg Response Time",
                      },
                      {
                        icon: TrendingUp,
                        color: "text-purple-500",
                        value: `${rfqFunnel.responseRate}%`,
                        label: "Response Rate",
                      },
                    ].map((stat) => {
                      const StatIcon = stat.icon;
                      return (
                        <Card key={stat.label}>
                          <CardContent className="p-4 text-center">
                            <StatIcon
                              className={`h-5 w-5 mx-auto mb-1 ${stat.color}`}
                            />
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">
                              {stat.label}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Conversion Funnel
                      </CardTitle>
                      <CardDescription>
                        From RFQ received to response
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          {
                            label: "Targeted",
                            value: rfqFunnel.totalTargeted,
                            color: "bg-blue-500",
                          },
                          {
                            label: "Viewed",
                            value: rfqFunnel.viewed,
                            color: "bg-indigo-500",
                          },
                          {
                            label: "Responded",
                            value: rfqFunnel.responded,
                            color: "bg-green-500",
                          },
                        ].map((step) => {
                          const pct =
                            rfqFunnel.totalTargeted > 0
                              ? (step.value / rfqFunnel.totalTargeted) * 100
                              : 0;
                          return (
                            <div key={step.label}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>{step.label}</span>
                                <span className="font-bold">
                                  {step.value} ({Math.round(pct)}%)
                                </span>
                              </div>
                              <div className="h-6 bg-muted rounded-md overflow-hidden">
                                <div
                                  className={`h-full ${step.color} rounded-md transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {rfqFunnel.periodBreakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Weekly Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {rfqFunnel.periodBreakdown.map((w) => (
                            <div
                              key={w.period}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="w-16 text-muted-foreground">
                                {w.period}
                              </span>
                              <div className="flex-1 flex items-center gap-2">
                                <Badge variant="outline">
                                  {w.targeted} sent
                                </Badge>
                                <Badge variant="secondary">
                                  {w.viewed} viewed
                                </Badge>
                                <Badge className="bg-green-100 text-green-800">
                                  {w.responded} responded
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium">No RFQ Data Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      When customers send you RFQ requests, your conversion
                      funnel data will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ═══ KYC & VERIFICATION TAB ═══ */}
            <TabsContent value="kyc" className="space-y-4 mt-4">
              {/* Country Banner */}
              <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
                <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">
                    Your shop country is set to{" "}
                    <strong>{COUNTRY_NAMES[shopCountry] || shopCountry}</strong>{" "}
                    — showing {COUNTRY_NAMES[shopCountry] || shopCountry} KYC
                    requirements.
                  </p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    To change your country preference, go to{" "}
                    <Link
                      href="/dashboard/shop/settings?tab=location"
                      className="underline font-medium"
                    >
                      Shop Settings → Location
                    </Link>
                    .
                  </p>
                </div>
                {kycData?.isVerified && (
                  <Badge className="bg-green-500 shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              {/* KYC Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    {kycConfig.title}
                  </CardTitle>
                  <CardDescription>{kycConfig.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {kycConfig.fields.map((field) => {
                    if (field.type === "text") {
                      // Use the correct state key mapping
                      const stateKey =
                        field.key === "panNumber" ||
                        field.key === "vatNumber" ||
                        field.key === "bisLicenseNumber"
                          ? field.key
                          : field.key;
                      return (
                        <div key={field.key} className="space-y-2">
                          <Label
                            htmlFor={field.key}
                            className="flex items-center gap-1"
                          >
                            {field.label}
                            {field.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          <Input
                            id={field.key}
                            value={kycForm[stateKey] || ""}
                            onChange={(e) =>
                              setKycForm((prev) => ({
                                ...prev,
                                [stateKey]: e.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                          />
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      );
                    }

                    // Document upload field
                    const docUrl =
                      kycForm[field.key] ||
                      (kycData?.verificationDocuments as any)?.[field.key];
                    return (
                      <div key={field.key} className="space-y-2">
                        <Label className="flex items-center gap-1">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500">*</span>
                          )}
                        </Label>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleKycDocUpload(field.key)}
                            disabled={kycUploading}
                            className="gap-1"
                          >
                            {kycUploading ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Uploading... {kycUploadProgress}%
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3" />
                                {docUrl ? "Replace" : "Upload"}
                              </>
                            )}
                          </Button>
                          {docUrl && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Document uploaded
                            </span>
                          )}
                        </div>
                        {field.helpText && (
                          <p className="text-xs text-muted-foreground">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Documents are stored securely and reviewed by our
                      verification team.
                    </p>
                    <Button
                      onClick={saveKyc}
                      disabled={kycSaving}
                      className="gap-1"
                    >
                      {kycSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4" />
                          Save KYC Details
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Verification Status */}
                  {kycData && !kycData.isVerified && (
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-700">
                        <p className="font-medium">Verification Pending</p>
                        <p>
                          Once you submit all required documents, our team will
                          review and verify your shop. Verified shops get
                          priority in seller matching and a verified badge on
                          their profile.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ ONBOARDING TAB ═══ */}
            <TabsContent value="onboarding" className="space-y-4 mt-4">
              {onboarding && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-bold">Setup Progress</h2>
                          <p className="text-sm text-muted-foreground">
                            {onboarding.completedCount} of{" "}
                            {onboarding.totalCount} steps completed
                          </p>
                        </div>
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            onboarding.percentage >= 80
                              ? "bg-green-50 text-green-600"
                              : onboarding.percentage >= 50
                                ? "bg-yellow-50 text-yellow-600"
                                : "bg-red-50 text-red-600"
                          }`}
                        >
                          <span className="text-xl font-bold">
                            {onboarding.percentage}%
                          </span>
                        </div>
                      </div>
                      <Progress value={onboarding.percentage} className="h-3" />
                    </CardContent>
                  </Card>

                  {Object.entries(onboarding.categories).map(([cat, data]) => {
                    const catData = data as {
                      completed: number;
                      total: number;
                    };
                    const catComplete = catData.completed === catData.total;
                    return (
                      <Card
                        key={cat}
                        className={catComplete ? "border-green-200" : ""}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {catComplete && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {cat}
                            </CardTitle>
                            <Badge
                              variant={catComplete ? "default" : "secondary"}
                            >
                              {catData.completed}/{catData.total}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {onboarding.steps
                              .filter((s) => s.category === cat)
                              .map((step) => (
                                <div
                                  key={step.key}
                                  className={`flex items-center gap-3 p-2 rounded-md text-sm ${
                                    step.completed
                                      ? "bg-green-50/50"
                                      : "bg-muted/30"
                                  }`}
                                >
                                  {step.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                                  )}
                                  <span
                                    className={
                                      step.completed
                                        ? "text-muted-foreground"
                                        : "font-medium"
                                    }
                                  >
                                    {step.label}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
