import { describe, expect, it } from "vitest";
import { isLowSignalRageTarget } from "../rageClickTargets";

describe("isLowSignalRageTarget", () => {
  it("ignores checkboxes, inputs, and labels", () => {
    const input = document.createElement("input");
    input.type = "checkbox";
    document.body.appendChild(input);
    expect(isLowSignalRageTarget(input)).toBe(true);

    const label = document.createElement("label");
    label.appendChild(document.createTextNode("Gold 22K"));
    document.body.appendChild(label);
    expect(isLowSignalRageTarget(label)).toBe(true);
  });

  it("keeps save buttons as a real frustration signal", () => {
    const button = document.createElement("button");
    button.textContent = "Save Materials";
    document.body.appendChild(button);
    expect(isLowSignalRageTarget(button)).toBe(false);
    expect(isLowSignalRageTarget(button.firstChild)).toBe(false);
  });
});
