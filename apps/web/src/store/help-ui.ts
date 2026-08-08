import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HelpUIState {
  isChatDismissed: boolean;
  isTutorialDismissed: boolean;
  isChatShaking: boolean;
  isTutorialShaking: boolean;
  /** True once the mobile onboarding tour has auto-launched for this user. */
  hasAutoLaunchedMobileTour: boolean;
  /** True once the "Ask me if you need help" bubble has been shown this session/device. */
  hasSeenTutorialBubble: boolean;
  dismissChat: () => void;
  dismissTutorial: () => void;
  recallChat: () => void;
  recallTutorial: () => void;
  shakeChat: () => void;
  shakeTutorial: () => void;
  markMobileTourAutoLaunched: () => void;
  markTutorialBubbleSeen: () => void;
}

export const useHelpUIStore = create<HelpUIState>()(
  persist(
    (set) => ({
      isChatDismissed: false,
      isTutorialDismissed: false,
      isChatShaking: false,
      isTutorialShaking: false,
      hasAutoLaunchedMobileTour: false,
      hasSeenTutorialBubble: false,
      dismissChat: () => set({ isChatDismissed: true }),
      dismissTutorial: () => set({ isTutorialDismissed: true }),
      recallChat: () => set({ isChatDismissed: false }),
      recallTutorial: () => set({ isTutorialDismissed: false, hasSeenTutorialBubble: false }),
      shakeChat: () => {
        set({ isChatShaking: true });
        setTimeout(() => set({ isChatShaking: false }), 1500);
      },
      shakeTutorial: () => {
        set({ isTutorialShaking: true });
        setTimeout(() => set({ isTutorialShaking: false }), 1500);
      },
      markMobileTourAutoLaunched: () => set({ hasAutoLaunchedMobileTour: true }),
      markTutorialBubbleSeen: () => set({ hasSeenTutorialBubble: true }),
    }),
    {
      name: "orivraa-help-ui",
    }
  )
);

export const OPEN_SUPPORT_CHAT_EVENT = "orivraa:open-support-chat";

export function requestSupportChat(options: { message?: string } = {}) {
  useHelpUIStore.getState().recallChat();
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_SUPPORT_CHAT_EVENT, { detail: options }),
  );
}
