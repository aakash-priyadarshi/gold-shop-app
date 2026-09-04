import { T } from "@/components/ui/T";
import {
  type RecoveryCampaignMetrics,
} from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Gift,
  LogIn,
  MailCheck,
  MousePointerClick,
} from "lucide-react";
import { COUNTRY_LABELS } from "./constants";

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type Props = {
  metrics: RecoveryCampaignMetrics | null;
  overallMetrics: RecoveryCampaignMetrics | null;
  view: "overall" | "offer";
  onViewChange: (view: "overall" | "offer") => void;
  onSelectCampaign: (campaignKey: string) => void;
};

/** Delivery/engagement funnel shared by every offer campaign kind. */
export function CampaignAnalytics({
  metrics,
  overallMetrics,
  view,
  onViewChange,
  onSelectCampaign,
}: Props) {
  const t = useT();
  const analyticsMetrics = view === "overall" ? overallMetrics : metrics;

  if (!analyticsMetrics) return null;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900/60">
      <div className="mb-4 inline-flex rounded-lg border bg-gray-50 p-1 dark:bg-gray-950/50">
        <button
          type="button"
          onClick={() => onViewChange("overall")}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            view === "overall"
              ? "bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-300"
              : "text-muted-foreground"
          }`}
        >
          <T>Overall stats</T>
        </button>
        <button
          type="button"
          onClick={() => onViewChange("offer")}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            view === "offer"
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
              {view === "overall" ? (
                <T>All offers performance</T>
              ) : (
                <T>Offer campaign funnel</T>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {view === "overall" ? (
                <T>Combined results across every offer</T>
              ) : (
                <>
                  <T>Campaign</T>: {analyticsMetrics.campaignKey}
                </>
              )}{" "}
              · <T>Updated</T> {formatDateTime(analyticsMetrics.updatedAt)}
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
            detail: analyticsMetrics.totals.targeted + " " + t("targeted"),
            icon: MailCheck,
            color: "bg-slate-100 text-slate-700 dark:bg-slate-950",
          },
          {
            label: "Delivered",
            value: analyticsMetrics.totals.delivered,
            detail: analyticsMetrics.rates.delivery + "% " + t("of sent"),
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50",
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
            detail: analyticsMetrics.rates.claim + "% " + t("of delivered"),
            icon: Gift,
            color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50",
          },
          {
            label: "Rejoined",
            value: analyticsMetrics.totals.rejoined,
            detail: analyticsMetrics.rates.rejoin + "% " + t("of sent"),
            icon: LogIn,
            color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50",
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

      {view === "overall" && (
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
                      Offer statistics will appear after campaigns are created.
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
                    <td className="px-3 py-2">{row.totals.delivered}</td>
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
                          onSelectCampaign(row.campaignKey);
                          onViewChange("offer");
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
                    <T>Metrics will appear after the campaign is sent.</T>
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
                Opened is approximate because privacy tools and blocked images
                can affect tracking pixels.
              </T>
            </li>
            <li>
              <T>Clicked is a unique recipient who used an email link.</T>
            </li>
            <li>
              <T>
                Rejoined means authenticated Orivraa activity or a Pro claim
                after the recovery email was sent.
              </T>
            </li>
          </ul>
          <p className="mt-3 border-t border-blue-200 pt-2 dark:border-blue-900/60">
            <T>
              Enable Resend domain open and click tracking, then send email
              events to
            </T>{" "}
            <code>/api/recovery-offers/webhooks/resend</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
