"use client";

import { useEffect, useState } from "react";
import { onSyncChange, pendingCount } from "@/lib/offline/sync";

/**
 * Reactive online/offline status. SSR-safe (defaults to online so the first
 * paint matches the server) and updates on the browser's connectivity events.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

/** Number of mutations still waiting to sync to the server. */
export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      pendingCount()
        .then((c) => {
          if (active) setCount(c);
        })
        .catch(() => {});
    };
    refresh();
    const unsub = onSyncChange(refresh);
    return () => {
      active = false;
      unsub();
    };
  }, []);

  return count;
}
