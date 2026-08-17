"use client";

import { T } from "@/components/ui/T";
import { supplyChainHref } from "@/lib/workshop-route";
import Link from "next/link";

export default function WorkshopKarigarsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">
        <T>Karigars</T>
      </h1>
      <p className="text-sm text-muted-foreground">
        <T>
          People, rates, and settlements remain in this Supply Chain workspace.
          Use the Ledger view for the full karigar book, or Metal and Jobs for
          factory movements.
        </T>
      </p>
      <Link className="text-sm underline" href={supplyChainHref("tower")}>
        <T>Back to tower</T>
      </Link>
    </div>
  );
}
