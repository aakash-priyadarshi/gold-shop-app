import { describe, expect, it } from "vitest";
import {
  collectTourStrings,
  waitForTranslations,
} from "../wait-for-tour-translations";

describe("waitForTranslations", () => {
  it("collects popover copy so the tour can wait on English source keys", () => {
    expect(
      collectTourStrings([
        {
          element: "[data-tour='help']",
          popover: {
            title: "Need Help Anytime?",
            description: "Click the floating help button for a page tour.",
          },
        },
      ]),
    ).toEqual([
      "Need Help Anytime?",
      "Click the floating help button for a page tour.",
    ]);
  });

  it("resolves once a cold locale fills, instead of treating Hindi cache as special", async () => {
    const dict: Record<string, string> = {};
    const pending = waitForTranslations(
      ["Need Help Anytime?"],
      (text) => Boolean(dict[text]),
      {
        timeoutMs: 200,
        intervalMs: 10,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      },
    );

    dict["Need Help Anytime?"] = "צריך עזרה בכל רגע?";
    await expect(pending).resolves.toBe(true);
  });
});
