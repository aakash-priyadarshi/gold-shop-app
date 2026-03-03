import { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/shops/${id}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const shop = await res.json();
      const shopName = shop.shopName || shop.name || "Jewellery Shop";
      const city = shop.city || "";
      const country = shop.country || "";
      const location = [city, country].filter(Boolean).join(", ");

      return {
        title: `${shopName}${location ? ` — ${location}` : ""}`,
        description: `Shop gold, silver, and custom jewellery from ${shopName}${location ? ` in ${location}` : ""}. Verified seller on Orivraa with quality guaranteed products.`,
        alternates: { canonical: `/shops/${id}` },
        openGraph: {
          title: `${shopName} | Orivraa`,
          description: `Browse jewellery collections from ${shopName}. Verified quality, trusted artisan.`,
          url: `https://www.orivraa.com/shops/${id}`,
          ...(shop.logoUrl && {
            images: [
              {
                url: shop.logoUrl,
                width: 400,
                height: 400,
                alt: `${shopName} logo`,
              },
            ],
          }),
        },
      };
    }
  } catch {
    // Fall through to default
  }

  return {
    title: "Jewellery Shop",
    description:
      "Browse jewellery from a verified shop on Orivraa — the premium jewellery marketplace.",
    alternates: { canonical: `/shops/${id}` },
  };
}

export default function ShopProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
