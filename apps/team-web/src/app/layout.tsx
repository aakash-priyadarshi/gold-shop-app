import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Orivraa Team Ops", template: "%s | Orivraa Team Ops" },
  description:
    "Team Operations Platform for Orivraa — Manage employees, tasks, sales, certificates and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </Providers>
      </body>
    </html>
  );
}
