'use client';

import { forwardRef, type ComponentType, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

// Heroicons type
type HeroIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<IconSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  icon: HeroIcon;
  size?: IconSize;
  className?: string;
  'aria-label'?: string;
}

/**
 * Icon wrapper component for Heroicons
 * Standardizes icon sizing and accessibility across the app
 * 
 * @example
 * import { UserIcon } from '@heroicons/react/24/outline';
 * <Icon icon={UserIcon} size="md" aria-label="User" />
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size = 'md', className, 'aria-label': ariaLabel, ...props }, ref) => {
    return (
      <IconComponent
        ref={ref}
        className={cn(sizeClasses[size], className)}
        aria-hidden={!ariaLabel}
        aria-label={ariaLabel}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

// Pre-configured icon sizes for common use cases
export const iconSizes = {
  button: 'md' as IconSize,      // For buttons
  input: 'sm' as IconSize,       // For input icons
  nav: 'md' as IconSize,         // For navigation
  sidebar: 'md' as IconSize,     // For sidebar items
  action: 'lg' as IconSize,      // For action buttons
  hero: 'xl' as IconSize,        // For hero sections
};

export default Icon;
