import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Jewellery Ecommerce Software"),
  description:
    "Sell jewellery online with digital catalogues, live-rate pricing, and POS sync. No separate website required.",
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
