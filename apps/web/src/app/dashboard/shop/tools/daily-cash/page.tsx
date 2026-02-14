"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Banknote,
  DollarSign,
  Minus,
  Plus,
  Printer,
  Trash2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CashEntry {
  id: string;
  type: "IN" | "OUT";
  amount: number;
  description: string;
  category: string;
  time: string;
}

const IN_CATEGORIES = [
  "Sale",
  "Old Gold Purchase",
  "Repair Payment",
  "EMI Collection",
  "Other Income",
];
const OUT_CATEGORIES = [
  "Supplier Payment",
  "Gold Purchase",
  "Salary",
  "Rent",
  "Utilities",
  "Repair Cost",
  "Other Expense",
];

const STORAGE_KEY_PREFIX = "goldshop_daily_cash_";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}
function loadEntries(date: string): CashEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + date);
  return stored ? JSON.parse(stored) : [];
}
function saveEntries(date: string, entries: CashEntry[]) {
  localStorage.setItem(STORAGE_KEY_PREFIX + date, JSON.stringify(entries));
}

export default function DailyCashPage() {
  const router = useRouter();
  const { symbol: currencySymbol } = useShopCurrency();
  const [date, setDate] = useState(getTodayKey());
  const [entries, setEntries] = useState<CashEntry[]>(loadEntries(date));
  const [openingBalance, setOpeningBalance] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY_PREFIX + date + "_opening") || "";
  });

  // Form
  const [entryType, setEntryType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(IN_CATEGORIES[0]);

  const changeDate = (newDate: string) => {
    setDate(newDate);
    setEntries(loadEntries(newDate));
    const ob =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY_PREFIX + newDate + "_opening") || ""
        : "";
    setOpeningBalance(ob);
  };

  const saveOpeningBalance = (val: string) => {
    setOpeningBalance(val);
    localStorage.setItem(STORAGE_KEY_PREFIX + date + "_opening", val);
  };

  const addEntry = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    const entry: CashEntry = {
      id: Date.now().toString(),
      type: entryType,
      amount: amt,
      description: description || category,
      category,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(date, updated);
    setAmount("");
    setDescription("");
  };

  const deleteEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(date, updated);
  };

  const totalIn = entries
    .filter((e) => e.type === "IN")
    .reduce((s, e) => s + e.amount, 0);
  const totalOut = entries
    .filter((e) => e.type === "OUT")
    .reduce((s, e) => s + e.amount, 0);
  const opening = parseFloat(openingBalance) || 0;
  const netCash = opening + totalIn - totalOut;

  const handlePrint = () => {
    window.print();
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/shop/tools")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-amber-500" />
                  Daily Cash Summary
                </h1>
                <p className="text-muted-foreground">
                  Track daily cash inflows and outflows
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => changeDate(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Banknote className="h-5 w-5 mx-auto text-gray-500 mb-1" />
                <p className="text-sm text-muted-foreground">Opening</p>
                <Input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => saveOpeningBalance(e.target.value)}
                  className="text-center font-bold text-lg mt-1 h-8"
                  placeholder="0"
                />
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="p-4 text-center">
                <ArrowDown className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-sm text-muted-foreground">Cash In</p>
                <p className="text-xl font-bold text-green-600">
                  {currencySymbol} {totalIn.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="p-4 text-center">
                <ArrowUp className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-sm text-muted-foreground">Cash Out</p>
                <p className="text-xl font-bold text-red-600">
                  {currencySymbol} {totalOut.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-sm text-muted-foreground">Closing Balance</p>
                <p
                  className={`text-xl font-bold ${netCash >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {currencySymbol} {netCash.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Add Entry */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <Label className="text-xs">Type</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={entryType === "IN" ? "default" : "outline"}
                      className={
                        entryType === "IN"
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                      onClick={() => {
                        setEntryType("IN");
                        setCategory(IN_CATEGORIES[0]);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> IN
                    </Button>
                    <Button
                      size="sm"
                      variant={entryType === "OUT" ? "default" : "outline"}
                      className={
                        entryType === "OUT" ? "bg-red-500 hover:bg-red-600" : ""
                      }
                      onClick={() => {
                        setEntryType("OUT");
                        setCategory(OUT_CATEGORIES[0]);
                      }}
                    >
                      <Minus className="h-3 w-3 mr-1" /> OUT
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-xs">Category</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-2 text-sm border rounded-md bg-background"
                  >
                    {(entryType === "IN" ? IN_CATEGORIES : OUT_CATEGORIES).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="w-32">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details..."
                    className="h-9"
                  />
                </div>
                <Button
                  onClick={addEntry}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Entries List */}
          {entries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                <p className="text-muted-foreground">No entries for this day</p>
                <p className="text-sm text-muted-foreground">
                  Start recording cash transactions above
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Transactions —{" "}
                  {new Date(date).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        entry.type === "IN"
                          ? "bg-green-50/50 border-green-100"
                          : "bg-red-50/50 border-red-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {entry.type === "IN" ? (
                          <ArrowDown className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {entry.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold ${entry.type === "IN" ? "text-green-600" : "text-red-600"}`}
                        >
                          {entry.type === "IN" ? "+" : "-"}
                          {currencySymbol} {entry.amount.toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
