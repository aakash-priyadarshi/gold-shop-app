'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { getDashboardRoute, UserRole } from '@/hooks/useAuth';
import { api } from '@/lib/api';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');
      const setupRequired = searchParams.get('setupRequired');

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: decodeURIComponent(error),
        });
        router.push('/auth/login');
        return;
      }

      if (!accessToken || !refreshToken) {
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: 'Invalid OAuth response. Please try again.',
        });
        router.push('/auth/login');
        return;
      }

      try {
        // Store tokens
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

        // Fetch user profile
        const response = await api.get('/auth/me');
        const user = response.data;

        // Check if shop setup is required (SHOPKEEPER via Google OAuth)
        if (setupRequired === 'shop' || (user.role === 'SHOPKEEPER' && !user.shopId)) {
          toast({
            title: 'Almost there!',
            description: 'Please complete your shop details to finish registration.',
          });
          window.location.href = '/auth/complete-shop-setup';
          return;
        }

        toast({
          title: 'Welcome!',
          description: `Signed in as ${user.firstName} ${user.lastName}`,
        });

        // Redirect to appropriate dashboard
        // Use window.location.href instead of router.push to force full page reload
        // This ensures NextAuth session and all auth state is properly refreshed
        const dashboardRoute = getDashboardRoute(user.role as UserRole);
        window.location.href = dashboardRoute;
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        
        toast({
          variant: 'destructive',
          title: 'Authentication failed',
          description: 'Failed to complete sign in. Please try again.',
        });
        router.push('/auth/login');
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuthBackground />
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 animate-spin border-t-transparent"></div>
        </div>
        <p className="text-sm text-gray-600 font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <AuthBackground />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 animate-spin border-t-transparent"></div>
          </div>
        </div>
      </div>
    }>
      <OAuthCallbackHandler />
    </Suspense>
  );
}
