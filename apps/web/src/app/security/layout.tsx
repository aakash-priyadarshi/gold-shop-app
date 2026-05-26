import { Metadata } from "next";

const BASE_URL = "https://www.orivraa.com";

export const metadata: Metadata = {
  title: "Security, Encryption & Regulatory Compliance | Orivraa",
  description: "Discover Orivraa's bank-grade security systems. Learn how we protect retail gold and jewelry stores with AES-256 at rest, TLS 1.3 in-transit, biometric finger scanning, RFID, and automated cloud backups.",
  alternates: {
    canonical: `${BASE_URL}/security`,
  },
  openGraph: {
    title: "Security, Encryption & Regulatory Compliance | Orivraa",
    description: "Learn how Orivraa establishes elite safety for modern jewelers through advanced encryption, biometrics, RFID stock tracking, and isolated regional hosting.",
    url: `${BASE_URL}/security`,
    type: "website",
    siteName: "Orivraa",
    images: [
      {
        url: `${BASE_URL}/security-banner.jpg`,
        width: 1200,
        height: 630,
        alt: "Orivraa Security and Trust Compliance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security & Trust Compliance | Orivraa Gold Shop Software",
    description: "AES-256 data protection, RFID stock shrink protection, and biometric point of sale staff logins.",
  },
};

function generateJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "SecurityPolicy",
      "name": "Orivraa Security, Data Processing & PII Isolation Policy",
      "description": "Comprehensive security controls outlining point-of-sale hardware integration, AES-256 encryption seed storage, and automated multi-zone failovers.",
      "url": `${BASE_URL}/security`,
      "publishingPrinciples": `${BASE_URL}/privacy`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Security & Regulatory Compliance Proof - Orivraa",
      "description": "Official documentation and structural proof regarding Orivraa's cybersecurity protocols, BIS HUID validation tracking, and regional server isolation.",
      "url": `${BASE_URL}/security`,
      "isPartOf": {
        "@type": "WebSite",
        "url": BASE_URL,
        "name": "Orivraa"
      }
    }
  ];
}

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = generateJsonLd();

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
