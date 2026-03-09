"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Globe,
  Key,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Shield,
  Smartphone,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  preferredCurrency: string;
  preferredLanguage: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  addresses?: Array<{
    id: string;
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    isDefault: boolean;
  }>;
}

const currencies = [
  { code: "NPR", name: "Nepali Rupee (रू)", symbol: "रू" },
  { code: "INR", name: "Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", name: "US Dollar ($)", symbol: "$" },
  { code: "GBP", name: "British Pound (£)", symbol: "£" },
  { code: "AUD", name: "Australian Dollar (A$)", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar (C$)", symbol: "C$" },
  { code: "AED", name: "UAE Dirham (د.إ)", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar (S$)", symbol: "S$" },
];

const languages = [
  { code: "en", name: "English" },
  { code: "ne", name: "नेपाली (Nepali)" },
  { code: "hi", name: "हिंदी (Hindi)" },
];

export default function ShopkeeperProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const t = useT();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    backupCodesRemaining: number;
  } | null>(null);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateToken, setRegenerateToken] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    loadProfile();
    load2FAStatus();
  }, []);

  const load2FAStatus = async () => {
    try {
      const response = await api.get("/auth/2fa/status");
      setTwoFactorStatus(response.data);
    } catch (error) {
      console.error("Failed to load 2FA status:", error);
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/users/me");
      setProfile(response.data);
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast({
        variant: "destructive",
        title: "Failed to load profile",
        description: "Could not fetch your profile data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startTwoFactorSetup = async () => {
    setIsSettingUp2FA(true);
    try {
      const response = await api.post("/auth/2fa/generate");
      setTwoFactorSetup({
        qrCode: response.data.qrCode,
        secret: response.data.secret,
      });
      setTwoFactorDialogOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description:
          error.response?.data?.message || "Could not start 2FA setup",
      });
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
      });
      return;
    }

    setIsVerifying2FA(true);
    try {
      const response = await api.post("/auth/2fa/verify", {
        token: verificationCode,
      });
      setBackupCodes(response.data.backupCodes);
      setShowBackupCodes(true);
      setTwoFactorDialogOpen(false);
      setTwoFactorSetup(null);
      setVerificationCode("");
      await load2FAStatus();
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description:
          error.response?.data?.message || "Invalid verification code",
      });
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const disable2FA = async () => {
    if (!disablePassword) {
      toast({
        variant: "destructive",
        title: "Password Required",
        description: "Please enter your password to disable 2FA",
      });
      return;
    }

    setIsDisabling2FA(true);
    try {
      await api.delete("/auth/2fa/disable", {
        data: { password: disablePassword },
      });
      setDisableDialogOpen(false);
      setDisablePassword("");
      await load2FAStatus();
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Disable Failed",
        description: error.response?.data?.message || "Could not disable 2FA",
      });
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!regenerateToken || regenerateToken.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await api.post("/auth/2fa/backup-codes/regenerate", {
        token: regenerateToken,
      });
      setBackupCodes(response.data.backupCodes);
      setShowBackupCodes(true);
      setRegenerateDialogOpen(false);
      setRegenerateToken("");
      await load2FAStatus();
      toast({
        title: "Backup Codes Regenerated",
        description: "Your new backup codes are ready",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Regeneration Failed",
        description:
          error.response?.data?.message || "Could not regenerate backup codes",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard",
    });
  };

  const saveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      await api.patch("/users/me", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        preferredCurrency: profile.preferredCurrency,
        preferredLanguage: profile.preferredLanguage,
      });
      await refreshUser();
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.response?.data?.message || "Could not save profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
      setPasswordDialogOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description:
          error.response?.data?.message || "Could not change password",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates });
    }
  };

  const getInitials = () => {
    if (!profile) return "?";
    return `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase();
  };

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

  if (!profile) {
    return (
      <ShopGuard>
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2"><T>Profile Not Found</T></h2>
            <p className="text-muted-foreground">
              <T>Unable to load your profile data.</T>
            </p>
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
            <div>
              <h1 className="text-2xl font-bold"><T>My Profile</T></h1>
              <p className="text-muted-foreground">
                <T>Manage your personal account settings</T>
              </p>
            </div>
          </div>

          {/* Profile Overview Card */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 ring-4 ring-amber-100">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-2xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{profile.role}</Badge>
                    <Badge
                      variant={
                        profile.status === "ACTIVE" ? "default" : "destructive"
                      }
                    >
                      {profile.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-end">
                    <Clock className="h-4 w-4" />
                    <span>
                      {t(`Joined ${format(new Date(profile.createdAt), "MMM d, yyyy")}`)}
                    </span>
                  </div>
                  {profile.lastLoginAt && (
                    <p className="mt-1">
                      Last login:{" "}
                      {format(
                        new Date(profile.lastLoginAt),
                        "MMM d, yyyy h:mm a",
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList>
              <TabsTrigger value="personal"><T>Personal Info</T></TabsTrigger>
              <TabsTrigger value="preferences"><T>Preferences</T></TabsTrigger>
              <TabsTrigger value="security"><T>Security</T></TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <T>Personal Information</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Update your personal details</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName"><T>First Name</T></Label>
                      <Input
                        id="firstName"
                        value={profile.firstName}
                        onChange={(e) =>
                          updateProfile({ firstName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName"><T>Last Name</T></Label>
                      <Input
                        id="lastName"
                        value={profile.lastName}
                        onChange={(e) =>
                          updateProfile({ lastName: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email"><T>Email</T></Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <T>Contact support to change your email address</T>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="phone"><T>Phone Number</T></Label>
                        {authUser?.phoneVerifiedAt && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            <T>Verified</T>
                          </span>
                        )}
                        {!authUser?.phoneVerifiedAt && profile.phone && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                            <Shield className="h-3 w-3" />
                            <T>Not Verified</T>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={profile.phone || ""}
                          onChange={(e) =>
                            updateProfile({ phone: e.target.value })
                          }
                          placeholder="+977 9XXXXXXXXX"
                        />
                      </div>
                      {authUser?.phoneVerifiedAt && (
                        <p className="text-xs text-muted-foreground">
                          Changing your phone number will require
                          re-verification
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      <T>Save Changes</T>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <T>Regional Preferences</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Set your preferred language. Currency is determined by your shop's location.</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="language"><T>Preferred Language</T></Label>
                      <Select
                        value={profile.preferredLanguage || "en"}
                        onValueChange={(value) =>
                          updateProfile({ preferredLanguage: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select language")} />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label><T>Currency</T></Label>
                      <div className="p-3 bg-muted rounded-md text-sm">
                        <p className="text-muted-foreground">
                          <T>Currency is automatically set based on your shop's country.</T>
                        </p>
                        <p className="mt-1">
                          {t("Manage this in")}{" "}
                          <a
                            href="/dashboard/shop/settings"
                            className="text-gold-600 hover:underline"
                          >
                            <T>Shop Settings</T>
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      <T>Save Preferences</T>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <T>Security Settings</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Manage your account security</T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Change Password */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-full">
                        <Key className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium"><T>Password</T></h3>
                        <p className="text-sm text-muted-foreground">
                          <T>Change your account password</T>
                        </p>
                      </div>
                    </div>
                    <Dialog
                      open={passwordDialogOpen}
                      onOpenChange={setPasswordDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline"><T>Change Password</T></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle><T>Change Password</T></DialogTitle>
                          <DialogDescription>
                            <T>Enter your current password and choose a new one.</T>
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">
                              <T>Current Password</T>
                            </Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  currentPassword: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword"><T>New Password</T></Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  newPassword: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                              <T>Confirm New Password</T>
                            </Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  confirmPassword: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setPasswordDialogOpen(false)}
                          >
                            <T>Cancel</T>
                          </Button>
                          <Button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                          >
                            {isChangingPassword ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            <T>Change Password</T>
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-full ${twoFactorStatus?.enabled ? "bg-green-100 dark:bg-green-800" : "bg-amber-100 dark:bg-amber-800"}`}
                      >
                        <Smartphone
                          className={`h-5 w-5 ${twoFactorStatus?.enabled ? "text-green-600" : "text-amber-600"}`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          <T>Two-Factor Authentication</T>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {twoFactorStatus?.enabled
                            ? t(`Enabled • ${twoFactorStatus.backupCodesRemaining} backup codes remaining`)
                            : t("Add an extra layer of security with 2FA")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {twoFactorStatus?.enabled ? (
                        <>
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <T>Enabled</T>
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRegenerateDialogOpen(true)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            <T>New Codes</T>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDisableDialogOpen(true)}
                          >
                            <T>Disable</T>
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={startTwoFactorSetup}
                          disabled={isSettingUp2FA}
                        >
                          {isSettingUp2FA ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4 mr-2" />
                          )}
                          <T>Enable 2FA</T>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 2FA Setup Dialog */}
                  <Dialog
                    open={twoFactorDialogOpen}
                    onOpenChange={setTwoFactorDialogOpen}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          <T>Set Up Two-Factor Authentication</T>
                        </DialogTitle>
                        <DialogDescription>
                          <T>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</T>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {twoFactorSetup && (
                          <>
                            <div className="flex justify-center">
                              <img
                                src={twoFactorSetup.qrCode}
                                alt="2FA QR Code"
                                className="w-48 h-48 border rounded-lg"
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground mb-2">
                                <T>Or enter this code manually:</T>
                              </p>
                              <code className="bg-muted px-3 py-2 rounded font-mono text-sm">
                                {twoFactorSetup.secret}
                              </code>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="verificationCode">
                                <T>Enter verification code</T>
                              </Label>
                              <Input
                                id="verificationCode"
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) =>
                                  setVerificationCode(
                                    e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6),
                                  )
                                }
                                maxLength={6}
                                className="text-center text-2xl tracking-widest font-mono"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setTwoFactorDialogOpen(false)}
                        >
                          <T>Cancel</T>
                        </Button>
                        <Button
                          onClick={verifyAndEnable2FA}
                          disabled={isVerifying2FA}
                        >
                          {isVerifying2FA ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          <T>Verify & Enable</T>
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Backup Codes Dialog */}
                  <Dialog
                    open={showBackupCodes}
                    onOpenChange={setShowBackupCodes}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle><T>Save Your Backup Codes</T></DialogTitle>
                        <DialogDescription>
                          <T>These codes can be used if you lose access to your authenticator app. Each code can only be used once.</T>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {backupCodes.map((code, i) => (
                              <div
                                key={i}
                                className="bg-background p-2 rounded text-center"
                              >
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            <T>Store these codes in a safe place. You won't be able to see them again.</T>
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={copyBackupCodes}>
                          <Copy className="h-4 w-4 mr-2" />
                          <T>Copy Codes</T>
                        </Button>
                        <Button onClick={() => setShowBackupCodes(false)}>
                          <T>I've Saved These Codes</T>
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Disable 2FA Dialog */}
                  <Dialog
                    open={disableDialogOpen}
                    onOpenChange={setDisableDialogOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          <T>Disable Two-Factor Authentication</T>
                        </DialogTitle>
                        <DialogDescription>
                          <T>This will remove 2FA from your account. Enter your password to confirm.</T>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="disablePassword"><T>Password</T></Label>
                          <Input
                            id="disablePassword"
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDisableDialogOpen(false)}
                        >
                          <T>Cancel</T>
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={disable2FA}
                          disabled={isDisabling2FA}
                        >
                          {isDisabling2FA ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          <T>Disable 2FA</T>
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Regenerate Backup Codes Dialog */}
                  <Dialog
                    open={regenerateDialogOpen}
                    onOpenChange={setRegenerateDialogOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle><T>Regenerate Backup Codes</T></DialogTitle>
                        <DialogDescription>
                          <T>This will invalidate all your existing backup codes. Enter a verification code to continue.</T>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="regenerateToken">
                            <T>Verification Code</T>
                          </Label>
                          <Input
                            id="regenerateToken"
                            placeholder="000000"
                            value={regenerateToken}
                            onChange={(e) =>
                              setRegenerateToken(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            maxLength={6}
                            className="text-center text-2xl tracking-widest font-mono"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setRegenerateDialogOpen(false)}
                        >
                          <T>Cancel</T>
                        </Button>
                        <Button
                          onClick={regenerateBackupCodes}
                          disabled={isRegenerating}
                        >
                          {isRegenerating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          <T>Regenerate</T>
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Account Activity */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-3"><T>Recent Activity</T></h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span><T>Account created</T></span>
                        <span>
                          {format(new Date(profile.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      {profile.lastLoginAt && (
                        <div className="flex items-center justify-between">
                          <span><T>Last login</T></span>
                          <span>
                            {format(
                              new Date(profile.lastLoginAt),
                              "MMM d, yyyy h:mm a",
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Appearance */}
          <AppearanceSettings />
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
