"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Monitor, Plus, Redo2, Save, Smartphone, Trash2, Undo2 } from "lucide-react";
import { T } from "@/components/ui/T";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { recoveryOffersApi, type OfferCampaign, type OfferEmailBlock } from "@/lib/api";
import { uploadEmailMedia } from "@/lib/image-upload";
import { useT } from "@/providers/translation-provider";
import { EmailCanvas } from "./EmailCanvas";
import { EmailBlockInspector, studioInput } from "./EmailBlockInspector";
import { EMAIL_BLOCK_PRESETS, EMAIL_SECTION_PRESETS } from "./emailBlockPresets";
import {
  BLOCK_LABELS, campaignDraft, campaignRevision, cloneBlocks, draftStorageKey,
  emptyBlock, readRecovery, studioPreview, type StudioDraft, type RecoveredDraft,
} from "./emailStudioModel";

type Props = { campaign: OfferCampaign; open: boolean; locked: boolean; onClose: () => void; onSaved: (campaign: OfferCampaign) => void };
const control = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

export function EmailBlockEditor(props: Props) {
  const { user } = useAuth();
  if (!props.open) return null;
  // Each opening/account/campaign owns its own history and async work.
  return <StudioSession key={`${user?.id}:${props.campaign.key}`} {...props} userId={user?.id} />;
}

function StudioSession({ campaign, locked, onClose, onSaved, userId }: Props & { userId?: string }) {
  const t = useT();
  const { toast } = useToast();
  const [baseline, setBaseline] = useState(() => campaignDraft(campaign));
  const [history, setHistory] = useState<{ past: StudioDraft[]; present: StudioDraft; future: StudioDraft[] }>({ past: [], present: baseline, future: [] });
  const draft = history.present;
  const [selectedId, setSelectedId] = useState(baseline.blocks[0]?.id);
  const [mobile, setMobile] = useState(false);
  const [imagesOff, setImagesOff] = useState(false);
  const [smallView, setSmallView] = useState<"edit" | "preview">("preview");
  const [leftTab, setLeftTab] = useState<"sections" | "add">("sections");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storageFailed, setStorageFailed] = useState(!userId);
  const [restoredStale, setRestoredStale] = useState(false);
  const [baseRevision, setBaseRevision] = useState(() => campaignRevision(campaign));
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(campaign.updatedAt);
  const storageKey = userId ? draftStorageKey(userId, campaign.key) : null;
  const [recovery, setRecovery] = useState<RecoveredDraft | null>(() => {
    try { return storageKey ? readRecovery(storageKey) : null; } catch { return null; }
  });
  const mounted = useRef(true);
  const lastEdit = useRef({ group: "", at: 0 });
  const dragId = useRef<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const busy = saving || uploading !== null;
  const editingDisabled = locked || busy || recovery !== null;
  const placeholder = t("Complete this section in the editor to see it here.");
  const preview = useMemo(() => studioPreview(draft, campaign.name, placeholder), [draft, campaign.name, placeholder]);
  const selected = draft.blocks.find((block) => block.id === selectedId);
  const issue = preview.issues.find((item) => item.id === selectedId);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!storageKey || recovery) return;
    try {
      if (dirty) localStorage.setItem(storageKey, JSON.stringify({ version: 1, savedAt: Date.now(), base: restoredStale ? "stale" : baseRevision, draft }));
      else localStorage.removeItem(storageKey);
      setStorageFailed(false);
    } catch { setStorageFailed(true); }
  }, [draft, dirty, storageKey, recovery, baseRevision, restoredStale]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (busy || (dirty && storageFailed)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [busy, dirty, storageFailed]);

  const change = (update: (draft: StudioDraft) => StudioDraft, group = "") => {
    const now = Date.now();
    const combine = !!group && lastEdit.current.group === group && now - lastEdit.current.at < 700;
    lastEdit.current = { group, at: now };
    setHistory((current) => ({ past: combine ? current.past : [...current.past, current.present].slice(-50), present: update(current.present), future: [] }));
    setSaveError(null);
  };
  const undo = () => {
    lastEdit.current.group = "";
    setHistory((current) => current.past.length ? {
      past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future],
    } : current);
  };
  const redo = () => {
    lastEdit.current.group = "";
    setHistory((current) => current.future.length ? {
      past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1),
    } : current);
  };
  const select = (id: string) => { setSelectedId(id); setSmallView("edit"); };
  const insert = (blocks: OfferEmailBlock[]) => {
    if (draft.blocks.length + blocks.length > 40) return;
    const next = cloneBlocks(blocks);
    change((current) => {
      const index = current.blocks.findIndex((block) => block.id === selectedId);
      const updated = [...current.blocks]; updated.splice(index < 0 ? updated.length : index + 1, 0, ...next);
      return { ...current, blocks: updated };
    });
    select(next[0].id!); setLeftTab("sections");
  };
  const move = (id: string, target: number) => change((current) => {
    const blocks = [...current.blocks];
    const index = blocks.findIndex((block) => block.id === id);
    if (index < 0 || target < 0 || target >= blocks.length) return current;
    blocks.splice(target, 0, blocks.splice(index, 1)[0]);
    return { ...current, blocks };
  });
  const forgetRecovery = () => { try { if (storageKey) localStorage.removeItem(storageKey); } catch { setStorageFailed(true); } };
  const upload = async (file: File, field: "url" | "posterUrl" | "videoUrl", galleryIndex?: number) => {
    const id = selected?.id;
    if (!id || editingDisabled) return;
    setUploading(id); setProgress(0);
    try {
      const result = await uploadEmailMedia(file, { onProgress: (value) => { if (mounted.current) setProgress(value); } });
      if (!mounted.current) return;
      if (!result.success || !result.url) throw new Error(result.error || "Try a smaller image or video.");
      const url = result.url;
      change((current) => ({ ...current, blocks: current.blocks.map((block) => {
        if (block.id !== id) return block;
        if (block.type === "gallery" && galleryIndex !== undefined) return { ...block, images: block.images.map((entry, index) => index === galleryIndex ? { ...entry, url } : entry) };
        return { ...block, [field]: url } as OfferEmailBlock;
      }) }));
    } catch (error) {
      if (mounted.current) toast({ title: t("The file could not be uploaded"), description: t((error as Error).message), variant: "destructive" });
    } finally { if (mounted.current) setUploading(null); }
  };
  const save = async () => {
    if (editingDisabled || restoredStale || preview.issues.length) return;
    setSaving(true); setSaveError(null);
    try {
      const response = await recoveryOffersApi.updateCampaignEmailDesign(campaign.key, {
        ...draft, emailSubject: draft.emailSubject.trim(), expectedUpdatedAt,
      });
      if (!mounted.current) return;
      const next: StudioDraft = { ...draft, emailSubject: draft.emailSubject.trim() };
      setBaseline(next);
      setHistory({ past: [], present: next, future: [] });
      if (response.data.updatedAt) {
        setExpectedUpdatedAt(response.data.updatedAt);
        setBaseRevision(campaignRevision(response.data));
      }
      setRestoredStale(false);
      forgetRecovery();
      toast({ title: t("Email design saved") }); onSaved(response.data);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      if (mounted.current) setSaveError(typeof message === "string" ? message : "The email design was not saved. Your draft is still here. Try again.");
    } finally { if (mounted.current) setSaving(false); }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!(event.metaKey || event.ctrlKey)) return;
      if (key === "z" && !event.shiftKey) {
        if (editingDisabled) return;
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        if (editingDisabled) return;
        event.preventDefault();
        redo();
      } else if (key === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const close = () => {
    if (saving) return;
    if ((uploading || (dirty && storageFailed)) && !window.confirm(t("An upload is pending or this draft could not be saved on this device. Close and lose those unsaved changes?"))) return;
    onClose();
  };
  const reset = async () => {
    if (editingDisabled || !window.confirm(t("Remove the designed email and return to the simple template for this campaign?"))) return;
    setSaving(true);
    try {
      const response = await recoveryOffersApi.clearCampaignEmailDesign(campaign.key);
      if (mounted.current) { forgetRecovery(); onSaved(response.data); }
    } catch { if (mounted.current) setSaveError("The email design was not removed. Try again."); }
    finally { if (mounted.current) setSaving(false); }
  };

  return <Dialog open onOpenChange={(next) => { if (!next) close(); }}>
    <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[96dvh] sm:w-[98vw] sm:rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 pr-12">
        <div className="min-w-0" data-tour="email-studio">
          <DialogTitle><T>Live Email Studio</T></DialogTitle>
          <DialogDescription className="mt-1 max-w-xl truncate">{campaign.name}</DialogDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="text-xs text-muted-foreground">
            <T>{dirty ? "Unsaved changes" : campaign.emailDesign ? "Saved to campaign" : "Not saved to campaign yet"}</T>
          </p>
          <button type="button" className={control} aria-label={t("Undo")} title={t("Undo")} disabled={editingDisabled || !history.past.length} onClick={undo}><Undo2 size={16} /></button>
          <button type="button" className={control} aria-label={t("Redo")} title={t("Redo")} disabled={editingDisabled || !history.future.length} onClick={redo}><Redo2 size={16} /></button>
          <button type="button" className={`${control} border-foreground bg-foreground text-background hover:bg-foreground/90`} disabled={editingDisabled || restoredStale || preview.issues.length > 0} onClick={save}>
            <Save size={16} /><T>{saving ? "Saving…" : "Save design"}</T>
          </button>
        </div>
      </header>
      {locked && <p role="status" className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950"><T>This campaign is close to its scheduled send. You can preview it, but editing is locked.</T></p>}
      {recovery && <div role="status" className="flex flex-wrap items-center gap-3 border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="flex-1"><T>A draft from this device is available.</T> {recovery.base !== baseRevision && <T>The saved campaign has changed since this draft.</T>}</p>
        <button type="button" className={control} onClick={() => { change(() => recovery.draft); setSelectedId(recovery.draft.blocks[0]?.id); setRestoredStale(recovery.base !== baseRevision); setRecovery(null); }}><T>Restore draft</T></button>
        <button type="button" className={control} onClick={() => { forgetRecovery(); setRecovery(null); }}><T>Discard draft</T></button>
      </div>}
      {restoredStale && <div className="flex flex-wrap items-center gap-3 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">
        <p className="flex-1"><T>This recovered draft is older than the saved campaign. Review it before replacing the saved design.</T></p>
        <button type="button" className={control} onClick={() => setRestoredStale(false)}><T>I have reviewed this draft</T></button>
      </div>}
      {saveError && <p role="alert" className="border-b bg-destructive/10 px-4 py-3 text-sm text-destructive"><T>{saveError}</T></p>}
      <div className="flex border-b p-2 lg:hidden">
        {(["edit", "preview"] as const).map((view) => <button type="button" key={view} className={`${control} flex-1 border-0 ${smallView === view ? "bg-accent" : ""}`} aria-pressed={smallView === view} onClick={() => setSmallView(view)}><T>{view === "edit" ? "Edit email" : "Live preview"}</T></button>)}
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className={`${smallView === "edit" ? "flex" : "hidden"} min-w-0 flex-1 flex-col overflow-y-auto lg:contents`}>
          <aside aria-label={t("Email sections")} className="shrink-0 border-b p-4 lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r xl:w-60">
            <div className="mb-4 flex gap-1 rounded-md bg-muted p-1">
              {(["sections", "add"] as const).map((tab) => <button type="button" key={tab} className={`${control} flex-1 border-0 px-2 ${leftTab === tab ? "bg-background shadow-sm" : ""}`} aria-pressed={leftTab === tab} onClick={() => setLeftTab(tab)}><T>{tab === "sections" ? "Sections" : "Add content"}</T></button>)}
            </div>
            {leftTab === "sections" ? <>
              <p className="mb-3 text-xs text-muted-foreground"><T>Drag to reorder, or use the arrows.</T> {draft.blocks.length}/40</p>
              <ol className="space-y-2">{draft.blocks.map((block, index) => <li key={block.id} draggable={!editingDisabled}
                onDragStart={() => { dragId.current = block.id!; }} onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); if (dragId.current && !editingDisabled) move(dragId.current, index); dragId.current = null; }}
                className={`rounded-md border ${block.id === selectedId ? "border-primary bg-primary/5" : "border-border"}`}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-pressed={block.id === selectedId} onClick={() => select(block.id!)}>
                  <span className="font-medium">{index + 1}. <T>{BLOCK_LABELS[block.type]}</T></span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{"text" in block ? block.text : "alt" in block ? block.alt : "label" in block ? block.label : ""}</span>
                  {preview.issues.some((item) => item.id === block.id) && <span className="text-xs text-amber-700 dark:text-amber-300"><T>Needs attention</T></span>}
                </button>
                {block.id === selectedId && <div className="flex gap-1 px-2 pb-2">
                  <button type="button" className={`${control} flex-1 px-1`} aria-label={t("Move block up")} disabled={editingDisabled || index === 0} onClick={() => move(block.id!, index - 1)}><ArrowUp size={15} /></button>
                  <button type="button" className={`${control} flex-1 px-1`} aria-label={t("Move block down")} disabled={editingDisabled || index === draft.blocks.length - 1} onClick={() => move(block.id!, index + 1)}><ArrowDown size={15} /></button>
                  <button type="button" className={`${control} flex-1 px-1`} aria-label={t("Duplicate block")} disabled={editingDisabled || draft.blocks.length >= 40} onClick={() => insert([block])}><Copy size={15} /></button>
                  <button type="button" className={`${control} flex-1 px-1`} aria-label={t("Remove block")} disabled={editingDisabled} onClick={() => { change((current) => ({ ...current, blocks: current.blocks.filter((item) => item.id !== block.id) })); setSelectedId(draft.blocks[index + 1]?.id || draft.blocks[index - 1]?.id); }}><Trash2 size={15} /></button>
                </div>}
              </li>)}</ol>
              <button type="button" className={`${control} mt-3 w-full`} disabled={editingDisabled || draft.blocks.length >= 40} onClick={() => setLeftTab("add")}><Plus size={16} /><T>Add section</T></button>
            </> : <div className="space-y-6">
              <div><h3 className="mb-2 text-sm font-semibold"><T>Building blocks</T></h3><div className="grid grid-cols-2 gap-2">
                {(Object.keys(BLOCK_LABELS) as OfferEmailBlock["type"][]).map((type) => <button type="button" key={type} className={`${control} justify-start px-2 text-xs`} disabled={editingDisabled || draft.blocks.length >= 40} onClick={() => insert([emptyBlock(type)])}><T>{BLOCK_LABELS[type]}</T></button>)}
              </div></div>
              <div><h3 className="mb-1 text-sm font-semibold"><T>Ready-made sections</T></h3>
                {EMAIL_SECTION_PRESETS.map((preset) => <button type="button" key={preset.id} className="block min-h-12 w-full border-b py-3 text-left text-sm hover:text-primary disabled:opacity-40" disabled={editingDisabled || draft.blocks.length + preset.blocks.length > 40} onClick={() => insert(preset.blocks)}><span className="font-medium"><T>{preset.label}</T></span><span className="mt-1 block text-xs text-muted-foreground"><T>{preset.description}</T></span></button>)}
              </div>
            </div>}
            <details className="mt-6 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold"><T>Starting layouts</T></summary>
              <p className="my-2 text-xs text-muted-foreground"><T>Replace the sections below. Your subject stays.</T></p>
              {EMAIL_BLOCK_PRESETS.map((preset) => <button type="button" key={preset.id} className="block min-h-10 w-full py-2 text-left text-sm hover:text-primary disabled:opacity-40" disabled={editingDisabled} onClick={() => {
                if (!window.confirm(t("Replace all sections with this layout? You can undo this change."))) return;
                const blocks = cloneBlocks(preset.blocks); change((current) => ({ ...current, blocks })); select(blocks[0].id!);
              }}><T>{preset.label}</T></button>)}
            </details>
          </aside>
          <aside aria-label={t("Email inspector")} className="shrink-0 p-4 lg:order-3 lg:w-72 lg:overflow-y-auto lg:border-l xl:w-80">
            <fieldset disabled={editingDisabled} className="mb-6 min-w-0 space-y-3 border-b pb-5">
              <legend className="mb-3 text-sm font-semibold"><T>Campaign email</T></legend>
              <label className="block text-sm"><T>Subject</T><input className={studioInput} value={draft.emailSubject} maxLength={180} onChange={(event) => change((current) => ({ ...current, emailSubject: event.target.value }), "subject")} /></label>
              <label className="block text-sm"><T>Preheader</T><input className={studioInput} value={draft.preheader || ""} maxLength={180} onChange={(event) => change((current) => ({ ...current, preheader: event.target.value }), "preheader")} /><span className="mt-1 block text-xs text-muted-foreground"><T>The short preview text beside the subject in an inbox.</T></span></label>
              <label className="block text-sm"><T>Email theme</T><select className={studioInput} value={draft.theme} onChange={(event) => change((current) => ({ ...current, theme: event.target.value as StudioDraft["theme"] }))}>
                <option value="classic">{t("Orivraa gold")}</option><option value="editorial">{t("Editorial green")}</option><option value="midnight">{t("Midnight indigo")}</option>
              </select></label>
            </fieldset>
            {selected ? <EmailBlockInspector key={selected.id} block={selected} disabled={editingDisabled} uploading={uploading === selected.id} progress={progress} issue={issue?.message}
              onChange={(block) => change((current) => ({ ...current, blocks: current.blocks.map((item) => item.id === block.id ? block : item) }), block.id)} onUpload={upload} />
              : <p className="text-sm text-muted-foreground"><T>Select a section on the canvas, or add one to begin.</T></p>}
            {campaign.emailDesign && <button type="button" className="mt-8 min-h-10 text-xs text-muted-foreground underline underline-offset-4" disabled={editingDisabled} onClick={reset}><T>Return to simple template</T></button>}
          </aside>
        </div>
        <main aria-label={t("Email canvas")} className={`${smallView === "preview" ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-muted/50 lg:order-2 lg:flex`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2">
            <div className="flex gap-1">
              <button type="button" className={`${control} ${!mobile ? "bg-accent" : ""}`} aria-pressed={!mobile} aria-label={t("Desktop")} onClick={() => setMobile(false)}>
                <Monitor size={16} /><span className="hidden sm:inline"><T>Desktop</T></span>
              </button>
              <button type="button" className={`${control} ${mobile ? "bg-accent" : ""}`} aria-pressed={mobile} aria-label={t("Mobile")} onClick={() => setMobile(true)}>
                <Smartphone size={16} /><span className="hidden sm:inline"><T>Mobile</T></span>
              </button>
            </div>
            <label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={imagesOff} onChange={(event) => setImagesOff(event.target.checked)} /><T>Images off</T></label>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
            <div className="mx-auto mb-3 max-w-[680px] rounded-md border bg-background px-4 py-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground"><T>Sample inbox</T></p>
              <p className="mt-2 break-words font-semibold">{draft.emailSubject || t("Your email subject")}</p>
              {draft.preheader && <p className="mt-1 break-words text-xs text-muted-foreground">{draft.preheader}</p>}
              <p className="mt-2 text-xs text-muted-foreground"><T>Greeting uses the sample name "Shop owner", not a selected recipient.</T></p>
            </div>
            <EmailCanvas blocks={preview.blocks} options={preview.options} selectedId={selectedId} mobile={mobile} imagesOff={imagesOff} onSelect={select} />
          </div>
          <p className="border-t bg-background px-4 py-2 text-xs text-muted-foreground"><T>Browser preview. Inbox rendering may vary. CSS motion is paused while editing; GIFs can still play.</T></p>
        </main>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-2 text-xs">
        <p role="status" className={storageFailed && dirty ? "text-destructive" : "text-muted-foreground"}><T>{storageFailed ? "Draft recovery unavailable on this device. Save before closing." : dirty ? "Draft saved on this device · not yet saved to campaign" : "Save design updates the campaign email."}</T></p>
        <div className="flex items-center gap-3">
          {preview.issues.length > 0 && <button type="button" className="min-h-9 text-amber-700 underline underline-offset-4 dark:text-amber-300" onClick={() => {
            const first = preview.issues[0]; if (first.id) select(first.id); else { setSmallView("edit"); toast({ title: t(first.message), variant: "destructive" }); }
          }}>{preview.issues.length} <T>to fix before saving</T></button>}
          <span className={`tabular-nums ${preview.bytes > 90 * 1024 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{(preview.bytes / 1024).toFixed(1)} / 102 KB <T>HTML</T></span>
        </div>
      </footer>
    </DialogContent>
  </Dialog>;
}
