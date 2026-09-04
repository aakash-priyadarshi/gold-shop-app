"use client";

import { T } from "@/components/ui/T";
import {
  AI_ENHANCEMENT_MODEL_IDS,
  AI_GENERATION_MODEL_IDS,
  AI_IMAGE_MODELS,
  type AiEnhancementModelId,
  type AiGenerationModelId,
} from "@gold-shop/shared";
import { Check, Coins } from "lucide-react";

type PickerProps =
  | {
      capability: "enhancement";
      value: AiEnhancementModelId;
      onChange: (value: AiEnhancementModelId) => void;
      imageCount?: number;
    }
  | {
      capability: "generation";
      value: AiGenerationModelId;
      onChange: (value: AiGenerationModelId) => void;
      imageCount?: number;
    };

export function AiImageModelPicker(props: PickerProps) {
  const ids =
    props.capability === "enhancement"
      ? AI_ENHANCEMENT_MODEL_IDS
      : AI_GENERATION_MODEL_IDS;
  const imageCount = Math.max(1, props.imageCount || 1);

  return (
    <div
      className={`grid gap-2 ${ids.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      role="radiogroup"
      aria-label="AI image model"
    >
      {ids.map((id) => {
        const model = AI_IMAGE_MODELS[id];
        const selected = props.value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => props.onChange(id as never)}
            className={`relative min-h-20 rounded-lg border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              selected
                ? "border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-950/30"
                : "border-border bg-background hover:border-amber-300 hover:bg-muted/40"
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold">
                <T>{model.label}</T>
              </span>
              {selected ? (
                <Check className="h-4 w-4 shrink-0 text-amber-600" />
              ) : null}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              <T>{model.description}</T>
            </span>
            <span className="mt-2 flex items-center gap-1 text-xs font-medium tabular-nums text-foreground">
              <Coins className="h-3.5 w-3.5 text-amber-600" />
              {model.creditsPerImage * imageCount} <T>credits</T>
            </span>
          </button>
        );
      })}
    </div>
  );
}
