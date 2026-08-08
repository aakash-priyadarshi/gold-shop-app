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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { accountingApi } from "@/lib/api";
import type { SupportedCurrencyCode } from "@/lib/currency";
import {
  Calculator,
  Loader2,
  RefreshCw,
  Scale,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(lastDay).padStart(2, "0")}`,
  };
}

function fmt(n: string | number | null | undefined): string {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TrialAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  systemKey?: string | null;
  debitNpr: string;
  creditNpr: string;
  balanceNpr: string;
}

interface JournalEntryRow {
  id: string;
  entryNumber: string;
  description: string;
  referenceType: string;
  transactionDate: string;
  transactionCurrency: string;
  transactionAmount: string;
  canonicalAmountNpr: string;
  lines?: Array<{
    id: string;
    debitNpr: string;
    creditNpr: string;
    account?: { code: string; name: string };
  }>;
}

interface GlLine {
  id: string;
  debitNpr: string;
  creditNpr: string;
  description?: string | null;
  journalEntry?: {
    entryNumber: string;
    transactionDate: string;
    description: string;
  };
  account?: { code: string; name: string };
}

interface ProfitLoss {
  salesRevenueNpr: string;
  salesReturnsNpr: string;
  netSalesNpr: string;
  taxPayableIncreaseNpr: string;
  commissionExpenseNpr: string;
  netIncomeNpr: string;
  note?: string;
}

export default function ShopAccountingPage() {
  const { user } = useAuth();
  const shopId = user?.shop?.id || "";
  const { currencyCode, format: formatShopMoney } = useShopCurrency();
  const { convertCurrency } = useCurrencyConversion();

  const displayFromNpr = useCallback(
    (amount: string | number | null | undefined): string => {
      const n = Number(amount || 0);
      if (!Number.isFinite(n)) return "—";
      if (currencyCode === "NPR") {
        return formatShopMoney(n);
      }
      const converted = convertCurrency(
        n,
        "NPR",
        currencyCode as SupportedCurrencyCode,
      );
      return formatShopMoney(converted);
    },
    [convertCurrency, currencyCode, formatShopMoney],
  );

  const [month, setMonth] = useState(currentMonth());
  const range = useMemo(() => monthRange(month), [month]);

  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<{
    accounts: TrialAccount[];
    totalDebitNpr: string;
    totalCreditNpr: string;
    balanced: boolean;
  } | null>(null);
  const [pnl, setPnl] = useState<ProfitLoss | null>(null);
  const [journals, setJournals] = useState<JournalEntryRow[]>([]);
  const [journalTotal, setJournalTotal] = useState(0);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [glLines, setGlLines] = useState<GlLine[]>([]);

  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openingBusy, setOpeningBusy] = useState(false);
  const [backfillBusy, setBackfillBusy] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [tbRes, pnlRes, ledRes] = await Promise.all([
        accountingApi.trialBalance(shopId, range),
        accountingApi.profitLoss(shopId, range),
        accountingApi.ledger(shopId, { ...range, page: 1, limit: 25 }),
      ]);
      const tb = tbRes.data?.data ?? tbRes.data;
      const pl = pnlRes.data?.data ?? pnlRes.data;
      const led = ledRes.data?.data ?? ledRes.data;
      setTrial(tb);
      setPnl(pl);
      setJournals(led?.entries || []);
      setJournalTotal(led?.total || 0);
      setSelectedAccountId((prev) => prev || tb?.accounts?.[0]?.id || "");
    } catch (err: any) {
      toast({
        title: "Failed to load ledger",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [shopId, range]);

  const loadGl = useCallback(async () => {
    if (!shopId || !selectedAccountId) {
      setGlLines([]);
      return;
    }
    try {
      const res = await accountingApi.generalLedger(shopId, {
        ...range,
        accountId: selectedAccountId,
        page: 1,
        limit: 50,
      });
      const data = res.data?.data ?? res.data;
      setGlLines(data?.lines || []);
    } catch (err: any) {
      toast({
        title: "Failed to load account ledger",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    }
  }, [shopId, selectedAccountId, range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadGl();
  }, [loadGl]);

  const submitOpening = async () => {
    if (!shopId) return;
    const cash = Number(cashAmount) || 0;
    const bank = Number(bankAmount) || 0;
    if (cash <= 0 && bank <= 0) {
      toast({
        title: "Enter cash or bank amount",
        variant: "destructive",
      });
      return;
    }
    setOpeningBusy(true);
    try {
      const res = await accountingApi.openingBalances(shopId, {
        cashAmount: cash > 0 ? cash : undefined,
        bankAmount: bank > 0 ? bank : undefined,
        asOfDate,
      });
      const data = res.data?.data ?? res.data;
      toast({
        title: data?.idempotent
          ? "Opening balance already posted"
          : "Opening balance posted",
      });
      setCashAmount("");
      setBankAmount("");
      await load();
    } catch (err: any) {
      toast({
        title: "Opening balance failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setOpeningBusy(false);
    }
  };

  const runBackfill = async () => {
    if (!shopId) return;
    setBackfillBusy(true);
    try {
      const res = await accountingApi.backfill(shopId);
      const data = res.data?.data ?? res.data;
      toast({
        title: "Ledger backfill complete",
        description: `Invoices +${data?.invoicesPosted || 0} / payments +${data?.paymentsPosted || 0} (skipped ${data?.invoicesSkipped || 0}/${data?.paymentsSkipped || 0})`,
      });
      await load();
    } catch (err: any) {
      toast({
        title: "Backfill failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setBackfillBusy(false);
    }
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6" data-tour="shop-accounting">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Calculator className="h-6 w-6 text-amber-600" />
                <T>Shop Ledger</T>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                <T>
                  Trial balance, journals, opening balances, and a simple profit
                  and loss from your double-entry books.
                </T>
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  <T>Month</T>
                </Label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-44"
                  data-tour="accounting-month"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">
                  <T>Refresh</T>
                </span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void runBackfill()}
                disabled={backfillBusy || !shopId}
                data-tour="accounting-backfill"
              >
                {backfillBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scale className="h-4 w-4" />
                )}
                <span className="ml-2">
                  <T>Backfill history</T>
                </span>
              </Button>
            </div>
          </div>

          {loading && !trial ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      <T>Sales revenue</T>
                    </CardDescription>
                    <CardTitle className="text-xl">
                      {displayFromNpr(pnl?.salesRevenueNpr)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      <T>Sales returns</T>
                    </CardDescription>
                    <CardTitle className="text-xl">
                      {displayFromNpr(pnl?.salesReturnsNpr)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      <T>Commission expense</T>
                    </CardDescription>
                    <CardTitle className="text-xl">
                      {displayFromNpr(pnl?.commissionExpenseNpr)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      <T>Net income (excl. COGS)</T>
                    </CardDescription>
                    <CardTitle className="text-xl">
                      {displayFromNpr(pnl?.netIncomeNpr)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-muted-foreground">
                    <T>Tax payable movement</T>:{" "}
                    {displayFromNpr(pnl?.taxPayableIncreaseNpr)}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>
                        <T>Trial balance</T>
                      </CardTitle>
                      <CardDescription>
                        {currencyCode === "NPR" ? (
                          <T>Amounts in shop base currency for the selected month</T>
                        ) : (
                          <>
                            <T>Displayed in</T> {currencyCode}{" "}
                            <T>(ledger stored in NPR)</T>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    {trial && (
                      <Badge variant={trial.balanced ? "default" : "destructive"}>
                        {trial.balanced ? (
                          <T>Balanced</T>
                        ) : (
                          <T>Out of balance</T>
                        )}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-2">
                            <T>Code</T>
                          </th>
                          <th className="py-2 pr-2">
                            <T>Account</T>
                          </th>
                          <th className="py-2 pr-2 text-right">
                            <T>Debit</T>
                          </th>
                          <th className="py-2 pr-2 text-right">
                            <T>Credit</T>
                          </th>
                          <th className="py-2 text-right">
                            <T>Balance</T>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(trial?.accounts || []).map((a) => (
                          <tr
                            key={a.id}
                            className={`border-b cursor-pointer hover:bg-muted/40 ${
                              selectedAccountId === a.id ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                            }`}
                            onClick={() => setSelectedAccountId(a.id)}
                          >
                            <td className="py-2 pr-2 font-mono text-xs">{a.code}</td>
                            <td className="py-2 pr-2">{a.name}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              {displayFromNpr(a.debitNpr)}
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              {displayFromNpr(a.creditNpr)}
                            </td>
                            <td className="py-2 text-right tabular-nums font-medium">
                              {displayFromNpr(a.balanceNpr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td colSpan={2} className="py-2">
                            <T>Totals</T>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {displayFromNpr(trial?.totalDebitNpr)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {displayFromNpr(trial?.totalCreditNpr)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>Opening balances</T>
                    </CardTitle>
                    <CardDescription>
                      <T>Debit cash/bank, credit opening equity</T>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label>
                        <T>As of date</T>
                      </Label>
                      <Input
                        type="date"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>
                        <T>Cash on hand</T>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>
                        <T>Bank</T>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={bankAmount}
                        onChange={(e) => setBankAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => void submitOpening()}
                      disabled={openingBusy}
                      data-tour="accounting-opening-submit"
                    >
                      {openingBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      <T>Post opening balance</T>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      <T>
                        Idempotent per as-of date. Re-posting the same date returns
                        the existing journal.
                      </T>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>Journal entries</T>
                    </CardTitle>
                    <CardDescription>
                      {journalTotal} <T>posted in this period</T>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[28rem] overflow-y-auto">
                    {journals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        <T>No journals for this month yet.</T>
                      </p>
                    ) : (
                      journals.map((j) => (
                        <div
                          key={j.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs">
                              {j.entryNumber}
                            </span>
                            <Badge variant="outline">{j.referenceType}</Badge>
                          </div>
                          <p className="text-sm font-medium">{j.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(j.transactionDate).toLocaleDateString()} ·{" "}
                            {j.transactionCurrency} {fmt(j.transactionAmount)} ·{" "}
                            {displayFromNpr(j.canonicalAmountNpr)}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <T>Account ledger</T>
                    </CardTitle>
                    <CardDescription>
                      <T>Click a trial-balance row to drill down</T>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={selectedAccountId}
                      onValueChange={setSelectedAccountId}
                    >
                      <SelectTrigger data-tour="accounting-account-select">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(trial?.accounts || []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="max-h-[24rem] overflow-y-auto space-y-2">
                      {glLines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          <T>No lines for this account in the period.</T>
                        </p>
                      ) : (
                        glLines.map((line) => (
                          <div
                            key={line.id}
                            className="rounded-md border px-3 py-2 text-sm flex justify-between gap-3"
                          >
                            <div>
                              <p className="font-mono text-xs">
                                {line.journalEntry?.entryNumber}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {line.journalEntry?.transactionDate
                                  ? new Date(
                                      line.journalEntry.transactionDate,
                                    ).toLocaleDateString()
                                  : ""}
                                {line.description
                                  ? ` · ${line.description}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right tabular-nums shrink-0">
                              {Number(line.debitNpr) > 0 ? (
                                <span>Dr {displayFromNpr(line.debitNpr)}</span>
                              ) : (
                                <span>Cr {displayFromNpr(line.creditNpr)}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
