import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery Ecommerce Software — Sell Gold & Diamond Online | Orivraa 2026",
  description:
    "Best ecommerce software for jewellery shops. Built-in marketplace, digital catalogues, multi-currency pricing, international shipping, WhatsApp sharing. Sell jewellery online without building a website. Starts free.",
  keywords: [
    "jewellery ecommerce software",
    "sell jewellery online",
    "jewellery online store",
    "gold ecommerce platform",
    "jewellery marketplace software",
    "online jewellery shop",
    "jewellery website builder",
    "sell gold online",
    "diamond ecommerce",
    "jewellery digital catalogue",
    "jewellery online selling platform",
    "gold shop online",
  ],
  alternates: { canonical: "/jewellery-ecommerce-software" },
  openGraph: {
    title: "Jewellery Ecommerce Software — Sell Online | Orivraa",
    description:
      "Sell jewellery online through Orivraa's marketplace. Digital catalogues, multi-currency, international buyers. No website needed. Free to start.",
    url: "https://www.orivraa.com/jewellery-ecommerce-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Ecommerce Software — Starts Free | Orivraa",
    description:
      "Sell gold & diamond jewellery online. Built-in marketplace, digital catalogues, multi-currency. 2000+ jewellers trust Orivraa.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
