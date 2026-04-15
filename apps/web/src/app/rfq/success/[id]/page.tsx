"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { rfqApi } from "@/lib/api";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Gem,
  LayoutDashboard,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface RFQSummary {
  id: string;
  jewelleryType: string;
  buildMethod: string;
  budgetMinNpr: number | null;
  budgetMaxNpr: number | null;
  status: string;
  createdAt: string;
}

const JEWELRY_LABELS: Record<string, string> = {
  RING: "Ring",
  NECKLACE: "Necklace",
  BRACELET: "Bracelet",
  BANGLE: "Bangle",
  EARRING: "Earrings",
  PENDANT: "Pendant",
  CHAIN: "Chain",
  ANKLET: "Anklet",
  BROOCH: "Brooch",
  TIE_PIN: "Tie Pin",
  CUFFLINKS: "Cufflinks",
  NOSE_PIN: "Nose Pin",
  MANGALSUTRA: "Mangalsutra",
  MAANG_TIKKA: "Maang Tikka",
  OTHER: "Custom Jewellery",
};

export default function RfqSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [rfq, setRfq] = useState<RFQSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    rfqApi
      .getById(id)
      .then((res: any) => setRfq(res.data))
      .catch(() => {
        // still show success page even if fetch fails
        setRfq({ id, jewelleryType: "", buildMethod: "", budgetMinNpr: null, budgetMaxNpr: null, status: "SENT_TO_SHOPS", createdAt: new Date().toISOString() });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const jewelryLabel = rfq ? (JEWELRY_LABELS[rfq.jewelleryType] || rfq.jewelleryType || "Custom Jewellery") : "Custom Jewellery";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-gray-50 dark:from-green-950/20 dark:via-gray-950 dark:to-gray-950 flex items-start justify-center pt-12 pb-16 px-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Success Icon & Heading */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 ring-8 ring-green-50 dark:ring-green-900/20">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              <T>Request Submitted!</T>
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400 text-base">
              <T>Your custom jewellery request is now live. Sellers will review it and send you their best quotes.</T>
            </p>
          </div>
        </div>

        {/* Request Summary Card */}
        <Card className="border-green-200 dark:border-green-800/40 shadow-sm">
          <CardContent className="pt-6 pb-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Gem className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{jewelryLabel}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <T>Custom Request</T>
                    </p>
                  </div>
                  <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <T>Submitted</T>
                  </span>
                </div>

                <div className="border-t dark:border-gray-800 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400"><T>Request ID</T></span>
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {id}
                    </code>
                  </div>
                  {(rfq?.budgetMinNpr || rfq?.budgetMaxNpr) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400"><T>Budget</T></span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Rs. {(rfq.budgetMinNpr || 0).toLocaleString()} – Rs. {(rfq.budgetMaxNpr || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* What happens next */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <T>What happens next?</T>
          </p>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li><T>Verified sellers review your request</T></li>
            <li><T>You receive quotes within 24–48 hours</T></li>
            <li><T>Compare quotes and select the best offer</T></li>
            <li><T>Confirm your order and track progress</T></li>
          </ol>
        </div>

        {/* Primary CTAs */}
        <div className="space-y-3">
          <Link href={`/dashboard/customer/rfqs/${id}`} className="block">
            <Button className="w-full h-12 text-base bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400 font-semibold shadow-sm">
              <ArrowRight className="mr-2 h-5 w-5" />
              <T>Track this Request</T>
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/customer/rfqs" className="block">
              <Button variant="outline" className="w-full h-11">
                <ClipboardList className="mr-2 h-4 w-4" />
                <T>All my Requests</T>
              </Button>
            </Link>
            <Link href="/dashboard/customer" className="block">
              <Button variant="outline" className="w-full h-11">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <T>Go to Dashboard</T>
              </Button>
            </Link>
          </div>
        </div>

        {/* Create another */}
        <div className="text-center">
          <Link
            href="/rfq/create"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <T>Create another request</T>
          </Link>
        </div>

      </div>
    </div>
  );
}
