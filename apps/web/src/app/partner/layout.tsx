import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Partner",
  description:
    "Partner with Orivraa to grow your jewellery business. Join our marketplace network and reach thousands of buyers across Nepal, India, and beyond.",
  alternates: { canonical: "/partner" },
  openGraph: {
    title: "Become a Partner | Orivraa",
    description:
      "Join Orivraa's partner network and expand your jewellery business reach.",
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
