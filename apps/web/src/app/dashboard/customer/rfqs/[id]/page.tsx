'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  DollarSign,
  Calendar,
  Star,
  MessageSquare,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Offer {
  id: string;
  price: number;
  deliveryDays: number;
  notes: string | null;
  createdAt: string;
  shop: {
    id: string;
    name: string;
    rating: number | null;
    country: string;
  };
}

interface RFQDetail {
  id: string;
  jewelleryType: string;
  metalType: string;
  purity: string;
  weight: number;
  budget: number | null;
  description: string | null;
  preferredDeliveryDays: number | null;
  status: string;
  createdAt: string;
  offers: Offer[];
}

export default function CustomerRFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState<RFQDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadRFQ();
    }
  }, [params.id]);

  const loadRFQ = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/rfq/${params.id}`);
      setRfq(response.data);
    } catch (error) {
      console.error('Failed to load RFQ:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load request',
        description: 'Could not fetch request details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    setAcceptingOfferId(offerId);
    try {
      await api.post(`/api/offers/${offerId}/accept`);
      toast({
        title: 'Offer Accepted',
        description: 'An order has been created. The shop will begin work.',
      });
      loadRFQ();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to accept offer',
        description: error.response?.data?.message || 'Could not accept offer',
      });
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const cancelRFQ = async () => {
    try {
      await api.patch(`/api/rfq/${params.id}`, { status: 'CANCELLED' });
      toast({
        title: 'Request Cancelled',
        description: 'Your quote request has been cancelled',
      });
      router.push('/dashboard/customer/rfqs');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to cancel',
        description: error.response?.data?.message || 'Could not cancel request',
      });
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

  if (!rfq) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Request Not Found</h2>
            <Button asChild>
              <Link href="/dashboard/customer/rfqs">Back to Requests</Link>
            </Button>
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/customer/rfqs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{rfq.jewelleryType} Request</h1>
                {getStatusBadge(rfq.status)}
              </div>
              <p className="text-muted-foreground">
                Created {new Date(rfq.createdAt).toLocaleDateString()}
              </p>
            </div>
            {rfq.status === 'OPEN' && (
              <Button variant="outline" onClick={cancelRFQ}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Request
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request Details */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Metal</p>
                    <p className="font-medium">{rfq.metalType} {rfq.purity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{rfq.weight}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-medium">
                      {rfq.budget ? `$${rfq.budget.toLocaleString()}` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery</p>
                    <p className="font-medium">
                      {rfq.preferredDeliveryDays 
                        ? `${rfq.preferredDeliveryDays} days` 
                        : 'Flexible'}
                    </p>
                  </div>
                </div>
                
                {rfq.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{rfq.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Offers Received ({rfq.offers.length})
                </CardTitle>
                <CardDescription>
                  {rfq.status === 'OPEN' 
                    ? 'Compare offers from shops and accept the best one'
                    : 'Review offers received for this request'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rfq.offers.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Waiting for offers</h3>
                    <p className="text-muted-foreground text-sm">
                      Shops typically respond within 24-48 hours
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rfq.offers.map((offer) => (
                      <Card key={offer.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{offer.shop.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{offer.shop.country}</span>
                                  {offer.shop.rating && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                        {offer.shop.rating.toFixed(1)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {rfq.status === 'OPEN' && (
                              <Button
                                onClick={() => acceptOffer(offer.id)}
                                disabled={acceptingOfferId === offer.id}
                              >
                                {acceptingOfferId === offer.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Accept
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Price</p>
                                <p className="font-bold text-lg">${offer.price.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Delivery</p>
                                <p className="font-medium">{offer.deliveryDays} days</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Offered</p>
                                <p className="font-medium">
                                  {new Date(offer.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {offer.notes && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Shop Notes:</p>
                              <p className="text-sm">{offer.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
