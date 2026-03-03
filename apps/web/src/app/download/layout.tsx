import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Orivraa App",
  description:
    "Download the Orivraa desktop app for Windows, macOS, and Linux. Browse jewellery, manage your shop, and connect with buyers — all from your desktop.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Download Orivraa App | Desktop & Mobile",
    description:
      "Get the Orivraa desktop app for a seamless jewellery shopping and selling experience.",
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
