'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { GoldenUnveil } from '@/components/auth/GoldenUnveil';
import { AuthBackground } from '@/components/auth/AuthBackground';
import {
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const resetSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

type Step = 'email' | 'otp' | 'reset' | 'success';

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { forgotPassword, resetPassword } = useAuth();
  
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Pre-fill email from URL param
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      emailForm.setValue('email', emailParam);
    }
  }, [searchParams, emailForm]);

  // Step 1: Request OTP
  const onEmailSubmit = async (data: EmailForm) => {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setEmail(data.email);
      setStep('otp');
      setResendCooldown(60);
      toast({
        title: 'Code sent!',
        description: 'If an account exists with this email, you will receive a reset code.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send reset code.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
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
    setOtpError('');
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP and proceed to reset
  const handleVerifyOtp = () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the complete 6-digit code');
      return;
    }
    setStep('reset');
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setResendCooldown(60);
      setOtpCode(['', '', '', '', '', '']);
      setOtpError('');
      toast({
        title: 'Code resent!',
        description: 'Please check your email for the new reset code.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const onResetSubmit = async (data: ResetForm) => {
    const code = otpCode.join('');
    setIsLoading(true);
    try {
      await resetPassword(email, code, data.newPassword);
      setStep('success');
      toast({
        title: 'Password reset!',
        description: 'Your password has been successfully changed.',
      });
    } catch (error: any) {
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('expired')) {
        setStep('otp');
        setOtpCode(['', '', '', '', '', '']);
        setOtpError(error.message || 'Invalid or expired code. Please try again.');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to reset password.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoldenUnveil skipIntro={true}>
      <Card className="w-full max-w-md border-0 shadow-2xl shadow-gold-500/10 bg-white/95 backdrop-blur-sm">
        {/* Step 1: Email */}
        {step === 'email' && (
          <>
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mb-2">
                <KeyIcon className="w-8 h-8 text-gold-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
              <CardDescription className="text-base">
                No worries! Enter your email and we'll send you a reset code.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="h-12 pl-11 rounded-xl"
                      {...emailForm.register('email')}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl gold-gradient text-white font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner spinner-sm border-white/30 border-t-white" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Code'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <>
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mb-2">
                <EnvelopeIcon className="w-8 h-8 text-gold-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription className="text-base">
                We sent a 6-digit code to<br />
                <span className="font-medium text-gray-900">{email}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={cn(
                        "w-12 h-14 text-center text-xl font-semibold rounded-xl border-2 transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500",
                        otpError ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
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
                disabled={otpCode.join('').length !== 6}
                className="w-full h-12 rounded-xl gold-gradient text-white font-semibold"
              >
                Continue
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
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
                  onClick={() => setStep('email')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Use different email
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: New Password */}
        {step === 'reset' && (
          <>
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mb-2">
                <LockClosedIcon className="w-8 h-8 text-gold-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
              <CardDescription className="text-base">
                Create a strong password for your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-12 pl-11 pr-11 rounded-xl"
                      {...resetForm.register('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {resetForm.formState.errors.newPassword && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      {resetForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-12 pl-11 pr-11 rounded-xl"
                      {...resetForm.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      {resetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  Password must contain:
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter</li>
                    <li>One lowercase letter</li>
                    <li>One number</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl gold-gradient text-white font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner spinner-sm border-white/30 border-t-white" />
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <>
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-2">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Password reset!</CardTitle>
              <CardDescription className="text-base">
                Your password has been successfully changed.<br />
                You can now sign in with your new password.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Link href="/auth/login">
                <Button className="w-full h-12 rounded-xl gold-gradient text-white font-semibold">
                  Sign in
                </Button>
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </GoldenUnveil>
  );
}

function ForgotPasswordLoading() {
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordLoading />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
