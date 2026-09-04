"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useToast } from "@/hooks/use-toast";
import {
  recoveryOffersApi,
  type FestivalCalendarEvent,
  type FestivalCalendarResult,
  type FestivalReligion,
  type OfferCampaign,
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

const COUNTRY_LABELS: Record<string, string> = {
  NP: "Nepal",
  IN: "India",
  AE: "United Arab Emirates",
  UK: "United Kingdom",
  EU: "European Union",
  US: "United States",
  LK: "Sri Lanka",
};

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
    "not-sent":
      "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
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
  const [campaignDraft, setCampaignDraft] = useState({
    key: "",
    name: "",
    complimentaryDays: 14,
    discountPercent: 10,
    startsAt: "",
    endsAt: "",
    emailSubject: "",
    emailHeading: "",
    emailBody: "",
    imageUrl: "",
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
  // Email copy and artwork lock 5 minutes before the campaign's earliest
  // scheduled send so queued emails render the same content they were
  // previewed with.
  const emailLockAt = selectedCampaign?.nextScheduledFor
    ? new Date(selectedCampaign.nextScheduledFor).getTime() -
      5 * 60 * 1000
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

  const saveFestivalCampaign = async () => {
    const startsAt = toIsoFromLocal(campaignDraft.startsAt);
    const endsAt = toIsoFromLocal(campaignDraft.endsAt);
    if (campaignFormMode !== "email") {
      if (!startsAt || !endsAt) {
        toast({
          title: t("Choose the festival sale window"),
          variant: "destructive",
        });
        return;
      }
      if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        toast({
          title: t("The sale must end after it starts"),
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
      };
      let response: { data: { key: string } };
      if (campaignFormMode === "email" && editingCampaignKey) {
        response = await recoveryOffersApi.updateCampaign(
          editingCampaignKey,
          emailContent,
        );
      } else if (editingCampaignKey) {
        // Email content is omitted from the payload while locked; the API
        // only guards the fields that are actually sent.
        response = await recoveryOffersApi.updateCampaign(editingCampaignKey, {
          name: campaignDraft.name,
          kind: "FESTIVAL",
          complimentaryDays: campaignDraft.complimentaryDays,
          discountPercent: campaignDraft.discountPercent,
          startsAt: startsAt as string,
          endsAt: endsAt as string,
          ...(emailEditLocked ? {} : emailContent),
        });
      } else {
        response = await recoveryOffersApi.createCampaign({
          name: campaignDraft.name,
          kind: "FESTIVAL",
          complimentaryDays: campaignDraft.complimentaryDays,
          discountPercent: campaignDraft.discountPercent,
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
            ? t("Festival email updated")
            : editingCampaignKey
              ? t("Festival campaign updated")
              : t("Festival campaign created"),
      });
    } catch (error: unknown) {
      console.error("Failed to create festival campaign:", error);
      toast({
        title:
          campaignFormMode === "email"
            ? t("Festival email was not updated")
            : t("Festival campaign was not created"),
        description: t(
          apiErrorMessage(
            error,
            "Check the campaign key and sale dates, then try again.",
          ),
        ),
        variant: "destructive",
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  const editSelectedCampaign = () => {
    const campaign = campaigns.find(
      (item) => item.key === selectedCampaignKey,
    );
    if (!campaign?.startsAt || !campaign.endsAt) return;
    setCampaignDraft({
      key: campaign.key,
      name: campaign.name,
      complimentaryDays: campaign.complimentaryDays,
      discountPercent: campaign.discountPercent,
      startsAt: toDateTimeLocalValue(campaign.startsAt),
      endsAt: toDateTimeLocalValue(campaign.endsAt),
      emailSubject: campaign.emailSubject,
      emailHeading: campaign.emailHeading,
      emailBody: campaign.emailBody,
      imageUrl: campaign.imageUrl || "",
    });
    setEditingCampaignKey(campaign.key);
    setCampaignFormMode("edit");
    setShowCampaignForm(true);
  };

  const editSelectedCampaignEmail = () => {
    const campaign = campaigns.find(
      (item) => item.key === selectedCampaignKey,
    );
    if (!campaign) return;
    setCampaignDraft({
      key: campaign.key,
      name: campaign.name,
      complimentaryDays: campaign.complimentaryDays,
      discountPercent: campaign.discountPercent,
      startsAt: toDateTimeLocalValue(campaign.startsAt),
      endsAt: toDateTimeLocalValue(campaign.endsAt),
      emailSubject: campaign.emailSubject,
      emailHeading: campaign.emailHeading,
      emailBody: campaign.emailBody,
      imageUrl: campaign.imageUrl || "",
    });
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
        complimentaryDays: existingCampaign.complimentaryDays,
        discountPercent: existingCampaign.discountPercent,
        startsAt: toDateTimeLocalValue(existingCampaign.startsAt),
        endsAt: toDateTimeLocalValue(existingCampaign.endsAt),
        emailSubject: existingCampaign.emailSubject,
        emailHeading: existingCampaign.emailHeading,
        emailBody: existingCampaign.emailBody,
        imageUrl: existingCampaign.imageUrl || "",
      });
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
      complimentaryDays,
      discountPercent,
      startsAt: toLocalDateTimeInput(saleStart, 0, 0),
      endsAt: toLocalDateTimeInput(festivalDate, 23, 59),
      emailSubject: `Celebrate ${event.name}: ${complimentaryDays} days Pro free, then ${discountPercent}% off`,
      emailHeading: `A ${event.name} offer for your jewellery business`,
      emailBody: `Celebrate ${event.name} with Orivraa. Claim ${complimentaryDays} complimentary days of Pro — no card, no automatic renewal.\n\nOnce the complimentary days end, the Pro plan you buy starts with ${discountPercent}% off your first payment. Claim your free days now, then upgrade with the festival discount.`,
      imageUrl: "",
    });
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
      if (accountKind === "pending" && recipient.accountStatus !== "PENDING_VERIFICATION") {
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
        if (deliveryStatus === "sent" && !["sent", "opened", "activated", "claiming"].includes(status)) {
          return false;
        }
        if (deliveryStatus === "opened" && status !== "opened" && status !== "activated") {
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

  const analyticsMetrics =
    analyticsView === "overall" ? overallMetrics : metrics;

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
                    Recovery and festival emails use separate copy, claim rules,
                    and campaign metrics.
                  </T>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCampaign && (
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
                    <T>Edit selected festival</T>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingCampaignKey(null);
                    setCampaignFormMode("create");
                    setShowCampaignForm((value) => !value);
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-amber-700"
                >
                  <Tag className="h-4 w-4" />
                  <T>Create festival offer</T>
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
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
              {campaigns.map((campaign) => (
                <button
                  key={campaign.key}
                  type="button"
                  onClick={() => setSelectedCampaignKey(campaign.key)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    selectedCampaignKey === campaign.key
                      ? "border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/30"
                      : "bg-white dark:bg-gray-950"
                  }`}
                >
                  {campaign.name}
                  {!campaign.isActive ? ` · ${t("inactive")}` : ""}
                </button>
              ))}
            </div>

            {showCampaignForm && (
              <div className="mt-4 grid gap-3 rounded-xl border bg-gray-50 p-4 dark:bg-gray-950/40 md:grid-cols-2">
                {campaignFormMode === "email" ? (
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    <T>
                      Editing email content only. Use “Edit selected festival”
                      to change the sale window or offer values.
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
                      <T>Sale starts</T>
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
                      <T>Sale ends</T>
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
                    className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                    placeholder={t("A festival offer for your jewellery business")}
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
                      rows={6}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 disabled:opacity-60 dark:bg-gray-950"
                    />
                  </label>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    <T>Blank lines start a new paragraph; line breaks are kept.</T>
                  </span>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium">
                    <T>Email image URL</T>
                    <input
                      value={campaignDraft.imageUrl}
                      onChange={(event) =>
                        setCampaignDraft((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                      disabled={emailEditLocked}
                      className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
                      placeholder={t("https://www.orivraa.com/luxury-gold-globe.png")}
                    />
                  </label>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    <T>
                      Leave empty to use the default Orivraa artwork. Locked 5
                      minutes before a scheduled send.
                    </T>
                  </span>
                </div>
                {emailEditLocked && (
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 md:col-span-2">
                    <T>
                      Email content is locked: an offer email for this campaign
                      is scheduled within 5 minutes.
                    </T>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void saveFestivalCampaign()}
                  disabled={savingCampaign || (campaignFormMode === "email" && emailEditLocked)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-4 font-semibold text-white disabled:opacity-50 md:col-span-2"
                >
                  {savingCampaign ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {campaignFormMode === "email" ? (
                    <T>Update email content</T>
                  ) : editingCampaignKey ? (
                    <T>Update festival campaign</T>
                  ) : (
                    <T>Save festival campaign</T>
                  )}
                </button>
              </div>
            )}
          </section>

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
                    {preview?.campaign.kind === "FESTIVAL" ? (
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

          {analyticsMetrics && (
            <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60">
              <div className="mb-4 inline-flex rounded-lg border bg-gray-50 p-1 dark:bg-gray-950/50">
                <button
                  type="button"
                  onClick={() => setAnalyticsView("overall")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    analyticsView === "overall"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-300"
                      : "text-muted-foreground"
                  }`}
                >
                  <T>Overall stats</T>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsView("offer")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    analyticsView === "offer"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-300"
                      : "text-muted-foreground"
                  }`}
                >
                  <T>Offer-wise stats</T>
                </button>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      {analyticsView === "overall" ? (
                        <T>All offers performance</T>
                      ) : (
                        <T>Offer campaign funnel</T>
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {analyticsView === "overall" ? (
                        <T>Combined results across every offer</T>
                      ) : (
                        <>
                          <T>Campaign</T>: {analyticsMetrics.campaignKey}
                        </>
                      )}{" "}
                      · <T>Updated</T>{" "}
                      {formatDateTime(analyticsMetrics.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {(!analyticsMetrics.webhookConfigured ||
                    !analyticsMetrics.resendApiConfigured) && (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      <T>Resend tracking setup required</T>
                    </span>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {analyticsMetrics.totals.scheduled} <T>scheduled</T> ·{" "}
                    {analyticsMetrics.totals.bounced} <T>bounced</T> ·{" "}
                    {analyticsMetrics.totals.failed} <T>failed</T> ·{" "}
                    {analyticsMetrics.totals.unsubscribed} <T>unsubscribed</T> ·{" "}
                    {analyticsMetrics.totals.complained} <T>spam complaints</T>
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  {
                    label: "Sent",
                    value: analyticsMetrics.totals.sent,
                    detail:
                      analyticsMetrics.totals.targeted + " " + t("targeted"),
                    icon: MailCheck,
                    color: "bg-slate-100 text-slate-700 dark:bg-slate-950",
                  },
                  {
                    label: "Delivered",
                    value: analyticsMetrics.totals.delivered,
                    detail:
                      analyticsMetrics.rates.delivery + "% " + t("of sent"),
                    icon: CheckCircle2,
                    color:
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50",
                  },
                  {
                    label: "Opened (approx.)",
                    value: analyticsMetrics.totals.opened,
                    detail:
                      analyticsMetrics.rates.open +
                      "% " +
                      t("of delivered") +
                      " · " +
                      analyticsMetrics.totals.totalOpens +
                      " " +
                      t("total opens"),
                    icon: Eye,
                    color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50",
                  },
                  {
                    label: "Clicked",
                    value: analyticsMetrics.totals.clicked,
                    detail:
                      analyticsMetrics.rates.click +
                      "% " +
                      t("of delivered") +
                      " · " +
                      analyticsMetrics.totals.totalClicks +
                      " " +
                      t("total clicks"),
                    icon: MousePointerClick,
                    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50",
                  },
                  {
                    label: "Claimed Pro",
                    value: analyticsMetrics.totals.claimed,
                    detail:
                      analyticsMetrics.rates.claim + "% " + t("of delivered"),
                    icon: Gift,
                    color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50",
                  },
                  {
                    label: "Rejoined",
                    value: analyticsMetrics.totals.rejoined,
                    detail: analyticsMetrics.rates.rejoin + "% " + t("of sent"),
                    icon: LogIn,
                    color:
                      "bg-violet-100 text-violet-700 dark:bg-violet-950/50",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border bg-gray-50/50 p-3 dark:bg-gray-950/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        <T>{item.label}</T>
                      </p>
                      <span className={"rounded-md p-1.5 " + item.color}>
                        <item.icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              {analyticsView === "overall" && (
                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <div className="border-b bg-gray-50 px-3 py-2 dark:bg-gray-950/50">
                    <h3 className="text-sm font-semibold">
                      <T>Offer-wise performance</T>
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <T>Select an offer to open its detailed funnel.</T>
                    </p>
                  </div>
                  <table className="w-full min-w-[860px] text-left text-xs">
                    <thead className="bg-gray-50 text-muted-foreground dark:bg-gray-950/50">
                      <tr>
                        {[
                          "Offer",
                          "Sent",
                          "Delivered",
                          "Opened",
                          "Clicked",
                          "Claimed",
                          "Rejoined",
                          "",
                        ].map((heading, index) => (
                          <th
                            key={`${heading}-${index}`}
                            className="px-3 py-2 font-semibold"
                          >
                            <T>{heading}</T>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(analyticsMetrics.byCampaign || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            <T>
                              Offer statistics will appear after campaigns are
                              created.
                            </T>
                          </td>
                        </tr>
                      ) : (
                        analyticsMetrics.byCampaign.map((row) => (
                          <tr key={row.campaignKey}>
                            <td className="px-3 py-2">
                              <p className="font-semibold">{row.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {row.campaignKey}
                              </p>
                            </td>
                            <td className="px-3 py-2">{row.totals.sent}</td>
                            <td className="px-3 py-2">
                              {row.totals.delivered}
                            </td>
                            <td className="px-3 py-2">
                              {row.totals.opened} ({row.rates.open}%)
                            </td>
                            <td className="px-3 py-2">
                              {row.totals.clicked} ({row.rates.click}%)
                            </td>
                            <td className="px-3 py-2">
                              {row.totals.claimed} ({row.rates.claim}%)
                            </td>
                            <td className="px-3 py-2">{row.totals.rejoined}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCampaignKey(row.campaignKey);
                                  setAnalyticsView("offer");
                                }}
                                className="rounded-md border px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                              >
                                <T>View details</T>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-gray-50 text-muted-foreground dark:bg-gray-950/50">
                      <tr>
                        {[
                          "Country",
                          "Sent",
                          "Delivered",
                          "Opened",
                          "Clicked",
                          "Claimed",
                          "Rejoined",
                        ].map((heading) => (
                          <th key={heading} className="px-3 py-2 font-semibold">
                            <T>{heading}</T>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analyticsMetrics.byCountry.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            <T>
                              Metrics will appear after the campaign is sent.
                            </T>
                          </td>
                        </tr>
                      ) : (
                        analyticsMetrics.byCountry.map((row) => (
                          <tr key={row.country}>
                            <td className="px-3 py-2 font-semibold">
                              {COUNTRY_LABELS[row.country] || row.country}
                            </td>
                            <td className="px-3 py-2">{row.sent}</td>
                            <td className="px-3 py-2">{row.delivered}</td>
                            <td className="px-3 py-2">{row.opened}</td>
                            <td className="px-3 py-2">{row.clicked}</td>
                            <td className="px-3 py-2">{row.claimed}</td>
                            <td className="px-3 py-2 font-semibold text-violet-700 dark:text-violet-300">
                              {row.rejoined}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
                  <p className="font-semibold">
                    <T>How these metrics are counted</T>
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4">
                    <li>
                      <T>
                        Opened is approximate because privacy tools and blocked
                        images can affect tracking pixels.
                      </T>
                    </li>
                    <li>
                      <T>
                        Clicked is a unique recipient who used an email link.
                      </T>
                    </li>
                    <li>
                      <T>
                        Rejoined means authenticated Orivraa activity or a Pro
                        claim after the recovery email was sent.
                      </T>
                    </li>
                  </ul>
                  <p className="mt-3 border-t border-blue-200 pt-2 dark:border-blue-900/60">
                    <T>
                      Enable Resend domain open and click tracking, then send
                      email events to
                    </T>{" "}
                    <code>/api/recovery-offers/webhooks/resend</code>.
                  </p>
                </div>
              </div>
            </section>
          )}

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
                      <option value="unverified">{t("Email not verified")}</option>
                      <option value="pending">{t("Pending verification")}</option>
                      <option value="no-shop">{t("No shop yet")}</option>
                    </select>
                    <select
                      value={deliveryStatus}
                      onChange={(event) => setDeliveryStatus(event.target.value)}
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
                  src="/luxury-gold-globe.png"
                  alt="Golden globe"
                  className="aspect-[16/7] w-full object-cover"
                />
                <div className="p-5">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    {preview?.campaign.kind === "FESTIVAL" ? (
                      preview.campaign.name
                    ) : (
                      <T>A message from our CEO</T>
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
                  {preview?.campaign.kind !== "FESTIVAL" && (
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
                    <T>
                      Each link works only for the recipient’s account. Pro is
                      granted only after they sign in and claim it.
                    </T>
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
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
