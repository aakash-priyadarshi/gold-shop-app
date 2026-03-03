import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Contact Orivraa support for help with your jewellery purchases, shop management, or any platform issues. We're here to help.",
  alternates: { canonical: "/support" },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
