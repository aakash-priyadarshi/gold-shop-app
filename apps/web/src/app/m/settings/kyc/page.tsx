"use client";

import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";
import { toast } from "@/hooks/use-toast";
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
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  UploadCloud,
  X,
  Save,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function MobileKycPage() {
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const t = useT();
  const shopCountry = user?.shop?.country?.toUpperCase();
  const identifierConfig = getKycIdentifierConfig(shopCountry);
  const isSriLanka = shopCountry === "LK";
  const router = useRouter();
  const haptic = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploadField, setActiveUploadField] = useState<string | null>(
    null,
  );

  const [kycData, setKycData] = useState<{
    panNumber: string;
    vatNumber: string;
    bisLicenseNumber: string;
    isVerified: boolean;
    verificationDocuments: Record<string, string>;
    verificationRequests?: any[];
    vatRegistrationStatus?: string;
  }>({
    panNumber: "",
    vatNumber: "",
    bisLicenseNumber: "",
    isVerified: false,
    verificationDocuments: {},
    verificationRequests: [],
    vatRegistrationStatus: undefined,
  });

  const loadKyc = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await shopsApi.getKyc();
      const data = response.data ?? response;
      setKycData({
        panNumber: data.panNumber || "",
        vatNumber: data.vatNumber || "",
        bisLicenseNumber: data.bisLicenseNumber || "",
        isVerified: data.isVerified || false,
        verificationDocuments: data.verificationDocuments || {},
        verificationRequests: data.verificationRequests || [],
        vatRegistrationStatus: data.vatRegistrationStatus,
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
      toast({
        variant: "destructive",
        title: t("Could not load verification status"),
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
        isVerified: false,
        verificationDocuments: {},
        verificationRequests: [],
        vatRegistrationStatus: undefined,
      });
      setIsLoading(false);
      return;
    }
    void loadKyc();
  }, [authLoading, loadKyc, user?.shop?.id]);

  const handleSave = async () => {
    haptic("medium");
    const validationErrors = validateKycIdentifiers(shopCountry, kycData);
    if (validationErrors.length > 0) {
      haptic("error");
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
        title: "Verification Saved",
        description: "Your document details were stored successfully.",
      });
      await refreshUser();
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
    haptic("light");
    setIsReminding(true);
    try {
      await shopsApi.remindAdminKyc();
      toast({
        title: "Admin Notified",
        description: "Your verification request has been resubmitted.",
      });
      loadKyc();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description:
          error.response?.data?.message || "Could not notify review team.",
      });
    } finally {
      setIsReminding(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const uploadField = activeUploadField;
    if (!file || !uploadField) return;

    setIsUploading(true);
    haptic("light");
    try {
      const data = await uploadAuthenticatedFile(file, "kyc");
      if (!data.success || !data.url) {
        haptic("error");
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

      haptic("success");
      toast({
        title: "File Uploaded",
        description: "Document successfully attached.",
      });
    } catch (error) {
      haptic("error");
      const message =
        error instanceof Error
          ? error.message
          : "Could not upload document. Please try again.";
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
    haptic("light");
    setKycData((prev) => {
      const newDocs = { ...prev.verificationDocuments };
      delete newDocs[key];
      return { ...prev, verificationDocuments: newDocs };
    });
  };

  const latestRequest = kycData.verificationRequests?.[0];
  const isPending = latestRequest?.status === "PENDING";
  const isActionRequired = latestRequest?.status === "ACTION_REQUIRED";
  const isReadOnly = kycData.isVerified || isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link
          href="/m/settings"
          onClick={() => haptic("light")}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
            <T>KYC Verification</T>
          </h1>
          <p className="text-xs text-gray-400">
            <T>Submit store license &amp; tax details</T>
          </p>
        </div>
      </div>

      {/* Content body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Status Alerts */}
        {kycData.isVerified ? (
          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300 flex items-start gap-2.5">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs">
                <T>Shop Fully Verified</T>
              </h4>
              <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed">
                <T>
                  Congratulations! Your store is fully approved for unrestricted
                  high-value billing and POS checkouts.
                </T>
              </p>
            </div>
          </div>
        ) : isPending ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs">
                <T>Verification Pending Review</T>
              </h4>
              <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed">
                <T>
                  Your documents are being evaluated by our team. This typically
                  takes 1-2 business days. Counter bills will remain sandboxed
                  with watermarks in the meantime.
                </T>
              </p>
            </div>
          </div>
        ) : isActionRequired ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">
                  <T>Action Required</T>
                </h4>
                <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed">
                  <T>
                    The reviewer requested additions or fixes to your documents:
                  </T>
                </p>
              </div>
            </div>
            {latestRequest?.details?.adminNote && (
              <div className="bg-white/40 dark:bg-black/30 p-2.5 rounded-xl text-[10px] italic font-medium leading-relaxed border border-red-200/50">
                &ldquo;{latestRequest.details.adminNote}&rdquo;
              </div>
            )}
            <button
              onClick={handleRemindAdmin}
              disabled={isReminding}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              {isReminding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              <T>Submit and Notify Reviewer</T>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
            <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs">
                <T>Retail Sandbox Status</T>
              </h4>
              <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed">
                <T>
                  To clear diagonal watermarks from printed bills, please upload
                  official business identifiers and government IDs below.
                </T>
              </p>
            </div>
          </div>
        )}

        {/* Input Fields */}
        <section className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            <T>Business Identifiers</T>
          </h3>
          {isSriLanka && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <T>Sri Lanka VAT registration status</T>:{" "}
              {kycData.vatRegistrationStatus || <T>Not registered</T>}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                <T>{identifierConfig.panLabel}</T> *
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={kycData.panNumber}
                onChange={(e) =>
                  setKycData({ ...kycData, panNumber: e.target.value })
                }
                placeholder={t(identifierConfig.panPlaceholder)}
                inputMode={isSriLanka ? "numeric" : undefined}
                maxLength={isSriLanka ? 9 : undefined}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-950 text-gray-950 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                <T>{identifierConfig.vatLabel}</T>
                {identifierConfig.vatRequired ? " *" : null}
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={kycData.vatNumber}
                onChange={(e) =>
                  setKycData({ ...kycData, vatNumber: e.target.value })
                }
                placeholder={t(identifierConfig.vatPlaceholder)}
                inputMode={isSriLanka ? "numeric" : undefined}
                maxLength={isSriLanka ? 9 : undefined}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-950 text-gray-950 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                <T>{identifierConfig.businessLabel}</T>
                {identifierConfig.businessRequired ? " *" : null}
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={kycData.bisLicenseNumber}
                onChange={(e) =>
                  setKycData({ ...kycData, bisLicenseNumber: e.target.value })
                }
                placeholder={t(identifierConfig.businessPlaceholder)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-950 text-gray-950 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              />
            </div>
          </div>
        </section>

        {/* Supporting Documents */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">
            <T>Supporting Documents</T>
          </h3>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />

          <div className="space-y-3">
            {[
              {
                key: "governmentId",
                title: "Government Photo ID",
                desc: "Passport, Driver's License or National ID Card",
              },
              {
                key: "businessLicensePhoto",
                title: "Business Registration License",
                desc: "Official business registration papers",
              },
              {
                key: "addressProof",
                title: "Utility Bill / Address Proof",
                desc: "Phone/water bill proving shop location",
              },
            ].map((doc) => {
              const url = kycData.verificationDocuments[doc.key];
              return (
                <div
                  key={doc.key}
                  className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col gap-3 justify-between"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      <T>{doc.title}</T>
                    </h4>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      <T>{doc.desc}</T>
                    </p>
                  </div>

                  {url ? (
                    <div className="relative flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-850">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline font-semibold truncate max-w-[210px]"
                      >
                        {url}
                      </a>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.key)}
                          className="p-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">
                      <T>No file attached</T>
                    </p>
                  )}

                  {!isReadOnly && !url && (
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setActiveUploadField(doc.key);
                        fileInputRef.current?.click();
                      }}
                      className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50/30 hover:bg-gray-50 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                    >
                      {isUploading && activeUploadField === doc.key ? (
                        <Clock className="h-4 w-4 animate-spin text-amber-500" />
                      ) : (
                        <UploadCloud className="h-4 w-4 text-amber-500" />
                      )}
                      <T>Upload File</T>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Submit Action */}
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={
              isSaving ||
              !kycData.panNumber ||
              (isSriLanka && (!kycData.vatNumber || !kycData.bisLicenseNumber))
            }
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-95 mt-4"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <T>Submit Verification Credentials</T>
          </button>
        )}
      </div>
    </div>
  );
}
