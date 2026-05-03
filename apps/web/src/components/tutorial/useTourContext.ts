"use client";

import { create } from "zustand";

/**
 * Lightweight Zustand store for passing sub-page context to the tour system.
 * Pages that have multiple logical "views" (e.g., country tabs) call setSubKey()
 * so useTutorial can show the right step array for that view.
 */
interface TourContextState {
  subKey: string | null;
  setSubKey: (key: string | null) => void;
}

export const useTourContext = create<TourContextState>((set) => ({
  subKey: null,
  setSubKey: (key) => set({ subKey: key }),
}));
