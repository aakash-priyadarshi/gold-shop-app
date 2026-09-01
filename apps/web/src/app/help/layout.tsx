import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Help Centre for Orivraa Jewellery Software"),
  description:
    "FAQs, buying guides, shipping help, and seller support for jewellery buyers and shops using Orivraa.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Centre | Orivraa",
    description:
      "Find answers to common questions about buying and selling jewellery on Orivraa.",
    url: "https://www.orivraa.com/help",
  },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
