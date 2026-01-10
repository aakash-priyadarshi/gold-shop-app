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

    // Particle configuration - keep count low for performance
    const PARTICLE_COUNT = 25;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      opacityDirection: number;
    }> = [];

    // Initialize particles
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.1, // Slight upward drift
        opacity: Math.random() * 0.5 + 0.2,
        opacityDirection: Math.random() > 0.5 ? 1 : -1,
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
        particle.opacity += particle.opacityDirection * 0.002;
        if (particle.opacity > 0.7 || particle.opacity < 0.1) {
          particle.opacityDirection *= -1;
        }

        // Draw particle with gold color
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${particle.opacity})`;
        ctx.fill();

        // Add subtle glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${particle.opacity * 0.2})`;
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
      {/* Base gradient - jewellery-inspired warm tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-yellow-50/80" />
      
      {/* Secondary gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tl from-gold-100/30 via-transparent to-orange-50/20" />
      
      {/* Animated floating blobs - CSS only, GPU-accelerated */}
      <div 
        className={cn(
          "absolute -top-40 -right-40 w-80 h-80 rounded-full",
          "bg-gradient-to-br from-gold-200/40 to-amber-200/30",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob"
        )} 
      />
      <div 
        className={cn(
          "absolute top-1/4 -left-20 w-72 h-72 rounded-full",
          "bg-gradient-to-br from-yellow-200/30 to-gold-100/40",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-2000"
        )} 
      />
      <div 
        className={cn(
          "absolute -bottom-20 right-1/4 w-96 h-96 rounded-full",
          "bg-gradient-to-br from-amber-100/30 to-orange-100/20",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-4000"
        )} 
      />
      <div 
        className={cn(
          "absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full",
          "bg-gradient-to-br from-gold-100/20 to-yellow-100/30",
          "blur-3xl",
          !prefersReducedMotion && "animate-blob animation-delay-6000"
        )} 
      />
      
      {/* Diamond/gem sparkle accents */}
      <div 
        className={cn(
          "absolute top-1/4 right-1/4 w-1 h-1 rounded-full bg-gold-400",
          !prefersReducedMotion && "animate-sparkle"
        )} 
      />
      <div 
        className={cn(
          "absolute top-2/3 left-1/4 w-1.5 h-1.5 rounded-full bg-amber-400",
          !prefersReducedMotion && "animate-sparkle animation-delay-1000"
        )} 
      />
      <div 
        className={cn(
          "absolute bottom-1/4 right-1/3 w-1 h-1 rounded-full bg-yellow-400",
          !prefersReducedMotion && "animate-sparkle animation-delay-3000"
        )} 
      />
      
      {/* Gold dust particles canvas */}
      {enableParticles && !prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.8 }}
        />
      )}
      
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
