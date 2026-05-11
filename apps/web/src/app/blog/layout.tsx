import { Metadata } from "next";
import { BLOG_POSTS } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Jewellery Business Blog — Tips, Guides & Software Reviews | Orivraa",
  description:
    "Expert guides on jewellery shop software, billing software, tax reports, GST billing, inventory management, selling online, and growing your jewellery business.",
  keywords: [
    "jewellery business blog",
    "jewellery shop tips",
    "gold shop software guide",
    "jewellery billing software",
    "tax reports for jewellers",
    "jewellery inventory management",
    "jewellery software comparison",
    "sell jewellery online",
    "jewellery GST guide",
    "billing software India",
    "jewellery shop management tips",
    "gold business guide",
    "jewellery ERP blog",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Jewellery Business Blog | Orivraa",
    description:
      "Expert guides on jewellery shop software, billing software, tax reports, inventory management, and growing your gold & diamond business.",
    url: "https://www.orivraa.com/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Business Blog | Orivraa",
    description:
      "Expert guides on jewellery shop software, billing software, tax reports, inventory management, and growing your gold & diamond business.",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
