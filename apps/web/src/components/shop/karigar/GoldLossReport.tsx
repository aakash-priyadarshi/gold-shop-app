"use client";

import { T } from "@/components/ui/T";
import type { GoldLossResult } from "@gold-shop/shared";

function grams(n: number | undefined) {
  return (n ?? 0).toFixed(3);
}

export function GoldLossReport({
  report,
}: {
  report?: {
    jobs: Array<{ jobId: string; product: string; artisan: string; goldLoss: GoldLossResult }>;
    karigars: Array<{ workshopId: string; name: string; artisan: string; goldLoss: GoldLossResult }>;
    trees: Array<{ jobId: string; product: string; label: string; goldLoss: GoldLossResult }>;
  };
}) {
  if (!report) {
    return (
      <p className="text-xs text-muted-foreground" data-tour="supply-gold-loss">
        <T>No gold-loss data yet. Create a job or load the sample 1 kg job.</T>
      </p>
    );
  }
  const empty =
    report.trees.length === 0 && report.jobs.length === 0;
  return (
    <div data-tour="supply-gold-loss" className="space-y-4 print:bg-white">
      <p className="text-xs text-muted-foreground">
        <T>Workshop metal issued vs returned. This is not customer billing wastage (jarti) on invoices.</T>
      </p>
      {empty && (
        <p className="text-xs text-muted-foreground">
          <T>No casting trees yet. Load the sample 1 kg job to walk through a 1000g issue.</T>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b dark:border-gray-800">
              <th className="py-2 pr-2"><T>Job / tree</T></th>
              <th className="py-2 pr-2"><T>Issued</T></th>
              <th className="py-2 pr-2"><T>Finished</T></th>
              <th className="py-2 pr-2"><T>Sprue</T></th>
              <th className="py-2 pr-2"><T>Recoverable</T></th>
              <th className="py-2 pr-2"><T>Actual loss</T></th>
              <th className="py-2 pr-2"><T>Unexplained</T></th>
            </tr>
          </thead>
          <tbody>
            {report.trees.map((row) => (
              <tr key={row.jobId + row.label} className="border-b dark:border-gray-800">
                <td className="py-2 pr-2">
                  {row.product} — {row.label}
                </td>
                <td className="tabular-nums">{grams(row.goldLoss.issued)}</td>
                <td className="tabular-nums">{grams(row.goldLoss.finished)}</td>
                <td className="tabular-nums">{grams(row.goldLoss.sprueButton)}</td>
                <td className="tabular-nums">{grams(row.goldLoss.recoverable)}</td>
                <td className="tabular-nums">{grams(row.goldLoss.actualLoss)}</td>
                <td className={`tabular-nums font-semibold ${row.goldLoss.unexplained > 0 ? "text-rose-600" : ""}`}>
                  {grams(row.goldLoss.unexplained)}
                </td>
              </tr>
            ))}
            {report.trees.length === 0 &&
              report.jobs.map((row) => (
                <tr key={row.jobId} className="border-b dark:border-gray-800">
                  <td className="py-2 pr-2">{row.product}</td>
                  <td className="tabular-nums">{grams(row.goldLoss.issued)}</td>
                  <td className="tabular-nums">{grams(row.goldLoss.finished)}</td>
                  <td className="tabular-nums">{grams(row.goldLoss.sprueButton)}</td>
                  <td className="tabular-nums">{grams(row.goldLoss.recoverable)}</td>
                  <td className="tabular-nums">{grams(row.goldLoss.actualLoss)}</td>
                  <td className="tabular-nums">{grams(row.goldLoss.unexplained)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {report.karigars.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400 mb-2">
            <T>By karigar</T>
          </p>
          <ul className="text-xs space-y-1">
            {report.karigars.map((row) => (
              <li key={row.workshopId} className="flex justify-between gap-2">
                <span>
                  {row.artisan} · {row.name}
                </span>
                <span className="tabular-nums">
                  {grams(row.goldLoss.issued)} g <T>in</T> · {grams(row.goldLoss.unexplained)} g{" "}
                  <T>unexplained</T>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
