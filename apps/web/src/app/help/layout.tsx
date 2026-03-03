import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Get help with Orivraa — FAQs, guides, and support for jewellery buyers and sellers on the premium jewellery marketplace.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Centre | Orivraa",
    description:
      "Find answers to common questions, buying guides, and seller support.",
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
