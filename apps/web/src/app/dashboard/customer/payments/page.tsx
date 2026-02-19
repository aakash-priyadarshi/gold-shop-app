"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
  Building,
  Check,
  CreditCard,
  Loader2,
  Plus,
  Shield,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PaymentMethod {
  id: string;
  type: "card" | "bank" | "esewa" | "khalti" | "imepay";
  label: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountNumber?: string;
  mobileNumber?: string;
  isDefault: boolean;
}

const paymentTypes = [
  { value: "card", label: "Credit/Debit Card", icon: CreditCard },
  { value: "bank", label: "Bank Account", icon: Building },
  { value: "esewa", label: "eSewa", icon: Smartphone },
  { value: "khalti", label: "Khalti", icon: Wallet },
  { value: "imepay", label: "IME Pay", icon: Smartphone },
];

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newMethod, setNewMethod] = useState({
    type: "esewa" as "card" | "bank" | "esewa" | "khalti" | "imepay",
    label: "",
    // Card fields
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    // Bank fields
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    // Mobile wallet fields
    mobileNumber: "",
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/users/me/payment-methods");
      setPaymentMethods(response.data || []);
    } catch (error) {
      // API might not exist yet - show empty state
      console.error("Failed to load payment methods:", error);
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        type: newMethod.type,
        label: newMethod.label || getDefaultLabel(newMethod.type),
      };

      if (newMethod.type === "card") {
        payload.lastFour = newMethod.cardNumber.slice(-4);
        payload.expiryMonth = parseInt(newMethod.expiryMonth);
        payload.expiryYear = parseInt(newMethod.expiryYear);
      } else if (newMethod.type === "bank") {
        payload.bankName = newMethod.bankName;
        payload.accountNumber = newMethod.accountNumber;
      } else {
        // Mobile wallets
        payload.mobileNumber = newMethod.mobileNumber;
      }

      const response = await api.post("/users/me/payment-methods", payload);
      setPaymentMethods([...paymentMethods, response.data]);

      toast({
        title: "Payment Method Added",
        description: "Your payment method has been saved",
      });

      setShowAddForm(false);
      resetForm();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add payment method",
        description:
          error.response?.data?.message || "Could not save payment method",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      await api.delete(`/users/me/payment-methods/${id}`);
      setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
      toast({
        title: "Payment Method Removed",
        description: "The payment method has been deleted",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description:
          error.response?.data?.message || "Could not delete payment method",
      });
    }
  };

  const setDefaultPaymentMethod = async (id: string) => {
    try {
      await api.patch(`/users/me/payment-methods/${id}/default`);
      setPaymentMethods(
        paymentMethods.map((pm) => ({ ...pm, isDefault: pm.id === id })),
      );
      toast({
        title: "Default Payment Method Updated",
        description: "Your default payment method has been set",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          error.response?.data?.message ||
          "Could not set default payment method",
      });
    }
  };

  const getDefaultLabel = (type: string) => {
    const typeInfo = paymentTypes.find((t) => t.value === type);
    return typeInfo?.label || "Payment Method";
  };

  const resetForm = () => {
    setNewMethod({
      type: "esewa",
      label: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      mobileNumber: "",
    });
  };

  const getPaymentMethodIcon = (type: string) => {
    const typeInfo = paymentTypes.find((t) => t.value === type);
    const Icon = typeInfo?.icon || CreditCard;
    return <Icon className="h-5 w-5" />;
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    if (method.type === "card") {
      return `•••• ${method.lastFour}`;
    } else if (method.type === "bank") {
      return `${method.bankName} - ••••${method.accountNumber?.slice(-4)}`;
    } else {
      return method.mobileNumber;
    }
  };

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Payment Methods</h1>
              <p className="text-muted-foreground">
                Manage your saved payment methods for faster checkout
              </p>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    Your payment information is secure
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    We use industry-standard encryption to protect your payment
                    details. Card numbers are never stored on our servers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Payment Method Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add Payment Method</CardTitle>
                <CardDescription>
                  Choose your preferred payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Type Selection */}
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {paymentTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setNewMethod({
                              ...newMethod,
                              type: type.value as any,
                            })
                          }
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                            newMethod.type === type.value
                              ? "border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-950/30 dark:text-gold-300"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card Fields */}
                {newMethod.type === "card" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input
                        value={newMethod.cardNumber}
                        onChange={(e) =>
                          setNewMethod({
                            ...newMethod,
                            cardNumber: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 16),
                          })
                        }
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Expiry Month</Label>
                        <Select
                          value={newMethod.expiryMonth}
                          onValueChange={(value) =>
                            setNewMethod({ ...newMethod, expiryMonth: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem
                                key={i + 1}
                                value={String(i + 1).padStart(2, "0")}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Year</Label>
                        <Select
                          value={newMethod.expiryYear}
                          onValueChange={(value) =>
                            setNewMethod({ ...newMethod, expiryYear: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="YY" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => {
                              const year = new Date().getFullYear() + i;
                              return (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <Input
                          type="password"
                          value={newMethod.cvv}
                          onChange={(e) =>
                            setNewMethod({
                              ...newMethod,
                              cvv: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            })
                          }
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Account Fields */}
                {newMethod.type === "bank" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={newMethod.bankName}
                        onChange={(e) =>
                          setNewMethod({
                            ...newMethod,
                            bankName: e.target.value,
                          })
                        }
                        placeholder="e.g., Nepal Bank Limited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input
                        value={newMethod.accountHolderName}
                        onChange={(e) =>
                          setNewMethod({
                            ...newMethod,
                            accountHolderName: e.target.value,
                          })
                        }
                        placeholder="As shown on bank account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={newMethod.accountNumber}
                        onChange={(e) =>
                          setNewMethod({
                            ...newMethod,
                            accountNumber: e.target.value,
                          })
                        }
                        placeholder="Your bank account number"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Wallet Fields */}
                {["esewa", "khalti", "imepay"].includes(newMethod.type) && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input
                        value={newMethod.mobileNumber}
                        onChange={(e) =>
                          setNewMethod({
                            ...newMethod,
                            mobileNumber: e.target.value,
                          })
                        }
                        placeholder="+977 98XXXXXXXX"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the mobile number linked to your{" "}
                        {getDefaultLabel(newMethod.type)} account
                      </p>
                    </div>
                  </div>
                )}

                {/* Label */}
                <div className="space-y-2">
                  <Label>Label (Optional)</Label>
                  <Input
                    value={newMethod.label}
                    onChange={(e) =>
                      setNewMethod({ ...newMethod, label: e.target.value })
                    }
                    placeholder={`e.g., Personal ${getDefaultLabel(newMethod.type)}`}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={addPaymentMethod} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment Method
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Payment Methods</CardTitle>
              <CardDescription>
                Your saved payment methods for faster checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-muted p-6 mx-auto w-fit mb-4">
                    <Wallet className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No payment methods saved
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Add a payment method to speed up your checkout process
                  </p>
                  {!showAddForm && (
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Payment Method
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        method.isDefault
                          ? "border-gold-500 bg-gold-50 dark:bg-gold-950/30"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${method.isDefault ? "bg-gold-100" : "bg-muted"}`}
                        >
                          {getPaymentMethodIcon(method.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{method.label}</span>
                            {method.isDefault && (
                              <span className="text-xs bg-gold-100 text-gold-800 dark:text-gold-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getPaymentMethodDisplay(method)}
                          </p>
                          {method.type === "card" &&
                            method.expiryMonth &&
                            method.expiryYear && (
                              <p className="text-xs text-muted-foreground">
                                Expires{" "}
                                {String(method.expiryMonth).padStart(2, "0")}/
                                {method.expiryYear}
                              </p>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultPaymentMethod(method.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deletePaymentMethod(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
