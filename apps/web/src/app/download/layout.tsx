import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Download Orivraa Desktop App"),
  description:
    "Download the Orivraa desktop app for Windows and macOS to run jewellery billing, inventory, and shop tools from the counter.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Download Orivraa App | Desktop & Mobile",
    description:
      "Get the Orivraa app for a seamless jewellery shopping experience across 5+ countries.",
    url: "https://www.orivraa.com/download",
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
