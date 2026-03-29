"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
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
import api from "@/lib/api";
import { COUNTRIES, CountryCode, CurrencyCode } from "@/store/preferences";
import { useT } from "@/providers/translation-provider";
import { Loader2, Store, StoreIcon } from "lucide-react";
import { useState } from "react";

const countries = [
  { value: "NP", label: "Nepal" },
  { value: "IN", label: "India" },
  { value: "AE", label: "UAE" },
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "Europe" },
  { value: "US", label: "United States" },
];

export function ConvertAccountCard() {
  const t = useT();
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    shopName: "",
    country: user?.preferredCountry || "NP",
    city: "",
    address: "",
    contactPhone: user?.phone || "",
    contactEmail: user?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopName || !formData.city || !formData.address || !formData.contactPhone) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const countryInfo = COUNTRIES[formData.country as CountryCode];
      const currency = countryInfo?.defaultCurrency || "NPR";

      const res = await api.post("/auth/convert-to-shopkeeper", {
        ...formData,
        currency,
      });

      // Update token in API client
      if (res.data.accessToken) {
        localStorage.setItem("token", res.data.accessToken);
      }
      if (res.data.refreshToken) {
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }

      toast({
        title: "Account Upgraded!",
        description: "You have successfully converted your account to a seller account.",
      });

      setOpen(false);
      
      // Full page reload to redirect to the new dashboard
      setTimeout(() => {
        window.location.href = "/dashboard/shop";
      }, 1000);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description: error.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.role !== "CUSTOMER") return null;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <StoreIcon className="h-5 w-5" />
            <T>Upgrade to Seller Account</T>
          </CardTitle>
          <CardDescription>
            <T>Accidentally created a customer account? You can instantly convert it to a shopkeeper account and start selling today.</T>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <Store className="h-4 w-4 mr-2" />
            <T>Upgrade to Seller</T>
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              <T>Set Up Your Shop</T>
            </DialogTitle>
            <DialogDescription>
              <T>Please provide a few details to create your shop profile. This cannot be undone.</T>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">
                <T>Shop Name</T> <span className="text-red-500">*</span>
              </Label>
              <Input
                id="shopName"
                placeholder="e.g. Ramesh Gold House"
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">
                <T>Country</T> <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  <T>City</T> <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Kathmandu"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <T>Address</T> <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="e.g. Thamel"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                <T>Contact Phone</T> <span className="text-red-500">*</span>
              </Label>
              <PhoneInput
                value={formData.contactPhone}
                onChange={(val) =>
                  setFormData({ ...formData, contactPhone: val })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">
                <T>Contact Email (Optional)</T>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="shop@example.com"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                <T>Cancel</T>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <T>Upgrade Account</T>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
