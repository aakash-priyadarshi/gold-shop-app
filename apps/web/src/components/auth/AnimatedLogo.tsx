'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedLogoProps {
  className?: string;
  size?: number;
  /** Animation stage for CSS-based animations */
  animationStage?: 'init' | 'forge' | 'polish' | 'reveal' | 'invitation' | 'complete';
}

/**
 * Animated Orivraa Logo - The Golden Unveil
 * Original SVG created in Adobe Illustrator
 * 
 * Animation sequence:
 * - Forge: Main "O" paths fade in with golden glow
 * - Polish: Crown ornament appears, center sparkle PINGS then normalizes
 * - Complete: Full logo visible with hover effects
 */
export function AnimatedLogo({ 
  className, 
  size = 120,
  animationStage = 'complete' 
}: AnimatedLogoProps) {
  const [sparkleScale, setSparkleScale] = useState(0);
  
  // Animation state helpers
  const isForging = animationStage === 'forge' || animationStage === 'polish' || animationStage === 'reveal' || animationStage === 'invitation' || animationStage === 'complete';
  const isPolished = animationStage === 'polish' || animationStage === 'reveal' || animationStage === 'invitation' || animationStage === 'complete';

  // Sparkle ping animation - scales up big then normalizes
  useEffect(() => {
    if (animationStage === 'polish') {
      // First: scale up BIG (the ping)
      setSparkleScale(1.8);
      
      // Then: normalize to 1
      const timer = setTimeout(() => {
        setSparkleScale(1);
      }, 400);
      
      return () => clearTimeout(timer);
    } else if (animationStage === 'init' || animationStage === 'forge') {
      setSparkleScale(0);
    }
  }, [animationStage]);

  return (
    <svg
      viewBox="0 0 120 96.49"
      width={size}
      height={size * (96.49 / 120)}
      className={cn('animated-logo', className)}
      aria-label="Orivraa Logo"
    >
      <defs>
        {/* Gold gradient for right "O" curve */}
        <linearGradient id="logo-gradient-1" x1="32.59" y1="46.69" x2="104.08" y2="46.69" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".11" stopColor="#e5a626"/>
          <stop offset=".29" stopColor="#e8b13c"/>
          <stop offset=".51" stopColor="#ecc260"/>
          <stop offset=".75" stopColor="#f2d992"/>
          <stop offset=".78" stopColor="#f3dd99"/>
        </linearGradient>
        
        {/* Gold gradient for left "O" curve */}
        <linearGradient id="logo-gradient-2" x1="0" y1="53.35" x2="79.08" y2="53.35" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".05" stopColor="#e7af37"/>
          <stop offset=".12" stopColor="#ebbf5a"/>
          <stop offset=".2" stopColor="#efcc75"/>
          <stop offset=".28" stopColor="#f1d589"/>
          <stop offset=".36" stopColor="#f2db95"/>
          <stop offset=".44" stopColor="#f3dd99"/>
          <stop offset=".66" stopColor="#f1db97"/>
          <stop offset=".74" stopColor="#edd491"/>
          <stop offset=".8" stopColor="#e5c888"/>
          <stop offset=".85" stopColor="#dab77a"/>
          <stop offset=".89" stopColor="#cba168"/>
          <stop offset=".92" stopColor="#ba8652"/>
          <stop offset=".95" stopColor="#a46637"/>
          <stop offset=".98" stopColor="#8c4119"/>
          <stop offset="1" stopColor="#782200"/>
        </linearGradient>
        
        {/* Crown ornament gradients */}
        <linearGradient id="logo-gradient-3" x1="99.66" y1="21.21" x2="120" y2="21.21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".09" stopColor="#e5a421"/>
          <stop offset=".18" stopColor="#e6aa2d"/>
          <stop offset=".27" stopColor="#e8b340"/>
          <stop offset=".36" stopColor="#ebbf5a"/>
          <stop offset=".44" stopColor="#efcf7d"/>
          <stop offset=".5" stopColor="#f3dd99"/>
          <stop offset=".59" stopColor="#f0d996"/>
          <stop offset=".67" stopColor="#eacf8e"/>
          <stop offset=".74" stopColor="#dfbf80"/>
          <stop offset=".8" stopColor="#cfa76d"/>
          <stop offset=".86" stopColor="#bb8854"/>
          <stop offset=".92" stopColor="#a36335"/>
          <stop offset=".97" stopColor="#863711"/>
          <stop offset="1" stopColor="#782200"/>
        </linearGradient>
        
        <linearGradient id="logo-gradient-4" x1="111.51" y1="9.94" x2="119.54" y2="9.94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".09" stopColor="#e5a421"/>
          <stop offset=".18" stopColor="#e6aa2d"/>
          <stop offset=".27" stopColor="#e8b340"/>
          <stop offset=".36" stopColor="#ebbf5a"/>
          <stop offset=".44" stopColor="#efcf7d"/>
          <stop offset=".5" stopColor="#f3dd99"/>
          <stop offset=".56" stopColor="#ead08e"/>
          <stop offset=".66" stopColor="#d5af73"/>
          <stop offset=".8" stopColor="#b17947"/>
          <stop offset=".97" stopColor="#81300b"/>
          <stop offset="1" stopColor="#782200"/>
        </linearGradient>
        
        <linearGradient id="logo-gradient-5" x1="85.89" y1="12.36" x2="111.51" y2="12.36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".09" stopColor="#e5a421"/>
          <stop offset=".18" stopColor="#e6aa2d"/>
          <stop offset=".27" stopColor="#e8b340"/>
          <stop offset=".36" stopColor="#ebbf5a"/>
          <stop offset=".44" stopColor="#efcf7d"/>
          <stop offset=".5" stopColor="#f3dd99"/>
          <stop offset=".7" stopColor="#f1db97"/>
          <stop offset=".77" stopColor="#edd491"/>
          <stop offset=".82" stopColor="#e5c888"/>
          <stop offset=".86" stopColor="#dab77a"/>
          <stop offset=".9" stopColor="#cba168"/>
          <stop offset=".93" stopColor="#ba8652"/>
          <stop offset=".96" stopColor="#a46637"/>
          <stop offset=".98" stopColor="#8c4119"/>
          <stop offset="1" stopColor="#782200"/>
        </linearGradient>
        
        <linearGradient id="logo-gradient-6" x1="75.33" y1="9.58" x2="85.35" y2="9.58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".09" stopColor="#e5a421"/>
          <stop offset=".18" stopColor="#e6aa2d"/>
          <stop offset=".27" stopColor="#e8b340"/>
          <stop offset=".36" stopColor="#ebbf5a"/>
          <stop offset=".44" stopColor="#efcf7d"/>
          <stop offset=".5" stopColor="#f3dd99"/>
          <stop offset=".56" stopColor="#ead08e"/>
          <stop offset=".66" stopColor="#d5af73"/>
          <stop offset=".8" stopColor="#b17947"/>
          <stop offset=".97" stopColor="#81300b"/>
          <stop offset="1" stopColor="#782200"/>
        </linearGradient>
        
        <linearGradient id="logo-gradient-7" x1="77.17" y1="3.31" x2="89.02" y2="3.31" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e5a31e"/>
          <stop offset=".09" stopColor="#e5a421"/>
          <stop offset=".18" stopColor="#e6aa2d"/>
          <stop offset=".27" stopColor="#e8b340"/>
          <stop offset=".36" stopColor="#ebbf5a"/>
          <stop offset=".44" stopColor="#efcf7d"/>
          <stop offset=".5" stopColor="#f3dd99"/>
          <stop offset=".56" stopColor="#ead08e"/>
          <stop offset=".66" stopColor="#d5af73"/>
          <stop offset=".8" stopColor="#b17947"/>
          <stop offset=".97" stopColor="#81300b"/>
          <stop offset="1" stopColor="#782200"/>
        </linearGradient>
        
        {/* Diamond sparkle radial gradient */}
        <radialGradient id="logo-sparkle-gradient" cx="52.28" cy="51.73" fx="52.28" fy="51.73" r="15.19" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fffeee"/>
          <stop offset=".28" stopColor="#f3f3e9"/>
          <stop offset=".75" stopColor="#d7dade"/>
          <stop offset=".88" stopColor="#dcd8d4"/>
        </radialGradient>

        {/* Glow filter for the logo */}
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feFlood floodColor="#D4AF37" floodOpacity="0.5" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main "O" Shape - Right curve */}
      <path 
        className="logo-path-right"
        fill="url(#logo-gradient-1)" 
        d="M32.59,6.72c.02-1.16,17.16-5.21,34.71,0,23.28,6.91,32.05,25.57,32.9,27.47,6.54,14.59,5.39,34.21-7.85,45.78-2.26,1.98-8.52,6.87-18.11,8.63-16.07,2.95-30.83-4.85-30.48-6.02.19-.62,4.6,1.13,11.47.26,10.33-1.31,19.77-7.74,24.81-15.73,4.28-6.77,4.41-13.11,4.44-16.17.07-8.95-3.65-15.43-5.89-19.22-1.76-2.98-6.71-11.12-17.25-17.16-.92-.53-4.98-2.81-10.94-4.7-10.29-3.25-17.81-2.63-17.81-3.14Z"
        style={{
          opacity: isForging ? 1 : 0,
          transform: isForging ? 'translateX(0)' : 'translateX(10px)',
          filter: isForging ? 'url(#logoGlow)' : 'none',
          transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
        }}
      />
      
      {/* Main "O" Shape - Left curve */}
      <path 
        className="logo-path-left"
        fill="url(#logo-gradient-2)" 
        d="M60.73,17.38c-.18.87-5.2-.56-11.59.55-7.45,1.29-12.51,5.33-14.74,7.04-2.03,1.56-11.84,9.38-13.58,22-2.65,19.17,15.23,32.48,18.86,35.18,3.74,2.78,9.81,7.3,18.86,8.58,10.73,1.51,20.22-2.31,20.52-1.51.23.59-4.84,2.98-10.74,4.62-3.99,1.11-19.27,5.36-35.75,0-3.38-1.1-28.25-10.63-32.29-35.34,0,0-3.69-22.55,15.01-40.05,4.43-4.15,12.3-7.93,16.61-7.93h0c4.22-.67,8.07-.09,10.3.24.83.12,1.59.26,2.31.41,2.28.48,4.04,1.03,5.11,1.39,4.39,1.47,11.31,3.79,11.09,4.82Z"
        style={{
          opacity: isForging ? 1 : 0,
          transform: isForging ? 'translateX(0)' : 'translateX(-10px)',
          filter: isForging ? 'url(#logoGlow)' : 'none',
          transition: 'opacity 1.2s ease-out 0.3s, transform 1.2s ease-out 0.3s',
        }}
      />
      
      {/* Crown Ornament - Group of decorative polygons */}
      <g 
        className="logo-crown"
        style={{
          opacity: isPolished ? 1 : 0,
          transform: isPolished ? 'translateY(0) scale(1)' : 'translateY(-5px) scale(0.8)',
          transformOrigin: '100px 15px',
          transition: 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <polygon fill="url(#logo-gradient-3)" points="99.66 27.64 120 17.23 111.66 14.78 99.66 27.64"/>
        <polygon fill="url(#logo-gradient-4)" points="111.51 13.59 119.54 15.18 112.35 4.71 111.51 13.59"/>
        <polygon fill="url(#logo-gradient-5)" points="96.52 24.72 110.59 14.78 104.4 6.76 111.51 5.17 91.01 0 96.06 4.13 86.58 8.02 85.89 12.36 91.4 19.35 88.87 9.54 106.31 13.85 96.52 24.72"/>
        <polygon fill="url(#logo-gradient-6)" points="75.33 5.9 84.36 13.26 85.35 7.76 75.33 5.9"/>
        <polygon fill="url(#logo-gradient-7)" points="77.17 4.71 85.35 6.63 89.02 0 77.17 4.71"/>
      </g>
      
      {/* Center Diamond Sparkle - PINGS then normalizes */}
      <path 
        className="logo-sparkle"
        fill="url(#logo-sparkle-gradient)" 
        d="M36.23,51.73c0-1,6.92-.13,11.31-3.73,4.69-3.85,3.76-10.55,4.96-10.53,1.17.01.06,6.44,4.47,10.32,4.29,3.78,11.35,2.98,11.36,4.09,0,1.1-6.8.37-11.13,4.08-4.47,3.82-3.61,10.05-4.82,10.04-1.23-.01-.16-6.41-4.61-10.27-4.36-3.79-11.56-2.98-11.55-3.99Z"
        style={{
          opacity: isPolished ? 1 : 0,
          transform: `scale(${sparkleScale})`,
          transformOrigin: '52px 52px',
          transition: sparkleScale === 1.8 
            ? 'opacity 0.2s ease-out, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            : 'opacity 0.2s ease-out, transform 0.5s ease-out',
          filter: sparkleScale > 1 ? 'drop-shadow(0 0 8px rgba(255, 254, 238, 0.9))' : 'none',
        }}
      />
    </svg>
  );
}

export default AnimatedLogo;
