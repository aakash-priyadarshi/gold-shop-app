"use client";

import { cn } from "@/lib/utils";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTutorial } from "./useTutorial";

interface TutorialButtonProps {
  className?: string;
}

export function TutorialButton({ className }: TutorialButtonProps) {
  const { steps, hasSteps } = useTutorial();
  const [running, setRunning] = useState(false);

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
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      onDestroyStarted: () => {
        driverObj.destroy();
        setRunning(false);
      },
      steps,
    });

    driverObj.drive();
  }, [steps, hasSteps, running]);

  if (!hasSteps) return null;

  return (
    <button
      onClick={startTour}
      disabled={running}
      aria-label="Start page tutorial"
      title="How to use this page"
      className={cn(
        "fixed bottom-24 right-6 z-40 flex items-center justify-center",
        "w-12 h-12 rounded-full shadow-lg",
        "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
        "text-white transition-colors",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
}
