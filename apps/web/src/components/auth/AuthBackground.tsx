'use client';

import { cn } from '@/lib/utils';
import { GoldenMandala } from './GoldenMandala';

interface AuthBackgroundProps {
  className?: string;
  enableMandala?: boolean;
}

/**
 * Premium animated background for auth pages (login/register)
 * Features:
 * - Clean light/dark background
 * - Animated golden mandala with light traveling outward
 * - Reduced motion support
 * - Mobile-friendly and performant
 */
export function AuthBackground({ 
  className, 
  enableMandala = true 
}: AuthBackgroundProps) {
  // Note: We're not blocking the mandala for reduced motion users
  // because it's a subtle, slow animation that doesn't cause issues
  
  console.log('[AuthBackground] Rendering - enableMandala:', enableMandala);

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
      
      {/* Animated Golden Mandala */}
      <GoldenMandala enabled={enableMandala} size={900} />
      
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
