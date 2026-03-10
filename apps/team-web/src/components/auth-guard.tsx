"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

const publicPaths = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
    }
    if (isAuthenticated && isPublic) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isPublic, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !isPublic) return null;
  if (isAuthenticated && isPublic) return null;

  return <>{children}</>;
}
