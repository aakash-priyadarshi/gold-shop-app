import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Centre | FAQs & Buyer/Seller Support",
  description:
    "Get help with Orivraa — FAQs, buying guides, shipping info, and seller support. Serving jewellery buyers and sellers in Nepal, India, Dubai, USA & UK.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Centre | Orivraa",
    description:
      "Find answers to common questions about buying and selling jewellery on Orivraa.",
    url: "https://www.orivraa.com/help",
  },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
