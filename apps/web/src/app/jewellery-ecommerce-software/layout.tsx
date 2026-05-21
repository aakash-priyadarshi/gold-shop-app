import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery Ecommerce Software — Sell Gold & Diamond Online | Orivraa 2026",
  description:
    "Best ecommerce software for jewellery shops. Built-in marketplace, digital catalogues, multi-currency pricing, live rate-aware product updates, and mobile POS sync for online and walk-in sales. Sell jewellery online without a website. India Pro ₹299/month · Nepal NPR 399 · UK £9.99 · UAE AED 39.99 · US $12.99. Free plan always available.",
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
    "jewellery catalogue mobile POS sync",
    "live gold rate ecommerce software",
    "jewellery online selling platform",
    "gold shop online",
  ],
  alternates: { canonical: "/jewellery-ecommerce-software" },
  openGraph: {
    title: "Jewellery Ecommerce Software — Sell Online | Orivraa",
    description:
      "Sell jewellery online through Orivraa's marketplace. Digital catalogues, multi-currency, live rate-aware product updates, and POS sync. No website needed.",
    url: "https://www.orivraa.com/jewellery-ecommerce-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Ecommerce Software — Starts Free | Orivraa",
    description:
      "Sell gold and diamond jewellery online with marketplace access, digital catalogues, multi-currency pricing, live rate context, and POS sync.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
