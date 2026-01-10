'use client';

import { useEffect, useState } from 'react';

interface GoldenMandalaProps {
  enabled?: boolean;
  size?: number;
}

export function GoldenMandala({ enabled = true, size = 800 }: GoldenMandalaProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !enabled) return null;

  const center = size / 2;

  return (
    <div className="golden-mandala-container">
      <style jsx>{`
        .golden-mandala-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
          opacity: 0.15;
        }

        .mandala-svg {
          width: ${size}px;
          height: ${size}px;
        }

        /* Pulsing light animation traveling outward from center */
        .mandala-ring {
          fill: none;
          stroke: url(#mandalaGoldGradient);
          stroke-width: 1;
          opacity: 0.6;
        }

        .mandala-ring-animated {
          fill: none;
          stroke: url(#mandalaGlowGradient);
          stroke-width: 2;
          opacity: 0;
          filter: url(#mandalaGlow);
        }

        /* Staggered animations for each ring - light travels outward */
        .ring-1 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 0s; }
        .ring-2 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 0.3s; }
        .ring-3 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 0.6s; }
        .ring-4 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 0.9s; }
        .ring-5 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 1.2s; }
        .ring-6 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 1.5s; }
        .ring-7 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 1.8s; }
        .ring-8 .mandala-ring-animated { animation: pulseOutward 4s ease-in-out infinite; animation-delay: 2.1s; }

        @keyframes pulseOutward {
          0%, 100% {
            opacity: 0;
            stroke-width: 1;
          }
          15%, 35% {
            opacity: 1;
            stroke-width: 3;
          }
          50% {
            opacity: 0;
            stroke-width: 1;
          }
        }

        /* Rotating petals animation */
        .petal-group {
          transform-origin: ${center}px ${center}px;
          animation: rotateSlow 60s linear infinite;
        }

        .petal-group-reverse {
          transform-origin: ${center}px ${center}px;
          animation: rotateSlow 80s linear infinite reverse;
        }

        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Center diamond pulse */
        .center-gem {
          transform-origin: ${center}px ${center}px;
          animation: gemPulse 3s ease-in-out infinite;
        }

        @keyframes gemPulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        /* Decorative dots pulse */
        .dot-ring {
          animation: dotPulse 2s ease-in-out infinite;
        }

        @keyframes dotPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <svg 
        className="mandala-svg" 
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold gradient */}
          <linearGradient id="mandalaGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>

          {/* Bright glow gradient for animation */}
          <linearGradient id="mandalaGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE55C" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="mandalaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Petal shape */}
          <path 
            id="petal" 
            d={`M ${center} ${center - 30} 
                Q ${center + 15} ${center - 60} ${center} ${center - 100}
                Q ${center - 15} ${center - 60} ${center} ${center - 30} Z`}
            fill="url(#mandalaGoldGradient)"
          />

          {/* Small petal */}
          <path 
            id="petalSmall" 
            d={`M ${center} ${center - 20} 
                Q ${center + 10} ${center - 40} ${center} ${center - 70}
                Q ${center - 10} ${center - 40} ${center} ${center - 20} Z`}
            fill="url(#mandalaGoldGradient)"
          />
        </defs>

        {/* Outer rings with traveling light effect */}
        <g className="ring-8">
          <circle className="mandala-ring" cx={center} cy={center} r={380} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={380} />
        </g>
        <g className="ring-7">
          <circle className="mandala-ring" cx={center} cy={center} r={330} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={330} />
        </g>
        <g className="ring-6">
          <circle className="mandala-ring" cx={center} cy={center} r={280} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={280} />
        </g>
        <g className="ring-5">
          <circle className="mandala-ring" cx={center} cy={center} r={230} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={230} />
        </g>
        <g className="ring-4">
          <circle className="mandala-ring" cx={center} cy={center} r={180} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={180} />
        </g>
        <g className="ring-3">
          <circle className="mandala-ring" cx={center} cy={center} r={130} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={130} />
        </g>
        <g className="ring-2">
          <circle className="mandala-ring" cx={center} cy={center} r={80} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={80} />
        </g>
        <g className="ring-1">
          <circle className="mandala-ring" cx={center} cy={center} r={40} />
          <circle className="mandala-ring-animated" cx={center} cy={center} r={40} />
        </g>

        {/* Outer decorative petals - slow rotation */}
        <g className="petal-group" opacity="0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <use 
              key={`outer-petal-${i}`}
              href="#petal" 
              transform={`rotate(${i * 30} ${center} ${center}) translate(0, -250)`}
            />
          ))}
        </g>

        {/* Middle petals - reverse rotation */}
        <g className="petal-group-reverse" opacity="0.4">
          {Array.from({ length: 16 }).map((_, i) => (
            <use 
              key={`middle-petal-${i}`}
              href="#petalSmall" 
              transform={`rotate(${i * 22.5} ${center} ${center}) translate(0, -150)`}
            />
          ))}
        </g>

        {/* Inner petals */}
        <g className="petal-group" opacity="0.6">
          {Array.from({ length: 8 }).map((_, i) => (
            <use 
              key={`inner-petal-${i}`}
              href="#petalSmall" 
              transform={`rotate(${i * 45} ${center} ${center}) translate(0, -50)`}
              style={{ transform: `rotate(${i * 45}deg) scale(0.6)`, transformOrigin: `${center}px ${center}px` }}
            />
          ))}
        </g>

        {/* Decorative dots on rings */}
        <g className="dot-ring" style={{ animationDelay: '0s' }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <circle
              key={`dot-outer-${i}`}
              cx={center + 330 * Math.cos((i * 15 * Math.PI) / 180)}
              cy={center + 330 * Math.sin((i * 15 * Math.PI) / 180)}
              r={3}
              fill="url(#mandalaGoldGradient)"
            />
          ))}
        </g>

        <g className="dot-ring" style={{ animationDelay: '0.5s' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <circle
              key={`dot-middle-${i}`}
              cx={center + 230 * Math.cos((i * 22.5 * Math.PI) / 180)}
              cy={center + 230 * Math.sin((i * 22.5 * Math.PI) / 180)}
              r={2.5}
              fill="url(#mandalaGoldGradient)"
            />
          ))}
        </g>

        <g className="dot-ring" style={{ animationDelay: '1s' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <circle
              key={`dot-inner-${i}`}
              cx={center + 130 * Math.cos((i * 30 * Math.PI) / 180)}
              cy={center + 130 * Math.sin((i * 30 * Math.PI) / 180)}
              r={2}
              fill="url(#mandalaGoldGradient)"
            />
          ))}
        </g>

        {/* Center gem/diamond */}
        <g className="center-gem">
          <polygon
            points={`${center},${center - 25} ${center + 20},${center} ${center},${center + 25} ${center - 20},${center}`}
            fill="url(#mandalaGoldGradient)"
            filter="url(#mandalaGlow)"
          />
          <circle
            cx={center}
            cy={center}
            r={8}
            fill="#FFD700"
            filter="url(#mandalaGlow)"
          />
        </g>
      </svg>
    </div>
  );
}
