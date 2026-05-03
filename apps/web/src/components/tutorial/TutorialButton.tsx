"use client";

import { cn } from "@/lib/utils";
import { usePreferencesStore, type Language } from "@/store/preferences";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTutorial } from "./useTutorial";

interface TutorialButtonProps {
  className?: string;
}

/* ── per-language chat-bubble text ── */
const BUBBLE_TEXT: Record<Language, string> = {
  en: "Ask me if you need help",
  hi: "मदद चाहिए तो पूछें",
  ne: "सहायता चाहिए भने सोध्नुहोस्",
  fr: "Posez-moi vos questions",
  de: "Fragen Sie mich",
  ar: "اسألني إذا كنت بحاجة للمساعدة",
  es: "Pregúntame si necesitas ayuda",
};

/* ── per-language driver.js button labels ── */
const DRIVER_LABELS: Record<Language, { next: string; prev: string; done: string }> = {
  en: { next: "Next →", prev: "← Back", done: "Done" },
  hi: { next: "अगला →", prev: "← वापस", done: "समाप्त" },
  ne: { next: "अर्को →", prev: "← फिर्ता", done: "सम्पन्न" },
  fr: { next: "Suivant →", prev: "← Retour", done: "Terminer" },
  de: { next: "Weiter →", prev: "← Zurück", done: "Fertig" },
  ar: { next: "التالي →", prev: "← السابق", done: "تم" },
  es: { next: "Siguiente →", prev: "← Atrás", done: "Listo" },
};

export function TutorialButton({ className }: TutorialButtonProps) {
  const { steps, hasSteps } = useTutorial();
  const language = usePreferencesStore((s) => s.tourLanguage);
  const [running, setRunning] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  /* Show bubble for 3 s on first mount, then on hover */
  useEffect(() => {
    if (!hasSteps) return;
    setBubbleVisible(true);
    const t = setTimeout(() => setBubbleVisible(false), 3000);
    return () => clearTimeout(t);
  }, [hasSteps]);

  useEffect(() => {
    setBubbleVisible(hovered);
  }, [hovered]);

  const labels = DRIVER_LABELS[language] ?? DRIVER_LABELS.en;

  const startTour = useCallback(() => {
    if (!hasSteps || running) return;

    setRunning(true);

    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: "rgba(0,0,0,0.6)",
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: "orivraa-tour-popover",
      progressText: "{{current}} / {{total}}",
      nextBtnText: labels.next,
      prevBtnText: labels.prev,
      doneBtnText: labels.done,
      onDestroyStarted: () => {
        driverObj.destroy();
        setRunning(false);
      },
      steps,
    });

    driverObj.drive();
  }, [steps, hasSteps, running, labels]);

  if (!hasSteps) return null;

  const bubbleText = BUBBLE_TEXT[language] ?? BUBBLE_TEXT.en;

  return (
    <div
      className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Speech bubble */}
      <div
        aria-hidden="true"
        className={cn(
          "relative mr-1 max-w-[180px] rounded-2xl rounded-br-none bg-amber-500 px-3 py-2 text-xs font-medium text-white shadow-md",
          "transition-all duration-300",
          bubbleVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none",
        )}
      >
        {bubbleText}
        {/* Tail */}
        <span className="absolute -bottom-2 right-3 h-0 w-0 border-l-[8px] border-r-[0px] border-t-[8px] border-l-transparent border-t-amber-500" />
      </div>

      {/* Circle button */}
      <button
        onClick={startTour}
        disabled={running}
        aria-label="Start page tutorial"
        title={bubbleText}
        className={cn(
          "flex items-center justify-center",
          "w-12 h-12 rounded-full shadow-lg",
          "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
          "text-white transition-colors",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
