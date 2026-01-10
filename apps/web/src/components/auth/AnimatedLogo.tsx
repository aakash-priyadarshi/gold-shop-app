'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  className?: string;
  size?: number;
}

/**
 * Animated SVG Logo for "The Golden Unveil" animation
 * Features:
 * - Ring path that can be animated with stroke-dashoffset
 * - Diamond shape that can scale and rotate
 * - Fill layer for the gold gradient reveal
 * - Text "Orivraa" with individual letter paths for stagger animation
 */
export const AnimatedLogo = forwardRef<SVGSVGElement, AnimatedLogoProps>(
  ({ className, size = 120 }, ref) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className={cn('animated-logo', className)}
        aria-label="Orivraa Logo"
      >
        <defs>
          {/* Gold gradient for the ring and fill */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D061" />
            <stop offset="30%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#C5A028" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          
          {/* Shimmer gradient for premium effect */}
          <linearGradient id="shimmerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFF8DC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
          
          {/* Diamond sparkle gradient */}
          <radialGradient id="diamondGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E8E8E8" />
            <stop offset="100%" stopColor="#D0D0D0" />
          </radialGradient>
          
          {/* Glow filter for the diamond */}
          <filter id="diamondGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#D4AF37" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Ring glow */}
          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#D4AF37" floodOpacity="0.4" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle (subtle) */}
        <circle
          className="logo-bg"
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="rgba(212, 175, 55, 0.1)"
          strokeWidth="1"
          opacity="0"
        />

        {/* Main Ring - The path that will be "drawn" */}
        <circle
          className="logo-path"
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0"
          filter="url(#ringGlow)"
        />

        {/* Inner decorative ring */}
        <circle
          className="logo-path-inner"
          cx="100"
          cy="100"
          r="55"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0"
          strokeDasharray="10 5"
        />

        {/* Fill layer - reveals after path draws */}
        <circle
          className="logo-fill"
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="12"
          opacity="0"
        />

        {/* Diamond shape at the top of the ring */}
        <g className="diamond-group" transform="translate(100, 30)">
          {/* Diamond glow background */}
          <path
            className="diamond-glow"
            d="M0,-18 L12,0 L0,22 L-12,0 Z"
            fill="url(#goldGradient)"
            opacity="0"
            filter="url(#diamondGlow)"
          />
          {/* Main diamond */}
          <path
            className="diamond-shape"
            d="M0,-15 L10,0 L0,18 L-10,0 Z"
            fill="url(#diamondGradient)"
            stroke="url(#goldGradient)"
            strokeWidth="1.5"
            opacity="0"
            style={{ transformOrigin: 'center' }}
          />
          {/* Diamond sparkle line */}
          <line
            className="diamond-sparkle"
            x1="-6"
            y1="-3"
            x2="6"
            y2="-3"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0"
          />
        </g>

        {/* Decorative gems on the ring */}
        <g className="ring-gems">
          <circle className="gem gem-1" cx="170" cy="100" r="4" fill="url(#goldGradient)" opacity="0" />
          <circle className="gem gem-2" cx="30" cy="100" r="4" fill="url(#goldGradient)" opacity="0" />
          <circle className="gem gem-3" cx="100" cy="170" r="4" fill="url(#goldGradient)" opacity="0" />
        </g>

        {/* Shimmer effect overlay */}
        <circle
          className="logo-shimmer"
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="url(#shimmerGradient)"
          strokeWidth="10"
          opacity="0"
        />
      </svg>
    );
  }
);

AnimatedLogo.displayName = 'AnimatedLogo';

export default AnimatedLogo;
