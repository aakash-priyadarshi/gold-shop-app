"use client";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { GoldenUnveil } from "@/components/auth/GoldenUnveil";
import { Turnstile } from "@/components/auth/Turnstile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FlagImage,
  needsCountryCode,
  PhoneInput,
  type FlagCode,
} from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BRAND } from "@/config/brand";
import { useToast } from "@/hooks/use-toast";
import {
  getDashboardRoute,
  RegisterResponse,
  useAuth,
  UserRole,
} from "@/hooks/useAuth";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/store/preferences";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Customer registration schema
const customerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Shopkeeper registration schema
const shopkeeperSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    // Shop details
    shopName: z.string().min(2, "Shop name must be at least 2 characters"),
    country: z.enum(["NP", "IN", "US", "AE", "UK"], {
      required_error: "Please select a country",
    }),
    city: z.string().min(2, "City must be at least 2 characters"),
    address: z.string().optional(),
    shopPhone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CustomerForm = z.infer<typeof customerSchema>;
type ShopkeeperForm = z.infer<typeof shopkeeperSchema>;

const countryOptions = [
  { value: "NP", label: "Nepal", currency: "NPR" },
  { value: "IN", label: "India", currency: "INR" },
  { value: "US", label: "United States", currency: "USD" },
  { value: "AE", label: "UAE", currency: "AED" },
  { value: "UK", label: "United Kingdom", currency: "GBP" },
];

// Country-specific placeholder data
const countryPlaceholders: Record<
  string,
  {
    firstName: string;
    lastName: string;
    phone: string;
    shopName: string;
    city: string;
    address: string;
    shopPhone: string;
  }
> = {
  NP: {
    firstName: "Ramesh",
    lastName: "Gahatraj",
    phone: "+977 98XXXXXXXX",
    shopName: "Gahatraj Gold House",
    city: "Butwal",
    address: "New Road, Butwal",
    shopPhone: "+977 01-XXXXXXX",
  },
  IN: {
    firstName: "Aakash",
    lastName: "Priyadarshi",
    phone: "+91 98XXXXXXXX",
    shopName: "Priyadarshi Jewellers",
    city: "Patna",
    address: "Zaveri Bazaar, Patna",
    shopPhone: "+91 22-XXXXXXXX",
  },
  US: {
    firstName: "John",
    lastName: "Smith",
    phone: "+1 (555) XXX-XXXX",
    shopName: "Smith Fine Jewelry",
    city: "New York",
    address: "47th Street, New York",
    shopPhone: "+1 (212) XXX-XXXX",
  },
  UK: {
    firstName: "James",
    lastName: "Williams",
    phone: "+44 7XXX XXXXXX",
    shopName: "Williams Gold & Diamonds",
    city: "London",
    address: "Hatton Garden, London",
    shopPhone: "+44 20 XXXX XXXX",
  },
  AE: {
    firstName: "Ahmed",
    lastName: "Al-Rashid",
    phone: "+971 5X XXX XXXX",
    shopName: "Al-Rashid Gold Souq",
    city: "Dubai",
    address: "Gold Souq, Deira, Dubai",
    shopPhone: "+971 4 XXX XXXX",
  },
  EU: {
    firstName: "Hans",
    lastName: "Mueller",
    phone: "+49 1XX XXXXXXXX",
    shopName: "Mueller Schmuck",
    city: "Frankfurt",
    address: "Goethestraße, Frankfurt",
    shopPhone: "+49 69 XXXXXXXX",
  },
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    register: registerUser,
    verifyEmail,
    resendVerificationOtp,
    googleLogin,
    isAuthenticated,
    user,
    isLoading: authLoading,
    error,
    clearError,
  } = useAuth();

  // Get detected country from preferences store (set by Cloudflare geo-detection)
  const detectedCountry = usePreferencesStore((state) => state.country);
  const placeholders =
    countryPlaceholders[detectedCountry] || countryPlaceholders["US"];
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"customer" | "shopkeeper">(
    "customer",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  // Real-time email/phone validation state
  const [emailCheckState, setEmailCheckState] = useState<{
    checking: boolean;
    exists: boolean | null;
  }>({ checking: false, exists: null });
  const [phoneCheckState, setPhoneCheckState] = useState<{
    checking: boolean;
    exists: boolean | null;
  }>({ checking: false, exists: null });
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const phoneCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // OTP Verification State
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [registrationData, setRegistrationData] =
    useState<RegisterResponse | null>(null);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileError, setTurnstileError] = useState(false);
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(false);
  }, []);
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
    setTurnstileError(true);
    toast({
      variant: "destructive",
      title: "Verification failed",
      description: "Please try again or refresh the page.",
    });
  }, [toast]);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
    setTurnstileError(true);
  }, []);

  // Check if user has visited before (skip intro for returning users)
  useEffect(() => {
    const visited = sessionStorage.getItem("orivraa_visited");
    if (visited) {
      setHasVisited(true);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Mark as visited after animation completes
  const handleAnimationComplete = () => {
    sessionStorage.setItem("orivraa_visited", "true");
  };

  // Real-time email check with debounce (Redis-backed for speed)
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailCheckState({ checking: false, exists: null });
      return;
    }

    // Clear previous timeout
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    setEmailCheckState({ checking: true, exists: null });

    // Debounce the API call by 500ms
    emailCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await authApi.checkEmail(email);
        setEmailCheckState({ checking: false, exists: response.data.exists });
      } catch (error) {
        setEmailCheckState({ checking: false, exists: null });
      }
    }, 500);
  }, []);

  // Real-time phone check with debounce (Redis-backed for speed)
  const checkPhoneAvailability = useCallback(async (phone: string) => {
    if (!phone || phone.length < 7) {
      setPhoneCheckState({ checking: false, exists: null });
      return;
    }

    // Clear previous timeout
    if (phoneCheckTimeout.current) {
      clearTimeout(phoneCheckTimeout.current);
    }

    setPhoneCheckState({ checking: true, exists: null });

    // Debounce the API call by 500ms
    phoneCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await authApi.checkPhone(phone);
        setPhoneCheckState({ checking: false, exists: response.data.exists });
      } catch (error) {
        setPhoneCheckState({ checking: false, exists: null });
      }
    }, 500);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
      if (phoneCheckTimeout.current) clearTimeout(phoneCheckTimeout.current);
    };
  }, []);

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
      // Check if shopkeeper needs to complete shop setup
      if (user.role === "SHOPKEEPER" && !user.shop?.id) {
        router.push("/auth/complete-shop-setup");
        return;
      }
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthenticated, user, router]);

  // Clear error on tab change or unmount
  useEffect(() => {
    clearError();
    setEmailCheckState({ checking: false, exists: null });
    setPhoneCheckState({ checking: false, exists: null });
    return () => clearError();
  }, [activeTab, clearError]);

  const onCustomerSubmit = async (data: CustomerForm) => {
    // Check Turnstile token
    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      toast({
        variant: "destructive",
        title: "Verification required",
        description: "Please complete the security check.",
      });
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      const response = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "CUSTOMER" as UserRole,
        turnstileToken,
      });

      // Show OTP verification screen
      setRegistrationData(response);
      setShowOtpScreen(true);
      setResendCooldown(60); // 60 second cooldown before resend

      toast({
        title: "Verification code sent!",
        description: `Please check your email (${response.email}) for the 6-digit code.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onShopkeeperSubmit = async (data: ShopkeeperForm) => {
    // Check Turnstile token
    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      toast({
        variant: "destructive",
        title: "Verification required",
        description: "Please complete the security check.",
      });
      return;
    }

    setIsLoading(true);
    clearError();

    const country = countryOptions.find((c) => c.value === data.country);

    try {
      const response = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "SHOPKEEPER" as UserRole,
        turnstileToken,
        shop: {
          shopName: data.shopName,
          country: data.country,
          currency: country?.currency || "NPR",
          city: data.city,
          address: data.address,
          contactPhone: data.shopPhone || data.phone,
          contactEmail: data.email,
        },
      });

      // Show OTP verification screen
      setRegistrationData(response);
      setShowOtpScreen(true);
      setResendCooldown(60);

      toast({
        title: "Verification code sent!",
        description: `Please check your email (${response.email}) for the 6-digit code.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otpCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtpCode(newOtp);
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      otpInputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    setOtpError("");

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join("");
    if (code.length !== 6) {
      setOtpError("Please enter the complete 6-digit code");
      return;
    }

    if (!registrationData?.userId) {
      setOtpError("Registration data missing. Please try again.");
      return;
    }

    setIsLoading(true);
    setOtpError("");

    try {
      await verifyEmail(registrationData.userId, code);
      toast({
        title: "Email verified!",
        description: `Welcome to ${BRAND.name}!`,
      });
    } catch (error: any) {
      setOtpError(error.message || "Invalid code. Please try again.");
      setOtpCode(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !registrationData?.email) return;

    try {
      await resendVerificationOtp(registrationData.email);
      setResendCooldown(60);
      setOtpCode(["", "", "", "", "", ""]);
      setOtpError("");
      toast({
        title: "Code resent!",
        description: "Please check your email for the new verification code.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to resend code",
        description: error.message,
      });
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

  // Show OTP Verification Screen
  if (showOtpScreen && registrationData) {
    return (
      <GoldenUnveil
        skipIntro={true}
        onAnimationComplete={handleAnimationComplete}
      >
        <Card className="w-full max-w-md border-0 shadow-2xl shadow-gold-500/10 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mb-2">
              <EnvelopeIcon className="w-8 h-8 text-gold-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Verify your email
            </CardTitle>
            <CardDescription className="text-base">
              We've sent a 6-digit code to
              <br />
              <span className="font-medium text-gray-900">
                {registrationData.email}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={cn(
                      "w-12 h-14 text-center text-xl font-semibold rounded-xl border-2 transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500",
                      otpError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-white",
                    )}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1">
                  <ExclamationCircleIcon className="w-4 h-4" />
                  {otpError}
                </p>
              )}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerifyOtp}
              disabled={isLoading || otpCode.join("").length !== 6}
              className="w-full h-12 rounded-xl gold-gradient text-white font-semibold"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner spinner-sm border-white/30 border-t-white" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Verify Email
                </span>
              )}
            </Button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-gold-600 hover:text-gold-700 hover:bg-gold-50"
              >
                {resendCooldown > 0 ? (
                  <span className="flex items-center gap-1">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ArrowPathIcon className="w-4 h-4" />
                    Resend Code
                  </span>
                )}
              </Button>
            </div>

            {/* Back to registration */}
            <div className="text-center pt-4 border-t">
              <Button
                variant="link"
                onClick={() => {
                  setShowOtpScreen(false);
                  setRegistrationData(null);
                  setOtpCode(["", "", "", "", "", ""]);
                  setOtpError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to registration
              </Button>
            </div>
          </CardContent>
        </Card>
      </GoldenUnveil>
    );
  }

  return (
    <GoldenUnveil
      skipIntro={hasVisited}
      onAnimationComplete={handleAnimationComplete}
    >
      <Card className="w-full max-w-lg border-0 shadow-2xl shadow-gold-500/10 bg-white/95 backdrop-blur-sm login-form-item">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription className="text-base">
            Join as a customer or register your jewellery shop
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "customer" | "shopkeeper")}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl p-1 bg-gray-100">
              <TabsTrigger
                value="customer"
                className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white"
              >
                <UserIcon className="h-4 w-4" />
                Customer
              </TabsTrigger>
              <TabsTrigger
                value="shopkeeper"
                className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white"
              >
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
              <form
                onSubmit={customerForm.handleSubmit(onCustomerSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-firstName">First Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="customer-firstName"
                        placeholder={placeholders.firstName}
                        className="h-11 pl-10 rounded-xl"
                        {...customerForm.register("firstName")}
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
                      placeholder={placeholders.lastName}
                      className="h-11 rounded-xl"
                      {...customerForm.register("lastName")}
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
                      className={cn(
                        "h-11 pl-10 pr-10 rounded-xl",
                        emailCheckState.exists === true &&
                          "border-red-500 focus-visible:ring-red-500",
                        emailCheckState.exists === false &&
                          "border-green-500 focus-visible:ring-green-500",
                      )}
                      {...customerForm.register("email", {
                        onChange: (e) => checkEmailAvailability(e.target.value),
                      })}
                    />
                    {/* Real-time email check indicator */}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {emailCheckState.checking && (
                        <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                      )}
                      {!emailCheckState.checking &&
                        emailCheckState.exists === true && (
                          <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                      {!emailCheckState.checking &&
                        emailCheckState.exists === false && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        )}
                    </div>
                  </div>
                  {customerForm.formState.errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      {customerForm.formState.errors.email.message}
                    </p>
                  )}
                  {emailCheckState.exists === true && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      This email is already registered.{" "}
                      <Link
                        href="/auth/login"
                        className="underline font-medium"
                      >
                        Login instead?
                      </Link>
                    </p>
                  )}
                  {emailCheckState.exists === false && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      Email is available
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone (Optional)</Label>
                  <div className="relative">
                    <PhoneInput
                      id="customer-phone"
                      placeholder="+977 9812345678"
                      value={customerForm.watch("phone") || ""}
                      onChange={(value: string) => {
                        customerForm.setValue("phone", value);
                        checkPhoneAvailability(value);
                      }}
                      error={phoneCheckState.exists === true}
                      className={cn(
                        phoneCheckState.exists === true &&
                          "[&_input]:border-red-500 [&_input]:focus-visible:ring-red-500",
                        phoneCheckState.exists === false &&
                          customerForm.watch("phone") &&
                          "[&_input]:border-green-500 [&_input]:focus-visible:ring-green-500",
                      )}
                    />
                    {/* Real-time phone check indicator */}
                    <div className="absolute right-3.5 top-[22px] -translate-y-1/2 z-10">
                      {phoneCheckState.checking && (
                        <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                      )}
                      {!phoneCheckState.checking &&
                        phoneCheckState.exists === true && (
                          <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                      {!phoneCheckState.checking &&
                        phoneCheckState.exists === false &&
                        customerForm.watch("phone") && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        )}
                    </div>
                  </div>
                  {phoneCheckState.exists === true && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      This phone number is already registered
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-password">Password</Label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="customer-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-10 rounded-xl"
                      {...customerForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
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
                  <Label htmlFor="customer-confirmPassword">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="customer-confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-10 rounded-xl"
                      {...customerForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {customerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5" />
                      {customerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Turnstile CAPTCHA */}
                <div className="flex flex-col items-center gap-2">
                  <Turnstile
                    onVerify={handleTurnstileVerify}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                    theme="auto"
                  />
                  {/* Show message if captcha has error or expired */}
                  {turnstileError && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      Captcha expired or failed.{" "}
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="underline font-medium hover:text-amber-700"
                      >
                        Reload page
                      </button>
                    </p>
                  )}
                </div>

                {/* Submit Button with Tooltip */}
                {(() => {
                  const needsCaptcha =
                    !turnstileToken &&
                    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
                  const phoneValue = customerForm.watch("phone") || "";
                  const phoneMissingCountryCode =
                    phoneValue.length > 0 && needsCountryCode(phoneValue);
                  const isDisabled =
                    isLoading ||
                    emailCheckState.exists === true ||
                    phoneCheckState.exists === true ||
                    phoneMissingCountryCode ||
                    needsCaptcha;

                  const button = (
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl gold-gradient text-white font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isDisabled}
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
                  );

                  // Show tooltip when disabled due to captcha or missing country code
                  if ((needsCaptcha || phoneMissingCountryCode) && !isLoading) {
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">{button}</div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[250px]">
                            <p className="text-sm">
                              {phoneMissingCountryCode
                                ? "Please enter a valid country code in the phone field (e.g., +977, +91)"
                                : "Please complete the security captcha above. If it's not visible, try reloading the page."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }

                  return button;
                })()}

                {/* Google OAuth for Customer */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => googleLogin("CUSTOMER", "register")}
                  className="w-full h-11 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign up with Google
                </Button>
              </form>
            </TabsContent>

            {/* Shopkeeper Registration Form */}
            <TabsContent value="shopkeeper">
              <form
                onSubmit={shopkeeperForm.handleSubmit(onShopkeeperSubmit)}
                className="space-y-4"
              >
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-firstName">First Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-firstName"
                          placeholder={placeholders.firstName}
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register("firstName")}
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
                        placeholder={placeholders.lastName}
                        className="h-11 rounded-xl"
                        {...shopkeeperForm.register("lastName")}
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
                          className={cn(
                            "h-11 pl-10 pr-10 rounded-xl",
                            emailCheckState.exists === true &&
                              "border-red-500 focus-visible:ring-red-500",
                            emailCheckState.exists === false &&
                              "border-green-500 focus-visible:ring-green-500",
                          )}
                          {...shopkeeperForm.register("email", {
                            onChange: (e) =>
                              checkEmailAvailability(e.target.value),
                          })}
                        />
                        {/* Real-time email check indicator */}
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          {emailCheckState.checking && (
                            <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                          )}
                          {!emailCheckState.checking &&
                            emailCheckState.exists === true && (
                              <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                            )}
                          {!emailCheckState.checking &&
                            emailCheckState.exists === false && (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                      </div>
                      {shopkeeperForm.formState.errors.email && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.email.message}
                        </p>
                      )}
                      {emailCheckState.exists === true && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          Email already registered
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-phone">Phone</Label>
                      <div className="relative">
                        <PhoneInput
                          id="shop-phone"
                          placeholder="+977 9812345678"
                          value={shopkeeperForm.watch("phone") || ""}
                          onChange={(value: string) => {
                            shopkeeperForm.setValue("phone", value);
                            checkPhoneAvailability(value);
                          }}
                          error={
                            phoneCheckState.exists === true ||
                            !!shopkeeperForm.formState.errors.phone
                          }
                          className={cn(
                            phoneCheckState.exists === true &&
                              "[&_input]:border-red-500 [&_input]:focus-visible:ring-red-500",
                            phoneCheckState.exists === false &&
                              shopkeeperForm.watch("phone") &&
                              "[&_input]:border-green-500 [&_input]:focus-visible:ring-green-500",
                          )}
                          required
                        />
                        {/* Real-time phone check indicator */}
                        <div className="absolute right-3.5 top-[22px] -translate-y-1/2 z-10">
                          {phoneCheckState.checking && (
                            <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                          )}
                          {!phoneCheckState.checking &&
                            phoneCheckState.exists === true && (
                              <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                            )}
                          {!phoneCheckState.checking &&
                            phoneCheckState.exists === false &&
                            shopkeeperForm.watch("phone") && (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                      </div>
                      {shopkeeperForm.formState.errors.phone && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {shopkeeperForm.formState.errors.phone.message}
                        </p>
                      )}
                      {phoneCheckState.exists === true && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          Phone already registered
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
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pl-10 pr-10 rounded-xl"
                          {...shopkeeperForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
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
                      <Label htmlFor="shop-confirmPassword">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pl-10 pr-10 rounded-xl"
                          {...shopkeeperForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {shopkeeperForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="h-3.5 w-3.5" />
                          {
                            shopkeeperForm.formState.errors.confirmPassword
                              .message
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
                    Shop Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop-name">Shop Name</Label>
                      <div className="relative">
                        <BuildingStorefrontIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-name"
                          placeholder={placeholders.shopName}
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register("shopName")}
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
                          onValueChange={(value) =>
                            shopkeeperForm.setValue("country", value as any)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countryOptions.map((country) => (
                              <SelectItem
                                key={country.value}
                                value={country.value}
                              >
                                <span className="flex items-center gap-2">
                                  <FlagImage
                                    code={country.value as FlagCode}
                                    size={16}
                                  />
                                  {country.label}
                                </span>
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
                            placeholder={placeholders.city}
                            className="h-11 pl-10 rounded-xl"
                            {...shopkeeperForm.register("city")}
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
                          placeholder={placeholders.address}
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register("address")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop-shopPhone">
                        Shop Phone (Optional)
                      </Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="shop-shopPhone"
                          type="tel"
                          placeholder={placeholders.shopPhone}
                          className="h-11 pl-10 rounded-xl"
                          {...shopkeeperForm.register("shopPhone")}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong>Note:</strong> Shop registrations require
                    verification. Your account will be active after admin
                    approval.
                  </div>
                </div>

                {/* Turnstile CAPTCHA */}
                <div className="flex flex-col items-center gap-2">
                  <Turnstile
                    onVerify={handleTurnstileVerify}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                    theme="auto"
                  />
                  {/* Show message if captcha has error or expired */}
                  {turnstileError && (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      Captcha expired or failed.{" "}
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="underline font-medium hover:text-amber-700"
                      >
                        Reload page
                      </button>
                    </p>
                  )}
                </div>

                {/* Submit Button with Tooltip */}
                {(() => {
                  const needsCaptcha =
                    !turnstileToken &&
                    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
                  const phoneValue = shopkeeperForm.watch("phone") || "";
                  const phoneMissingCountryCode =
                    phoneValue.length > 0 && needsCountryCode(phoneValue);
                  const isDisabled =
                    isLoading ||
                    emailCheckState.exists === true ||
                    phoneCheckState.exists === true ||
                    phoneMissingCountryCode ||
                    needsCaptcha;

                  const button = (
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl gold-gradient text-white font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isDisabled}
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
                  );

                  // Show tooltip when disabled due to captcha or missing country code
                  if ((needsCaptcha || phoneMissingCountryCode) && !isLoading) {
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">{button}</div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[250px]">
                            <p className="text-sm">
                              {phoneMissingCountryCode
                                ? "Please enter a valid country code in the phone field (e.g., +977, +91)"
                                : "Please complete the security captcha above. If it's not visible, try reloading the page."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }

                  return button;
                })()}

                {/* Google OAuth for Shopkeeper */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => googleLogin("SHOPKEEPER", "register")}
                  className="w-full h-11 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign up with Google
                </Button>
                <p className="text-xs text-center text-amber-600 mt-2">
                  <InformationCircleIcon className="h-3.5 w-3.5 inline mr-1" />
                  You'll need to complete shop details after Google sign-up
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 border-t pt-6 login-form-item">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-gold-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gold-600">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-gold-600">
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </Card>
    </GoldenUnveil>
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
