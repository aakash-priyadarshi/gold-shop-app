"use client";

import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { invoicesApi } from "@/lib/api";
import { getCurrencyForCountry } from "@/lib/currency";
import {
  mobileInvoiceDetailPath,
  resolveCreatedInvoice,
} from "@/lib/mobileInvoice";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Line = { label: string; category: "METAL" | "MAKING" | "GEMSTONE" | "FINISH"; amount: string };
const MARKETS = ["NP", "IN", "LK", "AE", "GB", "DE", "FR", "US"];

export default function MobileInvoiceCreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [country, setCountry] = useState(user?.shop?.country ?? "NP");
  const [customerType, setCustomerType] = useState<"B2C" | "B2B">("B2C");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [requestTaxInvoice, setRequestTaxInvoice] = useState(false);
  const [supplyDate, setSupplyDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ label: "Jewellery", category: "METAL", amount: "" }]);
  const [saving, setSaving] = useState(false);
  const currency = useMemo(() => getCurrencyForCountry(country), [country]);

  const updateLine = (index: number, update: Partial<Line>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...update } : line));
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const submit = async () => {
    const validLines = lines.filter((line) => line.label.trim() && Number(line.amount) > 0);
    if (!customerName.trim() || validLines.length === 0) {
      toast({ title: "Add a customer and at least one priced line", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await invoicesApi.create({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerType,
        customerTaxId: customerTaxId.trim() || undefined,
        invoiceCountry: country,
        currency,
        requestTaxInvoice: country === "LK" ? requestTaxInvoice : undefined,
        purchaserVatRegistered: country === "LK" ? customerType === "B2B" : undefined,
        supplyDate: country === "LK" ? supplyDate : undefined,
        lineItems: validLines.map((line) => ({
          label: line.label.trim(),
          category: line.category,
          quantity: 1,
          unitPrice: Number(line.amount),
          amount: Number(line.amount),
        })),
      });
      const invoice = resolveCreatedInvoice(response.data);
      if (!invoice?.id) {
        toast({
          title: "Invoice created",
          description: "Open Invoices from the menu to find your new bill.",
        });
        router.replace("/m/invoices");
        return;
      }
      toast({
        title: "Invoice created",
        description: invoice.invoiceNumber
          ? `#${invoice.invoiceNumber}`
          : undefined,
      });
      router.replace(mobileInvoiceDetailPath(invoice.id, { created: true }));
    } catch (error: any) {
      toast({ title: "Could not create invoice", description: error?.response?.data?.message ?? "Please review the bill", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4 pb-28">
      <div className="flex items-center gap-3"><Link href="/m/invoices" className="rounded-xl bg-gray-100 p-2"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="text-lg font-bold"><T>New invoice</T></h1><p className="text-xs text-gray-500"><T>Tax is calculated securely by the server</T></p></div></div>
      <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
        <label className="block text-xs font-bold text-gray-500"><T>Invoice country</T><select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">{MARKETS.map((market) => <option key={market} value={market}>{market} · {getCurrencyForCountry(market)}</option>)}</select></label>
        <label className="block text-xs font-bold text-gray-500"><T>Customer name</T><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-bold text-gray-500"><T>Customer phone</T><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} inputMode="tel" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>
        <div className="grid grid-cols-2 gap-2"><button onClick={() => setCustomerType("B2C")} className={`rounded-xl border py-2 text-sm font-bold ${customerType === "B2C" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200"}`}><T>Consumer</T></button><button onClick={() => setCustomerType("B2B")} className={`rounded-xl border py-2 text-sm font-bold ${customerType === "B2B" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200"}`}><T>Business</T></button></div>
        {customerType === "B2B" && <label className="block text-xs font-bold text-gray-500"><T>Customer tax ID</T><input value={customerTaxId} onChange={(event) => setCustomerTaxId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>}
        {country === "LK" && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={requestTaxInvoice} onChange={(event) => setRequestTaxInvoice(event.target.checked)} /><T>Request Sri Lankan TAX INVOICE</T></label><label className="block text-xs font-bold text-gray-500"><T>Date of supply</T><input type="date" value={supplyDate} onChange={(event) => setSupplyDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label></>}
      </section>
      <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold"><T>Bill lines</T></h2><button onClick={() => setLines((current) => [...current, { label: "", category: "METAL", amount: "" }])} className="inline-flex items-center gap-1 text-sm font-bold text-amber-700"><Plus className="h-4 w-4" /><T>Add</T></button></div>{lines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-gray-50 p-2"><div className="space-y-2"><input value={line.label} onChange={(event) => updateLine(index, { label: event.target.value })} placeholder="Line description" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><select value={line.category} onChange={(event) => updateLine(index, { category: event.target.value as Line["category"] })} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"><option value="METAL">Metal</option><option value="MAKING">Making</option><option value="GEMSTONE">Gemstone</option><option value="FINISH">Finish</option></select><input value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} type="number" inputMode="decimal" min="0" placeholder={`${currency} amount`} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm" /></div></div><button disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="self-center rounded-lg p-2 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}</section>
      <div className="fixed bottom-16 left-0 right-0 border-t border-gray-100 bg-white p-4"><button disabled={saving} onClick={() => void submit()} className="w-full rounded-2xl bg-amber-600 py-4 text-base font-bold text-white disabled:opacity-50">{saving ? <T>Creating…</T> : <><T>Create invoice</T> · {currency} {total.toLocaleString()}</>}</button></div>
    </div>
  );
}
