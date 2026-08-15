"use client";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translation-provider";
import { LANGUAGES, type Language } from "@/store/preferences";
import {
  filterLocaleGroups,
  type LocaleGroup,
} from "@gold-shop/shared";
import { Check, ChevronDown, Globe, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Stable SSR label so persisted locale does not hydrate-mismatch. */
export const LANGUAGE_TRIGGER_PLACEHOLDER = "English";

export function getLanguageTriggerLabel(
  locale: Language,
  mounted: boolean,
): string {
  if (!mounted) return LANGUAGE_TRIGGER_PLACEHOLDER;
  return LANGUAGES[locale].nativeName;
}

export type LanguageMegaMenuVariant = "toolbar" | "field" | "compact";

interface LanguageMegaMenuPanelProps {
  value: Language;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (locale: Language) => void;
}

export function LanguageMegaMenuPanel({
  value,
  query,
  onQueryChange,
  onSelect,
}: LanguageMegaMenuPanelProps) {
  const t = useT();
  const groups = useMemo(() => filterLocaleGroups(query), [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("Search languages")}
          aria-label={t("Search languages")}
          className="h-9 ps-8 text-sm"
          autoComplete="off"
        />
      </div>

      {groups.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {t("No languages match")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <LanguageGroupColumn
              key={group.id}
              group={group}
              value={value}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageGroupColumn({
  group,
  value,
  onSelect,
}: {
  group: LocaleGroup;
  value: Language;
  onSelect: (locale: Language) => void;
}) {
  const t = useT();

  return (
    <div className="min-w-0">
      <p className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t(group.label)}
      </p>
      <ul className="flex flex-col gap-0.5">
        {group.locales.map((code) => {
          const info = LANGUAGES[code];
          const selected = code === value;
          return (
            <li key={code}>
              <button
                type="button"
                data-locale={code}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-start transition-colors",
                  selected
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                    : "hover:bg-muted/80",
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" dir="auto">
                    {info.nativeName}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {info.name}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface LanguageMegaMenuProps {
  value: Language;
  onValueChange: (locale: Language) => void;
  variant?: LanguageMegaMenuVariant;
  align?: "start" | "center" | "end";
  className?: string;
  triggerClassName?: string;
}

export function LanguageMegaMenu({
  value,
  onValueChange,
  variant = "toolbar",
  align = "end",
  className,
  triggerClassName,
}: LanguageMegaMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerLabel = getLanguageTriggerLabel(value, mounted);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="language-selector"
          aria-label={t("Language")}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-background text-xs font-medium text-gray-700 transition-colors hover:border-amber-300 dark:border-gray-700 dark:text-gray-200 dark:hover:border-amber-600",
            variant === "toolbar" && "h-9 px-2.5",
            variant === "compact" && "h-8 px-2",
            variant === "field" && "h-10 w-full justify-between px-3 text-sm",
            triggerClassName,
          )}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
          <span className="min-w-0 truncate" dir="auto">
            {triggerLabel}
          </span>
          <ChevronDown className="ms-auto h-3 w-3 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className={cn(
          "z-[80] w-[min(44rem,calc(100vw-1.25rem))] p-3",
          className,
        )}
      >
        <LanguageMegaMenuPanel
          value={value}
          query={query}
          onQueryChange={setQuery}
          onSelect={(locale) => {
            onValueChange(locale);
            setOpen(false);
            setQuery("");
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
