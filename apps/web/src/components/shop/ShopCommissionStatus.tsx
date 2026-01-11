'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle,
  Ban,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface CommissionSummary {
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
  nextDueDate: string | null;
}

interface ShopCommissionStatusProps {
  shopId: string;
  isOnHold?: boolean;
  holdReason?: string;
}

export function ShopCommissionStatus({ shopId, isOnHold, holdReason }: ShopCommissionStatusProps) {
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await api.get(`/commission/shop/${shopId}/summary`);
        setSummary(response.data);
      } catch (error) {
        console.error('Failed to fetch commission summary:', error);
      } finally {
        setLoading(false);
      }
    }

    if (shopId) {
      fetchSummary();
    }
  }, [shopId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show blocking banner if shop is on hold
  if (isOnHold) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-600">Shop On Hold</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            Your shop is currently on hold due to overdue commissions. New orders cannot be placed until you settle your outstanding commissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {holdReason && (
              <div className="p-3 bg-red-100 rounded-md text-sm text-red-800">
                <strong>Reason:</strong> {holdReason}
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary?.totalOverdue || 0)}
                </div>
                <div className="text-sm text-red-700">Overdue Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {summary?.overdueCount || 0}
                </div>
                <div className="text-sm text-red-700">Overdue Orders</div>
              </div>
            </div>
            <p className="text-sm text-red-700">
              Please contact the platform administrator to settle your commissions and restore shop operations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show commission status banner if there are pending or overdue commissions
  if (summary && (summary.pendingCount > 0 || summary.overdueCount > 0)) {
    const hasOverdue = summary.overdueCount > 0;

    return (
      <Card className={hasOverdue ? 'border-orange-300 bg-orange-50' : 'border-yellow-300 bg-yellow-50'}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasOverdue ? (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
              <CardTitle className={hasOverdue ? 'text-orange-700' : 'text-yellow-700'}>
                {hasOverdue ? 'Action Required: Overdue Commissions' : 'Pending Commissions'}
              </CardTitle>
            </div>
            <Link href="/dashboard/shop/commissions">
              <Button variant="outline" size="sm">
                View Details
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-xl font-bold ${hasOverdue ? 'text-red-600' : 'text-yellow-700'}`}>
                {formatCurrency(summary.totalPending + summary.totalOverdue)}
              </div>
              <div className="text-sm text-muted-foreground">Total Due</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-700">
                {summary.pendingCount}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            {hasOverdue && (
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">
                  {summary.overdueCount}
                </div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            )}
          </div>
          {summary.nextDueDate && (
            <div className="mt-3 text-sm text-muted-foreground">
              Next payment due: {formatDistanceToNow(new Date(summary.nextDueDate), { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // No pending commissions - show success status
  return (
    <Card className="border-green-200">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-medium text-green-700">All Commissions Settled</h3>
          <p className="text-sm text-muted-foreground">
            No pending commissions. Total paid this month: {formatCurrency(summary?.totalPaid || 0)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
