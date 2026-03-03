import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Orivraa App | Shop Jewellery from Desktop",
  description:
    "Download the Orivraa desktop app for Windows, macOS, and Linux. Browse jewellery from Nepal, India, Dubai, USA & UK. Manage your shop and connect with buyers worldwide.",
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
