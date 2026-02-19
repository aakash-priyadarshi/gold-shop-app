"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface HeroVideoProps {
  /** Full CDN URL to the .mp4 hero video (resolved server-side). */
  videoSrc: string;
  /** Optional poster image shown before the video loads. */
  poster?: string;
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string;
}

/**
 * Full-bleed hero background video with:
 *  - autoPlay / muted / loop / playsInline (mobile-safe)
 *  - Dark gradient overlay for text readability
 *  - prefers-reduced-motion: pauses video, shows poster
 *  - Fixed-height container to prevent layout shift
 *  - No hydration mismatch (videoSrc comes from the server)
 *  - React.memo to survive parent re-renders (useMarket state changes)
 *  - Auto-restart on unexpected pause events
 */
function HeroVideoInner({
  videoSrc,
  poster,
  className = "",
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intentionalPause = useRef(false);

  // Check prefers-reduced-motion once on mount (no state — avoids re-render)
  const reducedMotionRef = useRef(false);
  const [, forceRender] = useState(0);

  const ensurePlaying = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedMotionRef.current || intentionalPause.current) return;
    video.muted = true;
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Imperatively set muted (React JSX bug)
    video.muted = true;

    // Prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;

    const motionHandler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      intentionalPause.current = e.matches;
      if (e.matches) {
        video.pause();
      } else {
        ensurePlaying();
      }
      forceRender((n) => n + 1);
    };
    mq.addEventListener("change", motionHandler);

    // Auto-restart: whenever the browser pauses (e.g. React re-render,
    // layout reflow, or resource contention), resume playback immediately.
    const pauseHandler = () => {
      if (!reducedMotionRef.current && !intentionalPause.current) {
        // Small delay to avoid tight loop with browser's own pause/play cycle
        setTimeout(ensurePlaying, 50);
      }
    };
    video.addEventListener("pause", pauseHandler);

    // Also listen for when the video has enough data to play
    const canPlayHandler = () => ensurePlaying();
    video.addEventListener("canplay", canPlayHandler);

    // Kick off initial playback
    if (!mq.matches) {
      ensurePlaying();
    }

    // Failsafe: periodically check video is playing (covers edge cases)
    const interval = setInterval(ensurePlaying, 2000);

    return () => {
      mq.removeEventListener("change", motionHandler);
      video.removeEventListener("pause", pauseHandler);
      video.removeEventListener("canplay", canPlayHandler);
      clearInterval(interval);
    };
  }, [ensurePlaying]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
    </div>
  );
}

// React.memo prevents re-renders from parent useMarket state changes
// (HeroSection re-renders on country detection but videoSrc never changes)
export const HeroVideo = React.memo(HeroVideoInner);
