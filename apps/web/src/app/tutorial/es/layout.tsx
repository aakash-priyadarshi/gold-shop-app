import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutorial de Orivraa 2026 | Guía Completa en Español — Software para Joyería",
  description:
    "Tutorial completo de 24 minutos en español de Orivraa, el software para joyerías. Inventario, facturación GST/IVA, POS, catálogo digital, gestión de artesanos, informes fiscales e IA — todo en un solo lugar.",
  keywords: [
    "software joyería tutorial español",
    "software para joyeria en español",
    "programa joyería facturación",
    "software inventario joyería",
    "software POS joyería",
    "software joyería GST IVA",
    "gestión joyería software",
    "Orivraa tutorial español",
    "Orivraa software joyería",
    "mejor software joyería 2026",
    "software administración joyería",
    "software joyería catálogo digital",
    "facturación joyería software",
    "software joyería gratis",
    "programa gestión joyería",
    "software joyería México",
    "software joyería Colombia",
    "software tienda de joyas",
    "joyería software ERP",
    "joyería software con IA",
    "software cálculo oro plata",
    "software joyería inventario gramas",
  ],
  alternates: {
    canonical: "/tutorial/es",
    languages: {
      es: "/tutorial/es",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Tutorial Orivraa 2026 | Software para Joyería en Español",
    description:
      "Tutorial de 24 minutos en español — facturación GST/IVA, POS, inventario, catálogo digital, gestión de artesanos e IA.",
    url: "https://www.orivraa.com/tutorial/es",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/es",
        secureUrl: "https://images.orivraa.com/tutorial/es",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tutorial Orivraa 2026 | Software para Joyería en Español",
    description:
      "Tutorial de 24 minutos en español — facturación, POS, inventario y analytics para joyerías.",
  },
};

export default function TutorialEsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
