import { describe, expect, it } from "vitest";
import { translateTourSteps } from "../translate-tour-steps";

describe("translateTourSteps", () => {
  it("re-reads t() after the dictionary fills so Hindi-cached locales are not special-cased", () => {
    const raw = [
      {
        element: "[data-tour='help']",
        popover: {
          title: "Need Help Anytime?",
          description: "Click the floating help button for a page tour.",
        },
      },
    ];
    const dict: Record<string, string> = {};
    const t = (text: string) => dict[text] || text;

    const before = translateTourSteps(raw, t);
    expect(before[0].popover?.title).toBe("Need Help Anytime?");

    dict["Need Help Anytime?"] = "צריך עזרה בכל רגע?";
    dict["Click the floating help button for a page tour."] =
      "לחץ על כפתור העזרה לסיור בעמוד.";

    const after = translateTourSteps(raw, t);
    expect(after[0].popover?.title).toBe("צריך עזרה בכל רגע?");
    expect(after[0].popover?.description).toBe(
      "לחץ על כפתור העזרה לסיור בעמוד.",
    );
  });
});
