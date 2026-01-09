'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle, Store, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface VerificationRequest {
  id: string;
  type: 'SHOP' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  shop?: {
    id: string;
    shopName: string;
    ownerName: string;
    country: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/admin/verifications');
      let arr = response.data.requests || response.data || [];
      if (!Array.isArray(arr)) arr = [];
      setRequests(arr);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load verifications',
        description: 'Could not fetch verification requests',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Verification Requests</h1>
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          {req.type === 'SHOP' ? (
                            <span className="flex items-center gap-2"><Store className="h-4 w-4" /> Shop</span>
                          ) : (
                            <span className="flex items-center gap-2"><User className="h-4 w-4" /> User</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {req.type === 'SHOP' && req.shop ? (
                            <span>{req.shop.shopName} ({req.shop.ownerName})</span>
                          ) : req.user ? (
                            <span>{req.user.name} ({req.user.email})</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {req.status === 'PENDING' ? (
                            <span className="text-amber-700">Pending</span>
                          ) : req.status === 'APPROVED' ? (
                            <span className="text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</span>
                          ) : (
                            <span className="text-red-700 flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
