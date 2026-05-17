import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HelpUIState {
  isChatDismissed: boolean;
  isTutorialDismissed: boolean;
  isChatShaking: boolean;
  isTutorialShaking: boolean;
  dismissChat: () => void;
  dismissTutorial: () => void;
  recallChat: () => void;
  recallTutorial: () => void;
  shakeChat: () => void;
  shakeTutorial: () => void;
}

export const useHelpUIStore = create<HelpUIState>()(
  persist(
    (set) => ({
      isChatDismissed: false,
      isTutorialDismissed: false,
      isChatShaking: false,
      isTutorialShaking: false,
      dismissChat: () => set({ isChatDismissed: true }),
      dismissTutorial: () => set({ isTutorialDismissed: true }),
      recallChat: () => set({ isChatDismissed: false }),
      recallTutorial: () => set({ isTutorialDismissed: false }),
      shakeChat: () => {
        set({ isChatShaking: true });
        setTimeout(() => set({ isChatShaking: false }), 1500);
      },
      shakeTutorial: () => {
        set({ isTutorialShaking: true });
        setTimeout(() => set({ isTutorialShaking: false }), 1500);
      },
    }),
    {
      name: "orivraa-help-ui",
    }
  )
);
