'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface GoldenMandalaProps {
  enabled?: boolean;
  size?: number;
}

export function GoldenMandala({ enabled = true, size = 4500 }: GoldenMandalaProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for mobile on mount and resize
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted || !enabled) return null;

  // Responsive size - smaller on mobile for performance
  const responsiveSize = isMobile ? size * 0.5 : size;

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
          width: responsiveSize,
          height: responsiveSize,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.25,
          animation: 'rotate-cw 120s linear infinite',
        }}
      >
        <Image
          src="/mandala.svg"
          alt=""
          width={responsiveSize}
          height={responsiveSize}
          style={{ width: '100%', height: '100%' }}
          priority
        />
      </div>

      {/* Layer 2 - Inner ring rotating clockwise (fastest) */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: responsiveSize * 0.4,
          height: responsiveSize * 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.35,
          animation: 'rotate-cw 50s linear infinite',
        }}
      >
        <Image
          src="/mandala.svg"
          alt=""
          width={responsiveSize * 0.4}
          height={responsiveSize * 0.4}
          style={{ width: '100%', height: '100%' }}
          priority
        />
      </div>
    </>
  );
}
