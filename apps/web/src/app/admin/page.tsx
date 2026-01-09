'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect /admin to /dashboard/admin
 * This handles the case when users try to access /admin directly
 */
export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}
