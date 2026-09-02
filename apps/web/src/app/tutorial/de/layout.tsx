import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa Tutorial | Anleitung für Juwelier-Software",
  description:
    "24-Minuten-Anleitung für Orivraa Juwelier-Software auf Deutsch: Inventar, MwSt-Rechnungen, Kassensystem, Kataloge und KI. Kostenlos testen.",
  path: "/tutorial/de",
  locale: "de_DE",
  languages: {
    de: "/tutorial/de",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "Juwelier Software Deutsch",
    "Goldschmied Software",
    "Schmuck Software",
    "Kassensystem Schmuck",
    "Juwelier Inventar Software",
    "Mehrwertsteuer Rechnung Schmuck",
    "Orivraa Tutorial Deutsch",
  ],
});

export default function TutorialDeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
