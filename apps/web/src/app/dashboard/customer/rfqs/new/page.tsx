'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CustomerGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Info,
  Phone,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import Link from 'next/link';
import { PhoneVerificationDialog } from '@/components/verification/PhoneVerificationDialog';

const jewelleryTypes = [
  'Ring',
  'Necklace',
  'Bracelet',
  'Earrings',
  'Pendant',
  'Bangle',
  'Chain',
  'Anklet',
  'Brooch',
  'Other',
];

const metalTypes = [
  { value: 'GOLD', label: 'Gold' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'PLATINUM', label: 'Platinum' },
];

const purities = {
  GOLD: ['24K', '22K', '18K', '14K'],
  SILVER: ['999', '925', '900'],
  PLATINUM: ['950', '900', '850'],
};

export default function NewRFQPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  
  const isPhoneVerified = !!(user as any)?.phoneVerifiedAt;
  
  const [formData, setFormData] = useState({
    jewelleryType: '',
    metalType: 'GOLD',
    purity: '22K',
    weight: '',
    budget: '',
    description: '',
    preferredDeliveryDays: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Reset purity when metal type changes
    if (field === 'metalType') {
      const defaultPurity = purities[value as keyof typeof purities][0];
      setFormData((prev) => ({ ...prev, purity: defaultPurity }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check phone verification
    if (!isPhoneVerified) {
      toast({
        variant: 'destructive',
        title: 'Phone Verification Required',
        description: 'Please verify your phone number before submitting a quote request.',
      });
      setShowVerificationDialog(true);
      return;
    }
    
    if (!formData.jewelleryType || !formData.weight) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        jewelleryType: formData.jewelleryType,
        metalType: formData.metalType,
        purity: formData.purity,
        weight: parseFloat(formData.weight),
        budget: formData.budget ? parseFloat(formData.budget) : null,
        description: formData.description || null,
        preferredDeliveryDays: formData.preferredDeliveryDays 
          ? parseInt(formData.preferredDeliveryDays) 
          : null,
      };

      await api.post('/api/rfq', payload);

      toast({
        title: 'Request Submitted',
        description: 'Your quote request has been sent to matching shops',
      });

      router.push('/dashboard/customer/rfqs');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.response?.data?.message || 'Could not submit request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/customer/rfqs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Request a Quote</h1>
              <p className="text-muted-foreground">
                Describe what you're looking for and receive offers from shops
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Jewellery Details
                </CardTitle>
                <CardDescription>
                  Tell us about the piece you want made
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Jewellery Type */}
                <div className="space-y-2">
                  <Label htmlFor="jewelleryType">Type of Jewellery *</Label>
                  <Select
                    value={formData.jewelleryType}
                    onValueChange={(value) => handleInputChange('jewelleryType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jewelleryTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Metal Type & Purity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metalType">Metal *</Label>
                    <Select
                      value={formData.metalType}
                      onValueChange={(value) => handleInputChange('metalType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metalTypes.map((metal) => (
                          <SelectItem key={metal.value} value={metal.value}>
                            {metal.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purity">Purity *</Label>
                    <Select
                      value={formData.purity}
                      onValueChange={(value) => handleInputChange('purity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {purities[formData.metalType as keyof typeof purities]?.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="weight">Approximate Weight (grams) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g., 10.5"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your estimated weight, shops may adjust in their offer
                  </p>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (USD, optional)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="100"
                    min="0"
                    placeholder="e.g., 5000"
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps shops understand your price range
                  </p>
                </div>

                {/* Preferred Delivery */}
                <div className="space-y-2">
                  <Label htmlFor="preferredDeliveryDays">Preferred Delivery (days, optional)</Label>
                  <Input
                    id="preferredDeliveryDays"
                    type="number"
                    min="1"
                    placeholder="e.g., 14"
                    value={formData.preferredDeliveryDays}
                    onChange={(e) => handleInputChange('preferredDeliveryDays', e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Additional Details</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your requirements, design preferences, any special requests..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">What happens next?</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Your request is sent to verified shops that work with your chosen metal</li>
                      <li>Shops will send you price quotes within 24-48 hours</li>
                      <li>You can compare offers and choose the best one</li>
                      <li>No commitment until you accept an offer</li>
                    </ul>
                  </div>
                </div>

                {/* Phone Verification Status */}
                <div className={`rounded-lg p-4 flex items-center justify-between ${
                  isPhoneVerified 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <Phone className={`h-5 w-5 ${isPhoneVerified ? 'text-green-600' : 'text-amber-600'}`} />
                    <div>
                      <p className={`font-medium ${isPhoneVerified ? 'text-green-800' : 'text-amber-800'}`}>
                        {isPhoneVerified ? 'Phone Verified' : 'Phone Verification Required'}
                      </p>
                      <p className={`text-sm ${isPhoneVerified ? 'text-green-700' : 'text-amber-700'}`}>
                        {isPhoneVerified 
                          ? 'Your phone number is verified. You can submit requests.' 
                          : 'Verify your phone to submit quote requests to shops.'
                        }
                      </p>
                    </div>
                  </div>
                  {isPhoneVerified ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setShowVerificationDialog(true)}
                      className="border-amber-500 text-amber-700 hover:bg-amber-100"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Verify Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4 mt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/customer/rfqs">Cancel</Link>
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !isPhoneVerified}
                title={!isPhoneVerified ? 'Please verify your phone number first' : ''}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : !isPhoneVerified ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Verify Phone First
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>

          {/* Phone Verification Dialog */}
          <PhoneVerificationDialog
            open={showVerificationDialog}
            onOpenChange={setShowVerificationDialog}
            phoneNumber={user?.phone || ''}
            onVerified={() => {
              refreshUser();
              toast({
                title: 'Phone Verified!',
                description: 'You can now submit quote requests.',
              });
            }}
            title="Verify Your Phone Number"
            description="Phone verification is required to submit custom order requests. This helps shops contact you about your orders."
          />
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
