"use client";

import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";
import { Gem, List, Sparkles } from "lucide-react";
import Link from "next/link";

export default function MobileRfqLandingPage() {
  return (
    <div className="px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Gem className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          <T>Custom jewellery request</T>
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          <T>
            Describe your design, get quotes from verified jewellers, and track
            your order.
          </T>
        </p>
      </div>

      <div className="space-y-3">
        <Button className="w-full h-12 bg-amber-500 hover:bg-amber-600" asChild>
          <Link href="/rfq/create">
            <Sparkles className="h-4 w-4 mr-2" />
            <T>Start full design wizard</T>
          </Link>
        </Button>
        <Button variant="outline" className="w-full h-12" asChild>
          <Link href="/dashboard/customer/rfqs">
            <List className="h-4 w-4 mr-2" />
            <T>My quote requests</T>
          </Link>
        </Button>
        <Button variant="outline" className="w-full h-12" asChild>
          <Link href="/m/customer/orders">
            <T>My marketplace orders</T>
          </Link>
        </Button>
      </div>
    </div>
  );
}
