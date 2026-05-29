"use client";

import { useEffect } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOnline, usePendingSyncCount } from "@/hooks/useOnline";
import { flushOutbox, startSyncEngine } from "@/lib/offline/sync";

/**
 * Mounts the offline sync engine and shows a connectivity banner for the
 * mobile shopkeeper app. Drop this inside the `/m` layout.
 *
 * - Starts background replay of the outbox on reconnect / tab focus.
 * - Shows "Offline — saved on this device" when there's no connection.
 * - Shows "Syncing N change(s)…" while the queue drains.
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const online = useOnline();
  const pending = usePendingSyncCount();

  useEffect(() => {
    const stop = startSyncEngine();
    return stop;
  }, []);

  const showBanner = !online || pending > 0;

  return (
    <>
      {showBanner && (
        <div
          role="status"
          className={`fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-medium ${
            !online
              ? "bg-gray-800 text-gray-100"
              : "bg-amber-500 text-white"
          }`}
        >
          {!online ? (
            <>
              <CloudOff className="h-3.5 w-3.5" />
              <span>Offline — your work is saved on this device</span>
            </>
          ) : (
            <button
              onClick={() => void flushOutbox()}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>
                Syncing {pending} change{pending === 1 ? "" : "s"}…
              </span>
            </button>
          )}
        </div>
      )}
      {children}
    </>
  );
}
