import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { T } from "@/components/ui/T";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";

type SettingsSaveStatusProps = {
  status: AutoSaveStatus;
  idleLabel?: string;
};

export function SettingsSaveStatus({
  status,
  idleLabel = "Changes save automatically",
}: SettingsSaveStatusProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === "saved" && (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      )}
      {status === "error" && (
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      )}
      <T>
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Saved automatically"
            : status === "error"
              ? "Could not save automatically"
              : idleLabel}
      </T>
    </span>
  );
}
