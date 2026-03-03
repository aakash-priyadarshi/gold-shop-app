import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Understand Orivraa's refund and return policy for jewellery purchases. Know your rights as a buyer on our marketplace.",
  alternates: { canonical: "/refund" },
  robots: { index: true, follow: true },
};

export default function RefundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
