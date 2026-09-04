"use client";

import { T } from "@/components/ui/T";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  recoveryOffersApi,
  type OfferCampaign,
  type OfferEmailAnimation,
  type OfferEmailBlock,
} from "@/lib/api";
import { uploadEmailMedia } from "@/lib/image-upload";
import { useT } from "@/providers/translation-provider";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Heading1,
  Image as ImageIcon,
  Link2,
  Loader2,
  Minus,
  PlayCircle,
  Plus,
  Save,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EMAIL_BLOCK_PRESETS } from "./emailBlockPresets";

const BLOCK_TYPE_LABELS: Record<OfferEmailBlock["type"], string> = {
  heading: "Heading",
  text: "Text",
  image: "Image or GIF",
  video: "Demo video",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
};

const ANIMATION_OPTIONS: Array<{ value: OfferEmailAnimation; label: string }> = [
  { value: "none", label: "No animation" },
  { value: "fadeIn", label: "Fade in" },
  { value: "slideUp", label: "Slide up" },
];

function emptyBlock(type: OfferEmailBlock["type"]): OfferEmailBlock {
  switch (type) {
    case "heading":
      return { type, text: "" };
    case "text":
      return { type, text: "" };
    case "image":
      return { type, url: "", alt: "" };
    case "video":
      return { type, posterUrl: "", videoUrl: "", label: "Watch the demo" };
    case "button":
      return { type, label: "", url: "", variant: "primary" };
    case "divider":
      return { type };
    case "spacer":
      return { type, size: 24 };
  }
}

type Props = {
  campaign: OfferCampaign;
  open: boolean;
  locked: boolean;
  onClose: () => void;
  onSaved: (campaign: OfferCampaign) => void;
};

/**
 * Advanced block-based email designer for product-update campaigns.
 * Produces an email-safe design rendered server-side; animations are a
 * progressive enhancement that Gmail and Outlook show as static content.
 */
export function EmailBlockEditor({
  campaign,
  open,
  locked,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const t = useT();
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<OfferEmailBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{
    subject: string;
    html: string;
    bytes: number;
  } | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject(campaign.emailSubject);
    setPreview(null);
    const savedBlocks = campaign.emailDesign?.blocks;
    setBlocks(
      savedBlocks && savedBlocks.length > 0
        ? savedBlocks.map((block) => ({ ...block }))
        : EMAIL_BLOCK_PRESETS[0].blocks.map((block) => ({ ...block })),
    );
  }, [campaign, open]);

  if (!open) return null;

  const updateBlock = (index: number, patch: Partial<OfferEmailBlock>) => {
    setBlocks((current) =>
      current.map((block, i) =>
        i === index ? ({ ...block, ...patch } as OfferEmailBlock) : block,
      ),
    );
  };

  const moveBlock = (index: number, offset: -1 | 1) => {
    setBlocks((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const duplicateBlock = (index: number) => {
    setBlocks((current) => {
      if (current.length >= 40) return current;
      const next = [...current];
      next.splice(index + 1, 0, {
        ...current[index],
      } as OfferEmailBlock);
      return next;
    });
  };

  const removeBlock = (index: number) => {
    setBlocks((current) => current.filter((_, i) => i !== index));
  };

  const addBlock = (type: OfferEmailBlock["type"]) => {
    setBlocks((current) => {
      if (current.length >= 40) return current;
      return [...current, emptyBlock(type)];
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = EMAIL_BLOCK_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setBlocks(preset.blocks.map((block) => ({ ...block })));
  };

  const uploadMedia = async (
    key: string,
    file: File | undefined,
    onUploaded: (url: string) => void,
  ) => {
    if (!file) return;
    setUploadingKey(key);
    const result = await uploadEmailMedia(file);
    setUploadingKey(null);
    if (result.success && result.url) {
      onUploaded(result.url);
    } else {
      toast({
        title: t("The file could not be uploaded"),
        description: t(result.error || "Try a smaller image or video."),
        variant: "destructive",
      });
    }
  };

  const validate = (): string | null => {
    if (subject.trim().length < 3) {
      return "Write an email subject of at least 3 characters.";
    }
    if (blocks.length === 0) {
      return "Add at least one block to the email.";
    }
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (block.type === "heading" && block.text.trim().length < 1) {
        return `Block ${index + 1}: the heading needs text.`;
      }
      if (block.type === "text" && block.text.trim().length < 1) {
        return `Block ${index + 1}: the text block needs content.`;
      }
      if (block.type === "image") {
        if (!block.url.trim().startsWith("https://")) {
          return `Block ${index + 1}: upload an image or paste an https image link.`;
        }
        if (block.alt.trim().length < 1) {
          return `Block ${index + 1}: describe the image for accessibility (alt text).`;
        }
        if (
          block.linkUrl &&
          block.linkUrl.trim().length > 0 &&
          !block.linkUrl.trim().startsWith("https://")
        ) {
          return `Block ${index + 1}: the click link must start with https://`;
        }
      }
      if (block.type === "video") {
        if (!block.posterUrl.trim().startsWith("https://")) {
          return `Block ${index + 1}: choose a poster image (upload or https link).`;
        }
        if (!block.videoUrl.trim().startsWith("https://")) {
          return `Block ${index + 1}: paste the https link the demo button opens.`;
        }
      }
      if (block.type === "button") {
        if (block.label.trim().length < 1) {
          return `Block ${index + 1}: the button needs a label.`;
        }
        if (!block.url.trim().startsWith("https://")) {
          return `Block ${index + 1}: the button link must start with https://`;
        }
      }
      if (block.type === "spacer") {
        const size = block.size ?? 24;
        if (!Number.isInteger(size) || size < 8 || size > 120) {
          return `Block ${index + 1}: spacer height must be between 8 and 120.`;
        }
      }
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      toast({ title: t(problem), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await recoveryOffersApi.updateCampaignEmailDesign(
        campaign.key,
        { emailSubject: subject.trim(), blocks },
      );
      onSaved(response.data);
      toast({ title: t("Email design saved") });
    } catch (error) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast({
        title: t("The email design was not saved"),
        description: t(
          typeof message === "string" && message.trim()
            ? message
            : "Check the blocks and try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    const problem = validate();
    if (problem) {
      toast({ title: t(problem), variant: "destructive" });
      return;
    }
    setPreviewing(true);
    try {
      const response = await recoveryOffersApi.previewCampaignEmailDesign(
        campaign.key,
        { emailSubject: subject.trim(), blocks },
      );
      setPreview(response.data);
    } catch (error) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast({
        title: t("Email preview could not be created"),
        description: t(
          typeof message === "string" && message.trim()
            ? message
            : "Check the blocks and try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const resetDesign = async () => {
    if (
      !window.confirm(
        t(
          "Remove the designed email and go back to the simple template for this campaign?",
        ),
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const response = await recoveryOffersApi.clearCampaignEmailDesign(
        campaign.key,
      );
      onSaved(response.data);
      toast({ title: t("Back to the simple email template") });
    } catch {
      toast({
        title: t("The email design was not removed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="flex h-[94vh] w-[min(1180px,97vw)] max-w-none flex-col gap-3 overflow-hidden p-4 sm:p-5">
        <DialogHeader className="pr-8">
          <DialogTitle>
            <T>Design product-update email</T>
          </DialogTitle>
          <DialogDescription className="text-left">
            <T>
              Stack ready-made blocks into the announcement. Everything renders
              as email-safe HTML — animated GIFs play everywhere; CSS motion is
              a bonus in Apple Mail and iOS and stays static in Gmail and
              Outlook.
            </T>
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {preview.bytes > 90 * 1024 && (
              <div className="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900 dark:bg-orange-950/20 dark:text-orange-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <T>
                    This design renders close to Gmail's 102 KB clipping limit.
                    Remove or shrink a few blocks to keep it safe.
                  </T>{" "}
                  ({Math.round(preview.bytes / 1024)} KB)
                </span>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-white">
              <iframe
                title={t("Rendered email preview")}
                sandbox=""
                srcDoc={preview.html}
                className="h-full w-full bg-white"
              />
            </div>
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 font-semibold hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900"
              >
                <T>Back to editing</T>
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || locked}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <T>Save design</T>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              <label className="text-xs font-medium">
                <T>Email subject</T>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={locked}
                  maxLength={180}
                  className={inputClass}
                />
              </label>

              <div className="rounded-lg border bg-gray-50 p-3 dark:bg-gray-950/40">
                <p className="text-xs font-semibold">
                  <T>Start from a layout</T>
                </p>
                <div className="mt-2 space-y-2">
                  {EMAIL_BLOCK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      disabled={locked}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-left text-xs hover:border-violet-400 disabled:opacity-50 dark:bg-gray-950"
                    >
                      <span className="block font-semibold">
                        <T>{preset.label}</T>
                      </span>
                      <span className="block text-muted-foreground">
                        <T>{preset.description}</T>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {(campaign.emailDesign?.blocks.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => void resetDesign()}
                  disabled={saving || locked}
                  className="min-h-9 rounded-lg border px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300"
                >
                  <T>Remove design — use the simple template</T>
                </button>
              )}
            </div>

            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
              {blocks.map((block, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-white p-3 dark:bg-gray-950/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {block.type === "heading" ? (
                        <Heading1 className="h-3.5 w-3.5" />
                      ) : block.type === "text" ? (
                        <Type className="h-3.5 w-3.5" />
                      ) : block.type === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5" />
                      ) : block.type === "video" ? (
                        <PlayCircle className="h-3.5 w-3.5" />
                      ) : block.type === "button" ? (
                        <Square className="h-3.5 w-3.5" />
                      ) : block.type === "divider" ? (
                        <Minus className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {index + 1}. <T>{BLOCK_TYPE_LABELS[block.type]}</T>
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={t("Move block up")}
                        onClick={() => moveBlock(index, -1)}
                        disabled={locked || index === 0}
                        className="rounded-md border p-1.5 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("Move block down")}
                        onClick={() => moveBlock(index, 1)}
                        disabled={locked || index === blocks.length - 1}
                        className="rounded-md border p-1.5 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("Duplicate block")}
                        onClick={() => duplicateBlock(index)}
                        disabled={locked}
                        className="rounded-md border p-1.5 disabled:opacity-30"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("Remove block")}
                        onClick={() => removeBlock(index)}
                        disabled={locked}
                        className="rounded-md border p-1.5 text-red-600 disabled:opacity-30 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {block.type === "heading" && (
                      <>
                        <label className="text-xs font-medium md:col-span-2">
                          <T>Heading text</T>
                          <input
                            value={block.text}
                            onChange={(event) =>
                              updateBlock(index, {
                                text: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={120}
                            className={inputClass}
                          />
                        </label>
                        <AnimationSelect
                          value={block.animation}
                          onChange={(animation) =>
                            updateBlock(index, { animation })
                          }
                          disabled={locked}
                        />
                      </>
                    )}

                    {block.type === "text" && (
                      <>
                        <label className="text-xs font-medium md:col-span-2">
                          <T>Message</T>
                          <textarea
                            value={block.text}
                            onChange={(event) =>
                              updateBlock(index, {
                                text: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={2000}
                            rows={4}
                            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 disabled:opacity-60 dark:bg-gray-950"
                          />
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            <T>
                              **bold**, *italic*, and [link labels](https://…)
                              are supported. Blank lines start a new paragraph.
                            </T>
                          </span>
                        </label>
                        <label className="text-xs font-medium">
                          <T>Alignment</T>
                          <select
                            value={block.align || "left"}
                            onChange={(event) =>
                              updateBlock(index, {
                                align: event.target.value as "left" | "center",
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            className={inputClass}
                          >
                            <option value="left">{t("Left")}</option>
                            <option value="center">{t("Center")}</option>
                          </select>
                        </label>
                        <AnimationSelect
                          value={block.animation}
                          onChange={(animation) =>
                            updateBlock(index, { animation })
                          }
                          disabled={locked}
                        />
                      </>
                    )}

                    {block.type === "image" && (
                      <>
                        <MediaUrlField
                          label="Image or GIF"
                          value={block.url}
                          accept="image/*"
                          locked={locked}
                          uploading={uploadingKey === `image-${index}`}
                          onFile={(file) =>
                            void uploadMedia(`image-${index}`, file, (url) =>
                              updateBlock(index, { url } as Partial<OfferEmailBlock>),
                            )
                          }
                          onChange={(url) =>
                            updateBlock(index, { url } as Partial<OfferEmailBlock>)
                          }
                        />
                        <label className="text-xs font-medium">
                          <T>Alt text</T>
                          <input
                            value={block.alt}
                            onChange={(event) =>
                              updateBlock(index, {
                                alt: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={200}
                            className={inputClass}
                          />
                        </label>
                        <label className="text-xs font-medium">
                          <T>Click link (optional)</T>
                          <input
                            type="url"
                            value={block.linkUrl || ""}
                            onChange={(event) =>
                              updateBlock(index, {
                                linkUrl: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={500}
                            className={inputClass}
                          />
                        </label>
                        <AnimationSelect
                          value={block.animation}
                          onChange={(animation) =>
                            updateBlock(index, { animation })
                          }
                          disabled={locked}
                        />
                      </>
                    )}

                    {block.type === "video" && (
                      <>
                        <MediaUrlField
                          label="Poster image or GIF"
                          value={block.posterUrl}
                          accept="image/*"
                          locked={locked}
                          uploading={uploadingKey === `poster-${index}`}
                          onFile={(file) =>
                            void uploadMedia(
                              `poster-${index}`,
                              file,
                              (url) =>
                                updateBlock(
                                  index,
                                  { posterUrl: url } as Partial<OfferEmailBlock>,
                                ),
                            )
                          }
                          onChange={(posterUrl) =>
                            updateBlock(
                              index,
                              { posterUrl } as Partial<OfferEmailBlock>,
                            )
                          }
                        />
                        <MediaUrlField
                          label="Demo video or page link"
                          value={block.videoUrl}
                          accept="video/mp4,video/webm"
                          locked={locked}
                          uploading={uploadingKey === `video-${index}`}
                          onFile={(file) =>
                            void uploadMedia(
                              `video-${index}`,
                              file,
                              (url) =>
                                updateBlock(
                                  index,
                                  { videoUrl: url } as Partial<OfferEmailBlock>,
                                ),
                            )
                          }
                          onChange={(videoUrl) =>
                            updateBlock(
                              index,
                              { videoUrl } as Partial<OfferEmailBlock>,
                            )
                          }
                        />
                        <label className="text-xs font-medium">
                          <T>Button label</T>
                          <input
                            value={block.label || ""}
                            onChange={(event) =>
                              updateBlock(index, {
                                label: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={80}
                            className={inputClass}
                          />
                        </label>
                        <AnimationSelect
                          value={block.animation}
                          onChange={(animation) =>
                            updateBlock(index, { animation })
                          }
                          disabled={locked}
                        />
                      </>
                    )}

                    {block.type === "button" && (
                      <>
                        <label className="text-xs font-medium">
                          <T>Button label</T>
                          <input
                            value={block.label}
                            onChange={(event) =>
                              updateBlock(index, {
                                label: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={60}
                            className={inputClass}
                          />
                        </label>
                        <label className="text-xs font-medium">
                          <T>Link</T>
                          <input
                            type="url"
                            value={block.url}
                            onChange={(event) =>
                              updateBlock(index, {
                                url: event.target.value,
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            maxLength={500}
                            className={inputClass}
                          />
                        </label>
                        <label className="text-xs font-medium">
                          <T>Style</T>
                          <select
                            value={block.variant || "primary"}
                            onChange={(event) =>
                              updateBlock(index, {
                                variant: event.target.value as
                                  | "primary"
                                  | "secondary",
                              } as Partial<OfferEmailBlock>)
                            }
                            disabled={locked}
                            className={inputClass}
                          >
                            <option value="primary">{t("Gold")}</option>
                            <option value="secondary">{t("Dark")}</option>
                          </select>
                        </label>
                      </>
                    )}

                    {block.type === "spacer" && (
                      <label className="text-xs font-medium">
                        <T>Height (8–120 px)</T>
                        <input
                          type="number"
                          min={8}
                          max={120}
                          value={block.size ?? 24}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const parsed =
                              raw.trim() === "" ? undefined : Number(raw);
                            updateBlock(index, {
                              size: parsed,
                            } as Partial<OfferEmailBlock>);
                          }}
                          disabled={locked}
                          className={inputClass}
                        />
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          <T>Empty resets to a 24 px gap.</T>
                        </span>
                      </label>
                    )}

                    {block.type === "divider" && (
                      <p className="text-xs text-muted-foreground md:col-span-2">
                        <T>A thin gold rule that separates sections.</T>
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-dashed p-3">
                <p className="text-xs font-semibold">
                  <T>Add a block</T>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["heading", "Heading", Heading1],
                      ["text", "Text", Type],
                      ["image", "Image or GIF", ImageIcon],
                      ["video", "Demo video", PlayCircle],
                      ["button", "Button", Square],
                      ["divider", "Divider", Minus],
                      ["spacer", "Spacer", Plus],
                    ] as const
                  ).map(([type, label, Icon]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      disabled={locked}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-950 dark:hover:bg-gray-900"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <T>{label}</T>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!preview && (
          <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              <T>
                Only https links are allowed. Unsubscribe and brand headers are
                added automatically.
              </T>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void runPreview()}
                disabled={previewing || saving || locked}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-white px-4 font-semibold hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-950 dark:hover:bg-gray-900"
              >
                {previewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <T>Preview email</T>
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || previewing || locked}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <T>Save design</T>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AnimationSelect({
  value,
  onChange,
  disabled,
}: {
  value?: OfferEmailAnimation;
  onChange: (animation: OfferEmailAnimation | undefined) => void;
  disabled: boolean;
}) {
  const t = useT();
  return (
    <label className="text-xs font-medium">
      <T>Entrance animation</T>
      <select
        value={value || "none"}
        onChange={(event) =>
          onChange(
            event.target.value === "none"
              ? undefined
              : (event.target.value as OfferEmailAnimation),
          )
        }
        disabled={disabled}
        className="mt-1 min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
      >
        {ANIMATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-[11px] text-muted-foreground">
        <T>Plays in Apple Mail and iOS; shown static everywhere else.</T>
      </span>
    </label>
  );
}

function MediaUrlField({
  label,
  value,
  accept,
  locked,
  uploading,
  onFile,
  onChange,
}: {
  label: string;
  value: string;
  accept: string;
  locked: boolean;
  uploading: boolean;
  onFile: (file: File | undefined) => void;
  onChange: (url: string) => void;
}) {
  const t = useT();
  return (
    <label className="text-xs font-medium">
      <T>{label}</T>
      <div className="mt-1 flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={locked}
          maxLength={500}
          className="min-h-10 w-full rounded-lg border bg-white px-3 disabled:opacity-60 dark:bg-gray-950"
        />
        <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-900">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          <T>Upload</T>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={locked || uploading}
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </label>
  );
}
