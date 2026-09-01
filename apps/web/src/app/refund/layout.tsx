import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Refund Policy for Orivraa Jewellery Software"),
  description:
    "Orivraa refund and return policy for jewellery purchases and how buyers request support on the marketplace.",
  robots: { index: true, follow: true },
};

export default function RefundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
