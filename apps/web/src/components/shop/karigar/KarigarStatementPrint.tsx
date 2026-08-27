"use client";

import React from "react";
import { format } from "date-fns";
import { T } from "@/components/ui/T";

export interface KarigarStatementPrintProps {
  workshop: {
    id: string;
    name: string;
    artisan: string;
    location?: string;
    phone?: string;
    wageRatePerGram: number;
    wastageLimit: number;
  };
  currency: string;
  summary: {
    amountPayable: number;
    advanceBalance: number;
    netPayable: number;
    totalWagesAccrued: number;
    totalSettlementsPaid: number;
    totalAdvances: number;
  };
  metalBalances: Array<{
    metalKey: string;
    issuedGrams: number;
    returnedGrams: number;
    outstandingGrams: number;
  }>;
  items: Array<{
    id: string;
    kind: "METAL" | "MONEY";
    eventType: string;
    createdAt: string;
    jobProduct?: string | null;
    metalKey?: string;
    quantity?: number;
    amount?: number;
    currency?: string;
    paymentMethod?: string | null;
    reference?: string | null;
    note?: string | null;
  }>;
  shopName?: string;
  onClose?: () => void;
}

export function KarigarStatementPrint({
  workshop,
  currency,
  summary,
  metalBalances,
  items,
  shopName,
  onClose,
}: KarigarStatementPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const displayName = shopName || workshop.name || "Jewellery Workshop";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 flex justify-center print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #karigar-statement-print-root,
          #karigar-statement-print-root * {
            visibility: visible !important;
          }
          #karigar-statement-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .karigar-print-hide {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
      <div
        id="karigar-statement-print-root"
        className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl p-8 print:shadow-none print:p-6 print:w-full print:rounded-none relative flex flex-col justify-between"
      >
        {/* Screen Action Bar (hidden in print) */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 print:hidden karigar-print-hide">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              <T>Karigar Account Statement Print Preview</T>
            </h2>
            <p className="text-sm text-slate-500">
              <T>Formatted A4 voucher & ledger statement</T>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow transition"
            >
              <T>Print Statement</T>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              >
                <T>Close</T>
              </button>
            )}
          </div>
        </div>

        {/* Printable Document Body */}
        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {displayName}
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                <T>Karigar Reconciliation & Statement of Account</T>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">
                <T>Statement Date</T>
              </p>
              <p className="text-sm font-bold text-slate-800">
                {format(new Date(), "dd MMMM yyyy, hh:mm a")}
              </p>
            </div>
          </div>

          {/* Workshop & Jeweller Info Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-sm">
            <div>
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
                <T>Karigar / Workshop Details</T>
              </span>
              <p className="font-bold text-slate-900 text-base">
                {workshop.name}
              </p>
              <p className="text-slate-700 font-medium">{workshop.artisan}</p>
              {workshop.phone && (
                <p className="text-slate-600 text-xs mt-0.5">
                  <T>Tel</T>: {workshop.phone}
                </p>
              )}
              {workshop.location && (
                <p className="text-slate-600 text-xs">{workshop.location}</p>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">
                <T>Terms & Rates</T>
              </span>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">
                  <T>Base Wage Rate</T>:
                </span>
                <span className="font-bold text-slate-900">
                  {currency} {workshop.wageRatePerGram.toLocaleString()} / g
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">
                  <T>Allowed Wastage Limit</T>:
                </span>
                <span className="font-bold text-slate-900">
                  {workshop.wastageLimit}%
                </span>
              </div>
            </div>
          </div>

          {/* Financial & Metal KPI Summary Blocks */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                <T>Total Wages Accrued</T>
              </span>
              <p className="text-lg font-black text-slate-900 mt-1">
                {currency}{" "}
                {summary.totalWagesAccrued.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                <T>Settlements Paid</T>
              </span>
              <p className="text-lg font-black text-emerald-700 mt-1">
                {currency}{" "}
                {summary.totalSettlementsPaid.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="border border-amber-300 rounded-xl p-3 bg-amber-50/60">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">
                {summary.advanceBalance > 0 ? (
                  <T>Advance in Hand</T>
                ) : (
                  <T>Net Wages Payable</T>
                )}
              </span>
              <p className="text-lg font-black text-amber-900 mt-1">
                {currency}{" "}
                {(summary.advanceBalance > 0
                  ? summary.advanceBalance
                  : summary.amountPayable
                ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Metal Outstanding Float */}
          {metalBalances.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
                <T>Physical Metal Float with Karigar</T>
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2 border-r border-slate-200">
                      <T>Material</T>
                    </th>
                    <th className="p-2 text-right border-r border-slate-200">
                      <T>Total Issued (g)</T>
                    </th>
                    <th className="p-2 text-right border-r border-slate-200">
                      <T>Total Returned (g)</T>
                    </th>
                    <th className="p-2 text-right font-bold text-slate-900">
                      <T>Outstanding Float (g)</T>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {metalBalances.map((b) => (
                    <tr key={b.metalKey} className="hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-800 border-r border-slate-200">
                        {b.metalKey}
                      </td>
                      <td className="p-2 text-right text-slate-600 border-r border-slate-200">
                        {b.issuedGrams.toFixed(3)}
                      </td>
                      <td className="p-2 text-right text-slate-600 border-r border-slate-200">
                        {b.returnedGrams.toFixed(3)}
                      </td>
                      <td className="p-2 text-right font-black text-amber-800">
                        {b.outstandingGrams.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transactions / Statement Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
              <T>Transaction History (Timeline)</T>
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2">
                    <T>Date</T>
                  </th>
                  <th className="p-2">
                    <T>Type</T>
                  </th>
                  <th className="p-2">
                    <T>Details / Job</T>
                  </th>
                  <th className="p-2">
                    <T>Reference / Notes</T>
                  </th>
                  <th className="p-2 text-right">
                    <T>Metal (g)</T>
                  </th>
                  <th className="p-2 text-right">
                    <T>Amount</T> ({currency})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-4 text-center text-slate-400 italic"
                    >
                      <T>No transaction records found.</T>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-600 whitespace-nowrap">
                        {format(new Date(item.createdAt), "dd MMM yyyy")}
                      </td>
                      <td className="p-2 font-medium">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.kind === "METAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {item.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-2 text-slate-800 max-w-[150px] truncate">
                        {item.jobProduct || (item.metalKey ?? "—")}
                      </td>
                      <td className="p-2 text-slate-500 text-[11px] max-w-[200px] truncate">
                        {item.reference ? `[${item.reference}] ` : ""}
                        {item.note || "—"}
                      </td>
                      <td className="p-2 text-right font-medium text-slate-800 whitespace-nowrap">
                        {item.quantity != null
                          ? `${item.quantity.toFixed(3)}g`
                          : "—"}
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {item.amount != null
                          ? item.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures & Footer */}
        <div className="pt-8 mt-auto border-t border-slate-300">
          <div className="grid grid-cols-2 gap-12 text-xs">
            <div>
              <div className="border-b border-slate-400 h-12 mb-2"></div>
              <p className="font-bold text-slate-800 text-center">
                <T>Jeweller / Authorized Signatory</T>
              </p>
              <p className="text-[10px] text-slate-400 text-center">
                <T>Seal & Signature</T>
              </p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-12 mb-2"></div>
              <p className="font-bold text-slate-800 text-center">
                <T>Karigar / Artisan Signature</T>
              </p>
              <p className="text-[10px] text-slate-400 text-center">
                <T>Acknowledged & Agreed</T>
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-6">
            <T>
              Generated via Orivraa Jewellery OS • Authoritative Karigar
              Reconciliation Ledger
            </T>
          </p>
        </div>
      </div>
    </div>
  );
}
