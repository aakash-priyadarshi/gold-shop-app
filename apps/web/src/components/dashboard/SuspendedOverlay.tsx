"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LifeBuoy, Lock, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";

/**
 * SuspendedOverlay — shown on top of the dashboard when the user's account is suspended.
 * Displays a lock visual with chains from all 4 corners, and only allows
 * contacting support or logging out.
 */
export function SuspendedOverlay() {
  const { user, logout } = useAuth();

  if (!user || user.status !== "SUSPENDED") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Chain lines from corners — CSS drawn */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        {/* Top-left to center */}
        <line
          x1="0"
          y1="0"
          x2="50%"
          y2="50%"
          stroke="#a1a1aa"
          strokeWidth="3"
          strokeDasharray="12 8"
          className="animate-pulse"
        />
        {/* Top-right to center */}
        <line
          x1="100%"
          y1="0"
          x2="50%"
          y2="50%"
          stroke="#a1a1aa"
          strokeWidth="3"
          strokeDasharray="12 8"
          className="animate-pulse"
          style={{ animationDelay: "0.25s" }}
        />
        {/* Bottom-left to center */}
        <line
          x1="0"
          y1="100%"
          x2="50%"
          y2="50%"
          stroke="#a1a1aa"
          strokeWidth="3"
          strokeDasharray="12 8"
          className="animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        {/* Bottom-right to center */}
        <line
          x1="100%"
          y1="100%"
          x2="50%"
          y2="50%"
          stroke="#a1a1aa"
          strokeWidth="3"
          strokeDasharray="12 8"
          className="animate-pulse"
          style={{ animationDelay: "0.75s" }}
        />
      </svg>

      {/* Chain link decorations at corners */}
      {[
        "top-3 left-3",
        "top-3 right-3",
        "bottom-3 left-3",
        "bottom-3 right-3",
      ].map((pos, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-10 h-10 rounded-full border-4 border-zinc-400/60 flex items-center justify-center animate-pulse",
            pos,
          )}
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          <div className="w-4 h-4 rounded-full border-2 border-zinc-500/50" />
        </div>
      ))}

      {/* Center lock card */}
      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          {/* Lock icon */}
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mb-6 ring-4 ring-red-100">
            <Lock className="h-12 w-12 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Account Suspended
          </h1>
          <p className="text-base text-gray-500 mb-1">
            अकाउंट सस्पेंड कर दिया गया है
          </p>

          {/* Shield warning icon */}
          <div className="flex items-center justify-center gap-2 my-4">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">
              Your account has been restricted
            </span>
          </div>

          {/* Explanation */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2">
              Your account has been suspended due to policy violations. All
              dashboard features are locked.
            </p>
            <p className="text-sm text-gray-600">
              आपका अकाउंट नीति उल्लंघन के कारण सस्पेंड किया गया है। सभी डैशबोर्ड
              फीचर्स लॉक हैं।
            </p>
            <p className="text-xs text-gray-500 mt-2">
              To restore access, please contact our support team or create a
              support ticket.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link href="/help" className="block">
              <Button className="w-full h-12 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl text-base font-semibold shadow-lg shadow-gold-500/25">
                <LifeBuoy className="h-5 w-5 mr-2" />
                Contact Support / सपोर्ट से संपर्क करें
              </Button>
            </Link>
            <Link href="/platform-guidelines" className="block">
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-sm"
              >
                Read Platform Guidelines
              </Button>
            </Link>
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 h-10 text-sm text-red-600 hover:bg-red-50 rounded-xl transition font-medium"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
