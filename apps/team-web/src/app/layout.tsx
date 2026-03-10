import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Orivraa Team Ops", template: "%s | Orivraa Team Ops" },
  description: "Team Operations Platform for Orivraa — Manage employees, tasks, sales, certificates and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-6 pt-20 lg:pt-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
