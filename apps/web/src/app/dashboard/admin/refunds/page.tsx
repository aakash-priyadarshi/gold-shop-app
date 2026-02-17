'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RotateCcw,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { refundsApi } from '@/lib/api';

interface RefundRequest {
  id: string;
  orderNumber: string;
  refundStatus: string;
  refundableAmount: number;
  refundReason: string;
  totalNpr: number;
  displayCurrency: string;
  refundRequestedAt: string;
  refundProcessedAt: string | null;
  buyer?: { name: string; email: string };
  shop?: { name: string };
  productSnapshot: any;
}

const statusFilters = ['REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED'] as const;

export default function AdminRefundsPage() {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('REQUESTED');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [activeFilter]);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await refundsApi.listRequests(activeFilter);
      setRequests(res.data?.requests || res.data || []);
    } catch (e) {
      console.error('Failed to load refund requests', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(orderId: string) {
    setProcessing(orderId);
    try {
      await refundsApi.approveRefund(orderId);
      loadRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(orderId: string) {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setProcessing(orderId);
    try {
      await refundsApi.rejectRefund(orderId, { rejectionReason: reason });
      loadRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  }

  async function handleProcess(orderId: string) {
    if (!confirm('Process this refund? This will reverse the commission and mark the order as refunded.')) return;
    setProcessing(orderId);
    try {
      await refundsApi.processRefund(orderId);
      loadRequests();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to process');
    } finally {
      setProcessing(null);
    }
  }

  const statCounts = {
    requested: requests.length,
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Refund Management</h1>
            </div>
            <Button variant="outline" size="sm" onClick={loadRequests}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Filter tabs */}
          <Tabs value={activeFilter} onValueChange={setActiveFilter}>
            <TabsList>
              {statusFilters.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {status === 'REQUESTED' && <Clock className="h-4 w-4 mr-1" />}
                  {status === 'APPROVED' && <CheckCircle className="h-4 w-4 mr-1" />}
                  {status === 'REJECTED' && <XCircle className="h-4 w-4 mr-1" />}
                  {status === 'PROCESSED' && <DollarSign className="h-4 w-4 mr-1" />}
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>

            {statusFilters.map((status) => (
              <TabsContent key={status} value={status}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {status.charAt(0) + status.slice(1).toLowerCase()} Refunds
                    </CardTitle>
                    <CardDescription>
                      {status === 'REQUESTED' && 'Refund requests awaiting review'}
                      {status === 'APPROVED' && 'Approved refunds awaiting processing'}
                      {status === 'REJECTED' && 'Rejected refund requests'}
                      {status === 'PROCESSED' && 'Completed refund transactions'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-muted-foreground">Loading...</p>
                    ) : requests.length === 0 ? (
                      <p className="text-muted-foreground">No {status.toLowerCase()} refunds</p>
                    ) : (
                      <div className="space-y-3">
                        {requests.map((req) => (
                          <div
                            key={req.id}
                            className="p-4 border rounded-lg space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-medium">{req.orderNumber}</span>
                                <p className="text-sm text-muted-foreground">
                                  {req.productSnapshot?.nameEn}
                                </p>
                                <p className="text-sm">
                                  Buyer: {req.buyer?.name} · Shop: {req.shop?.name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {req.displayCurrency} {req.refundableAmount || req.totalNpr}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Requested: {new Date(req.refundRequestedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {req.refundReason && (
                              <p className="text-sm bg-muted p-2 rounded">
                                <strong>Reason:</strong> {req.refundReason}
                              </p>
                            )}

                            <div className="flex gap-2 justify-end">
                              {status === 'REQUESTED' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(req.id)}
                                    disabled={processing === req.id}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(req.id)}
                                    disabled={processing === req.id}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {status === 'APPROVED' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleProcess(req.id)}
                                  disabled={processing === req.id}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Process Refund
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
