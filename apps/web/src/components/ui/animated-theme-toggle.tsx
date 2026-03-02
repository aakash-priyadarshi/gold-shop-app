"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

interface AnimatedThemeToggleProps {
  /** Pixel size of the button (default: 40) */
  size?: number;
  className?: string;
}

/**
 * Animated sun ↔ moon toggle.
 *
 * Uses an SVG mask so the sun smoothly "bites" into a crescent moon.
 * Rays rotate + fade out during the transition.
 * Calls `window.__saveThemeToServer?.()` to persist the choice.
 */
export function AnimatedThemeToggle({
  size = 40,
  className,
}: AnimatedThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const uid = useId(); // unique per-instance so multiple toggles don't clash

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const maskId = `moon-mask-${uid}`;

  const toggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    (window as any).__saveThemeToServer?.(next);
  };

  // Icon size is ~60% of the button
  const iconSize = Math.round(size * 0.55);

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl",
        "text-gray-500 dark:text-gray-400",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "transition-transform duration-200 ease-out active:scale-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="overflow-visible"
      >
        {/* Mask: a white rect (show all) with a black circle that eats into the sun */}
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle
            cx={isDark ? 17 : 25}
            cy={isDark ? 8 : 10}
            r="6"
            fill="black"
            style={{
              transition:
                "cx 0.45s cubic-bezier(.4,0,.2,1), cy 0.45s cubic-bezier(.4,0,.2,1)",
            }}
          />
        </mask>

        {/* Sun body — masked to become a crescent in dark mode */}
        <circle
          cx="12"
          cy="12"
          r="5"
          mask={`url(#${maskId})`}
          fill="currentColor"
          stroke="none"
          style={{
            transform: isDark ? "scale(1.15)" : "scale(1)",
            transformOrigin: "center",
            transition: "transform 0.45s cubic-bezier(.4,0,.2,1)",
          }}
        />

        {/* Sun rays — fade + rotate out in dark mode */}
        <g
          stroke="currentColor"
          style={{
            opacity: isDark ? 0 : 1,
            transform: isDark ? "rotate(50deg)" : "rotate(0deg)",
            transformOrigin: "center",
            transition:
              "opacity 0.35s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)",
          }}
        >
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </button>
  );
}
