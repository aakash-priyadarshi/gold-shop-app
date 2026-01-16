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
import { useToast } from "@/hooks/use-toast";
import { getDashboardRoute, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    login,
    verifyEmail,
    resendVerificationOtp,
    googleLogin,
    isAuthenticated,
    user,
    isLoading: authLoading,
    error,
    clearError,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  // Email verification state (when user tries to login with unverified email)
  const [showVerification, setShowVerification] = useState(false);
  const [verificationUserId, setVerificationUserId] = useState<string>("");
  const [verificationEmail, setVerificationEmail] = useState<string>("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
    toast({
      variant: "destructive",
      title: "Verification failed",
      description: "Please try again or refresh the page.",
    });
  }, [toast]);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  // Check URL for error param (from OAuth redirect)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const messageParam = searchParams.get("message");
    const emailParam = searchParams.get("email");

    if (errorParam === "account_not_found") {
      // Google OAuth login with non-existent account
      toast({
        variant: "destructive",
        title: "Account not found",
        description:
          messageParam ||
          "No account found with this email. Please register first.",
        duration: 6000,
      });
      // Redirect to register page after short delay
      setTimeout(() => {
        router.push(
          `/auth/register${
            emailParam ? `?email=${encodeURIComponent(emailParam)}` : ""
          }`
        );
      }, 2000);
    } else if (errorParam) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorParam,
      });
    }
  }, [searchParams, toast, router]);

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
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Mark as visited after animation completes
  const handleAnimationComplete = () => {
    sessionStorage.setItem("orivraa_visited", "true");
  };

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if shopkeeper needs to complete shop setup
      if (user.role === 'SHOPKEEPER' && !user.shop?.id) {
        router.push('/auth/complete-shop-setup');
        return;
      }
      
      const redirect = searchParams.get("redirect");
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else {
        router.push(getDashboardRoute(user.role));
      }
    }
  }, [isAuthenticated, user, router, searchParams]);

  // Clear error on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
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
      await login(data.email, data.password, turnstileToken);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      // Check if email not verified
      if (error.message === "EMAIL_NOT_VERIFIED") {
        setVerificationUserId(error.userId);
        setVerificationEmail(error.email);
        setShowVerification(true);

        // Send verification OTP
        try {
          await resendVerificationOtp(error.email);
          setResendCooldown(60);
          toast({
            title: "Verification required",
            description: "A verification code has been sent to your email.",
          });
        } catch {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to send verification code. Please try again.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message || "Invalid credentials",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
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
    setIsLoading(true);
    setOtpError("");
    try {
      await verifyEmail(verificationUserId, code);
      toast({
        title: "Email verified!",
        description: "Welcome! You are now signed in.",
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
    if (resendCooldown > 0) return;
    try {
      await resendVerificationOtp(verificationEmail);
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

  // Loading state while checking auth
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

  // Show email verification screen
  if (showVerification) {
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
              Your email hasn't been verified yet.
              <br />
              Enter the 6-digit code sent to
              <br />
              <span className="font-medium text-gray-900">
                {verificationEmail}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
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
                        : "border-gray-200 bg-white"
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
                  Verify & Sign In
                </span>
              )}
            </Button>

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
                  <span>Resend in {resendCooldown}s</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ArrowPathIcon className="w-4 h-4" />
                    Resend Code
                  </span>
                )}
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Button
                variant="link"
                onClick={() => {
                  setShowVerification(false);
                  setVerificationUserId("");
                  setVerificationEmail("");
                  setOtpCode(["", "", "", "", "", ""]);
                  setOtpError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to login
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
      <Card className="border-0 shadow-2xl shadow-gold-500/10 bg-white/95 backdrop-blur-sm login-form-item">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to continue your jewellery journey
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => googleLogin("CUSTOMER", "login")}
            className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-3"
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
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>
        </CardContent>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-5 pt-0">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slideUp login-form-item">
                <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2 login-form-item">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    "h-12 pl-11 rounded-xl border-gray-200 transition-all duration-300",
                    errors.email &&
                      "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                  )}
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p
                  id="email-error"
                  className="text-sm text-red-500 flex items-center gap-1.5"
                >
                  <ExclamationCircleIcon className="h-4 w-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2 login-form-item">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-gold-600 hover:text-gold-700 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={cn(
                    "h-12 pl-11 pr-11 rounded-xl border-gray-200 transition-all duration-300",
                    errors.password &&
                      "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                  )}
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gold-500 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-sm text-red-500 flex items-center gap-1.5"
                >
                  <ExclamationCircleIcon className="h-4 w-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Turnstile CAPTCHA */}
            <div className="flex justify-center login-form-item">
              <Turnstile
                onVerify={handleTurnstileVerify}
                onError={handleTurnstileError}
                onExpire={handleTurnstileExpire}
                theme="auto"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2 login-form-item">
            <Button
              type="submit"
              className="w-full h-12 rounded-xl gold-gradient text-white text-base font-semibold transition-all hover:shadow-lg hover:shadow-gold-500/25 disabled:opacity-70"
              disabled={
                isLoading ||
                (!turnstileToken &&
                  !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
              }
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner spinner-sm border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-gold-600 font-semibold hover:text-gold-700 hover:underline"
              >
                Create one
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </GoldenUnveil>
  );
}

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuthBackground />
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 animate-pulse"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-4 border-gold-200 animate-spin border-t-transparent"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
