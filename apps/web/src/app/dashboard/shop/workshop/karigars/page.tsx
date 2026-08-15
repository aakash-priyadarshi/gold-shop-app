"use client";

import { T } from "@/components/ui/T";
import Link from "next/link";

export default function WorkshopKarigarsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">
        <T>Karigars</T>
      </h1>
      <p className="text-sm text-muted-foreground">
        <T>
          People, rates, and settlements stay on the shop karigar book for now.
          Open Supply Chain only when Workshop mode is off — with Workshop mode
          on, manage karigars from Metal and Jobs.
        </T>
      </p>
      <Link className="text-sm underline" href="/dashboard/shop/workshop">
        <T>Back to tower</T>
      </Link>
    </div>
  );
}
