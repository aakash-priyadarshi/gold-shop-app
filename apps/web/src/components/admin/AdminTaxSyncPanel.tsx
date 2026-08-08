"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { adminTaxSyncApi } from "@/lib/api";
import {
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TaxSyncSource {
  region: string;
  label: string;
  url: string;
  taxType: string;
  taxName: string;
  categories: string[];
  parserHint: string;
  automationSupported: boolean;
  unsupportedReason?: string;
  lastRun?: {
    runId: string;
    status: string;
    checkedAt: string | null;
    message: string | null;
  } | null;
}

interface TaxSyncRun {
  id: string;
  status: string;
  triggerSource: string;
  region?: string | null;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  summary?: {
    proposalsCreated?: number;
    skipped?: number;
    failed?: number;
    sourceResults?: Array<{
      region: string;
      status: string;
      proposalsCreated?: number;
      message?: string;
    }>;
  } | null;
}

interface TaxChangeProposal {
  id: string;
  marketRegion: string;
  taxType: string;
  taxName: string;
  category: string;
  currentRate?: number | null;
  proposedRate: number;
  changeDelta?: number | null;
  proposedDescription?: string | null;
  status: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceExcerpt?: string | null;
  confidence?: number | null;
  rationale?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

const REGION_OPTIONS = [
  { value: "ALL", label: "All regions" },
  { value: "NP", label: "Nepal" },
  { value: "IN", label: "India" },
  { value: "LK", label: "Sri Lanka" },
  { value: "AE", label: "UAE" },
  { value: "UK", label: "United Kingdom" },
  { value: "EU", label: "Europe" },
  { value: "US", label: "United States" },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUPERSEDED", label: "Superseded" },
  { value: "ALL", label: "All statuses" },
];

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All components",
  PRECIOUS_METAL: "Precious metal",
  MAKING_CHARGE: "Making charge",
  GEMSTONE: "Gemstone",
  FINISH: "Finish / plating",
};

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) {
    return "Not configured";
  }

  const percent = value * 100;
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(2)}%`;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleString();
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
      return "default";
    case "REJECTED":
    case "FAILED":
      return "destructive";
    case "SUPERSEDED":
    case "SKIPPED":
      return "outline";
    default:
      return "secondary";
  }
}

export function AdminTaxSyncPanel() {
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [sources, setSources] = useState<TaxSyncSource[]>([]);
  const [runs, setRuns] = useState<TaxSyncRun[]>([]);
  const [proposals, setProposals] = useState<TaxChangeProposal[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [runningSync, setRunningSync] = useState(false);
  const [actingOnProposalId, setActingOnProposalId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    try {
      const [sourcesRes, runsRes, proposalsRes] = await Promise.all([
        adminTaxSyncApi.getSources(),
        adminTaxSyncApi.getRuns(8),
        adminTaxSyncApi.getProposals({
          status: selectedStatus === "ALL" ? undefined : selectedStatus,
          region: selectedRegion === "ALL" ? undefined : selectedRegion,
          limit: 30,
        }),
      ]);

      setSources(sourcesRes.data?.sources || []);
      setRuns(runsRes.data?.runs || []);
      setProposals(proposalsRes.data?.proposals || []);
    } catch (err: any) {
      toast({
        title: "Tax sync panel failed to load",
        description:
          err?.response?.data?.message ||
          "Could not load trusted-source tax sync data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedStatus]);

  const handleRunSync = async () => {
    setRunningSync(true);

    try {
      const response = await adminTaxSyncApi.runSync(
        selectedRegion === "ALL" ? {} : { region: selectedRegion },
      );
      const run: TaxSyncRun | undefined = response.data?.run;
      const created = run?.summary?.proposalsCreated || 0;

      toast({
        title: "Trusted-source sync finished",
        description:
          created > 0
            ? `Created ${created} pending proposal${created === 1 ? "" : "s"}.`
            : "No new tax changes were proposed.",
      });

      await loadData();
    } catch (err: any) {
      toast({
        title: "Tax sync failed",
        description:
          err?.response?.data?.message || "Could not complete the tax sync run.",
        variant: "destructive",
      });
    } finally {
      setRunningSync(false);
    }
  };

  const handleProposalAction = async (
    proposalId: string,
    action: "approve" | "reject",
  ) => {
    setActingOnProposalId(proposalId);

    try {
      const note = reviewNotes[proposalId]?.trim();
      if (action === "approve") {
        await adminTaxSyncApi.approveProposal(proposalId, note || undefined);
      } else {
        await adminTaxSyncApi.rejectProposal(proposalId, note || undefined);
      }

      toast({
        title: action === "approve" ? "Proposal approved" : "Proposal rejected",
        description:
          action === "approve"
            ? "The tax rule was updated and the cache was cleared."
            : "The proposal remains in history for audit review.",
      });

      setReviewNotes((prev) => ({ ...prev, [proposalId]: "" }));
      await loadData();
    } catch (err: any) {
      toast({
        title: `Could not ${action} proposal`,
        description:
          err?.response?.data?.message || `The proposal could not be ${action}d.`,
        variant: "destructive",
      });
    } finally {
      setActingOnProposalId(null);
    }
  };

  const pendingCount = proposals.filter((proposal) => proposal.status === "PENDING").length;
  const latestRun = runs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Trusted-source tax proposals</h3>
          <p className="text-sm text-muted-foreground">
            Fetch official tax pages, let Gemini extract explicit rates, and keep
            every change pending until an admin approves it.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={loadData} disabled={loading || runningSync}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleRunSync} disabled={runningSync}>
            {runningSync ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            Run trusted sync
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Pending approvals
          </div>
          <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes are never auto-applied. Every tax update stays pending until approved.
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-amber-600" />
            Latest run
          </div>
          <div className="mt-2 text-lg font-semibold">
            {latestRun ? latestRun.status : "No runs yet"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {latestRun
              ? `${formatTimestamp(latestRun.completedAt || latestRun.startedAt)}${latestRun.region ? ` · ${latestRun.region}` : ""}`
              : "Start with a manual trusted-source sync."}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
            Latest proposals
          </div>
          <div className="mt-2 text-lg font-semibold">
            {latestRun?.summary?.proposalsCreated || 0}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Proposed changes created in the most recent run.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Review queue</h4>
              <p className="text-sm text-muted-foreground">
                Compare current and proposed rates, verify the source excerpt, and decide.
              </p>
            </div>
            <Badge variant="secondary">{proposals.length} loaded</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading proposals...
            </div>
          ) : proposals.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No proposals match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => {
                const note = reviewNotes[proposal.id] || "";
                const isPending = proposal.status === "PENDING";
                const acting = actingOnProposalId === proposal.id;

                return (
                  <div key={proposal.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{proposal.marketRegion}</Badge>
                          <Badge variant={getStatusVariant(proposal.status)}>
                            {proposal.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {CATEGORY_LABELS[proposal.category] || proposal.category}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {proposal.taxName} · {formatPercent(proposal.currentRate)} to{" "}
                          <span className="font-medium text-foreground">
                            {formatPercent(proposal.proposedRate)}
                          </span>
                        </div>

                        <p className="text-sm">
                          {proposal.proposedDescription || proposal.rationale || "No extra rationale provided."}
                        </p>
                      </div>

                      <div className="text-sm text-muted-foreground lg:text-right">
                        <div>Proposed {formatTimestamp(proposal.createdAt)}</div>
                        <div>
                          Confidence {proposal.confidence !== null && proposal.confidence !== undefined
                            ? `${Math.round(proposal.confidence * 100)}%`
                            : "not scored"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
                      <div className="font-medium">Trusted-source evidence</div>
                      <p className="mt-1 text-muted-foreground">
                        {proposal.sourceExcerpt || "No source excerpt was captured for this proposal."}
                      </p>
                      <a
                        href={proposal.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {proposal.sourceLabel}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {proposal.reviewNotes ? (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Review note: {proposal.reviewNotes}
                      </div>
                    ) : null}

                    {isPending ? (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          value={note}
                          onChange={(event) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [proposal.id]: event.target.value,
                            }))
                          }
                          placeholder="Optional review note for audit history"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            onClick={() => handleProposalAction(proposal.id, "approve")}
                            disabled={acting}
                          >
                            {acting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Approve change
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleProposalAction(proposal.id, "reject")}
                            disabled={acting}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Trusted sources</h4>
                <p className="text-sm text-muted-foreground">
                  Sources flagged as manual-only are visible for review but excluded from automatic proposal generation.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {sources.map((source) => (
                <div key={source.region} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{source.region}</span>
                        <Badge variant={source.automationSupported ? "default" : "outline"}>
                          {source.automationSupported ? "Auto-check enabled" : "Manual only"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm">{source.label}</p>
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {source.automationSupported
                      ? source.parserHint
                      : source.unsupportedReason || source.parserHint}
                  </p>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Last check: {formatTimestamp(source.lastRun?.checkedAt)}
                    {source.lastRun?.status ? ` · ${source.lastRun.status}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="font-semibold">Recent sync runs</h4>
            <p className="text-sm text-muted-foreground">
              Manual and scheduled runs are kept for audit and troubleshooting.
            </p>

            <div className="mt-4 space-y-3">
              {runs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sync runs recorded yet.</div>
              ) : (
                runs.map((run) => (
                  <div key={run.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>
                        <span className="text-sm font-medium">{run.triggerSource}</span>
                        {run.region ? <Badge variant="outline">{run.region}</Badge> : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(run.completedAt || run.startedAt)}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      {run.summary?.proposalsCreated || 0} proposals · {run.summary?.failed || 0} failed · {run.summary?.skipped || 0} skipped
                    </div>

                    {run.errorMessage ? (
                      <div className="mt-2 text-sm text-destructive">{run.errorMessage}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}