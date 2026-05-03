"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/providers/translation-provider";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTutorial } from "./useTutorial";

interface TutorialButtonProps {
  className?: string;
}

export function TutorialButton({ className }: TutorialButtonProps) {
  const { steps, hasSteps } = useTutorial();
  const t = useT();
  const [running, setRunning] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  /* Show bubble for 3 s on first mount, then on hover */
  useEffect(() => {
    if (!hasSteps) return;
    setBubbleVisible(true);
    const timer = setTimeout(() => setBubbleVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [hasSteps]);

  useEffect(() => {
    setBubbleVisible(hovered);
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

  if (!hasSteps) return null;

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
