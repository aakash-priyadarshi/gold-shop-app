import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { SITE_URL } from "@/config/site";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Contact Orivraa Support and Sales"),
  description:
    "Contact Orivraa for jewellery software demos and support. Email support@orivraa.com or call +91 62039 65557.",
  keywords: [
    "contact Orivraa",
    "Orivraa support",
    "jewellery software demo",
    "jewellery POS support",
    "Orivraa sales",
    "jewellery shop software contact",
  ],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Orivraa — Jewellery Shop Software Sales & Support",
    description: `Talk to the ${BRAND.name} team about demos, pricing and support for jewellery billing, POS and inventory software.`,
    url: `${SITE_URL}/contact`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Orivraa | Jewellery Software Sales & Support",
    description:
      "Reach the Orivraa team for demos, pricing and support for jewellery shop software.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
