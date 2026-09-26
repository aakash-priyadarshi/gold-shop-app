"use client";

import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";

const tableClass = "w-full min-w-[36rem] text-left text-xs";
const cellClass = "border-b px-2 py-1.5 align-top";
const grams = (value: unknown) => value == null ? "—" : `${String(value)} g`;
const rows = (value: unknown): Array<Record<string, any>> => Array.isArray(value) ? value : [];
const keys = (value: unknown): string[] => value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];

function ReportTable({ headings, values }: { headings: string[]; values: Array<Array<unknown>> }) {
  return <div className="overflow-x-auto rounded border"><table className={tableClass}>
    <thead className="bg-muted/50"><tr>{headings.map((heading) => <th key={heading} className={cellClass}><T>{heading}</T></th>)}</tr></thead>
    <tbody>{values.map((value, index) => <tr key={index}>{value.map((cell, column) => <td key={column} className={cellClass}>{String(cell ?? "—")}</td>)}</tr>)}</tbody>
  </table></div>;
}

export function WorkshopReportView({ report }: { report: any }) {
  const t = useT();
  if (report?.treeId && report?.actualInputsByMaterial) {
    const materials = new Set([...keys(report.actualInputsByMaterial), ...keys(report.recommendedInputsByMaterial)]);
    const balances = Object.entries(report.balancesByMaterial ?? {}).flatMap(([material, buckets]) =>
      Object.entries((buckets ?? {}) as Record<string, unknown>).map(([bucket, value]) => [material, t(bucket), grams(value)]));
    return <section className="space-y-3 rounded border p-3 text-sm" aria-label={t("Batch reconciliation report")}>
      <h3 className="font-semibold"><T>Batch reconciliation</T> · {report.treeId}</h3>
      <p><T>Status</T>: {t(String(report.reconciliationState).replaceAll("_", " "))} · <T>CAD theoretical</T>: {grams(report.theoreticalCadGrams)} · <T>Actual material input</T>: {grams(report.actualInputGrams)}</p>
      <ReportTable headings={["Material", "Recommended (reference)", "Actually issued"]} values={[...materials].map((key) => [key, grams(report.recommendedInputsByMaterial?.[key]), grams(report.actualInputsByMaterial?.[key])])} />
      <ReportTable headings={["Material", "Current disposition", "Balance"]} values={balances} />
      <p><T>Unclassified process remainder</T>: {grams(report.unclassifiedGrams)} · <T>Outstanding WIP</T>: {grams(report.outstandingWipGrams)} · <T>In transit</T>: {grams(report.inTransitGrams)}</p>
    </section>;
  }
  if (report?.run && report?.materials) {
    return <section className="space-y-3 rounded border p-3 text-sm" aria-label={t("Process reconciliation report")}>
      <h3 className="font-semibold"><T>Process reconciliation</T> · {report.run.definition?.name ?? report.run.id}</h3>
      <p><T>Status</T>: {t(String(report.reconciliationState).replaceAll("_", " "))} · <T>Machine</T>: {report.run.workstation?.name ?? "—"} · <T>CAD target (reference)</T>: {report.run.targetWeightGrams ? grams(report.run.targetWeightGrams) : "—"}</p>
      <ReportTable headings={["Material", "Measured input", "Measured output", "Unclassified"]} values={rows(report.materials).map((item) => [item.materialKey, grams(item.inputGrams), grams(item.outputGrams), grams(item.unclassifiedGrams)])} />
    </section>;
  }
  if (report?.materialStock) {
    return <section className="space-y-4 rounded border p-3 text-sm" aria-label={t("Workshop management report")}>
      <h3 className="font-semibold"><T>Workshop management report</T></h3>
      <div><h4 className="mb-1 font-medium"><T>Material stock</T></h4><ReportTable headings={["Material", "Location / state", "Balance"]} values={rows(report.materialStock).filter((item) => item.balanceGrams !== "0.000000").map((item) => [item.materialKey, `${t(String(item.bucket))}${item.scopeId ? ` · ${String(item.scopeId).slice(0, 8)}` : ""}`, grams(item.balanceGrams)])} /></div>
      <div><h4 className="mb-1 font-medium"><T>Process variance</T></h4><ReportTable headings={["Process / product", "Machine / operator", "Material", "Classified variance"]} values={rows(report.processVariance).map((item) => [
        `${item.process?.definition?.name ?? item.processRunId ?? "—"} · ${item.process?.job?.product ?? "—"}`,
        `${item.process?.workstation?.name ?? "—"} · ${item.process?.operatorUserId ?? "—"}`,
        item.materialKey, grams(item.weightGrams),
      ])} /></div>
      <div><h4 className="mb-1 font-medium"><T>Transfer variance</T></h4><ReportTable headings={["Departments", "Dispatch", "Receive", "Difference / status"]} values={rows(report.transferVariance).map((item) => [
        `${item.fromDepartment} → ${item.toDepartment}`, grams(item.dispatchGrams), grams(item.receiveGrams), `${grams(item.differenceGrams)} · ${t(String(item.status))}`,
      ])} /></div>
      <div><h4 className="mb-1 font-medium"><T>Recovery bags</T></h4><ReportTable headings={["Bag", "Material", "Pending", "Status"]} values={rows(report.recovery).map((item) => [item.code, item.materialKey, grams(item.expectedBalanceGrams), t(String(item.status))])} /></div>
      <div><h4 className="mb-1 font-medium"><T>Scale audit</T></h4><ReportTable headings={["Captured", "Device / method", "Weight", "Operator / journal"]} values={rows(report.scaleAudit).map((item) => [
        item.capturedAt, `${item.deviceName} · ${t(String(item.adapterKind))}`, grams(item.weightGrams), `${item.actorUserId ?? "—"} · ${item.journalId ?? t("unposted")}`,
      ])} /></div>
      <p><T>Corrections and manual openings</T>: {rows(report.correctionHistory).length} · <T>Finished inventory receipts</T>: {rows(report.finishedGoods).length}</p>
    </section>;
  }
  return <p className="text-sm text-muted-foreground"><T>No report data is available for this selection.</T></p>;
}
