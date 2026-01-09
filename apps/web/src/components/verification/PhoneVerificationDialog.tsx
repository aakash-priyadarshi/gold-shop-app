'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { otpApi } from '@/lib/api';

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber?: string;
  onVerified?: () => void;
  title?: string;
  description?: string;
}

export function PhoneVerificationDialog({
  open,
  onOpenChange,
  phoneNumber,
  onVerified,
  title = 'Verify Your Phone',
  description = 'Enter your phone number to receive a verification code via SMS.',
}: PhoneVerificationDialogProps) {
  const [phone, setPhone] = useState(phoneNumber || '');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendOtp = async () => {
    if (!phone) {
      toast({
        variant: 'destructive',
        title: 'Phone Required',
        description: 'Please enter your phone number.',
      });
      return;
    }

    setSending(true);
    try {
      const result = await otpApi.send('PHONE_VERIFICATION', phone);
      toast({
        title: 'Code Sent',
        description: result.data.message || 'A verification code has been sent to your phone.',
      });
      setStep('code');
      startCountdown();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: error.response?.data?.message || 'Could not send verification code.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code.',
      });
      return;
    }

    setVerifying(true);
    try {
      await otpApi.verify('PHONE_VERIFICATION', otpCode);
      toast({
        title: 'Phone Verified!',
        description: 'Your phone number has been verified successfully.',
      });
      onVerified?.();
      onOpenChange(false);
      // Reset state
      setStep('phone');
      setOtpCode('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.response?.data?.message || 'Invalid verification code.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await handleSendOtp();
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after dialog closes
    setTimeout(() => {
      setStep('phone');
      setOtpCode('');
      setCountdown(0);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-gold-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' 
              ? description
              : `Enter the 6-digit code sent to ${phone}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+977 98XXXXXXXX"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your phone number with country code
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSendOtp} disabled={sending || !phone}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Code'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in {countdown}s
                  </p>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleResend}
                    disabled={sending}
                    className="text-sm"
                  >
                    {sending ? 'Sending...' : 'Resend Code'}
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('phone')}>
                Change Number
              </Button>
              <Button
                onClick={handleVerifyOtp}
                disabled={verifying || otpCode.length !== 6}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
