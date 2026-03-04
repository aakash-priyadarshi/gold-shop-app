import { Metadata } from "next";
import { BLOG_POSTS } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Jewellery Business Blog — Tips, Guides & Software Reviews | Orivraa",
  description:
    "Expert guides on jewellery shop software, gold inventory management, GST billing, selling online, and growing your jewellery business. Trusted by 2000+ jewellers across Nepal, India, Dubai, USA & UK.",
  keywords: [
    "jewellery business blog",
    "jewellery shop tips",
    "gold shop software guide",
    "jewellery inventory management",
    "jewellery software comparison",
    "sell jewellery online",
    "jewellery GST guide",
    "jewellery shop management tips",
    "gold business guide",
    "jewellery ERP blog",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Jewellery Business Blog | Orivraa",
    description:
      "Expert guides on jewellery shop software, inventory management, and growing your gold & diamond business.",
    url: "https://www.orivraa.com/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Business Blog | Orivraa",
    description:
      "Expert guides on jewellery shop software, inventory management, and growing your gold & diamond business.",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
