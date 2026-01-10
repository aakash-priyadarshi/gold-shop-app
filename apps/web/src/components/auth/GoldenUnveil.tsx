'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import Link from 'next/link';
import { AnimatedLogo } from './AnimatedLogo';
import { AuthBackground } from './AuthBackground';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';

interface GoldenUnveilProps {
  children: ReactNode;
  className?: string;
  /** Skip the intro animation (useful for returning users) */
  skipIntro?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
}

/**
 * "The Golden Unveil" - Premium animated auth page wrapper
 * Uses CSS animations for reliability across all environments
 * 
 * Animation sequence:
 * 1. The Forge (0s - 1.8s): Ring draws itself elegantly (line tracing)
 * 2. The Polish (1.8s - 2.4s): Diamond "pings" with bounce
 * 3. The Invitation (2.4s - 3.0s): Logo floats upward
 * 4. The Onboarding (3.0s+): Form fields slide up
 */
export function GoldenUnveil({
  children,
  className,
  skipIntro = false,
  onAnimationComplete,
}: GoldenUnveilProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationStage, setAnimationStage] = useState<'init' | 'forge' | 'polish' | 'reveal' | 'invitation' | 'complete'>(
    skipIntro ? 'complete' : 'init'
  );
  const [showContent, setShowContent] = useState(skipIntro);

  useEffect(() => {
    if (skipIntro) {
      setAnimationStage('complete');
      setShowContent(true);
      return;
    }

    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        setAnimationStage('complete');
        setShowContent(true);
        onAnimationComplete?.();
        return;
      }
    }

    // Animation timeline using setTimeout for reliability
    const timers: NodeJS.Timeout[] = [];

    // Stage 1: Start (forge begins)
    timers.push(setTimeout(() => setAnimationStage('forge'), 100));
    
    // Stage 2: Polish (diamond appears)
    timers.push(setTimeout(() => setAnimationStage('polish'), 1900));
    
    // Stage 3: Reveal (brand text appears)
    timers.push(setTimeout(() => setAnimationStage('reveal'), 2500));
    
    // Stage 4: Invitation (logo floats up)
    timers.push(setTimeout(() => {
      setAnimationStage('invitation');
      setShowContent(true);
    }, 3100));
    
    // Stage 5: Complete
    timers.push(setTimeout(() => {
      setAnimationStage('complete');
      onAnimationComplete?.();
    }, 3900));

    return () => timers.forEach(clearTimeout);
  }, [skipIntro, onAnimationComplete]);

  const isAnimating = animationStage !== 'init' && animationStage !== 'complete';

  return (
    <div
      ref={containerRef}
      className={cn(
        'min-h-screen flex flex-col items-center justify-center py-8 px-4 safe-area-inset overflow-hidden',
        className
      )}
    >
      <AuthBackground enableMandala={animationStage !== 'init'} />

      {/* Logo Container */}
      <div 
        className={cn(
          "flex flex-col items-center z-10 mb-6 transition-transform duration-700 ease-out",
          (animationStage === 'invitation' || animationStage === 'complete') && "-translate-y-5"
        )}
      >
        <Link href="/" aria-label="Go to homepage">
          <AnimatedLogo
            size={140}
            className={cn(
              'transition-all duration-300',
              animationStage === 'complete' && 'hover:scale-105 cursor-pointer'
            )}
            animationStage={animationStage}
          />
        </Link>
        
        {/* Brand Text */}
        <div
          className={cn(
            "mt-4 text-center transition-all duration-700 ease-out",
            (animationStage === 'init' || animationStage === 'forge' || animationStage === 'polish') 
              ? "opacity-0 translate-y-8" 
              : "opacity-100 translate-y-0"
          )}
        >
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-foreground">Ori</span>
            <span className="gold-text-gradient">vraa</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 tracking-wide">
            {BRAND.tagline}
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div
        className={cn(
          'w-full max-w-[420px] z-10 golden-unveil-form transition-all duration-700 ease-out',
          !showContent ? 'opacity-0 translate-y-12' : 'opacity-100 translate-y-0'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default GoldenUnveil;
