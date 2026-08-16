import type { DriveStep } from "driver.js";

/** Apply t() to tour popover copy so a later dictionary fill can refresh steps. */
export function translateTourSteps(
  source: DriveStep[],
  t: (text: string) => string,
): DriveStep[] {
  return source.map((step) => ({
    ...step,
    popover: step.popover
      ? {
          ...step.popover,
          title: step.popover.title ? t(step.popover.title) : step.popover.title,
          description: step.popover.description
            ? t(step.popover.description)
            : step.popover.description,
        }
      : step.popover,
  }));
}
