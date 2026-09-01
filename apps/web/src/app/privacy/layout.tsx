import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Privacy Policy for Orivraa Jewellery Software"),
  description:
    "How Orivraa collects, uses, and protects personal data for jewellery shops, buyers, and marketplace accounts.",
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
