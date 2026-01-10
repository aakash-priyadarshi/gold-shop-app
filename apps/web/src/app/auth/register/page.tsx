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
import { Loader2, AlertCircle, User, Store } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gold-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 animate-spin border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gold-50/20 py-8 px-4 safe-area-inset">
      <Card className="w-full max-w-lg border-0 shadow-xl shadow-gold-500/5">
        <CardHeader className="space-y-1 text-center pb-2">
          <Link href="/" className="flex flex-col items-center gap-2 mb-4">
            <BrandLogo variant="icon" size="lg" />
            <span className="text-xl font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Join as a customer or register your jewellery shop
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'shopkeeper')}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl p-1">
              <TabsTrigger value="customer" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm">
                <User className="h-4 w-4" />
                Customer
              </TabsTrigger>
              <TabsTrigger value="shopkeeper" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm">
                <Store className="h-4 w-4" />
                Seller
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Customer Registration Form */}
            <TabsContent value="customer">
              <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-firstName">First Name</Label>
                    <Input
                      id="customer-firstName"
                      placeholder="John"
                      {...customerForm.register('firstName')}
                    />
                    {customerForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500">{customerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-lastName">Last Name</Label>
                    <Input
                      id="customer-lastName"
                      placeholder="Doe"
                      {...customerForm.register('lastName')}
                    />
                    {customerForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500">{customerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="name@example.com"
                    {...customerForm.register('email')}
                  />
                  {customerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{customerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone (Optional)</Label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    placeholder="+977 98XXXXXXXX"
                    {...customerForm.register('phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-password">Password</Label>
                  <Input
                    id="customer-password"
                    type="password"
                    placeholder="••••••••"
                    {...customerForm.register('password')}
                  />
                  {customerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{customerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-confirmPassword">Confirm Password</Label>
                  <Input
                    id="customer-confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...customerForm.register('confirmPassword')}
                  />
                  {customerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">{customerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Customer Account'
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
                      <Input
                        id="shop-firstName"
                        placeholder="Ramesh"
                        {...shopkeeperForm.register('firstName')}
                      />
                      {shopkeeperForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-lastName">Last Name</Label>
                      <Input
                        id="shop-lastName"
                        placeholder="Shrestha"
                        {...shopkeeperForm.register('lastName')}
                      />
                      {shopkeeperForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-email">Email</Label>
                      <Input
                        id="shop-email"
                        type="email"
                        placeholder="shop@example.com"
                        {...shopkeeperForm.register('email')}
                      />
                      {shopkeeperForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-phone">Phone</Label>
                      <Input
                        id="shop-phone"
                        type="tel"
                        placeholder="+977 98XXXXXXXX"
                        {...shopkeeperForm.register('phone')}
                      />
                      {shopkeeperForm.formState.errors.phone && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-password">Password</Label>
                      <Input
                        id="shop-password"
                        type="password"
                        placeholder="••••••••"
                        {...shopkeeperForm.register('password')}
                      />
                      {shopkeeperForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-confirmPassword">Confirm Password</Label>
                      <Input
                        id="shop-confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...shopkeeperForm.register('confirmPassword')}
                      />
                      {shopkeeperForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">Shop Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-name">Shop Name</Label>
                      <Input
                        id="shop-name"
                        placeholder="Shrestha Gold House"
                        {...shopkeeperForm.register('shopName')}
                      />
                      {shopkeeperForm.formState.errors.shopName && (
                        <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.shopName.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shop-country">Country</Label>
                        <Select
                          onValueChange={(value) => shopkeeperForm.setValue('country', value as any)}
                        >
                          <SelectTrigger>
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
                          <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.country.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shop-city">City</Label>
                        <Input
                          id="shop-city"
                          placeholder="Kathmandu"
                          {...shopkeeperForm.register('city')}
                        />
                        {shopkeeperForm.formState.errors.city && (
                          <p className="text-sm text-red-500">{shopkeeperForm.formState.errors.city.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-address">Address (Optional)</Label>
                      <Input
                        id="shop-address"
                        placeholder="New Road, Kathmandu"
                        {...shopkeeperForm.register('address')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-shopPhone">Shop Phone (Optional)</Label>
                      <Input
                        id="shop-shopPhone"
                        type="tel"
                        placeholder="+977 01-XXXXXXX"
                        {...shopkeeperForm.register('shopPhone')}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <strong>Note:</strong> Shop registrations require verification. Your account will be active after admin approval.
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering shop...
                    </>
                  ) : (
                    'Register Shop'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-600 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
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
