import type { DriveStep } from "driver.js";

export function collectTourStrings(steps: DriveStep[]): string[] {
  const texts: string[] = [];
  for (const step of steps) {
    if (step.popover?.title) texts.push(step.popover.title);
    if (step.popover?.description) texts.push(step.popover.description);
  }
  return texts;
}

/**
 * Hindi often appears instantly because Translation rows already exist.
 * Other locales stay English if the tour starts before the batch flush lands.
 */
export async function waitForTranslations(
  texts: string[],
  hasTranslation: (text: string) => boolean,
  options?: { timeoutMs?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> },
): Promise<boolean> {
  const unique = Array.from(
    new Set(texts.filter((text) => text.trim().length > 0)),
  );
  if (unique.length === 0) return true;

  const timeoutMs = options?.timeoutMs ?? 3000;
  const intervalMs = options?.intervalMs ?? 50;
  const sleep =
    options?.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (unique.every((text) => hasTranslation(text))) return true;
    await sleep(intervalMs);
  }
  return unique.every((text) => hasTranslation(text));
}
