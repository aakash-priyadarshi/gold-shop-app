"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { shopsApi } from "@/lib/api";
import { AlertTriangle, CheckCircle, Clock, Save, Shield } from "lucide-react";
import { useEffect, useState } from "react";

export default function ShopKycPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [kycData, setKycData] = useState<{
    panNumber: string;
    vatNumber: string;
    bisLicenseNumber: string;
    isVerified: boolean;
    verificationRequests?: any[];
  }>({
    panNumber: "",
    vatNumber: "",
    bisLicenseNumber: "",
    isVerified: false,
    verificationRequests: [],
  });

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      const response = await shopsApi.getKyc();
      setKycData({
        panNumber: response.data.panNumber || "",
        vatNumber: response.data.vatNumber || "",
        bisLicenseNumber: response.data.bisLicenseNumber || "",
        isVerified: response.data.isVerified || false,
        verificationRequests: response.data.verificationRequests || [],
      });
    } catch (error) {
      console.error("Failed to load KYC:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load KYC verification status.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await shopsApi.updateKyc({
        panNumber: kycData.panNumber,
        vatNumber: kycData.vatNumber,
        bisLicenseNumber: kycData.bisLicenseNumber,
      });
      toast({
        title: "Verification Details Saved",
        description: "Your document details were stored successfully.",
      });
      loadKyc();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error.response?.data?.message || "Could not save your KYC details.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemindAdmin = async () => {
    setIsReminding(true);
    try {
      await shopsApi.remindAdminKyc();
      toast({
        title: "Admin Notified",
        description: "Your verification request has been resubmitted for fresh review.",
      });
      loadKyc();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description:
          error.response?.data?.message || "Could not remind the admin.",
      });
    } finally {
      setIsReminding(false);
    }
  };

  const latestRequest = kycData.verificationRequests?.[0];

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Shop KYC & Verification</T>
              </h1>
              <p className="text-muted-foreground mt-1">
                <T>
                  Provide legal registration documentation to unlock global platform features.
                </T>
              </p>
            </div>
          </div>

          {!isLoading && (
            <>
              {kycData.isVerified ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg p-5 flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                      <T>Shop Fully Verified</T>
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      <T>
                        Congratulations! Your shop has passed KYC and is fully unrestricted.
                      </T>
                    </p>
                  </div>
                </div>
              ) : latestRequest?.status === "PENDING" ? (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 rounded-lg p-5 flex items-start gap-3">
                  <Clock className="h-6 w-6 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      <T>Verification Pending Review</T>
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      <T>
                        Your submission has been received and our team is evaluating it. This typically takes 1-2 business days.
                      </T>
                    </p>
                  </div>
                </div>
              ) : latestRequest?.status === "ACTION_REQUIRED" ? (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 dark:text-red-200">
                        <T>Action Required for Verification</T>
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        <T>
                          Admin has requested changes to your KYC filing.
                        </T>
                      </p>
                      {latestRequest.details?.adminNote && (
                        <div className="mt-3 bg-white dark:bg-black/20 font-medium p-3 rounded text-sm text-red-900 dark:text-red-100 italic border border-red-100 dark:border-red-900 border-dashed">
                          "{latestRequest.details.adminNote}"
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800/30 flex items-center justify-between">
                        <span className="text-sm text-red-600 dark:text-red-400">
                          <T>After resolving the issue, completely save your changes and notify the admin below.</T>
                        </span>
                        <Button
                          onClick={handleRemindAdmin}
                          disabled={isReminding}
                          variant="destructive"
                          size="sm"
                        >
                          {isReminding ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : null}
                          <T>Remind Admin for Re-Review</T>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg p-5 flex items-start gap-3">
                  <Shield className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                      <T>Protecting Buyers and Sellers</T>
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      <T>
                        Please begin your verification by adding your business credentials. We review these details to ensure authenticity.
                      </T>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                <T>Business Identifiers</T>
              </CardTitle>
              <CardDescription>
                <T>
                  Official tax and registration numbers required for regional compliance.
                </T>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">
                    <T>PAN Number (Tax ID)</T>
                  </Label>
                  <Input
                    id="panNumber"
                    value={kycData.panNumber}
                    disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                    onChange={(e) =>
                      setKycData({ ...kycData, panNumber: e.target.value })
                    }
                    placeholder="Enter PAN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">
                    <T>VAT Number (Optional)</T>
                  </Label>
                  <Input
                    id="vatNumber"
                    value={kycData.vatNumber}
                    disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                    onChange={(e) =>
                      setKycData({ ...kycData, vatNumber: e.target.value })
                    }
                    placeholder="Enter VAT Number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bisLicenseNumber">
                    <T>Business / Registration License (Optional)</T>
                  </Label>
                  <Input
                    id="bisLicenseNumber"
                    value={kycData.bisLicenseNumber}
                    disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                    onChange={(e) =>
                      setKycData({ ...kycData, bisLicenseNumber: e.target.value })
                    }
                    placeholder="Enter Registration Authority Number"
                  />
                </div>
              </div>

              {(!kycData.isVerified && latestRequest?.status !== "PENDING") && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    <T>Submit Verification Credentials</T>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
