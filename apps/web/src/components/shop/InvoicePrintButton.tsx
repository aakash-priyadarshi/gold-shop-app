"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { isPhoneLikeDevice } from "@/lib/invoiceShare";
import {
  resolveInvoicePrintTarget,
  type InvoicePrintTarget,
} from "@/lib/invoicePrintTarget";
import {
  HARDWARE_CONFIG_CHANGED,
  printReceipt,
  type ReceiptPayload,
} from "@/lib/posHardware";
import { useT } from "@/providers/translation-provider";
import { ChevronDown, Loader2, Printer, Receipt, Wrench } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export interface InvoicePrintButtonProps {
  /** HTML A4 / office print (window.print dialog). */
  onSystemPrint: () => boolean | Promise<boolean | void>;
  receiptPayload?: ReceiptPayload | null;
  size?: "sm" | "default";
  className?: string;
}

export function InvoicePrintButton({
  onSystemPrint,
  receiptPayload,
  size = "sm",
  className = "",
}: InvoicePrintButtonProps) {
  const t = useT();
  const [target, setTarget] = useState<InvoicePrintTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  const refreshTarget = useCallback(() => {
    void resolveInvoicePrintTarget().then(setTarget);
  }, []);

  useEffect(() => {
    setIsPhone(isPhoneLikeDevice());
  }, []);

  useEffect(() => {
    refreshTarget();
    const onChanged = () => refreshTarget();
    window.addEventListener(HARDWARE_CONFIG_CHANGED, onChanged);
    window.addEventListener("focus", onChanged);
    return () => {
      window.removeEventListener(HARDWARE_CONFIG_CHANGED, onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, [refreshTarget]);

  const runSystemPrint = async () => {
    const ok = await onSystemPrint();
    if (ok === false) {
      toast({
        variant: "destructive",
        title: t("Pop-ups blocked"),
        description: t("Allow pop-ups to print the bill"),
      });
    }
  };

  const runThermalPrint = async (osPrinterName?: string) => {
    if (!receiptPayload) {
      toast({
        variant: "destructive",
        title: t("Nothing to print"),
      });
      return;
    }
    await printReceipt(receiptPayload, {
      osPrinterName: osPrinterName || target?.osPrinterName,
    });
    toast({
      title: t("Sent to thermal receipt printer"),
      description: osPrinterName || target?.deviceName,
    });
  };

  const printAuto = async () => {
    setBusy(true);
    try {
      const next = await resolveInvoicePrintTarget();
      setTarget(next);
      if (next.mode === "thermal") {
        try {
          if (!receiptPayload) {
            toast({
              variant: "destructive",
              title: t("Nothing to print"),
            });
            return;
          }
          await printReceipt(receiptPayload, {
            osPrinterName:
              next.transport === "os" ? next.osPrinterName : undefined,
          });
          toast({
            title: t("Sent to thermal receipt printer"),
            description: next.deviceName,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "";
          toast({
            title: t("Thermal printer not ready"),
            description:
              message || t("Opening the A4 / office print dialog instead."),
          });
          await runSystemPrint();
        }
        return;
      }
      await runSystemPrint();
    } finally {
      setBusy(false);
    }
  };

  const printForced = async (
    mode: "thermal" | "system",
    osPrinterName?: string,
  ) => {
    setBusy(true);
    try {
      if (mode === "thermal") {
        try {
          await runThermalPrint(osPrinterName);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "";
          toast({
            variant: "destructive",
            title: t("Thermal print failed"),
            description:
              message ||
              t("Pair the printer in Settings → Receipt printer."),
          });
        }
        return;
      }
      await runSystemPrint();
    } finally {
      setBusy(false);
    }
  };

  const btn = size === "sm" ? "sm" : "default";
  const subtitle = target?.subtitle || "A4 / office printer";
  const hardwareHref = isPhone
    ? "/m/settings/hardware"
    : "/dashboard/shop/settings/hardware";
  const detected = target?.detected ?? [];

  return (
    <div className={`inline-flex ${className}`}>
      <Button
        variant="outline"
        size={btn}
        className="rounded-r-none h-auto min-h-9 py-1"
        onClick={() => void printAuto()}
        disabled={busy}
        data-tour="invoice-print"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : target?.mode === "thermal" ? (
          <Receipt className="h-4 w-4 mr-2 shrink-0" />
        ) : (
          <Printer className="h-4 w-4 mr-2 shrink-0" />
        )}
        <span className="flex flex-col items-start leading-tight text-left">
          <span>
            <T>Print</T>
          </span>
          <span className="text-[10px] font-normal text-muted-foreground max-w-[160px] truncate">
            {subtitle}
          </span>
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={btn}
            className="rounded-l-none border-l-0 px-2"
            disabled={busy}
            aria-label={t("Choose printer type")}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>
            <T>Where should this print?</T>
          </DropdownMenuLabel>
          {detected.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                <T>Detected on this device</T>
              </p>
              {detected.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() =>
                    void printForced(
                      item.kind,
                      item.source === "os" && item.kind === "thermal"
                        ? item.name
                        : undefined,
                    )
                  }
                >
                  {item.kind === "thermal" ? (
                    <Receipt className="h-4 w-4 mr-2 shrink-0" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">
                      {item.name}
                      {item.isDefault ? " (default)" : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.kind === "thermal" ? (
                        <T>Thermal receipt</T>
                      ) : (
                        <T>A4 / office</T>
                      )}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void printForced("system")}>
            <Printer className="h-4 w-4 mr-2 shrink-0" />
            <div className="flex flex-col">
              <span>
                <T>A4 / office printer</T>
              </span>
              <span className="text-[11px] text-muted-foreground">
                <T>Full bill — Wi-Fi, USB, or printers already on this PC</T>
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void printForced("thermal")}>
            <Receipt className="h-4 w-4 mr-2 shrink-0" />
            <div className="flex flex-col">
              <span>
                <T>Thermal receipt (58/80mm roll)</T>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {target?.mode === "thermal"
                  ? target.deviceName
                  : t("Short receipt — pair one in Receipt printer settings")}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={hardwareHref}>
              <Wrench className="h-4 w-4 mr-2" />
              <T>Set up receipt printer</T>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
