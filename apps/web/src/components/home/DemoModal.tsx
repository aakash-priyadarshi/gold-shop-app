"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, PlayCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CDN_BASE = "https://images.orivraa.com";

type Lang = "en" | "hi" | "ne" | "gu" | "mr" | "ta" | "te" | "kn" | "fr" | "de" | "es" | "ar";

const COMING_SOON_LANGS: Lang[] = ["fr", "de", "ta", "gu", "mr", "te", "kn"];

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिंदी",
  ne: "नेपाली",
  gu: "ગુજરાતી",
  mr: "मराठी",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ar: "العربية",
};

interface DemoModalProps {
  className?: string;
  buttonClassName?: string;
  label?: string;
}

export function DemoModal({ className, buttonClassName, label = "Watch Demo" }: DemoModalProps) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const videoRef = useRef<HTMLVideoElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const videoSrc = `${CDN_BASE}/tutorial/${lang}`;

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        className={cn("w-full sm:w-auto h-12 px-8 rounded-xl text-base", buttonClassName)}
        onClick={() => setOpen(true)}
        aria-label="Watch product demo"
      >
        <PlayCircle className="mr-2 h-5 w-5" />
        {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Demo video player"
        >
          <div className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90">
              {/* Language toggle */}
              <div className="flex gap-1 p-0.5 bg-gray-800 rounded-lg flex-wrap">
                {(["en", "hi", "ne", "gu", "mr", "ta", "te", "kn", "fr", "de", "es", "ar"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "relative px-3 py-1 text-sm font-medium rounded-md transition-colors",
                      lang === l
                        ? "bg-amber-500 text-white"
                        : "text-gray-400 hover:text-white",
                      COMING_SOON_LANGS.includes(l) && "opacity-60"
                    )}
                  >
                    {LANG_LABELS[l]}
                    {COMING_SOON_LANGS.includes(l) && (
                      <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide opacity-80">soon</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={close}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                aria-label="Close demo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video player */}
            {COMING_SOON_LANGS.includes(lang) ? (
              <div className="w-full aspect-video bg-gray-950 flex flex-col items-center justify-center gap-3">
                <Clock className="w-10 h-10 text-amber-400 opacity-70" />
                <p className="text-white font-semibold text-lg">Coming Soon</p>
                <p className="text-gray-400 text-sm">{LANG_LABELS[lang]} video is being prepared</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                key={videoSrc}
                src={videoSrc}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video bg-black"
                preload="metadata"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
