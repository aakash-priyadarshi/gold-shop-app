'use client';

import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  className?: string;
  size?: number;
  /** Animation stage for CSS-based animations */
  animationStage?: 'init' | 'forge' | 'polish' | 'reveal' | 'invitation' | 'complete';
}

/**
 * Animated SVG Logo for "The Golden Unveil" animation
 * Uses CSS animations for maximum reliability across all environments
 * 
 * Features:
 * - Ring path with stroke-dashoffset animation
 * - Diamond shape with scale and bounce
 * - Gold fill reveal
 * - Shimmer effect
 */
export function AnimatedLogo({ 
  className, 
  size = 120,
  animationStage = 'complete' 
}: AnimatedLogoProps) {
  // CSS animation timing based on stage
  const isForging = animationStage === 'forge' || animationStage === 'polish' || animationStage === 'reveal' || animationStage === 'invitation' || animationStage === 'complete';
  const isPolished = animationStage === 'polish' || animationStage === 'reveal' || animationStage === 'invitation' || animationStage === 'complete';
  const isComplete = animationStage === 'complete';

  // Calculate circumference for stroke animation
  const ringRadius = 70;
  const circumference = 2 * Math.PI * ringRadius;
  const innerRadius = 55;
  const innerCircumference = 2 * Math.PI * innerRadius;

  return (
    <svg
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
        style={{
          opacity: isForging ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}
      />

      {/* Main Ring - The path that will be "drawn" */}
      <circle
        className="logo-path"
        cx="100"
        cy="100"
        r={ringRadius}
        fill="none"
        stroke="url(#goldGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        filter="url(#ringGlow)"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: isForging ? 0 : circumference,
          opacity: isForging ? 1 : 0,
          transition: 'stroke-dashoffset 1.8s ease-in-out, opacity 0.3s ease-out',
          transformOrigin: 'center',
        }}
      />

      {/* Inner decorative ring */}
      <circle
        className="logo-path-inner"
        cx="100"
        cy="100"
        r={innerRadius}
        fill="none"
        stroke="url(#goldGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="10 5"
        style={{
          strokeDashoffset: isForging ? 0 : innerCircumference,
          opacity: isForging ? 0.6 : 0,
          transition: 'stroke-dashoffset 1.5s ease-in-out 0.3s, opacity 0.5s ease-out 0.3s',
        }}
      />

      {/* Fill layer - reveals after path draws */}
      <circle
        className="logo-fill"
        cx="100"
        cy="100"
        r={ringRadius}
        fill="none"
        stroke="url(#goldGradient)"
        strokeWidth="12"
        style={{
          opacity: isPolished ? 0.3 : 0,
          transition: 'opacity 0.8s ease-out',
        }}
      />

      {/* Diamond shape at the top of the ring */}
      <g className="diamond-group" transform="translate(100, 30)">
        {/* Diamond glow background */}
        <path
          className="diamond-glow"
          d="M0,-18 L12,0 L0,22 L-12,0 Z"
          fill="url(#goldGradient)"
          filter="url(#diamondGlow)"
          style={{
            opacity: isPolished ? 0.8 : 0,
            transform: isPolished ? 'scale(1)' : 'scale(0.5)',
            transformOrigin: 'center',
            transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
        {/* Main diamond */}
        <path
          className="diamond-shape"
          d="M0,-15 L10,0 L0,18 L-10,0 Z"
          fill="url(#diamondGradient)"
          stroke="url(#goldGradient)"
          strokeWidth="1.5"
          style={{
            opacity: isPolished ? 1 : 0,
            transform: isPolished ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
            transformOrigin: 'center',
            transition: 'opacity 0.4s ease-out, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
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
          style={{
            opacity: isPolished ? 0.8 : 0,
            transform: isPolished ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'center',
            transition: 'opacity 0.4s ease-out 0.3s, transform 0.4s ease-out 0.3s',
          }}
        />
      </g>

      {/* Decorative gems on the ring */}
      <g className="ring-gems">
        <circle 
          className="gem gem-1" 
          cx="170" 
          cy="100" 
          r="4" 
          fill="url(#goldGradient)" 
          style={{
            opacity: isPolished ? 1 : 0,
            transform: isPolished ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'opacity 0.4s ease-out 0.1s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
          }}
        />
        <circle 
          className="gem gem-2" 
          cx="30" 
          cy="100" 
          r="4" 
          fill="url(#goldGradient)" 
          style={{
            opacity: isPolished ? 1 : 0,
            transform: isPolished ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'opacity 0.4s ease-out 0.2s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s',
          }}
        />
        <circle 
          className="gem gem-3" 
          cx="100" 
          cy="170" 
          r="4" 
          fill="url(#goldGradient)" 
          style={{
            opacity: isPolished ? 1 : 0,
            transform: isPolished ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'opacity 0.4s ease-out 0.3s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
          }}
        />
      </g>

      {/* Shimmer effect overlay - animate on complete */}
      <circle
        className="logo-shimmer"
        cx="100"
        cy="100"
        r={ringRadius}
        fill="none"
        stroke="url(#shimmerGradient)"
        strokeWidth="10"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: isComplete ? -circumference : circumference,
          opacity: isComplete ? 0.6 : 0,
          transition: isComplete ? 'stroke-dashoffset 1s ease-in-out, opacity 0.5s ease-in-out' : 'none',
        }}
      />
    </svg>
  );
}

export default AnimatedLogo;
