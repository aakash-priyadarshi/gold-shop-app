import { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/inventory/${id}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const item = await res.json();
      const title = item.nameEn || item.title || "Jewellery Item";
      const metal = item.metal || "";
      const purity = item.purity || "";
      const shopName = item.shop?.shopName || "";
      const price = item.priceNpr
        ? `NPR ${Number(item.priceNpr).toLocaleString()}`
        : "";

      const desc = [
        title,
        metal && purity ? `${purity} ${metal}` : metal,
        shopName ? `from ${shopName}` : "",
        price ? `at ${price}` : "",
        "| Buy online on Orivraa. Ships to Nepal, India, Dubai, USA & UK.",
      ]
        .filter(Boolean)
        .join(" ");

      const images = item.images?.[0]
        ? [{ url: item.images[0], width: 800, height: 800, alt: title }]
        : undefined;

      return {
        title,
        description: desc,
        alternates: { canonical: `/shop/${id}` },
        openGraph: {
          title: `${title} | Orivraa`,
          description: desc,
          url: `https://www.orivraa.com/shop/${id}`,
          type: "website",
          ...(images && { images }),
        },
      };
    }
  } catch {
    // Fall through to default
  }

  return {
    title: "Jewellery Item | Buy Online",
    description:
      "Explore this jewellery piece on Orivraa — verified quality, trusted artisans. Gold, silver & diamond jewellery available for Nepal, India, Dubai, USA & UK.",
    alternates: { canonical: `/shop/${id}` },
  };
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
