"use client";

import type { OfferEmailAnimation, OfferEmailBlock, OfferEmailBlockStyle } from "@gold-shop/shared";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { BLOCK_LABELS } from "./emailStudioModel";

export const studioInput = "mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
type Props = {
  block: OfferEmailBlock;
  disabled: boolean;
  uploading: boolean;
  progress: number;
  issue?: string;
  onChange: (block: OfferEmailBlock) => void;
  onUpload: (file: File, field: "url" | "posterUrl" | "videoUrl", galleryIndex?: number) => void;
};

export function EmailBlockInspector({ block, disabled, uploading, progress, issue, onChange, onUpload }: Props) {
  const t = useT();
  const patch = (value: object) => onChange({ ...block, ...value } as OfferEmailBlock);
  const style = (value: Partial<OfferEmailBlockStyle>) => patch({ style: { ...block.style, ...value } });
  const field = (label: string, value: string, update: (value: string) => void, multiline = false, maxLength?: number) => (
    <label className="block text-sm font-medium"><T>{label}</T>
      {multiline ? <textarea className={`${studioInput} min-h-28 resize-y`} value={value} maxLength={maxLength} onChange={(event) => update(event.target.value)} />
        : <input className={studioInput} value={value} maxLength={maxLength} onChange={(event) => update(event.target.value)} />}
    </label>
  );
  const upload = (field: "url" | "posterUrl" | "videoUrl", galleryIndex?: number) => (
    <label className="block text-sm font-medium"><T>{field === "videoUrl" ? "Upload video" : galleryIndex === undefined ? "Upload" : "Upload image"}</T>
      <input type="file" className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-2 file:text-foreground"
        accept={field === "videoUrl" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/gif,image/avif"}
        disabled={disabled || uploading} onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (file) onUpload(file, field, galleryIndex);
        }} />
    </label>
  );
  const hasText = ["heading", "text", "button", "gallery"].includes(block.type);

  return <div className="space-y-5">
    <div><h3 className="font-semibold"><T>{BLOCK_LABELS[block.type]}</T></h3>
      <p className="mt-1 text-xs text-muted-foreground"><T>Changes appear on the canvas as you edit.</T></p></div>
    {issue && <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><T>{issue}</T></p>}
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      {(block.type === "heading" || block.type === "text") && field(block.type === "heading" ? "Heading text" : "Body text", block.text, (text) => patch({ text }), block.type === "text", block.type === "heading" ? 120 : 2000)}
      {block.type === "text" && <p className="text-xs text-muted-foreground"><T>Use **bold**, *italic*, or [link text](https://example.com).</T></p>}
      {block.type === "image" && <>
        {upload("url")}
        {field("Image or GIF URL", block.url, (url) => patch({ url }))}
        {field("Image description", block.alt, (alt) => patch({ alt }), false, 200)}
        {field("Click destination (optional)", block.linkUrl || "", (linkUrl) => patch({ linkUrl }))}
        <p className="text-xs text-muted-foreground"><T>Use a clear first frame: some inboxes show only that frame of a GIF. Keep the key message in text too.</T></p>
      </>}
      {block.type === "video" && <>
        <p className="text-sm text-muted-foreground"><T>A clickable poster opens the full video. Use a GIF poster for a short motion preview.</T></p>
        {upload("posterUrl")}
        {field("Poster image or GIF URL", block.posterUrl, (posterUrl) => patch({ posterUrl }))}
        {upload("videoUrl")}
        {field("Video destination URL", block.videoUrl, (videoUrl) => patch({ videoUrl }))}
        {field("Demo button label", block.label || "", (label) => patch({ label }), false, 80)}
      </>}
      {block.type === "gallery" && <>
        <p className="text-xs text-muted-foreground"><T>Two or three images, stacked on narrow screens. Add captions for a before-and-after comparison.</T></p>
        {block.images.map((entry, index) => {
          const change = (value: object) => patch({ images: block.images.map((image, i) => i === index ? { ...image, ...value } : image) });
          return <fieldset key={index} className="space-y-3 border-t pt-3"><legend className="pr-2 text-sm font-semibold"><T>Image</T> {index + 1}</legend>
            {upload("url", index)}
            {field("Image URL", entry.url, (url) => change({ url }))}
            {field("Image description", entry.alt, (alt) => change({ alt }), false, 200)}
            {field("Caption", entry.caption || "", (caption) => change({ caption }), false, 160)}
            {field("Click destination (optional)", entry.linkUrl || "", (linkUrl) => change({ linkUrl }))}
          </fieldset>;
        })}
        <button type="button" className="min-h-10 text-sm font-medium underline underline-offset-4" onClick={() => patch({ images: block.images.length === 2 ? [...block.images, { url: "", alt: "" }] : block.images.slice(0, 2) })}>
          <T>{block.images.length === 2 ? "Add third image" : "Remove third image"}</T>
        </button>
      </>}
      {block.type === "button" && <>
        {field("Button label", block.label, (label) => patch({ label }), false, 60)}
        {field("Button destination URL", block.url, (url) => patch({ url }))}
        <label className="block text-sm font-medium"><T>Button style</T>
          <select className={studioInput} value={block.variant || "primary"} onChange={(event) => patch({ variant: event.target.value === "secondary" ? "secondary" : "primary" })}>
            <option value="primary">{t("Primary")}</option><option value="secondary">{t("Secondary")}</option>
          </select>
        </label>
      </>}
      {block.type === "spacer" && <label className="block text-sm font-medium"><T>Height (px)</T>
        <input type="number" min={8} max={120} className={studioInput} value={block.size ?? 24} onChange={(event) => {
          const size = Number(event.target.value);
          if (Number.isInteger(size)) patch({ size });
        }} /></label>}
      {(block.type === "heading" || block.type === "text" || block.type === "image" || block.type === "video") && <>
        <label className="block text-sm font-medium"><T>Entrance animation</T>
          <select className={studioInput} value={block.animation || "none"} onChange={(event) => patch({ animation: event.target.value === "none" ? undefined : event.target.value as OfferEmailAnimation })}>
            <option value="none">{t("No animation")}</option>
            <option value="fadeIn">{t("Fade in")}</option>
            <option value="slideUp">{t("Slide up")}</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground"><T>Plays in Apple Mail and iOS; shown static everywhere else. Paused here while you edit.</T></p>
      </>}
      {uploading && <div role="status" className="space-y-1 text-xs"><T>Uploading media…</T> {progress}%<progress aria-label={t("Upload progress")} className="h-2 w-full" max={100} value={progress} /></div>}
      <details open className="border-t pt-4">
        <summary className="cursor-pointer py-1 text-sm font-semibold"><T>Section style</T></summary>
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><T>Background</T><input type="color" aria-label={t("Background color")} className="mt-1 h-10 w-full cursor-pointer rounded border bg-background p-1" value={block.style?.backgroundColor || (block.type === "button" ? "#b7791f" : "#ffffff")} onChange={(event) => style({ backgroundColor: event.target.value })} /></label>
            {hasText && <label className="text-sm"><T>Text color</T><input type="color" aria-label={t("Text color")} className="mt-1 h-10 w-full cursor-pointer rounded border bg-background p-1" value={block.style?.textColor || (block.type === "button" ? "#ffffff" : "#13213c")} onChange={(event) => style({ textColor: event.target.value })} /></label>}
          </div>
          {hasText && <>
            <label className="block text-sm"><T>Font</T><select className={studioInput} value={block.style?.fontFamily || (block.type === "heading" ? "serif" : "sans")} onChange={(event) => style({ fontFamily: event.target.value as "sans" | "serif" })}>
              <option value="sans">{t("Arial · clean")}</option><option value="serif">{t("Georgia · editorial")}</option></select></label>
            <label className="block text-sm"><T>Text size</T><select className={studioInput} value={block.style?.fontSize || (block.type === "heading" ? 26 : block.type === "button" ? 15 : block.type === "gallery" ? 14 : 16)} onChange={(event) => style({ fontSize: Number(event.target.value) })}>
              {[12, 14, 15, 16, 18, 20, 24, 26, 32, 40, 48].map((size) => <option key={size} value={size}>{size}px</option>)}
            </select></label>
            <label className="block text-sm"><T>Alignment</T><select className={studioInput} value={block.style?.align || (block.type === "text" ? block.align : "left") || "left"} onChange={(event) => style({ align: event.target.value as "left" | "center" })}>
              <option value="left">{t("Left")}</option><option value="center">{t("Center")}</option></select></label>
          </>}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><T>Padding</T><select className={studioInput} value={block.style?.padding ?? 0} onChange={(event) => style({ padding: Number(event.target.value) })}>
              {[0, 8, 16, 24, 32, 48].map((size) => <option key={size} value={size}>{size}px</option>)}</select></label>
            <label className="text-sm"><T>Corners</T><select className={studioInput} value={block.style?.radius ?? (block.type === "image" || block.type === "gallery" || block.type === "video" ? 12 : block.type === "button" ? 11 : 0)} onChange={(event) => style({ radius: Number(event.target.value) })}>
              {[0, 4, 8, 11, 12, 16, 24].map((size) => <option key={size} value={size}>{size}px</option>)}</select></label>
          </div>
          <button type="button" className="min-h-10 text-sm underline underline-offset-4" onClick={() => patch({ style: undefined })}><T>Reset section style</T></button>
        </div>
      </details>
    </fieldset>
  </div>;
}
