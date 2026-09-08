"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { exitSupportSession, getSupportToken } from "@/lib/support-session";
import { T } from "@/components/ui/T";

export function SupportSessionBanner() {
  const [active, setActive] = useState(false);
  const [info, setInfo] = useState<{
    shopName: string;
    adminName: string;
    expiresAt: string;
    permissions: string[];
  } | null>(null);
  useEffect(() => {
    if (!getSupportToken()) return;
    setActive(true);
    const check = () => {
      void api
        .get("/support-access/session")
        .then((r) => setInfo(r.data))
        .catch(() => exitSupportSession());
    };
    check();
    const timer = window.setInterval(check, 15_000);
    let lastActivity = 0;
    const activity = () => {
      if (Date.now() - lastActivity < 60_000) return;
      lastActivity = Date.now();
      void api
        .post("/support-access/session/activity")
        .catch(() => exitSupportSession());
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("scroll", activity, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity, true);
    };
  }, []);
  if (!active) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-950"
      data-tour="support-session-banner"
    >
      <div>
        <strong>
          <T>Support access</T> · {info?.shopName}
        </strong>
        <span className="ml-2">
          {info?.adminName} ·{" "}
          {info?.permissions.length ? (
            <T>Selected changes allowed</T>
          ) : (
            <T>Read-only</T>
          )}{" "}
          · <T>Screen recording off</T>
        </span>
        {info && (
          <p className="text-xs">
            <T>Session ends</T> {new Date(info.expiresAt).toLocaleString()}
          </p>
        )}
      </div>
      <button
        className="rounded border border-amber-700 px-3 py-1 font-medium"
        onClick={async () => {
          try {
            await api.post("/support-access/session/end");
          } finally {
            exitSupportSession();
          }
        }}
      >
        <T>Exit support access</T>
      </button>
    </div>
  );
}
