"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { ArrowLeft, Calendar, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EMICalculatorPage() {
  const router = useRouter();
  const { symbol: currencySymbol } = useShopCurrency();
  const [totalAmount, setTotalAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [interestRate, setInterestRate] = useState("12"); // Annual %
  const [tenure, setTenure] = useState("6"); // months

  const principal =
    (parseFloat(totalAmount) || 0) - (parseFloat(downPayment) || 0);
  const rate = (parseFloat(interestRate) || 0) / 12 / 100; // Monthly interest
  const months = parseInt(tenure) || 1;

  // EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
  let emi = 0;
  let totalPayable = 0;
  let totalInterest = 0;

  if (principal > 0 && rate > 0 && months > 0) {
    const factor = Math.pow(1 + rate, months);
    emi = (principal * rate * factor) / (factor - 1);
    totalPayable = emi * months;
    totalInterest = totalPayable - principal;
  } else if (principal > 0 && months > 0) {
    // 0% interest
    emi = principal / months;
    totalPayable = principal;
    totalInterest = 0;
  }

  // Generate schedule
  const schedule: {
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }[] = [];
  let balance = principal;
  for (let i = 1; i <= months && balance > 0; i++) {
    const interestPart = balance * rate;
    const principalPart = emi - interestPart;
    balance = Math.max(0, balance - principalPart);
    schedule.push({
      month: i,
      emi: Math.round(emi),
      principal: Math.round(principalPart),
      interest: Math.round(interestPart),
      balance: Math.round(balance),
    });
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
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
                <CreditCard className="h-6 w-6 text-amber-500" />
                EMI Calculator
              </h1>
              <p className="text-muted-foreground">
                Calculate installment plans for customers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Total Item Price ({currencySymbol})</Label>
                  <Input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 150000"
                  />
                </div>
                <div>
                  <Label>Down Payment ({currencySymbol})</Label>
                  <Input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <Label>Annual Interest Rate (%)</Label>
                  <Input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.5"
                    min="0"
                    max="36"
                  />
                </div>
                <div>
                  <Label>Tenure (months)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[3, 6, 9, 12, 18, 24].map((m) => (
                      <Button
                        key={m}
                        variant={
                          tenure === m.toString() ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setTenure(m.toString())}
                        className={
                          tenure === m.toString() ? "bg-amber-500" : ""
                        }
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="mt-2"
                    min="1"
                    max="60"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Result */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/30 dark:to-yellow-950/30 dark:border-amber-800/50">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Monthly EMI
                  </p>
                  <p className="text-4xl font-bold text-amber-600">
                    {currencySymbol} {Math.round(emi).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    for {months} month{months > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Loan Amount</p>
                    <p className="text-xl font-bold">
                      {currencySymbol} {Math.round(principal).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Total Interest
                    </p>
                    <p className="text-xl font-bold text-red-500">
                      {currencySymbol}{" "}
                      {Math.round(totalInterest).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="col-span-2">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Total Payable
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {currencySymbol}{" "}
                      {Math.round(
                        totalPayable + (parseFloat(downPayment) || 0),
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (Down Payment: {currencySymbol}{" "}
                      {(parseFloat(downPayment) || 0).toLocaleString()} + EMIs:
                      {currencySymbol}{" "}
                      {Math.round(totalPayable).toLocaleString()})
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          {schedule.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Payment Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left p-2">Month</th>
                        <th className="text-right p-2">EMI</th>
                        <th className="text-right p-2">Principal</th>
                        <th className="text-right p-2">Interest</th>
                        <th className="text-right p-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row) => (
                        <tr
                          key={row.month}
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="p-2">{row.month}</td>
                          <td className="text-right p-2">
                            {currencySymbol} {row.emi.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            {row.principal.toLocaleString()}
                          </td>
                          <td className="text-right p-2 text-red-500">
                            {row.interest.toLocaleString()}
                          </td>
                          <td className="text-right p-2 font-medium">
                            {row.balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
