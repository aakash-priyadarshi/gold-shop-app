'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { subscriptionPlansApi } from '@/lib/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  country: string;
  currency: string;
  monthlyPrice: number;
  annualPrice?: number;
  maxProducts?: number;
  maxInvoicesPerMonth?: number;
  maxCatalogues?: number;
  maxOrdersPerMonth?: number;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  isActive: boolean;
  sortOrder: number;
  successorPlanId?: string;
  createdAt: string;
}

export function AdminSubscriptionPlansPanel() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; plan?: SubscriptionPlan }>({
    open: false,
  });
  const [successorDialog, setSuccessorDialog] = useState<{
    open: boolean;
    plan?: SubscriptionPlan;
    selectedSuccessorId?: string;
  }>({ open: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (countryFilter !== 'all') params.country = countryFilter;
      const res = await subscriptionPlansApi.list(params);
      setPlans(res.data);

      // Load subscriber counts in parallel
      const counts: Record<string, number> = {};
      await Promise.all(
        res.data.map(async (plan: SubscriptionPlan) => {
          try {
            const countRes = await subscriptionPlansApi.getSubscriberCount(plan.id);
            counts[plan.id] = countRes.data.activeSubscribers;
          } catch {
            counts[plan.id] = -1; // error
          }
        }),
      );
      setSubscriberCounts(counts);
    } catch (err: any) {
      showToast('error', `Failed to load plans: ${err?.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [countryFilter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── Safe Delete ─────────────────────────────────────

  const handleDelete = async (plan: SubscriptionPlan) => {
    setActionLoading(true);
    try {
      await subscriptionPlansApi.deletePlan(plan.id);
      showToast('success', `Plan "${plan.displayName}" deleted successfully.`);
      setDeleteDialog({ open: false });
      loadPlans();
    } catch (err: any) {
      showToast(
        'error',
        err?.response?.data?.message || `Failed to delete plan: ${err.message}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Disable With Successor ──────────────────────────

  const handleDisableWithSuccessor = async () => {
    if (!successorDialog.plan || !successorDialog.selectedSuccessorId) return;

    setActionLoading(true);
    try {
      const res = await subscriptionPlansApi.disableWithSuccessor(
        successorDialog.plan.id,
        successorDialog.selectedSuccessorId,
      );
      const data = res.data;
      showToast(
        'success',
        `Plan disabled. ${data.affectedSubscriptions} subscriber(s) notified for migration to "${data.successor.displayName}".`,
      );
      setSuccessorDialog({ open: false });
      loadPlans();
    } catch (err: any) {
      showToast(
        'error',
        err?.response?.data?.message || `Failed to disable plan: ${err.message}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Migration Actions ───────────────────────────────

  const handleTriggerReminders = async () => {
    setActionLoading(true);
    try {
      const res = await subscriptionPlansApi.triggerMigrationReminders();
      showToast('success', `Sent ${res.data.sent} migration reminder(s).`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to send reminders');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessMigrations = async () => {
    setActionLoading(true);
    try {
      const res = await subscriptionPlansApi.processRenewalMigrations();
      showToast(
        'success',
        `Migrations processed: ${res.data.migrated} migrated, ${res.data.downgraded} downgraded.`,
      );
      loadPlans();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to process migrations');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────

  const activePlans = plans.filter((p) => p.isActive);
  const eligibleSuccessors = (excludeId: string) =>
    activePlans.filter((p) => p.id !== excludeId);

  const getSuccessorName = (successorId?: string) => {
    if (!successorId) return null;
    const plan = plans.find((p) => p.id === successorId);
    return plan?.displayName || successorId.slice(0, 8);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-gold-500" />
            Subscription Plans
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage plans, lifecycle, and migrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="IN">India</SelectItem>
              <SelectItem value="NP">Nepal</SelectItem>
              <SelectItem value="AE">UAE</SelectItem>
              <SelectItem value="US">USA</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadPlans} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Migration Actions Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Migration Actions
          </CardTitle>
          <CardDescription>
            Manage pending plan migrations across all subscribers
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleTriggerReminders}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Migration Reminders
          </Button>
          <Button
            variant="outline"
            onClick={handleProcessMigrations}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Process Renewal Migrations
          </Button>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Plans ({plans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Successor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  className={!plan.isActive ? 'opacity-60' : ''}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{plan.displayName}</div>
                      <div className="text-xs text-muted-foreground">{plan.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{plan.country}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {plan.currency} {plan.monthlyPrice}/mo
                    </div>
                    {plan.annualPrice ? (
                      <div className="text-xs text-muted-foreground">
                        {plan.currency} {plan.annualPrice}/yr
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{plan.commissionPercent}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {subscriberCounts[plan.id] === -1 ? (
                        <span className="text-red-500 text-xs">err</span>
                      ) : subscriberCounts[plan.id] !== undefined ? (
                        subscriberCounts[plan.id]
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.isActive ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.successorPlanId ? (
                      <Badge variant="outline" className="text-xs">
                        → {getSuccessorName(plan.successorPlanId)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {plan.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700"
                          onClick={() =>
                            setSuccessorDialog({ open: true, plan })
                          }
                          title="Disable with successor"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteDialog({ open: true, plan })}
                        title="Safe delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No plans found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Plan
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{deleteDialog.plan?.displayName}</strong>?
              <br />
              <br />
              This will only succeed if there are <strong>zero</strong> active
              subscribers. Otherwise, use &quot;Disable with Successor&quot;.
            </DialogDescription>
          </DialogHeader>
          {(subscriberCounts[deleteDialog.plan?.id || ''] || 0) > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 text-amber-800 text-sm border border-amber-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              This plan has {subscriberCounts[deleteDialog.plan?.id || '']} active
              subscriber(s). Delete will fail.
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.plan && handleDelete(deleteDialog.plan)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable With Successor Dialog */}
      <Dialog
        open={successorDialog.open}
        onOpenChange={(open) => !open && setSuccessorDialog({ open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              Disable &amp; Set Successor
            </DialogTitle>
            <DialogDescription>
              Disable <strong>{successorDialog.plan?.displayName}</strong> and
              migrate all active subscribers to a successor plan. Subscribers
              will be notified via in-app notification and email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-2">Current subscribers:</p>
              <Badge variant="outline" className="text-base px-3 py-1">
                <Users className="h-4 w-4 mr-1" />
                {subscriberCounts[successorDialog.plan?.id || ''] ?? '...'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Select successor plan:</p>
              <Select
                value={successorDialog.selectedSuccessorId || ''}
                onValueChange={(v) =>
                  setSuccessorDialog((prev) => ({
                    ...prev,
                    selectedSuccessorId: v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a successor plan..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSuccessors(successorDialog.plan?.id || '').map(
                    (p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName} ({p.country}) — {p.currency}{' '}
                        {p.monthlyPrice}/mo
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuccessorDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDisableWithSuccessor}
              disabled={actionLoading || !successorDialog.selectedSuccessorId}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Disable &amp; Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminSubscriptionPlansPanel;
