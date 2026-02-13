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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { invoicesApi } from "@/lib/api";
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LineItem {
  label: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  details: string;
}

const CATEGORIES = ["METAL", "MAKING", "GEMSTONE", "FINISH", "LABOUR", "OTHER"];

export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      label: "",
      category: "METAL",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      details: "",
    },
  ]);

  // Tax & discount
  const [taxRate, setTaxRate] = useState("0.13");
  const [taxLabel, setTaxLabel] = useState("VAT (13%)");
  const [discountAmount, setDiscountAmount] = useState("");

  // Notes
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Payment due upon delivery. All sales are final.",
  );
  const [dueDate, setDueDate] = useState("");

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        label: "",
        category: "OTHER",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        details: "",
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    // Auto-calculate amount
    if (field === "quantity" || field === "unitPrice") {
      updated[index].amount =
        updated[index].quantity * updated[index].unitPrice;
    }
    setLineItems(updated);
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (parseFloat(taxRate) || 0);
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + tax - discount;

  const handleSubmit = async () => {
    if (!customerName) {
      toast({ variant: "destructive", title: "Missing customer name" });
      return;
    }
    if (lineItems.every((li) => !li.label || li.amount <= 0)) {
      toast({ variant: "destructive", title: "Add at least one line item" });
      return;
    }

    setLoading(true);
    try {
      const response = await invoicesApi.create({
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        customerAddress: customerAddress || undefined,
        lineItems: lineItems.filter((li) => li.label && li.amount > 0),
        taxRate: parseFloat(taxRate) || 0,
        taxLabel: taxLabel || undefined,
        discountAmount: discount || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
      });

      toast({
        title: "Invoice Created",
        description: `Invoice ${response.data.invoiceNumber} has been created`,
      });
      router.push(`/dashboard/shop/invoices/${response.data.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create invoice",
        description: error.response?.data?.message || "Error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Invoice</h1>
              <p className="text-muted-foreground">
                Generate a new invoice for a customer
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Full address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Add items, costs, and charges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    {idx === 0 && <Label className="text-xs">Item</Label>}
                    <Input
                      value={item.label}
                      onChange={(e) =>
                        updateLineItem(idx, "label", e.target.value)
                      }
                      placeholder="Item name"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Category</Label>}
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateLineItem(idx, "category", e.target.value)
                      }
                      className="w-full h-10 px-2 text-sm border rounded-md bg-background"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <Label className="text-xs">Qty</Label>}
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          idx,
                          "quantity",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      min={1}
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                    <Input
                      type="number"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateLineItem(
                          idx,
                          "unitPrice",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Amount</Label>}
                    <Input
                      type="number"
                      value={item.amount || ""}
                      readOnly
                      className="bg-gray-50 font-medium"
                    />
                  </div>
                  <div className="col-span-2 flex gap-1">
                    <Input
                      value={item.details}
                      onChange={(e) =>
                        updateLineItem(idx, "details", e.target.value)
                      }
                      placeholder="Details"
                      className="text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length <= 1}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" /> Add Line Item
              </Button>

              <Separator />

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      NPR {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-20 text-xs"
                      value={taxLabel}
                      onChange={(e) => setTaxLabel(e.target.value)}
                      placeholder="Tax label"
                    />
                    <Input
                      className="w-16 text-xs"
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="Rate"
                    />
                    <span className="flex-1 text-right text-sm">
                      NPR {tax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600">Discount</span>
                    <Input
                      className="w-28 text-xs"
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0"
                    />
                    <span className="flex-1 text-right text-sm text-green-600">
                      -NPR {discount.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-amber-600">
                      NPR {total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the customer..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create Invoice
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
