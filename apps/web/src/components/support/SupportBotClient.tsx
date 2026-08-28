"use client";

import dynamic from "next/dynamic";

// SupportBot reads browser storage and creates a browser-tab session ID during
// render, so keep the browser-only dynamic boundary inside a Client Component.
const SupportBot = dynamic(
  () =>
    import("@/components/support/SupportBot").then(
      (module) => module.SupportBot,
    ),
  { ssr: false },
);

export function SupportBotClient() {
  return <SupportBot />;
}
