"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ═══════════════════════════════════════════════════════════
// useDesktop — Bridge between Next.js frontend and Tauri backend
// Detects desktop environment, provides offline-aware data access
// ═══════════════════════════════════════════════════════════

type InvokeFn = (
  cmd: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

/** Whether we're running inside the Tauri desktop shell */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).__TAURI_INTERNALS__;
}

/** Get the Tauri invoke function from the global window object.
 *  With `withGlobalTauri: true` in tauri.conf.json, Tauri injects
 *  `window.__TAURI__` at runtime — no npm import needed. */
function getTauriInvoke(): InvokeFn {
  const tauri = (window as any).__TAURI_INTERNALS__;
  if (!tauri?.invoke) throw new Error("Tauri IPC not available");
  return tauri.invoke;
}

// ─── Types ───────────────────────────────────────────────

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingUploads: number;
  pendingDownloads: number;
  syncInProgress: boolean;
}

export interface LocalStats {
  orders: number;
  customers: number;
  products: number;
  metalRates: number;
  drafts: number;
  syncQueue: number;
}

export interface DesktopState {
  /** True if running inside Tauri shell */
  isDesktop: boolean;
  /** True if the app can reach the server */
  isOnline: boolean;
  /** Current sync status */
  syncStatus: SyncStatus | null;
  /** Local SQLite stats */
  localStats: LocalStats | null;
  /** Whether sync/connectivity check is loading */
  loading: boolean;
}

export interface DesktopActions {
  /** Check server connectivity */
  checkConnectivity: () => Promise<boolean>;
  /** Trigger a manual sync */
  triggerSync: (shopId: string) => Promise<void>;
  /** Initialize the background sync engine */
  initSync: (shopId: string) => Promise<void>;
  /** Save auth tokens to local encrypted store */
  saveAuth: (
    token: string,
    refreshToken: string | null,
    user: object,
  ) => Promise<void>;
  /** Get stored auth token */
  getAuthToken: () => Promise<string | null>;
  /** Get cached user object */
  getCachedUser: () => Promise<object | null>;
  /** Clear auth from local store */
  clearAuth: () => Promise<void>;
  /** Get cached orders for a shop (offline-capable) */
  getCachedOrders: (shopId: string) => Promise<any[]>;
  /** Get cached customers for a shop */
  getCachedCustomers: (shopId: string) => Promise<any[]>;
  /** Get cached products for a shop */
  getCachedProducts: (shopId: string) => Promise<any[]>;
  /** Get cached metal rates */
  getCachedMetalRates: () => Promise<any[]>;
  /** Save a draft locally */
  saveDraft: (
    shopId: string,
    type: string,
    title: string,
    payload: object,
  ) => Promise<string>;
  /** Get pending drafts */
  getPendingDrafts: (shopId: string) => Promise<any[]>;
  /** Queue an API call for later sync */
  queueForSync: (
    endpoint: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    payload: object,
  ) => Promise<void>;
  /** Get local database stats */
  refreshStats: () => Promise<void>;
  /** Clear all local cached data */
  clearLocalData: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────

export function useDesktop(): DesktopState & DesktopActions {
  const isDesktop = useMemo(() => isTauri(), []);

  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [localStats, setLocalStats] = useState<LocalStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Invoke a Tauri command (no-op on web)
  const invoke = useCallback(
    async <T = unknown>(
      cmd: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      if (!isDesktop) throw new Error("Not running in desktop mode");
      const fn = getTauriInvoke();
      return fn(cmd, args) as Promise<T>;
    },
    [isDesktop],
  );

  // ── Connectivity ──

  const checkConnectivity = useCallback(async () => {
    if (!isDesktop) return true;
    try {
      const online = await invoke<boolean>("check_connectivity");
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, [isDesktop, invoke]);

  // ── Sync ──

  const triggerSync = useCallback(
    async (shopId: string) => {
      if (!isDesktop) return;
      setLoading(true);
      try {
        const result = await invoke<string>("trigger_sync", { shopId });
        console.log("[Desktop] Sync result:", JSON.parse(result));
        // Refresh status after sync
        const statusJson = await invoke<string>("get_sync_status");
        setSyncStatus(JSON.parse(statusJson));
      } finally {
        setLoading(false);
      }
    },
    [isDesktop, invoke],
  );

  const initSync = useCallback(
    async (shopId: string) => {
      if (!isDesktop) return;
      try {
        await invoke("init_sync_engine", { shopId });
        console.log("[Desktop] Sync engine initialized for shop:", shopId);
      } catch (e) {
        console.warn("[Desktop] Failed to init sync engine:", e);
      }
    },
    [isDesktop, invoke],
  );

  // ── Auth ──

  const saveAuth = useCallback(
    async (token: string, refreshToken: string | null, user: object) => {
      if (!isDesktop) return;
      await invoke("save_auth_token", {
        token,
        refreshToken,
        userJson: JSON.stringify(user),
      });
    },
    [isDesktop, invoke],
  );

  const getAuthToken = useCallback(async () => {
    if (!isDesktop) return null;
    return invoke<string | null>("get_auth_token");
  }, [isDesktop, invoke]);

  const getCachedUser = useCallback(async () => {
    if (!isDesktop) return null;
    const json = await invoke<string | null>("get_cached_user");
    return json ? JSON.parse(json) : null;
  }, [isDesktop, invoke]);

  const clearAuth = useCallback(async () => {
    if (!isDesktop) return;
    await invoke("clear_auth");
  }, [isDesktop, invoke]);

  // ── Cached Data ──

  const getCachedOrders = useCallback(
    async (shopId: string) => {
      if (!isDesktop) return [];
      const json = await invoke<string>("get_cached_orders", { shopId });
      return JSON.parse(json);
    },
    [isDesktop, invoke],
  );

  const getCachedCustomers = useCallback(
    async (shopId: string) => {
      if (!isDesktop) return [];
      const json = await invoke<string>("get_cached_customers", { shopId });
      return JSON.parse(json);
    },
    [isDesktop, invoke],
  );

  const getCachedProducts = useCallback(
    async (shopId: string) => {
      if (!isDesktop) return [];
      const json = await invoke<string>("get_cached_products", { shopId });
      return JSON.parse(json);
    },
    [isDesktop, invoke],
  );

  const getCachedMetalRates = useCallback(async () => {
    if (!isDesktop) return [];
    const json = await invoke<string>("get_cached_metal_rates");
    return JSON.parse(json);
  }, [isDesktop, invoke]);

  // ── Drafts ──

  const saveDraft = useCallback(
    async (shopId: string, type: string, title: string, payload: object) => {
      if (!isDesktop) throw new Error("Drafts only available in desktop mode");
      return invoke<string>("save_draft", {
        shopId,
        draftType: type,
        title,
        payload: JSON.stringify(payload),
      });
    },
    [isDesktop, invoke],
  );

  const getPendingDrafts = useCallback(
    async (shopId: string) => {
      if (!isDesktop) return [];
      const json = await invoke<string>("get_pending_drafts", { shopId });
      return JSON.parse(json);
    },
    [isDesktop, invoke],
  );

  // ── Sync Queue ──

  const queueForSync = useCallback(
    async (
      endpoint: string,
      action: "CREATE" | "UPDATE" | "DELETE",
      payload: object,
    ) => {
      if (!isDesktop) return;
      await invoke("add_to_sync_queue", {
        endpoint,
        action,
        payload: JSON.stringify(payload),
      });
    },
    [isDesktop, invoke],
  );

  // ── Stats ──

  const refreshStats = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const json = await invoke<string>("get_local_stats");
      setLocalStats(JSON.parse(json));
    } catch (e) {
      console.warn("[Desktop] Failed to get local stats:", e);
    }
  }, [isDesktop, invoke]);

  const clearLocalData = useCallback(async () => {
    if (!isDesktop) return;
    await invoke("clear_local_data");
    setLocalStats(null);
  }, [isDesktop, invoke]);

  // ── Auto-check connectivity on mount ──

  useEffect(() => {
    if (!isDesktop) return;

    checkConnectivity();
    refreshStats();

    // Periodic connectivity check every 30s
    const interval = setInterval(() => {
      checkConnectivity();
    }, 30_000);

    return () => clearInterval(interval);
  }, [isDesktop, checkConnectivity, refreshStats]);

  return {
    // State
    isDesktop,
    isOnline,
    syncStatus,
    localStats,
    loading,
    // Actions
    checkConnectivity,
    triggerSync,
    initSync,
    saveAuth,
    getAuthToken,
    getCachedUser,
    clearAuth,
    getCachedOrders,
    getCachedCustomers,
    getCachedProducts,
    getCachedMetalRates,
    saveDraft,
    getPendingDrafts,
    queueForSync,
    refreshStats,
    clearLocalData,
  };
}
