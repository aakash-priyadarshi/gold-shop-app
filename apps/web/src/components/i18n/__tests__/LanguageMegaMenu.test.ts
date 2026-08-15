import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  getLanguageTriggerLabel,
  LANGUAGE_TRIGGER_PLACEHOLDER,
  LanguageMegaMenu,
  LanguageMegaMenuPanel,
} from "../LanguageMegaMenu";

describe("LanguageMegaMenuPanel", () => {
  it("renders grouped languages and reports the selected locale", () => {
    const onSelect = vi.fn();
    render(
      createElement(LanguageMegaMenuPanel, {
        value: "en",
        query: "",
        onQueryChange: () => {},
        onSelect,
      }),
    );

    expect(screen.getByText("South Asia")).toBeInTheDocument();
    expect(screen.getByText("Middle East")).toBeInTheDocument();
    expect(screen.getByText("हिन्दी")).toBeInTheDocument();
    expect(screen.getByText("עברית")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /हिन्दी/ }));
    expect(onSelect).toHaveBeenCalledWith("hi");
  });

  it("filters the mega menu down to Hindi by native name", () => {
    render(
      createElement(LanguageMegaMenuPanel, {
        value: "en",
        query: "हिन्दी",
        onQueryChange: () => {},
        onSelect: () => {},
      }),
    );

    expect(screen.getByText("हिन्दी")).toBeInTheDocument();
    expect(screen.queryByText("עברית")).not.toBeInTheDocument();
    expect(screen.getByText("South Asia")).toBeInTheDocument();
  });

  it("filters the mega menu down to Hebrew", () => {
    const onQueryChange = vi.fn();
    render(
      createElement(LanguageMegaMenuPanel, {
        value: "en",
        query: "hebrew",
        onQueryChange,
        onSelect: () => {},
      }),
    );

    expect(screen.getByText("עברית")).toBeInTheDocument();
    expect(screen.queryByText("हिन्दी")).not.toBeInTheDocument();
    expect(screen.getByText("Middle East")).toBeInTheDocument();
    expect(screen.queryByText("South Asia")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    render(
      createElement(LanguageMegaMenuPanel, {
        value: "en",
        query: "zzzz-not-a-language",
        onQueryChange: () => {},
        onSelect: () => {},
      }),
    );
    expect(screen.getByText("No languages match")).toBeInTheDocument();
  });
});

describe("LanguageMegaMenu hydration", () => {
  it("keeps the trigger on English until the client has mounted", () => {
    expect(getLanguageTriggerLabel("he", false)).toBe(
      LANGUAGE_TRIGGER_PLACEHOLDER,
    );
    expect(getLanguageTriggerLabel("he", true)).toBe("עברית");
    expect(getLanguageTriggerLabel("hi", true)).toBe("हिन्दी");
  });

  it("puts the optional id on the trigger so a Label htmlFor can associate", () => {
    render(
      createElement(LanguageMegaMenu, {
        id: "language",
        value: "en",
        onValueChange: () => {},
      }),
    );
    expect(screen.getByRole("button", { name: "Language" })).toHaveAttribute(
      "id",
      "language",
    );
  });

  it("shows the persisted native name after mount", () => {
    render(
      createElement(LanguageMegaMenu, {
        value: "he",
        onValueChange: () => {},
      }),
    );
    expect(screen.getByRole("button", { name: "Language" })).toHaveTextContent(
      "עברית",
    );
  });
});
