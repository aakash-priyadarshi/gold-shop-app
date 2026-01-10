'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';

interface BrandLogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  linkToHome?: boolean;
  showTagline?: boolean;
}

const sizeMap = {
  sm: { icon: 28, full: 120, wordmark: 100 },
  md: { icon: 36, full: 160, wordmark: 130 },
  lg: { icon: 48, full: 200, wordmark: 160 },
  xl: { icon: 64, full: 280, wordmark: 220 },
};

const heightMap = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export function BrandLogo({
  variant = 'full',
  size = 'md',
  theme = 'auto',
  className,
  linkToHome = true,
  showTagline = false,
}: BrandLogoProps) {
  const width = sizeMap[size][variant];
  const height = heightMap[size];

  const getLogoSrc = () => {
    if (variant === 'icon') {
      return '/brand/orivraa-icon.svg';
    }
    if (theme === 'dark') {
      return '/brand/orivraa-logo-dark.svg';
    }
    return '/brand/orivraa-logo.svg';
  };

  const LogoContent = () => {
    if (variant === 'wordmark') {
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <div 
            className={cn(
              'rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 flex items-center justify-center',
              size === 'sm' && 'w-7 h-7',
              size === 'md' && 'w-9 h-9',
              size === 'lg' && 'w-12 h-12',
              size === 'xl' && 'w-16 h-16',
            )}
          >
            <span 
              className={cn(
                'font-bold text-white',
                size === 'sm' && 'text-sm',
                size === 'md' && 'text-lg',
                size === 'lg' && 'text-xl',
                size === 'xl' && 'text-3xl',
              )}
            >
              O
            </span>
          </div>
          <div className="flex flex-col">
            <span 
              className={cn(
                'font-bold tracking-wide',
                size === 'sm' && 'text-base',
                size === 'md' && 'text-xl',
                size === 'lg' && 'text-2xl',
                size === 'xl' && 'text-3xl',
              )}
            >
              <span className="text-foreground">Ori</span>
              <span className="text-gold-500">vraa</span>
            </span>
            {showTagline && (
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                {BRAND.tagline}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <Image
        src={getLogoSrc()}
        alt={BRAND.name}
        width={width}
        height={height}
        className={cn('object-contain', className)}
        priority
      />
    );
  };

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}

// Icon-only version for compact spaces
export function BrandIcon({ 
  size = 'md', 
  className 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string;
}) {
  return (
    <div 
      className={cn(
        'rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 flex items-center justify-center shadow-lg',
        size === 'sm' && 'w-8 h-8',
        size === 'md' && 'w-10 h-10',
        size === 'lg' && 'w-12 h-12',
        size === 'xl' && 'w-16 h-16',
        className
      )}
    >
      <Image
        src="/brand/orivraa-icon.svg"
        alt={BRAND.name}
        width={sizeMap[size].icon}
        height={sizeMap[size].icon}
        className="object-contain"
      />
    </div>
  );
}
