import type { Metadata } from "next";

/** Seller and admin surfaces are private application UI, not search content. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
