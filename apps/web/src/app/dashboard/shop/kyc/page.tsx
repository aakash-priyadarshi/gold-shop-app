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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { shopsApi } from "@/lib/api";
import { AlertTriangle, CheckCircle, Clock, Save, Shield, UploadCloud, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const CLOUDFLARE_UPLOAD_URL = process.env.NEXT_PUBLIC_CDN_UPLOAD_URL || "https://images.orivraa.com/upload";

export default function ShopKycPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadField, setActiveUploadField] = useState<string | null>(null);

  const [kycData, setKycData] = useState<{
    panNumber: string;
    vatNumber: string;
    bisLicenseNumber: string;
    isVerified: boolean;
    verificationDocuments: Record<string, string>;
    verificationRequests?: any[];
  }>({
    panNumber: "",
    vatNumber: "",
    bisLicenseNumber: "",
    isVerified: false,
    verificationDocuments: {},
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
        verificationDocuments: response.data.verificationDocuments || {},
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
        verificationDocuments: kycData.verificationDocuments,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadField) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(CLOUDFLARE_UPLOAD_URL, {
        method: "POST",
        headers: { "X-Upload-Type": "kyc" },
        body: formData,
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");

      setKycData(prev => ({
        ...prev,
        verificationDocuments: {
          ...prev.verificationDocuments,
          [activeUploadField]: data.url
        }
      }));

      toast({
        title: "File Uploaded",
        description: "Document successfully attached to your profile.",
      });
    } catch (error) {
      console.error("Upload failed", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload the document. Please try again.",
      });
    } finally {
      setIsUploading(false);
      setActiveUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = (key: string) => {
    setKycData(prev => {
      const newDocs = { ...prev.verificationDocuments };
      delete newDocs[key];
      return { ...prev, verificationDocuments: newDocs };
    });
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
                    <T>Tax ID / PAN Number</T>
                  </Label>
                  <Input
                    id="panNumber"
                    value={kycData.panNumber}
                    disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                    onChange={(e) =>
                      setKycData({ ...kycData, panNumber: e.target.value })
                    }
                    placeholder="Enter Tax ID / PAN"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">
                    <T>VAT / GST Number (Optional)</T>
                  </Label>
                  <Input
                    id="vatNumber"
                    value={kycData.vatNumber}
                    disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                    onChange={(e) =>
                      setKycData({ ...kycData, vatNumber: e.target.value })
                    }
                    placeholder="Enter VAT / GST Number"
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

              {/* Photo Upload Section */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4"><T>Supporting Documents</T></h3>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,.pdf" 
                  onChange={handleFileUpload} 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Government ID Panel */}
                  <div className="border rounded-md p-4 flex flex-col space-y-4">
                    <div>
                      <Label className="font-semibold block mb-2"><T>Government ID (Front/Back)</T></Label>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground"><T>ID Type</T></Label>
                          <Select
                            disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                            value={kycData.verificationDocuments.governmentIdType || ""}
                            onValueChange={(val) => 
                              setKycData(prev => ({
                                ...prev,
                                verificationDocuments: { ...prev.verificationDocuments, governmentIdType: val }
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select ID Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="passport">Passport</SelectItem>
                              <SelectItem value="national_id">National ID Card</SelectItem>
                              <SelectItem value="drivers_license">Driver's License</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground"><T>ID Number</T></Label>
                          <Input 
                            className="h-8 text-xs" 
                            placeholder="Enter ID Number" 
                            value={kycData.verificationDocuments.governmentIdNumber || ""}
                            disabled={latestRequest?.status === "PENDING" || kycData.isVerified}
                            onChange={(e) => 
                              setKycData(prev => ({
                                ...prev,
                                verificationDocuments: { ...prev.verificationDocuments, governmentIdNumber: e.target.value }
                              }))
                            }
                          />
                        </div>
                      </div>

                      {kycData.verificationDocuments["governmentId"] ? (
                        <div className="relative group rounded bg-muted overflow-hidden">
                          <a target="_blank" href={kycData.verificationDocuments["governmentId"]} className="block text-center p-3 hover:underline text-sm text-blue-600 break-all overflow-hidden h-16 line-clamp-2">
                              {kycData.verificationDocuments["governmentId"]}
                          </a>
                          {(!kycData.isVerified && latestRequest?.status !== "PENDING") && (
                            <div className="absolute top-1 right-1">
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition" 
                                onClick={(e) => { e.preventDefault(); removeDocument("governmentId"); }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mb-4">No file uploaded.</p>
                      )}
                    </div>
                    
                    {(!kycData.isVerified && latestRequest?.status !== "PENDING") && !kycData.verificationDocuments["governmentId"] && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-auto" 
                        disabled={isUploading}
                        onClick={() => {
                          setActiveUploadField("governmentId");
                          fileInputRef.current?.click();
                        }}
                      >
                        {(isUploading && activeUploadField === "governmentId") ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4 mr-2" />
                        )}
                        <T>Upload ID Photo</T>
                      </Button>
                    )}
                  </div>

                  {/* Business Registration */}
                  <div className="border rounded-md p-4 flex flex-col justify-between">
                    <div>
                      <Label className="font-semibold block mb-2"><T>Business Registration Document</T></Label>
                      {kycData.verificationDocuments["businessLicensePhoto"] ? (
                        <div className="relative group rounded bg-muted overflow-hidden mt-4">
                          <a target="_blank" href={kycData.verificationDocuments["businessLicensePhoto"]} className="block text-center p-3 hover:underline text-sm text-blue-600 break-all overflow-hidden h-16 line-clamp-2">
                              {kycData.verificationDocuments["businessLicensePhoto"]}
                          </a>
                          {(!kycData.isVerified && latestRequest?.status !== "PENDING") && (
                            <div className="absolute top-1 right-1">
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition" 
                                onClick={(e) => { e.preventDefault(); removeDocument("businessLicensePhoto"); }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-4 mb-4">No file uploaded.</p>
                      )}
                    </div>
                    
                    {(!kycData.isVerified && latestRequest?.status !== "PENDING") && !kycData.verificationDocuments["businessLicensePhoto"] && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-4" 
                        disabled={isUploading}
                        onClick={() => {
                          setActiveUploadField("businessLicensePhoto");
                          fileInputRef.current?.click();
                        }}
                      >
                        {(isUploading && activeUploadField === "businessLicensePhoto") ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4 mr-2" />
                        )}
                        <T>Upload Business License</T>
                      </Button>
                    )}
                  </div>

                  {/* Address Proof */}
                  <div className="border rounded-md p-4 flex flex-col justify-between">
                    <div>
                      <Label className="font-semibold block mb-2"><T>Utility Bill / Address Proof</T></Label>
                      {kycData.verificationDocuments["addressProof"] ? (
                        <div className="relative group rounded bg-muted overflow-hidden mt-4">
                          <a target="_blank" href={kycData.verificationDocuments["addressProof"]} className="block text-center p-3 hover:underline text-sm text-blue-600 break-all overflow-hidden h-16 line-clamp-2">
                              {kycData.verificationDocuments["addressProof"]}
                          </a>
                          {(!kycData.isVerified && latestRequest?.status !== "PENDING") && (
                            <div className="absolute top-1 right-1">
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition" 
                                onClick={(e) => { e.preventDefault(); removeDocument("addressProof"); }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-4 mb-4">No file uploaded.</p>
                      )}
                    </div>
                    
                    {(!kycData.isVerified && latestRequest?.status !== "PENDING") && !kycData.verificationDocuments["addressProof"] && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-4" 
                        disabled={isUploading}
                        onClick={() => {
                          setActiveUploadField("addressProof");
                          fileInputRef.current?.click();
                        }}
                      >
                        {(isUploading && activeUploadField === "addressProof") ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4 mr-2" />
                        )}
                        <T>Upload Address Proof</T>
                      </Button>
                    )}
                  </div>
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
