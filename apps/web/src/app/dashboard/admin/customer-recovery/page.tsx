"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useToast } from "@/hooks/use-toast";
import {
  recoveryOffersApi,
  type RecoveryAudiencePreview,
  type RecoveryCampaignMetrics,
} from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
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

export default function CustomerRecoveryPage() {
  const { toast } = useToast();
  const t = useT();
  const [preview, setPreview] = useState<RecoveryAudiencePreview | null>(null);
  const [metrics, setMetrics] = useState<RecoveryCampaignMetrics | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<
    "IMMEDIATE" | "NEXT_LOCAL_10AM" | null
  >(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [segment, setSegment] = useState("all");
  const [accountKind, setAccountKind] = useState("all");
  const [incidentOnly, setIncidentOnly] = useState(false);

  const loadAudience = useCallback(async () => {
    setLoading(true);
    try {
      const [previewResponse, metricsResponse] = await Promise.all([
        recoveryOffersApi.previewAudience(),
        recoveryOffersApi.metrics(),
      ]);
      setPreview(previewResponse.data);
      setMetrics(metricsResponse.data);
      setSelectedIds(
        new Set(previewResponse.data.eligible.map((item) => item.userId)),
      );
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
  }, [t, toast]);

  useEffect(() => {
    void loadAudience();
  }, [loadAudience]);

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
      if (accountKind === "paid" && !recipient.hasPaidPlan) return false;
      if (
        accountKind === "complimentary" &&
        (!recipient.emailVerified || recipient.hasPaidPlan)
      ) {
        return false;
      }
      if (incidentOnly && !recipient.incidentAffected) return false;
      return true;
    });
  }, [accountKind, country, incidentOnly, preview?.eligible, search, segment]);

  const audienceBreakdown = useMemo(() => {
    const eligible = preview?.eligible || [];
    return {
      paid: eligible.filter((item) => item.hasPaidPlan).length,
      unverified: eligible.filter((item) => !item.emailVerified).length,
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

  const allFilteredSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every((recipient) => selectedIds.has(recipient.userId));

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const recipient of filteredRecipients) {
        if (allFilteredSelected) next.delete(recipient.userId);
        else next.add(recipient.userId);
      }
      return next;
    });
  };

  const toggleRecipient = (userId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSend = async (
    deliveryTiming: "IMMEDIATE" | "NEXT_LOCAL_10AM",
  ) => {
    if (!preview || selectedIds.size === 0) return;
    const action =
      deliveryTiming === "NEXT_LOCAL_10AM"
        ? "schedule these emails for the next local 10:00 AM"
        : "send these emails now";
    if (
      !window.confirm(
        `You are about to ${action} for ${selectedIds.size} selected account(s), including current Pro shops and unverified emails. Continue?`,
      )
    ) {
      return;
    }

    setSending(deliveryTiming);
    try {
      const response = await recoveryOffersApi.sendAudience({
        userIds: [...selectedIds],
        campaignKey: preview.campaignKey,
        expiresInDays: 30,
        deliveryTiming,
      });
      toast({
        title:
          deliveryTiming === "NEXT_LOCAL_10AM"
            ? t("Recovery emails scheduled")
            : t("Recovery emails queued"),
        description: `${response.data.scheduled || 0} ${t("scheduled")}, ${response.data.queued || 0} ${t("queued")}, ${response.data.failed || 0} ${t("failed")}`,
        variant: response.data.failed > 0 ? "destructive" : "default",
      });
      await loadAudience();
    } catch (error) {
      console.error("Failed to queue recovery campaign:", error);
      toast({
        title: t("Recovery campaign was not queued"),
        description: t("No Pro time was granted automatically."),
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  const copyTemplate = async () => {
    const days = preview?.days || 50;
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
                    <T>Customer Recovery</T>
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <T>
                      Preview, select, and schedule the 50-day Pro win-back
                      campaign.
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
                    <T>50 days of Pro · no card · no automatic renewal</T>
                  </p>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    <T>
                      Current Pro shops and unverified emails can be selected.
                      Claiming starts or extends Pro to 50 days from that day,
                      unless more than 50 days already remain. Repeat campaign
                      sends stay excluded.
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

          {metrics && (
            <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      <T>Recovery campaign funnel</T>
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <T>Campaign</T>: {metrics.campaignKey} ·{" "}
                      <T>Updated</T> {formatDateTime(metrics.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {(!metrics.webhookConfigured ||
                    !metrics.resendApiConfigured) && (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      <T>Resend tracking setup required</T>
                    </span>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {metrics.totals.scheduled} <T>scheduled</T> ·{" "}
                    {metrics.totals.bounced} <T>bounced</T> ·{" "}
                    {metrics.totals.failed} <T>failed</T> ·{" "}
                    {metrics.totals.complained} <T>spam complaints</T>
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  {
                    label: "Sent",
                    value: metrics.totals.sent,
                    detail:
                      metrics.totals.targeted + " " + t("targeted"),
                    icon: MailCheck,
                    color: "bg-slate-100 text-slate-700 dark:bg-slate-950",
                  },
                  {
                    label: "Delivered",
                    value: metrics.totals.delivered,
                    detail: metrics.rates.delivery + "% " + t("of sent"),
                    icon: CheckCircle2,
                    color:
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50",
                  },
                  {
                    label: "Opened (approx.)",
                    value: metrics.totals.opened,
                    detail:
                      metrics.rates.open +
                      "% " +
                      t("of delivered") +
                      " · " +
                      metrics.totals.totalOpens +
                      " " +
                      t("total opens"),
                    icon: Eye,
                    color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50",
                  },
                  {
                    label: "Clicked",
                    value: metrics.totals.clicked,
                    detail:
                      metrics.rates.click +
                      "% " +
                      t("of delivered") +
                      " · " +
                      metrics.totals.totalClicks +
                      " " +
                      t("total clicks"),
                    icon: MousePointerClick,
                    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50",
                  },
                  {
                    label: "Claimed Pro",
                    value: metrics.totals.claimed,
                    detail: metrics.rates.claim + "% " + t("of delivered"),
                    icon: Gift,
                    color:
                      "bg-amber-100 text-amber-700 dark:bg-amber-950/50",
                  },
                  {
                    label: "Rejoined",
                    value: metrics.totals.rejoined,
                    detail: metrics.rates.rejoin + "% " + t("of sent"),
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
                      {metrics.byCountry.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            <T>Metrics will appear after the campaign is sent.</T>
                          </td>
                        </tr>
                      ) : (
                        metrics.byCountry.map((row) => (
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
              <section className="rounded-xl border bg-white shadow-sm dark:bg-gray-900/60">
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
                            <input
                              type="checkbox"
                              aria-label={t("Select visible recipients")}
                              checked={allFilteredSelected}
                              onChange={toggleAllFiltered}
                              className="h-4 w-4 accent-amber-600"
                            />
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
                            <T>Recommended send</T>
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
                                onChange={() =>
                                  toggleRecipient(recipient.userId)
                                }
                                className="mt-1 h-4 w-4 accent-amber-600"
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
                              <p className="font-medium">
                                <T>Local 10:00 AM</T>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(recipient.recommendedSendAt)}
                              </p>
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
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="font-semibold text-gray-700 hover:text-red-600 dark:text-gray-300"
                  >
                    <T>Clear selection</T>
                  </button>
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
                    <T>A message from our CEO</T>
                  </span>
                  <h2 className="mt-4 font-serif text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                    <T>We’re sorry about the invoice issue.</T>
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <T>
                      We fixed the issue, strengthened monitoring, and improved
                      invoice reliability. We would be grateful for the chance
                      to earn back your trust.
                    </T>
                  </p>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/60 dark:bg-amber-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                      <T>Welcome-back gift</T>
                    </p>
                    <p className="font-serif text-3xl font-bold">
                      {preview?.days || 50} <T>days free</T>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <T>No card · No automatic renewal</T>
                    </p>
                    <div className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white">
                      <T>Return to Orivraa and claim Pro</T>
                    </div>
                  </div>
                  <div className="mt-5 border-l-2 border-amber-500 pl-3">
                    <p className="font-serif text-lg font-bold italic">
                      Aakash
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      <T>Founder & CEO, Orivraa</T>
                    </p>
                  </div>
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

              <button
                type="button"
                onClick={() => void handleSend("NEXT_LOCAL_10AM")}
                disabled={selectedIds.size === 0 || Boolean(sending) || loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending === "NEXT_LOCAL_10AM" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                <T>Schedule selected at local 10 AM</T>
              </button>
              <button
                type="button"
                onClick={() => void handleSend("IMMEDIATE")}
                disabled={selectedIds.size === 0 || Boolean(sending) || loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                {sending === "IMMEDIATE" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <T>Send selected now</T>
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
