import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commissions - Shop Dashboard | Orivraa",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
