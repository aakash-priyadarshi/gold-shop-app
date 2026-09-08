"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { CampaignAnalytics } from "@/components/admin/offers/CampaignAnalytics";
import { COUNTRY_LABELS } from "@/components/admin/offers/constants";
import { EmailBlockEditor } from "@/components/admin/offers/email-builder/EmailBlockEditor";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { T } from "@/components/ui/T";
import { useToast } from "@/hooks/use-toast";
import {
  recoveryOffersApi,
  type FestivalCalendarEvent,
  type FestivalCalendarResult,
  type FestivalReligion,
  type OfferCampaign,
  type OfferCampaignEmailDraft,
  type OfferEmailImageMode,
  type RecoveryAudiencePreview,
  type RecoveryCampaignMetrics,
} from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  Globe2,
  Eye,
  ImageUp,
  Link2,
  LogIn,
  Loader2,
  Mail,
  MailCheck,
  MousePointerClick,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Recipient = RecoveryAudiencePreview["eligible"][number];

const FESTIVAL_RELIGION_LABELS: Record<FestivalReligion, string> = {
  HINDU: "Hindu",
  MUSLIM: "Muslim",
  BUDDHIST: "Buddhist",
  JEWISH: "Jewish",
  SIKH: "Sikh",
  CHRISTIAN: "Christian",
};

const FESTIVAL_RELIGION_STYLES: Record<FestivalReligion, string> = {
  HINDU:
    "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100",
  MUSLIM:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  BUDDHIST:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  JEWISH:
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
  SIKH: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
  CHRISTIAN:
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
};

const CALENDAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMAIL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const EMAIL_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/gif",
]);

const SEGMENT_LABELS: Record<Recipient["activitySegment"], string> = {
  recent: "Recently active",
  dormant: "Dormant 14–59 days",
  lapsed: "Lapsed 60+ days",
};

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? { value: (bytes / (1024 * 1024)).toFixed(1), unit: "MB" }
    : { value: String(Math.max(1, Math.round(bytes / 1024))), unit: "KB" };
}

function FormattedFileSize({ bytes }: { bytes: number }) {
  const { value, unit } = formatFileSize(bytes);
  return (
    <>
      {value} <T>{unit}</T>
    </>
  );
}

function formatLastActive(value?: string | null) {
  if (!value) return "Never signed in";
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
  );
  if (days === 0) return "Active today";
  if (days === 1) return "Active yesterday";
  return `Active ${days} days ago`;
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function apiErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

function dateOnlyToLocal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function toLocalDateKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalDateTimeInput(date: Date, hours: number, minutes: number) {
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function festivalCampaignKey(event: FestivalCalendarEvent) {
  return `festival-${event.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${event.date.slice(0, 4)}`;
}

function recipientStatus(recipient: Recipient) {
  if (recipient.unsubscribed) return "unsubscribed";
  if (recipient.claimedAt || recipient.offerStatus === "CLAIMED") {
    return "activated";
  }
  if (recipient.offerStatus === "CLAIMING") return "claiming";
  if (recipient.firstOpenedAt) return "opened";
  if (recipient.offerStatus === "SENT" || recipient.sentAt) return "sent";
  if (recipient.offerStatus === "PREPARED") return "scheduled";
  if (recipient.offerStatus === "SEND_FAILED") return "failed";
  if (recipient.offerStatus === "CANCELLED") return "cancelled";
  if (recipient.offerStatus === "EXPIRED") return "expired";
  return "not-sent";
}

function recipientStatusLabel(status: ReturnType<typeof recipientStatus>) {
  const labels: Record<ReturnType<typeof recipientStatus>, string> = {
    unsubscribed: "Unsubscribed",
    activated: "Activated",
    claiming: "Claiming",
    opened: "Opened",
    sent: "Sent",
    scheduled: "Scheduled",
    failed: "Failed",
    cancelled: "Cancelled",
    expired: "Expired",
    "not-sent": "Not sent",
  };
  return labels[status];
}

function recipientStatusClass(status: ReturnType<typeof recipientStatus>) {
  const classes: Record<ReturnType<typeof recipientStatus>, string> = {
    unsubscribed:
      "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    activated:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    claiming:
      "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200",
    opened: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
    scheduled:
      "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
    cancelled:
      "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
    expired:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    "not-sent": "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  };
  return classes[status];
}

export default function OffersAdminPage() {
  const { toast } = useToast();
  const t = useT();
  const [campaigns, setCampaigns] = useState<OfferCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedCampaignKey, setSelectedCampaignKey] = useState(
    "customer-winback-2026-09",
  );
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaignKey, setEditingCampaignKey] = useState<string | null>(
    null,
  );
  const [campaignFormMode, setCampaignFormMode] = useState<
    "create" | "edit" | "email"
  >("create");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [emailImageMode, setEmailImageMode] =
    useState<OfferEmailImageMode>("DEFAULT");
  const [emailImageFile, setEmailImageFile] = useState<File | null>(null);
  const [previewingEmail, setPreviewingEmail] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    html: string;
  } | null>(null);
  const [campaignDraft, setCampaignDraft] = useState({
    key: "",
    name: "",
    kind: "FESTIVAL" as OfferCampaign["kind"],
    complimentaryDays: 14,
    discountPercent: 10,
    startsAt: "",
    endsAt: "",
    emailSubject: "",
    emailHeading: "",
    emailBody: "",
    imageUrl: "",
    ctaUrl: "",
    ctaLabel: "",
  });
  const [calendarStartYear] = useState(() => new Date().getFullYear());
  const [festivalCalendar, setFestivalCalendar] =
    useState<FestivalCalendarResult | null>(null);
  const [festivalCalendarLoading, setFestivalCalendarLoading] = useState(true);
  const [festivalCalendarError, setFestivalCalendarError] = useState(false);
  const [festivalMonth, setFestivalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [festivalReligion, setFestivalReligion] = useState<
    FestivalReligion | "all"
  >("all");
  const [festivalCountry, setFestivalCountry] = useState<
    FestivalCalendarEvent["countries"][number] | "all"
  >("all");
  const [preview, setPreview] = useState<RecoveryAudiencePreview | null>(null);
  const [metrics, setMetrics] = useState<RecoveryCampaignMetrics | null>(null);
  const [overallMetrics, setOverallMetrics] =
    useState<RecoveryCampaignMetrics | null>(null);
  const [analyticsView, setAnalyticsView] = useState<"overall" | "offer">(
    "overall",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<
    "IMMEDIATE" | "NEXT_LOCAL_10AM" | "CUSTOM" | null
  >(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [segment, setSegment] = useState("all");
  const [accountKind, setAccountKind] = useState("all");
  const [incidentOnly, setIncidentOnly] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [deliveryMode, setDeliveryMode] = useState<
    "NEXT_LOCAL_10AM" | "IMMEDIATE" | "CUSTOM"
  >("NEXT_LOCAL_10AM");
  const [customSendAt, setCustomSendAt] = useState("");
  const [scheduleByUserId, setScheduleByUserId] = useState<
    Record<string, string>
  >({});
  const [designerOpen, setDesignerOpen] = useState(false);

  // Festival offers and product updates are separate workflows; the tab is
  // reflected in the URL (?tab=) so admin views stay deep-linkable.
  const [activeTab, setActiveTab] = useState<
    "festival" | "product" | "performance"
  >("festival");
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "product" || tab === "performance" || tab === "festival") {
      setActiveTab(tab);
    }
  }, []);
  const selectTab = (tab: "festival" | "product" | "performance") => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  };

  const loadAudience = useCallback(async () => {
    setLoading(true);
    try {
      const [previewResponse, metricsResponse, overallMetricsResponse] =
        await Promise.all([
          recoveryOffersApi.previewAudience(selectedCampaignKey),
          recoveryOffersApi.metrics(selectedCampaignKey),
          recoveryOffersApi.metrics(),
        ]);
      setPreview(previewResponse.data);
      setMetrics(metricsResponse.data);
      setOverallMetrics(overallMetricsResponse.data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to load customer recovery audience:", error);
      toast({
        title: t("Could not load the recovery audience"),
        description: t("Check the API connection and try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCampaignKey, t, toast]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const response = await recoveryOffersApi.listCampaigns();
      setCampaigns(response.data);
    } catch (error) {
      console.error("Failed to load offer campaigns:", error);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const loadFestivalCalendar = useCallback(async () => {
    setFestivalCalendarLoading(true);
    setFestivalCalendarError(false);
    try {
      const response = await recoveryOffersApi.festivalCalendar(
        calendarStartYear,
        3,
      );
      setFestivalCalendar(response.data);
    } catch (error) {
      console.error("Failed to load the festival calendar:", error);
      setFestivalCalendarError(true);
    } finally {
      setFestivalCalendarLoading(false);
    }
  }, [calendarStartYear]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    void loadFestivalCalendar();
  }, [loadFestivalCalendar]);

  useEffect(() => {
    void loadAudience();
  }, [loadAudience]);

  const selectedCampaign = campaigns.find(
    (item) => item.key === selectedCampaignKey,
  );

  // Keep the selected campaign inside the active tab's campaign family so the
  // audience, preview, and schedule panels always describe a visible campaign.
  useEffect(() => {
    if (activeTab === "product") {
      if (!selectedCampaign || selectedCampaign.kind !== "PRODUCT_UPDATE") {
        const firstProduct = campaigns.find(
          (campaign) => campaign.kind === "PRODUCT_UPDATE",
        );
        if (firstProduct) setSelectedCampaignKey(firstProduct.key);
      }
    } else if (activeTab === "festival") {
      if (selectedCampaign?.kind === "PRODUCT_UPDATE") {
        setSelectedCampaignKey("customer-winback-2026-09");
      }
    }
  }, [activeTab, campaigns, selectedCampaign]);

  const editingCampaign = campaigns.find(
    (item) => item.key === editingCampaignKey,
  );
  const lockCampaign =
    showCampaignForm && campaignFormMode === "create"
      ? undefined
      : editingCampaign || selectedCampaign;
  // Email copy and artwork lock 5 minutes before the campaign's earliest
  // scheduled send so queued emails render the same content they were
  // previewed with.
  const emailLockAt = lockCampaign?.nextScheduledFor
    ? new Date(lockCampaign.nextScheduledFor).getTime() - 5 * 60 * 1000
    : null;
  const [emailLockReached, setEmailLockReached] = useState(false);
  useEffect(() => {
    if (emailLockAt === null) {
      setEmailLockReached(false);
      return;
    }
    const delay = emailLockAt - Date.now();
    if (delay <= 0) {
      setEmailLockReached(true);
      return;
    }
    setEmailLockReached(false);
    const timer = window.setTimeout(() => setEmailLockReached(true), delay);
    return () => window.clearTimeout(timer);
  }, [emailLockAt]);
  const emailEditLocked = emailLockAt !== null && emailLockReached;

  const setImageStateFromCampaign = (campaign: OfferCampaign) => {
    setEmailImageFile(null);
    setEmailImageMode(
      campaign.emailImage ? "KEEP" : campaign.imageUrl ? "URL" : "DEFAULT",
    );
  };

  const buildEmailDraft = (): OfferCampaignEmailDraft | null => {
    if (emailImageMode === "UPLOAD" && !emailImageFile) {
      toast({
        title: t("Choose an image to upload"),
        description: t("Use a PNG, JPEG, or GIF up to 5 MB."),
        variant: "destructive",
      });
      return null;
    }
    if (emailImageMode === "URL") {
      try {
        const parsed = new URL(campaignDraft.imageUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported protocol");
        }
      } catch {
        toast({
          title: t("Enter a valid image link"),
          description: t("The image link must start with http:// or https://."),
          variant: "destructive",
        });
        return null;
      }
    }
    return {
      emailSubject: campaignDraft.emailSubject,
      emailHeading: campaignDraft.emailHeading,
      emailBody: campaignDraft.emailBody,
      imageMode: emailImageMode,
      ...(emailImageMode === "URL"
        ? { imageUrl: campaignDraft.imageUrl.trim() }
        : {}),
      ...(emailImageMode === "UPLOAD" ? { image: emailImageFile } : {}),
      ...(campaignDraft.kind === "PRODUCT_UPDATE"
        ? {
            ctaUrl: campaignDraft.ctaUrl.trim(),
            ctaLabel: campaignDraft.ctaLabel.trim(),
          }
        : {}),
    };
  };

  const selectEmailImage = (file?: File) => {
    if (!file) return;
    const extensionAllowed = /\.(png|jpe?g|gif)$/i.test(file.name);
    if ((file.type && !EMAIL_IMAGE_TYPES.has(file.type)) || !extensionAllowed) {
      toast({
        title: t("This image type is not supported"),
        description: t("Choose a PNG, JPEG, or GIF file."),
        variant: "destructive",
      });
      return;
    }
    if (file.size > EMAIL_IMAGE_MAX_BYTES) {
      toast({
        title: t("The image is too large"),
        description: t("Choose an image that is 5 MB or smaller."),
        variant: "destructive",
      });
      return;
    }
    setEmailImageFile(file);
    setEmailImageMode("UPLOAD");
  };

  const previewCampaignEmail = async () => {
    if (!editingCampaignKey) return;
    const draft = buildEmailDraft();
    if (!draft) return;
    setPreviewingEmail(true);
    try {
      const response = await recoveryOffersApi.previewCampaignEmail(
        editingCampaignKey,
        draft,
      );
      setEmailPreview(response.data);
    } catch (error) {
      toast({
        title: t("Email preview could not be created"),
        description: t(
          apiErrorMessage(
            error,
            "Check the email content and image, then try again.",
          ),
        ),
        variant: "destructive",
      });
    } finally {
      setPreviewingEmail(false);
    }
  };

  const saveFestivalCampaign = async () => {
    const startsAt = toIsoFromLocal(campaignDraft.startsAt);
    const endsAt = toIsoFromLocal(campaignDraft.endsAt);
    const isProductUpdate = campaignDraft.kind === "PRODUCT_UPDATE";
    if (campaignFormMode !== "email") {
      if (!startsAt || !endsAt) {
        toast({
          title: isProductUpdate
            ? t("Choose the announcement window")
            : t("Choose the festival sale window"),
          variant: "destructive",
        });
        return;
      }
      if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        toast({
          title: isProductUpdate
            ? t("The announcement must end after it starts")
            : t("The sale must end after it starts"),
          variant: "destructive",
        });
        return;
      }
    }
    setSavingCampaign(true);
    try {
      // Email copy and artwork lock 5 minutes before a scheduled send; they
      // are simply omitted from the payload while locked.
      const emailContent = {
        emailSubject: campaignDraft.emailSubject,
        emailHeading: campaignDraft.emailHeading,
        emailBody: campaignDraft.emailBody,
        imageUrl: campaignDraft.imageUrl,
        ...(isProductUpdate
          ? {
              ctaUrl: campaignDraft.ctaUrl || null,
              ctaLabel: campaignDraft.ctaLabel || null,
            }
          : {}),
      };
      const kind = isProductUpdate ? "PRODUCT_UPDATE" : "FESTIVAL";
      const offerValues = isProductUpdate
        ? { complimentaryDays: 0, discountPercent: 0 }
        : {
            complimentaryDays: campaignDraft.complimentaryDays,
            discountPercent: campaignDraft.discountPercent,
          };
      let response: { data: { key: string } };
      if (campaignFormMode === "email" && editingCampaignKey) {
        const draft = buildEmailDraft();
        if (!draft) return;
        response = await recoveryOffersApi.updateCampaignEmail(
          editingCampaignKey,
          draft,
        );
      } else if (editingCampaignKey) {
        response = await recoveryOffersApi.updateCampaign(editingCampaignKey, {
          name: campaignDraft.name,
          kind,
          ...offerValues,
          startsAt: startsAt as string,
          endsAt: endsAt as string,
          ...(emailEditLocked ? {} : emailContent),
        });
      } else {
        response = await recoveryOffersApi.createCampaign({
          name: campaignDraft.name,
          kind,
          ...offerValues,
          startsAt: startsAt as string,
          endsAt: endsAt as string,
          ...emailContent,
          key: campaignDraft.key,
        });
      }
      await loadCampaigns();
      setSelectedCampaignKey(response.data.key);
      setShowCampaignForm(false);
      setEditingCampaignKey(null);
      setCampaignFormMode("create");
      toast({
        title:
          campaignFormMode === "email"
            ? t("Email updated")
            : editingCampaignKey
              ? t("Campaign updated")
              : t("Campaign created"),
      });
    } catch (error: unknown) {
      console.error("Failed to save campaign:", error);
      toast({
        title:
          campaignFormMode === "email"
            ? t("Email was not updated")
            : t("Campaign was not saved"),
        description: t(
          apiErrorMessage(
            error,
            "Check the campaign key and dates, then try again.",
          ),
        ),
        variant: "destructive",
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  const draftFromCampaign = (campaign: OfferCampaign) => ({
    key: campaign.key,
    name: campaign.name,
    kind: campaign.kind,
    complimentaryDays: campaign.complimentaryDays,
    discountPercent: campaign.discountPercent,
    startsAt: toDateTimeLocalValue(campaign.startsAt),
    endsAt: toDateTimeLocalValue(campaign.endsAt),
    emailSubject: campaign.emailSubject,
    emailHeading: campaign.emailHeading,
    emailBody: campaign.emailBody,
    imageUrl: campaign.imageUrl || "",
    ctaUrl: campaign.ctaUrl || "",
    ctaLabel: campaign.ctaLabel || "",
  });

  const editSelectedCampaign = () => {
    const campaign = campaigns.find((item) => item.key === selectedCampaignKey);
    if (!campaign?.startsAt || !campaign.endsAt) return;
    setCampaignDraft(draftFromCampaign(campaign));
    setImageStateFromCampaign(campaign);
    setEditingCampaignKey(campaign.key);
    setCampaignFormMode("edit");
    setShowCampaignForm(true);
  };

  const editSelectedCampaignEmail = () => {
    const campaign = campaigns.find((item) => item.key === selectedCampaignKey);
    if (!campaign) return;
    setCampaignDraft(draftFromCampaign(campaign));
    setImageStateFromCampaign(campaign);
    setEditingCampaignKey(campaign.key);
    setCampaignFormMode("email");
    setShowCampaignForm(true);
  };

  const startFestivalCampaign = (event: FestivalCalendarEvent) => {
    if (campaignsLoading) return;
    const key = festivalCampaignKey(event);
    const existingCampaign = campaigns.find((campaign) => campaign.key === key);
    if (existingCampaign?.startsAt && existingCampaign.endsAt) {
      setSelectedCampaignKey(existingCampaign.key);
      setCampaignDraft({
        key: existingCampaign.key,
        name: existingCampaign.name,
        kind: existingCampaign.kind,
        complimentaryDays: existingCampaign.complimentaryDays,
        discountPercent: existingCampaign.discountPercent,
        startsAt: toDateTimeLocalValue(existingCampaign.startsAt),
        endsAt: toDateTimeLocalValue(existingCampaign.endsAt),
        emailSubject: existingCampaign.emailSubject,
        emailHeading: existingCampaign.emailHeading,
        emailBody: existingCampaign.emailBody,
        imageUrl: existingCampaign.imageUrl || "",
        ctaUrl: existingCampaign.ctaUrl || "",
        ctaLabel: existingCampaign.ctaLabel || "",
      });
      setImageStateFromCampaign(existingCampaign);
      setEditingCampaignKey(existingCampaign.key);
      setCampaignFormMode("edit");
      setShowCampaignForm(true);
      return;
    }

    const festivalDate = dateOnlyToLocal(event.date);
    const saleStart = new Date(festivalDate);
    saleStart.setDate(saleStart.getDate() - 14);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (saleStart < today) saleStart.setTime(today.getTime());
    const complimentaryDays = 14;
    const discountPercent = 10;
    const year = event.date.slice(0, 4);

    setCampaignDraft({
      key,
      name: `${event.name} ${year}`,
      kind: "FESTIVAL",
      complimentaryDays,
      discountPercent,
      startsAt: toLocalDateTimeInput(saleStart, 0, 0),
      endsAt: toLocalDateTimeInput(festivalDate, 23, 59),
      emailSubject: `Celebrate ${event.name}: ${complimentaryDays} days Pro free, then ${discountPercent}% off`,
      emailHeading: `A ${event.name} offer for your jewellery business`,
      emailBody: `Celebrate ${event.name} with Orivraa. Claim ${complimentaryDays} complimentary days of Pro — no card, no automatic renewal.\n\nOnce the complimentary days end, the Pro plan you buy starts with ${discountPercent}% off your first payment. Claim your free days now, then upgrade with the festival discount.`,
      imageUrl: "",
      ctaUrl: "",
      ctaLabel: "",
    });
    setEmailImageFile(null);
    setEmailImageMode("DEFAULT");
    setEditingCampaignKey(null);
    setCampaignFormMode("create");
    setShowCampaignForm(true);
  };

  const startProductUpdateCampaign = () => {
    const existing = campaigns.find(
      (campaign) => campaign.key === "whats-new-ai-photo-2026-09",
    );
    if (existing?.startsAt && existing.endsAt) {
      setSelectedCampaignKey(existing.key);
      setCampaignDraft(draftFromCampaign(existing));
      setImageStateFromCampaign(existing);
      setEditingCampaignKey(existing.key);
      setCampaignFormMode("edit");
      setShowCampaignForm(true);
      return;
    }
    const starts = new Date();
    const ends = new Date();
    ends.setDate(ends.getDate() + 90);
    setCampaignDraft({
      key: "whats-new-ai-photo-2026-09",
      name: "AI product photo studio",
      kind: "PRODUCT_UPDATE",
      complimentaryDays: 0,
      discountPercent: 0,
      startsAt: toLocalDateTimeInput(starts, 0, 0),
      endsAt: toLocalDateTimeInput(ends, 23, 59),
      emailSubject: "New: studio photos from the pictures you already have",
      emailHeading: "Turn a shop photo into a listing-ready image",
      emailBody:
        "Open Product Catalog, pick a photo, and tap Enhance. Orivraa keeps the jewellery exactly as it is — metal, stones, hallmark — and only changes lighting, background, and sharpness.\n\nWatch the short demo first, then try it on a real piece in your catalog. Pro+ and Enterprise shops can enhance photos from the catalog, jewelry sets, and mobile POS.",
      imageUrl: "https://www.orivraa.com/ai-photo-studio-demo.gif",
      ctaUrl: "https://www.orivraa.com/jewellery-shop-software#ai-photo-studio",
      ctaLabel: "See it in action",
    });
    setEmailImageFile(null);
    setEmailImageMode("URL");
    setEditingCampaignKey(null);
    setCampaignFormMode("create");
    setShowCampaignForm(true);
  };

  const filteredFestivalEvents = useMemo(
    () =>
      (festivalCalendar?.events || []).filter((event) => {
        if (festivalReligion !== "all" && event.religion !== festivalReligion) {
          return false;
        }
        if (
          festivalCountry !== "all" &&
          !event.countries.includes(festivalCountry)
        ) {
          return false;
        }
        return (
          Number(event.date.slice(0, 4)) === festivalMonth.getFullYear() &&
          Number(event.date.slice(5, 7)) === festivalMonth.getMonth() + 1
        );
      }),
    [festivalCalendar, festivalCountry, festivalMonth, festivalReligion],
  );

  const festivalEventsByDate = useMemo(() => {
    const byDate = new Map<string, FestivalCalendarEvent[]>();
    for (const event of filteredFestivalEvents) {
      byDate.set(event.date, [...(byDate.get(event.date) || []), event]);
    }
    return byDate;
  }, [filteredFestivalEvents]);

  const festivalCalendarDays = useMemo(() => {
    const year = festivalMonth.getFullYear();
    const month = festivalMonth.getMonth();
    const leadingDays = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leadingDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [festivalMonth]);

  const changeFestivalMonth = (offset: number) => {
    setFestivalMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const filteredRecipients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (preview?.eligible || []).filter((recipient) => {
      if (
        normalizedSearch &&
        ![
          recipient.firstName,
          recipient.shopName,
          recipient.email,
          COUNTRY_LABELS[recipient.country] || recipient.country,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }
      if (country !== "all" && recipient.country !== country) return false;
      if (segment !== "all" && recipient.activitySegment !== segment) {
        return false;
      }
      if (accountKind === "unverified" && recipient.emailVerified) {
        return false;
      }
      if (accountKind === "no-shop" && recipient.hasShop) return false;
      if (
        accountKind === "pending" &&
        recipient.accountStatus !== "PENDING_VERIFICATION"
      ) {
        return false;
      }
      if (accountKind === "paid" && !recipient.hasPaidPlan) return false;
      if (
        accountKind === "complimentary" &&
        (!recipient.emailVerified || recipient.hasPaidPlan)
      ) {
        return false;
      }
      if (incidentOnly && !recipient.incidentAffected) return false;
      if (deliveryStatus !== "all") {
        const status = recipientStatus(recipient);
        if (deliveryStatus === "not-sent" && status !== "not-sent") {
          return false;
        }
        if (
          deliveryStatus === "sent" &&
          !["sent", "opened", "activated", "claiming"].includes(status)
        ) {
          return false;
        }
        if (
          deliveryStatus === "opened" &&
          status !== "opened" &&
          status !== "activated"
        ) {
          return false;
        }
        if (deliveryStatus === "activated" && status !== "activated") {
          return false;
        }
        if (deliveryStatus === "unsubscribed" && status !== "unsubscribed") {
          return false;
        }
        if (deliveryStatus === "scheduled" && status !== "scheduled") {
          return false;
        }
      }
      return true;
    });
  }, [
    accountKind,
    country,
    deliveryStatus,
    incidentOnly,
    preview?.eligible,
    search,
    segment,
  ]);

  const audienceBreakdown = useMemo(() => {
    const eligible = preview?.eligible || [];
    return {
      paid: eligible.filter((item) => item.hasPaidPlan).length,
      unverified: eligible.filter((item) => !item.emailVerified).length,
      pending: eligible.filter(
        (item) => item.accountStatus === "PENDING_VERIFICATION",
      ).length,
      noShop: eligible.filter((item) => !item.hasShop).length,
      queued: eligible.filter((item) => item.offerStatus === "PREPARED").length,
      sent: eligible.filter((item) => Boolean(item.sentAt)).length,
      opened: eligible.filter((item) => Boolean(item.firstOpenedAt)).length,
      claimed: eligible.filter((item) => Boolean(item.claimedAt)).length,
      unsubscribed: eligible.filter((item) => item.unsubscribed).length,
    };
  }, [preview?.eligible]);

  const countries = useMemo(
    () =>
      [
        ...new Set((preview?.eligible || []).map((item) => item.country)),
      ].sort(),
    [preview?.eligible],
  );

  const countryGroups = useMemo(
    () =>
      countries.map((code) => {
        const recipients = (preview?.eligible || []).filter(
          (item) => item.country === code,
        );
        return {
          code,
          count: recipients.length,
          selected: recipients.filter((item) => selectedIds.has(item.userId))
            .length,
          timeZone: recipients[0]?.timeZone,
          sendAt: recipients[0]?.recommendedSendAt,
        };
      }),
    [countries, preview?.eligible, selectedIds],
  );

  const selectableFiltered = filteredRecipients.filter(
    (recipient) => recipient.canSend,
  );
  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((recipient) => selectedIds.has(recipient.userId));

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const recipient of selectableFiltered) {
        if (allFilteredSelected) next.delete(recipient.userId);
        else next.add(recipient.userId);
      }
      return next;
    });
  };

  const toggleRecipient = (userId: string, canSend: boolean) => {
    if (!canSend) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSend = async (
    deliveryTiming: "IMMEDIATE" | "NEXT_LOCAL_10AM" | "CUSTOM",
  ) => {
    if (!preview || selectedIds.size === 0) return;
    const sendableIds = selectableFiltered
      .filter((recipient) => selectedIds.has(recipient.userId))
      .map((recipient) => recipient.userId);
    if (sendableIds.length === 0) {
      toast({
        title: t("Those accounts were already emailed"),
        description: t(
          "Select people who have not been sent, queued, claimed, or unsubscribed.",
        ),
        variant: "destructive",
      });
      return;
    }
    const scheduledFor =
      deliveryTiming === "CUSTOM" ? toIsoFromLocal(customSendAt) : undefined;
    if (deliveryTiming === "CUSTOM" && !scheduledFor) {
      toast({
        title: t("Choose a send time"),
        description: t("Set the custom schedule before sending."),
        variant: "destructive",
      });
      return;
    }
    const recipientSchedules = sendableIds
      .map((userId) => {
        const scheduledAt = scheduleByUserId[userId]
          ? toIsoFromLocal(scheduleByUserId[userId])
          : undefined;
        return scheduledAt ? { userId, scheduledAt } : null;
      })
      .filter((item): item is { userId: string; scheduledAt: string } =>
        Boolean(item),
      );
    const confirmMessage =
      deliveryTiming === "CUSTOM"
        ? t(
            `You are about to schedule these emails at the chosen time for ${sendableIds.length} selected account(s) in ${preview.campaign.name}. Continue?`,
          )
        : deliveryTiming === "NEXT_LOCAL_10AM"
          ? t(
              `You are about to schedule these emails for the next local 10:00 AM for ${sendableIds.length} selected account(s) in ${preview.campaign.name}. Continue?`,
            )
          : t(
              `You are about to send these emails now for ${sendableIds.length} selected account(s) in ${preview.campaign.name}. Continue?`,
            );
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSending(deliveryTiming);
    try {
      const response = await recoveryOffersApi.sendAudience({
        userIds: sendableIds,
        campaignKey: preview.campaignKey,
        expiresInDays: 30,
        deliveryTiming,
        scheduledFor,
        recipientSchedules:
          recipientSchedules.length > 0 ? recipientSchedules : undefined,
      });
      toast({
        title:
          deliveryTiming === "NEXT_LOCAL_10AM"
            ? t("Offer emails scheduled")
            : t("Offer emails queued"),
        description: `${response.data.scheduled || 0} ${t("scheduled")}, ${response.data.queued || 0} ${t("queued")}, ${response.data.failed || 0} ${t("failed")}`,
        variant: response.data.failed > 0 ? "destructive" : "default",
      });
      await loadAudience();
    } catch (error) {
      console.error("Failed to queue offer campaign:", error);
      toast({
        title: t("Offer campaign was not queued"),
        description: t("No Pro time was granted automatically."),
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  const copyTemplate = async () => {
    const days = preview?.days || 50;
    if (preview?.campaign.kind === "PRODUCT_UPDATE") {
      await navigator.clipboard.writeText(
        [
          `Subject: ${preview.campaign.emailSubject}`,
          "",
          "Hi {{firstName}},",
          "",
          preview.campaign.emailBody,
          "",
          "See the live demo, then open Product Catalog to enhance a photo.",
          "",
          "— Team Orivraa",
        ].join("\n"),
      );
      toast({ title: t("Email template copied") });
      return;
    }
    if (preview?.campaign.kind === "FESTIVAL") {
      await navigator.clipboard.writeText(
        [
          `Subject: ${preview.campaign.emailSubject}`,
          "",
          "Hi {{firstName}},",
          "",
          preview.campaign.emailBody,
          "",
          `Claim ${days} days of complimentary Pro, then get ${preview.campaign.discountPercent}% off the paid plan you choose — the discount starts when the complimentary days end. Offer valid during ${preview.campaign.name}.`,
          "",
          "— Team Orivraa",
        ].join("\n"),
      );
      toast({ title: t("Email template copied") });
      return;
    }
    await navigator.clipboard.writeText(
      [
        `Subject: We’re sorry about the invoice issue — ${days} days of Orivraa Pro on us`,
        "",
        "Hi {{firstName}},",
        "",
        "Recently, an invoice issue disrupted the experience for some Orivraa shops. We fixed the issue, strengthened our monitoring, and improved invoice reliability.",
        "",
        "I’m genuinely sorry if this interrupted your work. We would be grateful for the opportunity to earn back your trust.",
        "",
        `Return to Orivraa using your secure link. If this shop is not on Pro, you receive ${days} days of Pro from the day you claim. If it already has Pro, we extend it to ${days} days from that day unless more than ${days} days already remain. No card is required and complimentary access will not renew automatically. If this email is not verified yet, sign in, confirm the code, then activate the offer.`,
        "",
        "— Aakash",
        "Founder & CEO, Orivraa",
      ].join("\n"),
    );
    toast({ title: t("Email template copied") });
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-950 dark:text-white">
                    <T>Offers</T>
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <T>
                      Create, preview, select, and schedule recovery and
                      festival campaigns.
                    </T>
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadAudience()}
              disabled={loading || Boolean(sending)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <T>Refresh audience</T>
            </button>
          </div>

          <div
            className="inline-flex flex-wrap gap-1 rounded-xl border bg-white p-1 shadow-sm dark:bg-gray-950/60"
            data-tour="offers-tabs"
          >
            {(
              [
                ["festival", "Festival offers", CalendarDays],
                ["product", "Product updates", Sparkles],
                ["performance", "Performance", BarChart3],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectTab(value)}
                aria-current={activeTab === value ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                  activeTab === value
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <T>{label}</T>
              </button>
            ))}
          </div>

          {activeTab === "festival" && (
          <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-violet-600" />
                  <h2 className="font-semibold">
                    <T>Festival calendar</T>
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <T>
                    Browse this year and the next two years. Click any upcoming
                    festival to prefill an editable offer.
                  </T>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="text-xs font-medium">
                  <span className="sr-only">
                    <T>Religion</T>
                  </span>
                  <select
                    aria-label={t("Festival religion")}
                    value={festivalReligion}
                    onChange={(event) =>
                      setFestivalReligion(
                        event.target.value as FestivalReligion | "all",
                      )
                    }
                    className="min-h-10 rounded-lg border bg-white px-3 dark:bg-gray-950"
                  >
                    <option value="all">{t("All religions")}</option>
                    {Object.entries(FESTIVAL_RELIGION_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {t(label)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  <span className="sr-only">
                    <T>Country</T>
                  </span>
                  <select
                    aria-label={t("Festival country")}
                    value={festivalCountry}
                    onChange={(event) =>
                      setFestivalCountry(
                        event.target.value as
                          | FestivalCalendarEvent["countries"][number]
                          | "all",
                      )
                    }
                    className="min-h-10 rounded-lg border bg-white px-3 dark:bg-gray-950"
                  >
                    <option value="all">{t("All countries")}</option>
                    {["IN", "NP", "AE", "US", "UK"].map((code) => (
                      <option key={code} value={code}>
                        {t(COUNTRY_LABELS[code])}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border bg-gray-50 px-2 py-2 dark:bg-gray-950/40">
              <button
                type="button"
                aria-label={t("Previous month")}
                onClick={() => changeFestivalMonth(-1)}
                disabled={festivalMonth <= new Date(calendarStartYear, 0, 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 dark:hover:bg-gray-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="font-semibold">
                <T>
                  {new Intl.DateTimeFormat("en", {
                    month: "long",
                    year: "numeric",
                  }).format(festivalMonth)}
                </T>
              </h3>
              <button
                type="button"
                aria-label={t("Next month")}
                onClick={() => changeFestivalMonth(1)}
                disabled={
                  festivalMonth >=
                  new Date(
                    festivalCalendar?.endYear ?? calendarStartYear + 2,
                    11,
                    1,
                  )
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 dark:hover:bg-gray-900"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {festivalCalendarLoading ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <T>Loading festival dates</T>
              </div>
            ) : festivalCalendarError ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                <T>Festival dates could not be loaded.</T>
                <button
                  type="button"
                  onClick={() => void loadFestivalCalendar()}
                  className="rounded-lg border px-3 py-2 font-semibold"
                >
                  <T>Try again</T>
                </button>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {CALENDAR_WEEKDAYS.map((day) => (
                    <div key={day} className="py-1">
                      <T>{day}</T>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {festivalCalendarDays.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${index}`}
                          aria-hidden="true"
                          className="min-h-24 rounded-lg bg-gray-50/50 dark:bg-gray-950/20"
                        />
                      );
                    }
                    const date = toLocalDateKey(
                      new Date(
                        festivalMonth.getFullYear(),
                        festivalMonth.getMonth(),
                        day,
                      ),
                    );
                    const events = festivalEventsByDate.get(date) || [];
                    return (
                      <div
                        key={date}
                        className="min-h-24 rounded-lg border bg-white p-1.5 dark:bg-gray-950/40"
                      >
                        <div className="text-xs font-semibold text-muted-foreground">
                          {day}
                        </div>
                        <div className="mt-1 space-y-1">
                          {events.map((event) => {
                            const hasPassed =
                              event.date < toLocalDateKey(new Date());
                            return (
                              <button
                                key={event.id}
                                type="button"
                                disabled={hasPassed || campaignsLoading}
                                onClick={() => startFestivalCampaign(event)}
                                aria-label={
                                  hasPassed
                                    ? t(`${event.name} has passed`)
                                    : t(`Create ${event.name} offer`)
                                }
                                title={t(
                                  event.dateAccuracy === "MOON_SIGHTING"
                                    ? "Estimated date; confirm after local moon sighting"
                                    : "Create an offer from this festival",
                                )}
                                className={`block w-full rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight transition hover:brightness-95 disabled:cursor-default disabled:opacity-60 ${FESTIVAL_RELIGION_STYLES[event.religion]}`}
                              >
                                <span className="block font-semibold">
                                  {event.dateAccuracy === "MOON_SIGHTING"
                                    ? "≈ "
                                    : ""}
                                  <T>{event.name}</T>
                                </span>
                                <span className="mt-0.5 block opacity-75">
                                  {event.countries.join(" · ")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredFestivalEvents.length === 0 && (
                  <p className="mt-3 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <T>No matching festivals in this month.</T>
                  </p>
                )}
                <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  {(festivalCalendar?.notices || []).map((notice) => (
                    <p key={notice}>
                      <T>{notice}</T>
                    </p>
                  ))}
                </div>
              </>
            )}
          </section>
          )}

          <section
            className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60"
            data-tour="offers-campaigns"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  <T>Offer campaign</T>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  <T>
                    Recovery, festival, and product-update emails use separate
                    copy, claim rules, and campaign metrics. Product updates go
                    only to registered shops — never to cold leads.
                  </T>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCampaign &&
                  activeTab === "product" &&
                  selectedCampaign.kind === "PRODUCT_UPDATE" && (
                    <button
                      type="button"
                      onClick={() => setDesignerOpen(true)}
                      data-tour="email-studio-open"
                      title={
                        emailEditLocked
                          ? t(
                              "Editing is locked this close to send. You can still open a read-only preview.",
                            )
                          : undefined
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                    >
                      <ImageUp className="h-4 w-4" />
                      <T>{emailEditLocked ? "Preview email" : "Design email"}</T>
                    </button>
                  )}
                {selectedCampaign &&
                  (activeTab === "festival" ||
                    selectedCampaign.kind !== "PRODUCT_UPDATE") && (
                    <button
                      type="button"
                      onClick={editSelectedCampaignEmail}
                      disabled={emailEditLocked}
                      title={
                        emailEditLocked
                          ? t(
                              "Email content locks 5 minutes before a scheduled send",
                            )
                          : undefined
                      }
                      className="inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <T>Edit email content</T>
                    </button>
                  )}
                {selectedCampaignKey !== "customer-winback-2026-09" && (
                  <button
                    type="button"
                    onClick={editSelectedCampaign}
                    className="inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-sm font-semibold"
                  >
                    {selectedCampaign?.kind === "PRODUCT_UPDATE" ? (
                      <T>Edit selected announcement</T>
                    ) : (
                      <T>Edit selected festival</T>
                    )}
                  </button>
                )}
                {activeTab === "product" && (
                  <button
                    type="button"
                    onClick={startProductUpdateCampaign}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
                  >
                    <Sparkles className="h-4 w-4" />
                    <T>Create product update</T>
                  </button>
                )}
                {activeTab === "festival" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCampaignKey(null);
                    setCampaignDraft((current) => ({
                      ...current,
                      kind: "FESTIVAL",
                    }));
                    setCampaignFormMode("create");
                    setEmailImageFile(null);
                    setEmailImageMode("DEFAULT");
                    setShowCampaignForm((value) => !value);
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-amber-700"
                >
                  <Tag className="h-4 w-4" />
                  <T>Create festival offer</T>
                </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeTab === "festival" && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCampaignKey("customer-winback-2026-09")
                  }
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    selectedCampaignKey === "customer-winback-2026-09"
                      ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30"
                      : "bg-white dark:bg-gray-950"
                  }`}
                >
                  <T>50-day recovery</T>
                </button>
              )}
              {campaigns
                .filter((campaign) =>
                  activeTab === "product"
                    ? campaign.kind === "PRODUCT_UPDATE"
                    : campaign.kind !== "PRODUCT_UPDATE",
                )
                .map((campaign) => (
                  <button
                    key={campaign.key}
                    type="button"
                    onClick={() => setSelectedCampaignKey(campaign.key)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      selectedCampaignKey === campaign.key
                        ? campaign.kind === "PRODUCT_UPDATE"
                          ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30"
                          : "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/30"
                        : "bg-white dark:bg-gray-950"
                    }`}
                  >
                    {campaign.name}
                    {campaign.kind === "PRODUCT_UPDATE"
                      ? ` · ${t("update")}`
                      : ""}
                    {!campaign.isActive ? ` · ${t("inactive")}` : ""}
                  </button>
                ))}
            </div>
            {activeTab === "product" &&
              !campaignsLoading &&
              !campaigns.some(
                (campaign) => campaign.kind === "PRODUCT_UPDATE",
              ) && (
                <p className="mt-3 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  <T>
                    No product updates yet. Create the first announcement, then
                    design its email with images, GIFs, and demo links.
                  </T>
                </p>
              )}
            {activeTab === "product" &&
              selectedCampaign?.kind === "PRODUCT_UPDATE" &&
              (selectedCampaign.emailDesign?.blocks.length || 0) > 0 && (
                <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <T>
                    Advanced design active — emails render from your block
                    design.
                  </T>
                </p>
              )}

            {showCampaignForm && (
              <div className="mt-4 grid gap-3 rounded-xl border bg-gray-50 p-4 dark:bg-gray-950/40 md:grid-cols-2">
                {campaignFormMode === "email" ? (
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    <T>
                      Editing email content only. Use Edit selected campaign to
                      change dates or offer values.
                    </T>
                  </p>
                ) : (
                  <>
                    <label className="text-xs font-medium">
                      <T>Campaign name</T>
                      <input
                        value={campaignDraft.name}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 dark:bg-gray-950"
                        placeholder={t("Dashain 2026")}
                      />
                    </label>
                    <label className="text-xs font-medium">
                      <T>Campaign key</T>
                      <input
                        value={campaignDraft.key}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            key: event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_-]/g, "-"),
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 dark:bg-gray-950"
                        placeholder="festival-dashain-2026"
                      />
                    </label>
                    <label className="text-xs font-medium">
                      {campaignDraft.kind === "PRODUCT_UPDATE" ? (
                        <T>Announcement starts</T>
                      ) : (
                        <T>Sale starts</T>
                      )}
                      <input
                        type="datetime-local"
                        value={campaignDraft.startsAt}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            startsAt: event.target.value,
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 dark:bg-gray-950"
                      />
                    </label>
                    <label className="text-xs font-medium">
                      {campaignDraft.kind === "PRODUCT_UPDATE" ? (
                        <T>Announcement ends</T>
                      ) : (
                        <T>Sale ends</T>
                      )}
                      <input
                        type="datetime-local"
                        value={campaignDraft.endsAt}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            endsAt: event.target.value,
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 dark:bg-gray-950"
                      />
                    </label>
                    {campaignDraft.kind !== "PRODUCT_UPDATE" && (
                      <>
                    <label className="text-xs font-medium">
                      <T>Complimentary Pro days</T>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={campaignDraft.complimentaryDays}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            complimentaryDays: Number(event.target.value),
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 dark:bg-gray-950"
                      />
                    </label>
                    <label className="text-xs font-medium">
                      <T>Plan discount percent</T>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={campaignDraft.discountPercent}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            discountPercent: Number(event.target.value),
                          }))
                        }
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 dark:bg-gray-950"
                      />
                    </label>
                      </>
                    )}
                  </>
                )}
                <label className="text-xs font-medium md:col-span-2">
                  <T>Email subject</T>
                  <input
                    value={campaignDraft.emailSubject}
                    onChange={(event) =>
                      setCampaignDraft((current) => ({
                        ...current,
                        emailSubject: event.target.value,
                      }))
                    }
                    disabled={emailEditLocked}
                    required
                    minLength={3}
                    maxLength={180}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                    placeholder={t("Celebrate with 14 days Pro and 10% off")}
                  />
                </label>
                <label className="text-xs font-medium md:col-span-2">
                  <T>Email heading</T>
                  <input
                    value={campaignDraft.emailHeading}
                    onChange={(event) =>
                      setCampaignDraft((current) => ({
                        ...current,
                        emailHeading: event.target.value,
                      }))
                    }
                    disabled={emailEditLocked}
                    required
                    minLength={3}
                    maxLength={180}
                    className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                    placeholder={t(
                      "A festival offer for your jewellery business",
                    )}
                  />
                </label>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium">
                    <T>Email message</T>
                    <textarea
                      value={campaignDraft.emailBody}
                      onChange={(event) =>
                        setCampaignDraft((current) => ({
                          ...current,
                          emailBody: event.target.value,
                        }))
                      }
                      disabled={emailEditLocked}
                      required
                      minLength={10}
                      maxLength={4000}
                      rows={6}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 disabled:opacity-60 dark:bg-gray-950"
                    />
                  </label>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    <T>
                      Blank lines start a new paragraph; line breaks are kept.
                    </T>
                  </span>
                </div>
                {campaignDraft.kind === "PRODUCT_UPDATE" && (
                  <>
                    <label className="text-xs font-medium">
                      <T>Demo URL</T>
                      <input
                        value={campaignDraft.ctaUrl}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            ctaUrl: event.target.value,
                          }))
                        }
                        disabled={emailEditLocked}
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                        placeholder="https://www.orivraa.com/jewellery-shop-software#ai-photo-studio"
                      />
                    </label>
                    <label className="text-xs font-medium">
                      <T>Demo button label</T>
                      <input
                        value={campaignDraft.ctaLabel}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            ctaLabel: event.target.value,
                          }))
                        }
                        disabled={emailEditLocked}
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                        placeholder={t("See it in action")}
                      />
                    </label>
                  </>
                )}
                {campaignFormMode === "email" ? (
                  <div className="space-y-3 md:col-span-2">
                    <div>
                      <p className="text-xs font-medium">
                        <T>Email header image</T>
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        <T>
                          Use an image link or upload a PNG, JPEG, or animated
                          GIF up to 5 MB. Uploads are embedded inside the email
                          and deleted from Railway after 30 days. For product
                          updates, a looping GIF works in most inboxes; Outlook
                          may show the first frame.
                        </T>
                      </p>
                    </div>
                    <label className="block text-xs font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" />
                        <T>Image link</T>
                      </span>
                      <input
                        type="url"
                        value={campaignDraft.imageUrl}
                        onChange={(event) => {
                          const imageUrl = event.target.value;
                          setCampaignDraft((current) => ({
                            ...current,
                            imageUrl,
                          }));
                          setEmailImageFile(null);
                          setEmailImageMode(
                            imageUrl.trim()
                              ? "URL"
                              : editingCampaign?.emailImage
                                ? "KEEP"
                                : "DEFAULT",
                          );
                        }}
                        disabled={emailEditLocked}
                        maxLength={500}
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                        placeholder={t(
                          "https://www.orivraa.com/luxury-gold-globe.png",
                        )}
                      />
                    </label>
                    <div className="rounded-lg border border-dashed bg-white p-3 dark:bg-gray-950">
                      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 dark:hover:bg-gray-900">
                        <ImageUp className="h-4 w-4" />
                        <T>Choose image to upload</T>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.gif,image/png,image/jpeg,image/gif"
                          aria-label={t("Upload email header image")}
                          disabled={emailEditLocked}
                          className="sr-only"
                          onChange={(event) => {
                            selectEmailImage(event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {emailImageMode === "UPLOAD" && emailImageFile ? (
                          <p className="break-all">
                            <span className="font-semibold text-foreground">
                              {emailImageFile.name}
                            </span>{" "}
                            · <FormattedFileSize bytes={emailImageFile.size} />{" "}
                            · <T>ready to upload</T>
                          </p>
                        ) : emailImageMode === "KEEP" &&
                          editingCampaign?.emailImage ? (
                          <p className="break-all">
                            <span className="font-semibold text-foreground">
                              {editingCampaign.emailImage.fileName}
                            </span>{" "}
                            ·{" "}
                            <FormattedFileSize
                              bytes={editingCampaign.emailImage.byteSize}
                            />{" "}
                            · <T>deletes</T>{" "}
                            {formatDateTime(
                              editingCampaign.emailImage.expiresAt,
                            )}
                          </p>
                        ) : emailImageMode === "URL" ? (
                          <p>
                            <T>The email will load the image from the link.</T>
                          </p>
                        ) : (
                          <p>
                            <T>The default Orivraa artwork will be used.</T>
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {editingCampaign?.emailImage &&
                          emailImageMode !== "KEEP" && (
                            <button
                              type="button"
                              onClick={() => {
                                setEmailImageFile(null);
                                setCampaignDraft((current) => ({
                                  ...current,
                                  imageUrl: "",
                                }));
                                setEmailImageMode("KEEP");
                              }}
                              disabled={emailEditLocked}
                              className="min-h-9 rounded-md border px-3 text-xs font-semibold disabled:opacity-50"
                            >
                              <T>Keep current upload</T>
                            </button>
                          )}
                        {emailImageMode !== "DEFAULT" && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmailImageFile(null);
                              setCampaignDraft((current) => ({
                                ...current,
                                imageUrl: "",
                              }));
                              setEmailImageMode("DEFAULT");
                            }}
                            disabled={emailEditLocked}
                            className="min-h-9 rounded-md border px-3 text-xs font-semibold disabled:opacity-50"
                          >
                            <T>Use default artwork</T>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium">
                      <T>Email image URL</T>
                      <input
                        type="url"
                        value={campaignDraft.imageUrl}
                        onChange={(event) =>
                          setCampaignDraft((current) => ({
                            ...current,
                            imageUrl: event.target.value,
                          }))
                        }
                        disabled={emailEditLocked}
                        maxLength={500}
                        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                        placeholder={t(
                          "https://www.orivraa.com/luxury-gold-globe.png",
                        )}
                      />
                    </label>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      <T>
                        Leave empty to use the default Orivraa artwork. For
                        product updates, a looping GIF works in most inboxes;
                        Outlook may show the first frame. Open “Edit email
                        content” after saving to upload an inline image.
                      </T>
                    </span>
                  </div>
                )}
                {emailEditLocked && (
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 md:col-span-2">
                    <T>
                      Email content is locked: an offer email for this campaign
                      is scheduled within 5 minutes.
                    </T>
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
                  {campaignFormMode === "email" && (
                    <button
                      type="button"
                      onClick={() => void previewCampaignEmail()}
                      disabled={previewingEmail || savingCampaign}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-white px-4 font-semibold hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      {previewingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <T>Preview email</T>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveFestivalCampaign()}
                    disabled={
                      savingCampaign ||
                      (campaignFormMode === "email" && emailEditLocked)
                    }
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                  >
                    {savingCampaign ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {campaignFormMode === "email" ? (
                      <T>Update email content</T>
                    ) : editingCampaignKey ? (
                      campaignDraft.kind === "PRODUCT_UPDATE" ? (
                        <T>Update product update</T>
                      ) : (
                        <T>Update festival campaign</T>
                      )
                    ) : campaignDraft.kind === "PRODUCT_UPDATE" ? (
                      <T>Save product update</T>
                    ) : (
                      <T>Save festival campaign</T>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {activeTab !== "performance" && (
          <>
          {(preview?.nearbyScheduled || 0) > 0 && (
            <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950 dark:bg-orange-950/20 dark:text-orange-100">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {preview?.nearbyScheduled}{" "}
              <T>
                other campaign email(s) are already scheduled in the next 48
                hours. Avoid emailing the same inbox twice in one day.
              </T>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Shopkeeper accounts",
                value: preview?.totalAccounts || 0,
                icon: Users,
                color: "text-slate-600 bg-slate-100 dark:bg-slate-900",
              },
              {
                label: "Eligible",
                value: preview?.eligible.length || 0,
                icon: CheckCircle2,
                color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50",
              },
              {
                label: "Selected",
                value: selectedIds.size,
                icon: Mail,
                color: "text-blue-700 bg-blue-100 dark:bg-blue-950/50",
              },
              {
                label: "Protected / excluded",
                value: preview?.excluded.length || 0,
                icon: ShieldCheck,
                color: "text-amber-700 bg-amber-100 dark:bg-amber-950/50",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      <T>{item.label}</T>
                    </p>
                    <p className="mt-1 text-2xl font-bold">{item.value}</p>
                    {item.label === "Eligible" && preview && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {audienceBreakdown.pending} <T>pending</T>
                        {" · "}
                        {audienceBreakdown.noShop} <T>no shop</T>
                        {" · "}
                        {audienceBreakdown.queued} <T>scheduled</T>
                        {" · "}
                        {audienceBreakdown.sent} <T>sent</T>
                        {" · "}
                        {audienceBreakdown.opened} <T>opened</T>
                        {" · "}
                        {audienceBreakdown.claimed} <T>activated</T>
                        {" · "}
                        {audienceBreakdown.unsubscribed} <T>unsubscribed</T>
                        {" · "}
                        {audienceBreakdown.paid} <T>already on Pro</T>
                        {" · "}
                        {audienceBreakdown.unverified} <T>unverified</T>
                      </p>
                    )}
                  </div>
                  <span className={`rounded-lg p-2 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 dark:border-amber-900/60 dark:from-amber-950/30 dark:to-gray-950">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold">
                    {preview?.campaign.kind === "PRODUCT_UPDATE" ? (
                      <T>Feature announcement · no complimentary Pro</T>
                    ) : preview?.campaign.kind === "FESTIVAL" ? (
                      <>
                        {preview.days} <T>days Pro</T> ·{" "}
                        {preview.campaign.discountPercent}%{" "}
                        <T>off paid plans</T>
                      </>
                    ) : (
                      <T>50 days of Pro · no card · no automatic renewal</T>
                    )}
                  </p>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    <T>
                      Already emailed, opened, activated, and unsubscribed
                      accounts stay in this list so you can see tracking. They
                      cannot be emailed again. Select only people who have not
                      been sent this campaign.
                    </T>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyTemplate()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-200"
              >
                <Copy className="h-4 w-4" />
                <T>Copy plain-text version</T>
              </button>
            </div>
          </div>

          </>
          )}

          {activeTab === "performance" && (
            <CampaignAnalytics
              metrics={metrics}
              overallMetrics={overallMetrics}
              view={analyticsView}
              onViewChange={setAnalyticsView}
              onSelectCampaign={setSelectedCampaignKey}
            />
          )}

          {activeTab !== "performance" && (

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section
                className="rounded-xl border bg-white shadow-sm dark:bg-gray-900/60"
                data-tour="offers-audience"
              >
                <div className="border-b p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[220px] flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("Search shop, owner, or email")}
                        className="min-h-11 w-full rounded-lg border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <select
                      aria-label={t("Audience country")}
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className="min-h-11 rounded-lg border bg-white px-3 text-sm dark:bg-gray-950"
                    >
                      <option value="all">{t("All countries")}</option>
                      {countries.map((code) => (
                        <option key={code} value={code}>
                          {COUNTRY_LABELS[code] || code}
                        </option>
                      ))}
                    </select>
                    <select
                      value={segment}
                      onChange={(event) => setSegment(event.target.value)}
                      className="min-h-11 rounded-lg border bg-white px-3 text-sm dark:bg-gray-950"
                    >
                      <option value="all">{t("All activity levels")}</option>
                      <option value="lapsed">{t("Lapsed 60+ days")}</option>
                      <option value="dormant">{t("Dormant 14–59 days")}</option>
                      <option value="recent">{t("Recently active")}</option>
                    </select>
                    <select
                      value={accountKind}
                      onChange={(event) => setAccountKind(event.target.value)}
                      className="min-h-11 rounded-lg border bg-white px-3 text-sm dark:bg-gray-950"
                    >
                      <option value="all">{t("All account types")}</option>
                      <option value="complimentary">
                        {t("Complimentary Pro")}
                      </option>
                      <option value="paid">{t("Already on Pro")}</option>
                      <option value="unverified">
                        {t("Email not verified")}
                      </option>
                      <option value="pending">
                        {t("Pending verification")}
                      </option>
                      <option value="no-shop">{t("No shop yet")}</option>
                    </select>
                    <select
                      value={deliveryStatus}
                      onChange={(event) =>
                        setDeliveryStatus(event.target.value)
                      }
                      className="min-h-11 rounded-lg border bg-white px-3 text-sm dark:bg-gray-950"
                    >
                      <option value="all">{t("All send statuses")}</option>
                      <option value="not-sent">{t("Not sent")}</option>
                      <option value="scheduled">{t("Scheduled")}</option>
                      <option value="sent">{t("Sent")}</option>
                      <option value="opened">{t("Opened")}</option>
                      <option value="activated">{t("Activated")}</option>
                      <option value="unsubscribed">{t("Unsubscribed")}</option>
                    </select>
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={incidentOnly}
                        onChange={(event) =>
                          setIncidentOnly(event.target.checked)
                        }
                        className="h-4 w-4 accent-amber-600"
                      />
                      <T>Invoice reports only</T>
                    </label>
                  </div>
                </div>

                {loading ? (
                  <div className="flex min-h-72 items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <T>Loading eligible accounts</T>
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center text-muted-foreground">
                    <Users className="mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium">
                      <T>No eligible accounts match these filters</T>
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950/60">
                        <tr>
                          <th className="w-12 px-4 py-3">
                            <label className="inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                aria-label={t("Select visible recipients")}
                                checked={allFilteredSelected}
                                disabled={selectableFiltered.length === 0}
                                onChange={toggleAllFiltered}
                                className="h-4 w-4 accent-amber-600"
                              />
                            </label>
                          </th>
                          <th className="px-3 py-3">
                            <T>Account</T>
                          </th>
                          <th className="px-3 py-3">
                            <T>Country</T>
                          </th>
                          <th className="px-3 py-3">
                            <T>Activity</T>
                          </th>
                          <th className="px-3 py-3">
                            <T>Email status</T>
                          </th>
                          <th className="px-3 py-3">
                            <T>Send at</T>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRecipients.map((recipient) => (
                          <tr
                            key={recipient.userId}
                            className={
                              selectedIds.has(recipient.userId)
                                ? "bg-amber-50/60 dark:bg-amber-950/10"
                                : "hover:bg-gray-50 dark:hover:bg-gray-950/40"
                            }
                          >
                            <td className="px-4 py-3 align-top">
                              <input
                                type="checkbox"
                                aria-label={`${t("Select")} ${recipient.shopName}`}
                                checked={selectedIds.has(recipient.userId)}
                                disabled={!recipient.canSend}
                                onChange={() =>
                                  toggleRecipient(
                                    recipient.userId,
                                    recipient.canSend,
                                  )
                                }
                                className="mt-1 h-4 w-4 accent-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-gray-950 dark:text-white">
                                {recipient.shopName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {recipient.firstName} · {recipient.email}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {recipient.incidentAffected && (
                                  <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                                    <T>Invoice report linked</T>
                                  </span>
                                )}
                                {recipient.hasPaidPlan && (
                                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                    <T>Already on Pro</T>
                                  </span>
                                )}
                                {!recipient.emailVerified && (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                                    <T>Email not verified</T>
                                  </span>
                                )}
                                {!recipient.hasShop && (
                                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    <T>No shop yet</T>
                                  </span>
                                )}
                                {recipient.accountStatus ===
                                  "PENDING_VERIFICATION" && (
                                  <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
                                    <T>Pending verification</T>
                                  </span>
                                )}
                                {recipient.offerStatus === "PREPARED" && (
                                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                                    <T>Scheduled</T>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium">
                                {COUNTRY_LABELS[recipient.country] ||
                                  recipient.country}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {recipient.timeZone}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium">
                                {SEGMENT_LABELS[recipient.activitySegment]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatLastActive(recipient.lastActiveAt)}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              {(() => {
                                const status = recipientStatus(recipient);
                                return (
                                  <>
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${recipientStatusClass(status)}`}
                                    >
                                      <T>{recipientStatusLabel(status)}</T>
                                    </span>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      {recipient.sentAt
                                        ? `${t("Sent")} ${formatDateTime(recipient.sentAt)}`
                                        : recipient.cannotSendReason ||
                                          t("Not emailed yet")}
                                    </p>
                                    {recipient.openCount ? (
                                      <p className="text-[11px] text-muted-foreground">
                                        {`${recipient.openCount} ${t("opens")}${
                                          recipient.clickCount
                                            ? ` · ${recipient.clickCount} ${t("clicks")}`
                                            : ""
                                        }`}
                                      </p>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-3">
                              {recipient.canSend ? (
                                <>
                                  <input
                                    type="datetime-local"
                                    aria-label={`${t("Send time for")} ${recipient.email}`}
                                    value={
                                      scheduleByUserId[recipient.userId] ||
                                      toDateTimeLocalValue(
                                        recipient.recommendedSendAt,
                                      )
                                    }
                                    onChange={(event) =>
                                      setScheduleByUserId((current) => ({
                                        ...current,
                                        [recipient.userId]: event.target.value,
                                      }))
                                    }
                                    className="min-h-10 w-full min-w-[190px] rounded-md border bg-white px-2 text-xs dark:bg-gray-950"
                                  />
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {recipient.timeZone || "UTC"} ·{" "}
                                    <T>Edit to override the campaign time</T>
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {recipient.cannotSendReason ||
                                    t("Already contacted for this campaign")}
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    {filteredRecipients.length} <T>visible</T> ·{" "}
                    {selectedIds.size} <T>selected</T>
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!allFilteredSelected) toggleAllFiltered();
                      }}
                      className="font-semibold text-amber-800 hover:text-amber-950 dark:text-amber-200"
                    >
                      <T>Select all sendable</T>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="font-semibold text-gray-700 hover:text-red-600 dark:text-gray-300"
                    >
                      <T>Clear selection</T>
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60">
                <div className="mb-3 flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold">
                    <T>Country delivery plan</T>
                  </h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {countryGroups.map((group) => (
                    <div key={group.code} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">
                          {COUNTRY_LABELS[group.code] || group.code}
                        </p>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {group.selected}/{group.count} <T>selected</T>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <T>Next local 10:00 AM</T> ·{" "}
                        {formatDateTime(group.sendAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {group.timeZone}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {preview && preview.excluded.length > 0 && (
                <details className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/10">
                  <summary className="cursor-pointer font-semibold text-amber-900 dark:text-amber-200">
                    {preview.excluded.length}{" "}
                    <T>protected or excluded account(s)</T>
                  </summary>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm text-amber-900/80 dark:text-amber-200/80">
                    {preview.excluded.map((item, index) => (
                      <li key={`${item.userId || "general"}-${index}`}>
                        {item.email ? `${item.email}: ` : ""}
                        {t(item.reason)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-lg dark:border-amber-900/60 dark:bg-gray-900">
                <div className="bg-[#0d1830] px-5 py-4 text-white">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/favicon/android-chrome-192x192.png"
                      alt="Orivraa"
                      className="h-10 w-10 rounded-lg"
                    />
                    <div>
                      <p className="text-lg font-bold">Orivraa</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                        Jewellery business software
                      </p>
                    </div>
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    preview?.campaign.imageUrl || "/luxury-gold-globe.png"
                  }
                  alt=""
                  className="aspect-[16/7] w-full object-cover"
                />
                <div className="p-5">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    {preview?.campaign.kind === "RECOVERY" ||
                    !preview?.campaign.kind ? (
                      <T>A message from our CEO</T>
                    ) : (
                      preview.campaign.name
                    )}
                  </span>
                  <h2 className="mt-4 font-serif text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                    {preview?.campaign.emailHeading || (
                      <T>We’re sorry about the invoice issue.</T>
                    )}
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {preview?.campaign.emailBody || (
                      <T>
                        We fixed the issue, strengthened monitoring, and
                        improved invoice reliability. We would be grateful for
                        the chance to earn back your trust.
                      </T>
                    )}
                  </p>
                  {preview?.campaign.kind === "PRODUCT_UPDATE" ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/60 dark:bg-amber-950/20">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                        <T>Live demo</T>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <T>
                          Clicking the GIF opens the Framer Motion demo. The
                          catalog button opens Product Catalog for signed-in
                          shops.
                        </T>
                      </p>
                      <div className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white">
                        {preview.campaign.ctaLabel || (
                          <T>See it in action</T>
                        )}
                      </div>
                    </div>
                  ) : (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/60 dark:bg-amber-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                      <T>Welcome-back gift</T>
                    </p>
                    <p className="font-serif text-3xl font-bold">
                      {preview?.days || 50} <T>days free</T>
                    </p>
                    {preview?.campaign.kind === "FESTIVAL" && (
                      <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                        {preview.campaign.discountPercent}%{" "}
                        <T>off all paid plans</T>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <T>No card · No automatic renewal</T>
                    </p>
                    <div className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white">
                      {preview?.campaign.kind === "FESTIVAL" ? (
                        <T>Claim Pro or buy a discounted plan</T>
                      ) : (
                        <T>Return to Orivraa and claim Pro</T>
                      )}
                    </div>
                  </div>
                  )}
                  {(preview?.campaign.kind === "RECOVERY" ||
                    !preview?.campaign.kind) && (
                    <div className="mt-5 border-l-2 border-amber-500 pl-3">
                      <p className="font-serif text-lg font-bold italic">
                        Aakash
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        <T>Founder & CEO, Orivraa</T>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
                  <p className="text-blue-900 dark:text-blue-200">
                    {preview?.campaign.kind === "PRODUCT_UPDATE" ? (
                      <T>
                        Demo and catalog links are the same for every recipient.
                        This email does not grant Pro or apply a discount.
                      </T>
                    ) : (
                      <T>
                        Each link works only for the recipient’s account. Pro is
                        granted only after they sign in and claim it.
                      </T>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <p className="text-amber-900 dark:text-amber-200">
                    <T>
                      Review the selected recipients before sending. Handle
                      “unsubscribe” replies in support and deselect any account
                      that should not receive product email.
                    </T>
                  </p>
                </div>
              </div>

              <div
                className="rounded-xl border bg-white p-4 text-sm shadow-sm dark:bg-gray-900"
                data-tour="offers-schedule"
              >
                <p className="font-semibold">
                  <T>Schedule</T>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <T>
                    Nothing is selected until you check accounts. Use the table
                    checkbox for one email, or the header checkbox for every
                    visible row.
                  </T>
                </p>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      ["NEXT_LOCAL_10AM", "Next local 10:00 AM"],
                      ["CUSTOM", "Custom date and time"],
                      ["IMMEDIATE", "Send immediately"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3"
                    >
                      <input
                        type="radio"
                        name="recovery-delivery-mode"
                        checked={deliveryMode === value}
                        onChange={() => setDeliveryMode(value)}
                        className="accent-amber-600"
                      />
                      <T>{label}</T>
                    </label>
                  ))}
                </div>
                {deliveryMode === "CUSTOM" && (
                  <label className="mt-3 block text-xs font-medium text-muted-foreground">
                    <T>Custom send time</T>
                    <input
                      type="datetime-local"
                      value={customSendAt}
                      onChange={(event) => setCustomSendAt(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-950 dark:bg-gray-950 dark:text-white"
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  void handleSend(
                    deliveryMode === "IMMEDIATE"
                      ? "IMMEDIATE"
                      : deliveryMode === "CUSTOM"
                        ? "CUSTOM"
                        : "NEXT_LOCAL_10AM",
                  )
                }
                disabled={selectedIds.size === 0 || Boolean(sending) || loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : deliveryMode === "IMMEDIATE" ? (
                  <Send className="h-4 w-4" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                {deliveryMode === "IMMEDIATE" ? (
                  <T>Send selected now</T>
                ) : deliveryMode === "CUSTOM" ? (
                  <T>Schedule selected at custom time</T>
                ) : (
                  <T>Schedule selected at local 10 AM</T>
                )}
              </button>
              <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {selectedIds.size} <T>account(s) selected</T>
              </p>
            </aside>
          </div>
          )}
        </div>
      </DashboardLayout>
      {selectedCampaign && selectedCampaign.kind === "PRODUCT_UPDATE" && (
        <EmailBlockEditor
          campaign={selectedCampaign}
          open={designerOpen}
          locked={emailEditLocked}
          onClose={() => {
            setDesignerOpen(false);
            void loadCampaigns();
          }}
          onSaved={(updated) => {
            setCampaigns((current) =>
              current.map((campaign) =>
                campaign.key === updated.key ? { ...campaign, ...updated } : campaign,
              ),
            );
            setSelectedCampaignKey(updated.key);
            if (!updated.emailDesign) setDesignerOpen(false);
          }}
        />
      )}
      <Dialog
        open={Boolean(emailPreview)}
        onOpenChange={(open) => {
          if (!open) setEmailPreview(null);
        }}
      >
        <DialogContent className="flex h-[92vh] w-[min(960px,96vw)] max-w-none flex-col gap-3 p-4 sm:p-5">
          <DialogHeader className="pr-8">
            <DialogTitle>
              <T>Email preview</T>
            </DialogTitle>
            <DialogDescription className="break-words text-left">
              {emailPreview?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
            <iframe
              title={t("Rendered email preview")}
              sandbox=""
              srcDoc={emailPreview?.html || ""}
              className="h-full min-h-[520px] w-full bg-white"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <T>
              This uses the production email template with your unsaved changes.
              Links are disabled in preview.
            </T>
          </p>
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}
