"use client";

import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { karigarApi } from "@/lib/api";
import {
  KARIGAR_STAGE_LABELS,
  KARIGAR_STAGES,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  type GoldLossResult,
  type KarigarStageCode,
} from "@gold-shop/shared";
import { useState } from "react";
import { useMarket } from "@/hooks/useMarket";
import { useT } from "@/providers/translation-provider";
import { JobCostSummaryModal } from "./JobCostSummaryModal";

export type JobGold = {
  id: string;
  product: string;
  artisan: string;
  workshopId?: string | null;
  status: string;
  metalKey?: string;
  archived?: boolean;
  readOnly?: boolean;
  allowedWastagePercent?: number;
  goldLoss?: GoldLossResult;
  stages?: Array<{
    id: string;
    stage: KarigarStageCode;
    goldInGrams: number;
    goldOutGrams: number;
    scrapGrams: number;
    dustGrams: number;
    allowedWastagePercent: number;
    status: string;
    goldLoss?: GoldLossResult;
  }>;
  trees?: Array<{
    id: string;
    label: string;
    metalKey?: string;
    issuedGrams: number;
    finishedGrams: number;
    sprueButtonGrams: number;
    recoverableGrams: number;
    allowedWastagePercent: number;
    goldLoss?: GoldLossResult;
    lines?: Array<{ id: string; label: string; weightGrams: number }>;
  }>;
};

type CastingTree = NonNullable<JobGold["trees"]>[number];

function grams(n: number | undefined) {
  return (n ?? 0).toFixed(3);
}

function LossGrid({ loss }: { loss?: GoldLossResult }) {
  if (!loss) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
      <div>
        <p className="text-gray-400 uppercase"><T>Issued</T></p>
        <p className="font-semibold tabular-nums">{grams(loss.issued)} g</p>
      </div>
      <div>
        <p className="text-gray-400 uppercase"><T>Actual loss</T></p>
        <p className="font-semibold tabular-nums">{grams(loss.actualLoss)} g</p>
      </div>
      <div>
        <p className="text-gray-400 uppercase"><T>Allowed</T></p>
        <p className="font-semibold tabular-nums">{grams(loss.allowedLoss)} g</p>
      </div>
      <div>
        <p className="text-gray-400 uppercase"><T>Unexplained</T></p>
        <p className={`font-bold tabular-nums ${loss.unexplained > 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {grams(loss.unexplained)} g
        </p>
      </div>
    </div>
  );
}

function CastingTreeEditor({
  jobId,
  jobMetalKey,
  tree,
  defaultAllowed,
  traceableLedger = false,
  readOnly = false,
  onChanged,
  onCancelNew,
}: {
  jobId: string;
  jobMetalKey?: string;
  tree?: CastingTree;
  defaultAllowed: number;
  traceableLedger?: boolean;
  readOnly?: boolean;
  onChanged: () => void;
  onCancelNew?: () => void;
}) {
  const t = useT();
  const traceableGold995Tree = traceableLedger &&
    (tree ? tree.metalKey : jobMetalKey) === WORKSHOP_GOLD_995_MATERIAL_KEY;
  const [treeForm, setTreeForm] = useState({
    issued: String(tree?.issuedGrams ?? ""),
    finished: String(tree?.finishedGrams ?? ""),
    sprue: String(tree?.sprueButtonGrams ?? ""),
    recoverable: String(tree?.recoverableGrams ?? ""),
    allowed: String(tree?.allowedWastagePercent ?? defaultAllowed),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveTree = async () => {
    if (readOnly) return;
    setError("");
    setSaving(true);
    try {
      const issued = parseFloat(treeForm.issued) || 0;
      const payload = {
        ...(traceableLedger ? {} : {
          issuedGrams: issued,
          finishedGrams: parseFloat(treeForm.finished) || 0,
          sprueButtonGrams: parseFloat(treeForm.sprue) || 0,
          recoverableGrams: parseFloat(treeForm.recoverable) || 0,
        }),
        allowedWastagePercent: parseFloat(treeForm.allowed) || 0,
      };
      if (tree) {
        await karigarApi.updateTree(jobId, tree.id, payload);
      } else if (traceableGold995Tree || (!traceableLedger && issued > 0)) {
        const created = await karigarApi.createTree(jobId, {
          issuedGrams: traceableGold995Tree ? 0 : issued,
          ...(traceableGold995Tree
            ? { metalKey: WORKSHOP_GOLD_995_MATERIAL_KEY, purity: "995" }
            : {}),
          allowedWastagePercent: payload.allowedWastagePercent,
        });
        const raw = created.data as { id?: string; data?: { id?: string } };
        const treeId = raw?.data?.id ?? raw?.id;
        if (treeId) await karigarApi.updateTree(jobId, treeId, payload);
      }
      onChanged();
    } catch (err: any) {
      setError(String(err?.response?.data?.message ?? err?.message ?? "Could not save casting tree"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-gray-900 p-3 space-y-2">
      <p className="text-[11px] font-semibold uppercase text-amber-700">
        {tree?.label ? tree.label : traceableGold995Tree ? <T>New Gold 995 casting tree</T> : <T>New casting tree</T>}
      </p>
      {!tree && traceableGold995Tree && (
        <p className="text-[11px] text-gray-500">
          <T>Save the empty tree, then capture its actual Gold 995 issue on the Workshop Ledger. No typed issue weight is posted.</T>
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(
          [
            ["issued", "Issued g"],
            ["finished", "Finished g"],
            ["sprue", "Sprue / button g"],
            ["recoverable", "Recoverable g"],
            ["allowed", "Allowed %"],
          ] as const
        )
          .filter(([key]) => !traceableLedger || key === "allowed")
          .map(([key, label]) => (
          <label key={key} className="text-[10px] text-gray-500 space-y-1">
            <T>{label}</T>
            <Input
              className="h-8 text-xs"
              value={treeForm[key]}
              disabled={readOnly}
              onChange={(e) =>
                setTreeForm((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          </label>
        ))}
      </div>
      {!traceableLedger && tree?.goldLoss && <LossGrid loss={tree.goldLoss} />}
      {tree?.lines && tree.lines.length > 0 && (
        <ul className="text-[11px] text-gray-600 space-y-0.5">
          {tree.lines.map((line) => (
            <li key={line.id}>
              {line.label}: {grams(line.weightGrams)} g
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={saving || readOnly} onClick={() => void saveTree()} className="bg-amber-500 text-white">
          <T>Save tree</T>
        </Button>
        {onCancelNew && (
          <Button size="sm" variant="ghost" disabled={saving} onClick={onCancelNew}>
            <T>Cancel</T>
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-rose-600">{t(error)}</p>}
    </div>
  );
}

export function KarigarJobGoldCard({
  job,
  currency: currencyProp,
  traceableLedger = false,
  onChanged,
  onEdit,
  onDelete,
}: {
  job: JobGold;
  currency?: string;
  traceableLedger?: boolean;
  onChanged: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { selectedCurrency } = useMarket();
  const currency = currencyProp || selectedCurrency || "NPR";
  const trees = job.trees ?? [];
  const archived = job.archived || job.readOnly || job.status === "CANCELLED";
  const [addingTree, setAddingTree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stageDraft, setStageDraft] = useState<Record<string, { in: string; out: string; scrap: string; dust: string }>>({});

  const saveStage = async (stage: KarigarStageCode) => {
    if (archived) return;
    const draft = stageDraft[stage];
    const current = job.stages?.find((s) => s.stage === stage);
    setSaving(true);
    try {
      await karigarApi.updateStage(job.id, stage, {
        goldInGrams: parseFloat(draft?.in ?? String(current?.goldInGrams ?? 0)) || 0,
        goldOutGrams: parseFloat(draft?.out ?? String(current?.goldOutGrams ?? 0)) || 0,
        scrapGrams: parseFloat(draft?.scrap ?? String(current?.scrapGrams ?? 0)) || 0,
        dustGrams: parseFloat(draft?.dust ?? String(current?.dustGrams ?? 0)) || 0,
        allowedWastagePercent: job.allowedWastagePercent ?? 1,
        status:
          (parseFloat(draft?.out ?? String(current?.goldOutGrams ?? 0)) || 0) > 0
            ? "DONE"
            : current?.status,
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const [showCostModal, setShowCostModal] = useState(false);

  return (
    <div className="p-3 border dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-semibold text-sm">{job.product}</p>
          <p className="text-xs text-muted-foreground">{job.artisan}</p>
          {archived && (
            <p className="text-xs text-muted-foreground mt-1">
              <T>Archived job. Production changes are unavailable; use the metal ledger only for any permitted reconciliation.</T>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
            {job.status}
          </span>
          <button
            type="button"
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-amber-700 underline font-medium"
            onClick={() => setShowCostModal(true)}
          >
            <T>Cost & Ledger</T>
          </button>
          {!archived && (
            <>
              <button type="button" className="text-xs text-amber-700 underline" onClick={onEdit}>
                <T>Edit</T>
              </button>
              <button type="button" className="text-xs text-rose-600 underline" onClick={onDelete}>
                <T>Cancel / archive</T>
              </button>
            </>
          )}
        </div>
      </div>

      {showCostModal && (
        <JobCostSummaryModal
          jobId={job.id}
          currency={currency}
          onClose={() => setShowCostModal(false)}
        />
      )}

      {!traceableLedger && <LossGrid loss={job.goldLoss} />}

      <div data-tour="supply-casting-tree" className="space-y-2">
        <p className="text-[11px] font-semibold uppercase text-amber-700">
          <T>Casting trees</T>
        </p>
        <p className="text-[11px] text-gray-500">{traceableLedger ? <T>CAD tree lines are theoretical. Measured issues, outputs and loss live in the Workshop material journal and batch reconciliation report.</T> : <T>Issued gold vs finished pieces, sprue/button, and recoverable scrap. Loss is calculated — it is not billing wastage.</T>}</p>
        {trees.map((tree) => (
          <CastingTreeEditor
            key={tree.id}
            jobId={job.id}
            jobMetalKey={job.metalKey}
            tree={tree}
            defaultAllowed={job.allowedWastagePercent ?? 1}
            traceableLedger={traceableLedger}
            readOnly={archived}
            onChanged={onChanged}
          />
        ))}
        {addingTree && (
          <CastingTreeEditor
            jobId={job.id}
            jobMetalKey={job.metalKey}
            defaultAllowed={job.allowedWastagePercent ?? 1}
            traceableLedger={traceableLedger}
            readOnly={archived}
            onChanged={() => {
              setAddingTree(false);
              onChanged();
            }}
            onCancelNew={() => setAddingTree(false)}
          />
        )}
        {!addingTree && !archived && (!traceableLedger || job.metalKey === WORKSHOP_GOLD_995_MATERIAL_KEY) && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={() => setAddingTree(true)}
          >
            <T>Add casting tree</T>
          </Button>
        )}
        {traceableLedger && job.metalKey !== WORKSHOP_GOLD_995_MATERIAL_KEY && <p className="text-xs text-amber-700"><T>New TRACEABLE casting trees require a Gold 995 work order.</T></p>}
      </div>

      {traceableLedger ? <p className="rounded border p-2 text-xs text-muted-foreground"><T>Department stage gram fields are disabled in TRACEABLE mode. Use measured process runs, transfers and QC in the Factory workstation.</T></p> : <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase text-gray-400">
          <T>Department stages</T>
        </p>
        {KARIGAR_STAGES.map((stage) => {
          const row = job.stages?.find((s) => s.stage === stage);
          const draft = stageDraft[stage] ?? {
            in: String(row?.goldInGrams ?? 0),
            out: String(row?.goldOutGrams ?? 0),
            scrap: String(row?.scrapGrams ?? 0),
            dust: String(row?.dustGrams ?? 0),
          };
          return (
            <div key={stage} className="rounded-lg border dark:border-gray-800 p-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{KARIGAR_STAGE_LABELS[stage]}</p>
                {row?.goldLoss && row.goldLoss.unexplained > 0 && (
                  <span className="text-[10px] text-rose-600">
                    {grams(row.goldLoss.unexplained)} g <T>unexplained</T>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(["in", "out", "scrap", "dust"] as const).map((field) => (
                  <Input
                    key={field}
                    className="h-7 text-[11px]"
                    placeholder={field}
                    value={draft[field]}
                    disabled={archived}
                    onChange={(e) =>
                      setStageDraft((prev) => ({
                        ...prev,
                        [stage]: { ...draft, [field]: e.target.value },
                      }))
                    }
                  />
                ))}
              </div>
              <p className="text-[9px] text-gray-400">
                <T>In</T> / <T>Out</T> / <T>Scrap</T> / <T>Dust</T> (g)
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={saving || archived}
                onClick={() => void saveStage(stage)}
              >
                <T>Save stage</T>
              </Button>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
