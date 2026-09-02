import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Orivraa Platform Guidelines for Shops"),
  description:
    "Quality standards, listing rules, and community guidelines for jewellery sellers and buyers on Orivraa.",
  alternates: { canonical: "/platform-guidelines" },
  robots: { index: true, follow: true },
};

export default function PlatformGuidelinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
