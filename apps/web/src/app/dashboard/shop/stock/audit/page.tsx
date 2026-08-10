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
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { toast } from "@/hooks/use-toast";
import { inventoryApi, shopsApi } from "@/lib/api";
import { ManagerPinDialog } from "@/components/shop/ManagerPinDialog";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Play,
  Radio,
  ScanBarcode,
  StopCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AuditScan = {
  id: string;
  code: string;
  matched: boolean;
  scannedAt: string;
  inventoryItem?: {
    id: string;
    sku: string;
    nameEn: string;
    hallmarkNumber?: string | null;
    status: string;
  } | null;
};

type StockAudit = {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  notes?: string | null;
  summary?: {
    expectedCount: number;
    scannedUnique: number;
    matchedCount: number;
    missingCount: number;
    unmatchedScans: number;
    missingItems?: Array<{ id: string; sku: string; nameEn: string }>;
  } | null;
  scans?: AuditScan[];
};

export default function StockAuditPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <StockAuditContent />
      </DashboardLayout>
    </ShopGuard>
  );
}

function StockAuditContent() {
  const { user } = useAuth();
  const t = useT();
  const shopId = user?.shop?.id;
  const [audit, setAudit] = useState<StockAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"complete" | null>(null);

  const refresh = useCallback(
    async (auditId: string) => {
      if (!shopId) return;
      const res = await inventoryApi.getStockAudit(shopId, auditId);
      setAudit(res.data?.data ?? res.data);
    },
    [shopId],
  );

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      try {
        const res = await inventoryApi.listStockAudits(shopId);
        const list = res.data?.data ?? res.data ?? [];
        const active = Array.isArray(list)
          ? list.find((a: StockAudit) => a.status === "IN_PROGRESS")
          : null;
        if (active) await refresh(active.id);
      } catch {
        // ignore
      }
    })();
  }, [shopId, refresh]);

  const handleScan = useCallback(
    async (code: string) => {
      if (!shopId || !audit || audit.status !== "IN_PROGRESS") return;
      try {
        await inventoryApi.scanStockAudit(shopId, audit.id, code);
        await refresh(audit.id);
        toast({ title: t("Scanned"), description: code });
      } catch (e: any) {
        toast({
          title: t("Scan failed"),
          description: e?.response?.data?.message || String(e),
          variant: "destructive",
        });
      }
    },
    [shopId, audit, refresh, t],
  );

  useBarcodeScanner(handleScan, {
    ignoreEditable: true,
    enabled: !!audit && audit.status === "IN_PROGRESS",
  });

  const startAudit = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await inventoryApi.startStockAudit(shopId, {
        notes: "RFID / barcode stock count",
      });
      setAudit(res.data?.data ?? res.data);
      toast({ title: t("Stock audit started") });
    } catch (e: any) {
      toast({
        title: t("Could not start audit"),
        description: e?.response?.data?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestComplete = async () => {
    const status = await shopsApi.getManagerPinStatus();
    const data = status.data?.data ?? status.data;
    if (data?.hasPin) {
      setPendingAction("complete");
      setPinOpen(true);
      return;
    }
    await doComplete();
  };

  const doComplete = async () => {
    if (!shopId || !audit) return;
    setLoading(true);
    try {
      const res = await inventoryApi.completeStockAudit(shopId, audit.id);
      setAudit(res.data?.data ?? res.data);
      toast({ title: t("Audit completed") });
    } catch (e: any) {
      toast({
        title: t("Complete failed"),
        description: e?.response?.data?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelAudit = async () => {
    if (!shopId || !audit) return;
    setLoading(true);
    try {
      await inventoryApi.cancelStockAudit(shopId, audit.id);
      setAudit(null);
      toast({ title: t("Audit cancelled") });
    } finally {
      setLoading(false);
    }
  };

  const scanCount = audit?.scans?.length ?? 0;
  const matched = audit?.scans?.filter((s) => s.matched).length ?? 0;

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/shop/stock">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <T>Back to stock</T>
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Radio className="h-6 w-6 text-amber-500" />
          <T>RFID / Barcode Stock Audit</T>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <T>
            Scan pieces with a keyboard-wedge RFID gun or barcode scanner.
            Complete the session to see missing stock (shrinkage report).
          </T>
        </p>
      </div>

      {!audit && (
        <Card>
          <CardHeader>
            <CardTitle>
              <T>Start a count</T>
            </CardTitle>
            <CardDescription>
              <T>
                Open an audit session, then scan every piece in the vault or
                showcase. Unscanned available items appear as missing when you
                finish.
              </T>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startAudit} disabled={loading || !shopId}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              <T>Start stock audit</T>
            </Button>
          </CardContent>
        </Card>
      )}

      {audit && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge
              variant={
                audit.status === "IN_PROGRESS"
                  ? "default"
                  : audit.status === "COMPLETED"
                    ? "secondary"
                    : "outline"
              }
            >
              {audit.status}
            </Badge>
            <span className="text-sm text-gray-500">
              <T>Scans</T>: {scanCount} · <T>Matched</T>: {matched}
            </span>
            {audit.status === "IN_PROGRESS" && (
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={cancelAudit}
                  disabled={loading}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  <T>Cancel</T>
                </Button>
                <Button onClick={requestComplete} disabled={loading}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <T>Complete audit</T>
                </Button>
              </div>
            )}
          </div>

          {audit.status === "IN_PROGRESS" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScanBarcode className="h-5 w-5" />
                  <T>Ready to scan</T>
                </CardTitle>
                <CardDescription>
                  <T>
                    Point your RFID/barcode scanner here, or type a SKU / HUID
                    and press Enter.
                  </T>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={t("SKU / HUID / barcode")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualCode.trim()) {
                      handleScan(manualCode.trim());
                      setManualCode("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (manualCode.trim()) {
                      handleScan(manualCode.trim());
                      setManualCode("");
                    }
                  }}
                >
                  <T>Add</T>
                </Button>
              </CardContent>
            </Card>
          )}

          {audit.status === "COMPLETED" && audit.summary && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <T>Shrinkage report</T>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-gray-500">
                      <T>Expected</T>
                    </div>
                    <div className="text-xl font-bold">
                      {audit.summary.expectedCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">
                      <T>Matched</T>
                    </div>
                    <div className="text-xl font-bold text-emerald-600">
                      {audit.summary.matchedCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">
                      <T>Missing</T>
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {audit.summary.missingCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">
                      <T>Unmatched scans</T>
                    </div>
                    <div className="text-xl font-bold">
                      {audit.summary.unmatchedScans}
                    </div>
                  </div>
                </div>
                {(audit.summary.missingItems?.length ?? 0) > 0 && (
                  <div>
                    <p className="font-medium mb-2">
                      <T>Missing items</T>
                    </p>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {audit.summary.missingItems!.map((m) => (
                        <li key={m.id} className="flex items-center gap-2">
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                          {m.sku} — {m.nameEn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button variant="outline" onClick={() => setAudit(null)}>
                  <T>Start another audit</T>
                </Button>
              </CardContent>
            </Card>
          )}

          {(audit.scans?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <T>Recent scans</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-80 overflow-y-auto text-sm">
                  {audit.scans!.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 py-2"
                    >
                      <span className="font-mono">{s.code}</span>
                      <span className="flex items-center gap-2">
                        {s.matched ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            {s.inventoryItem?.nameEn || s.inventoryItem?.sku}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-amber-500" />
                            <T>No match</T>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ManagerPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        title={t("Complete stock audit")}
        description={t(
          "Manager PIN required to finalize the audit and write the shrinkage report.",
        )}
        onVerified={async () => {
          setPinOpen(false);
          if (pendingAction === "complete") await doComplete();
          setPendingAction(null);
        }}
      />
    </div>
  );
}
