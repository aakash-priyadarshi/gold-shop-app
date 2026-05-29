import type { Metadata } from "next";
import { SITE_URL } from "@/config/site";

function titleizeSlug(slug: string): string {
  const decoded = decodeURIComponent(slug || "").replace(/[-_]+/g, " ").trim();
  if (!decoded) return "Jewellery Catalogue";
  return decoded
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const name = titleizeSlug(params.slug);
  const title = `${name} Catalogue | Browse Jewellery on Orivraa`;
  const description = `Explore the ${name} collection on Orivraa — browse gold, silver and diamond pieces from verified jewellers, see live-rate pricing, and request custom designs or quotes online.`;
  const canonical = `/c/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function CatalogueSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
