"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/providers/translation-provider";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { translateTourSteps } from "./translate-tour-steps";
import { useTutorial } from "./useTutorial";
import {
  collectTourStrings,
  waitForTranslations,
} from "./wait-for-tour-translations";
import { useHelpUIStore } from "@/store/help-ui";
import { usePathname } from "next/navigation";
import { LANGUAGES, usePreferencesStore, type Language } from "@/store/preferences";

interface TutorialButtonProps {
  className?: string;
}

export function TutorialButton({ className }: TutorialButtonProps) {
  const { rawSteps, hasSteps } = useTutorial();
  const { t, register, locale, hasTranslation } = useTranslation();
  const pathname = usePathname();
  const isMobile = pathname.startsWith("/m/") || pathname === "/m";
  const [running, setRunning] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const {
    isTutorialDismissed,
    dismissTutorial,
    isTutorialShaking,
    hasAutoLaunchedMobileTour,
    markMobileTourAutoLaunched,
    hasSeenTutorialBubble,
    markTutorialBubbleSeen,
  } = useHelpUIStore();

  // Drag-to-dismiss state (mobile only)
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDismissZone, setIsOverDismissZone] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragInfo = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const DISMISS_ZONE_RADIUS = 50;

  const checkDismissZone = useCallback((clientX: number, clientY: number) => {
    if (!isMobile) return false;
    const zoneCenterX = window.innerWidth / 2;
    const zoneCenterY = window.innerHeight - 100;
    const dist = Math.hypot(clientX - zoneCenterX, clientY - zoneCenterY);
    return dist < DISMISS_ZONE_RADIUS;
  }, [isMobile]);

  /* Show bubble once per device (persisted), not on every DashboardLayout remount */
  useEffect(() => {
    if (!hasSteps || isTutorialDismissed || hasSeenTutorialBubble) return;
    setBubbleVisible(true);
    markTutorialBubbleSeen();
    const timer = setTimeout(() => setBubbleVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [hasSteps, isTutorialDismissed, hasSeenTutorialBubble, markTutorialBubbleSeen]);

  useEffect(() => {
    if (hovered) {
      setBubbleVisible(true);
    }
  }, [hovered]);

  // Pre-register these at render time so they're cached before the tour starts
  const bubbleText = t("Ask me if you need help");
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const rawStepsRef = useRef(rawSteps);
  const tRef = useRef(t);
  const mountedRef = useRef(true);
  rawStepsRef.current = rawSteps;
  tRef.current = t;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  const startTour = useCallback(async () => {
    if (!hasSteps || running) return;

    const source = rawStepsRef.current;
    setRunning(true);
    if (locale !== "en") {
      for (const step of source) {
        if (step.popover?.title) register(step.popover.title);
        if (step.popover?.description) register(step.popover.description);
      }
      register("Next →");
      register("← Back");
      register("Done");
      register("Ask me if you need help");
      await waitForTranslations(
        [...collectTourStrings(source), "Next →", "← Back", "Done"],
        hasTranslation,
      );
    }

    if (!mountedRef.current || rawStepsRef.current !== source) {
      if (mountedRef.current) setRunning(false);
      return;
    }
    const liveT = tRef.current;

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
      nextBtnText: liveT("Next →"),
      prevBtnText: liveT("← Back"),
      doneBtnText: liveT("Done"),
      onDestroyStarted: () => {
        driverObj.destroy();
        driverRef.current = null;
        setRunning(false);
      },
      onPopoverRender: (popover) => {
        const wrapper = popover.wrapper;
        if (!wrapper) return;
        setTimeout(() => {
          const header = wrapper.querySelector(".driver-popover-title");
          if (!header || header.parentElement?.querySelector(".driver-lang-wrap")) return;
          
          const wrap = document.createElement("div");
          wrap.className = "driver-lang-wrap absolute top-[14px] right-10 z-10 flex items-center bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5";
          
          const select = document.createElement("select");
          select.className = "text-[10px] bg-transparent border-none text-gray-600 dark:text-gray-300 font-bold uppercase outline-none cursor-pointer p-0 m-0 leading-none";
          select.style.appearance = "none";
          select.style.webkitAppearance = "none";
          
          const currentLang = usePreferencesStore.getState().language;
          Object.entries(LANGUAGES).forEach(([code, info]) => {
            const opt = document.createElement("option");
            opt.value = code;
            opt.innerText = info.nativeName;
            opt.selected = code === currentLang;
            select.appendChild(opt);
          });
          
          select.onchange = (e) => {
            usePreferencesStore.getState().setLanguage((e.target as HTMLSelectElement).value as Language);
            // The text will update automatically on next step, but ideally we force refresh.
          };
          
          wrap.appendChild(select);
          header.parentElement?.insertBefore(wrap, header);
        }, 10);
      },
      steps: translateTourSteps(source, liveT),
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [hasSteps, running, locale, register, hasTranslation]);

  useEffect(() => {
    const instance = driverRef.current;
    if (!running || !instance) return;
    const index = instance.getState().activeIndex ?? 0;
    instance.setConfig({
      steps: translateTourSteps(rawSteps, t),
      nextBtnText: t("Next →"),
      prevBtnText: t("← Back"),
      doneBtnText: t("Done"),
    });
    instance.drive(index);
  }, [rawSteps, t, running]);

  // Auto-launch the mobile onboarding tour exactly once, on the first time the
  // user lands on the mobile POS ("make your first sale") screen. After that the
  // persisted flag prevents it from ever re-triggering, and the floating help
  // button remains available for manual replays.
  useEffect(() => {
    if (!isMobile) return;
    if (pathname !== "/m/pos" && pathname !== "/m") return;
    if (!hasSteps || isTutorialDismissed || hasAutoLaunchedMobileTour || running) return;
    markMobileTourAutoLaunched();
    // Give the page's data-tour anchors a moment to mount before driving.
    const timer = setTimeout(() => startTour(), 1200);
    return () => clearTimeout(timer);
  }, [
    isMobile,
    pathname,
    hasSteps,
    isTutorialDismissed,
    hasAutoLaunchedMobileTour,
    running,
    markMobileTourAutoLaunched,
    startTour,
  ]);

  // Mobile drag handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isMobile || running) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragInfo.current = {
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        pointerId: e.pointerId,
      };
    },
    [isMobile, running],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragInfo.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      if (!isDragging) setIsDragging(true);
      setDragOffset({ x: dx, y: dy });
      setIsOverDismissZone(checkDismissZone(e.clientX, e.clientY));
    },
    [isDragging, checkDismissZone],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragInfo.current;
      dragInfo.current = null;
      setIsDragging(false);
      setIsOverDismissZone(false);
      setDragOffset(null);
      if (!d) return;
      if (!d.moved) {
        // Treated as a tap → start tutorial
        startTour();
        return;
      }
      // If dropped on dismiss zone → dismiss
      if (checkDismissZone(e.clientX, e.clientY)) {
        dismissTutorial();
      }
    },
    [startTour, checkDismissZone, dismissTutorial],
  );

  if (!hasSteps || isTutorialDismissed) return null;

  return (
    <>
      {/* Mobile drag-to-dismiss zone */}
      {isDragging && isMobile && (
        <div className="fixed inset-0 z-[39] pointer-events-none">
          <div
            className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-all duration-200 ${
              isOverDismissZone ? "scale-125" : "scale-100"
            }`}
            style={{ bottom: "68px" }}
          >
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                isOverDismissZone
                  ? "bg-red-500 shadow-lg shadow-red-500/40"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <X className={`h-7 w-7 transition-colors ${
                isOverDismissZone ? "text-white" : "text-gray-500 dark:text-gray-400"
              }`} />
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${
              isOverDismissZone ? "text-red-500" : "text-gray-400"
            }`}>
              {t("Drop to hide")}
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "fixed bottom-[136px] sm:bottom-[136px] right-4 sm:right-6 z-40 flex flex-col items-end gap-1.5",
          isTutorialShaking ? "animate-shake-tut" : ""
        )}
        style={dragOffset ? {
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          transition: "none",
        } : undefined}
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
        {!isDragging && (
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
        )}

        {/* Circle button container */}
        <div className="relative">
          <button
            onPointerDown={isMobile ? onPointerDown : undefined}
            onPointerMove={isMobile ? onPointerMove : undefined}
            onPointerUp={isMobile ? onPointerUp : undefined}
            onPointerCancel={isMobile ? onPointerUp : undefined}
            onClick={!isMobile ? startTour : undefined}
            disabled={running}
            aria-label={bubbleText}
            title={bubbleText}
            style={{
              touchAction: isMobile ? "none" : undefined,
              opacity: isOverDismissZone ? 0.5 : 1,
            }}
            className={cn(
              "flex items-center justify-center",
              "w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg",
              "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
              "text-white transition-all",
              isDragging ? "scale-90 cursor-grabbing" : "cursor-pointer",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              className,
            )}
          >
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          {/* Dismiss button — desktop only (mobile uses drag-to-dismiss) */}
          {!running && !isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissTutorial();
              }}
              className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-white text-gray-500 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 shadow-sm z-10"
              title={t("Hide tutorial button")}
              aria-label={t("Hide tutorial button")}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
