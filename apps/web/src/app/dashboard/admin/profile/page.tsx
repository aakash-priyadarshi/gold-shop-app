"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { otpApi, usersApi } from "@/lib/api";
import {
  CheckCircle,
  Key,
  Loader2,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // OTP verification state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpType, setOtpType] = useState<
    "EMAIL_VERIFICATION" | "PHONE_VERIFICATION"
  >("EMAIL_VERIFICATION");
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Password recovery state
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<"email" | "phone">(
    "email",
  );
  const [recoveryTarget, setRecoveryTarget] = useState("");
  const [sendingRecovery, setSendingRecovery] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await usersApi.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      await refreshUser();
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          error.response?.data?.message || "Could not update profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Do Not Match",
        description: "Please ensure both passwords are the same.",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Password must be at least 8 characters.",
      });
      return;
    }

    setChangingPassword(true);
    try {
      await usersApi.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Change Failed",
        description:
          error.response?.data?.message || "Could not change password.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendOtp = async (
    type: "EMAIL_VERIFICATION" | "PHONE_VERIFICATION",
  ) => {
    setSendingOtp(true);
    try {
      const result = await otpApi.send(type);
      toast({
        title: "OTP Sent",
        description: result.data.message,
      });
      setOtpType(type);
      setOtpDialogOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: error.response?.data?.message || "Could not send OTP.",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit code.",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      await otpApi.verify(otpType, otpCode);
      await refreshUser();
      toast({
        title: "Verification Successful",
        description: `Your ${otpType === "EMAIL_VERIFICATION" ? "email" : "phone"} has been verified.`,
      });
      setOtpDialogOpen(false);
      setOtpCode("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.response?.data?.message || "Invalid OTP code.",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSendRecovery = async () => {
    setSendingRecovery(true);
    try {
      await otpApi.send("PASSWORD_RESET");
      toast({
        title: "Recovery Code Sent",
        description: `A recovery code has been sent to your ${recoveryMethod}.`,
      });
      setRecoveryDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description:
          error.response?.data?.message || "Could not send recovery code.",
      });
    } finally {
      setSendingRecovery(false);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and security settings
            </p>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your name and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="flex-1"
                  />
                  {user?.emailVerifiedAt ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendOtp("EMAIL_VERIFICATION")}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+977 98XXXXXXXX"
                    className="flex-1"
                  />
                  {user?.phone && (user as any).phoneVerifiedAt ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : user?.phone ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendOtp("PHONE_VERIFICATION")}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">
                      Change your account password
                    </p>
                  </div>
                </div>
                <Dialog
                  open={passwordDialogOpen}
                  onOpenChange={setPasswordDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">Change Password</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and a new password.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setPasswordDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword}
                      >
                        {changingPassword && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Change Password
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Password Recovery</p>
                    <p className="text-sm text-muted-foreground">
                      Recover password via email or phone
                    </p>
                  </div>
                </div>
                <Dialog
                  open={recoveryDialogOpen}
                  onOpenChange={setRecoveryDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">Setup Recovery</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Password Recovery</DialogTitle>
                      <DialogDescription>
                        Choose how you want to recover your password if you
                        forget it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-3">
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            recoveryMethod === "email"
                              ? "border-gold-500 bg-gold-50"
                              : ""
                          }`}
                          onClick={() => setRecoveryMethod("email")}
                        >
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5" />
                            <div>
                              <p className="font-medium">Email Recovery</p>
                              <p className="text-sm text-muted-foreground">
                                Send recovery code to {user?.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            recoveryMethod === "phone"
                              ? "border-gold-500 bg-gold-50"
                              : ""
                          } ${!user?.phone ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() =>
                            user?.phone && setRecoveryMethod("phone")
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5" />
                            <div>
                              <p className="font-medium">Phone Recovery</p>
                              <p className="text-sm text-muted-foreground">
                                {user?.phone
                                  ? `Send recovery code to ${user.phone}`
                                  : "Add phone number first"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setRecoveryDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSendRecovery}
                        disabled={sendingRecovery}
                      >
                        {sendingRecovery && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Send Recovery Code
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Admin Badge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Admin Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-100 text-purple-700 text-lg px-4 py-2">
                  <Shield className="h-4 w-4 mr-2" />
                  Platform Administrator
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Full access to all platform features
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appearance */}
        <AppearanceSettings />

        {/* OTP Verification Dialog */}
        <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Verification Code</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to your{" "}
                {otpType === "EMAIL_VERIFICATION" ? "email" : "phone"}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="000000"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <DialogFooter>
              <Button
                variant="link"
                onClick={() => handleSendOtp(otpType)}
                disabled={sendingOtp}
              >
                Resend Code
              </Button>
              <Button
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.length !== 6}
              >
                {verifyingOtp && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AdminGuard>
  );
}
