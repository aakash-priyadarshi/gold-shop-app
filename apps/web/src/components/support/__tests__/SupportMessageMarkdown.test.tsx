import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupportMessageMarkdown } from "../SupportMessageMarkdown";

const { t } = vi.hoisted(() => ({ t: vi.fn((value: string) => value) }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => t }));

afterEach(() => {
  cleanup();
  t.mockClear();
});

describe("SupportMessageMarkdown", () => {
  it("renders structured answers with semantic Markdown elements", () => {
    const { container } = render(
      <SupportMessageMarkdown
        text={`# Workshop

## Features

### Jobs

#### Production

##### Metal

###### Reports

**Job Tracking** and *Quality Control* with \`jobId\`.

- Create jobs
  - Set priorities
- Approve

1. Review
2. Receive

> Check the weight.

---

\`\`\`js
const job = "ready";
\`\`\`

Another paragraph.`}
      />,
    );

    expect(screen.getAllByRole("heading")).toHaveLength(6);
    expect(screen.getByText("Job Tracking").tagName).toBe("STRONG");
    expect(screen.getByText("Quality Control").tagName).toBe("EM");
    expect(container.querySelector("li > ul > li")).toHaveTextContent(
      "Set priorities",
    );
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("blockquote")).toHaveTextContent(
      "Check the weight.",
    );
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("jobId").tagName).toBe("CODE");
    expect(screen.getByLabelText("Code block")).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByLabelText("Code block")).toHaveClass("overflow-x-auto");
    expect(container.querySelector("pre code")).toHaveTextContent(
      'const job = "ready";',
    );
    expect(screen.getByText("Another paragraph.").tagName).toBe("P");
    expect(container.querySelector("p table, p pre, p ul")).toBeNull();
  });

  it("renders a GFM table with headers and an accessible scroll region", () => {
    render(
      <SupportMessageMarkdown
        text={`| Area | Purpose |
| --- | ---: |
| Jobs | Work orders |
| Metal | Physical metal tracking |`}
      />,
    );

    const region = screen.getByRole("region", {
      name: "Scrollable response table",
    });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass(
      "max-w-full",
      "overflow-x-auto",
      "dark:border-amber-900",
    );
    const table = within(region).getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(2);
    expect(
      within(table).getByRole("columnheader", { name: "Area" }),
    ).toHaveAttribute("scope", "col");
    expect(
      within(table).getByRole("cell", { name: "Work orders" }),
    ).toHaveStyle({ textAlign: "right" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("keeps safe internal, external, contact, and GFM autolinks", () => {
    render(
      <SupportMessageMarkdown
        text={`[Jobs](/dashboard/shop/supply-chain?view=jobs)
[Docs](https://example.com/help)
[External](//example.com/help)
[Email](mailto:support@example.com)
[Call](tel:+123456789)
https://example.com/auto`}
      />,
    );
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/dashboard/shop/supply-chain?view=jobs",
    );
    expect(screen.getByRole("link", { name: "Jobs" })).not.toHaveAttribute(
      "target",
    );
    for (const name of ["Docs", "External", "https://example.com/auto"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "target",
        "_blank",
      );
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    }
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:support@example.com",
    );
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute(
      "href",
      "tel:+123456789",
    );
  });

  it.each([
    "javascript:alert%281%29",
    "JaVaScRiPt:alert%281%29",
    "java&#x73;cript:alert%281%29",
    "java&#x09;script:alert%281%29",
    "data:text/html;base64,PHNjcmlwdD4=",
    "vbscript:msgbox%281%29",
    "file:///etc/passwd",
  ])("does not create a clickable unsafe URL: %s", (url) => {
    const { container } = render(
      <SupportMessageMarkdown text={`[Unsafe](${url})`} />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Unsafe");
  });

  it("never mounts model HTML or fetches model-provided images", () => {
    const { container } = render(
      <SupportMessageMarkdown
        text={`<script>alert('xss')</script>

<iframe src="https://tracker.example/embed"></iframe>

<img src="https://tracker.example/pixel" onerror="alert(1)">

![Product preview](https://tracker.example/image?user=private)

![Inline SVG](data:image/svg+xml;base64,PHN2Zz4=)

<T>Private model text</T>

<a href="javascript:alert(1)">Bad raw link</a>`}
      />,
    );
    expect(
      container.querySelector("script, iframe, img, svg, a, t"),
    ).toBeNull();
    expect(container.querySelector("[src], [onerror], [onclick]")).toBeNull();
    expect(screen.getByText("Product preview")).toBeInTheDocument();
    expect(screen.getByText("Inline SVG")).toBeInTheDocument();
    expect(t).not.toHaveBeenCalledWith("Private model text");
  });

  it("reparses partial answers as bold, tables, and code fences finish", () => {
    const { container, rerender } = render(
      <SupportMessageMarkdown text="**Job Track" />,
    );
    expect(container).toHaveTextContent("**Job Track");
    rerender(<SupportMessageMarkdown text="**Job Tracking**" />);
    expect(screen.getByText("Job Tracking").tagName).toBe("STRONG");

    rerender(<SupportMessageMarkdown text={"| Area | Purpose |\n| ---"} />);
    rerender(
      <SupportMessageMarkdown
        text={"| Area | Purpose |\n| --- | --- |\n| Jobs | Work orders |"}
      />,
    );
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(
      screen.getByRole("cell", { name: "Work orders" }),
    ).toBeInTheDocument();

    rerender(
      <SupportMessageMarkdown text={'```ts\nconst message = "partial'} />,
    );
    expect(container.querySelector("pre code")).toHaveTextContent(
      'const message = "partial',
    );
    rerender(
      <SupportMessageMarkdown
        text={
          '```ts\nconst message = "partial answer completed";\n```\n\nFinished.'
        }
      />,
    );
    expect(container.querySelectorAll("pre")).toHaveLength(1);
    expect(container.querySelector("pre code")).toHaveTextContent(
      'const message = "partial answer completed";',
    );
    expect(screen.getByText("Finished.").tagName).toBe("P");
  });
});
