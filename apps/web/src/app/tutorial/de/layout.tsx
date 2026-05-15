import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa Tutorial 2026 | Vollständige Anleitung für Juwelier-Software auf Deutsch",
  description:
    "Vollständige 24-Minuten-Anleitung auf Deutsch für die Orivraa-Juwelier-Software. Inventar, Mehrwertsteuer-Rechnungen, Kassensystem, digitale Kataloge, Handwerker-Tracking, Steuerberichte und KI — alles in einer App. 30 Tage kostenlos testen.",
  keywords: [
    "Juwelier Software Deutsch",
    "Goldschmied Software",
    "Schmuck Software",
    "Kassensystem Schmuck",
    "Juwelier Inventar Software",
    "Mehrwertsteuer Rechnung Schmuck",
    "Orivraa Tutorial Deutsch",
    "Orivraa Juwelier",
    "Juwelier Software Deutschland",
    "Juwelier Software Österreich",
    "Gold Silber Software",
    "Schmuck Verwaltung Software",
    "beste Juwelier Software 2026",
    "jewellery software German",
    "gold shop software Germany",
  ],
  alternates: {
    canonical: "/tutorial/de",
    languages: {
      de: "/tutorial/de",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa Tutorial 2026 | Juwelier-Software auf Deutsch",
    description:
      "24-Minuten-Tutorial — Mehrwertsteuer-Rechnungen, Kassensystem, Inventar, digitale Kataloge, Handwerker und KI.",
    url: "https://www.orivraa.com/tutorial/de",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/de",
        secureUrl: "https://images.orivraa.com/tutorial/de",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa Tutorial 2026 | Juwelier-Software auf Deutsch",
    description:
      "24-Minuten-Tutorial auf Deutsch — Rechnungen, Kassensystem, Inventar und KI für Juweliere.",
  },
};

export default function TutorialDeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
