'use client';

import { useEffect, useRef, useState } from 'react';

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
export function HeroVideo({ videoSrc, poster, className = '' }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reducedMotion) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Autoplay blocked — silently ignore (poster will show)
      });
    }
  }, [reducedMotion]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        poster={poster}
        autoPlay={!reducedMotion}
        muted
        loop
        playsInline
        preload="metadata"
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
    </div>
  );
}
