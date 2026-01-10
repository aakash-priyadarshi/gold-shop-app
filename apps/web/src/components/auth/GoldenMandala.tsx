'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface GoldenMandalaProps {
  enabled?: boolean;
  size?: number;
}

export function GoldenMandala({ enabled = true, size = 900 }: GoldenMandalaProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !enabled) return null;

  return (
    <>
      <style>{`
        @keyframes rotate-cw {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes rotate-ccw {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }
      `}</style>

      {/* Layer 1 - Outer ring rotating clockwise (slowest) */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size,
          height: size,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.25,
          animation: 'rotate-cw 120s linear infinite',
          clipPath: 'circle(50% at 50% 50%)',
        }}
      >
        <Image
          src="/mandala.svg"
          alt=""
          width={size}
          height={size}
          style={{ width: '100%', height: '100%' }}
          priority
        />
      </div>

      {/* Layer 2 - Middle ring rotating counter-clockwise */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.7,
          height: size * 0.7,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.3,
          animation: 'rotate-ccw 80s linear infinite',
          clipPath: 'circle(50% at 50% 50%)',
        }}
      >
        <Image
          src="/mandala.svg"
          alt=""
          width={size * 0.7}
          height={size * 0.7}
          style={{ width: '100%', height: '100%' }}
          priority
        />
      </div>

      {/* Layer 3 - Inner ring rotating clockwise (fastest) */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.4,
          height: size * 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.35,
          animation: 'rotate-cw 50s linear infinite',
          clipPath: 'circle(50% at 50% 50%)',
        }}
      >
        <Image
          src="/mandala.svg"
          alt=""
          width={size * 0.4}
          height={size * 0.4}
          style={{ width: '100%', height: '100%' }}
          priority
        />
      </div>
    </>
  );
}
