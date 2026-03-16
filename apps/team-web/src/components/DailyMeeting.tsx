"use client";

import React, { useEffect, useRef, useState } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { Loader2, X } from "lucide-react";
import { Button } from "./ui/button";

interface DailyMeetingProps {
  url: string;
  token?: string;
  userName?: string;
  onClose: () => void;
}

export const DailyMeeting: React.FC<DailyMeetingProps> = ({
  url,
  token,
  userName = "Orivraa User",
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || callObject) return;

    // Create the Daily call object (Prebuilt Iframe)
    const newCall = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "12px",
      },
      showLeaveButton: true,
      showFullscreenButton: true,
      theme: {
        colors: {
          accent: "#C9A227",
          accentText: "#FFFFFF",
          background: "#1a1a2e",
          backgroundAccent: "#242445",
          baseText: "#FFFFFF",
          border: "#3e3e5e",
          mainAreaBg: "#0f0f1b",
        },
      },
    });

    setCallObject(newCall);

    // Join the meeting
    newCall.join({
      url,
      token,
      userName,
    }).then(() => {
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      newCall.destroy();
    };
  }, [url, token, userName]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-[#1a1a2e] rounded-xl overflow-hidden shadow-2xl border border-[#3e3e5e] relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3e3e5e] bg-[#0f0f1b]">
          <div className="flex items-center gap-3">
            <img src="https://www.orivraa.com/brand/orivraa-logo.svg" alt="Orivraa" className="h-6 w-auto" />
            <h3 className="text-white font-semibold">Orivraa Branded Session</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#f8fafc] hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Meeting Container */}
        <div className="flex-1 relative bg-[#0f0f1b]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#C9A227]">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium animate-pulse text-white">Initializing Branded Room...</p>
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
