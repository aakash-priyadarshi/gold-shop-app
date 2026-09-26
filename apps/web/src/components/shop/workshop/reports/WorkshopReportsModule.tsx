"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi, type WorkshopReportsResponse } from "@/lib/workshop-api";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Coins,
  Cpu,
  Flame,
  History,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { WorkshopDomainTooltip } from "../shared/WorkshopDomainTooltip";

export function WorkshopReportsModule() {
  const t = useT();
  const [reports, setReports] = useState<WorkshopReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "STOCK" | "PROCESS_VAR" | "TRANSFER_VAR" | "RECOVERY" | "SCALE_AUDIT" | "CORRECTIONS" | "FINISHED"
  >("STOCK");
  const [filterSearch, setFilterSearch] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workshopApi.reports();
      setReports(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <T>Compiling factory management reports…</T>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="rounded-xl border p-8 text-center text-xs text-muted-foreground">
        <T>Could not load reports. Ensure Workshop Mode and Traceable Ledger are active.</T>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" data-tour="workshop-reports-filters">
          <div className="flex rounded-lg border bg-muted/40 p-1 text-xs">
            {[
              { id: "STOCK", label: "Material Stock", icon: Coins },
              { id: "PROCESS_VAR", label: "Process Variance", icon: Activity },
              { id: "TRANSFER_VAR", label: "Transfer Variance", icon: Truck },
              { id: "RECOVERY", label: "Recovery", icon: Flame },
              { id: "SCALE_AUDIT", label: "Scale Audit", icon: Scale },
              { id: "CORRECTIONS", label: "Corrections", icon: History },
              { id: "FINISHED", label: "Finished Goods", icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <T>{tab.label}</T>
                </button>
              );
            })}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadReports} className="text-xs h-8">
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          <T>Refresh</T>
        </Button>
      </div>

      <div data-tour="workshop-reports-results" className="space-y-4">
      {/* 1. Material Stock Section */}
      {activeTab === "STOCK" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              <T>Traceable Material Stock Position</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Double-entry account balances grouped across physical buckets</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4"><T>Material</T></th>
                    <th className="py-3 px-3"><T>Bucket</T></th>
                    <th className="py-3 px-3"><T>Scope / Reference</T></th>
                    <th className="py-3 px-3"><T>Purity</T></th>
                    <th className="py-3 px-4 text-right"><T>Authoritative Balance</T></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {reports.materialStock.map((st, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-semibold text-foreground font-sans">
                        {st.materialKey === "goldGrains995" ? <T>Gold 995</T> : st.materialKey}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px]"><T>{st.bucket}</T></Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{st.scopeId || <T>Shop / Global</T>}</td>
                      <td className="py-3 px-3 text-muted-foreground">{st.purity || "—"}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {parseFloat(st.balanceGrams).toFixed(4)} g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Process Variance Section */}
      {activeTab === "PROCESS_VAR" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <T>Supervisor-Approved Process Variances</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Manufacturing losses and unrecovered process differences audited by supervisors</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reports.processVariance.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <T>No classified process variances on record.</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4"><T>Record ID</T></th>
                      <th className="py-3 px-3"><T>Material</T></th>
                      <th className="py-3 px-3"><T>Variance Grams</T></th>
                      <th className="py-3 px-3"><T>Classified At</T></th>
                      <th className="py-3 px-4"><T>Supervisor / Approver</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {reports.processVariance.map((pv) => (
                      <tr key={pv.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">#{pv.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 text-foreground font-sans">{pv.materialKey}</td>
                        <td className="py-3 px-3 font-bold text-rose-600">
                          {parseFloat(pv.weightGrams).toFixed(4)} g
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(pv.classifiedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans text-muted-foreground">{pv.approverUserId || <T>System / Supervisor</T>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Transfer Variance Section */}
      {activeTab === "TRANSFER_VAR" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-500" />
              <T>Inter-Department Transfer Variance Audit</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Dispatch vs receiving weights between factory departments</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reports.transferVariance.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <T>No transfer records found.</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4"><T>Transfer #</T></th>
                      <th className="py-3 px-3"><T>Route</T></th>
                      <th className="py-3 px-3"><T>Dispatch (g)</T></th>
                      <th className="py-3 px-3"><T>Receive (g)</T></th>
                      <th className="py-3 px-3"><T>Difference (g)</T></th>
                      <th className="py-3 px-3"><T>Status</T></th>
                      <th className="py-3 px-4"><T>Notes</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {reports.transferVariance.map((tv) => (
                      <tr key={tv.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">#{tv.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 font-sans">
                          {tv.fromDepartment} → {tv.toDepartment}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {tv.dispatchGrams ? parseFloat(tv.dispatchGrams).toFixed(3) : "—"}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {tv.receiveGrams ? parseFloat(tv.receiveGrams).toFixed(3) : "—"}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          {tv.differenceGrams ? parseFloat(tv.differenceGrams).toFixed(3) : "—"}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <Badge variant="outline" className="text-[10px]"><T>{tv.status}</T></Badge>
                        </td>
                        <td className="py-3 px-4 font-sans text-muted-foreground text-[11px]">
                          {tv.exceptionReason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Scale Audit Section */}
      {activeTab === "SCALE_AUDIT" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-amber-500" />
              <T>Authoritative Scale Reading Audit Trail</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Raw hardware frames, stability status, sequence counters, and journal linkages</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reports.scaleAudit.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <T>No scale readings captured yet.</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4"><T>Scale Reading ID</T></th>
                      <th className="py-3 px-3"><T>Device</T></th>
                      <th className="py-3 px-3"><T>Captured Weight</T></th>
                      <th className="py-3 px-3"><T>Raw ASCII Frame</T></th>
                      <th className="py-3 px-3"><T>Stability</T></th>
                      <th className="py-3 px-3"><T>Linked Journal</T></th>
                      <th className="py-3 px-4"><T>Captured At</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {reports.scaleAudit.map((sa) => (
                      <tr key={sa.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">#{sa.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 font-sans text-muted-foreground">{sa.deviceName} (<T>{sa.adapterKind}</T>)</td>
                        <td className="py-3 px-3 font-bold text-foreground">{parseFloat(sa.weightGrams).toFixed(3)} g</td>
                        <td className="py-3 px-3 text-[11px] text-muted-foreground/80 truncate max-w-xs">{sa.rawFrame}</td>
                        <td className="py-3 px-3">
                          <Badge variant={sa.stable ? "default" : "destructive"} className="text-[10px]">
                            <T>{sa.stable ? "STABLE" : "UNSTABLE"}</T>
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          {sa.journalId ? (
                            <Badge variant="outline" className="text-[10px]">
                              <T>{sa.referenceType || "JOURNAL"}</T> #{sa.journalId.slice(0, 6)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic"><T>Unposted session</T></span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{new Date(sa.capturedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Corrections & Overrides Section */}
      {activeTab === "CORRECTIONS" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-rose-500" />
              <T>Journal Corrections & Manual Overrides History</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Complete audit trail of reversals, replacements, and exceptional manual overrides</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reports.correctionHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <T>No manual overrides or corrected transactions recorded.</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4"><T>Entry #</T></th>
                      <th className="py-3 px-3"><T>Type</T></th>
                      <th className="py-3 px-3"><T>Weight (g)</T></th>
                      <th className="py-3 px-3"><T>Material</T></th>
                      <th className="py-3 px-3"><T>Lineage</T></th>
                      <th className="py-3 px-4"><T>Posted At</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {reports.correctionHistory.map((ch) => (
                      <tr key={ch.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">#{ch.entryNumber}</td>
                        <td className="py-3 px-3 font-sans">
                          <Badge variant="outline" className="text-[10px]"><T>{ch.referenceType}</T></Badge>
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">{parseFloat(ch.weightGrams).toFixed(4)} g</td>
                        <td className="py-3 px-3 text-muted-foreground">{ch.materialKey}</td>
                        <td className="py-3 px-3 font-sans text-muted-foreground text-[11px]">
                          {ch.reversalOfId ? (
                            <span><T>Reversal of #</T>{ch.reversalOfId.slice(0, 6)}</span>
                          ) : ch.replacementForId ? (
                            <span><T>Replacement for #</T>{ch.replacementForId.slice(0, 6)}</span>
                          ) : (
                            <span><T>Original Entry</T></span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{new Date(ch.postedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Finished Goods Section */}
      {activeTab === "FINISHED" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" />
              <T>Manufactured Finished Goods Catalog Stock</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Active inventory items created from verified workshop finished scale receipts</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reports.finishedGoods.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <T>No finished goods received from the factory floor yet.</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4"><T>Item Name</T></th>
                      <th className="py-3 px-3"><T>SKU</T></th>
                      <th className="py-3 px-3"><T>Gross Weight (g)</T></th>
                      <th className="py-3 px-3"><T>Visibility</T></th>
                      <th className="py-3 px-4"><T>Receipt Journal</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {reports.finishedGoods.map((fg) => (
                      <tr key={fg.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground font-sans">{fg.nameEn}</td>
                        <td className="py-3 px-3 text-muted-foreground">{fg.sku}</td>
                        <td className="py-3 px-3 font-bold text-foreground">{fg.totalWeightGrams.toFixed(3)} g</td>
                        <td className="py-3 px-3 font-sans">
                          <Badge variant="outline" className="text-[10px]"><T>{fg.visibility}</T></Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {fg.workshopReceiptJournalId ? `#${fg.workshopReceiptJournalId.slice(0, 8)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Recovery Summary Section */}
      {activeTab === "RECOVERY" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <T>Recovery Residue & Refinery Yield Analytics</T>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {reports.recovery.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <T>No recovery containers on record.</T>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4"><T>Bag Code</T></th>
                      <th className="py-3 px-3"><T>Material</T></th>
                      <th className="py-3 px-3"><T>Expected Balance</T></th>
                      <th className="py-3 px-3"><T>Status</T></th>
                      <th className="py-3 px-4"><T>Refinery Events</T></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {reports.recovery.map((rb) => (
                      <tr key={rb.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-foreground">{rb.code}</td>
                        <td className="py-3 px-3 text-muted-foreground font-sans">{rb.materialKey}</td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          {parseFloat(rb.expectedBalanceGrams).toFixed(3)} g
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <Badge variant="outline" className="text-[10px]"><T>{rb.status}</T></Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {rb.events?.length || 0} <T>event(s)</T>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
