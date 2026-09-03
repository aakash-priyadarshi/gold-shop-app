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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { shopsApi } from "@/lib/api";
import {
  isExpectedUploadValidationError,
  uploadAuthenticatedFile,
} from "@/lib/image-upload";
import {
  getKycIdentifierConfig,
  validateKycIdentifiers,
} from "@/lib/kyc/market-requirements";
import { useT } from "@/providers/translation-provider";
import { Clock, Save, Shield, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ShopKycPage() {
  const { user, isLoading: authLoading } = useAuth();
  const t = useT();
  const shopCountry = user?.shop?.country?.toUpperCase();
  const identifierConfig = getKycIdentifierConfig(shopCountry);
  const isSriLanka = shopCountry === "LK";
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadField, setActiveUploadField] = useState<string | null>(
    null,
  );

  const [kycData, setKycData] = useState<{
    panNumber: string;
    vatNumber: string;
    bisLicenseNumber: string;
    verificationDocuments: Record<string, string | null>;
    vatRegistrationStatus?: string;
  }>({
    panNumber: "",
    vatNumber: "",
    bisLicenseNumber: "",
    verificationDocuments: {},
    vatRegistrationStatus: undefined,
  });

  const loadKyc = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await shopsApi.getKyc();
      setKycData({
        panNumber: response.data.panNumber || "",
        vatNumber: response.data.vatNumber || "",
        bisLicenseNumber: response.data.bisLicenseNumber || "",
        verificationDocuments: response.data.verificationDocuments || {},
        vatRegistrationStatus: response.data.vatRegistrationStatus,
      });
    } catch (error: unknown) {
      const caught =
        error !== null && typeof error === "object"
          ? (error as {
              response?: { data?: { message?: unknown } };
              message?: unknown;
            })
          : {};
      const candidate = caught.response?.data?.message ?? caught.message;
      const message =
        typeof candidate === "string" && candidate.trim()
          ? candidate
          : "Please check your connection and try again.";
      console.error("Failed to load business details:", error);
      toast({
        variant: "destructive",
        title: t("Could not load business details"),
        description: t(message),
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.shop?.id) {
      setKycData({
        panNumber: "",
        vatNumber: "",
        bisLicenseNumber: "",
        verificationDocuments: {},
        vatRegistrationStatus: undefined,
      });
      setIsLoading(false);
      return;
    }
    void loadKyc();
  }, [authLoading, loadKyc, user?.shop?.id]);

  const handleSave = async () => {
    const validationErrors = validateKycIdentifiers(shopCountry, kycData);
    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: t("Check Sri Lanka registration details"),
        description: t(validationErrors[0]),
      });
      return;
    }
    setIsSaving(true);
    try {
      await shopsApi.updateKyc({
        panNumber: kycData.panNumber,
        vatNumber: kycData.vatNumber,
        bisLicenseNumber: kycData.bisLicenseNumber,
        verificationDocuments: kycData.verificationDocuments,
      });
      toast({
        title: t("Business details saved"),
        description: t(
          "Your business and tax details were stored successfully.",
        ),
      });
      await loadKyc();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("Save failed"),
        description:
          error.response?.data?.message ||
          t("Could not save your business details."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const uploadField = activeUploadField;
    if (!file || !uploadField) return;

    setIsUploading(true);
    try {
      const data = await uploadAuthenticatedFile(file, "kyc");
      if (!data.success || !data.url) {
        const message = data.error || "Upload failed. Please try again.";
        toast({
          variant: "destructive",
          title: t("Upload failed"),
          description: t(message),
          reportToAdmin: !isExpectedUploadValidationError(data),
        });
        return;
      }
      const uploadedUrl = data.url;

      setKycData((prev) => ({
        ...prev,
        verificationDocuments: {
          ...prev.verificationDocuments,
          [uploadField]: uploadedUrl,
        },
      }));

      toast({
        title: "File Uploaded",
        description: "Document successfully attached to your profile.",
      });
    } catch (error) {
      console.error("Upload failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not upload the document. Please try again.";
      toast({
        variant: "destructive",
        title: t("Upload failed"),
        description: t(message),
      });
    } finally {
      setIsUploading(false);
      setActiveUploadField(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = (key: string) => {
    setKycData((prev) => ({
      ...prev,
      verificationDocuments: {
        ...prev.verificationDocuments,
        [key]: null,
      },
    }));
  };

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <T>Business & Tax Details</T>
              </h1>
              <p className="text-muted-foreground mt-1">
                <T>
                  Keep the business information printed on invoices and reports
                  accurate.
                </T>
              </p>
            </div>
          </div>

          {!isLoading && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg p-5 flex items-start gap-3">
                  <Shield className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                  <T>Self-managed business profile</T>
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      <T>
                    These details are saved immediately and can be edited at any
                    time. Orivraa does not approve your shop before you can use
                    billing or POS.
                      </T>
                    </p>
                  </div>
                </div>
              )}

          <Card>
            <CardHeader>
              <CardTitle>
                <T>Business Identifiers</T>
              </CardTitle>
              <CardDescription>
                <T>
                  Add the identifiers your business uses on invoices and tax
                  reports.
                </T>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSriLanka && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <T>Sri Lanka VAT registration status</T>:{" "}
                  {kycData.vatRegistrationStatus || <T>Not registered</T>}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">
                    <T>{identifierConfig.panLabel}</T>
                  </Label>
                  <Input
                    id="panNumber"
                    value={kycData.panNumber}
                    onChange={(e) =>
                      setKycData({ ...kycData, panNumber: e.target.value })
                    }
                    placeholder={t(identifierConfig.panPlaceholder)}
                    inputMode={isSriLanka ? "numeric" : undefined}
                    maxLength={isSriLanka ? 9 : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">
                    <T>{identifierConfig.vatLabel}</T>
                  </Label>
                  <Input
                    id="vatNumber"
                    value={kycData.vatNumber}
                    onChange={(e) =>
                      setKycData({ ...kycData, vatNumber: e.target.value })
                    }
                    placeholder={t(identifierConfig.vatPlaceholder)}
                    inputMode={isSriLanka ? "numeric" : undefined}
                    maxLength={isSriLanka ? 9 : undefined}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bisLicenseNumber">
                    <T>{identifierConfig.businessLabel}</T>
                  </Label>
                  <Input
                    id="bisLicenseNumber"
                    value={kycData.bisLicenseNumber}
                    onChange={(e) =>
                      setKycData({
                        ...kycData,
                        bisLicenseNumber: e.target.value,
                      })
                    }
                    placeholder={t(identifierConfig.businessPlaceholder)}
                  />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">
                  <T>Optional Supporting Documents</T>
                </h3>
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
                      <Label className="font-semibold block mb-2">
                        <T>Government ID (Front/Back)</T>
                      </Label>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            <T>ID Type</T>
                          </Label>
                          <Select
                            value={
                              kycData.verificationDocuments.governmentIdType ||
                              ""
                            }
                            onValueChange={(val) =>
                              setKycData((prev) => ({
                                ...prev,
                                verificationDocuments: {
                                  ...prev.verificationDocuments,
                                  governmentIdType: val,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={t("Select ID Type")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="passport">
                                <T>Passport</T>
                              </SelectItem>
                              <SelectItem value="national_id">
                                <T>National ID Card</T>
                              </SelectItem>
                              <SelectItem value="drivers_license">
                                <T>Driver&apos;s License</T>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            <T>ID Number</T>
                          </Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder={t("Enter ID Number")}
                            value={
                              kycData.verificationDocuments
                                .governmentIdNumber || ""
                            }
                            onChange={(e) =>
                              setKycData((prev) => ({
                                ...prev,
                                verificationDocuments: {
                                  ...prev.verificationDocuments,
                                  governmentIdNumber: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      {kycData.verificationDocuments["governmentId"] ? (
                        <div className="relative group rounded bg-muted overflow-hidden">
                          <a
                            target="_blank"
                            href={kycData.verificationDocuments["governmentId"]}
                            className="block text-center p-3 hover:underline text-sm text-blue-600 break-all overflow-hidden h-16 line-clamp-2"
                          >
                            {kycData.verificationDocuments["governmentId"]}
                          </a>
                              <div className="absolute top-1 right-1">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeDocument("governmentId");
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mb-4">
                          <T>No file uploaded.</T>
                        </p>
                      )}
                    </div>

                    {!kycData.verificationDocuments["governmentId"] && (
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
                        {isUploading && activeUploadField === "governmentId" ? (
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
                      <Label className="font-semibold block mb-2">
                        <T>Business Registration Document</T>
                      </Label>
                      {kycData.verificationDocuments["businessLicensePhoto"] ? (
                        <div className="relative group rounded bg-muted overflow-hidden mt-4">
                          <a
                            target="_blank"
                            href={
                              kycData.verificationDocuments[
                                "businessLicensePhoto"
                              ]
                            }
                            className="block text-center p-3 hover:underline text-sm text-blue-600 break-all overflow-hidden h-16 line-clamp-2"
                          >
                            {
                              kycData.verificationDocuments[
                                "businessLicensePhoto"
                              ]
                            }
                          </a>
                              <div className="absolute top-1 right-1">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeDocument("businessLicensePhoto");
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-4 mb-4">
                          <T>No file uploaded.</T>
                        </p>
                      )}
                    </div>

                    {!kycData.verificationDocuments["businessLicensePhoto"] && (
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
                          {isUploading &&
                          activeUploadField === "businessLicensePhoto" ? (
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
                      <Label className="font-semibold block mb-2">
                        <T>Utility Bill / Address Proof</T>
                      </Label>
                      {kycData.verificationDocuments["addressProof"] ? (
                        <div className="relative group rounded bg-muted overflow-hidden mt-4">
                          <a
                            target="_blank"
                            href={kycData.verificationDocuments["addressProof"]}
                            className="block text-center p-3 hover:underline text-sm text-blue-600 break-all overflow-hidden h-16 line-clamp-2"
                          >
                            {kycData.verificationDocuments["addressProof"]}
                          </a>
                              <div className="absolute top-1 right-1">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeDocument("addressProof");
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-4 mb-4">
                          <T>No file uploaded.</T>
                        </p>
                      )}
                    </div>

                    {!kycData.verificationDocuments["addressProof"] && (
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
                        {isUploading && activeUploadField === "addressProof" ? (
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

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                  <T>Save Business Details</T>
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
