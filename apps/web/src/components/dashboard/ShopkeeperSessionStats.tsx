'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

interface SessionStats {
  thisWeek: number;
  thisMonth: number;
  avgSessionMinutes: number;
  totalPageViews: number;
  desktopSessionsThisWeek: number;
}

/**
 * Compact session stats bar for shopkeeper dashboard header.
 * Shows: weekly sessions, avg time, desktop vs web usage.
 */
export function ShopkeeperSessionStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== 'SHOPKEEPER') return;
    api.get('/sessions/web/my-stats')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (session?.user?.role !== 'SHOPKEEPER') return null;
  if (loading) return null; // Silent load, non-critical

  return (
    <div className="flex items-center gap-6 flex-wrap mb-2">
      <StatPill
        icon="📊"
        label="Sessions this week"
        value={stats?.thisWeek ?? 0}
        suffix=""
      />
      <StatPill
        icon="⏱"
        label="Avg session"
        value={stats?.avgSessionMinutes ?? 0}
        suffix="min"
      />
      <StatPill
        icon="📄"
        label="Page views"
        value={stats?.totalPageViews ?? 0}
        suffix=""
      />
      {(stats?.desktopSessionsThisWeek ?? 0) > 0 && (
        <StatPill
          icon="🖥"
          label="Desktop sessions"
          value={stats?.desktopSessionsThisWeek ?? 0}
          suffix=""
        />
      )}
    </div>
  );
}

function StatPill({ icon, label, value, suffix }: {
  icon: string; label: string; value: number; suffix: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-white">
          {value.toLocaleString()}{suffix ? ` ${suffix}` : ''}
        </p>
      </div>
    </div>
  );
}
