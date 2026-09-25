"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi } from "@/lib/workshop-api";
import { workshopRetryKey, type WorkshopRetryKey } from "@/lib/workshop-retry-key";

type Material = { id: string; key: string; name: string; scalePurpose: "GOLD" | "STONE" };
type Definition = { id: string; name: string };
type Route = { id: string; name: string };
type Step = { id: string; definitionId: string; status: string; position: number };
type Account = { id: string; materialKey: string; bucket: string; scopeId: string; balanceGrams: string };

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const errorMessage = (error: any) => String(error?.response?.data?.message ?? error?.message ?? "Workshop request failed");

export function FactoryManagerControls({ materials, definitions, routes, accounts, jobId, treeId, runId, steps, onRefresh }: {
  materials: Material[]; definitions: Definition[]; routes: Route[]; accounts: Account[];
  jobId: string; treeId: string; runId: string; steps: Step[]; onRefresh: () => Promise<void>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [materialKey, setMaterialKey] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materialKind, setMaterialKind] = useState("SOLDER");
  const [routeName, setRouteName] = useState("");
  const [routeDefinitionIds, setRouteDefinitionIds] = useState<string[]>([]);
  const [routeId, setRouteId] = useState("");
  const [stepId, setStepId] = useState("");
  const [stepAction, setStepAction] = useState("SKIP");
  const [addedDefinitionId, setAddedDefinitionId] = useState("");
  const [stepReason, setStepReason] = useState("");
  const [childLabel, setChildLabel] = useState("");
  const [childKind, setChildKind] = useState("DESIGN_GROUP");
  const [childQuantity, setChildQuantity] = useState("1");
  const [workstationName, setWorkstationName] = useState("");
  const [workstationDefinitionId, setWorkstationDefinitionId] = useState("");
  const [toleranceGrams, setToleranceGrams] = useState("0.10");
  const [tolerancePurpose, setTolerancePurpose] = useState<"GOLD" | "STONE">("GOLD");
  const [assayMaterialId, setAssayMaterialId] = useState("");
  const [assayEventId, setAssayEventId] = useState("");
  const [assayPurity, setAssayPurity] = useState("");
  const [assaySource, setAssaySource] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationBucket, setDestinationBucket] = useState("VAULT");
  const [manualGrams, setManualGrams] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [correctionJournalId, setCorrectionJournalId] = useState("");
  const [replacementGrams, setReplacementGrams] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffCanApprove, setStaffCanApprove] = useState(false);
  const manualRetry = useRef<WorkshopRetryKey | null>(null);
  const correctionRetry = useRef<WorkshopRetryKey | null>(null);

  const act = async (action: () => Promise<unknown>, success: string) => {
    setError(""); setNotice(""); setBusy(true);
    try { await action(); await onRefresh(); setNotice(success); return true; }
    catch (error) { setError(errorMessage(error)); return false; }
    finally { setBusy(false); }
  };
  const source = accounts.find((account) => account.id === sourceAccountId);
  const destinationScopeId = destinationBucket === "WIP" ? treeId : destinationBucket === "PROCESS" ? runId : "";
  const postManual = async () => {
    const payload = { materialKey: source?.materialKey, sourceBucket: source?.bucket, sourceScopeId: source?.scopeId,
      destinationBucket, destinationScopeId, weightGrams: manualGrams, reason: manualReason.trim(),
      ...(treeId ? { treeId, jobId } : {}), ...(runId ? { processRunId: runId } : {}) };
    manualRetry.current = workshopRetryKey(manualRetry.current, payload, () => crypto.randomUUID());
    const key = manualRetry.current.key;
    if (await act(() => workshopApi.manualMovement({ ...payload, idempotencyKey: key }), "Manual movement posted")) manualRetry.current = null;
  };
  const postCorrection = async () => {
    const id = correctionJournalId.trim();
    const payload = { replacementWeightGrams: replacementGrams, reason: correctionReason.trim() };
    correctionRetry.current = workshopRetryKey(correctionRetry.current, { id, ...payload }, () => crypto.randomUUID());
    const key = correctionRetry.current.key;
    if (await act(() => workshopApi.correctJournal(id, { ...payload, idempotencyKey: key }), "Reversal and replacement posted")) correctionRetry.current = null;
  };

  return <Card><CardHeader><CardTitle><T>Factory manager controls</T></CardTitle></CardHeader><CardContent className="space-y-5 text-sm">
    <section className="space-y-2"><h3 className="font-semibold"><T>Workshop staff</T></h3>
      <div className="grid gap-2 md:grid-cols-3"><label><T>Registered staff email</T><Input type="email" value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={staffCanApprove} onChange={(event) => setStaffCanApprove(event.target.checked)} /><T>Supervisor approval permission</T></label>
        <Button disabled={busy || !staffEmail.trim()} onClick={() => act(() => workshopApi.inviteStaff({ email: staffEmail.trim(), canCapture: true, canApprove: staffCanApprove }), "Workshop invitation saved") }><T>Invite operator or supervisor</T></Button>
      </div><p className="text-xs text-muted-foreground"><T>The staff member must register first, accept the invitation in their staff station, and have the shop plan's Workshop feature.</T></p>
    </section>
    <section className="space-y-2"><h3 className="font-semibold"><T>Materials and process route</T></h3>
      <div className="grid gap-2 md:grid-cols-4">
        <label><T>Material key</T><Input value={materialKey} onChange={(event) => setMaterialKey(event.target.value)} /></label>
        <label><T>Material name</T><Input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></label>
        <label><T>Material kind</T><select className={field} value={materialKind} onChange={(event) => setMaterialKind(event.target.value)}>{["SOLDER", "ALLOY", "RECOVERED", "REFINERY", "DIAMOND", "STONE", "OTHER"].map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <Button disabled={busy || !materialKey || !materialName} onClick={() => act(() => workshopApi.createMaterial({ key: materialKey.trim(), name: materialName.trim(), kind: materialKind, scalePurpose: ["DIAMOND", "STONE"].includes(materialKind) ? "STONE" : "GOLD" }), "Material created")}><T>Add physical material</T></Button>
        <label><T>Route name</T><Input value={routeName} onChange={(event) => setRouteName(event.target.value)} /></label>
        <label className="md:col-span-2"><T>Ordered route steps</T><select className={field} value="" onChange={(event) => { if (event.target.value) setRouteDefinitionIds((ids) => [...ids, event.target.value]); }}><option value="">{t("Add process step")}</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select><span className="text-xs text-muted-foreground">{routeDefinitionIds.map((id) => definitions.find((definition) => definition.id === id)?.name ?? id).join(" → ")}</span></label>
        <div className="flex gap-2"><Button disabled={busy || !routeName.trim() || !routeDefinitionIds.length} onClick={() => act(() => workshopApi.createRoute({ name: routeName.trim(), definitionIds: routeDefinitionIds }), "Route created")}><T>Create route</T></Button><Button variant="outline" onClick={() => setRouteDefinitionIds([])}><T>Clear steps</T></Button></div>
        <label><T>Route template</T><select className={field} value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">{t("Select route")}</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select></label>
        <Button disabled={busy || !jobId || !routeId} onClick={() => act(() => workshopApi.assignRoute(jobId, routeId), "Route assigned to job")}><T>Assign route to job</T></Button>
        <label><T>Job route step</T><select className={field} value={stepId} onChange={(event) => setStepId(event.target.value)}><option value="">{t("Select step")}</option>{steps.map((step) => <option key={step.id} value={step.id}>{step.position + 1}. {definitions.find((definition) => definition.id === step.definitionId)?.name} · {step.status}</option>)}</select></label>
        <label><T>Change</T><select className={field} value={stepAction} onChange={(event) => setStepAction(event.target.value)}>{["SKIP", "REPEAT", "REWORK", "ADD"].map((value) => <option key={value}>{value}</option>)}</select></label>
        {stepAction === "ADD" && <label><T>Process to add</T><select className={field} value={addedDefinitionId} onChange={(event) => setAddedDefinitionId(event.target.value)}><option value="">{t("Select process")}</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>}
        <label><T>Reason</T><Input value={stepReason} onChange={(event) => setStepReason(event.target.value)} /></label>
        <Button disabled={busy || !jobId || !stepId || !stepReason.trim() || (stepAction === "ADD" && !addedDefinitionId)} onClick={() => act(() => workshopApi.changeRouteStep(jobId, stepId, { action: stepAction, reason: stepReason.trim(), ...(stepAction === "ADD" ? { definitionId: addedDefinitionId } : {}) }), "Route step changed")}><T>Apply route change</T></Button>
      </div>
    </section>
    <section className="space-y-2 border-t pt-4"><h3 className="font-semibold"><T>Pieces, machines and transfer tolerance</T></h3>
      <div className="grid gap-2 md:grid-cols-4">
        <label><T>Piece or group label</T><Input value={childLabel} onChange={(event) => setChildLabel(event.target.value)} /></label>
        <label><T>Granularity</T><select className={field} value={childKind} onChange={(event) => setChildKind(event.target.value)}>{["DESIGN_GROUP", "ORDER_GROUP", "PIECE"].map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <label><T>Quantity</T><Input inputMode="numeric" value={childQuantity} onChange={(event) => setChildQuantity(event.target.value)} /></label>
        <Button disabled={busy || !treeId || !childLabel.trim()} onClick={() => act(() => workshopApi.createBatchChild({ treeId, kind: childKind, label: childLabel.trim(), quantity: Number(childQuantity) }), "Batch child created")}><T>Add piece or group</T></Button>
        <label><T>Machine or workstation</T><Input value={workstationName} onChange={(event) => setWorkstationName(event.target.value)} /></label>
        <label><T>Supported process</T><select className={field} value={workstationDefinitionId} onChange={(event) => setWorkstationDefinitionId(event.target.value)}><option value="">{t("Any process")}</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>
        <Button disabled={busy || !workstationName.trim()} onClick={() => act(() => workshopApi.createWorkstation({ name: workstationName.trim(), ...(workstationDefinitionId ? { definitionId: workstationDefinitionId } : {}) }), "Workstation created")}><T>Add workstation</T></Button>
        <div />
        <label><T>Transfer tolerance grams</T><Input inputMode="decimal" value={toleranceGrams} onChange={(event) => setToleranceGrams(event.target.value)} /></label>
        <label><T>Scale purpose</T><select className={field} value={tolerancePurpose} onChange={(event) => setTolerancePurpose(event.target.value as "GOLD" | "STONE")}><option value="GOLD"><T>Gold</T></option><option value="STONE"><T>Stone</T></option></select></label>
        <Button disabled={busy || !toleranceGrams} onClick={() => act(() => workshopApi.configureTolerance({ movementKind: "TRANSFER", scalePurpose: tolerancePurpose, maxDifferenceGrams: toleranceGrams }), "Transfer tolerance saved")}><T>Save transfer tolerance</T></Button>
      </div>
    </section>
    <section className="space-y-2 border-t pt-4"><h3 className="font-semibold"><T>Assay and audited corrections</T></h3>
      <div className="grid gap-2 md:grid-cols-4">
        <label><T>Assayed material</T><select className={field} value={assayMaterialId} onChange={(event) => setAssayMaterialId(event.target.value)}><option value="">{t("Select material")}</option>{materials.filter((material) => material.scalePurpose === "GOLD").map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label>
        <label><T>Fine-gold fraction</T><Input inputMode="decimal" value={assayPurity} onChange={(event) => setAssayPurity(event.target.value)} /></label>
        <label><T>Assay source</T><Input value={assaySource} onChange={(event) => setAssaySource(event.target.value)} /></label>
        <label><T>Recovery event ID, optional</T><Input value={assayEventId} onChange={(event) => setAssayEventId(event.target.value)} /></label>
        <Button disabled={busy || !assayMaterialId || !assayPurity || !assaySource.trim()} onClick={() => act(() => workshopApi.recordAssay({ materialId: assayMaterialId, fineGoldFraction: assayPurity, source: assaySource.trim(), ...(assayEventId ? { recoveryEventId: assayEventId.trim() } : {}) }), "Assay recorded")}><T>Record immutable assay</T></Button>
      </div>
      <p className="rounded border border-amber-300 p-2"><T>Owner/Admin manual overrides are exceptional. Entered grams are permanently marked and audited; normal operators must use a scale reading.</T></p>
      <div className="grid gap-2 md:grid-cols-4">
        <label><T>Physical source account</T><select className={field} value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)}><option value="">{t("Select account")}</option>{accounts.filter((account) => account.balanceGrams !== "0.000000" && !account.balanceGrams.startsWith("-") && ["VAULT", "WIP", "PROCESS", "REUSABLE", "SCRAP", "RECOVERY_PENDING", "REFINERY", "FINISHED"].includes(account.bucket)).map((account) => <option key={account.id} value={account.id}>{account.materialKey} · {account.bucket} · {account.balanceGrams} g</option>)}</select></label>
        <label><T>Destination</T><select className={field} value={destinationBucket} onChange={(event) => setDestinationBucket(event.target.value)}>{["VAULT", "WIP", "PROCESS", "REUSABLE", "SCRAP", "RECOVERY_PENDING", "REFINERY", "FINISHED"].map((bucket) => <option key={bucket}>{bucket}</option>)}</select></label>
        <label><T>Manual override grams</T><Input inputMode="decimal" value={manualGrams} onChange={(event) => setManualGrams(event.target.value)} /></label>
        <label><T>Reason</T><Input value={manualReason} onChange={(event) => setManualReason(event.target.value)} /></label>
        <Button disabled={busy || !source || !manualGrams || !manualReason.trim() || ((destinationBucket === "WIP" || destinationBucket === "PROCESS") && !destinationScopeId)} onClick={postManual}><T>Post owner manual override</T></Button>
        <label><T>Original journal ID</T><Input value={correctionJournalId} onChange={(event) => setCorrectionJournalId(event.target.value)} /></label>
        <label><T>Replacement grams</T><Input inputMode="decimal" value={replacementGrams} onChange={(event) => setReplacementGrams(event.target.value)} /></label>
        <label><T>Correction reason</T><Input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} /></label>
        <Button disabled={busy || !correctionJournalId || !replacementGrams || !correctionReason.trim()} onClick={postCorrection}><T>Reverse and replace journal</T></Button>
      </div>
    </section>
    {notice && <p className="text-emerald-700">{t(notice)}</p>}
    {error && <p role="alert" className="text-red-700">{t(error)}</p>}
  </CardContent></Card>;
}
