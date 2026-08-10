"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { shopsApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onVerified: () => void | Promise<void>;
};

/**
 * Prompts for the shop manager PIN before high-clearance actions
 * (discounts, voids, stock audit complete, inventory adjustments).
 */
export function ManagerPinDialog({
  open,
  onOpenChange,
  title,
  description,
  onVerified,
}: Props) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      toast({
        title: t("Invalid PIN"),
        description: t("Enter a 4–8 digit manager PIN"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await shopsApi.verifyManagerPin(pin);
      setPin("");
      await onVerified();
    } catch (e: any) {
      toast({
        title: t("PIN rejected"),
        description: e?.response?.data?.message || t("Incorrect manager PIN"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setPin("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            {title || <T>Manager clearance</T>}
          </DialogTitle>
          <DialogDescription>
            {description || (
              <T>
                Enter the shop manager PIN to authorize this action.
              </T>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="manager-pin">
            <T>Manager PIN</T>
          </Label>
          <Input
            id="manager-pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="••••"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <T>Cancel</T>
          </Button>
          <Button onClick={submit} disabled={loading || pin.length < 4}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <T>Authorize</T>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
