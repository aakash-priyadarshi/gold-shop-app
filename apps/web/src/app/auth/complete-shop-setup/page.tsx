'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth, getDashboardRoute } from '@/hooks/useAuth';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { usePreferencesStore, type CountryCode } from '@/store/preferences';
import { api } from '@/lib/api';
import {
  BuildingStorefrontIcon,
  PhoneIcon,
  MapPinIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// Shop setup schema (no password needed - user already authenticated via Google)
const shopSetupSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  country: z.enum(['NP', 'IN', 'US', 'AE', 'UK'], { required_error: 'Please select a country' }),
  city: z.string().min(2, 'City must be at least 2 characters'),
  address: z.string().optional(),
  shopPhone: z.string().optional(),
});

type ShopSetupForm = z.infer<typeof shopSetupSchema>;

const countryOptions = [
  { value: 'NP', label: '🇳🇵 Nepal', currency: 'NPR' },
  { value: 'IN', label: '🇮🇳 India', currency: 'INR' },
  { value: 'US', label: '🇺🇸 United States', currency: 'USD' },
  { value: 'AE', label: '🇦🇪 UAE', currency: 'AED' },
  { value: 'UK', label: '🇬🇧 United Kingdom', currency: 'GBP' },
];

// Country-specific placeholder data
const countryPlaceholders: Record<string, {
  phone: string;
  shopName: string;
  city: string;
  address: string;
  shopPhone: string;
}> = {
  NP: {
    phone: '+977 98XXXXXXXX',
    shopName: 'Shrestha Gold House',
    city: 'Kathmandu',
    address: 'New Road, Kathmandu',
    shopPhone: '+977 01-XXXXXXX',
  },
  IN: {
    phone: '+91 98XXXXXXXX',
    shopName: 'Sharma Jewellers',
    city: 'Mumbai',
    address: 'Zaveri Bazaar, Mumbai',
    shopPhone: '+91 22-XXXXXXXX',
  },
  US: {
    phone: '+1 (555) XXX-XXXX',
    shopName: 'Smith Fine Jewelry',
    city: 'New York',
    address: '47th Street, New York',
    shopPhone: '+1 (212) XXX-XXXX',
  },
  UK: {
    phone: '+44 7XXX XXXXXX',
    shopName: 'Williams Gold & Diamonds',
    city: 'London',
    address: 'Hatton Garden, London',
    shopPhone: '+44 20 XXXX XXXX',
  },
  AE: {
    phone: '+971 5X XXX XXXX',
    shopName: 'Al-Rashid Gold Souq',
    city: 'Dubai',
    address: 'Gold Souq, Deira, Dubai',
    shopPhone: '+971 4 XXX XXXX',
  },
};

export default function CompleteShopSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get detected country from preferences store
  const detectedCountry = usePreferencesStore((state) => state.country);
  const placeholders = countryPlaceholders[detectedCountry] || countryPlaceholders['US'];

  const form = useForm<ShopSetupForm>({
    resolver: zodResolver(shopSetupSchema),
    defaultValues: {
      country: detectedCountry as any,
    },
  });

  // Redirect if not authenticated or not a shopkeeper
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // If user already has a shop, redirect to dashboard
    if (user?.shop?.id) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthenticated, user, router]);

  const onSubmit = async (data: ShopSetupForm) => {
    setIsLoading(true);

    try {
      const country = countryOptions.find(c => c.value === data.country);
      
      // Create shop for the authenticated user
      await api.post('/shops/setup', {
        shopName: data.shopName,
        phone: data.phone,
        country: data.country,
        currency: country?.currency || 'NPR',
        city: data.city,
        address: data.address,
        contactPhone: data.shopPhone || data.phone,
        contactEmail: user?.email,
      });

      setIsSuccess(true);
      
      // Refresh user to get updated shop info
      await refreshUser();

      toast({
        title: 'Shop registered successfully!',
        description: 'Your shop registration is pending admin approval.',
      });

      // Redirect after short delay
      setTimeout(() => {
        router.push(getDashboardRoute('SHOPKEEPER'));
      }, 2000);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: error.response?.data?.message || error.message || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AuthBackground />
        <Card className="w-full max-w-md border-0 shadow-2xl z-10">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop Registered!</h2>
            <p className="text-gray-600 mb-6">
              Your shop has been submitted for approval. You'll be notified once it's verified.
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthBackground />
      <Card className="w-full max-w-lg border-0 shadow-2xl shadow-gold-500/10 bg-white/95 backdrop-blur-sm z-10">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
            <BuildingStorefrontIcon className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Shop Setup</CardTitle>
          <CardDescription className="text-base">
            Welcome {user?.firstName}! Please provide your shop details to complete registration.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <div className="relative">
                <BuildingStorefrontIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="shopName"
                  placeholder={placeholders.shopName}
                  className="h-11 pl-10 rounded-xl"
                  {...form.register('shopName')}
                />
              </div>
              {form.formState.errors.shopName && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-3.5 w-3.5" />
                  {form.formState.errors.shopName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Your Phone Number</Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder={placeholders.phone}
                  className="h-11 pl-10 rounded-xl"
                  {...form.register('phone')}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-3.5 w-3.5" />
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  defaultValue={detectedCountry}
                  onValueChange={(value) => form.setValue('country', value as any)}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.country && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3.5 w-3.5" />
                    {form.formState.errors.country.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="city"
                    placeholder={placeholders.city}
                    className="h-11 pl-10 rounded-xl"
                    {...form.register('city')}
                  />
                </div>
                {form.formState.errors.city && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <ExclamationCircleIcon className="h-3.5 w-3.5" />
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="address"
                  placeholder={placeholders.address}
                  className="h-11 pl-10 rounded-xl"
                  {...form.register('address')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopPhone">Shop Phone (Optional)</Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="shopPhone"
                  type="tel"
                  placeholder={placeholders.shopPhone}
                  className="h-11 pl-10 rounded-xl"
                  {...form.register('shopPhone')}
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Note:</strong> Shop registrations require verification. Your account will be active after admin approval.
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl gold-gradient text-white font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/25"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner spinner-sm border-white/30 border-t-white" />
                  Setting up shop...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Registration
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
