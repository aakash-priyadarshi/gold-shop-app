import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Partner | Join Our Jewellery Network",
  description:
    "Partner with Orivraa to grow your jewellery business internationally. Join our marketplace network and reach buyers across Nepal, India, Dubai, USA & UK.",
  alternates: { canonical: "/partner" },
  openGraph: {
    title: "Become a Partner | Orivraa",
    description:
      "Expand your jewellery business internationally with Orivraa's partner network across 5+ countries.",
    url: "https://www.orivraa.com/partner",
  },
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
