import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Guidelines",
  description:
    "Orivraa platform guidelines for sellers and buyers. Understand our quality standards, listing requirements, and community rules.",
  alternates: { canonical: "/platform-guidelines" },
  robots: { index: true, follow: true },
};

export default function PlatformGuidelinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
