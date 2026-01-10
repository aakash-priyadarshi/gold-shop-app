'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth, getDashboardRoute, UserRole } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BRAND } from '@/config/brand';
import { AuthBackground } from '@/components/auth/AuthBackground';
import {
  UserIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  PhoneIcon,
  MapPinIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Customer registration schema
const customerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Shopkeeper registration schema
const shopkeeperSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  // Shop details
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  country: z.enum(['NP', 'IN', 'US', 'AE'], { required_error: 'Please select a country' }),
  city: z.string().min(2, 'City must be at least 2 characters'),
  address: z.string().optional(),
  shopPhone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type CustomerForm = z.infer<typeof customerSchema>;
type ShopkeeperForm = z.infer<typeof shopkeeperSchema>;

const countryOptions = [
  { value: 'NP', label: '🇳🇵 Nepal', currency: 'NPR' },
  { value: 'IN', label: '🇮🇳 India', currency: 'INR' },
  { value: 'US', label: '🇺🇸 United States', currency: 'USD' },
  { value: 'AE', label: '🇦🇪 UAE', currency: 'AED' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { register: registerUser, isAuthenticated, user, isLoading: authLoading, error, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'shopkeeper'>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Customer form
  const customerForm = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  // Shopkeeper form
  const shopkeeperForm = useForm<ShopkeeperForm>({
    resolver: zodResolver(shopkeeperSchema),
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthenticated, user, router]);

  // Clear error on tab change or unmount
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [activeTab, clearError]);

  const onCustomerSubmit = async (data: CustomerForm) => {
    setIsLoading(true);
    clearError();
    
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'CUSTOMER' as UserRole,
      });
      
      toast({
        title: 'Account created!',
        description: `Welcome to ${BRAND.name}. Start exploring jewellery!`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onShopkeeperSubmit = async (data: ShopkeeperForm) => {
    setIsLoading(true);
    clearError();
    
    const country = countryOptions.find(c => c.value === data.country);
    
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'SHOPKEEPER' as UserRole,
        shop: {
          shopName: data.shopName,
          country: data.country,
          currency: country?.currency || 'NPR',
          city: data.city,
          address: data.address,
          contactPhone: data.shopPhone || data.phone,
          contactEmail: data.email,
        },
      });
      
      toast({
        title: 'Shop registration submitted!',
        description: 'Your shop is pending verification. We will review it shortly.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render form if already authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AuthBackground />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 animate-spin border-t-transparent"></div>
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 safe-area-inset">
      <AuthBackground />
      
      <Card className="w-full max-w-lg border-0 shadow-2xl shadow-gold-500/10 bg-white/95 backdrop-blur-sm z-10">
        <CardHeader className="space-y-1 text-center pb-2">
          <Link href="/" className="flex flex-col items-center gap-3 mb-4 group">
            <BrandLogo variant="icon" size="lg" className="transition-transform group-hover:scale-105" />
            <span className="text-2xl font-bold tracking-tight gold-text-gradient">{BRAND.name}</span>
          </Link>
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription className="text-base">
            Join as a customer or register your jewellery shop
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'shopkeeper')}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl p-1 bg-gray-100">
              <TabsTrigger value="customer" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white">
                <UserIcon className="h-4 w-4" />
                Customer
              </TabsTrigger>
              <TabsTrigger value="shopkeeper" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white">
                <BuildingStorefrontIcon className="h-4 w-4" />
                Seller
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slideUp">
                <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer Registration Form */}
            <TabsContent value="customer">
              <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-firstName">First Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="customer-firstName"
                        placeholder="John"
                        className="h-11 pl-10 rounded-xl"
                        {...customerForm.register('firstName')}
                      />
                    </div>
                    {customerForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-3.5 w-3.5" />
                        {customerForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-lastName">Last Name</Label>
                    <Input
                      id="customer-lastName"
                      placeholder="Doe"
                      className="h-11 rounded-xl"
                      {...customerForm.register('lastName')}
                    />
                    {customerForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-3.5 w-3.5" />
                        {customerForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-11 pl-10 rounded-xl"
                      {...customerForm.register('email')}
                    />
                  </div>
                  {customerForm.formState.errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      {customerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone (Optional)</Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="+977 98XXXXXXXX"
                      className="h-11 pl-10 rounded-xl"
                      {...customerForm.register('phone')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-password">Password</Label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="customer-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-10 rounded-xl"
                      {...customerForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {customerForm.formState.errors.password && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      {customerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="customer-confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-10 rounded-xl"
                      {...customerForm.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {customerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      {customerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl gold-gradient text-white font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/25" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner spinner-sm border-white/30 border-t-white" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Customer Account
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Shopkeeper Registration Form */}
            <TabsContent value="shopkeeper">
              <form onSubmit={shopkeeperForm.handleSubmit(onShopkeeperSubmit)} className="space-y-4">
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-firstName">First Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-firstName"
                          placeholder="Ramesh"
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register('firstName')}
                        />
                      </div>
                      {shopkeeperForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-lastName">Last Name</Label>
                      <Input
                        id="shop-lastName"
                        placeholder="Shrestha"
                        className="h-11 rounded-xl"
                        {...shopkeeperForm.register('lastName')}
                      />
                      {shopkeeperForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-email">Email</Label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-email"
                          type="email"
                          placeholder="shop@example.com"
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register('email')}
                        />
                      </div>
                      {shopkeeperForm.formState.errors.email && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-phone">Phone</Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-phone"
                          type="tel"
                          placeholder="+977 98XXXXXXXX"
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register('phone')}
                        />
                      </div>
                      {shopkeeperForm.formState.errors.phone && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-password">Password</Label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-11 pl-10 pr-10 rounded-xl"
                          {...shopkeeperForm.register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                      {shopkeeperForm.formState.errors.password && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="h-11 pl-10 pr-10 rounded-xl"
                          {...shopkeeperForm.register('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                      {shopkeeperForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">Shop Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-name">Shop Name</Label>
                      <div className="relative">
                        <BuildingStorefrontIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-name"
                          placeholder="Shrestha Gold House"
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register('shopName')}
                        />
                      </div>
                      {shopkeeperForm.formState.errors.shopName && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.shopName.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shop-country">Country</Label>
                        <Select
                          onValueChange={(value) => shopkeeperForm.setValue('country', value as any)}
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
                        {shopkeeperForm.formState.errors.country && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <ExclamationCircleIcon className="h-3.5 w-3.5" />
                            {shopkeeperForm.formState.errors.country.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shop-city">City</Label>
                        <div className="relative">
                          <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="shop-city"
                            placeholder="Kathmandu"
                            className="h-11 pl-10 rounded-xl"
                            {...shopkeeperForm.register('city')}
                          />
                        </div>
                        {shopkeeperForm.formState.errors.city && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <ExclamationCircleIcon className="h-3.5 w-3.5" />
                            {shopkeeperForm.formState.errors.city.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-address">Address (Optional)</Label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-address"
                          placeholder="New Road, Kathmandu"
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register('address')}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-shopPhone">Shop Phone (Optional)</Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-shopPhone"
                          type="tel"
                          placeholder="+977 01-XXXXXXX"
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register('shopPhone')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong>Note:</strong> Shop registrations require verification. Your account will be active after admin approval.
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl gold-gradient text-white font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/25" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner spinner-sm border-white/30 border-t-white" />
                      Registering shop...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Register Shop
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 border-t pt-6">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gold-600">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-gold-600">
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuthBackground />
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 animate-spin border-t-transparent"></div>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
