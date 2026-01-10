'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { Timeline, animate, stagger } from 'animejs';
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
 * 
 * Animation sequence:
 * 1. The Forge (0s - 1.5s): Ring draws itself elegantly (line tracing)
 * 2. The Polish (1.5s - 2.0s): Line fills with gold, diamond "pings"
 * 3. The Invitation (2.0s - 2.5s): Logo floats upward
 * 4. The Onboarding (2.5s+): Form fields slide up staggered
 */
export function GoldenUnveil({
  children,
  className,
  skipIntro = false,
  onAnimationComplete,
}: GoldenUnveilProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const brandTextRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [animationComplete, setAnimationComplete] = useState(skipIntro);
  const [showContent, setShowContent] = useState(skipIntro);

  useEffect(() => {
    if (skipIntro || !logoRef.current || !containerRef.current) {
      setAnimationComplete(true);
      setShowContent(true);
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setAnimationComplete(true);
      setShowContent(true);
      onAnimationComplete?.();
      return;
    }

    const logo = logoRef.current;
    const brandText = brandTextRef.current;
    const formContainer = formContainerRef.current;

    // Get SVG elements
    const ringPath = logo.querySelector('.logo-path') as SVGCircleElement;
    const innerPath = logo.querySelector('.logo-path-inner') as SVGCircleElement;
    const logoFill = logo.querySelector('.logo-fill') as SVGCircleElement;
    const diamondShape = logo.querySelector('.diamond-shape') as SVGPathElement;
    const diamondGlow = logo.querySelector('.diamond-glow') as SVGPathElement;
    const diamondSparkle = logo.querySelector('.diamond-sparkle') as SVGLineElement;
    const logoShimmer = logo.querySelector('.logo-shimmer') as SVGCircleElement;
    const gems = logo.querySelectorAll('.gem');
    const logoBg = logo.querySelector('.logo-bg') as SVGCircleElement;

    // Calculate stroke dashoffset for the ring (circumference)
    const circumference = 2 * Math.PI * 70;
    ringPath.style.strokeDasharray = `${circumference}`;
    ringPath.style.strokeDashoffset = `${circumference}`;

    const innerCircumference = 2 * Math.PI * 55;
    innerPath.style.strokeDasharray = `${innerCircumference}`;
    innerPath.style.strokeDashoffset = `${innerCircumference}`;

    // Create the timeline using anime.js 4 API
    const tl = new Timeline({
      defaults: {
        ease: 'outExpo',
      },
      onComplete: () => {
        setAnimationComplete(true);
        onAnimationComplete?.();
      },
    });

    tl
      // STEP 0: Fade in background circle
      .add(logoBg, {
        opacity: [0, 1],
        duration: 500,
        ease: 'outQuad',
      })

      // STEP 1: Draw the Ring (The "Forge")
      .add(ringPath, {
        strokeDashoffset: [circumference, 0],
        opacity: [0, 1],
        duration: 1800,
        ease: 'inOutSine',
      }, '-=300')

      // Inner decorative ring draws slightly after
      .add(innerPath, {
        strokeDashoffset: [innerCircumference, 0],
        opacity: [0, 0.6],
        duration: 1500,
        ease: 'inOutSine',
      }, '-=1200')

      // STEP 2: The Diamond Flash (The "Value")
      .add(diamondGlow, {
        opacity: [0, 0.8],
        scale: [0.5, 1.3, 1],
        duration: 600,
        ease: 'outElastic(1, 0.5)',
      }, '-=800')

      .add(diamondShape, {
        scale: [0, 1.3, 1],
        opacity: [0, 1],
        rotate: [0, 360],
        duration: 800,
        ease: 'outElastic(1, 0.5)',
      }, '-=600')

      // Diamond sparkle
      .add(diamondSparkle, {
        opacity: [0, 1, 0.8],
        scaleX: [0, 1.5, 1],
        duration: 400,
        ease: 'outQuad',
      }, '-=400')

      // STEP 3: Fill the Gold Color
      .add(logoFill, {
        opacity: [0, 0.3],
        strokeWidth: [8, 14, 12],
        duration: 800,
        ease: 'outQuad',
      }, '-=500')

      // Gems appear with stagger
      .add(gems, {
        opacity: [0, 1],
        scale: [0, 1.2, 1],
        duration: 400,
        delay: stagger(100),
        ease: 'outElastic(1, 0.6)',
      }, '-=600')

      // Shimmer sweep
      .add(logoShimmer, {
        opacity: [0, 0.6, 0],
        strokeDashoffset: [circumference, -circumference],
        duration: 1000,
        ease: 'inOutQuad',
      }, '-=400')

      // STEP 4: Reveal the Brand Text "Orivraa"
      .add(brandText!, {
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 800,
        ease: 'outQuad',
      }, '-=600')

      // STEP 5: Logo floats up (The "Invitation")
      .add([logo, brandText!], {
        translateY: [0, -20],
        duration: 600,
        ease: 'outQuad',
        onComplete: () => {
          setShowContent(true);
        },
      }, '+=200')

      // STEP 6: Form slides up (The "Onboarding")
      .add(formContainer!, {
        translateY: [60, 0],
        opacity: [0, 1],
        duration: 800,
        ease: 'outQuad',
      }, '-=400');

    // Interactive shine on logo hover (after animation)
    const handleLogoHover = () => {
      if (!animationComplete) return;
      animate(logoShimmer, {
        opacity: [0, 0.5, 0],
        strokeDashoffset: [circumference, -circumference],
        duration: 800,
        ease: 'inOutQuad',
      });
    };

    logo.addEventListener('mouseenter', handleLogoHover);

    return () => {
      tl.pause();
      logo.removeEventListener('mouseenter', handleLogoHover);
    };
  }, [skipIntro, onAnimationComplete, animationComplete]);

  // Interactive input focus/blur animations
  useEffect(() => {
    if (!animationComplete) return;

    const inputs = document.querySelectorAll('.golden-unveil-form input');
    
    const handleFocus = (e: Event) => {
      const input = e.target as HTMLInputElement;
      animate(input, {
        borderColor: ['#e5e7eb', '#D4AF37'],
        boxShadow: ['0 0 0px rgba(212, 175, 55, 0)', '0 0 20px rgba(212, 175, 55, 0.2)'],
        duration: 400,
        ease: 'outQuad',
      });
    };

    const handleBlur = (e: Event) => {
      const input = e.target as HTMLInputElement;
      animate(input, {
        borderColor: ['#D4AF37', '#e5e7eb'],
        boxShadow: '0 0 0px rgba(0,0,0,0)',
        duration: 400,
        ease: 'outQuad',
      });
    };

    inputs.forEach((input) => {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
    });

    return () => {
      inputs.forEach((input) => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      });
    };
  }, [animationComplete]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'min-h-screen flex flex-col items-center justify-center py-8 px-4 safe-area-inset overflow-hidden',
        className
      )}
    >
      <AuthBackground enableParticles={animationComplete} />

      {/* Logo Container */}
      <div className="flex flex-col items-center z-10 mb-6">
        <AnimatedLogo
          ref={logoRef}
          size={140}
          className={cn(
            'transition-all duration-300',
            animationComplete && 'hover:scale-105 cursor-pointer'
          )}
        />
        
        {/* Brand Text */}
        <div
          ref={brandTextRef}
          className="mt-4 text-center opacity-0"
          style={{ transform: 'translateY(30px)' }}
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
        ref={formContainerRef}
        className={cn(
          'w-full max-w-[420px] z-10 golden-unveil-form',
          !showContent && 'opacity-0',
          showContent && 'animate-none'
        )}
        style={{ 
          opacity: skipIntro ? 1 : 0,
          transform: skipIntro ? 'none' : 'translateY(60px)'
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default GoldenUnveil;
