"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { customerCrmApi, shopQuotesApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";

export type PosCustomer = {
  id: string;
  type: "REGISTERED" | "WALK_IN";
  isRegistered: boolean;
  name: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
};

const PHONE_CODES = ["+977", "+91", "+971", "+1", "+44", "+94"];

export function defaultPhoneCountryCode(country?: string) {
  return {
    NP: "+977",
    IN: "+91",
    AE: "+971",
    US: "+1",
    GB: "+44",
    UK: "+44",
    LK: "+94",
  }[String(country || "").trim().toUpperCase()];
}

/** Prefer the configured shop country; otherwise only accept an explicit known prefix. */
export function resolvePhoneCountryCode(phone: string, country?: string) {
  const configured = defaultPhoneCountryCode(country);
  if (configured) return configured;
  const normalized = phone.trim();
  return PHONE_CODES.find((code) => normalized.startsWith(code));
}

export function PosCustomerPicker({
  country,
  selected,
  onSelect,
  onClear,
}: {
  country?: string;
  selected?: PosCustomer | null;
  onSelect: (customer: PosCustomer) => void | Promise<void>;
  onClear?: () => void;
}) {
  const t = useT();
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    () => defaultPhoneCountryCode(country) || "",
  );
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState<PosCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const configuredCode = defaultPhoneCountryCode(country);
    if (configuredCode) setPhoneCountryCode(configuredCode);
  }, [country]);

  useEffect(() => {
    if (selected) return;
    if (!phoneCountryCode) {
      setSuggestions([]);
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 3) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [searchRes, exactRes] = await Promise.all([
          shopQuotesApi.searchCustomers({
            phoneCountryCode,
            phone: digits,
          }),
          digits.length >= 7
            ? shopQuotesApi.lookupCustomer({ phoneCountryCode, phone: digits })
            : Promise.resolve(null),
        ]);
        if (!active) return;
        const exact = exactRes?.data?.found
          ? [exactRes.data.customer]
          : [];
        const rows = [
          ...exact,
          ...(searchRes.data?.customers ?? []),
        ].filter(
          (row: any, index: number, all: any[]) =>
            all.findIndex((candidate) => candidate.id === row.id) === index,
        );
        setSuggestions(
          rows.map((row: any) => ({
            ...row,
            type: row.isRegistered ? "REGISTERED" : "WALK_IN",
            isRegistered: Boolean(row.isRegistered),
          })),
        );
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [phone, phoneCountryCode, selected]);

  const choose = async (customer: PosCustomer) => {
    setName(customer.name || "");
    setEmail(customer.email || "");
    setAddress(customer.address || "");
    setCity(customer.city || "");
    setSuggestions([]);
    await onSelect(customer);
  };

  const save = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!phoneCountryCode || !name.trim() || digits.length < 7) {
      toast({
        title: t("Select a country calling code and enter a valid phone number"),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await customerCrmApi.upsertWalkIn({
        name: name.trim(),
        phoneCountryCode,
        phone: digits,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country || undefined,
      });
      await choose(res.data as PosCustomer);
      toast({ title: t("Customer saved") });
    } catch (error: any) {
      toast({
        title: t("Could not save customer"),
        description: error?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    return (
      <div className="rounded-xl border bg-muted/30 p-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{selected.name}</p>
            <Badge variant="secondary" className="text-[10px]">
              {selected.isRegistered ? <T>Registered</T> : <T>Walk-in</T>}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {[selected.phone, selected.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label={t("Clear selected customer")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label><T>Search by phone number</T></Label>
        <div className="flex gap-2">
          <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
            <SelectTrigger className="w-28"><SelectValue placeholder={t("Code")} /></SelectTrigger>
            <SelectContent>
              {PHONE_CODES.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-9"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t("Customer phone")}
            />
            {searching && (
              <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-lg border divide-y overflow-hidden">
          {suggestions.map((customer) => (
            <button
              key={`${customer.type}-${customer.id}`}
              type="button"
              className="w-full p-3 text-start hover:bg-muted flex items-center justify-between gap-2"
              onClick={() => void choose(customer)}
            >
              <span>
                <span className="block text-sm font-medium">{customer.name}</span>
                <span className="block text-xs text-muted-foreground">{customer.phone}</span>
              </span>
              <Badge variant="outline" className="text-[10px]">
                {customer.isRegistered ? <T>Registered</T> : <T>Walk-in</T>}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label><T>Customer name</T></Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label><T>Email</T></Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label><T>Address</T></Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><Label><T>City</T></Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
      </div>
      <Button type="button" variant="outline" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <UserPlus className="h-4 w-4 me-2" />}
        <T>Save new customer</T>
      </Button>
    </div>
  );
}
