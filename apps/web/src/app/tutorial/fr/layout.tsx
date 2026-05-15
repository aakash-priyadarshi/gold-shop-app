import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutoriel Orivraa 2026 | Guide Complet du Logiciel de Bijouterie en Français",
  description:
    "Tutoriel complet de 24 minutes en français du logiciel Orivraa pour bijouteries. Inventaire, facturation TVA, point de vente, catalogue numérique, suivi artisan, rapports fiscaux et IA — tout dans une seule application. Essai gratuit 30 jours.",
  keywords: [
    "logiciel bijouterie français",
    "logiciel gestion bijouterie",
    "tutoriel logiciel bijouterie",
    "logiciel caisse bijouterie",
    "logiciel inventaire bijouterie",
    "logiciel facture TVA bijouterie",
    "Orivraa tutoriel français",
    "Orivraa bijouterie",
    "logiciel bijouterie France",
    "logiciel bijouterie Belgique",
    "logiciel gestion or et argent",
    "logiciel bijouterie catalogue",
    "meilleur logiciel bijouterie 2026",
    "jewellery software French",
    "gold shop software France",
  ],
  alternates: {
    canonical: "/tutorial/fr",
    languages: {
      fr: "/tutorial/fr",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Tutoriel Orivraa 2026 | Logiciel de Bijouterie en Français",
    description:
      "Tutoriel 24 minutes — facturation TVA, point de vente, inventaire, catalogue numérique, suivi artisan et IA.",
    url: "https://www.orivraa.com/tutorial/fr",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/fr",
        secureUrl: "https://images.orivraa.com/tutorial/fr",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tutoriel Orivraa 2026 | Logiciel de Bijouterie en Français",
    description:
      "Tutoriel 24 minutes en français — facturation, point de vente, inventaire et IA pour bijouteries.",
  },
};

export default function TutorialFrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
