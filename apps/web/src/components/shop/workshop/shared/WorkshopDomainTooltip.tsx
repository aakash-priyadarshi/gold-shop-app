"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";

export const WORKSHOP_GLOSSARY = {
  gold995:
    "0.995 fine gold — the standard industrial pure gold benchmark, replacing legacy 24K bullion.",
  theoretical:
    "Target designed weight and purity based on bill of materials. Does not move physical stock.",
  recommended:
    "Calculated quantity based on the production recipe. It does not change physical stock.",
  actual:
    "Physical quantity confirmed from a scale reading. This changes traceable Workshop stock.",
  stableNet:
    "Physical scale weight after hardware tare. Confirms stable net reading.",
  capture:
    "Stores the stable physical scale reading. Stock is not posted until Confirm.",
  confirm:
    "Authoritative posting of scale reading to the double-entry physical metal ledger.",
  recoveryPending:
    "Collected physical residue waiting for recovery/refining or classification.",
  processVariance:
    "Difference between process inputs and outputs classified as operational variance.",
  transferVariance:
    "Discrepancy between dispatch scale weight and receive scale weight across departments.",
  reconciliationPending:
    "Process run output waiting for supervisor remainder classification.",
  assay:
    "Laboratory testing of metal purity. Optional before refinery settlement.",
  manualOverride:
    "Exceptional manual entry of weight when hardware scale is unavailable. Logged in audit trail.",
  correctionReversal:
    "Immutable accounting reversal creating an offset entry and replacement record.",
} as const satisfies Record<string, string>;

export type WorkshopGlossaryTerm = keyof typeof WORKSHOP_GLOSSARY;

export interface WorkshopDomainTooltipProps {
  term?: WorkshopGlossaryTerm;
  text?: string;
  className?: string;
}

export function WorkshopDomainTooltip({
  term,
  text,
  className = "inline-flex items-center ml-1 text-muted-foreground hover:text-foreground transition-colors cursor-help",
}: WorkshopDomainTooltipProps) {
  const t = useT();
  const content = text || (term ? WORKSHOP_GLOSSARY[term] : undefined);
  if (!content) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className} tabIndex={0} role="button" aria-label={t("Help info")}>
            <Info className="h-3 w-3 inline" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs font-normal">
          <T>{content}</T>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
