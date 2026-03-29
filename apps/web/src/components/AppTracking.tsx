'use client';

import { useState, useEffect } from 'react';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { useFrustrationDetector } from '@/hooks/useFrustrationDetector';
import { ErrorReporter } from '@/components/ui/ErrorReporter';
import { PinLockScreen } from '@/components/auth/PinLockScreen';
import { useSession } from 'next-auth/react';

/**
 * Client-side tracking shell:
 * - Web session open/close tracking
 * - Frustration / rage-click detection
 * - Error reporter (slide-up panel)
 * - PIN lock screen (after 30-min inactivity)
 *
 * Mount this inside Providers in layout.tsx
 */
export function AppTracking() {
  const { data: session } = useSession();
  const [pinLocked, setPinLocked] = useState(false);
  const [hasPinSetup, setHasPinSetup] = useState(false);

  useSessionTracker();
  useFrustrationDetector();

  // Listen for timeout event fired by useSessionTracker
  useEffect(() => {
    const handleTimeout = () => {
      // Only show PIN lock if user is logged in AND has a PIN set
      if (session?.user && hasPinSetup) {
        setPinLocked(true);
      }
    };
    window.addEventListener('orivraa:session_timeout', handleTimeout);
    return () => window.removeEventListener('orivraa:session_timeout', handleTimeout);
  }, [session, hasPinSetup]);

  // Check if user has a PIN on mount
  useEffect(() => {
    if (!session?.user) return;
    import('@/lib/api').then(({ default: api }) => {
      api.get('/auth/pin/status')
        .then(res => setHasPinSetup(res.data?.hasPin ?? false))
        .catch(() => {});
    });
  }, [session?.user]);

  return (
    <>
      {pinLocked && (
        <PinLockScreen onUnlocked={() => setPinLocked(false)} />
      )}
      <ErrorReporter />
    </>
  );
}
