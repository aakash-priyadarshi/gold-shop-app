import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Jewellery Designs | Gold, Diamond & Silver Inspirations",
  description:
    "Explore AI-generated jewellery design ideas on Orivraa. Get inspired with unique gold, silver, diamond ring, necklace & earring designs. Custom jewellery design tool for buyers worldwide.",
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
