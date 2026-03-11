"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Agents page has been merged into the Sales Agents (personas) page.
 * This page redirects to /ai-sales/personas for backward compatibility.
 */
export default function AgentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/ai-sales/personas"); }, [router]);
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Redirecting to Sales Agents...
    </div>
  );
}
