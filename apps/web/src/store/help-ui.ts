import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HelpUIState {
  isChatDismissed: boolean;
  isTutorialDismissed: boolean;
  dismissChat: () => void;
  dismissTutorial: () => void;
  recallChat: () => void;
  recallTutorial: () => void;
}

export const useHelpUIStore = create<HelpUIState>()(
  persist(
    (set) => ({
      isChatDismissed: false,
      isTutorialDismissed: false,
      dismissChat: () => set({ isChatDismissed: true }),
      dismissTutorial: () => set({ isTutorialDismissed: true }),
      recallChat: () => set({ isChatDismissed: false }),
      recallTutorial: () => set({ isTutorialDismissed: false }),
    }),
    {
      name: "orivraa-help-ui",
    }
  )
);
