import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa Desktop App Changelog & Release Notes",
  description:
    "Release notes and changelog updates for Orivraa desktop application on Windows and macOS.",
  path: "/download/changelog",
  keywords: [
    "orivraa changelog",
    "desktop app release notes",
    "jewellery software updates",
    "gold shop pos changelog",
  ],
});

export default function DownloadChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
