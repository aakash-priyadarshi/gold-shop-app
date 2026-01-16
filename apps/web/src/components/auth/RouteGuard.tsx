'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, UserRole, getDashboardRoute, isRouteAllowedForRole } from '@/hooks/useAuth';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export function RouteGuard({ 
  children, 
  allowedRoles, 
  requireAuth = true 
}: RouteGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      const redirectUrl = encodeURIComponent(pathname);
      router.push(`/auth/login?redirect=${redirectUrl}`);
      return;
    }

    // If specific roles are required
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect to user's appropriate dashboard
      router.push(getDashboardRoute(user.role));
      return;
    }

    // Check if current route is allowed for user's role
    if (isAuthenticated && user && !isRouteAllowedForRole(pathname, user.role)) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isLoading, isAuthenticated, user, pathname, router, allowedRoles, requireAuth]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and auth is required, show nothing (redirect happening)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // If role check fails, show nothing (redirect happening)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

// Specific guards for each role
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['ADMIN']} requireAuth={true}>
      {children}
    </RouteGuard>
  );
}

export function ShopkeeperGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, let RouteGuard handle it
    if (!isAuthenticated || !user) return;

    // If user is SHOPKEEPER but has no shop, redirect to complete setup
    // Exception: if already on the setup page, don't redirect
    if (user.role === 'SHOPKEEPER' && !user.shop?.id && pathname !== '/auth/complete-shop-setup') {
      router.replace('/auth/complete-shop-setup');
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  // Show loading while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If shopkeeper has no shop, show nothing (redirect happening)
  if (user?.role === 'SHOPKEEPER' && !user.shop?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your shop...</p>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard allowedRoles={['SHOPKEEPER']} requireAuth={true}>
      {children}
    </RouteGuard>
  );
}

// Alias for ShopkeeperGuard
export const ShopGuard = ShopkeeperGuard;

export function CustomerGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['CUSTOMER']} requireAuth={true}>
      {children}
    </RouteGuard>
  );
}

// Guard for shop-related pages (Admin and Shopkeeper)
export function ShopAccessGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={['ADMIN', 'SHOPKEEPER']} requireAuth={true}>
      {children}
    </RouteGuard>
  );
}
