import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("SupportBot i18n leftovers", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/support/SupportBot.tsx"),
    "utf-8",
  );

  it("translates quick-ask chips but still sends the English prompt to the bot", () => {
    expect(source).toContain("onClick={() => void send(q)}");
    expect(source).toContain("<T>{q}</T>");
  });

  it("translates launcher chrome so Hindi cache is not the only working locale", () => {
    expect(source).toContain('placeholder={t("Ask anything about Orivraa...")}');
    expect(source).toContain("<T>Need a human?</T>");
    expect(source).toContain("<T>Hide</T>");
  });
});
