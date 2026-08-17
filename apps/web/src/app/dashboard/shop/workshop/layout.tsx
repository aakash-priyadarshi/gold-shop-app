"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { legacyWorkshopDestination } from "@/lib/workshop-route";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WorkshopLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    router.replace(
      legacyWorkshopDestination(
        pathname,
        typeof window === "undefined"
          ? ""
          : window.location.search.replace(/^\?/, ""),
      ),
    );
  }, [pathname, router]);

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <T>Opening Supply Chain…</T>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
