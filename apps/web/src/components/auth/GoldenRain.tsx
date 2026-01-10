'use client';

import { useEffect, useState, useMemo } from 'react';

interface RainDrop {
  id: number;
  left: number;
  delay: number;
  duration: number;
  opacity: number;
  stemHeight: number;
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
        delay: Math.random() * 3, // 0-3s delay for staggered start
        duration: 1 + Math.random() * 1, // 1-2s duration
        opacity: 0.4 + Math.random() * 0.4, // 0.4-0.8 opacity
        stemHeight: 50 + Math.random() * 50, // 50-100px stem height
      });
    }
    return generatedDrops;
  }, [dropCount]);

  if (!mounted || !enabled) return null;

  return (
    <div className="golden-rain-container">
      <style jsx>{`
        .golden-rain-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .rain-drop {
          position: absolute;
          top: -100px;
          width: 2px;
          pointer-events: none;
          animation: fall-down linear infinite;
        }

        .rain-drop::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(212, 175, 55, 0.1) 20%,
            rgba(229, 163, 30, 0.4) 50%,
            rgba(255, 215, 0, 0.8) 80%,
            rgba(255, 215, 0, 1) 100%
          );
          border-radius: 0 0 2px 2px;
        }

        .rain-drop::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: rgba(255, 215, 0, 0.9);
          border-radius: 50%;
          box-shadow: 
            0 0 6px 2px rgba(255, 215, 0, 0.6),
            0 0 12px 4px rgba(255, 215, 0, 0.3);
        }

        @keyframes fall-down {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px));
            opacity: 0;
          }
        }
      `}</style>

      {drops.map((drop) => (
        <div
          key={drop.id}
          className="rain-drop"
          style={{
            left: `${drop.left}%`,
            height: `${drop.stemHeight}px`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
            opacity: drop.opacity,
          }}
        />
      ))}
    </div>
  );
}