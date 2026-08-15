"use client";

import { T } from "@/components/ui/T";
import Link from "next/link";

export default function WorkshopProcurementPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">
        <T>Procurement</T>
      </h1>
      <p className="text-sm text-muted-foreground">
        <T>
          Supplier lots and receiving will hang off this tower later. Use Metal
          to post an ADJUST inbound for bullion, with an optional lot id.
        </T>
      </p>
      <Link
        className="text-sm underline"
        href="/dashboard/shop/workshop/ledger"
      >
        <T>Open metal ledger</T>
      </Link>
    </div>
  );
}
