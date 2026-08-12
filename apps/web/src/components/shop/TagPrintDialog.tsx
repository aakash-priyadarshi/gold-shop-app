"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useToast } from "@/hooks/use-toast";
import {
  printStockJewelleryTags,
  TAG_LAYOUTS,
  type JewelleryTagItem,
  type TagLayoutId,
} from "@/lib/jewelleryTagPrint";
import { useT } from "@/providers/translation-provider";
import { Loader2, Printer } from "lucide-react";
import { useState } from "react";

export function TagPrintDialog({
  open,
  onOpenChange,
  items,
  authorizeMultiTagPrint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: JewelleryTagItem[];
  /** Calls the Pro-gated API and returns current, server-authoritative tag data. */
  authorizeMultiTagPrint?: (itemIds: string[], copies: number) => Promise<JewelleryTagItem[]>;
}) {
  const { toast } = useToast();
  const t = useT();
  const [layoutId, setLayoutId] = useState<TagLayoutId>("A4_3X7");
  const [copies, setCopies] = useState(1);
  const [includeQr, setIncludeQr] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeRfid, setIncludeRfid] = useState(true);
  const [printing, setPrinting] = useState(false);

  const totalLabels = items.length * copies;
  const needsMultiTagEntitlement = totalLabels > 1;

  const handlePrint = async () => {
    if (!items.length) return;
    setPrinting(true);
    try {
      let printableItems = items;
      if (needsMultiTagEntitlement) {
        const ids = items.map((item) => item.id).filter((id): id is string => !!id);
        if (!authorizeMultiTagPrint || ids.length !== items.length) {
          throw new Error(t("Multi-tag printing needs saved inventory pieces."));
        }
        printableItems = await authorizeMultiTagPrint(ids, copies);
      }
      await printStockJewelleryTags(printableItems, {
        layoutId,
        copies,
        includeQr,
        includeBarcode,
        includeRfid,
      });
      toast({ title: t("Tag print started"), description: t(`${totalLabels} tag(s) prepared`) });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("Could not print tags"),
        description: error?.response?.data?.message || error?.message || t("Check your printer settings and plan."),
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle><T>Print jewellery tags</T></DialogTitle>
          <DialogDescription>
            {items.length} <T>piece(s) selected. QR holds the inventory identity; barcode and RFID remain separate identifiers.</T>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label><T>Page or label size</T></Label>
            <select
              value={layoutId}
              onChange={(event) => setLayoutId(event.target.value as TagLayoutId)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TAG_LAYOUTS.map((layout) => (
                <option key={layout.id} value={layout.id}>{layout.label} — {layout.description}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="tag-copies"><T>Copies per piece</T></Label>
            <input
              id="tag-copies"
              type="number"
              min={1}
              max={50}
              value={copies}
              onChange={(event) => setCopies(Math.min(Math.max(Number(event.target.value) || 1, 1), 50))}
              className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 text-sm">
            <label className="flex items-center gap-2"><Checkbox checked={includeQr} onCheckedChange={(checked) => setIncludeQr(checked === true)} /><T>Include QR code</T></label>
            <label className="flex items-center gap-2"><Checkbox checked={includeBarcode} onCheckedChange={(checked) => setIncludeBarcode(checked === true)} /><T>Include scanner-readable barcode</T></label>
            <label className="flex items-center gap-2"><Checkbox checked={includeRfid} onCheckedChange={(checked) => setIncludeRfid(checked === true)} /><T>Print RFID/EPC text when assigned</T></label>
          </div>
          {needsMultiTagEntitlement && (
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <T>Multi-tag sheets and multiple copies are a Pro feature. Your plan is checked securely before anything is printed.</T>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={printing}><T>Cancel</T></Button>
          <Button onClick={handlePrint} disabled={printing || !items.length}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            <T>Print</T> ({totalLabels})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
