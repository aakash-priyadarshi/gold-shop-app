"use client";

import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";

/**
 * Bridges next-themes with the server-persisted themeMode.
 *
 * - On login / mount: reads user.themeMode from auth context and applies it
 *   via next-themes' setTheme().
 * - Exposes a global helper (window.__saveThemeToServer) that the header and
 *   dashboard theme toggles call after changing the theme so the choice is
 *   persisted to the backend without a full round-trip import.
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { setTheme, theme } = useTheme();
  const appliedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);

  // Persist theme to backend
  const saveThemeToServer = useCallback(
    async (themeMode: string) => {
      if (!isAuthenticated) return;
      if (lastSavedRef.current === themeMode) return; // skip duplicate saves
      lastSavedRef.current = themeMode;
      try {
        await api.patch("/users/me/preferences", { themeMode });
      } catch (err) {
        console.error("[ThemeSync] Failed to save theme:", err);
      }
    },
    [isAuthenticated],
  );

  // On login: apply server-saved preference
  useEffect(() => {
    if (!isAuthenticated || !user?.themeMode || appliedRef.current) return;
    const serverTheme = user.themeMode; // "light" | "dark" | "system"
    setTheme(serverTheme);
    lastSavedRef.current = serverTheme;
    appliedRef.current = true;
  }, [isAuthenticated, user?.themeMode, setTheme]);

  // Reset on logout so next login re-applies
  useEffect(() => {
    if (!isAuthenticated) {
      appliedRef.current = false;
      lastSavedRef.current = null;
    }
  }, [isAuthenticated]);

  // Expose the save function globally so toggle buttons can call it
  useEffect(() => {
    (window as any).__saveThemeToServer = saveThemeToServer;
    return () => {
      delete (window as any).__saveThemeToServer;
    };
  }, [saveThemeToServer]);

  return <>{children}</>;
}
