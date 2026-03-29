'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

type FrustrationType = 'rage_click' | 'api_error' | 'manual' | 'boundary';

interface ErrorReporterProps {
  trigger?: FrustrationType;
  autoShow?: boolean;
  errorMessage?: string;
  page?: string;
  onClose?: () => void;
}

/** Global singleton so we can trigger it from anywhere */
let globalTrigger: ((opts: Omit<ErrorReporterProps, 'onClose'>) => void) | null = null;
export function triggerErrorReporter(opts: Omit<ErrorReporterProps, 'onClose'>) {
  globalTrigger?.(opts);
}

export function ErrorReporter({ trigger, autoShow = false, errorMessage = '', page, onClose }: ErrorReporterProps) {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(autoShow);
  const [description, setDescription] = useState('');
  const [wantsScreenshot, setWantsScreenshot] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<FrustrationType | undefined>(trigger);
  const [currentError, setCurrentError] = useState(errorMessage);
  const [currentPage, setCurrentPage] = useState(page || '');
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  // Register global trigger
  useEffect(() => {
    globalTrigger = (opts) => {
      setCurrentTrigger(opts.trigger);
      setCurrentError(opts.errorMessage || '');
      setCurrentPage(opts.page || window.location.pathname);
      setSubmitted(false);
      setDescription('');
      setVisible(true);
    };
    return () => { globalTrigger = null; };
  }, []);

  // Auto-dismiss timer (30s)
  useEffect(() => {
    if (!visible) return;
    dismissTimer.current = setTimeout(() => {
      if (!submitting) setVisible(false);
    }, 30_000);
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, [visible, submitting]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let screenshotUrl: string | undefined;

      if (wantsScreenshot) {
        // Dynamic import html2canvas to avoid bundle bloat
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(document.body, { scale: 0.5, useCORS: true });
          const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.6));
          const form = new FormData();
          form.append('file', blob, 'screenshot.jpg');
          const uploadRes = await api.post('/upload/screenshot', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          screenshotUrl = uploadRes.data?.url;
        } catch { /* screenshot optional, continue */ }
      }

      await api.post('/crash-reports', {
        errorMessage: currentError || 'User-reported issue',
        page: currentPage || window.location.pathname,
        platform: 'web',
        userRole: session?.user?.role || 'guest',
        sessionToken: sessionStorage.getItem('orivraa_ws_token') || undefined,
        userTriggered: true,
        userDescription: description || undefined,
        screenshotUrl,
        frustrationType: currentTrigger || 'manual',
      });

      setSubmitted(true);
      setTimeout(() => setVisible(false), 3000);
    } catch { /* silent */ } finally {
      setSubmitting(false);
    }
  };

  const handleMessageAdmin = () => {
    window.dispatchEvent(new CustomEvent('orivraa:open_support', {
      detail: { title: 'Support Request', category: 'SHOPKEEPER_FEEDBACK' },
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9998] w-80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        border: '1px solid rgba(184, 148, 31, 0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">🔔</span>
          <span className="text-white font-medium text-sm">
            {submitted ? 'Thanks for the report!' : 'Having trouble?'}
          </span>
        </div>
        <button
          onClick={() => { setVisible(false); onClose?.(); }}
          className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {submitted ? (
        <div className="px-4 py-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-300 text-sm">Our team has been notified. We'll look into it shortly.</p>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-3">
          <p className="text-gray-400 text-sm">
            It looks like something went wrong. Help us improve by letting us know.
          </p>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what you were doing... (optional)"
            rows={3}
            className="w-full rounded-lg text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '8px 12px',
            }}
          />

          {/* Screenshot opt-in */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wantsScreenshot}
              onChange={e => setWantsScreenshot(e.target.checked)}
              className="rounded"
              style={{ accentColor: '#B8941F' }}
            />
            <span className="text-gray-400 text-xs">Include screenshot (helps us understand the issue)</span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #B8941F, #D4A829)',
              color: '#0f172a',
            }}
          >
            {submitting ? 'Sending…' : 'Send Report'}
          </button>

          {/* Shopkeeper-only: message admin */}
          {session?.user?.role === 'SHOPKEEPER' && (
            <button
              onClick={handleMessageAdmin}
              className="w-full py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              💬 Message Admin instead
            </button>
          )}

          <button
            onClick={() => { setVisible(false); onClose?.(); }}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors text-center"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
