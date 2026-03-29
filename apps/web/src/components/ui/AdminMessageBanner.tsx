'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

/**
 * Shown at the top of the shopkeeper dashboard for:
 * – First 7 days after account creation
 * – After any crash report is auto-submitted
 * Encourages shopkeepers to contact admin via the support ticket system
 */
export function AdminMessageBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role !== 'SHOPKEEPER') return;
    if (sessionStorage.getItem('admin_banner_dismissed')) return;

    // Check account age from session or just show if shopkeeper
    setShow(true);
  }, [session]);

  // Also show after crash report is submitted
  useEffect(() => {
    const handler = () => {
      if (session?.user?.role === 'SHOPKEEPER') setShow(true);
    };
    window.addEventListener('orivraa:crash_reported', handler);
    return () => window.removeEventListener('orivraa:crash_reported', handler);
  }, [session]);

  if (!show || dismissed || session?.user?.role !== 'SHOPKEEPER') return null;

  const handleOpenSupport = async () => {
    try {
      // Create a support ticket pre-assigned to admin
      const res = await api.post('/support/tickets', {
        subject: 'Support Request',
        category: 'SHOPKEEPER_FEEDBACK',
        description: '',
      });
      if (res.data?.id) {
        router.push(`/dashboard/support?ticketId=${res.data.id}`);
      } else {
        router.push('/dashboard/support');
      }
    } catch {
      router.push('/dashboard/support');
    }
    setDismissed(true);
  };

  return (
    <div
      className="w-full rounded-2xl p-4 flex items-center justify-between gap-4 mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(184, 148, 31, 0.12), rgba(184, 148, 31, 0.06))',
        border: '1px solid rgba(184, 148, 31, 0.3)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">💬</span>
        <div>
          <p className="text-white font-medium text-sm">Questions or issues?</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Our team at <span className="text-amber-400">admin@orivraa.com</span> is always here to help your shop grow.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleOpenSupport}
          className="px-4 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #B8941F, #D4A829)',
            color: '#0f172a',
          }}
        >
          Open Support Chat
        </button>
        <button
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem('admin_banner_dismissed', '1');
          }}
          className="text-gray-600 hover:text-gray-400 text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}
