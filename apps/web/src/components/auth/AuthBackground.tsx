'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AuthBackgroundProps {
  className?: string;
  enableParticles?: boolean;
}

/**
 * Premium animated background for auth pages (login/register)
 * Features:
 * - Gradient base with jewellery-inspired gold/amber tones
 * - Animated floating blobs (CSS-only)
 * - Optional gold dust particles
 * - Reduced motion support
 * - Mobile-friendly and performant (GPU-accelerated animations)
 */
export function AuthBackground({ 
  className, 
  enableParticles = true 
}: AuthBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Gold dust particles animation (canvas-based, lightweight)
  useEffect(() => {
    if (!enableParticles || prefersReducedMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle configuration - increased count for more visible effect
    const PARTICLE_COUNT = 50;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      opacityDirection: number;
      hue: number; // Add color variation
    }> = [];

    // Initialize particles
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: Math.random() * 3 + 1.5, // Larger particles
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5 - 0.2, // Slight upward drift
        opacity: Math.random() * 0.6 + 0.3, // Higher base opacity
        opacityDirection: Math.random() > 0.5 ? 1 : -1,
        hue: 40 + Math.random() * 20, // Gold to amber range
      });
    }

    let animationId: number;
    let lastTime = 0;
    const FPS_INTERVAL = 1000 / 30; // Cap at 30fps for performance

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      const elapsed = currentTime - lastTime;
      if (elapsed < FPS_INTERVAL) return;
      lastTime = currentTime - (elapsed % FPS_INTERVAL);

      const currentRect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, currentRect.width, currentRect.height);

      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = currentRect.width;
        if (particle.x > currentRect.width) particle.x = 0;
        if (particle.y < 0) particle.y = currentRect.height;
        if (particle.y > currentRect.height) particle.y = 0;

        // Gentle opacity pulsing
        particle.opacity += particle.opacityDirection * 0.003;
        if (particle.opacity > 0.9 || particle.opacity < 0.2) {
          particle.opacityDirection *= -1;
        }

        // Draw particle with gold/amber color variation
        const goldColor = `hsla(${particle.hue}, 80%, 55%, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = goldColor;
        ctx.fill();

        // Add larger glow effect
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 80%, 55%, ${particle.opacity * 0.15})`;
        ctx.fill();
      });
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [enableParticles, prefersReducedMotion]);

  return (
    <div 
      className={cn(
        'fixed inset-0 -z-10 overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      {/* Base gradient - jewellery-inspired warm tones with more contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50" />
      
      {/* Secondary gradient overlay - more vibrant */}
      <div className="absolute inset-0 bg-gradient-to-tl from-gold-200/50 via-transparent to-amber-100/40" />
      
      {/* Radial accent in center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-100/60 via-transparent to-transparent" />
      
      {/* Animated floating blobs - CSS only, GPU-accelerated - MORE VISIBLE */}
      <div 
        className={cn(
          "absolute -top-40 -right-40 w-96 h-96 rounded-full",
          "bg-gradient-to-br from-gold-300/60 to-amber-300/50",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob"
        )} 
      />
      <div 
        className={cn(
          "absolute top-1/4 -left-20 w-80 h-80 rounded-full",
          "bg-gradient-to-br from-yellow-300/50 to-gold-200/60",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-2000"
        )} 
      />
      <div 
        className={cn(
          "absolute -bottom-20 right-1/4 w-[28rem] h-[28rem] rounded-full",
          "bg-gradient-to-br from-amber-200/50 to-orange-200/40",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-4000"
        )} 
      />
      <div 
        className={cn(
          "absolute bottom-1/3 left-1/3 w-72 h-72 rounded-full",
          "bg-gradient-to-br from-gold-200/40 to-yellow-200/50",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-6000"
        )} 
      />
      
      {/* Additional accent blob */}
      <div 
        className={cn(
          "absolute top-1/2 right-1/3 w-64 h-64 rounded-full",
          "bg-gradient-to-br from-amber-300/30 to-gold-300/40",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-3000"
        )} 
      />
      
      {/* Diamond/gem sparkle accents - LARGER AND MORE VISIBLE */}
      <div 
        className={cn(
          "absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-gold-400 shadow-lg shadow-gold-400/50",
          !prefersReducedMotion && "animate-sparkle"
        )} 
      />
      <div 
        className={cn(
          "absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-lg shadow-amber-400/50",
          !prefersReducedMotion && "animate-sparkle animation-delay-500"
        )} 
      />
      <div 
        className={cn(
          "absolute top-2/3 left-1/4 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50",
          !prefersReducedMotion && "animate-sparkle animation-delay-1000"
        )} 
      />
      <div 
        className={cn(
          "absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50",
          !prefersReducedMotion && "animate-sparkle animation-delay-3000"
        )} 
      />
      <div 
        className={cn(
          "absolute top-1/2 left-1/5 w-1.5 h-1.5 rounded-full bg-gold-500 shadow-lg shadow-gold-400/50",
          !prefersReducedMotion && "animate-sparkle animation-delay-2000"
        )} 
      />
      <div 
        className={cn(
          "absolute bottom-1/3 left-2/3 w-2 h-2 rounded-full bg-amber-300 shadow-lg shadow-amber-300/50",
          !prefersReducedMotion && "animate-sparkle animation-delay-4000"
        )} 
      />
      
      {/* Gold dust particles canvas */}
      {enableParticles && !prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 1 }}
        />
      )}
      
      {/* Shimmer overlay for premium feel */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none",
          !prefersReducedMotion && "animate-shimmer"
        )}
      />
      
      {/* Subtle noise texture overlay for premium feel */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default AuthBackground;
