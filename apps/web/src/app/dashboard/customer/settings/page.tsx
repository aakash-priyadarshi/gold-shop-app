"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FlagImage,
  PhoneInput,
  needsCountryCode,
  type FlagCode,
} from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api, { authApi } from "@/lib/api";
import {
  COUNTRIES,
  CURRENCIES,
  CountryCode,
  CurrencyCode,
  usePreferencesStore,
} from "@/store/preferences";
import { getCitiesForCountry, getStatesForCountry } from "@gold-shop/shared";
import {
  CheckCircle,
  Globe,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  Shield,
  Loader2 as SpinnerIcon,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DeliveryAddress {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredLanguage: string;
  preferredCurrency: string;
  preferredCountry?: string;
  preferredState?: string;
  preferredCity?: string;
  deliveryAddresses?: DeliveryAddress[];
}

const countries = [
  { value: "NP", label: "Nepal" },
  { value: "IN", label: "India" },
  { value: "AE", label: "UAE" },
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "Europe" },
  { value: "US", label: "United States" },
];

export default function CustomerSettingsPage() {
  const { user, refreshUser } = useAuth();
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const currentCurrency = usePreferencesStore((state) => state.currency);
  const currentCountry = usePreferencesStore((state) => state.country);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredLanguage: "en",
    preferredCurrency: "USD",
    preferredCountry: "US",
    preferredState: "",
    preferredCity: "",
    deliveryAddresses: [],
  });

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(
    null,
  );

  // Phone availability check state
  const [phoneCheckState, setPhoneCheckState] = useState<{
    checking: boolean;
    exists: boolean | null;
    originalPhone: string;
  }>({ checking: false, exists: null, originalPhone: "" });
  const phoneCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check phone availability with debounce
  const checkPhoneAvailability = useCallback(
    async (phone: string) => {
      // Skip if phone is same as original
      if (phone === phoneCheckState.originalPhone) {
        setPhoneCheckState((prev) => ({
          ...prev,
          checking: false,
          exists: null,
        }));
        return;
      }

      // Skip if phone is empty or needs country code
      if (!phone || phone.length < 7 || needsCountryCode(phone)) {
        setPhoneCheckState((prev) => ({
          ...prev,
          checking: false,
          exists: null,
        }));
        return;
      }

      // Debounce
      if (phoneCheckTimeout.current) {
        clearTimeout(phoneCheckTimeout.current);
      }

      setPhoneCheckState((prev) => ({ ...prev, checking: true }));

      phoneCheckTimeout.current = setTimeout(async () => {
        try {
          const response = await authApi.checkPhone(phone);
          setPhoneCheckState((prev) => ({
            ...prev,
            checking: false,
            exists: response.data.exists,
          }));
        } catch {
          setPhoneCheckState((prev) => ({
            ...prev,
            checking: false,
            exists: null,
          }));
        }
      }, 500);
    },
    [phoneCheckState.originalPhone],
  );
  const [newAddress, setNewAddress] = useState<DeliveryAddress>({
    label: "Home",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: currentCountry || "NP",
    isDefault: false,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/users/me");
      const phoneValue = response.data.phone || "";
      setProfile({
        id: response.data.id,
        firstName: response.data.firstName || "",
        lastName: response.data.lastName || "",
        email: response.data.email || "",
        phone: phoneValue,
        preferredLanguage: response.data.preferredLanguage || "en",
        preferredCurrency: response.data.preferredCurrency || currentCurrency,
        preferredCountry: response.data.preferredCountry || currentCountry,
        preferredState: response.data.preferredState || "",
        preferredCity: response.data.preferredCity || "",
        deliveryAddresses: response.data.deliveryAddresses || [],
      });
      // Store original phone for comparison
      setPhoneCheckState((prev) => ({ ...prev, originalPhone: phoneValue }));
      // Load delivery addresses
      setAddresses(response.data.deliveryAddresses || []);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await api.patch("/users/me", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || null,
        preferredCurrency: profile.preferredCurrency,
        country: profile.preferredCountry,
        state: profile.preferredState || null,
        city: profile.preferredCity || null,
      });

      // Update global preferences store
      setCurrency(profile.preferredCurrency as CurrencyCode);
      if (profile.preferredCountry) {
        setCountry(profile.preferredCountry as CountryCode);
      }

      toast({
        title: "Profile Updated",
        description: "Your settings have been saved",
      });

      refreshUser?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.response?.data?.message || "Could not save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveAddress = async () => {
    setIsSavingAddress(true);
    try {
      const addressData = editingAddress || newAddress;

      if (editingAddress?.id) {
        // Update existing address
        await api.patch(
          `/users/me/addresses/${editingAddress.id}`,
          addressData,
        );
        setAddresses(
          addresses.map((a) =>
            a.id === editingAddress.id
              ? { ...addressData, id: editingAddress.id }
              : a,
          ),
        );
      } else {
        // Create new address
        const response = await api.post("/users/me/addresses", addressData);
        setAddresses([...addresses, response.data]);
      }

      toast({
        title: editingAddress ? "Address Updated" : "Address Added",
        description: "Your delivery address has been saved",
      });

      setShowAddressForm(false);
      setEditingAddress(null);
      setNewAddress({
        label: "Home",
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "NP",
        isDefault: false,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save address",
        description: error.response?.data?.message || "Could not save address",
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const deleteAddress = async (addressId: string) => {
    try {
      await api.delete(`/users/me/addresses/${addressId}`);
      setAddresses(addresses.filter((a) => a.id !== addressId));
      toast({
        title: "Address Deleted",
        description: "The delivery address has been removed",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description:
          error.response?.data?.message || "Could not delete address",
      });
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    try {
      await api.patch(`/users/me/addresses/${addressId}/default`);
      setAddresses(
        addresses.map((a) => ({ ...a, isDefault: a.id === addressId })),
      );
      toast({
        title: "Default Address Updated",
        description: "Your default delivery address has been set",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          error.response?.data?.message || "Could not set default address",
      });
    }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please ensure both passwords are the same",
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
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

  if (isLoading) {
    return (
      <CustomerGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
      </CustomerGuard>
    );
  }

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-firstName">First Name</Label>
                  <Input
                    id="profile-firstName"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile({ ...profile, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-lastName">Last Name</Label>
                  <Input
                    id="profile-lastName"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="profile-phone">Phone Number</Label>
                    {user?.phoneVerifiedAt &&
                      profile.phone === phoneCheckState.originalPhone && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    {!user?.phoneVerifiedAt &&
                      profile.phone &&
                      profile.phone === phoneCheckState.originalPhone && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                          <Shield className="h-3 w-3" />
                          Not Verified
                        </span>
                      )}
                  </div>
                  <div className="relative">
                    <PhoneInput
                      id="profile-phone"
                      value={profile.phone || ""}
                      onChange={(value) => {
                        setProfile({ ...profile, phone: value });
                        checkPhoneAvailability(value);
                      }}
                      placeholder="+977 9812345678"
                      error={phoneCheckState.exists === true}
                    />
                    {/* Real-time phone check indicator */}
                    <div className="absolute right-3 top-[22px] -translate-y-1/2 z-10">
                      {phoneCheckState.checking && (
                        <SpinnerIcon className="h-4 w-4 text-gray-400 animate-spin" />
                      )}
                      {!phoneCheckState.checking &&
                        phoneCheckState.exists === true && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      {!phoneCheckState.checking &&
                        phoneCheckState.exists === false &&
                        profile.phone &&
                        profile.phone !== phoneCheckState.originalPhone && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                    </div>
                  </div>
                  {phoneCheckState.exists === true && (
                    <p className="text-xs text-red-500">
                      This phone number is already registered to another account
                    </p>
                  )}
                  {!phoneCheckState.checking &&
                    phoneCheckState.exists === false &&
                    profile.phone &&
                    profile.phone !== phoneCheckState.originalPhone && (
                      <p className="text-xs text-green-600">
                        Phone number is available
                      </p>
                    )}
                  {profile.phone !== phoneCheckState.originalPhone &&
                    phoneCheckState.originalPhone &&
                    user?.phoneVerifiedAt && (
                      <p className="text-xs text-amber-600">
                        Changing your phone number will require re-verification
                      </p>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pref-country">Country</Label>
                  <Select
                    value={profile.preferredCountry || "US"}
                    onValueChange={(value) => {
                      setProfile({ ...profile, preferredCountry: value });
                      // Auto-update currency based on country
                      const countryInfo = COUNTRIES[value as CountryCode];
                      if (countryInfo?.defaultCurrency) {
                        setProfile((prev) => ({
                          ...prev,
                          preferredCountry: value,
                          preferredCurrency: countryInfo.defaultCurrency,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger id="pref-country" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          <span className="flex items-center gap-2">
                            <FlagImage
                              code={country.value as FlagCode}
                              size={16}
                            />
                            <span>{country.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used for tax calculations and regional pricing
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pref-currency">Preferred Currency</Label>
                  <Select
                    value={profile.preferredCurrency}
                    onValueChange={(value) =>
                      setProfile({ ...profile, preferredCurrency: value })
                    }
                  >
                    <SelectTrigger id="pref-currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CURRENCIES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          {info.symbol} {code} - {info.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Prices will be displayed in this currency
                  </p>
                </div>
              </div>

              {/* State & City preferences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pref-state">Preferred State</Label>
                  {getStatesForCountry(profile.preferredCountry || "US")
                    .length > 0 ? (
                    <Select
                      value={profile.preferredState || ""}
                      onValueChange={(value) =>
                        setProfile({
                          ...profile,
                          preferredState: value,
                          preferredCity: "",
                        })
                      }
                    >
                      <SelectTrigger id="pref-state" className="w-full">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatesForCountry(
                          profile.preferredCountry || "US",
                        ).map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="pref-state"
                      value={profile.preferredState || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          preferredState: e.target.value,
                        })
                      }
                      placeholder="Enter state/province"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Used for matching with nearby sellers
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pref-city">Preferred City</Label>
                  {getCitiesForCountry(
                    profile.preferredCountry || "US",
                    profile.preferredState || undefined,
                  ).length > 0 ? (
                    <Select
                      value={profile.preferredCity || ""}
                      onValueChange={(value) =>
                        setProfile({ ...profile, preferredCity: value })
                      }
                    >
                      <SelectTrigger id="pref-city" className="w-full">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCitiesForCountry(
                          profile.preferredCountry || "US",
                          profile.preferredState || undefined,
                        ).map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="pref-city"
                      value={profile.preferredCity || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          preferredCity: e.target.value,
                        })
                      }
                      placeholder="Enter city"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Helps find the best sellers near you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Delivery Addresses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Addresses
                  </CardTitle>
                  <CardDescription>
                    Manage your delivery addresses for orders
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingAddress(null);
                    setShowAddressForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length === 0 && !showAddressForm && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No delivery addresses saved yet</p>
                  <p className="text-sm">Add an address for faster checkout</p>
                </div>
              )}

              {/* Existing Addresses */}
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-lg p-4 ${address.isDefault ? "border-gold-500 bg-gold-50" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault && (
                          <span className="text-xs bg-gold-100 text-gold-800 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{address.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {address.addressLine1}
                        {address.addressLine2 && `, ${address.addressLine2}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {address.phone}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!address.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultAddress(address.id!)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAddress(address);
                          setShowAddressForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteAddress(address.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add/Edit Address Form */}
              {showAddressForm && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">
                    {editingAddress ? "Edit Address" : "New Address"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Select
                        value={(editingAddress || newAddress).label}
                        onValueChange={(value) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              label: value,
                            });
                          } else {
                            setNewAddress({ ...newAddress, label: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Work">Work</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={(editingAddress || newAddress).fullName}
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              fullName: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              fullName: e.target.value,
                            });
                          }
                        }}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={(editingAddress || newAddress).phone}
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              phone: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              phone: e.target.value,
                            });
                          }
                        }}
                        placeholder="+977 98XXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address Line 1</Label>
                      <Input
                        value={(editingAddress || newAddress).addressLine1}
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              addressLine1: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              addressLine1: e.target.value,
                            });
                          }
                        }}
                        placeholder="Street address, P.O. box"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address Line 2 (Optional)</Label>
                      <Input
                        value={
                          (editingAddress || newAddress).addressLine2 || ""
                        }
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              addressLine2: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              addressLine2: e.target.value,
                            });
                          }
                        }}
                        placeholder="Apartment, suite, unit, building, floor"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={(editingAddress || newAddress).city}
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              city: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              city: e.target.value,
                            });
                          }
                        }}
                        placeholder="Kathmandu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State/Province</Label>
                      <Input
                        value={(editingAddress || newAddress).state}
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              state: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              state: e.target.value,
                            });
                          }
                        }}
                        placeholder="Bagmati"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input
                        value={(editingAddress || newAddress).postalCode}
                        onChange={(e) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              postalCode: e.target.value,
                            });
                          } else {
                            setNewAddress({
                              ...newAddress,
                              postalCode: e.target.value,
                            });
                          }
                        }}
                        placeholder="44600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select
                        value={(editingAddress || newAddress).country}
                        onValueChange={(value) => {
                          if (editingAddress) {
                            setEditingAddress({
                              ...editingAddress,
                              country: value,
                            });
                          } else {
                            setNewAddress({ ...newAddress, country: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem
                              key={country.value}
                              value={country.value}
                            >
                              <span className="flex items-center gap-2">
                                <FlagImage
                                  code={country.value as FlagCode}
                                  size={16}
                                />
                                <span>{country.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddress(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveAddress} disabled={isSavingAddress}>
                      {isSavingAddress ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {editingAddress ? "Update Address" : "Save Address"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="security-currentPassword">
                  Current Password
                </Label>
                <Input
                  id="security-currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="security-newPassword">New Password</Label>
                  <Input
                    id="security-newPassword"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="security-confirmPassword">
                    Confirm New Password
                  </Label>
                  <Input
                    id="security-confirmPassword"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={changePassword}
                disabled={
                  isChangingPassword ||
                  !passwords.currentPassword ||
                  !passwords.newPassword
                }
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <AppearanceSettings />
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
