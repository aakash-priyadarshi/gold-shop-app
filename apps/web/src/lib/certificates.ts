export function isCertificatePdfUrl(url: string): boolean {
  if (!url) return false;
  return /\.pdf(\?|#|$)/i.test(url);
}

export type ProductCertificateGem = {
  type?: string;
  lab?: string;
  certNumber?: string;
  reportUrl?: string;
};

export function collectProductCertificates(source: {
  certificateUrl?: string | null;
  purityCertUrl?: string | null;
  gemstones?: ProductCertificateGem[] | null;
}): Array<{ kind: "hallmark" | "gemstone" | "stone"; label: string; url: string }> {
  const links: Array<{
    kind: "hallmark" | "gemstone" | "stone";
    label: string;
    url: string;
  }> = [];
  const hallmark = source.certificateUrl?.trim();
  if (hallmark) {
    links.push({ kind: "hallmark", label: "Hallmark certificate", url: hallmark });
  }
  const gem = source.purityCertUrl?.trim();
  if (gem) {
    links.push({ kind: "gemstone", label: "Gemstone certificate", url: gem });
  }
  for (const stone of source.gemstones ?? []) {
    const url = stone.reportUrl?.trim();
    if (!url) continue;
    const name = [stone.lab, stone.certNumber || stone.type]
      .filter(Boolean)
      .join(" ");
    links.push({
      kind: "stone",
      label: name ? `${name} certificate` : "Stone certificate",
      url,
    });
  }
  return links;
}
