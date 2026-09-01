import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";
import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("AI Jewellery Design Ideas"),
  description:
    "Explore AI jewellery design ideas for gold, silver, and diamond rings, necklaces, and earrings. Get inspired before you buy or make.",
  keywords: [
    "jewellery design",
    "AI jewellery design",
    "gold ring design",
    "necklace design",
    "custom jewellery design",
    "diamond ring design",
    "earring design ideas",
  ],
  alternates: { canonical: "/designs" },
  openGraph: {
    title: "AI Jewellery Designs | Orivraa",
    description:
      "Discover unique AI-generated jewellery designs — gold rings, diamond necklaces, bridal sets & more.",
    url: "https://www.orivraa.com/designs",
  },
};

export default function DesignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
