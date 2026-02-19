"use client";

import { useEffect, useRef, useState } from "react";

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
 */
export function HeroVideo({
  videoSrc,
  poster,
  className = "",
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // React has a known bug where `muted` JSX prop doesn't apply to the DOM.
  // We must set it imperatively via ref, then trigger play().
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Always ensure muted is set
    video.muted = true;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);

    // Start playback
    if (!mq.matches) {
      video.play().catch(() => {
        // Autoplay blocked — silently ignore (poster will show)
      });
    }

    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    if (reducedMotion) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [reducedMotion]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Video element — muted set via ref due to React bug */}
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
