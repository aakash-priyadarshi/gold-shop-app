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
 * - Clean light/dark background
 * - Golden dust rain falling from above
 * - Reduced motion support
 * - Mobile-friendly and performant
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

  // Golden rain particles animation
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

    // Golden rain particle configuration
    const PARTICLE_COUNT = 80;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      wobble: number;
      wobbleSpeed: number;
      hue: number;
    }> = [];

    // Initialize particles - spread across visible screen for immediate visibility
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height, // Start spread across visible area
        size: Math.random() * 2.5 + 1, // Slightly larger particles
        speed: Math.random() * 2 + 1, // Faster fall speed
        opacity: Math.random() * 0.7 + 0.3, // Higher opacity
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        hue: 38 + Math.random() * 15, // Gold range (38-53)
      });
    }

    let animationId: number;
    let lastTime = 0;
    const FPS_INTERVAL = 1000 / 60; // 60fps for smooth rain

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      const elapsed = currentTime - lastTime;
      if (elapsed < FPS_INTERVAL) return;
      lastTime = currentTime - (elapsed % FPS_INTERVAL);

      const currentRect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, currentRect.width, currentRect.height);

      particles.forEach((particle) => {
        // Update wobble
        particle.wobble += particle.wobbleSpeed;
        
        // Update position - falling down with slight wobble
        particle.y += particle.speed;
        particle.x += Math.sin(particle.wobble) * 0.3;

        // Reset to top when reaching bottom
        if (particle.y > currentRect.height + 10) {
          particle.y = -10;
          particle.x = Math.random() * currentRect.width;
          particle.opacity = Math.random() * 0.6 + 0.2;
        }

        // Wrap horizontal
        if (particle.x < 0) particle.x = currentRect.width;
        if (particle.x > currentRect.width) particle.x = 0;

        // Draw golden dust particle
        const goldColor = `hsla(${particle.hue}, 85%, 55%, ${particle.opacity})`;
        
        // Main particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = goldColor;
        ctx.fill();

        // Subtle glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 85%, 60%, ${particle.opacity * 0.15})`;
        ctx.fill();

        // Tiny trail effect
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - Math.sin(particle.wobble) * 2, particle.y - particle.speed * 3);
        ctx.strokeStyle = `hsla(${particle.hue}, 85%, 60%, ${particle.opacity * 0.3})`;
        ctx.lineWidth = particle.size * 0.5;
        ctx.stroke();
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
      {/* Clean background - light mode: soft cream, dark mode: dark slate */}
      <div className="absolute inset-0 bg-stone-50 dark:bg-slate-950 transition-colors duration-300" />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-stone-100/30 dark:from-slate-900/50 dark:via-transparent dark:to-slate-900/30" />
      
      {/* Golden rain particles canvas */}
      {enableParticles && !prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.9 }}
        />
      )}
      
      {/* Very subtle noise texture for premium feel */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default AuthBackground;
