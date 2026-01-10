'use client';

import { useEffect, useState, useMemo } from 'react';

interface RainDrop {
  id: number;
  left: number;
  delay: number;
  duration: number;
  opacity: number;
  stemHeight: number;
  splatDelay: number;
  splatDuration: number;
}

interface GoldenRainProps {
  enabled?: boolean;
  dropCount?: number;
}

export function GoldenRain({ enabled = true, dropCount = 100 }: GoldenRainProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate random drops once on mount
  const drops = useMemo(() => {
    const generatedDrops: RainDrop[] = [];
    for (let i = 0; i < dropCount; i++) {
      generatedDrops.push({
        id: i,
        left: Math.random() * 100, // 0-100%
        delay: Math.random() * 2, // 0-2s delay
        duration: 0.5 + Math.random() * 0.5, // 0.5-1s duration
        opacity: 0.3 + Math.random() * 0.5, // 0.3-0.8 opacity
        stemHeight: 60 + Math.random() * 40, // 60-100% stem height
        splatDelay: Math.random() * 2, // Splat animation delay
        splatDuration: 0.5 + Math.random() * 0.3, // Splat duration
      });
    }
    return generatedDrops;
  }, [dropCount]);

  if (!mounted || !enabled) return null;

  return (
    <>
      <style jsx global>{`
        .golden-rain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .golden-drop {
          position: absolute;
          bottom: 100%;
          width: 12px;
          height: 80px;
          pointer-events: none;
          animation: golden-drop-fall linear infinite;
        }

        @keyframes golden-drop-fall {
          0% {
            transform: translateY(0vh);
          }
          75% {
            transform: translateY(90vh);
          }
          100% {
            transform: translateY(90vh);
          }
        }

        .golden-stem {
          width: 1px;
          height: 60%;
          margin-left: 6px;
          background: linear-gradient(
            to bottom,
            rgba(212, 175, 55, 0),
            rgba(212, 175, 55, 0.2) 30%,
            rgba(229, 163, 30, 0.5) 60%,
            rgba(255, 215, 0, 0.7) 100%
          );
          animation: golden-stem-pulse 0.3s infinite;
        }

        @keyframes golden-stem-pulse {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        .golden-splat {
          width: 12px;
          height: 8px;
          border-top: 2px dotted rgba(255, 215, 0, 0.7);
          border-radius: 50%;
          opacity: 1;
          transform: scale(0);
          animation: golden-splat-anim ease-out infinite;
        }

        @keyframes golden-splat-anim {
          0% {
            opacity: 1;
            transform: scale(0);
          }
          70% {
            opacity: 0.8;
            transform: scale(1.8);
          }
          100% {
            opacity: 0;
            transform: scale(2.2);
          }
        }

        /* Glow effect for premium feel */
        .golden-drop::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 4px;
          width: 4px;
          height: 4px;
          background: rgba(255, 215, 0, 0.8);
          border-radius: 50%;
          box-shadow: 0 0 8px 2px rgba(255, 215, 0, 0.4);
        }
      `}</style>

      <div className="golden-rain">
        {drops.map((drop) => (
          <div
            key={drop.id}
            className="golden-drop"
            style={{
              left: `${drop.left}%`,
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
              opacity: drop.opacity,
            }}
          >
            <div 
              className="golden-stem"
              style={{
                height: `${drop.stemHeight}%`,
              }}
            />
            <div 
              className="golden-splat"
              style={{
                animationDelay: `${drop.splatDelay}s`,
                animationDuration: `${drop.splatDuration}s`,
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
