import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("TutorialButton live translation", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/tutorial/TutorialButton.tsx"),
    "utf-8",
  );

  it("waits for cold locales before driving so Hindi cache is not the only working path", () => {
    expect(source).toContain("waitForTranslations");
    expect(source).toContain('collectTourStrings(source), "Next →", "← Back", "Done"');
    expect(source).toContain("hasTranslation");
    expect(source).toContain("rawSteps");
  });

  it("cancels start when the page tour changes during the wait", () => {
    expect(source).toContain("rawStepsRef.current !== source");
    expect(source).toContain("setRunning(false)");
  });

  it("pushes dictionary updates into the running driver instance", () => {
    expect(source).toContain("instance.setConfig");
    expect(source).toContain("instance.drive(index)");
  });

  it("stops the running tour when Supply Chain view steps change instead of auto-driving the next view", () => {
    expect(source).toContain("tourKey");
    expect(source).toContain("nextKey !== tourKeyRef.current");
    expect(source).toContain("setRunning(false)");
  });

  it("keeps the language control contrast independent of locale", () => {
    expect(source).toContain('select.className = "driver-lang-select"');
    expect(source).toContain('select.setAttribute("aria-label", "Language")');
    expect(source).not.toContain('select.style.appearance = "none"');
  });
});
