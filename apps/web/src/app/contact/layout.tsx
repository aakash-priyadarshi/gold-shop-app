import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Contact Orivraa | Sales & Support for Jewellery Shop Software",
  description:
    "Get in touch with the Orivraa team for sales, demos and support. Email sales@orivraa.com or support@orivraa.com, or call +91 62039 65557. We help jewellery shops across India, Nepal, UAE, UK and US go digital with billing, POS, inventory and live gold rates.",
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
    url: "https://www.orivraa.com/contact",
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
