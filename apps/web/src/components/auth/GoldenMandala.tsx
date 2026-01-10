'use client';

import { useEffect, useState, useId } from 'react';

interface GoldenMandalaProps {
  enabled?: boolean;
  size?: number;
}

export function GoldenMandala({ enabled = true, size = 800 }: GoldenMandalaProps) {
  const [mounted, setMounted] = useState(false);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    console.log('[GoldenMandala] Component mounted, enabled:', enabled);
    setMounted(true);
  }, [enabled]);

  console.log('[GoldenMandala] Render - mounted:', mounted, 'enabled:', enabled, 'size:', size);

  if (!mounted || !enabled) {
    console.log('[GoldenMandala] Not rendering - mounted:', mounted, 'enabled:', enabled);
    return null;
  }

  console.log('[GoldenMandala] Rendering mandala SVG');

  const center = size / 2;

  // Generate unique IDs for gradients/filters
  const goldGradId = `gold-${id}`;
  const glowGradId = `glow-${id}`;
  const blurFilterId = `blur-${id}`;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.4,
      }}
    >
      <svg 
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>

          <radialGradient id={glowGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE55C" />
            <stop offset="70%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </radialGradient>

          <filter id={blurFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes pulse-ring {
            0%, 100% { opacity: 0.3; stroke-width: 1px; }
            50% { opacity: 0.9; stroke-width: 2.5px; }
          }
          @keyframes rotate-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes rotate-slow-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes gem-pulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.15); }
          }
        `}</style>

        {/* Concentric rings with staggered pulse animation */}
        {[380, 330, 280, 230, 180, 130, 80, 40].map((radius, index) => (
          <circle
            key={`ring-${index}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${goldGradId})`}
            strokeWidth={1.5}
            style={{
              animation: `pulse-ring ${3 + index * 0.2}s ease-in-out infinite`,
              animationDelay: `${index * 0.35}s`,
            }}
          />
        ))}

        {/* Outer rotating spokes with dots */}
        <g style={{ 
          transformOrigin: `${center}px ${center}px`,
          animation: 'rotate-slow 90s linear infinite',
        }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = center + 280 * Math.cos(angle);
            const y1 = center + 280 * Math.sin(angle);
            const x2 = center + 370 * Math.cos(angle);
            const y2 = center + 370 * Math.sin(angle);
            return (
              <g key={`spoke-outer-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`url(#${goldGradId})`}
                  strokeWidth={2}
                  opacity={0.6}
                />
                <circle cx={x2} cy={y2} r={5} fill={`url(#${goldGradId})`} opacity={0.8} />
              </g>
            );
          })}
        </g>

        {/* Middle rotating spokes - reverse direction */}
        <g style={{ 
          transformOrigin: `${center}px ${center}px`,
          animation: 'rotate-slow-reverse 70s linear infinite',
        }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5 * Math.PI) / 180;
            const x1 = center + 150 * Math.cos(angle);
            const y1 = center + 150 * Math.sin(angle);
            const x2 = center + 220 * Math.cos(angle);
            const y2 = center + 220 * Math.sin(angle);
            return (
              <g key={`spoke-middle-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`url(#${goldGradId})`}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
                <circle cx={x2} cy={y2} r={4} fill={`url(#${goldGradId})`} opacity={0.7} />
              </g>
            );
          })}
        </g>

        {/* Inner rotating spokes */}
        <g style={{ 
          transformOrigin: `${center}px ${center}px`,
          animation: 'rotate-slow 50s linear infinite',
        }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x1 = center + 50 * Math.cos(angle);
            const y1 = center + 50 * Math.sin(angle);
            const x2 = center + 120 * Math.cos(angle);
            const y2 = center + 120 * Math.sin(angle);
            return (
              <g key={`spoke-inner-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={`url(#${goldGradId})`}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
                <circle cx={x2} cy={y2} r={3} fill={`url(#${goldGradId})`} opacity={0.8} />
              </g>
            );
          })}
        </g>

        {/* Decorative dots on outermost ring */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          return (
            <circle
              key={`dot-outer-${i}`}
              cx={center + 355 * Math.cos(angle)}
              cy={center + 355 * Math.sin(angle)}
              r={2}
              fill={`url(#${goldGradId})`}
              opacity={0.5}
            />
          );
        })}

        {/* Center diamond with pulse and glow */}
        <g 
          filter={`url(#${blurFilterId})`}
          style={{
            transformOrigin: `${center}px ${center}px`,
            animation: 'gem-pulse 3s ease-in-out infinite',
          }}
        >
          <polygon
            points={`${center},${center - 28} ${center + 22},${center} ${center},${center + 28} ${center - 22},${center}`}
            fill={`url(#${glowGradId})`}
          />
          <circle cx={center} cy={center} r={12} fill="#FFD700" />
        </g>
      </svg>
    </div>
  );
}
