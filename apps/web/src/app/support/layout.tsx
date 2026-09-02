import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Orivraa Support for Jewellery Software"),
  description:
    "Get help with Orivraa jewellery purchases, shop billing, inventory, and platform issues from our support team.",
  alternates: { canonical: "/support" },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
