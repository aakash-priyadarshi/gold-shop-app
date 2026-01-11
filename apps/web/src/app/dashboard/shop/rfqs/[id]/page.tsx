'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  FileQuestion,
  User,
  Mail,
  Clock,
  CheckCircle,
  Scale,
  DollarSign,
  Send,
  Loader2,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface RfqDetails {
  id: string;
  jewelleryType: string;
  metalType: string;
  purity: string;
  weight: number;
  weightUnit: string;
  budget?: number;
  currency: string;
  description?: string;
  specifications?: Record<string, any>;
  status: string;
  createdAt: string;
  expiresAt?: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  offers: Array<{
    id: string;
    shopId: string;
    price: number;
    currency: string;
    deliveryDays: number;
    notes?: string;
    status: string;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-amber-100 text-amber-700',
  BROADCAST: 'bg-blue-100 text-blue-700',
  OFFERS_RECEIVED: 'bg-purple-100 text-purple-700',
  NEGOTIATING: 'bg-orange-100 text-orange-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-700',
};

export default function ShopRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rfqId = params.id as string;
  
  const [rfq, setRfq] = useState<RfqDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Offer form state
  const [offerPrice, setOfferPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [offerNotes, setOfferNotes] = useState('');

  useEffect(() => {
    if (rfqId) {
      loadRfq();
    }
  }, [rfqId]);

  const loadRfq = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/rfq/${rfqId}`);
      setRfq(response.data);
    } catch (error) {
      console.error('Failed to load RFQ:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load RFQ',
        description: 'Could not fetch RFQ details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitOffer = async () => {
    if (!offerPrice || !deliveryDays) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in price and delivery days',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/offers', {
        rfqId,
        price: parseFloat(offerPrice),
        currency: rfq?.currency || 'USD',
        deliveryDays: parseInt(deliveryDays),
        notes: offerNotes || undefined,
      });
      toast({
        title: 'Offer Submitted',
        description: 'Your quote has been sent to the customer',
      });
      loadRfq();
      // Reset form
      setOfferPrice('');
      setDeliveryDays('');
      setOfferNotes('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.response?.data?.message || 'Could not submit offer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Check if shop has already submitted an offer
  const myOffer = rfq?.offers?.find((o) => o.shopId === user?.shop?.id);
  const canSubmitOffer = ['PENDING', 'BROADCAST'].includes(rfq?.status || '') && !myOffer;

  if (isLoading) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  if (!rfq) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">RFQ Not Found</h2>
            <p className="text-muted-foreground">The request you're looking for doesn't exist.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DashboardLayout>
      </ShopGuard>
    );
  }

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">RFQ Details</h1>
                <p className="text-muted-foreground">
                  Request #{rfq.id.slice(0, 8)}
                </p>
              </div>
            </div>
            <Badge className={statusColors[rfq.status] || 'bg-gray-100'}>
              {rfq.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Jewellery Type</Label>
                      <p className="font-medium">{rfq.jewelleryType}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Metal</Label>
                      <p className="font-medium">{rfq.metalType} {rfq.purity}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Weight</Label>
                      <div className="flex items-center gap-1">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {rfq.weight} {rfq.weightUnit}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Budget</Label>
                      {rfq.budget ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCurrency(rfq.budget, rfq.currency)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Not specified</p>
                      )}
                    </div>
                  </div>

                  {rfq.description && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="mt-1">{rfq.description}</p>
                      </div>
                    </>
                  )}

                  {rfq.specifications && Object.keys(rfq.specifications).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Specifications</Label>
                        <div className="mt-2 space-y-2">
                          {Object.entries(rfq.specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{key}</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Submit Offer Form */}
              {canSubmitOffer && (
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Your Quote</CardTitle>
                    <CardDescription>
                      Provide your best offer for this request
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ({rfq.currency})</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="Enter price"
                          value={offerPrice}
                          onChange={(e) => setOfferPrice(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delivery">Delivery (days)</Label>
                        <Input
                          id="delivery"
                          type="number"
                          placeholder="e.g., 7"
                          value={deliveryDays}
                          onChange={(e) => setDeliveryDays(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any additional details about your offer..."
                        value={offerNotes}
                        onChange={(e) => setOfferNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={submitOffer}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Quote
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* My Offer (if submitted) */}
              {myOffer && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Your Submitted Quote
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Price</Label>
                        <p className="font-medium text-lg">
                          {formatCurrency(myOffer.price, myOffer.currency)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Delivery</Label>
                        <p className="font-medium">{myOffer.deliveryDays} days</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge variant="outline">{myOffer.status}</Badge>
                      </div>
                    </div>
                    {myOffer.notes && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground">Your Notes</Label>
                        <p className="text-sm mt-1">{myOffer.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {rfq.customer.firstName} {rfq.customer.lastName}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {rfq.customer.email}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(rfq.createdAt)}</span>
                  </div>
                  {rfq.expiresAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expires:</span>
                      <span>{formatDate(rfq.expiresAt)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Other Offers Count */}
              <Card>
                <CardHeader>
                  <CardTitle>Competition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{rfq.offers?.length || 0}</span>
                    <span className="text-muted-foreground">total offers</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
