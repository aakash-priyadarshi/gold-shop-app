'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface PinLockScreenProps {
  onUnlocked: () => void;
}

export function PinLockScreen({ onUnlocked }: PinLockScreenProps) {
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 6 || loading) return;
    const newPin = [...pin, digit];
    setPin(newPin);
    setError('');

    if (newPin.length === 6) {
      submitPin(newPin.join(''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, loading]);

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const submitPin = async (pinValue: string) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/pin/login', {
        userId: user.id,
        pin: pinValue,
      });
      // Store new tokens
      const { accessToken, refreshToken } = res.data;
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      }
      onUnlocked();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid PIN');
      setShaking(true);
      setPin([]);
      setTimeout(() => setShaking(false), 600);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      if (e.key === 'Backspace') handleDelete();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleDigit]);

  const numpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['⌫', '0', '✓'],
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Glowing orb background */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #B8941F 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        {/* Lock icon + branding */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-2"
            style={{ background: 'rgba(184, 148, 31, 0.15)', border: '2px solid rgba(184, 148, 31, 0.4)' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B8941F" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Session Locked</h1>
          {user && (
            <p className="text-gray-400 text-sm">
              Welcome back, <span className="text-amber-400">{user.firstName}</span>
            </p>
          )}
        </div>

        {/* PIN dots */}
        <div className={`flex gap-4 ${shaking ? 'animate-shake' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all duration-200"
              style={{
                background: i < pin.length ? '#B8941F' : 'rgba(255,255,255,0.15)',
                boxShadow: i < pin.length ? '0 0 12px rgba(184, 148, 31, 0.6)' : 'none',
                transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Error message */}
        <div className="h-5">
          {error && (
            <p className="text-red-400 text-sm text-center animate-fade-in">{error}</p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {numpadButtons.flat().map((btn, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (btn === '⌫') handleDelete();
                else if (btn === '✓') { if (pin.length === 6) submitPin(pin.join('')); }
                else handleDigit(btn);
              }}
              disabled={loading}
              className="w-16 h-16 rounded-2xl text-xl font-medium transition-all duration-150 active:scale-95 disabled:opacity-50"
              style={{
                background: btn === '✓'
                  ? 'linear-gradient(135deg, #B8941F, #D4A829)'
                  : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: btn === '✓' ? '#0f172a' : '#ffffff',
              }}
            >
              {loading && btn === '✓' ? '…' : btn}
            </button>
          ))}
        </div>

        {/* Forgot PIN */}
        <button
          onClick={() => router.push('/auth/login?reason=pin_forgot')}
          className="text-gray-500 text-sm hover:text-amber-400 transition-colors mt-2"
        >
          Forgot PIN? Sign in with password
        </button>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
