"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/providers/translation-provider";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTutorial } from "./useTutorial";
import { useHelpUIStore } from "@/store/help-ui";

interface TutorialButtonProps {
  className?: string;
}

export function TutorialButton({ className }: TutorialButtonProps) {
  const { steps, hasSteps } = useTutorial();
  const t = useT();
  const [running, setRunning] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { isTutorialDismissed, dismissTutorial, isTutorialShaking } = useHelpUIStore();

  /* Show bubble for 4.5 s on mount or when recalled, then on hover */
  useEffect(() => {
    if (!hasSteps || isTutorialDismissed) return;
    setBubbleVisible(true);
    const timer = setTimeout(() => setBubbleVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [hasSteps, isTutorialDismissed]);

  useEffect(() => {
    if (hovered) {
      setBubbleVisible(true);
    }
  }, [hovered]);

  // Pre-register these at render time so they're cached before the tour starts
  const nextLabel = t("Next →");
  const backLabel = t("← Back");
  const doneLabel = t("Done");
  const bubbleText = t("Ask me if you need help");

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
      nextBtnText: nextLabel,
      prevBtnText: backLabel,
      doneBtnText: doneLabel,
      onDestroyStarted: () => {
        driverObj.destroy();
        setRunning(false);
      },
      steps,
    });

    driverObj.drive();
  }, [steps, hasSteps, running, nextLabel, backLabel, doneLabel]);

  if (!hasSteps || isTutorialDismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 flex flex-col items-end gap-1.5",
        isTutorialShaking ? "animate-shake-tut" : ""
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isTutorialShaking && (
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes tut-shake {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-4px, 0) rotate(-3deg); }
            20%, 40%, 60%, 80% { transform: translate(4px, 0) rotate(3deg); }
          }
          .animate-shake-tut {
            animation: tut-shake 0.5s ease-in-out infinite;
          }
        `}} />
      )}

      {/* Speech bubble */}
      <div
        aria-hidden="true"
        className={cn(
          "relative mr-1 max-w-[180px] rounded-2xl rounded-br-none bg-amber-500 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-md",
          "transition-all duration-300",
          bubbleVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none",
        )}
      >
        {bubbleText}
        {/* Tail */}
        <span className="absolute -bottom-1.5 right-3 h-0 w-0 border-l-[6px] border-r-[0px] border-t-[6px] border-l-transparent border-t-amber-500" />
      </div>

      {/* Circle button container */}
      <div className="relative">
        <button
          onClick={startTour}
          disabled={running}
          aria-label="Start page tutorial"
          title={bubbleText}
          className={cn(
            "flex items-center justify-center",
            "w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg",
            "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
            "text-white transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            className,
          )}
        >
          <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        {/* Dismiss button */}
        {!running && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissTutorial();
            }}
            className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-white text-gray-500 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 shadow-sm z-10"
            title="Hide tutorial button"
            aria-label="Hide tutorial button"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
