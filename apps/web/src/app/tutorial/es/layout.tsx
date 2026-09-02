import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Tutorial de Orivraa | Software para Joyería en Español",
  description:
    "Tutorial de 24 minutos en español de Orivraa: inventario, facturación GST/IVA, POS, catálogo digital, artesanos e IA. Prueba gratis hoy.",
  path: "/tutorial/es",
  locale: "es_ES",
  languages: {
    es: "/tutorial/es",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "software joyería tutorial español",
    "software para joyeria en español",
    "programa joyería facturación",
    "software inventario joyería",
    "software POS joyería",
    "software joyería GST IVA",
    "gestión joyería software",
    "Orivraa tutorial español",
  ],
});

export default function TutorialEsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
