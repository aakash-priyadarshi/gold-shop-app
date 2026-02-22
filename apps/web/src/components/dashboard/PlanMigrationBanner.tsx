'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react';
import { sellerSubscriptionsApi } from '@/lib/api';

interface MigrationInfo {
  subscriptionId: string;
  currentPlan: string;
  successorPlan: {
    id: string;
    name: string;
    displayName: string;
    monthlyPrice: number;
    annualPrice?: number;
    currency: string;
    features?: Record<string, unknown>;
  } | null;
  migrationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  periodEnd: string;
  notifiedAt: string;
}

/**
 * Banner shown on seller dashboard when they have a pending plan migration.
 * Shows accept/decline buttons if PENDING.
 * Shows status confirmation if ACCEPTED/DECLINED.
 */
export function PlanMigrationBanner() {
  const [migration, setMigration] = useState<MigrationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMigration = async () => {
      try {
        const res = await sellerSubscriptionsApi.getMyMigration();
        setMigration(res.data);
      } catch {
        // No migration or not authenticated — just hide
      } finally {
        setLoading(false);
      }
    };
    fetchMigration();
  }, []);

  const handleRespond = async (accept: boolean) => {
    if (!migration) return;
    setResponding(true);
    try {
      const res = await sellerSubscriptionsApi.respondToMigration(
        migration.subscriptionId,
        accept,
      );
      setResponseMessage(res.data.message);
      setMigration((prev) =>
        prev
          ? { ...prev, migrationStatus: accept ? 'ACCEPTED' : 'DECLINED' }
          : null,
      );
    } catch (err: any) {
      setResponseMessage(
        err?.response?.data?.message || 'Failed to respond. Please try again.',
      );
    } finally {
      setResponding(false);
    }
  };

  if (loading || !migration) return null;

  const periodEndDate = new Date(migration.periodEnd).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  // ─── Already responded ───────────────────────────────
  if (migration.migrationStatus === 'ACCEPTED') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Migration Accepted
            </p>
            <p className="text-xs text-green-600">
              {responseMessage ||
                `You will be migrated to "${migration.successorPlan?.displayName}" on ${periodEndDate}.`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (migration.migrationStatus === 'DECLINED') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 py-4">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Migration Declined
            </p>
            <p className="text-xs text-red-600">
              {responseMessage ||
                `Your current plan will end on ${periodEndDate}. You will be moved to the Free plan.`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Pending — Show action buttons ───────────────────
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Your plan is being discontinued
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Your <strong>{migration.currentPlan}</strong> plan will end on{' '}
                <strong>{periodEndDate}</strong>. You can migrate to{' '}
                <strong>{migration.successorPlan?.displayName}</strong> (
                {migration.successorPlan?.currency}{' '}
                {migration.successorPlan?.monthlyPrice}/mo) or stay on the Free
                plan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleRespond(true)}
                disabled={responding}
              >
                {responding ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                )}
                Migrate to {migration.successorPlan?.displayName}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
                onClick={() => handleRespond(false)}
                disabled={responding}
              >
                {responding ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Stay on Free
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PlanMigrationBanner;
