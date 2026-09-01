import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Terms of Service for Orivraa Jewellery Software"),
  description:
    "Rules and agreements for using Orivraa jewellery shop software, billing tools, and the marketplace platform.",
  robots: { index: true, follow: true },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
