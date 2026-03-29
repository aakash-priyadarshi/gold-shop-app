'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { triggerErrorReporter } from '@/components/ui/ErrorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info);
    // Trigger the reporter after a brief delay so React finishes rendering
    setTimeout(() => {
      triggerErrorReporter({
        trigger: 'boundary',
        errorMessage: error.message,
        page: typeof window !== 'undefined' ? window.location.pathname : '/',
        autoShow: true,
      });
    }, 500);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            className="min-h-screen flex flex-col items-center justify-center gap-6"
            style={{ background: '#0f172a', color: '#fff' }}
          >
            <div className="text-6xl">⚠️</div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
              <p className="text-gray-400 text-sm mb-6">
                We&apos;ve been notified and are looking into it.
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.reload();
                }}
                className="px-6 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #B8941F, #D4A829)', color: '#0f172a' }}
              >
                Reload page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
