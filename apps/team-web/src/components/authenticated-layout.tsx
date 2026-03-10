"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth-guard";

const publicPaths = ["/login"];

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  return (
    <AuthGuard>
      {isPublic ? (
        <div className="min-h-screen">{children}</div>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
            {children}
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
