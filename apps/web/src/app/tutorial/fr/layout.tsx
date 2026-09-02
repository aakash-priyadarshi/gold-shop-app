import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Tutoriel Orivraa | Guide du Logiciel de Bijouterie",
  description:
    "Tutoriel de 24 minutes en français du logiciel Orivraa: inventaire, facturation TVA, point de vente, catalogues et IA pour bijoutiers. Essai gratuit.",
  path: "/tutorial/fr",
  locale: "fr_FR",
  languages: {
    fr: "/tutorial/fr",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "logiciel bijouterie français",
    "logiciel gestion bijouterie",
    "tutoriel logiciel bijouterie",
    "logiciel caisse bijouterie",
    "logiciel inventaire bijouterie",
    "logiciel facture TVA bijouterie",
    "Orivraa tutoriel français",
  ],
});

export default function TutorialFrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
