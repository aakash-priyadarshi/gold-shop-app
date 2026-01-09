'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Loader2,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
} from 'lucide-react';
import api from '@/lib/api';

interface RFQ {
  id: string;
  jewelleryType: string;
  metalType: string;
  purity: string;
  weight: number;
  budget: number | null;
  description: string;
  status: string;
  createdAt: string;
  _count?: {
    offers: number;
  };
}

export default function CustomerRFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadRFQs();
  }, []);

  const loadRFQs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/rfq/my-requests');
      setRfqs(response.data);
    } catch (error) {
      console.error('Failed to load RFQs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRFQs = rfqs.filter((rfq) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return rfq.status === 'OPEN';
    if (activeTab === 'in-progress') return rfq.status === 'IN_PROGRESS';
    if (activeTab === 'completed') return rfq.status === 'COMPLETED' || rfq.status === 'CANCELLED';
    return true;
  });

  const stats = {
    total: rfqs.length,
    open: rfqs.filter((r) => r.status === 'OPEN').length,
    inProgress: rfqs.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: rfqs.filter((r) => r.status === 'COMPLETED').length,
    totalOffers: rfqs.reduce((sum, r) => sum + (r._count?.offers || 0), 0),
  };

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Requests</h1>
              <p className="text-muted-foreground">
                View and manage your quote requests
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/customer/rfqs/new">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Total Requests</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Open</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>In Progress</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Completed</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Total Offers</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-purple-600">{stats.totalOffers}</p>
              </CardContent>
            </Card>
          </div>

          {/* RFQ List */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({rfqs.length})</TabsTrigger>
                  <TabsTrigger value="open">Open ({stats.open})</TabsTrigger>
                  <TabsTrigger value="in-progress">In Progress ({stats.inProgress})</TabsTrigger>
                  <TabsTrigger value="completed">Closed ({rfqs.length - stats.open - stats.inProgress})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {filteredRFQs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No requests found</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {activeTab === 'all'
                          ? "You haven't created any quote requests yet"
                          : `No ${activeTab} requests`}
                      </p>
                      <Button asChild>
                        <Link href="/dashboard/customer/rfqs/new">Create Your First Request</Link>
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Metal</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Offers</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRFQs.map((rfq) => (
                          <TableRow key={rfq.id}>
                            <TableCell className="font-medium">
                              {rfq.jewelleryType}
                            </TableCell>
                            <TableCell>
                              {rfq.metalType} {rfq.purity}
                            </TableCell>
                            <TableCell>{rfq.weight}g</TableCell>
                            <TableCell>
                              {rfq.budget ? `$${rfq.budget.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {rfq._count?.offers || 0} offers
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(rfq.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dashboard/customer/rfqs/${rfq.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
