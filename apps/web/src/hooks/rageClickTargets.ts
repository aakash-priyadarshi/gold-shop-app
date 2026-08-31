const LOW_SIGNAL_RAGE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "label",
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="slider"]',
].join(",");

/** Rapid toggles on form controls are expected; stuck buttons are not. */
export function isLowSignalRageTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(LOW_SIGNAL_RAGE_SELECTOR));
}
