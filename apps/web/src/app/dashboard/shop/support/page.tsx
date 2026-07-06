"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import UserSupportPage from "@/components/support/UserSupportPage";

export default function ShopSupportPage() {
  return (
    <ShopGuard>
      <UserSupportPage />
    </ShopGuard>
  );
}
