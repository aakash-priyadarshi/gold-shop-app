import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Download Orivraa Desktop App for Windows & Mac",
  description:
    "Download the Orivraa desktop app for Windows and macOS to run jewellery billing, inventory, and shop tools from the counter.",
  path: "/download",
  keywords: [
    "download orivraa",
    "jewellery software for windows",
    "jewellery billing software for mac",
    "desktop pos jewellery",
  ],
});

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

