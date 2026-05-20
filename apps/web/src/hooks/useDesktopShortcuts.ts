import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePreferencesStore } from "@/store/preferences";
import { toast } from "@/hooks/use-toast";

export function useDesktopShortcuts() {
  const router = useRouter();
  const dashboardMode = usePreferencesStore((s) => s.dashboardMode);
  const isAuthenticated = usePreferencesStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || dashboardMode !== "ADVANCED") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA" || (activeElement as HTMLElement)?.isContentEditable;
      
      if (isInput) return;

      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        router.push("/dashboard/shop/pos");
        toast({ title: "Quick Navigation", description: "Jumped to POS Terminal" });
      }
      else if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        router.push("/dashboard/shop/invoices/create");
        toast({ title: "Quick Navigation", description: "Quick Create Invoice" });
      }
      else if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/dashboard/shop/customers");
        toast({ title: "Quick Navigation", description: "Jumped to Customers" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, dashboardMode, isAuthenticated]);
}
